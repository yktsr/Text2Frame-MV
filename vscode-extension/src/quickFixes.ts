import * as vscode from 'vscode';
import { workspaceRootFor } from './compiler';
import { loadCompiler } from './deploy';
import { lineKinds } from './db/tagRefs';
import { findConflicts, resolveConflict, tagLikeName, similarTagNames, replaceTagName, compilesAsText } from './db/fixes';
import { messageSettingsFor } from './db/structure';
import { MESSAGE_CODES } from './messageCheck';

/**
 * クイックフィックス(電球)。
 *   知らないタグ: タグの形をしているのに、コンパイラが文章として読む行(ゲームにそのまま文字で出る)。
 *   競合の目印: 3つそろったものに、残す方を選ぶ直し方を出す。
 *   閉じ忘れ・空のタグ・データベースの番号: 今の診断に付けたコードを見て、直し方を出す。
 */

const SELECTOR: vscode.DocumentSelector = { language: 'text2frame' };
export const FIX = {
    unclosed: 'unclosed',
    emptyTag: 'empty-tag',
    unknownTag: 'unknown-tag',
    conflict: 'conflict',
    dbProblem: 'db-problem'
};

type Compile = (text: string) => unknown;

export function registerQuickFixes(context: vscode.ExtensionContext): void {
    const diagnostics = vscode.languages.createDiagnosticCollection('text2frame-fixes');
    const readAsText = new Map<string, boolean>();

    const compilerFor = (document: vscode.TextDocument): Compile | undefined => {
        const { mod } = loadCompiler(context, workspaceRootFor(document));
        return mod && typeof mod.compile === 'function' ? (mod.compile as Compile) : undefined;
    };

    /** その行だけをコンパイルして、文章(401)としてしか読まれないか。 */
    const becomesText = (compile: Compile, line: string): boolean => {
        const key = line.trim();
        const hit = readAsText.get(key);
        if (hit !== undefined) return hit;
        const text = compilesAsText(compile, key);
        if (readAsText.size > 5000) readAsText.clear();
        readAsText.set(key, text);
        return text;
    };

    const refresh = (document: vscode.TextDocument): void => {
        if (document.languageId !== 'text2frame') return;
        const lines = document.getText().split(/\r?\n/);
        const list: vscode.Diagnostic[] = [];
        const compile = compilerFor(document);
        if (compile) {
            lineKinds(lines).forEach((kind, line) => {
                if (kind !== 'tag') return;
                const name = tagLikeName(lines[line]);
                if (!name || !becomesText(compile, lines[line])) return;
                const start = lines[line].indexOf('<');
                const d = new vscode.Diagnostic(
                    new vscode.Range(line, start, line, start + name.length + 1),
                    `「<${name}」はタグとして読まれず、ゲームにそのまま文字で出ます。タグの名前を確かめてください。`,
                    vscode.DiagnosticSeverity.Information
                );
                d.code = FIX.unknownTag;
                d.source = 'Text2Frame';
                list.push(d);
            });
        }
        for (const conflict of findConflicts(lines)) {
            const first = conflict.units[0];
            const d = new vscode.Diagnostic(
                new vscode.Range(first.start, 0, conflict.units[2].end, lines[conflict.units[2].end].length),
                '未解決の競合です。電球(または Ctrl+.)から、残す方を選べます。',
                vscode.DiagnosticSeverity.Warning
            );
            d.code = FIX.conflict;
            d.source = 'Text2Frame';
            list.push(d);
        }
        diagnostics.set(document.uri, list);
    };
    const pending = new Map<string, NodeJS.Timeout>();
    const refreshSoon = (document: vscode.TextDocument): void => {
        const key = document.uri.toString();
        clearTimeout(pending.get(key));
        pending.set(key, setTimeout(() => { pending.delete(key); refresh(document); }, 400));
    };

    const actions: vscode.CodeActionProvider = {
        provideCodeActions(document, _range, ctx) {
            const out: vscode.CodeAction[] = [];
            const lines = document.getText().split(/\r?\n/);
            for (const d of ctx.diagnostics) {
                const line = d.range.start.line;
                const text = document.lineAt(line).text;
                if (d.code === FIX.unclosed) {
                    const a = new vscode.CodeAction('行の終わりに「>」を足す', vscode.CodeActionKind.QuickFix);
                    a.edit = new vscode.WorkspaceEdit();
                    a.edit.insert(document.uri, new vscode.Position(line, text.trimEnd().length), '>');
                    a.diagnostics = [d];
                    a.isPreferred = true;
                    out.push(a);
                } else if (d.code === FIX.emptyTag) {
                    const a = new vscode.CodeAction('空のタグ「<>」を消す', vscode.CodeActionKind.QuickFix);
                    a.edit = new vscode.WorkspaceEdit();
                    a.edit.delete(document.uri, d.range);
                    a.diagnostics = [d];
                    out.push(a);
                } else if (d.code === FIX.unknownTag) {
                    const name = tagLikeName(text);
                    const compile = compilerFor(document);
                    if (!name) continue;
                    for (const candidate of similarTagNames(name)) {
                        const fixed = replaceTagName(text, candidate);
                        if (compile && becomesText(compile, fixed)) continue;
                        const a = new vscode.CodeAction(`「<${candidate}」に直す`, vscode.CodeActionKind.QuickFix);
                        a.edit = new vscode.WorkspaceEdit();
                        a.edit.replace(document.uri, document.lineAt(line).range, fixed);
                        a.diagnostics = [d];
                        out.push(a);
                    }
                } else if (d.code === FIX.conflict) {
                    const conflict = findConflicts(lines).find((c) => c.units[0].start === line);
                    if (!conflict) continue;
                    const choices: Array<['text' | 'game' | 'both', string]> = [
                        ['text', 'テキストの方を残す'],
                        ['game', 'ゲームの方を残す'],
                        ['both', '両方残して、目印だけ消す']
                    ];
                    for (const [keep, title] of choices) {
                        const solved = resolveConflict(lines, conflict, keep);
                        const a = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
                        a.edit = new vscode.WorkspaceEdit();
                        const end = document.lineAt(solved.end).rangeIncludingLineBreak.end;
                        a.edit.replace(document.uri, new vscode.Range(solved.start, 0, end.line, end.character),
                            solved.lines.length ? solved.lines.join('\n') + '\n' : '');
                        a.diagnostics = [d];
                        out.push(a);
                    }
                } else if (d.code === MESSAGE_CODES.width) {
                    const a = new vscode.CodeAction('ここで改行する', vscode.CodeActionKind.QuickFix);
                    a.edit = new vscode.WorkspaceEdit();
                    a.edit.insert(document.uri, d.range.start, '\n');
                    a.diagnostics = [d];
                    out.push(a);
                } else if (d.code === MESSAGE_CODES.lines) {
                    const settings = messageSettingsFor(lines, line);
                    const a = new vscode.CodeAction(settings.length ? 'ここで次のウィンドウに分ける(顔や名前も引き継ぐ)' : 'ここで次のウィンドウに分ける', vscode.CodeActionKind.QuickFix);
                    a.edit = new vscode.WorkspaceEdit();
                    a.edit.insert(document.uri, new vscode.Position(line, 0), '\n' + settings.map((s) => s + '\n').join(''));
                    a.diagnostics = [d];
                    out.push(a);
                } else if (d.code === FIX.dbProblem) {
                    const a = new vscode.CodeAction('候補から選び直す', vscode.CodeActionKind.QuickFix);
                    a.command = { command: 'text2frame.fix.pickAgain', title: a.title, arguments: [document.uri, d.range] };
                    a.diagnostics = [d];
                    out.push(a);
                }
            }
            return out;
        }
    };

    context.subscriptions.push(
        diagnostics,
        vscode.languages.registerCodeActionsProvider(SELECTOR, actions, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }),
        vscode.workspace.onDidOpenTextDocument(refresh),
        vscode.workspace.onDidChangeTextDocument((e) => refreshSoon(e.document)),
        vscode.workspace.onDidCloseTextDocument((d) => diagnostics.delete(d.uri)),
        vscode.commands.registerCommand('text2frame.fix.pickAgain', async (uri: vscode.Uri, range: vscode.Range) => {
            const editor = await vscode.window.showTextDocument(uri);
            await editor.edit((b) => b.delete(range));
            editor.selection = new vscode.Selection(range.start, range.start);
            await vscode.commands.executeCommand('editor.action.triggerSuggest');
        })
    );
    vscode.workspace.textDocuments.forEach(refresh);
}
