import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseService } from './dbService';
import { loadCompiler } from './deploy';
import { workspaceRootFor, parseFrontMatter } from './compiler';
import { compileWithLines } from './compileLines';
import { renderCommands, PreviewRow } from './db/commandView';
import { RpgCommand } from './db/commandRefs';
import { previewHtml, FACE_SIZE } from './previewHtml';
import { readAudio, AUDIO_FOLDERS, AudioFolder } from './db/audio';
import { RunTracker } from './runHighlight';
import { messageFitFor, overflowNote } from './messageCheck';
import { EditorLayout, isNextTo, Side } from './editorLayout';
import { LiveService } from './live';
import { tr } from './db/lang';

/**
 * 横のプレビュー。テキストをコンパイルし、ツクールのイベント編集画面と同じ見た目で並べる。
 * 番号にはデータベースの名前を添え、文章の表示には顔画像を出す。
 *
 * Markdown のプレビューと同じく、開いているテキストに付いていく。編集すると少し間を置いて
 * 描き直す。コンパイルできない間は、最後に通った結果を残したままエラーを上に出す。
 */

const DEBOUNCE_MS = 300;
const PREVIEW_VIEW = 'text2framePreview';
const PLAYING_GRACE = 10000;
const PLAYING_CHECK = 1000;
const FOCUS_GROUP = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'].map((n) => `workbench.action.focus${n}EditorGroup`);

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

type AudioMessage =
    | { type: 'audio'; id: number; mime: string; data: string }
    | { type: 'audioError'; id: number; message: string };

