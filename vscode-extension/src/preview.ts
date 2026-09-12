import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseService } from './dbService';
import { loadCompiler } from './deploy';
import { workspaceRootFor, frontMatterBody } from './compiler';
import { renderCommands, PreviewRow } from './db/commandView';
import { RpgCommand } from './db/commandRefs';
import { previewHtml, FACE_SIZE } from './previewHtml';

/**
 * 横のプレビュー。テキストをコンパイルし、ツクールのイベント編集画面と同じ見た目で並べる。
 * 番号にはデータベースの名前を添え、文章の表示には顔画像を出す。
 *
 * Markdown のプレビューと同じく、開いているテキストに付いていく。編集すると少し間を置いて
 * 描き直す。コンパイルできない間は、最後に通った結果を残したままエラーを上に出す。
 */

const DEBOUNCE_MS = 300;

interface RenderMessage {
    type: 'render';
    title: string;
    rows: PreviewRow[];
    /** 顔の「名前(番号)」→ 画像の data URI。 */
    faces: { [key: string]: string };
    error?: string;
    notice?: string;
}

export function registerPreview(context: vscode.ExtensionContext, service: DatabaseService): void {
    let panel: vscode.WebviewPanel | undefined;
    let current: vscode.TextDocument | undefined;
    let timer: NodeJS.Timeout | undefined;
    let lastGood: RenderMessage | undefined;

    const render = (document: vscode.TextDocument): void => {
        if (!panel) return;
        const root = workspaceRootFor(document);
        const ctx = root ? service.forRoot(root) : undefined;
        const title = path.basename(document.fileName);
        panel.title = `プレビュー: ${title}`;
        const { mod } = loadCompiler(context, root);
        if (!mod || typeof mod.compile !== 'function') {
            post({ type: 'render', title, rows: [], faces: {}, error: 'コンパイラ (Text2Frame.js) が見つかりません。' });
            return;
        }
        let commands: RpgCommand[];
        try {
            commands = mod.compile(frontMatterBody(document.getText())) as RpgCommand[];
        } catch (e) {
            const error = e instanceof Error ? e.message.split('\n').slice(0, 2).join(' ') : String(e);
            // 最後に通った結果は残す(打っている途中で毎回真っ白にならないように)。
            const base: RenderMessage = lastGood || { type: 'render', title, rows: [], faces: {} };
            post({ ...base, error });
            return;
        }
        const rows = renderCommands(commands, ctx?.db);
        const faces: { [key: string]: string } = {};
        if (ctx) {
            for (const r of rows) {
                if (!r.face) continue;
                const key = `${r.face.name}(${r.face.index})`;
                if (faces[key] !== undefined) continue;
                faces[key] = service.faceUri(ctx, r.face.name, r.face.index, FACE_SIZE) || '';
            }
        }
        const notice = ctx ? undefined : 'データベース(data/System.json)が見つからないため、名前と顔画像は出せません。';
        lastGood = { type: 'render', title, rows, faces, notice };
        post(lastGood);
    };

    const post = (message: RenderMessage): void => {
        panel?.webview.postMessage(message);
    };

    const renderSoon = (document: vscode.TextDocument): void => {
        clearTimeout(timer);
        timer = setTimeout(() => render(document), DEBOUNCE_MS);
    };

    const show = (document: vscode.TextDocument): void => {
        current = document;
        lastGood = undefined;
        render(document);
    };

    const open = (): void => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'text2frame') {
            vscode.window.showInformationMessage('Text2Frame: プレビューするテキストを開いてください。');
            return;
        }
        if (panel) {
            panel.reveal(vscode.ViewColumn.Beside, true);
            show(editor.document);
            return;
        }
        panel = vscode.window.createWebviewPanel('text2framePreview', 'プレビュー', { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: []
        });
        panel.webview.html = previewHtml();
        panel.onDidDispose(() => { panel = undefined; current = undefined; lastGood = undefined; }, null, context.subscriptions);
        show(editor.document);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.showPreview', open),
        vscode.workspace.onDidChangeTextDocument((e) => { if (panel && current && e.document === current) renderSoon(e.document); }),
        vscode.window.onDidChangeActiveTextEditor((e) => {
            if (panel && e && e.document.languageId === 'text2frame' && e.document !== current) show(e.document);
        }),
        service.onDidChange(() => { if (panel && current) render(current); })
    );
}
