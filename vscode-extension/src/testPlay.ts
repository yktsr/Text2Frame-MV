import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService, DbContext } from './dbService';
import { workspaceRootFor } from './compiler';
import { GameServer, startGameServer } from './gameServer';
import { LiveService } from './live';
import { tr } from './db/lang';

/**
 * テストプレイ。ゲームのフォルダをローカルの HTTP サーバーで配り、VS Code の中のブラウザ
 * (内蔵ブラウザ。古い VS Code では Simple Browser)で開く。URL に ?test を付けるので、ツクールのテストプレイと同じくテストモードになる
 * (F9 のデバッグ画面など)。サーバーは拡張の中で動き、フォルダごとに1つ。VS Code を閉じれば止まる。
 *
 * 反映したデータは、ブラウザの再読み込みで効く(サーバーはキャッシュさせない)。
 */

/** FOSSIL プラグインは初回に index.html から FOSSILindex.html を書き出して移る(nw.js の fs を使う)。
 *  ブラウザでは書き出せないので、書き出し済みならそちらから開く。 */
const FOSSIL_PAGE = 'FOSSILindex.html';
const BROWSER_OPEN = 'workbench.action.browser.open';

export function registerTestPlay(context: vscode.ExtensionContext, service: DatabaseService, live: LiveService): void {
    const servers = new Map<string, GameServer>();

    /** 開いているテキストのプロジェクト。 */
    const projectFor = (): DbContext | undefined => {
        const document = vscode.window.activeTextEditor?.document;
        const ctx = service.forDocument(document);
        if (ctx) return ctx;
        const root = workspaceRootFor(document);
        return root ? service.forRoot(root) : undefined;
    };

    const pageFor = (gameRoot: string): string => {
        const configured = vscode.workspace.getConfiguration('text2frame').get<string>('testPlayPage', '') || '';
        if (configured) return configured.replace(/^\/+/, '');
        return fs.existsSync(path.join(gameRoot, FOSSIL_PAGE)) ? FOSSIL_PAGE : 'index.html';
    };

    /** サーバーを開いて(開いていれば使い回して)、テストプレイの URL を返す。 */
    const prepare = async (): Promise<vscode.Uri | undefined> => {
        const ctx = projectFor();
        if (!ctx) {
            vscode.window.showErrorMessage(tr('Text2Frame: ツクールのプロジェクト(data/System.json)が見つかりません。プロジェクトのテキストを開いてから実行してください。', 'Text2Frame: No RPG Maker project (data/System.json) was found. Open a text of the project first.'));
            return undefined;
        }
        // ゲームのフォルダ(index.html のあるところ)。
        const gameRoot = path.dirname(ctx.dataDir);
        const page = pageFor(gameRoot);
        if (!fs.existsSync(path.join(gameRoot, page))) {
            vscode.window.showErrorMessage(tr(`Text2Frame: ${path.join(gameRoot, page)} がありません。`, `Text2Frame: ${path.join(gameRoot, page)} does not exist.`));
            return undefined;
        }
        let server = servers.get(gameRoot);
        if (!server) {
            const started = await startGameServer(gameRoot, undefined, { onState: (message) => live.apply(gameRoot, message) });
            servers.set(gameRoot, started);
            live.start(gameRoot, ctx.root, (command) => started.send(command));
            server = started;
        }
        // リモート(SSH・WSL など)でも手元のブラウザから届くように、VS Code に転送させる。
        return vscode.env.asExternalUri(vscode.Uri.parse(`${server.url}${encodeURI(page)}?test`));
    };

    /* 新しい内蔵ブラウザがあれば、テキストの隣の専用のグループに開く(開いてあればそのタブを使う)。
     * 無ければ Simple Browser で隣に開く。 */
    const openBrowser = async (uri: vscode.Uri): Promise<void> => {
        if (!(await vscode.commands.getCommands(true)).includes(BROWSER_OPEN)) {
            await vscode.commands.executeCommand('simpleBrowser.api.open', uri, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false });
            return;
        }
        const text = vscode.window.activeTextEditor?.document.languageId === 'text2frame'
            ? vscode.window.activeTextEditor
            : vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'text2frame');
        if (text) await vscode.window.showTextDocument(text.document, { viewColumn: text.viewColumn });
        const reuseUrlFilter = uri.with({ path: '/**', query: '', fragment: '' }).toString(true);
        await vscode.commands.executeCommand(BROWSER_OPEN, { url: uri.toString(true), openToSide: true, reuseUrlFilter });
        await vscode.commands.executeCommand('text2frame.previewUnderText');
    };

    const playInside = async (): Promise<void> => {
        const uri = await prepare();
        if (!uri) return;
        await vscode.commands.executeCommand('text2frame.showLiveValues');
        try {
            await openBrowser(uri);
        } catch (e) {
            // 内蔵のブラウザが使えない環境では、外のブラウザで開く。
            await vscode.env.openExternal(uri);
        }
    };

    const playOutside = async (): Promise<void> => {
        const uri = await prepare();
        if (!uri) return;
        await vscode.commands.executeCommand('text2frame.showLiveValues');
        await vscode.env.openExternal(uri);
    };

    const stop = async (): Promise<void> => {
        const count = servers.size;
        await Promise.all(Array.from(servers.values()).map((s) => s.close()));
        servers.forEach((_s, root) => live.clear(root));
        servers.clear();
        vscode.window.showInformationMessage(count ? tr('Text2Frame: テストプレイのサーバーを止めました。', 'Text2Frame: Stopped the test play server.') : tr('Text2Frame: 動いているテストプレイのサーバーはありません。', 'Text2Frame: No test play server is running.'));
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.testPlay', playInside),
        vscode.commands.registerCommand('text2frame.testPlayExternal', playOutside),
        vscode.commands.registerCommand('text2frame.stopTestPlay', stop),
        { dispose: () => { servers.forEach((s) => { s.close(); }); servers.clear(); } }
    );
}
