import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { workspaceRootFor, parseFrontMatter } from './compiler';
import { exportToTextFile, commitPull, planPull, ExportTarget, PullPlan } from './exportText';
import { deployFile, reviewFiles, unappliedFiles } from './deploy';
import { reviewPull } from './reviewApply';
import { DatabaseService, DbContext } from './dbService';
import { RunTracker } from './runHighlight';
import { LiveService } from './live';
import {
    readMapInfos, mapTree, mapLabel, pageDescription, pageConditionTexts, commonDescription,
    eventLiveMark, pageLiveMark, commonLiveMark, MapNode, NameLookup, LiveMarks
} from './db/mapTree';
import { eventId as eventLabelId, MapEvent } from './db/describe';
import { PageSummary } from './db/eventPages';
import { padId } from './db/database';
import { placeFromMeta } from './placeLabel';

/**
 * Activity Bar tree: Maps -> Events -> Pages, plus Common Events. Maps are
 * nested like the RPG Maker editor (MapInfos.json). Each leaf can be deployed
 * (text -> data) or exported (data -> text) and opens its text file.
 */

type NodeType = 'category' | 'map' | 'event' | 'page' | 'common' | 'here';

interface NodeData {
    category?: 'maps' | 'commons';
    mapId?: string;
    eventId?: string;
    pageId?: string;
    commonEventId?: string;
    /** 「今いるマップ」の下の行か(ツリーの中で番号が重ならないように分ける)。 */
    here?: boolean;
}

class T2FNode extends vscode.TreeItem {
    constructor(
        public readonly nodeType: NodeType,
        label: string,
        collapsible: vscode.TreeItemCollapsibleState,
        public readonly data: NodeData = {}
    ) {
        super(label, collapsible);
        this.contextValue = 'text2frame.' + nodeType;
        this.id = nodeId(nodeType, data);
    }
}

function nodeId(nodeType: NodeType, data: NodeData): string {
    const head = data.here ? 'here-' : '';
    if (nodeType === 'here') return 'here';
    if (nodeType === 'category') return 'category:' + data.category;
    if (nodeType === 'common') return head + 'common:' + data.commonEventId;
    if (nodeType === 'map') return head + 'map:' + data.mapId;
    if (nodeType === 'event') return `${head}event:${data.mapId}:${data.eventId}`;
    return `${head}page:${data.mapId}:${data.eventId}:${data.pageId}`;
}

function textBaseSetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('textBaseDir', 'text');
}

/** Text file path for a leaf node, by convention text/key.txt. */
function textPathForLeaf(root: string, node: T2FNode): string {
    const base = path.join(root, textBaseSetting());
    if (node.nodeType === 'common') {
        return path.join(base, `common${String(node.data.commonEventId).padStart(3, '0')}.txt`);
    }
    const mapId = String(node.data.mapId).padStart(3, '0');
    const eventId = String(node.data.eventId).padStart(3, '0');
    return path.join(base, `map${mapId}_event${eventId}_page${node.data.pageId}.txt`);
}

function targetForLeaf(node: T2FNode): ExportTarget {
    if (node.nodeType === 'common') {
        return { kind: 'common', commonEventId: node.data.commonEventId, textPath: '' };
    }
    return { kind: 'event', mapId: node.data.mapId, eventId: node.data.eventId, pageId: node.data.pageId, textPath: '' };
}

/** 場所の鍵。テキストの索引(宛先のメモ)と同じ形。 */
function keyForLeaf(node: T2FNode): string {
    return node.nodeType === 'common'
        ? `c:${Number(node.data.commonEventId)}`
        : `e:${Number(node.data.mapId)}:${Number(node.data.eventId)}:${Number(node.data.pageId)}`;
}

interface CommonSummary {
    id: number;
    name: string;
    trigger: number;
    switchId: number;
    empty: boolean;
}

export class T2FTreeProvider implements vscode.TreeDataProvider<T2FNode> {
    private _onDidChange = new vscode.EventEmitter<T2FNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChange.event;

