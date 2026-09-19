import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseFrontMatter, resolveTarget, workspaceRootFor, loadModule, dataDirFor, baseSnapshotPath, hasBaseSnapshot, snapshotKeyFor, historyKeep } from './compiler';
import { withHistory } from './db/history';
import { commitPull, planPull, ExportTarget, PullPlan } from './exportText';
import { writeBackAndRefreshBase, reviewFiles, noteApply } from './deploy';
import { reviewEnabled } from './review';
import { reviewPull, busy, DeploySort } from './reviewApply';
import { eachSlowly, mapSlowly, SlowlyOptions } from './db/slowly';

/**
 * Batch operations over the text folder (text/ by default, `text2frame.textBaseDir`):
 *   - ゲームに反映(すべて): push every text file into the game (safe merge).
 *   - ゲームから取り出す(すべて): pull the game into text, merging (keeps your edits).
 *   - 全部取り直す: pull the game into text, overwriting (discard edits).
 */

interface T2FModule {
    applyTextFile: (opts: { [key: string]: unknown }) => { ok: boolean; warnings: string[]; error?: string };
}

let outputChannel: vscode.OutputChannel | undefined;
function getOutput(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Text2Frame Batch');
    }
    return outputChannel;
}

function textBaseSetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('textBaseDir', 'text');
}
function strategySetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('strategy', 'merge');
}

/** Recursively collect *.txt files under a directory. */
export function walkTextFiles(dir: string): string[] {
    const result: string[] = [];
    if (!fs.existsSync(dir)) {
        return result;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...walkTextFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.txt') && !entry.name.endsWith('.conversation.txt') && !entry.name.endsWith('.translation.txt')) {
            result.push(full);
        }
    }
    return result;
}

interface DataItem {
    kind: 'event' | 'common';
    mapId?: string;
    eventId?: string;
    pageId?: string;
    commonEventId?: string;
    key: string;
}

/** Enumerate every non-empty event/page and common event in the data dir. */
export function enumerateDataTargets(dataDir: string): DataItem[] {
    const items: DataItem[] = [];
    for (const file of fs.readdirSync(dataDir)) {
        const m = file.match(/^Map(\d+)\.json$/);
        if (!m) {
            continue;
        }
        const mapId = String(parseInt(m[1], 10));
        let map;
        try {
            map = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
        } catch (e) {
            continue;
        }
        if (!map.events || !Array.isArray(map.events)) {
            continue;
        }
        map.events.forEach((event: { pages?: { list?: unknown[] }[] }, eventIndex: number) => {
            if (!event || !event.pages) {
                return;
            }
            event.pages.forEach((page, pageIndex: number) => {
                if (!page || !Array.isArray(page.list) || page.list.length <= 1) {
                    return;
                }
                const eventId = String(eventIndex);
                const pageId = String(pageIndex + 1);
                const key = `map${mapId.padStart(3, '0')}_event${eventId.padStart(3, '0')}_page${pageId}`;
                items.push({ kind: 'event', mapId, eventId, pageId, key });
            });
        });
    }
    const cePath = path.join(dataDir, 'CommonEvents.json');
    if (fs.existsSync(cePath)) {
        try {
            const ce = JSON.parse(fs.readFileSync(cePath, 'utf8'));
            ce.forEach((entry: { list?: unknown[] }, index: number) => {
                if (!entry || !Array.isArray(entry.list) || entry.list.length <= 1) {
                    return;
                }
                items.push({ kind: 'common', commonEventId: String(index), key: `common${String(index).padStart(3, '0')}` });
            });
        } catch (e) {
            // ignore malformed CommonEvents.json
        }
    }
    return items;
}

