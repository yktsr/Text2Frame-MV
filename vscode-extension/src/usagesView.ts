import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { DbKind, padId } from './db/database';
import { bodyStart, usageBlocks, usageHits, conditionHits, ConditionEvent, ConditionHit } from './db/usages';
import { parseFrontMatter } from './compiler';
import { placeFromMeta, placeKey, placeLabel } from './placeLabel';
import { readMapInfos } from './db/mapTree';
import { confirmNoText, readOnlyUri } from './eventLinks';
import { usagesHtml } from './usagesHtml';
import { tr } from './db/lang';

/**
 * データベースの番号を使っている箇所を、前後の行つきで横に一覧する(grep の結果のように)。
 * 行をクリックするとその行を開く。開いていて保存していないテキストは、エディタの内容で探す。
 */

export interface UsageTarget {
    kind: DbKind;
    id: number;
    name: string;
}

interface FileResult {
    uri: vscode.Uri;
    label: string;
    detail: string;
    blocks: Array<{ lines: Array<{ n: number; text: string; hits: Array<[number, number]> }> }>;
}

/** 出現条件で使っているページ(データから拾う)。押したときに開く先も持つ。 */
interface ConditionResult {
    label: string;
    note: string;
    uri: vscode.Uri;
}

const contextLines = (): number =>
    Math.max(0, Math.min(20, vscode.workspace.getConfiguration('text2frame').get<number>('usageContextLines', 2)));

/** プロジェクトのテキストのフォルダにあるテキスト。 */
export async function projectTextFiles(ctx: DbContext): Promise<vscode.Uri[]> {
    const textBase = vscode.workspace.getConfiguration('text2frame').get<string>('textBaseDir', 'text') || 'text';
    return vscode.workspace.findFiles(new vscode.RelativePattern(vscode.Uri.file(path.join(ctx.root, textBase)), '**/*.{txt,t2f,text2frame}'));
}

/** テキストの中身。開いているものはエディタの内容(保存前でも)を使う。 */
function readText(uri: vscode.Uri): string | undefined {
    const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);
    if (open) return open.getText();
    try { return fs.readFileSync(uri.fsPath, 'utf8'); } catch (e) { return undefined; }
}

/** どのマップのどのイベントか(フロントマターから)。 */
function whereLabel(service: DatabaseService, ctx: DbContext, text: string): string {
    return placeLabel(service, ctx, placeFromMeta(parseFrontMatter(text).meta));
}

/** ゲームのデータから、出現条件で使っているページを拾う。テキストには出ないため。 */
function collectConditions(service: DatabaseService, ctx: DbContext, target: UsageTarget, textOf: Map<string, vscode.Uri>): ConditionResult[] {
    let infos: ReturnType<typeof readMapInfos> = [];
    try {
        infos = readMapInfos(JSON.parse(fs.readFileSync(path.join(ctx.dataDir, 'MapInfos.json'), 'utf8')));
    } catch (e) {
        return [];
    }
    const out: ConditionResult[] = [];
    for (const info of infos) {
        const events = service.mapEvents(ctx, info.id);
        if (!events) continue;
        const forMap: ConditionEvent[] = [];
        events.forEach((event, eventId) => {
            if (event) forMap.push({ mapId: info.id, eventId, pages: event.pageSummaries || [] });
        });
        for (const hit of conditionHits(forMap, target.kind, target.id)) out.push(conditionResult(service, ctx, hit, textOf));
    }
    return out;
}

/** 「(うち 15 はテキストなし)」。全部にテキストがあれば空。 */
function noTextCount(conditions: ConditionResult[]): string {
    const n = conditions.filter((c) => c.uri.scheme !== 'file').length;
    return n ? tr(`(うち ${n} はテキストなし)`, ` (${n} with no text)`) : '';
}

function conditionResult(service: DatabaseService, ctx: DbContext, hit: ConditionHit, textOf: Map<string, vscode.Uri>): ConditionResult {
    const place = { kind: 'event' as const, mapId: hit.mapId, eventId: hit.eventId, pageId: hit.pageId };
    const key = placeKey(place) as string;
    return {
        label: placeLabel(service, ctx, place),
        note: hit.note,
        // テキストがあればそれを、無ければ読むだけの画面を開く。
        uri: textOf.get(key) || readOnlyUri(key)
    };
}

