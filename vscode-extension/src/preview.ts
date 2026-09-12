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
    /** rows と同じ並びで、そのコマンドが出てきた文書の行番号(0始まり)。古いコンパイラでは無い。 */
    lines?: number[];
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
        let lines: number[] | undefined;
        try {
            const out = mod.compile(frontMatterBody(document.getText()), { lineMap: true });
            if (Array.isArray(out)) {
                // lineMap を知らない古いコンパイラ。表示はできるが、カーソルとは結べない。
                commands = out as RpgCommand[];
            } else {
                const r = out as { commands: RpgCommand[]; lineMap: number[] };
                commands = r.commands;
                const offset = bodyLineOffset(document.getText());
                lines = r.lineMap.map((l) => l + offset);
            }
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
        lastGood = { type: 'render', title, rows, lines, faces, notice };
        post(lastGood);
        highlight();
    };

    const post = (message: RenderMessage | { type: 'highlight'; indices: number[] }): void => {
        panel?.webview.postMessage(message);
    };

    /* エディタのカーソル行に対応するコマンドを強調する。その行からコマンドが出ていなければ
     * (見出しだけの行やブロックの途中など)、手前でいちばん近い行のコマンドにする。 */
    const highlight = (): void => {
        const lines = lastGood?.lines;
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === current);
        if (!panel || !lines || !editor) return;
        const cursor = editor.selection.active.line;
        let target = -1;
        for (const l of lines) if (l <= cursor && l > target) target = l;
        const indices: number[] = [];
        lines.forEach((l, k) => { if (l === target) indices.push(k); });
        post({ type: 'highlight', indices });
    };

    /* プレビューの行をクリックしたら、その行を出したテキストの行へ飛ぶ。 */
    const reveal = async (line: number): Promise<void> => {
        if (!current) return;
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === current);
        const range = new vscode.Range(line, 0, line, 0);
        await vscode.window.showTextDocument(current, { viewColumn: editor?.viewColumn ?? vscode.ViewColumn.One, selection: range });
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
        panel.webview.onDidReceiveMessage((m) => { if (m && m.type === 'reveal' && typeof m.line === 'number') reveal(m.line); }, null, context.subscriptions);
        panel.onDidDispose(() => { panel = undefined; current = undefined; lastGood = undefined; }, null, context.subscriptions);
        show(editor.document);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.showPreview', open),
        vscode.workspace.onDidChangeTextDocument((e) => { if (panel && current && e.document === current) renderSoon(e.document); }),
        vscode.window.onDidChangeActiveTextEditor((e) => {
            if (panel && e && e.document.languageId === 'text2frame' && e.document !== current) show(e.document);
        }),
        service.onDidChange(() => { if (panel && current) render(current); }),
        vscode.window.onDidChangeTextEditorSelection((e) => { if (panel && e.textEditor.document === current) highlight(); })
    );
}

/** front matter(--- から ---)の行数。コンパイラには本文だけを渡すので、その分だけ行番号をずらす。 */
function bodyLineOffset(text: string): number {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const body = frontMatterBody(text);
    if (body === text || !normalized.endsWith(body)) return 0;
    return normalized.slice(0, normalized.length - body.length).split('\n').length - 1;
}
