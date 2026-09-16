import * as vscode from 'vscode';
import { DatabaseService, DbContext } from './dbService';
import { LiveService } from './live';
import { LinkService } from './eventLinks';
import { parseFrontMatter, workspaceRootFor } from './compiler';
import { placeFromMeta } from './placeLabel';
import { padId } from './db/database';
import { mapLabel } from './db/mapTree';
import { eventId as eventLabelId } from './db/describe';
import { MapLink, mapLinks, nodeFromKey } from './db/eventLinks';

/**
 * 「マップのつながり」の欄。場所移動(TransferPlayer)で、
 * このマップから行けるマップと、このマップへ来られるマップを並べ、何段でもたどれるようにする。
 * 見るマップは、テストプレイ中はゲームが今いるマップ、そうでなければ開いているテキストのマップ。
 */

type NodeType = 'group' | 'map' | 'place' | 'unknown';

interface NodeData {
    dir: 'out' | 'in';
    /** たどってきたマップの道すじ(輪を止めるため)。 */
    path: number[];
    mapId?: number;
    /** 移動しているページ・コモンイベント。 */
    at?: string;
    index?: number;
    variableId?: number;
}

class LinkNode extends vscode.TreeItem {
    constructor(public readonly nodeType: NodeType, label: string, collapsible: vscode.TreeItemCollapsibleState, public readonly data: NodeData) {
        super(label, collapsible);
        this.contextValue = 'text2frame.mapLink.' + nodeType;
        this.id = [nodeType, data.dir, data.path.join('>'), data.mapId ?? '', data.at ?? '', data.index ?? '', data.variableId ?? ''].join('|');
    }
}

export class MapLinksProvider implements vscode.TreeDataProvider<LinkNode> {
    private _onDidChange = new vscode.EventEmitter<LinkNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChange.event;
    private mapId = 0;
    /** テストプレイのゲームが今いるマップ。 */
    private gameMapId = 0;

    constructor(private readonly service: DatabaseService, private readonly links: LinkService) {}

    /** 見ているマップ。 */
    current(): number {
        return this.mapId;
    }

    show(mapId: number): void {
        if (!Number.isInteger(mapId) || mapId <= 0 || mapId === this.mapId) return;
        this.mapId = mapId;
        this._onDidChange.fire();
    }

    /**
     * テストプレイのゲームが今いるマップ。マップが変わったときだけ、そこに合わせる。
     * (同じマップのままなら、利用者が自分で選んだマップはそのままにしておく。)
     */
    showFromGame(mapId: number): boolean {
        const moved = mapId !== this.gameMapId;
        this.gameMapId = mapId;
        if (!moved || mapId <= 0) return false;
        this.show(mapId);
        return true;
    }

    /** 今見ているのが、ゲームが今いるマップか。 */
    atGame(): boolean {
        return this.mapId > 0 && this.mapId === this.gameMapId;
    }

    refresh(): void {
        this._onDidChange.fire();
    }

    /** 見出しに出す言葉。 */
    title(): string {
        const ctx = this.context();
        if (!ctx) return '';
        if (!this.mapId) return '';
        return this.name(ctx, this.mapId);
    }

    getTreeItem(element: LinkNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: LinkNode): LinkNode[] {
        const ctx = this.context();
        if (!ctx || !this.mapId) return [];
        if (!element) {
            return [
                this.group('out', [this.mapId]),
                this.group('in', [this.mapId])
            ];
        }
        if (element.nodeType === 'group' || element.nodeType === 'map') {
            const from = element.nodeType === 'group' ? element.data.path[element.data.path.length - 1] : (element.data.mapId as number);
            return this.stepNodes(ctx, element.data.dir, from, element.data.path);
        }
        return [];
    }

    private context(): DbContext | undefined {
        const root = workspaceRootFor();
        return root ? this.service.forRoot(root) : undefined;
    }

    private name(ctx: DbContext, mapId: number): string {
        const hit = ctx.db.lookup('map', mapId);
        return mapLabel({ id: mapId, name: hit.status === 'named' ? hit.name : '' });
    }

    private group(dir: 'out' | 'in', path: number[]): LinkNode {
        const node = new LinkNode('group', dir === 'out' ? '行き先のマップ' : 'ここへ来るマップ', vscode.TreeItemCollapsibleState.Expanded, { dir, path });
        node.iconPath = new vscode.ThemeIcon(dir === 'out' ? 'arrow-right' : 'arrow-left');
        return node;
    }

    private transfers(ctx: DbContext): MapLink[] {
        return mapLinks(this.links.index(ctx).all());
    }

