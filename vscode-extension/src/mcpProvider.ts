import * as path from 'path';
import * as vscode from 'vscode';
import { settingFor } from './compiler';
import { mcpArgs, mcpLabel, mcpRoots } from './mcpRoots';

/*
 * 同梱の MCP サーバ(lib/t2f-mcp.js)を VS Code のチャットに知らせる。
 * 拡張を入れただけで使えるようにするのが目的で、設定ファイルは要らない。
 *
 * command は process.execPath = **VS Code 自身の実行ファイル**。API の説明が
 * 想定の使い方として挙げている("Node.js-based servers may use `process.execPath`
 * to use the editor's version of Node.js to run the script")。おかげで利用者の
 * 手元に node も npm も要らない。ELECTRON_RUN_AS_NODE はそれを Node として
 * 振る舞わせる旗。
 *
 * サーバは1プロセスとして起こされるので Node の組み込み以外に依存できない。
 * .vsix に node_modules は入らないため、t2f-mcp.js は commander を使わない。
 *
 * フォルダの選別と引数の組み立ては vscode を使わない src/mcpRoots.ts に置いた。
 */

const PROVIDER_ID = 'text2frame.mcp';
const SERVER = path.join('lib', 't2f-mcp.js');

export function registerMcpProvider(context: vscode.ExtensionContext): void {
    const changed = new vscode.EventEmitter<void>();

    const provide = (): vscode.McpStdioServerDefinition[] => {
        const folders = (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath);
        const roots = mcpRoots(folders, (folder) => settingFor(folder, 'dataDir', 'data'));
        /* 版を渡すと、拡張が更新されたときに VS Code が道具を読み直す。 */
        const version = String((context.extension.packageJSON || {}).version || '');

        return roots.map((root) => {
            const server = new vscode.McpStdioServerDefinition(
                mcpLabel(root, roots.length),
                process.execPath,
                mcpArgs(
                    context.asAbsolutePath(SERVER),
                    root,
                    settingFor(root, 'dataDir', 'data'),
                    settingFor(root, 'textBaseDir', 'text')
                ),
                { ELECTRON_RUN_AS_NODE: '1' },
                version
            );
            server.cwd = vscode.Uri.file(root);
            return server;
        });
    };

    context.subscriptions.push(
        changed,
        // フォルダが増減したら差し出す一覧も変わる。
        vscode.workspace.onDidChangeWorkspaceFolders(() => changed.fire()),
        /* フォルダ名の設定が変わると、どのフォルダが対象かも渡す引数も変わる。
         * 聞いていないと、設定を直してもサーバは古いフォルダを見たままになる。 */
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('text2frame.dataDir') || e.affectsConfiguration('text2frame.textBaseDir')) changed.fire();
        }),
        vscode.lm.registerMcpServerDefinitionProvider(PROVIDER_ID, {
            onDidChangeMcpServerDefinitions: changed.event,
            provideMcpServerDefinitions: provide
        })
    );
}
