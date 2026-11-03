import * as vscode from 'vscode';
import { DatabaseService, DbContext } from './dbService';
import { LiveService } from './live';
import { LinkService, confirmNoText } from './eventLinks';
import { parseFrontMatter, workspaceRootFor } from './compiler';
import { placeFromMeta } from './placeLabel';
import { padId } from './db/database';
import { mapLabel } from './db/mapTree';
import { eventId as eventLabelId } from './db/describe';
import { MapLink, mapLinks, nodeFromKey } from './db/eventLinks';
import { LinkRow, rowDetail, rowLabel } from './mapLinkRows';
import { tr } from './db/lang';

/**
 * 「マップのつながり」の欄。場所移動(TransferPlayer)を2つに**並べるだけ**にしてある ──
 * このマップから出ていくものと、このマップへ来るもの。
 * 見るマップは、テストプレイ中はゲームが今いるマップ、そうでなければ開いているテキストのマップ。
 *
 * **マップでまとめて何段でもたどる形はやめた。** マップの行の下に並ぶ行が「そのマップの
 * ページ」に見えるのに、行き先の側では見ているマップのページだったので、押すと関係ない
 * テキストが開いたように感じる(報告のとおり)。並べるだけにすると行は1種類になり、
 * どれも「押せばその移動コマンドのテキストが開く」で済む。
 * マップをまたいで俯瞰するのは「マップの地図」(mapGraph)の仕事。
 */

type NodeType = 'group' | 'place';

interface NodeData {
    dir: 'out' | 'in';
    /** 移動しているページ・コモンイベント。 */
    at?: string;
    index?: number;
}

class LinkNode extends vscode.TreeItem {
    constructor(public readonly nodeType: NodeType, label: string, collapsible: vscode.TreeItemCollapsibleState, public readonly data: NodeData) {
        super(label, collapsible);
        this.contextValue = 'text2frame.mapLink.' + nodeType;
        this.id = [nodeType, data.dir, data.at ?? '', data.index ?? ''].join('|');
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
        if (!element) return [this.group(ctx, 'out'), this.group(ctx, 'in')];
        if (element.nodeType === 'group') return this.hits(ctx, element.data.dir).map((link) => this.row(ctx, element.data.dir, link));
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

    private group(ctx: DbContext, dir: 'out' | 'in'): LinkNode {
        const count = this.hits(ctx, dir).length;
        const node = new LinkNode(
            'group',
            dir === 'out' ? tr('ここから出る移動', 'Transfers out of here') : tr('ここへ来る移動', 'Transfers into here'),
            vscode.TreeItemCollapsibleState.Expanded,
            { dir }
        );
        node.description = tr(`${count}か所`, `${count} places`);
        node.iconPath = new vscode.ThemeIcon(dir === 'out' ? 'arrow-right' : 'arrow-left');
        return node;
    }

    /**
     * その向きの移動を、相手のマップの名前で並べたもの。
     * **どちらの向きも「相手」で並べる**ので、見た目のまとまりはまとめていたときと同じで、
     * 段だけが無くなる。行き先が変数で決まるものは相手が分からないので最後に置く。
     */
    private hits(ctx: DbContext, dir: 'out' | 'in'): MapLink[] {
        const mine = mapLinks(this.links.index(ctx).all())
            .filter((link) => (dir === 'out' ? link.fromMap === this.mapId : link.toMap === this.mapId));
        return mine.sort((a, b) => {
            const x = this.order(ctx, a, dir);
            const y = this.order(ctx, b, dir);
            return String(x[0]).localeCompare(String(y[0]), 'ja') || Number(x[1]) - Number(y[1]) ||
                Number(x[2]) - Number(y[2]) || Number(x[3]) - Number(y[3]);
        });
    }

    private order(ctx: DbContext, link: MapLink, dir: 'out' | 'in'): [string, number, number, number] {
        const other = dir === 'out' ? link.toMap : link.fromMap;
        // 相手が分からないものを最後に回すための番人。
        const name = other === undefined ? '\uffff' : this.name(ctx, other);
        const node = nodeFromKey(link.at);
        if (node && node.kind === 'page') return [name, node.eventId, node.pageId, link.index || 0];
        if (node && node.kind === 'common') return [name, node.id, 0, link.index || 0];
        return [name, 0, 0, link.index || 0];
    }

    /** 移動コマンド1つの行。押すと、そのコマンドが書いてあるテキストが開く。 */
    private row(ctx: DbContext, dir: 'out' | 'in', link: MapLink): LinkNode {
        const node = nodeFromKey(link.at);
        const row: LinkRow = { event: link.at, vehicle: link.how === 'vehicle', byVariable: link.variableId };
        if (node && node.kind === 'page') {
            const event = this.service.mapEvents(ctx, node.mapId)?.[node.eventId];
            row.event = tr(
                `${eventLabelId(node.eventId)}${event && event.name ? ' ' + event.name : ''} / ${node.pageId}ページ`,
                `${eventLabelId(node.eventId)}${event && event.name ? ' ' + event.name : ''} / page ${node.pageId}`
            );
            // いま見ているマップは名前で呼ばない。他のマップのイベントだけ名前を付ける。
            if (node.mapId !== this.mapId) row.onMap = this.name(ctx, node.mapId);
        } else if (node && node.kind === 'common') {
            const hit = ctx.db.lookup('commonEvent', node.id);
            row.event = tr(
                `コモンイベント ${padId(node.id)}${hit.status === 'named' ? ' ' + hit.name : ''}`,
                `Common event ${padId(node.id)}${hit.status === 'named' ? ' ' + hit.name : ''}`
            );
        }
        /* 着地点。**見ているマップに着くときも名前を言う。** 来る側では全行が同じ文字に
         * なるが、2つの列が同じ形(マップ名と座標)に読めることを採った。 */
        if (link.toMap !== undefined) row.toMap = this.name(ctx, link.toMap);
        row.toX = link.toX;
        row.toY = link.toY;
        const item = new LinkNode('place', rowLabel(row), vscode.TreeItemCollapsibleState.None, { dir, at: link.at, index: link.index });
        item.description = rowDetail(row);
        item.iconPath = new vscode.ThemeIcon(row.byVariable ? 'question' : dir === 'out' ? 'arrow-small-right' : 'arrow-small-left');
        item.tooltip = row.byVariable
            ? tr('行き先を変数で決めているので、どのマップへ行くかはここでは分かりません。押すと、この移動コマンドのテキストが開きます。', 'The destination is set by variables, so which map it goes to is not known here. Click to open the text of this transfer command.')
            : tr('押すと、この移動コマンドが書いてあるテキストが開きます。着地点にイベントが居るとは限らないので、相手側のテキストは開けません。', 'Click to open the text that holds this transfer command. The landing tile need not hold an event, so the far side has no text to open.');
        return this.withOpen(ctx, item, link);
    }

    private withOpen(ctx: DbContext, node: LinkNode, link: MapLink): LinkNode {
        node.command = { command: 'text2frame.mapLinks.open', title: tr('開く', 'Open'), arguments: [link.at, link.index] };
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
        view.message = name ? undefined : tr('マップのテキストを開くか、一覧の行を右クリックして「つながりを見る」を選んでください。', 'Open a map text, or right-click a row in the list and choose Show links.');
        view.description = name ? name + (provider.atGame() ? tr(' ● いまここ', ' ● here now') : '') : undefined;
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
            if (!(await confirmNoText(service, ctx, uri))) return;
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