    /** そのマップの、行き先(または来る元)の1段分。 */
    private stepNodes(ctx: DbContext, dir: 'out' | 'in', mapId: number, path: number[]): LinkNode[] {
        const all = this.transfers(ctx);
        const hits = all.filter((link) => (dir === 'out' ? link.fromMap === mapId : link.toMap === mapId));
        const byMap = new Map<number, MapLink[]>();
        const unknown: MapLink[] = [];
        for (const link of hits) {
            const other = dir === 'out' ? link.toMap : link.fromMap;
            if (other === undefined) {
                unknown.push(link);
                continue;
            }
            const list = byMap.get(other) || [];
            list.push(link);
            byMap.set(other, list);
        }
        const out: LinkNode[] = [];
        Array.from(byMap.entries())
            .sort((a, b) => this.name(ctx, a[0]).localeCompare(this.name(ctx, b[0]), 'ja') || a[0] - b[0])
            .forEach(([other, links]) => {
                const seen = path.includes(other);
                const node = new LinkNode(
                    'map',
                    this.name(ctx, other),
                    seen ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
                    { dir, path: path.concat([other]), mapId: other }
                );
                node.description = ['#' + padId(other), links.length > 1 ? `${links.length}か所` : '', seen ? '(上と同じ)' : ''].filter((s) => s).join('・');
                node.iconPath = new vscode.ThemeIcon('map');
                node.tooltip = seen ? 'このマップは、上でもう出ています。' : undefined;
                out.push(node);
                for (const link of links) out.push(this.placeNode(ctx, dir, link, path));
            });
        for (const link of unknown) {
            const node = new LinkNode('unknown', '変数で決まる行き先', vscode.TreeItemCollapsibleState.None, {
                dir, path, at: link.at, index: link.index, variableId: link.variableId
            });
            const named = link.variableId ? ctx.db.lookup('variable', link.variableId) : undefined;
            node.description = link.variableId ? `V${padId(link.variableId)}${named && named.status === 'named' ? ' ' + named.name : ''}` : '';
            node.iconPath = new vscode.ThemeIcon('question');
            node.tooltip = '行き先を変数で決めているので、どのマップへ行くかはここでは分かりません。';
            out.push(this.withOpen(ctx, node, link));
        }
        return out;
    }

    /** 移動しているイベントの行。 */
    private placeNode(ctx: DbContext, dir: 'out' | 'in', link: MapLink, path: number[]): LinkNode {
        const node = nodeFromKey(link.at);
        let label = link.at;
        let detail = '';
        if (node && node.kind === 'page') {
            const event = this.service.mapEvents(ctx, node.mapId)?.[node.eventId];
            label = `${eventLabelId(node.eventId)}${event && event.name ? ' ' + event.name : ''} / ${node.pageId}ページ`;
            detail = this.name(ctx, node.mapId);
        } else if (node && node.kind === 'common') {
            const hit = ctx.db.lookup('commonEvent', node.id);
            label = `コモンイベント ${padId(node.id)}${hit.status === 'named' ? ' ' + hit.name : ''}`;
            detail = 'どのマップからかは決まりません';
        }
        const item = new LinkNode('place', label, vscode.TreeItemCollapsibleState.None, {
            dir, path, at: link.at, index: link.index, mapId: dir === 'out' ? link.toMap : link.fromMap
        });
        item.description = [detail, link.how === 'vehicle' ? '乗り物' : ''].filter((s) => s).join('・');
        item.iconPath = new vscode.ThemeIcon('arrow-small-right');
        return this.withOpen(ctx, item, link);
    }

    private withOpen(ctx: DbContext, node: LinkNode, link: MapLink): LinkNode {
        node.command = { command: 'text2frame.mapLinks.open', title: '開く', arguments: [link.at, link.index] };
        return node;
    }
}

export function registerMapLinksView(context: vscode.ExtensionContext, service: DatabaseService, links: LinkService, live: LiveService): void {
    const provider = new MapLinksProvider(service, links);
    const view = vscode.window.createTreeView('text2frameMapLinks', { treeDataProvider: provider });

    /** テストプレイで今いるマップ。つながっていなければ 0。 */
    const gameMap = (): number => {
        const root = workspaceRootFor();
        const ctx = root ? service.forRoot(root) : undefined;
        const state = ctx ? live.forContext(ctx) : undefined;
        return state && state.connected(Date.now()) ? state.mapId : 0;
    };

    const setTitle = (): void => {
        const name = provider.title();
        view.message = name ? undefined : 'マップのテキストを開くか、一覧の行を右クリックして「つながりを見る」を選んでください。';
        view.description = name ? name + (provider.atGame() ? ' ● いまここ' : '') : undefined;
    };

    const showMap = (mapId: number): void => {
        provider.show(mapId);
        setTitle();
    };

    const followEditor = (editor: vscode.TextEditor | undefined): void => {
        if (!editor || editor.document.languageId !== 'text2frame') return;
        const place = placeFromMeta(parseFrontMatter(editor.document.getText()).meta);
        if (place && place.kind === 'event') showMap(place.mapId);
    };

    /**
     * テストプレイでマップが変わったら、そのマップに合わせる。
     * 実行中のテキストは横で開くだけなので、開いているテキストだけを見ていると付いていけない。
     */
    const followGame = (): void => {
        provider.showFromGame(gameMap());
        setTitle();
    };

    context.subscriptions.push(
        view,
        vscode.commands.registerCommand('text2frame.mapLinks.show', (mapId: number) => showMap(Number(mapId))),
        vscode.commands.registerCommand('text2frame.mapLinks.refresh', () => { links.clear(); provider.refresh(); }),
        vscode.commands.registerCommand('text2frame.mapLinks.open', async (key: string, index?: number) => {
            const root = workspaceRootFor();
            const ctx = root ? service.forRoot(root) : undefined;
            if (!ctx) return;
            const { uri, file } = await links.uriFor(ctx, key);
            const line = links.lineOf(ctx, key, file, index);
            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc, { preview: true });
            const at = new vscode.Position(Math.min(line, Math.max(0, doc.lineCount - 1)), 0);
            editor.selection = new vscode.Selection(at, at);
            editor.revealRange(new vscode.Range(at, at), vscode.TextEditorRevealType.InCenter);
        }),
        vscode.window.onDidChangeActiveTextEditor(followEditor),
        live.onDidChange(followGame),
        view.onDidChangeVisibility((e) => { if (e.visible) { followEditor(vscode.window.activeTextEditor); setTitle(); } })
    );
    followEditor(vscode.window.activeTextEditor);
    followGame();
    setTitle();
}