/** ゲームに反映(すべて): push every text file under the text folder into the game. */
export async function deployAll(context: vscode.ExtensionContext): Promise<void> {
    const root = workspaceRootFor();
    if (!root) {
        vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        return;
    }
    const { mod } = loadModule<T2FModule>(context, root, 'Text2Frame.js', (m) => !!m && typeof (m as T2FModule).applyTextFile === 'function');
    if (!mod) {
        vscode.window.showErrorMessage('Text2Frame: コンパイラ (Text2Frame.js) が見つかりません。');
        return;
    }
    const textDir = path.join(root, textBaseSetting());
    const all = walkTextFiles(textDir);
    const files: string[] = [];
    const listed = await busy('Text2Frame: 反映するテキストを探しています…', (slowly) => eachSlowly(all, (f) => {
        if (parseFrontMatter(fs.readFileSync(f, 'utf8')).hasFrontMatter) files.push(f);
    }, slowly));
    if (!listed) {
        vscode.window.setStatusBarMessage('Text2Frame: 反映をやめました。', 4000);
        return;
    }
    if (files.length === 0) {
        vscode.window.showInformationMessage(`Text2Frame: ${path.relative(root, textDir)} に反映対象がありません。先に「ゲームから取り出す」で用意してください。`);
        return;
    }

    // 写しで試して、ゲームが変わるテキストだけを反映する。変わらないテキストまで反映すると、
    // 何千ものデータと祖先が書き直され、ファイルの変化を見張るほかの拡張がいっせいに動いてしまう。
    const sort: DeploySort = { changed: new Set(), failed: new Set() };
    const decision = await reviewFiles(context, root, files, 'すべての反映', sort);
    if (decision === 'cancel') {
        vscode.window.setStatusBarMessage('Text2Frame: 反映をやめました。', 4000);
        return;
    }
    const targets = files.filter((f) => sort.changed.has(f) || sort.failed.has(f));
    if (!targets.length) {
        vscode.window.showInformationMessage(`Text2Frame: ゲームは変わりませんでした(${files.length} 件のテキストは、もう反映されています)。`);
        return;
    }
    const out = getOutput();
    out.appendLine(`=== ゲームに反映(すべて) ${path.relative(root, textDir) || '.'}: ${targets.length} / ${files.length} files (変わらないものは飛ばす) ===`);
    let ok = 0;
    let fail = 0;
    let warn = 0;
    const strategy = strategySetting();
    const mergeLike = strategy !== 'overwrite' && strategy !== 'import';
    // 少しずつ反映して、そのたびに手を離す。やめても、済んだ分はそのまま(履歴から戻せる)。
    const finished = await busy('Text2Frame: ゲームに反映しています…', (slowly: SlowlyOptions) =>
        withHistory(root, 'applyAll', 'ゲームに反映(すべて)', { keep: historyKeep() }, async (recorder) => {
            const done = await eachSlowly(targets, (file) => {
                try {
                    const fileText = fs.readFileSync(file, 'utf8');
                    const { meta } = parseFrontMatter(fileText);
                    const { opts, label } = resolveTarget(meta, root);
                    const key = snapshotKeyFor(root, file);
                    // baseRoot は祖先(.t2f-base)の置き場所。渡さないと拡張ホストの cwd(/)に落ちる。
                    const applyOpts: { [k: string]: unknown } = { textPath: file, ...opts, strategy, baseRoot: root };
                    if (mergeLike && hasBaseSnapshot(root, key)) {
                        applyOpts.basePath = baseSnapshotPath(root, key);
                    }
                    noteApply(root, file, (opts.mapPath || opts.commonEventPath) as string | undefined, meta);
                    const res = mod.applyTextFile(applyOpts);
                    if (res.ok) {
                        ok++;
                        warn += res.warnings.length;
                        writeBackAndRefreshBase(context, root, meta, file, fileText, res, { key }, mergeLike);
                        out.appendLine(`OK   ${label}  <- ${path.relative(root, file)}` + (res.warnings.length ? `  (${res.warnings.length} warn)` : ''));
                    } else {
                        fail++;
                        out.appendLine(`FAIL ${label}  <- ${path.relative(root, file)}  ${res.error}`);
                    }
                } catch (e) {
                    fail++;
                    out.appendLine(`FAIL ${path.relative(root, file)}  ${e instanceof Error ? e.message : String(e)}`);
                }
            }, slowly);
            recorder?.setLabel(`ゲームに反映(すべて) ${ok}件`);
            return done;
        }));
    out.appendLine(`=== ${finished ? 'done' : 'cancelled'}: ${ok} ok, ${fail} fail, ${warn} warnings ===`);
    const msg = finished
        ? `Text2Frame: ゲームに反映 完了 — ${ok} 成功 / ${fail} 失敗`
        : `Text2Frame: ゲームに反映を途中でやめました — ${ok + fail} / ${targets.length} 件まで済んでいます(${ok} 成功 / ${fail} 失敗)。済んだ分は「履歴」から戻せます。`;
    if (fail > 0 || !finished) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}

