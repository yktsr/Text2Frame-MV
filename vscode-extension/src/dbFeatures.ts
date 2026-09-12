import * as vscode from 'vscode';
import { DatabaseService, DbContext } from './dbService';
import { scanLines, expectedAt, LineRef } from './db/tagRefs';
import { describeRef } from './db/describe';
import { DbKind, padId } from './db/database';
import { FACE_COLUMNS, FACE_ROWS } from './db/faces';

/**
 * エディタの中でデータベースの名前を見せる。テキストには番号しか書かないまま、
 *   - 番号の直後に名前を薄く出す(インレイヒント。ファイルには書かない)
 *   - 番号の上にマウスを置くと名前と同名の番号、顔なら画像を出す(ホバー)
 *   - データベースに無い番号・名前の無い番号・無い顔画像を知らせる(診断)
 *   - 番号を打つ位置で、名前から探して番号を入れられるようにする(補完)
 */

const SELECTOR: vscode.DocumentSelector = { language: 'text2frame' };

/** 文書を走査した結果。同じ版なら使い回す(ヒント・ホバー・診断が同じ走査を共有する)。 */
class ScanCache {
    private readonly cache = new WeakMap<vscode.TextDocument, { version: number; refs: LineRef[] }>();

    refs(document: vscode.TextDocument): LineRef[] {
        const hit = this.cache.get(document);
        if (hit && hit.version === document.version) return hit.refs;
        const lines: string[] = [];
        for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);
        const refs = scanLines(lines);
        this.cache.set(document, { version: document.version, refs });
        return refs;
    }
}

const faceLookup = (service: DatabaseService, ctx: DbContext) => ({
    exists: (name: string) => !!service.faceSheet(ctx, name)
});

const showNames = (): boolean =>
    vscode.workspace.getConfiguration('text2frame').get<boolean>('showDatabaseNames', true);

