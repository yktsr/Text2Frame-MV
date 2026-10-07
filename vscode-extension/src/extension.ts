import * as vscode from 'vscode';
import { registerDeployFeature, showCompiledJson } from './deploy';
import { registerReview } from './review';
import { registerNavigation } from './navigation';
import { registerEventLinks } from './eventLinks';
import { registerMapLinksView } from './mapLinksView';
import { registerMapGraph } from './mapGraph';
import { registerHistoryView } from './historyView';
import { registerQuickFixes, FIX } from './quickFixes';
import { registerSnippets } from './snippets';
import { basicProblems } from './db/checks';
import { registerMessageCheck } from './messageCheck';
import { registerProjectCheck } from './projectCheck';
import { registerAssetPicker } from './assetPicker';
import { registerTryEvent } from './tryEvent';
import { registerDebugger } from './debugSession';
import { exportCurrentFile, exportConversationOnly } from './exportText';
import { deployAll, exportAll, repullAllOverwrite } from './batch';
import { registerTreeView } from './tree';
import { registerCommandsView } from './commandsView';
import { parseFrontMatter } from './compiler';
import { DatabaseService } from './dbService';
import { registerDatabaseFeatures } from './dbFeatures';
import { registerDatabaseView } from './dbView';
import { registerPreview } from './preview';
import { registerColorSwatches } from './colorSwatches';
import { registerTestPlay } from './testPlay';
import { LiveService } from './live';
import { registerLiveView } from './liveView';
import { registerRunHighlight } from './runHighlight';
import { tagHelpText } from './tagHelp';
import { setJapanese } from './db/lang';
import { tagCompletions } from './tagCompletions';

/**
 * Treat a .txt file that carries Text2Frame front matter as the `text2frame`
 * language, so highlighting / completion / hover / diagnostics apply without
 * renaming files to .t2f. Only front-matter .txt files are affected.
 */
function maybeAssignLanguage(document: vscode.TextDocument): void {
    if (document.languageId === 'text2frame' || document.uri.scheme !== 'file') {
        return;
    }
    if (!document.fileName.toLowerCase().endsWith('.txt')) {
        return;
    }
    if (!parseFrontMatter(document.getText()).hasFrontMatter) {
        return;
    }
    vscode.languages.setTextDocumentLanguage(document, 'text2frame');
}

export function activate(context: vscode.ExtensionContext) {
    // 画面の言葉は VS Code の表示言語に合わせる(package.json の文字と同じ決め方)。
    setJapanese(vscode.env.language.toLowerCase().startsWith('ja'));

    // Watch & Deploy: compile the current text file back into the RPG Maker data JSON.
    registerDeployFeature(context);
    // 反映・取り出しの前の差分の確認。
    registerReview(context);
    // Activity Bar "Commands" panel (grouped, clickable actions).
    registerCommandsView(context);
    // データベースの名前を見せる(名前の薄い表示・ホバー・警告・名前から入力)。
    const database = new DatabaseService();
    const live = new LiveService();
    context.subscriptions.push(database, live);
    registerDatabaseFeatures(context, database, live);
    // サイドバーのデータベース一覧。
    registerDatabaseView(context, database, live);
    // 横のプレビュー(ツクールのイベント編集画面と同じ見た目)。
    const running = registerRunHighlight(context, database, live);
    registerPreview(context, database, running, live);
    // Activity Bar tree (Maps / Events / Pages / Common Events).
    registerTreeView(context, database, running, live);
    // 定義へ移動・参照の一覧・シンボル・アウトライン・折りたたみ。
    registerNavigation(context, database, running);
    // イベントのつながり(呼び出し階層)と、マップのつながりの欄。
    const eventLinks = registerEventLinks(context, database, running);
    registerMapLinksView(context, database, eventLinks, live);
    registerMapGraph(context, database, eventLinks);
    // 反映・取り出しの履歴(前の状態に戻す)。
    registerHistoryView(context);
    // クイックフィックス(電球)とスニペット。
    registerQuickFixes(context);
    registerSnippets(context);
    // メッセージのはみ出しと、プロジェクト全体の検査。
    registerMessageCheck(context, database);
    registerProjectCheck(context, database);
    // 顔画像・音声を見て選ぶ画面。
    registerAssetPicker(context, database);
    // このイベントから試す(テキストの先頭のリンク)。
    registerTryEvent(context, database, live);
    // ブレークポイント(VS Code の「実行とデバッグ」)。
    registerDebugger(context, database, live, running);
    // 色調・フラッシュの値の前に色見本。
    registerColorSwatches(context);
    // テストプレイ(ゲームを VS Code の中のブラウザで)。
    registerTestPlay(context, database, live);
    registerLiveView(context, database, live, running);

    // Auto-assign the text2frame language to front-matter .txt files (open now + later).
    vscode.workspace.textDocuments.forEach(maybeAssignLanguage);
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(maybeAssignLanguage),
        vscode.workspace.onDidSaveTextDocument(maybeAssignLanguage)
    );

    // Export / batch / preview commands.
    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.exportCurrentFile', () => exportCurrentFile(context)),
        vscode.commands.registerCommand('text2frame.exportConversationOnly', () => exportConversationOnly(context)),
        vscode.commands.registerCommand('text2frame.showCompiledJson', () => showCompiledJson(context)),
        vscode.commands.registerCommand('text2frame.deployAll', () => deployAll(context)),
        vscode.commands.registerCommand('text2frame.exportAll', () => exportAll(context)),
        vscode.commands.registerCommand('text2frame.repullOverwrite', () => repullAllOverwrite(context))
    );

    // < を打ったときのタグの一覧(中身は tagCompletions.ts)。
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'text2frame',
        { provideCompletionItems: () => tagCompletions() },
        '<' // Trigger completion when '<' is typed
    );

    // Register hover provider
    const hoverProvider = vscode.languages.registerHoverProvider('text2frame', {
        provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
            const range = document.getWordRangeAtPosition(position, /<([^>]+)>/);
            if (!range) {
                return;
            }

            const word = document.getText(range);
            const tagHelp = getTagHelp(word);
            
            if (tagHelp) {
                return new vscode.Hover(tagHelp);
            }
        }
    });

    // Register diagnostic provider
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('text2frame');
    
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
    }

    context.subscriptions.push(
        completionProvider,
        hoverProvider,
        diagnosticCollection,
        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
            if (editor) {
                updateDiagnostics(editor.document, diagnosticCollection);
            }
        }),
        vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
            if (e.document.languageId === 'text2frame') {
                updateDiagnostics(e.document, diagnosticCollection);
            }
        })
    );
}

function getTagHelp(tag: string): vscode.MarkdownString | undefined {
    const text = tagHelpText(tag);
    return text ? new vscode.MarkdownString(text) : undefined;
}

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
    if (document.languageId !== 'text2frame') {
        return;
    }

    const lines: string[] = [];
    for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);
    const diagnostics = basicProblems(lines).map((p) => {
        const d = new vscode.Diagnostic(
            new vscode.Range(p.line, p.start, p.line, p.end),
            p.message,
            p.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
        );
        if (p.code === FIX.unclosed || p.code === FIX.emptyTag) d.code = p.code;
        return d;
    });

    collection.set(document.uri, diagnostics);
}

export function deactivate() {}
