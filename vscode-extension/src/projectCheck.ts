import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { frontMatterBody, parseFrontMatter, workspaceRootFor } from './compiler';
import { isSidecarText } from './db/files';
import { loadCompiler, unappliedFilesSlowly } from './deploy';
import { projectTextFiles } from './usagesView';
import { lookupsFor } from './dbFeatures';
import { messageFitFor, messageDiagnostics } from './messageCheck';
import { basicProblems, audioRefs, audioBaseName, AudioFolderName } from './db/checks';
import { scanLines, lineKinds } from './db/tagRefs';
import { describeRef } from './db/describe';
import { findConflicts, tagLikeName, knownTagNames, compilesAsText } from './db/fixes';
import { tr } from './db/lang';

/**
 * プロジェクト全体の検査。全テキストを調べて、VS Code の「問題」パネルに出す。
 * 開いているテキストは、ふだんの指摘が同じものを出すので、ここでは検査でしか分からないもの
 * (無い音声・宛先が無い・コンパイルできない・反映されていない変更)だけを出す。
 * テキストを書き換えると、そのファイルの検査の結果は消える(古くなるので)。
 */

const ONLY_HERE = new Set(['audio-missing', 'target-missing', 'compile-error', 'unapplied']);
const AUDIO_FOLDERS: AudioFolderName[] = ['bgm', 'bgs', 'me', 'se'];

const SEVERITY = {
    error: vscode.DiagnosticSeverity.Error,
    warning: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information
};

function diagnostic(line: number, start: number, end: number, message: string, severity: keyof typeof SEVERITY, code: string): vscode.Diagnostic {
    const d = new vscode.Diagnostic(new vscode.Range(line, start, line, end), message, SEVERITY[severity]);
    d.code = code;
    d.source = tr('Text2Frame 検査', 'Text2Frame check');
    return d;
}

function audioNames(ctx: DbContext): Map<AudioFolderName, Set<string>> {
    const out = new Map<AudioFolderName, Set<string>>();
    for (const folder of AUDIO_FOLDERS) {
        const names = new Set<string>();
        try {
            for (const file of fs.readdirSync(path.join(path.dirname(ctx.dataDir), 'audio', folder))) {
                const base = audioBaseName(file);
                if (base) names.add(base);
            }
        } catch (e) {
            // フォルダが無ければ空のまま
        }
        out.set(folder, names);
    }
    return out;
}

const metaLine = (lines: string[], key: string): number => Math.max(0, lines.findIndex((l) => l.startsWith(key + ':')));

/** 宛先のメモが指す場所がゲームにあるか。 */
function targetProblem(service: DatabaseService, ctx: DbContext, lines: string[], meta: { [key: string]: string }): vscode.Diagnostic | undefined {
    if (meta.kind === 'common') {
        const id = Number(meta.commonEventId);
        if (ctx.db.lookup('commonEvent', id).status !== 'missing') return undefined;
        const line = metaLine(lines, 'commonEventId');
        return diagnostic(line, 0, lines[line].length, tr(`コモンイベント ${meta.commonEventId} はゲームにありません。`, `Common event ${meta.commonEventId} is not in the game.`), 'warning', 'target-missing');
    }
    if (!meta.mapId || !meta.eventId) return undefined;
    const events = service.mapEvents(ctx, Number(meta.mapId));
    let message: string | undefined;
    let key = 'mapId';
    if (!events) {
        message = tr(`マップ ${meta.mapId} はゲームにありません。`, `Map ${meta.mapId} is not in the game.`);
    } else if (!events[Number(meta.eventId)]) {
        message = tr(`マップ ${meta.mapId} に、イベント ${meta.eventId} はありません。`, `Map ${meta.mapId} has no event ${meta.eventId}.`);
        key = 'eventId';
    } else if (Number(meta.pageId || '1') > (events[Number(meta.eventId)]?.pages ?? 1)) {
        message = tr(`イベント ${meta.eventId} に、${meta.pageId} ページはありません。`, `Event ${meta.eventId} has no page ${meta.pageId}.`);
        key = 'pageId';
    }
    if (!message) return undefined;
    const line = metaLine(lines, key);
    return diagnostic(line, 0, lines[line].length, message, 'warning', 'target-missing');
}

