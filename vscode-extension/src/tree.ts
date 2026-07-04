import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { workspaceRootFor, dataDirFor } from './compiler';
import { exportToTextFile, ExportTarget } from './exportText';
import { deployFile } from './deploy';

/**
 * Activity Bar tree: Maps -> Events -> Pages, plus Common Events. Each leaf can
 * be deployed (text -> data) or exported (data -> text) and opens its text file.
 */

type NodeType = 'category' | 'map' | 'event' | 'page' | 'common';

class T2FNode extends vscode.TreeItem {
    constructor(
        public readonly nodeType: NodeType,
        label: string,
        collapsible: vscode.TreeItemCollapsibleState,
        public readonly data: { category?: 'maps' | 'commons'; mapId?: string; eventId?: string; pageId?: string; commonEventId?: string } = {}
    ) {
        super(label, collapsible);
        this.contextValue = 'text2frame.' + nodeType;
    }
}

function localeSetting(): string {
    const c = vscode.workspace.getConfiguration('text2frame');
    return c.get<string>('locale') || c.get<string>('targetLocale') || 'ja';
}
function textBaseSetting(): string {
    return vscode.workspace.getConfiguration('text2frame').get<string>('textBaseDir', 'text');
}

/** Text file path for a leaf node, by convention text/<locale>/key.txt. */
function textPathForLeaf(root: string, node: T2FNode): string {
    const base = path.join(root, textBaseSetting(), localeSetting());
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

export class T2FTreeProvider implements vscode.TreeDataProvider<T2FNode> {
    private _onDidChange = new vscode.EventEmitter<T2FNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChange.event;

    refresh(): void {
        this._onDidChange.fire();
    }

    getTreeItem(element: T2FNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: T2FNode): T2FNode[] {
        const root = workspaceRootFor();
        if (!root) {
            return [];
        }
        const dataDir = dataDirFor(root);
        if (!fs.existsSync(dataDir)) {
            return [];
        }

        if (!element) {
            const nodes: T2FNode[] = [];
            nodes.push(new T2FNode('category', 'Maps', vscode.TreeItemCollapsibleState.Collapsed, { category: 'maps' }));
            if (fs.existsSync(path.join(dataDir, 'CommonEvents.json'))) {
                nodes.push(new T2FNode('category', 'Common Events', vscode.TreeItemCollapsibleState.Collapsed, { category: 'commons' }));
            }
            return nodes;
        }

        if (element.nodeType === 'category' && element.data.category === 'maps') {
            return this.mapNodes(dataDir);
        }
        if (element.nodeType === 'category' && element.data.category === 'commons') {
            return this.commonNodes(dataDir);
        }
        if (element.nodeType === 'map') {
            return this.eventNodes(dataDir, element.data.mapId as string);
        }
        if (element.nodeType === 'event') {
            return this.pageNodes(dataDir, element.data.mapId as string, element.data.eventId as string);
        }
        return [];
    }

    private readMap(dataDir: string, mapId: string): { events?: { name?: string; pages?: { list?: unknown[] }[] }[] } | undefined {
        const file = path.join(dataDir, 'Map' + ('000' + mapId).slice(-3) + '.json');
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (e) {
            return undefined;
        }
    }

    private mapNodes(dataDir: string): T2FNode[] {
        const nodes: T2FNode[] = [];
        for (const file of fs.readdirSync(dataDir).sort()) {
            const m = file.match(/^Map(\d+)\.json$/);
            if (!m) {
                continue;
            }
            const mapId = String(parseInt(m[1], 10));
            const map = this.readMap(dataDir, mapId);
            const hasContent = !!map && Array.isArray(map.events) &&
                map.events.some((ev) => ev && ev.pages && ev.pages.some((p) => Array.isArray(p.list) && p.list.length > 1));
            if (hasContent) {
                nodes.push(new T2FNode('map', `Map ${mapId}`, vscode.TreeItemCollapsibleState.Collapsed, { mapId }));
            }
        }
        return nodes;
    }

    private eventNodes(dataDir: string, mapId: string): T2FNode[] {
        const map = this.readMap(dataDir, mapId);
        const nodes: T2FNode[] = [];
        if (!map || !Array.isArray(map.events)) {
            return nodes;
        }
        map.events.forEach((ev, eventIndex) => {
            if (!ev || !ev.pages) {
                return;
            }
            const hasContent = ev.pages.some((p) => Array.isArray(p.list) && p.list.length > 1);
            if (!hasContent) {
                return;
            }
            const label = ev.name ? `Event ${eventIndex}: ${ev.name}` : `Event ${eventIndex}`;
            nodes.push(new T2FNode('event', label, vscode.TreeItemCollapsibleState.Collapsed, { mapId, eventId: String(eventIndex) }));
        });
        return nodes;
    }

    private pageNodes(dataDir: string, mapId: string, eventId: string): T2FNode[] {
        const map = this.readMap(dataDir, mapId);
        const nodes: T2FNode[] = [];
        const ev = map && map.events && map.events[Number(eventId)];
        if (!ev || !ev.pages) {
            return nodes;
        }
        ev.pages.forEach((p, pageIndex) => {
            if (!Array.isArray(p.list) || p.list.length <= 1) {
                return;
            }
            const node = new T2FNode('page', `Page ${pageIndex + 1}`, vscode.TreeItemCollapsibleState.None, { mapId, eventId, pageId: String(pageIndex + 1) });
            node.iconPath = new vscode.ThemeIcon('file-text');
            node.command = { command: 'text2frame.tree.open', title: 'Open', arguments: [node] };
            nodes.push(node);
        });
        return nodes;
    }

    private commonNodes(dataDir: string): T2FNode[] {
        const nodes: T2FNode[] = [];
        try {
            const ce = JSON.parse(fs.readFileSync(path.join(dataDir, 'CommonEvents.json'), 'utf8'));
            ce.forEach((entry: { name?: string; list?: unknown[] }, index: number) => {
                if (!entry || !Array.isArray(entry.list) || entry.list.length <= 1) {
                    return;
                }
                const label = entry.name ? `Common ${index}: ${entry.name}` : `Common ${index}`;
                const node = new T2FNode('common', label, vscode.TreeItemCollapsibleState.None, { commonEventId: String(index) });
                node.iconPath = new vscode.ThemeIcon('file-text');
                node.command = { command: 'text2frame.tree.open', title: 'Open', arguments: [node] };
                nodes.push(node);
            });
        } catch (e) {
            // ignore
        }
        return nodes;
    }
}

/** Register the tree view and its node commands. */
export function registerTreeView(context: vscode.ExtensionContext): void {
    const provider = new T2FTreeProvider();
    const view = vscode.window.createTreeView('text2frameExplorer', { treeDataProvider: provider });

    const ensureRoot = (): string | undefined => {
        const root = workspaceRootFor();
        if (!root) {
            vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        }
        return root;
    };

    const openLeaf = async (node: T2FNode): Promise<void> => {
        const root = ensureRoot();
        if (!root || node.nodeType === 'category' || node.nodeType === 'map' || node.nodeType === 'event') {
            return;
        }
        const textPath = textPathForLeaf(root, node);
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
        }
        const doc = await vscode.workspace.openTextDocument(textPath);
        await vscode.window.showTextDocument(doc, { preview: true });
    };

    context.subscriptions.push(
        view,
        vscode.commands.registerCommand('text2frame.tree.refresh', () => provider.refresh()),
        vscode.commands.registerCommand('text2frame.tree.open', (node: T2FNode) => openLeaf(node)),
        vscode.commands.registerCommand('text2frame.tree.export', (node: T2FNode) => {
            const root = ensureRoot();
            if (!root || (node.nodeType !== 'page' && node.nodeType !== 'common')) {
                return;
            }
            const textPath = textPathForLeaf(root, node);
            const target = targetForLeaf(node);
            target.textPath = textPath;
            if (fs.existsSync(textPath)) {
                target.frontMatterSource = fs.readFileSync(textPath, 'utf8');
            }
            const res = exportToTextFile(context, root, target);
            if (res.ok) {
                vscode.window.showInformationMessage('Text2Frame: 書き出しました — ' + path.relative(root, textPath));
                vscode.workspace.openTextDocument(textPath).then((doc) => vscode.window.showTextDocument(doc, { preview: true }));
            } else {
                vscode.window.showErrorMessage('Text2Frame: 書き出し失敗 - ' + (res.error || ''));
            }
        }),
        vscode.commands.registerCommand('text2frame.tree.deploy', (node: T2FNode) => {
            const root = ensureRoot();
            if (!root || (node.nodeType !== 'page' && node.nodeType !== 'common')) {
                return;
            }
            const textPath = textPathForLeaf(root, node);
            if (!fs.existsSync(textPath)) {
                vscode.window.showWarningMessage('Text2Frame: テキストがありません。先に書き出してください。');
                return;
            }
            const res = deployFile(context, root, textPath);
            if (res && res.ok) {
                vscode.window.showInformationMessage('Text2Frame: デプロイしました — ' + path.relative(root, textPath));
            } else if (res) {
                vscode.window.showErrorMessage('Text2Frame: デプロイ失敗 - ' + (res.error || ''));
            }
        })
    );

    // Refresh the tree when data files change.
    const watcher = vscode.workspace.createFileSystemWatcher('**/data/{Map*.json,CommonEvents.json}');
    watcher.onDidChange(() => provider.refresh());
    watcher.onDidCreate(() => provider.refresh());
    watcher.onDidDelete(() => provider.refresh());
    context.subscriptions.push(watcher);
}
