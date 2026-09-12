import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from './dbService';
import { workspaceRootFor } from './compiler';
import { GameServer, startGameServer } from './gameServer';

/**
 * テストプレイ。ゲームのフォルダをローカルの HTTP サーバーで配り、VS Code の中のブラウザ
 * (Simple Browser)で開く。URL に ?test を付けるので、ツクールのテストプレイと同じくテストモードになる
 * (F9 のデバッグ画面など)。サーバーは拡張の中で動き、フォルダごとに1つ。VS Code を閉じれば止まる。
 *
 * 反映したデータは、ブラウザの再読み込みで効く(サーバーはキャッシュさせない)。
 */

/** FOSSIL プラグインは初回に index.html から FOSSILindex.html を書き出して移る(nw.js の fs を使う)。
 *  ブラウザでは書き出せないので、書き出し済みならそちらから開く。 */
const FOSSIL_PAGE = 'FOSSILindex.html';

export function registerTestPlay(context: vscode.ExtensionContext, service: DatabaseService): void {
    const servers = new Map<string, GameServer>();

    /** 開いているテキストのゲームのフォルダ(index.html のあるところ)。 */
    const gameRootFor = (): string | undefined => {
        const document = vscode.window.activeTextEditor?.document;
        let ctx = service.forDocument(document);
        if (!ctx) {
            const root = workspaceRootFor(document);
            ctx = root ? service.forRoot(root) : undefined;
        }
        return ctx ? path.dirname(ctx.dataDir) : undefined;
    };

    const pageFor = (gameRoot: string): string => {
        const configured = vscode.workspace.getConfiguration('text2frame').get<string>('testPlayPage', '') || '';
        if (configured) return configured.replace(/^\/+/, '');
        return fs.existsSync(path.join(gameRoot, FOSSIL_PAGE)) ? FOSSIL_PAGE : 'index.html';
    };

    /** サーバーを開いて(開いていれば使い回して)、テストプレイの URL を返す。 */
    const prepare = async (): Promise<vscode.Uri | undefined> => {
        const gameRoot = gameRootFor();
        if (!gameRoot) {
            vscode.window.showErrorMessage('Text2Frame: ツクールのプロジェクト(data/System.json)が見つかりません。プロジェクトのテキストを開いてから実行してください。');
            return undefined;
        }
        const page = pageFor(gameRoot);
        if (!fs.existsSync(path.join(gameRoot, page))) {
            vscode.window.showErrorMessage(`Text2Frame: ${path.join(gameRoot, page)} がありません。`);
            return undefined;
        }
        let server = servers.get(gameRoot);
        if (!server) {
            server = await startGameServer(gameRoot);
            servers.set(gameRoot, server);
        }
        // リモート(SSH・WSL など)でも手元のブラウザから届くように、VS Code に転送させる。
        return vscode.env.asExternalUri(vscode.Uri.parse(`${server.url}${encodeURI(page)}?test`));
    };

    const playInside = async (): Promise<void> => {
        const uri = await prepare();
        if (!uri) return;
        try {
            await vscode.commands.executeCommand('simpleBrowser.api.open', uri, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false });
        } catch (e) {
            // 内蔵のブラウザが使えない環境では、外のブラウザで開く。
            await vscode.env.openExternal(uri);
        }
    };

    const playOutside = async (): Promise<void> => {
        const uri = await prepare();
        if (uri) await vscode.env.openExternal(uri);
    };

    const stop = async (): Promise<void> => {
        const count = servers.size;
        await Promise.all(Array.from(servers.values()).map((s) => s.close()));
        servers.clear();
        vscode.window.showInformationMessage(count ? 'Text2Frame: テストプレイのサーバーを止めました。' : 'Text2Frame: 動いているテストプレイのサーバーはありません。');
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.testPlay', playInside),
        vscode.commands.registerCommand('text2frame.testPlayExternal', playOutside),
        vscode.commands.registerCommand('text2frame.stopTestPlay', stop),
        { dispose: () => { servers.forEach((s) => { s.close(); }); servers.clear(); } }
    );
}