    /** マップの親子。番号 → その下のマップ。 */
    private tree: { dataDir: string; mtime: number; roots: MapNode[]; parents: Map<number, number>; nodes: Map<number, MapNode> } | undefined;
    /** テキストの索引(場所の鍵 → ファイル)。 */
    private texts = new Map<string, string>();
    /** 反映していない変更があるテキスト。ファイル → [調べたときの目印, 未反映か]。 */
    private readonly unapplied = new Map<string, [string, boolean]>();
    private checking = false;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly service: DatabaseService,
        private readonly running: RunTracker,
        private readonly live: LiveService
    ) {}

    refresh(node?: T2FNode): void {
        if (!node) {
            this.tree = undefined;
            this.unapplied.clear();
        }
        this._onDidChange.fire(node);
    }

    /** テストプレイの様子だけが変わったとき(ためたものは捨てない)。 */
    refreshMarks(): void {
        this._onDidChange.fire();
    }

    /** 今のゲームの様子。テストプレイしていなければ undefined。 */
    marks(ctx: DbContext): LiveMarks | undefined {
        const state = this.live.forContext(ctx);
        if (!state || !state.connected(Date.now())) return undefined;
        const snapshot = state.snapshot();
        return {
            mapId: snapshot.mapId,
            pages: new Map(snapshot.pages),
            parallelEvents: new Set(snapshot.parallel.events),
            parallelCommons: new Set(snapshot.parallel.commons),
            running: new Set(this.running.current().map((frame) => frame.key))
        };
    }

    /** ツリーを描き直すかどうかを決める目印。 */
    markSignature(): string {
        const ctx = this.context2();
        const marks = ctx && this.marks(ctx);
        if (!marks) return '';
        return JSON.stringify([
            marks.mapId,
            Array.from(marks.pages.entries()),
            Array.from(marks.parallelEvents),
            Array.from(marks.parallelCommons),
            Array.from(marks.running)
        ]);
    }

    getTreeItem(element: T2FNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: T2FNode): Promise<T2FNode[]> {
        const ctx = this.context2();
        if (!ctx) return [];
        this.texts = await this.running.textIndex(ctx);

        if (!element) {
            const nodes: T2FNode[] = [];
            const here = this.hereNode(ctx);
            if (here) nodes.push(here);
            nodes.push(...this.mapNodes(ctx, this.maps(ctx).roots));
            if (fs.existsSync(path.join(ctx.dataDir, 'CommonEvents.json'))) {
                nodes.push(new T2FNode('category', 'コモンイベント', vscode.TreeItemCollapsibleState.Collapsed, { category: 'commons' }));
            }
            return nodes;
        }
        if (element.nodeType === 'here') {
            const marks = this.marks(ctx);
            return marks ? this.eventNodes(ctx, marks.mapId, true) : [];
        }
        if (element.nodeType === 'category') return this.commonNodes(ctx);
        if (element.nodeType === 'map') {
            const mapId = Number(element.data.mapId);
            const node = this.maps(ctx).nodes.get(mapId);
            return this.mapNodes(ctx, node ? node.children : []).concat(this.eventNodes(ctx, mapId));
        }
        if (element.nodeType === 'event') {
            return this.pageNodes(ctx, Number(element.data.mapId), Number(element.data.eventId), !!element.data.here);
        }
        return [];
    }

    getParent(element: T2FNode): T2FNode | undefined {
        const ctx = this.context2();
        if (!ctx) return undefined;
        if (element.nodeType === 'common') {
            return new T2FNode('category', 'コモンイベント', vscode.TreeItemCollapsibleState.Collapsed, { category: 'commons' });
        }
        if (element.nodeType === 'page') {
            return this.eventNode(ctx, Number(element.data.mapId), Number(element.data.eventId), undefined, !!element.data.here);
        }
        if (element.nodeType === 'event') {
            if (element.data.here) return this.hereNode(ctx);
            return this.mapNode(ctx, Number(element.data.mapId));
        }
        if (element.nodeType === 'map') {
            const parent = this.maps(ctx).parents.get(Number(element.data.mapId));
            return parent ? this.mapNode(ctx, parent) : undefined;
        }
        return undefined;
    }

    /** ツリーの中の、そのテキストのページ(またはコモンイベント)の行。 */
    nodeForFile(fsPath: string): T2FNode | undefined {
        const ctx = this.context2();
        if (!ctx) return undefined;
        let text: string;
        try {
            const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === fsPath);
            text = open ? open.getText() : fs.readFileSync(fsPath, 'utf8');
        } catch (e) {
            return undefined;
        }
        const place = placeFromMeta(parseFrontMatter(text).meta);
        if (!place) return undefined;
        if (place.kind === 'common') {
            const entry = this.commons(ctx).find((c) => c.id === place.commonEventId);
            return entry ? this.commonNode(ctx, entry) : undefined;
        }
        if (place.eventId === undefined) return undefined;
        const event = this.service.mapEvents(ctx, place.mapId)?.[place.eventId];
        if (!event) return undefined;
        return this.pageNode(ctx, place.mapId, place.eventId, event, (place.pageId ?? 1) - 1);
    }

    private context2(): DbContext | undefined {
        const root = workspaceRootFor();
        if (!root) return undefined;
        const ctx = this.service.forRoot(root);
        return ctx && fs.existsSync(ctx.dataDir) ? ctx : undefined;
    }

    /** MapInfos.json を読んで親子に並べる(更新時刻が変わるまで使い回す)。 */
    private maps(ctx: DbContext): { roots: MapNode[]; parents: Map<number, number>; nodes: Map<number, MapNode> } {
        const file = path.join(ctx.dataDir, 'MapInfos.json');
        let mtime = 0;
        try { mtime = fs.statSync(file).mtimeMs; } catch (e) { mtime = 0; }
        if (this.tree && this.tree.dataDir === ctx.dataDir && this.tree.mtime === mtime) return this.tree;
        let roots: MapNode[] = [];
        try {
            roots = mapTree(readMapInfos(JSON.parse(fs.readFileSync(file, 'utf8'))));
        } catch (e) {
            roots = [];
        }
        const parents = new Map<number, number>();
        const nodes = new Map<number, MapNode>();
        const walk = (list: MapNode[], parent: number): void => {
            for (const node of list) {
                nodes.set(node.info.id, node);
                if (parent) parents.set(node.info.id, parent);
                walk(node.children, node.info.id);
            }
        };
        walk(roots, 0);
        this.tree = { dataDir: ctx.dataDir, mtime, roots, parents, nodes };
        return this.tree;
    }

    private names(ctx: DbContext): NameLookup {
        return (kind, id) => {
            const hit = ctx.db.lookup(kind, id);
            return hit.status === 'named' ? hit.name : undefined;
        };
    }

    /** テストプレイ中だけ、いちばん上に出す「今いるマップ」。 */
    private hereNode(ctx: DbContext): T2FNode | undefined {
        const marks = this.marks(ctx);
        if (!marks || marks.mapId <= 0) return undefined;
        const info = this.maps(ctx).nodes.get(marks.mapId);
        const item = new T2FNode('here', '今いるマップ: ' + mapLabel(info ? info.info : { id: marks.mapId, name: '' }), vscode.TreeItemCollapsibleState.Expanded, {
            mapId: String(marks.mapId), here: true
        });
        item.description = '#' + padId(marks.mapId);
        item.iconPath = new vscode.ThemeIcon('location');
        item.tooltip = 'テストプレイでプレイヤーがいるマップのイベントです。';
        return item;
    }

    private mapNodes(ctx: DbContext, list: MapNode[]): T2FNode[] {
        return list.map((node) => this.mapNode(ctx, node.info.id, node));
    }

    private mapNode(ctx: DbContext, mapId: number, known?: MapNode): T2FNode {
        const node = known || this.maps(ctx).nodes.get(mapId);
        const info = node ? node.info : { id: mapId, name: '', parentId: 0, order: 0, expanded: false };
        const events = this.service.mapEvents(ctx, mapId);
        const hasEvents = !!events && events.some((e) => !!e);
        const children = (node ? node.children.length : 0) + (hasEvents ? 1 : 0);
        const item = new T2FNode(
            'map',
            mapLabel(info),
            children ? (info.expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed) : vscode.TreeItemCollapsibleState.None,
            { mapId: String(mapId) }
        );
        const marks = this.marks(ctx);
        item.description = ['#' + padId(mapId), marks && marks.mapId === mapId ? '● いまここ' : ''].filter((s) => s).join('・');
        item.iconPath = new vscode.ThemeIcon('map');
        item.tooltip = `${mapLabel(info)}(マップ${padId(mapId)})`;
        return item;
    }

    private eventNodes(ctx: DbContext, mapId: number, here = false): T2FNode[] {
        const events = this.service.mapEvents(ctx, mapId);
        const out: T2FNode[] = [];
        (events || []).forEach((event, id) => {
            if (event && id > 0) out.push(this.eventNode(ctx, mapId, id, event, here));
        });
        return out;
    }

    private eventNode(ctx: DbContext, mapId: number, eventId: number, known?: MapEvent, here = false): T2FNode {
        const event = known || this.service.mapEvents(ctx, mapId)?.[eventId];
        const label = event && event.name ? event.name : eventLabelId(eventId);
        const item = new T2FNode(
            'event',
            label,
            event && event.pages ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            { mapId: String(mapId), eventId: String(eventId), here }
        );
        const mark = eventLiveMark(this.marks(ctx), mapId, eventId);
        item.description = [`${eventLabelId(eventId)}${event ? ` (${event.x},${event.y})` : ''}`, mark].filter((s) => s).join('・');
        item.iconPath = new vscode.ThemeIcon('symbol-event');
        item.tooltip = `${eventLabelId(eventId)}${event && event.name ? ' ' + event.name : ''} / ${event ? event.pages : 0}ページ`;
        return item;
    }

    private pageNodes(ctx: DbContext, mapId: number, eventId: number, here = false): T2FNode[] {
        const event = this.service.mapEvents(ctx, mapId)?.[eventId];
        const out: T2FNode[] = [];
        for (let index = 0; index < (event ? event.pages || 0 : 0); index++) out.push(this.pageNode(ctx, mapId, eventId, event as MapEvent, index, here));
        this.checkUnapplied(ctx, out);
        return out;
    }

    private pageNode(ctx: DbContext, mapId: number, eventId: number, event: MapEvent, index: number, here = false): T2FNode {
        const summary: PageSummary = (event.pageSummaries || [])[index] || { trigger: 0 };
        const empty = !!(event.pageEmpty || [])[index];
        const item = new T2FNode('page', `ページ ${index + 1}`, vscode.TreeItemCollapsibleState.None, {
            mapId: String(mapId), eventId: String(eventId), pageId: String(index + 1), here
        });
        const conditions = pageConditionTexts(summary, this.names(ctx));
        const map = this.maps(ctx).nodes.get(mapId);
        const mark = pageLiveMark(this.marks(ctx), mapId, eventId, index + 1);
        this.decorateLeaf(item, [pageDescription(summary, empty), mark].filter((s) => s).join('・'), [
            `${mapLabel(map ? map.info : { id: mapId, name: '' })} / ${eventLabelId(eventId)}${event.name ? ' ' + event.name : ''} / ${index + 1}ページ`,
            conditions.length ? '出現条件: ' + conditions.join(' / ') : '出現条件: なし'
        ]);
        item.command = { command: 'text2frame.tree.open', title: 'Open', arguments: [item] };
        return item;
    }

    private commons(ctx: DbContext): CommonSummary[] {
        let list: unknown;
        try {
            list = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, 'CommonEvents.json'), 'utf8'));
        } catch (e) {
            return [];
        }
        const out: CommonSummary[] = [];
        (Array.isArray(list) ? list : []).forEach((entry: any, index: number) => {
            if (!entry || index === 0) return;
            out.push({
                id: index,
                name: typeof entry.name === 'string' ? entry.name : '',
                trigger: Number(entry.trigger) || 0,
                switchId: Number(entry.switchId) || 0,
                empty: !(Array.isArray(entry.list) && entry.list.length > 1)
            });
        });
        return out;
    }

    private commonNodes(ctx: DbContext): T2FNode[] {
        const out = this.commons(ctx).map((entry) => this.commonNode(ctx, entry));
        this.checkUnapplied(ctx, out);
        return out;
    }

    private commonNode(ctx: DbContext, entry: CommonSummary): T2FNode {
        const item = new T2FNode('common', entry.name || `コモン${padId(entry.id)}`, vscode.TreeItemCollapsibleState.None, {
            commonEventId: String(entry.id)
        });
        const description = commonDescription(entry.trigger, entry.switchId, entry.empty, this.names(ctx));
        const mark = commonLiveMark(this.marks(ctx), entry.id);
        this.decorateLeaf(item, [padId(entry.id), description, mark].filter((s) => s).join('・'), []);
        item.command = { command: 'text2frame.tree.open', title: 'Open', arguments: [item] };
        return item;
    }

    /** テキストの有無・未反映の印・ツールチップ。 */
    private decorateLeaf(item: T2FNode, description: string, tooltipLines: string[]): void {
        const textPath = this.texts.get(keyForLeaf(item));
        const unapplied = textPath ? (this.unapplied.get(textPath) || [])[1] : false;
        item.description = [description, unapplied ? '未反映' : ''].filter((s) => s).join('・');
        item.iconPath = new vscode.ThemeIcon(textPath ? 'file-text' : 'new-file');
        const lines = tooltipLines.concat([
            textPath ? 'テキスト: ' + vscode.workspace.asRelativePath(textPath) : 'テキストはまだありません(押すと書き出せます)',
            unapplied ? 'このテキストには、ゲームに反映していない変更があります。' : ''
        ]);
        item.tooltip = lines.filter((line) => line).join('\n');
    }

    /** 表に出した行のテキストが未反映かを、あとから調べて印を付ける。 */
    private checkUnapplied(ctx: DbContext, nodes: T2FNode[]): void {
        const targets: Array<[string, string]> = [];
        for (const node of nodes) {
            const textPath = this.texts.get(keyForLeaf(node));
            if (!textPath) continue;
            const stamp = this.stampOf(ctx, textPath, node);
            if (!stamp) continue;
            const known = this.unapplied.get(textPath);
            if (!known || known[0] !== stamp) targets.push([textPath, stamp]);
        }
        if (!targets.length || this.checking) return;
        this.checking = true;
        setTimeout(() => {
            let changed = false;
            try {
                const hits = unappliedFiles(this.context, ctx.root, targets.map(([file]) => file));
                for (const [file, stamp] of targets) {
                    const value: [string, boolean] = [stamp, hits.has(file)];
                    const before = this.unapplied.get(file);
                    this.unapplied.set(file, value);
                    if (!before || before[1] !== value[1]) changed = true;
                }
            } catch (e) {
                for (const [file, stamp] of targets) this.unapplied.set(file, [stamp, false]);
            }
            this.checking = false;
            if (changed) this._onDidChange.fire();
        }, 0);
    }

    /**
     * 保存したテキストとゲームのデータの更新時刻。どちらかが変われば調べ直す。
     * 書きかけ(保存していない分)は反映の対象にならないので、ここでは見ない。
     */
    private stampOf(ctx: DbContext, textPath: string, node: T2FNode): string | undefined {
        const dataFile = node.nodeType === 'common'
            ? path.join(ctx.dataDir, 'CommonEvents.json')
            : path.join(ctx.dataDir, 'Map' + String(Number(node.data.mapId)).padStart(3, '0') + '.json');
        try {
            return fs.statSync(textPath).mtimeMs + '/' + fs.statSync(dataFile).mtimeMs;
        } catch (e) {
            return undefined;
        }
    }
}