export function registerDatabaseFeatures(context: vscode.ExtensionContext, service: DatabaseService): void {
    const scans = new ScanCache();
    const hintsChanged = new vscode.EventEmitter<void>();

    // --- 名前の薄い表示 ---
    const inlayHints: vscode.InlayHintsProvider = {
        onDidChangeInlayHints: hintsChanged.event,
        provideInlayHints(document, range) {
            if (!showNames()) return [];
            const ctx = service.forDocument(document);
            if (!ctx) return [];
            const hints: vscode.InlayHint[] = [];
            for (const ref of scans.refs(document)) {
                if (ref.line < range.start.line || ref.line > range.end.line) continue;
                const info = describeRef(ctx.db, ref);
                if (!info.hint) continue;
                const hint = new vscode.InlayHint(new vscode.Position(ref.line, ref.end), info.hint);
                hint.paddingLeft = true;
                hint.tooltip = info.title + '\n' + info.lines.join('\n');
                hints.push(hint);
            }
            return hints;
        }
    };

    // --- ホバー ---
    const hover: vscode.HoverProvider = {
        provideHover(document, position) {
            const ctx = service.forDocument(document);
            if (!ctx) return undefined;
            const ref = scans.refs(document).find((r) => r.line === position.line && r.start <= position.character && position.character <= r.end);
            if (!ref) return undefined;
            const info = describeRef(ctx.db, ref, faceLookup(service, ctx));
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**${escape(info.title)}**\n\n`);
            if (ref.kind === 'face' && ref.faceName) {
                const uri = service.faceUri(ctx, ref.faceName, ref.id, 96);
                if (uri) md.appendMarkdown(`![${escape(ref.faceName)}](${uri})\n\n`);
            }
            info.lines.forEach((l) => md.appendMarkdown(escape(l) + '  \n'));
            return new vscode.Hover(md, new vscode.Range(ref.line, ref.start, ref.line, ref.end));
        }
    };

    // --- 診断 ---
    const diagnostics = vscode.languages.createDiagnosticCollection('text2frame-db');
    const refresh = (document: vscode.TextDocument): void => {
        if (document.languageId !== 'text2frame') return;
        const ctx = service.forDocument(document);
        if (!ctx) {
            diagnostics.delete(document.uri);
            return;
        }
        const faces = faceLookup(service, ctx);
        const list: vscode.Diagnostic[] = [];
        for (const ref of scans.refs(document)) {
            const problem = describeRef(ctx.db, ref, faces).problem;
            if (!problem) continue;
            const d = new vscode.Diagnostic(
                new vscode.Range(ref.line, ref.start, ref.line, ref.end),
                problem.message,
                problem.severity === 'warning' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Hint
            );
            d.source = 'Text2Frame';
            list.push(d);
        }
        diagnostics.set(document.uri, list);
    };
    const pending = new Map<string, NodeJS.Timeout>();
    const refreshSoon = (document: vscode.TextDocument): void => {
        const key = document.uri.toString();
        clearTimeout(pending.get(key));
        pending.set(key, setTimeout(() => { pending.delete(key); refresh(document); }, 300));
    };
    const refreshAll = (): void => vscode.workspace.textDocuments.forEach(refresh);

    // --- 名前から入力 ---
    const completion: vscode.CompletionItemProvider = {
        provideCompletionItems(document, position) {
            const ctx = service.forDocument(document);
            if (!ctx) return undefined;
            const line = document.lineAt(position.line).text;
            const expected = expectedAt(line, position.character);
            if (!expected) return undefined;
            const range = new vscode.Range(position.line, expected.start, position.line, position.character);

            if (expected.kind === 'face') {
                return expected.faceName
                    ? faceIndexItems(service, ctx, expected.faceName, range, line.charAt(position.character) === ')')
                    : faceNameItems(service, ctx, range);
            }
            const kind = expected.kind as DbKind;
            return ctx.db.entries(kind).map((e) => {
                const label = `${padId(e.id)} ${e.name || '(名前なし)'}`;
                const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Value);
                item.range = range;
                item.insertText = String(e.id);
                // 番号でも名前でも絞り込める。確定して入るのは常に番号。
                item.filterText = `${e.id} ${e.name}`;
                item.sortText = padId(e.id);
                item.detail = ctx.db.label(kind);
                const same = ctx.db.sameName(kind, e.id);
                if (same.length) item.documentation = `同じ名前の${ctx.db.label(kind)}: ${same.map(padId).join(', ')}`;
                return item;
            });
        }
    };

    context.subscriptions.push(
        hintsChanged,
        diagnostics,
        vscode.languages.registerInlayHintsProvider(SELECTOR, inlayHints),
        vscode.languages.registerHoverProvider(SELECTOR, hover),
        vscode.languages.registerCompletionItemProvider(SELECTOR, completion, ':', '[', '(', ',', ' '),
        vscode.workspace.onDidOpenTextDocument(refresh),
        vscode.workspace.onDidChangeTextDocument((e) => refreshSoon(e.document)),
        vscode.workspace.onDidCloseTextDocument((d) => diagnostics.delete(d.uri)),
        service.onDidChange(() => { hintsChanged.fire(); refreshAll(); }),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('text2frame.showDatabaseNames')) hintsChanged.fire();
            if (e.affectsConfiguration('text2frame.dataDir')) { hintsChanged.fire(); refreshAll(); }
        })
    );
    refreshAll();
}

function faceNameItems(service: DatabaseService, ctx: DbContext, range: vscode.Range): vscode.CompletionItem[] {
    return service.faceNames(ctx).map((name) => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.File);
        item.range = range;
        item.insertText = name + '(';
        item.detail = '顔画像';
        // 続けて何番の顔かを選べるように、すぐ次の補完を開く。
        item.command = { command: 'editor.action.triggerSuggest', title: '' };
        return item;
    });
}

function faceIndexItems(service: DatabaseService, ctx: DbContext, faceName: string, range: vscode.Range, closed: boolean): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    for (let i = 0; i < FACE_COLUMNS * FACE_ROWS; i++) {
        const owner = ctx.db.faceOwner(faceName, i);
        const item = new vscode.CompletionItem(owner ? `${i} ${owner}` : String(i), vscode.CompletionItemKind.Value);
        item.range = range;
        item.insertText = closed ? String(i) : `${i})`;
        item.filterText = String(i);
        item.sortText = String(i);
        item.detail = `${faceName} の ${i}番`;
        const uri = service.faceUri(ctx, faceName, i, 96);
        if (uri) item.documentation = new vscode.MarkdownString(`![${faceName} ${i}](${uri})`);
        items.push(item);
    }
    return items;
}

/** Markdown として解釈されないように(名前に * や _ が入っていても崩れない)。 */
function escape(s: string): string {
    return s.replace(/[\\`*_{}[\]()#+\-.!|<>]/g, '\\$&');
}