/** Shared pull-all core. mode 'merge' keeps edits; mode 'overwrite' discards them. */
async function pullAll(context: vscode.ExtensionContext, mode: 'merge' | 'overwrite'): Promise<void> {
    const root = workspaceRootFor();
    if (!root) {
        vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        return;
    }
    const dataDir = dataDirFor(root);
    if (!fs.existsSync(dataDir)) {
        vscode.window.showErrorMessage('Text2Frame: データフォルダが見つかりません: ' + dataDir);
        return;
    }
    const purpose = mode === 'merge' ? 'ゲームから取り出す' : '全部取り直す';
    const outDir = path.join(root, textBaseSetting());
    if (mode === 'overwrite' && !reviewEnabled()) {
        const yes = await vscode.window.showWarningMessage(
            `Text2Frame: ${path.relative(root, outDir) || '.'} のテキストをゲームの内容で全部上書きします。編集内容は失われます。よろしいですか？`,
            { modal: true }, '全部取り直す'
        );
        if (yes !== '全部取り直す') {
            return;
        }
    }
    const makePlans = (slowly: SlowlyOptions): Promise<PullPlan[] | undefined> => mapSlowly(enumerateDataTargets(dataDir), (it) => {
        const target: ExportTarget = {
            kind: it.kind,
            mapId: it.mapId,
            eventId: it.eventId,
            pageId: it.pageId,
            commonEventId: it.commonEventId,
            textPath: path.join(outDir, it.key + '.txt')
        };
        if (mode === 'overwrite' && fs.existsSync(target.textPath)) {
            target.frontMatterSource = fs.readFileSync(target.textPath, 'utf8');
        }
        return planPull(context, root, target, mode);
    }, slowly);
    const reviewed = await reviewPull(root, makePlans, mode === 'merge' ? 'すべての取り出し' : '全部取り直し');
    if (!reviewed) {
        vscode.window.setStatusBarMessage('Text2Frame: 取り出しをやめました。', 4000);
        return;
    }
    const out = getOutput();
    out.appendLine(`=== ${purpose} -> ${path.relative(root, outDir) || '.'} ===`);

    let written = 0;
    let fail = 0;
    let conflicts = 0;
    // 目印が未解決で統合を見送ったもの / 目印ごと書き出したもの(どちらも祖先は進まない)。
    let skipped = 0;
    let markers = 0;
    const finished = await busy(mode === 'merge' ? 'Text2Frame: ゲームから取り出しています…' : 'Text2Frame: 全部取り直しています…', (slowly: SlowlyOptions) =>
        withHistory(root, mode === 'merge' ? 'pullAll' : 'repullAll', purpose + (mode === 'merge' ? '(すべて)' : ''), { keep: historyKeep() }, async (recorder) => {
            const done = await eachSlowly(reviewed.plans, (plan) => {
                const target = plan.target;
                const res = commitPull(context, root, plan);
                if (res.ok && res.skipped) {
                    // 目印をまたぐ統合はできない。書いていないので written には数えない。
                    skipped++;
                    out.appendLine(`SKIP ${path.relative(root, target.textPath)}  未解決の衝突の目印が${res.skipped === 'game' ? 'ゲーム側' : 'テキスト'}に残っています`);
                } else if (res.ok) {
                    written++;
                    conflicts += res.conflicts || 0;
                    if (res.markers) {
                        markers++;
                    }
                    out.appendLine(`OK   ${path.relative(root, target.textPath)}`
                        + (res.conflicts ? `  (${res.conflicts} 競合)` : '')
                        + (res.markers ? '  (目印ごと取り出し。祖先は据え置き)' : ''));
                } else {
                    fail++;
                    out.appendLine(`FAIL ${path.relative(root, target.textPath)}  ${res.error}`);
                }
            }, slowly);
            recorder?.setLabel(purpose + (mode === 'merge' ? '(すべて)' : '') + ` ${written}件`);
            return done;
        }));
    out.appendLine(`=== ${finished ? 'done' : 'cancelled'}: ${written} written, ${fail} fail, ${conflicts} conflicts, ${skipped} skipped, ${markers} with markers ===`);
    if (skipped > 0) {
        out.appendLine('SKIP したファイルは、目印3行を消すか「全部取り直す」で目印ごと取り出してテキスト側で解決してください。');
    }
    const msg = (finished ? `Text2Frame: ${purpose} 完了 — ${written} 件` : `Text2Frame: ${purpose}を途中でやめました — ${written} 件まで書きました。済んだ分は「履歴」から戻せます`)
        + (fail ? ` / ${fail} 失敗` : '')
        + (conflicts ? ` / ${conflicts} 競合(両方残し)` : '')
        + (skipped ? ` / ${skipped} 件は目印が未解決で除外` : '');
    if (fail > 0 || conflicts > 0 || skipped > 0 || !finished) {
        vscode.window.showWarningMessage(msg, '詳細').then((p) => { if (p) { out.show(true); } });
    } else {
        vscode.window.showInformationMessage(msg);
    }
}

/** ゲームから取り出す(すべて): pull the game into text, merging (keeps your edits). */
export function exportAll(context: vscode.ExtensionContext): Promise<void> {
    return pullAll(context, 'merge');
}

/** 全部取り直す: pull the game into text, overwriting (discard edits). Advanced. */
export function repullAllOverwrite(context: vscode.ExtensionContext): Promise<void> {
    return pullAll(context, 'overwrite');
}