async function collect(service: DatabaseService, ctx: DbContext, target: UsageTarget): Promise<{ files: FileResult[]; textOf: Map<string, vscode.Uri> }> {
    const context = contextLines();
    const results: FileResult[] = [];
    /* どのページのテキストがどのファイルか。出現条件の行を押したときに開く先に使う。 */
    const textOf = new Map<string, vscode.Uri>();
    for (const uri of await projectTextFiles(ctx)) {
        const text = readText(uri);
        if (text === undefined) continue;
        const place = placeFromMeta(parseFrontMatter(text).meta);
        const key = place && placeKey(place);
        if (key) textOf.set(key, uri);
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        const hits = usageHits(lines, target.kind, target.id);
        if (!hits.length) continue;
        results.push({
            uri,
            label: path.relative(ctx.root, uri.fsPath),
            detail: whereLabel(service, ctx, text),
            blocks: usageBlocks(lines.length, hits, context, bodyStart(lines)).map((b) => {
                const out: FileResult['blocks'][number] = { lines: [] };
                for (let n = b.from; n <= b.to; n++) {
                    out.lines.push({ n: n + 1, text: lines[n], hits: b.hits.filter((h) => h.line === n).map((h) => [h.start, h.end] as [number, number]) });
                }
                return out;
            })
        });
    }
    return { files: results.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })), textOf };
}

export class UsagesPanel {
    private panel?: vscode.WebviewPanel;
    private ready = false;
    private pending?: object;
    private files: FileResult[] = [];
    private conditions: ConditionResult[] = [];
    private ctx?: DbContext;

    constructor(private readonly service: DatabaseService) {}

    async show(ctx: DbContext, target: UsageTarget): Promise<void> {
        const title = `${ctx.db.label(target.kind)} ${padId(target.id)} ${target.name || tr('(名前なし)', '(no name)')}`;
        const { files, textOf } = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Window, title: tr(`${title} を探しています`, `Looking for ${title}`) },
            () => collect(this.service, ctx, target)
        );
        const conditions = collectConditions(this.service, ctx, target, textOf);
        const count = files.reduce((n, f) => n + f.blocks.reduce((m, b) => m + b.lines.filter((l) => l.hits.length).length, 0), 0);
        this.files = files;
        this.conditions = conditions;
        this.ctx = ctx;
        const summary = [
            files.length ? tr(`使っている行 ${count}件(${files.length}ファイル)`, `${count} lines use it (${files.length} files)`) : '',
            conditions.length ? tr(`出現条件 ${conditions.length}ページ`, `${conditions.length} pages it makes appear`) + noTextCount(conditions) : ''
        ].filter((s) => s).join(' / ');
        const message = {
            type: 'render',
            title,
            summary,
            files: files.map((f) => ({ label: f.label, detail: f.detail, blocks: f.blocks })),
            conditions: conditions.map((c) => ({ label: c.label, note: c.note, noText: c.uri.scheme !== 'file' }))
        };
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel('text2frame.usages', title, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, { enableScripts: true, retainContextWhenHidden: true });
            this.ready = false;
            this.panel.webview.html = usagesHtml();
            this.panel.webview.onDidReceiveMessage((m) => this.receive(m));
            this.panel.onDidDispose(() => { this.panel = undefined; });
        } else {
            this.panel.reveal(undefined, true);
        }
        this.panel.title = tr(`使用箇所: ${title}`, `Usages: ${title}`);
        if (this.ready) this.panel.webview.postMessage(message);
        else this.pending = message;
    }

    private async receive(m: any): Promise<void> {
        if (!m || typeof m !== 'object') return;
        if (m.type === 'ready') {
            this.ready = true;
            if (this.pending) this.panel?.webview.postMessage(this.pending);
            this.pending = undefined;
            return;
        }
        if (m.type === 'openCondition' && Number.isInteger(m.index)) {
            const hit = this.conditions[m.index];
            if (!hit) return;
            if (this.ctx && !(await confirmNoText(this.service, this.ctx, hit.uri))) return;
            const doc = await vscode.workspace.openTextDocument(hit.uri);
            await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preview: true });
            return;
        }
        if (m.type !== 'open' || !Number.isInteger(m.file) || !Number.isInteger(m.line)) return;
        const file = this.files[m.file];
        if (!file) return;
        const start = Number.isInteger(m.start) ? m.start : 0;
        const end = Number.isInteger(m.end) ? m.end : start;
        const column = vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'text2frame')?.viewColumn ?? vscode.ViewColumn.One;
        const doc = await vscode.workspace.openTextDocument(file.uri);
        await vscode.window.showTextDocument(doc, { viewColumn: column, selection: new vscode.Range(m.line, start, m.line, end) });
    }

    dispose(): void {
        this.panel?.dispose();
    }
}