/** Register the tree view and its node commands. */
export function registerTreeView(context: vscode.ExtensionContext, service: DatabaseService, running: RunTracker, live: LiveService): void {
    const provider = new T2FTreeProvider(context, service, running, live);
    const view = vscode.window.createTreeView('text2frameExplorer', { treeDataProvider: provider });
    let signature = provider.markSignature();
    const marksChanged = (): void => {
        const next = provider.markSignature();
        if (next === signature) return;
        signature = next;
        provider.refreshMarks();
    };

    const ensureRoot = (): string | undefined => {
        const root = workspaceRootFor();
        if (!root) {
            vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        }
        return root;
    };

    const textPathOf = async (root: string, node: T2FNode): Promise<string | undefined> => {
        const ctx = service.forRoot(root);
        const key = keyForLeaf(node);
        const index = ctx ? await running.textIndex(ctx) : undefined;
        return (index && index.get(key)) || undefined;
    };

    const openLeaf = async (node: T2FNode): Promise<void> => {
        const root = ensureRoot();
        if (!root || (node.nodeType !== 'page' && node.nodeType !== 'common')) {
            return;
        }
        const textPath = (await textPathOf(root, node)) || textPathForLeaf(root, node);
        if (!fs.existsSync(textPath)) {
            const pick = await vscode.window.showInformationMessage(
                'Text2Frame: テキストがまだありません。データから書き出しますか?', '書き出す'
            );
            if (pick !== '書き出す') {
                return;
            }
            const target = targetForLeaf(node);
            target.textPath = textPath;
            const res = exportToTextFile(context, root, target);
            if (!res.ok) {
                vscode.window.showErrorMessage('Text2Frame: 書き出し失敗 - ' + (res.error || ''));
                return;
            }
            running.reindex();
            provider.refresh();
        }
        const doc = await vscode.workspace.openTextDocument(textPath);
        await vscode.window.showTextDocument(doc, { preview: true });
    };

    const revealForEditor = (editor: vscode.TextEditor | undefined): void => {
        if (!editor || !view.visible || editor.document.languageId !== 'text2frame') return;
        const node = provider.nodeForFile(editor.document.uri.fsPath);
        if (node) view.reveal(node, { select: true, focus: false, expand: true }).then(undefined, () => undefined);
    };

    context.subscriptions.push(
        view,
        vscode.commands.registerCommand('text2frame.tree.refresh', () => provider.refresh()),
        vscode.commands.registerCommand('text2frame.tree.open', (node: T2FNode) => openLeaf(node)),
        vscode.commands.registerCommand('text2frame.tree.export', async (node: T2FNode) => {
            const root = ensureRoot();
            if (!root || (node.nodeType !== 'page' && node.nodeType !== 'common')) {
                return;
            }
            const textPath = (await textPathOf(root, node)) || textPathForLeaf(root, node);
            const makePlan = (): PullPlan[] => {
                const target = targetForLeaf(node);
                target.textPath = textPath;
                if (fs.existsSync(textPath)) {
                    target.frontMatterSource = fs.readFileSync(textPath, 'utf8');
                }
                return [planPull(context, root, target, 'overwrite')];
            };
            const reviewed = await reviewPull(root, makePlan, 'この行の書き出し');
            if (!reviewed) {
                vscode.window.setStatusBarMessage('Text2Frame: 書き出しをやめました。', 4000);
                return;
            }
            const res = commitPull(context, root, reviewed.plans[0]);
            if (res.ok) {
                vscode.window.showInformationMessage('Text2Frame: 書き出しました — ' + path.relative(root, textPath));
                running.reindex();
                provider.refresh();
                vscode.workspace.openTextDocument(textPath).then((doc) => vscode.window.showTextDocument(doc, { preview: true }));
            } else {
                vscode.window.showErrorMessage('Text2Frame: 書き出し失敗 - ' + (res.error || ''));
            }
        }),
        vscode.commands.registerCommand('text2frame.tree.deploy', async (node: T2FNode) => {
            const root = ensureRoot();
            if (!root || (node.nodeType !== 'page' && node.nodeType !== 'common')) {
                return;
            }
            const textPath = (await textPathOf(root, node)) || textPathForLeaf(root, node);
            if (!fs.existsSync(textPath)) {
                vscode.window.showWarningMessage('Text2Frame: テキストがありません。先に書き出してください。');
                return;
            }
            if (await reviewFiles(context, root, [textPath], 'この行の反映') === 'cancel') {
                vscode.window.setStatusBarMessage('Text2Frame: 反映をやめました。', 4000);
                return;
            }
            const res = deployFile(context, root, textPath);
            if (res && res.ok) {
                vscode.window.showInformationMessage('Text2Frame: デプロイしました — ' + path.relative(root, textPath));
                provider.refresh();
            } else if (res) {
                vscode.window.showErrorMessage('Text2Frame: デプロイ失敗 - ' + (res.error || ''));
            }
        }),
        vscode.commands.registerCommand('text2frame.tree.try', async (node: T2FNode, mode?: 'stand' | 'run') => {
            const root = ensureRoot();
            if (!root) return;
            const place = node.nodeType === 'common'
                ? { kind: 'common' as const, commonEventId: Number(node.data.commonEventId) }
                : { kind: 'event' as const, mapId: Number(node.data.mapId), eventId: Number(node.data.eventId), pageId: Number(node.data.pageId || '1') };
            const textPath = await textPathOf(root, node);
            const target = textPath && fs.existsSync(textPath) ? vscode.Uri.file(textPath) : place;
            const how = node.nodeType === 'common' ? 'common' : (mode || 'stand');
            await vscode.commands.executeCommand('text2frame.tryEvent', target, how);
        }),
        vscode.commands.registerCommand('text2frame.tree.tryRun', (node: T2FNode) => vscode.commands.executeCommand('text2frame.tree.try', node, 'run')),
        vscode.commands.registerCommand('text2frame.tree.tryCommon', (node: T2FNode) => vscode.commands.executeCommand('text2frame.tree.try', node)),
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (doc.languageId === 'text2frame') provider.refresh();
        }),
        vscode.window.onDidChangeActiveTextEditor(revealForEditor),
        view.onDidChangeVisibility(() => revealForEditor(vscode.window.activeTextEditor)),
        live.onDidChange(marksChanged),
        live.onDidChangeRun(marksChanged),
        running.onDidChange(marksChanged)
    );

    // Refresh the tree when data files change.
    const watcher = vscode.workspace.createFileSystemWatcher('**/data/{Map*.json,CommonEvents.json}');
    watcher.onDidChange(() => provider.refresh());
    watcher.onDidCreate(() => provider.refresh());
    watcher.onDidDelete(() => provider.refresh());
    context.subscriptions.push(watcher);
}
