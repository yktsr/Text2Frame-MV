import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { messageMetrics, messageProblems, autoWrapPlugin, capacity, lineWidth, MessageMetrics, WidthLookups } from './db/messageFit';
import { tr } from './db/lang';

/**
 * メッセージのはみ出しチェック(エディタの波線)。見積もりは db/messageFit.ts。
 * 設定 text2frame.messageCheck: auto(自動で改行するプラグインがあれば止める)/ on / off。
 */

const SELECTOR = 'text2frame';
export const MESSAGE_CODES = { width: 'message-width' };

export interface MessageFit {
    metrics: MessageMetrics;
    lookups: WidthLookups;
    lineLength?: number;
}

const pluginCache = new Map<string, { mtime: number; name?: string }>();

function autoWrapIn(ctx: DbContext): string | undefined {
    const file = path.join(path.dirname(ctx.dataDir), 'js', 'plugins.js');
    let mtime: number;
    try {
        mtime = fs.statSync(file).mtimeMs;
    } catch (e) {
        return undefined;
    }
    const hit = pluginCache.get(file);
    if (hit && hit.mtime === mtime) return hit.name;
    let name: string | undefined;
    try {
        name = autoWrapPlugin(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        name = undefined;
    }
    pluginCache.set(file, { mtime, name });
    return name;
}

/** そのプロジェクトで調べるなら、見積もりに要るもの。調べないなら undefined。 */
export function messageFitFor(ctx: DbContext): MessageFit | undefined {
    const config = vscode.workspace.getConfiguration('text2frame');
    const mode = config.get<string>('messageCheck', 'auto');
    if (mode === 'off' || (mode === 'auto' && autoWrapIn(ctx))) return undefined;
    const lineLength = config.get<number>('messageLineLength', 0) || undefined;
    return {
        metrics: messageMetrics(ctx.db.system),
        lookups: {
            actorName: (id: number) => {
                const r = ctx.db.lookup('actor', id);
                return r.status === 'named' ? r.name : undefined;
            },
            currencyUnit: ctx.db.system.currencyUnit
        },
        lineLength
    };
}

const round = (n: number): string => (Math.round(n * 2) / 2).toString();

export function messageDiagnostics(lines: string[], fit: MessageFit): vscode.Diagnostic[] {
    return messageProblems(lines, fit.metrics, { lookups: fit.lookups, lineLength: fit.lineLength }).map((p) => {
        const d = new vscode.Diagnostic(
            new vscode.Range(p.line, p.start, p.line, lines[p.line].length),
            tr(`ウィンドウの幅を超えています(約 ${round(p.width as number)} 文字ぶん。入るのは約 ${Math.floor(p.capacity as number)} 文字)。はみ出した分は表示されません。`, `Wider than the window (about ${round(p.width as number)} characters; about ${Math.floor(p.capacity as number)} fit). The part that sticks out is not shown.`)
                + (p.approximate ? tr('制御文字を含むので目安です。', ' It has control characters, so this is an estimate.') : ''),
            vscode.DiagnosticSeverity.Warning
        );
        d.code = MESSAGE_CODES.width;
        d.source = 'Text2Frame';
        return d;
    });
}

export function registerMessageCheck(context: vscode.ExtensionContext, service: DatabaseService): void {
    const diagnostics = vscode.languages.createDiagnosticCollection('text2frame-message');
    const refresh = (document: vscode.TextDocument): void => {
        if (document.languageId !== SELECTOR) return;
        const ctx = service.forDocument(document);
        const fit = ctx ? messageFitFor(ctx) : undefined;
        if (!fit) {
            diagnostics.delete(document.uri);
            return;
        }
        diagnostics.set(document.uri, messageDiagnostics(document.getText().split(/\r?\n/), fit));
    };
    const pending = new Map<string, NodeJS.Timeout>();
    const refreshSoon = (document: vscode.TextDocument): void => {
        const key = document.uri.toString();
        clearTimeout(pending.get(key));
        pending.set(key, setTimeout(() => { pending.delete(key); refresh(document); }, 400));
    };
    context.subscriptions.push(
        diagnostics,
        vscode.workspace.onDidOpenTextDocument(refresh),
        vscode.workspace.onDidChangeTextDocument((e) => refreshSoon(e.document)),
        vscode.workspace.onDidCloseTextDocument((d) => diagnostics.delete(d.uri)),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('text2frame.messageCheck') || e.affectsConfiguration('text2frame.messageLineLength')) {
                vscode.workspace.textDocuments.forEach(refresh);
            }
        }),
        service.onDidChange(() => vscode.workspace.textDocuments.forEach(refresh))
    );
    vscode.workspace.textDocuments.forEach(refresh);
}

/** プレビューの文章の行に添える、はみ出しの知らせ。収まれば undefined。 */
export function overflowNote(text: string, face: boolean, fit: MessageFit): string | undefined {
    const cap = capacity(fit.metrics, face, fit.lineLength);
    const { width, approximate } = lineWidth(text, fit.metrics, fit.lookups);
    if (width <= cap + 1e-9) return undefined;
    return tr(`ウィンドウの幅を超えています(約 ${round(width)} 文字ぶん。入るのは約 ${Math.floor(cap)} 文字)`, `Wider than the window (about ${round(width)} characters; about ${Math.floor(cap)} fit)`) + (approximate ? tr('。目安です', '; an estimate') : '');
}
