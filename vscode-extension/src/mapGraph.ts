import * as vscode from 'vscode';
import { DatabaseService, DbContext } from './dbService';
import { LinkService } from './eventLinks';
import { mapGraphHtml } from './mapGraphHtml';
import { parseFrontMatter, workspaceRootFor } from './compiler';
import { placeFromMeta } from './placeLabel';
import { mapLabel } from './db/mapTree';
import { mapLinks } from './db/eventLinks';
import { buildGraph } from './db/mapGraph';

/**
 * マップのつながりの図(タブ)。丸がマップ、矢印が場所移動。
 * 丸を押すとそのマップが真ん中になり、矢印を押すと移動している行へ飛ぶ。
 */

const BIG = 100;

export function registerMapGraph(context: vscode.ExtensionContext, service: DatabaseService, links: LinkService): void {
    let panel: vscode.WebviewPanel | undefined;
    let center = 0;
    let hops = 2;
    let vehicle = false;

    const contextFor = (): DbContext | undefined => {
        const root = workspaceRootFor();
        return root ? service.forRoot(root) : undefined;
    };

    const mapOfEditor = (): number => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'text2frame') return 0;
        const place = placeFromMeta(parseFrontMatter(editor.document.getText()).meta);
        return place && place.kind === 'event' ? place.mapId : 0;
    };

    const post = (maxNodes = BIG): void => {
        const ctx = contextFor();
        if (!panel || !ctx) return;
        const graph = buildGraph(mapLinks(links.index(ctx).all()), { center, hops, vehicle, maxNodes });
        const names: Record<number, string> = {};
        for (const node of graph.nodes) {
            const hit = ctx.db.lookup('map', node.id);
            names[node.id] = mapLabel({ id: node.id, name: hit.status === 'named' ? hit.name : '' });
        }
        panel.webview.postMessage({ type: 'graph', ...graph, center, hops, vehicle, names });
    };

    const receive = async (message: { type?: string; mapId?: number; hops?: number; vehicle?: boolean; at?: string; index?: number }): Promise<void> => {
        if (message.type === 'ready') post();
        else if (message.type === 'hops') { hops = Number(message.hops) || 2; post(); }
        else if (message.type === 'vehicle') { vehicle = !!message.vehicle; post(); }
        else if (message.type === 'center') { center = Number(message.mapId) || 0; post(); }
        else if (message.type === 'open' && message.at) {
            await vscode.commands.executeCommand('text2frame.mapLinks.open', message.at, message.index);
        } else if (message.type === 'all') {
            const ctx = contextFor();
            if (!ctx) return;
            const all = buildGraph(mapLinks(links.index(ctx).all()), { center: 0, hops: 1, vehicle, maxNodes: 100000 });
            if (all.nodes.length > BIG) {
                const choice = await vscode.window.showWarningMessage(
                    `Text2Frame: マップが ${all.nodes.length} 個あります。全部出すと見づらくなります。`, '全部出す', 'やめる');
                if (choice !== '全部出す') return;
            }
            center = 0;
            post(100000);
        }
    };

    const open = (mapId?: number): void => {
        center = Number(mapId) || mapOfEditor();
        if (panel) {
            panel.reveal(undefined, false);
            post();
            return;
        }
        panel = vscode.window.createWebviewPanel('text2frameMapGraph', 'マップのつながり', { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false }, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: []
        });
        panel.webview.html = mapGraphHtml();
        panel.webview.onDidReceiveMessage((m) => { receive(m); }, null, context.subscriptions);
        panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('text2frame.showMapGraph', (mapId?: number) => open(mapId)),
        vscode.commands.registerCommand('text2frame.tree.mapGraph', (node: { data?: { mapId?: string } }) => open(Number(node && node.data && node.data.mapId)))
    );
}