export function registerPreview(context: vscode.ExtensionContext, service: DatabaseService, tracker: RunTracker, live: LiveService): void {
    let panel: vscode.WebviewPanel | undefined;
    let current: vscode.TextDocument | undefined;
    let timer: NodeJS.Timeout | undefined;
    let lastGood: RenderMessage | undefined;
    /** 表示中の行の対応が、今のテキストと合っていない(編集した直後・コンパイルできない間)。 */
    let stale = false;

    const render = (document: vscode.TextDocument): void => {
        if (!panel) return;
        const root = workspaceRootFor(document);
        const ctx = service.forDocument(document);
        const title = path.basename(document.fileName);
        panel.title = tr(`プレビュー: ${title}`, `Preview: ${title}`);
        const { mod } = loadCompiler(context, root);
        if (!mod || typeof mod.compile !== 'function') {
            post({ type: 'render', title, rows: [], faces: {}, error: tr('コンパイラ (Text2Frame.js) が見つかりません。', 'The compiler (Text2Frame.js) was not found.') });
            return;
        }
        let commands: RpgCommand[];
        let lines: number[] | undefined;
        try {
            // lineMap を知らない古いコンパイラでは lines が無い。表示はできるが、カーソルとは結べない。
            ({ commands, lines } = compileWithLines(mod, document.getText()));
        } catch (e) {
            const error = e instanceof Error ? e.message.split('\n').slice(0, 2).join(' ') : String(e);
            // 最後に通った結果は残す(打っている途中で毎回真っ白にならないように)。ただし行の対応は外す。
            // 通ったあとに行を足したり消したりしていれば、古い対応では強調やクリックが別の行を指してしまう。
            const base: RenderMessage = lastGood ? { ...lastGood, lines: undefined } : { type: 'render', title, rows: [], faces: {} };
            stale = true;
            post({ ...base, error });
            post({ type: 'highlight', indices: [] });
            running();
            return;
        }
        // マップのイベントのテキストなら、キャラクターの番号にイベントの名前と座標を添える。
        const meta = parseFrontMatter(document.getText()).meta;
        const mapId = meta.kind === 'common' ? NaN : parseInt(meta.mapId, 10);
        const events = ctx && Number.isInteger(mapId) ? service.mapEvents(ctx, mapId) : undefined;
        const rows = renderCommands(commands, ctx?.db, events ? { mapId, events } : undefined);
        const fit = ctx ? messageFitFor(ctx) : undefined;
        if (fit) {
            for (const r of rows) {
                const cmd = commands[r.index];
                if (!cmd || cmd.code !== 401) continue;
                let head = r.index;
                while (head > 0 && commands[head].code !== 101) head--;
                const face = commands[head] && commands[head].code === 101 && !!commands[head].parameters[0];
                r.warn = overflowNote(String(cmd.parameters[0] ?? ''), face, fit);
            }
        }
        const faces: { [key: string]: string } = {};
        if (ctx) {
            for (const r of rows) {
                if (!r.face) continue;
                const key = `${r.face.name}(${r.face.index})`;
                if (faces[key] !== undefined) continue;
                faces[key] = service.faceUri(ctx, r.face.name, r.face.index, FACE_SIZE) || '';
            }
        }
        const notice = ctx ? undefined : tr('データベース(data/System.json)が見つからないため、名前と顔画像は出せません。', 'The database (data/System.json) was not found, so names and faces cannot be shown.');
        lastGood = { type: 'render', title, rows, lines, faces, notice };
        stale = false;
        post(lastGood);
        highlight();
        running();
    };

    const running = (): void => {
        const lines = stale ? undefined : lastGood?.lines;
        if (!panel) return;
        const message = { type: 'running' as const, current: [] as number[], callers: [] as number[], exact: true };
        const frames = tracker.current();
        frames.forEach((f, n) => {
            const { from, to } = f;
            if (!lines || !current || f.uri?.fsPath !== current.uri.fsPath || from === undefined || to === undefined) return;
            const inner = n === frames.length - 1;
            lines.forEach((l, k) => { if (l >= from && l <= to) (inner ? message.current : message.callers).push(k); });
            if (inner) message.exact = f.exact;
        });
        post(message);
    };

    const post = (message: RenderMessage | { type: 'highlight'; indices: number[] } | { type: 'running'; current: number[]; callers: number[]; exact: boolean } | AudioMessage): void => {
        panel?.webview.postMessage(message);
    };

    const play = (id: number, folder: string, name: string): void => {
        const ctx = current ? service.forDocument(current) : undefined;
        if (!ctx) {
            post({ type: 'audioError', id, message: tr('データベース(data/System.json)が見つからないので、音声の置き場が分かりません。', 'The database (data/System.json) was not found, so where the audio is is not known.') });
            return;
        }
        const audio = AUDIO_FOLDERS.includes(folder as AudioFolder)
            ? readAudio(path.join(path.dirname(ctx.dataDir), 'audio'), folder as AudioFolder, name, ctx.db.system.encryptionKey)
            : undefined;
        if (!audio) {
            post({ type: 'audioError', id, message: `audio/${folder}/${name} が見つかりません(読めません)。` });
            return;
        }
        post({ type: 'audio', id, mime: audio.mime, data: audio.data.toString('base64') });
    };

    /* エディタのカーソル行に対応するコマンドを強調する。その行からコマンドが出ていなければ
     * (見出しだけの行やブロックの途中など)、手前でいちばん近い行のコマンドにする。 */
    const highlight = (): void => {
        const lines = stale ? undefined : lastGood?.lines;
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
        if (!current || stale) return; // 行の対応が古い間は飛ばない(別の行へ飛んでしまう)
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

    /* テストプレイ中はテキストの下、そうでなければテキストの右に置く。 */
    const testPlaying = (): boolean => {
        const state = live.current()?.state;
        return !!state && state.received() && Date.now() - state.lastSeen < PLAYING_GRACE;
    };
    const sideNow = (): Side => (testPlaying() ? 'below' : 'right');

    const open = (): void => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'text2frame') {
            vscode.window.showInformationMessage(tr('Text2Frame: プレビューするテキストを開いてください。', 'Text2Frame: Open a text to preview.'));
            return;
        }
        place(editor.document.uri, sideNow(), testPlaying());
    };

    const shownEditor = (uri: vscode.Uri): vscode.TextEditor | undefined =>
        vscode.window.visibleTextEditors.find((e) => e.document.uri.fsPath === uri.fsPath);

    const previewTabOpen = (): boolean => vscode.window.tabGroups.all.some((g) => g.tabs.some((t) =>
        t.input instanceof vscode.TabInputWebview && (t.input.viewType === PREVIEW_VIEW || t.input.viewType.endsWith('-' + PREVIEW_VIEW))));

    const placedAt = async (editor: vscode.TextEditor, preview: vscode.WebviewPanel, side: Side): Promise<boolean | undefined> => {
        if (!editor.viewColumn || !preview.viewColumn) return undefined;
        const layout = await vscode.commands.executeCommand<EditorLayout>('vscode.getEditorLayout');
        return isNextTo(layout, editor.viewColumn, preview.viewColumn, vscode.window.tabGroups.all.length, side);
    };

    /* 開いたテキストの下(右)にプレビューを開く。move なら、ほかの場所にあるプレビューも置き直す。
     * 入力の場所(ゲームの画面など)は、開く前のところへ戻す。 */
    let opening: Promise<void> | undefined;
    const place = async (uri: vscode.Uri, side: Side, move = true): Promise<void> => {
        while (opening) await opening;
        let editor = shownEditor(uri);
        if (!editor) return;
        if (panel) {
            if (!move || ((await placedAt(editor, panel, side)) ?? true)) {
                if (!panel.visible) panel.reveal(undefined, true);
                if (current !== editor.document) show(editor.document);
                return;
            }
            panel.dispose();
            for (let i = 0; i < 20 && previewTabOpen(); i++) await new Promise((r) => setTimeout(r, 50));
            editor = shownEditor(uri);
            if (!editor) return;
        }
        const column = editor.viewColumn;
        if (!column || column > FOCUS_GROUP.length) {
            create(vscode.ViewColumn.Beside, editor.document);
            return;
        }
        const back = vscode.window.tabGroups.activeTabGroup.viewColumn;
        opening = (async () => {
            await vscode.commands.executeCommand(FOCUS_GROUP[column - 1]);
            await vscode.commands.executeCommand(side === 'below' ? 'workbench.action.newGroupBelow' : 'workbench.action.newGroupRight');
            create(vscode.ViewColumn.Active, editor.document);
            const target = back > column ? back + 1 : back;
            if (target <= FOCUS_GROUP.length) await vscode.commands.executeCommand(FOCUS_GROUP[target - 1]);
        })();
        try {
            await opening;
        } finally {
            opening = undefined;
        }
    };

    /* テストプレイが始まったらテキストの下へ、終わったら(下に置いたままなら)右へ戻す。 */
    let playing = false;
    const followPlaying = async (): Promise<void> => {
        const now = testPlaying();
        if (now === playing) return;
        playing = now;
        if (!panel || !current) return;
        if (now) {
            await place(current.uri, 'below');
            return;
        }
        const editor = shownEditor(current.uri);
        if (editor && (await placedAt(editor, panel, 'below')) === true) await place(current.uri, 'right');
    };
    const playingTimer = setInterval(() => { followPlaying(); }, PLAYING_CHECK);

    const create = (column: vscode.ViewColumn, document: vscode.TextDocument): void => {
        panel = vscode.window.createWebviewPanel(PREVIEW_VIEW, tr('プレビュー', 'Preview'), { viewColumn: column, preserveFocus: true }, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: []
        });
        panel.webview.html = previewHtml();
        panel.webview.onDidReceiveMessage((m) => {
            if (m && m.type === 'reveal' && typeof m.line === 'number') reveal(m.line);
            if (m && m.type === 'play' && typeof m.id === 'number' && typeof m.folder === 'string' && typeof m.name === 'string') play(m.id, m.folder, m.name);
        }, null, context.subscriptions);
        panel.onDidDispose(() => { panel = undefined; current = undefined; lastGood = undefined; }, null, context.subscriptions);
        show(document);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.showPreview', open),
        vscode.commands.registerCommand('text2frame.showPreviewFor', (uri: vscode.Uri) => place(uri, sideNow(), testPlaying())),
        vscode.commands.registerCommand('text2frame.previewUnderText', () => (panel && current ? place(current.uri, 'below') : undefined)),
        { dispose: () => clearInterval(playingTimer) },
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (!panel || !current || e.document !== current) return;
            // 描き直すまでは行の対応が古い。その間にカーソルが動いても強調しない。
            stale = true;
            renderSoon(e.document);
        }),
        vscode.window.onDidChangeActiveTextEditor((e) => {
            if (panel && e && e.document.languageId === 'text2frame' && e.document !== current) show(e.document);
        }),
        service.onDidChange(() => { if (panel && current) render(current); }),
        vscode.window.onDidChangeTextEditorSelection((e) => { if (panel && e.textEditor.document === current) highlight(); }),
        tracker.onDidChange(() => running())
    );
}