export function registerProjectCheck(context: vscode.ExtensionContext, service: DatabaseService): void {
    const collection = vscode.languages.createDiagnosticCollection('text2frame-project');

    const run = async (): Promise<void> => {
        const active = vscode.window.activeTextEditor?.document;
        const root = workspaceRootFor(active);
        const ctx = service.forDocument(active) || (root ? service.forRoot(root) : undefined);
        if (!ctx || !root) {
            vscode.window.showErrorMessage(tr('Text2Frame: ツクールのプロジェクト(data/System.json)が見つかりません。ゲームのフォルダを開いてから実行してください。', 'Text2Frame: No RPG Maker project (data/System.json) was found. Open the game folder first.'));
            return;
        }
        collection.clear();
        const counts = { error: 0, warning: 0, info: 0, files: 0 };
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: tr('Text2Frame: プロジェクト全体を検査しています', 'Text2Frame: Checking the whole project'), cancellable: true }, async (progress, token) => {
            const files = (await projectTextFiles(ctx)).filter((u) => !isSidecarText(u.fsPath));
            const { mod } = loadCompiler(context, root);
            const compile = mod && typeof mod.compile === 'function' ? (mod.compile as (t: string) => unknown) : undefined;
            const fit = messageFitFor(ctx);
            const known = new Set(knownTagNames().map((n) => n.toLowerCase()));
            const audio = audioNames(ctx);
            const results = new Map<string, vscode.Diagnostic[]>();
            for (let i = 0; i < files.length; i++) {
                if (token.isCancellationRequested) return;
                if (i % 100 === 0) {
                    progress.report({ message: `${i} / ${files.length}`, increment: 0 });
                    await new Promise((r) => setTimeout(r, 0));
                }
                const uri = files[i];
                const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);
                let text: string;
                try {
                    text = open ? open.getText() : fs.readFileSync(uri.fsPath, 'utf8');
                } catch (e) {
                    continue;
                }
                const lines = text.split(/\r?\n/);
                const { meta, hasFrontMatter } = parseFrontMatter(text);
                const list: vscode.Diagnostic[] = [];
                for (const p of basicProblems(lines)) list.push(diagnostic(p.line, p.start, p.end, p.message, p.severity, p.code));
                const mapId = meta.kind === 'common' ? undefined : parseInt(meta.mapId, 10);
                const lookups = lookupsFor(service, ctx, Number.isInteger(mapId) ? mapId : undefined);
                for (const ref of scanLines(lines)) {
                    const problem = describeRef(ctx.db, ref, lookups).problem;
                    if (problem) list.push(diagnostic(ref.line, ref.start, ref.end, problem.message, problem.severity === 'warning' ? 'warning' : 'info', 'db-problem'));
                }
                lineKinds(lines).forEach((kind, line) => {
                    if (kind !== 'tag') return;
                    for (const a of audioRefs(lines[line])) {
                        if (!audio.get(a.folder)?.has(a.name)) list.push(diagnostic(line, a.start, a.end, `audio/${a.folder}/${a.name} が見つかりません。`, 'warning', 'audio-missing'));
                    }
                    const name = tagLikeName(lines[line]);
                    if (name && compile && !known.has(name.toLowerCase()) && compilesAsText(compile, lines[line])) {
                        const start = lines[line].indexOf('<');
                        list.push(diagnostic(line, start, start + name.length + 1, tr(`「<${name}」はタグとして読まれず、ゲームにそのまま文字で出ます。`, `"<${name}" is not read as a tag; it shows in the game as plain text.`), 'info', 'unknown-tag'));
                    }
                });
                for (const c of findConflicts(lines)) {
                    list.push(diagnostic(c.units[0].start, 0, lines[c.units[0].start].length, tr('未解決の衝突です。', 'Unresolved conflict.'), 'warning', 'conflict'));
                }
                if (compile) {
                    try {
                        compile(frontMatterBody(text));
                    } catch (e) {
                        const err = e as { message?: string; t2fLineText?: string };
                        const at = err.t2fLineText ? lines.indexOf(err.t2fLineText) : -1;
                        const line = at >= 0 ? at : 0;
                        list.push(diagnostic(line, 0, lines[line].length, tr('コンパイルできません: ', 'Cannot compile: ') + String(err.message || e).split('\n')[0], 'error', 'compile-error'));
                    }
                }
                if (fit) list.push(...messageDiagnostics(lines, fit));
                if (hasFrontMatter) {
                    const target = targetProblem(service, ctx, lines, meta);
                    if (target) list.push(target);
                }
                results.set(uri.fsPath, list);
            }
            progress.report({ message: tr('ゲームに反映されていない変更を調べています', 'Looking for changes not yet applied to the game') });
            await new Promise((r) => setTimeout(r, 0));
            const unapplied = await unappliedFilesSlowly(context, root, files.map((u) => u.fsPath), {
                onProgress: (done, total) => progress.report({ message: tr(`ゲームに反映されていない変更を調べています ${done} / ${total}`, `Looking for changes not yet applied to the game ${done} / ${total}`) }),
                cancelled: () => token.isCancellationRequested
            });
            if (token.isCancellationRequested) return;
            for (const file of unapplied) {
                const list = results.get(file) || [];
                list.push(diagnostic(0, 0, 3, tr('ゲームに反映されていない変更があります(反映すると、ゲームが変わります)。', 'There are changes not yet applied to the game (applying will change the game).'), 'info', 'unapplied'));
                results.set(file, list);
            }
            for (const [file, found] of results) {
                const isOpen = vscode.workspace.textDocuments.some((d) => d.uri.fsPath === file);
                const list = isOpen ? found.filter((d) => ONLY_HERE.has(String(d.code))) : found;
                if (!list.length) continue;
                counts.files++;
                for (const d of list) {
                    if (d.severity === vscode.DiagnosticSeverity.Error) counts.error++;
                    else if (d.severity === vscode.DiagnosticSeverity.Warning) counts.warning++;
                    else counts.info++;
                }
                collection.set(vscode.Uri.file(file), list);
            }
        });
        const summary = counts.files
            ? tr(`Text2Frame: 検査しました。エラー ${counts.error}・警告 ${counts.warning}・情報 ${counts.info}(${counts.files} ファイル)`, `Text2Frame: Checked. ${counts.error} errors · ${counts.warning} warnings · ${counts.info} info (${counts.files} files)`)
            : tr('Text2Frame: 検査しました。問題は見つかりませんでした。', 'Text2Frame: Checked. No problems found.');
        const pick = await vscode.window.showInformationMessage(summary, ...(counts.files ? [tr('問題パネルを開く', 'Open the Problems panel')] : []));
        if (pick) vscode.commands.executeCommand('workbench.actions.view.problems');
    };

    const forget = (document: vscode.TextDocument): void => collection.delete(document.uri);
    context.subscriptions.push(
        collection,
        vscode.commands.registerCommand('text2frame.checkProject', run),
        vscode.workspace.onDidChangeTextDocument((e) => { if (e.contentChanges.length) forget(e.document); })
    );
}
