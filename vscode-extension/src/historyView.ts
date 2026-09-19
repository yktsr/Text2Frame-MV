import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceRootFor, recordDataState, historyKeep, baseSnapshotPath, snapshotKeyFor } from './compiler';
import { renderCommands } from './exportText';
import { pageList, PageRef } from './dryRun';
import {
    HistoryEntry, HistoryFile, listEntries, readEntry, restoreEntry, snapshotFile, historyRoot, withHistory, onHistoryChange, absolutePath
} from './db/history';

/**
 * 「履歴」の欄。反映・取り出しの前に控えた中身を並べ、差分を見たり、その操作の前に戻したりする。
 * 控えそのものは db/history.ts が取る。
 */

const SCHEME = 'text2frame-history';

const OP_ICONS: Record<string, string> = {
    apply: 'rocket',
    applyOnSave: 'save',
    applyAll: 'cloud-upload',
    pull: 'cloud-download',
    pullAll: 'cloud-download',
    repullAll: 'refresh',
    conversation: 'comment-discussion',
    restore: 'history'
};

type NodeKind = 'entry' | 'file';

class HistoryNode extends vscode.TreeItem {
    constructor(public readonly kind: NodeKind, label: string, collapsible: vscode.TreeItemCollapsibleState, public readonly entry: HistoryEntry, public readonly file?: HistoryFile) {
        super(label, collapsible);
        this.contextValue = 'text2frame.history.' + kind;
        this.id = kind === 'entry' ? 'entry:' + entry.id : `file:${entry.id}:${file ? file.path : ''}`;
    }
}

/** 「3分前」「2時間前」「3日前」。 */
export function ago(then: number, now: number): string {
    const minutes = Math.floor((now - then) / 60000);
    if (minutes < 1) return 'いま';
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    return `${Math.floor(hours / 24)}日前`;
}

const clock = (time: number): string => {
    const d = new Date(time);
    const today = new Date();
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return d.toDateString() === today.toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
};

/** 欄に出すファイル(祖先は、テキストと一緒に戻すだけで、行には出さない)。 */
const shownFiles = (entry: HistoryEntry): HistoryFile[] => entry.files.filter((f) => f.kind !== 'base');

function pageRefOf(key: string): PageRef | undefined {
    const e = /^e:(\d+):(\d+):(\d+)$/.exec(key);
    if (e) return { kind: 'event', mapId: e[1], eventId: e[2], pageId: e[3] };
    const c = /^c:(\d+)$/.exec(key);
    return c ? { kind: 'common', commonEventId: c[1] } : undefined;
}

function pageName(key: string): string {
    const e = /^e:(\d+):(\d+):(\d+)$/.exec(key);
    if (e) return `マップ${e[1]} EV${e[2].padStart(3, '0')} ${e[3]}ページ`;
    const c = /^c:(\d+)$/.exec(key);
    return c ? `コモンイベント ${c[1]}` : key;
}

class HistoryProvider implements vscode.TreeDataProvider<HistoryNode> {
    private readonly emitter = new vscode.EventEmitter<HistoryNode | undefined | void>();
    readonly onDidChangeTreeData = this.emitter.event;

    refresh(): void {
        this.emitter.fire();
    }

    getTreeItem(element: HistoryNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HistoryNode): HistoryNode[] {
        const root = workspaceRootFor();
        if (!root) return [];
        if (!element) {
            const now = Date.now();
            return listEntries(root).map((entry) => {
                const files = shownFiles(entry);
                const node = new HistoryNode('entry', entry.label, vscode.TreeItemCollapsibleState.Collapsed, entry);
                node.description = `${clock(entry.time)}・${ago(entry.time, now)}・${files.length}ファイル`;
                node.iconPath = new vscode.ThemeIcon(OP_ICONS[entry.op] || 'history');
                node.tooltip = `${entry.label}\n${new Date(entry.time).toLocaleString()}\n右クリック →「この操作の前に戻す」で、この操作をする前の中身に戻せます。`;
                return node;
            });
        }
        if (element.kind === 'entry') {
            return shownFiles(element.entry).map((file) => {
                const node = new HistoryNode('file', file.path, vscode.TreeItemCollapsibleState.None, element.entry, file);
                node.description = [file.kind === 'data' ? 'データ' : 'テキスト', file.existed ? '' : '(この操作でできた)'].filter((s) => s).join('・');
                node.iconPath = new vscode.ThemeIcon(file.kind === 'data' ? 'json' : 'file-text');
                node.command = { command: 'text2frame.history.diff', title: '差分を見る', arguments: [node] };
                return node;
            });
        }
        return [];
    }
}

export function registerHistoryView(context: vscode.ExtensionContext): void {
    const provider = new HistoryProvider();
    const view = vscode.window.createTreeView('text2frameHistory', { treeDataProvider: provider });

    const rootOrWarn = (): string | undefined => {
        const root = workspaceRootFor();
        if (!root) vscode.window.showErrorMessage('Text2Frame: ワークスペースフォルダが見つかりません。');
        return root;
    };

    /** 差分の画面の左右の中身。控え(before)と今(now)。データはそのページだけをテキストに直す。 */
    const contents: vscode.TextDocumentContentProvider = {
        provideTextDocumentContent(uri) {
            const root = workspaceRootFor();
            if (!root) return '';
            const q = new URLSearchParams(uri.query);
            const id = q.get('id') || '';
            const rel = q.get('path') || '';
            const side = q.get('side');
            const page = q.get('page');
            const file = side === 'before' ? snapshotFile(root, id, rel) : absolutePath(root, rel);
            let raw: string;
            try {
                raw = fs.readFileSync(file, 'utf8');
            } catch (e) {
                return side === 'before' ? '(この操作の前には、このファイルはありませんでした)' : '(今は、このファイルはありません)';
            }
            if (!page) return raw;
            const ref = pageRefOf(page);
            let json: unknown;
            try { json = JSON.parse(raw); } catch (e) { return raw; }
            const list = ref ? pageList(json, ref) : undefined;
            return list ? renderCommands(context, root, list) : '(このページはありません)';
        }
    };

    const historyUri = (entry: HistoryEntry, rel: string, side: 'before' | 'now', page?: string): vscode.Uri =>
        vscode.Uri.from({
            scheme: SCHEME,
            path: '/' + (side === 'before' ? '控え' : '今') + '/' + rel + (page ? '.txt' : ''),
            query: new URLSearchParams({ id: entry.id, path: rel, side, ...(page ? { page } : {}) }).toString()
        });

    const showDiff = async (entry: HistoryEntry, file: HistoryFile): Promise<void> => {
        const root = rootOrWarn();
        if (!root) return;
        if (file.kind === 'data' && file.pages && file.pages.length) {
            let page = file.pages[0];
            if (file.pages.length > 1) {
                const pick = await vscode.window.showQuickPick(file.pages.map((p) => ({ label: pageName(p), page: p })), { placeHolder: 'どのページの差分を見ますか' });
                if (!pick) return;
                page = pick.page;
            }
            await vscode.commands.executeCommand('vscode.diff', historyUri(entry, file.path, 'before', page), historyUri(entry, file.path, 'now', page),
                `${pageName(page)}: 控え ↔ 今(${entry.label})`);
            return;
        }
        if (!file.existed) {
            await vscode.window.showTextDocument(vscode.Uri.file(absolutePath(root, file.path)), { preview: true });
            return;
        }
        await vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(snapshotFile(root, entry.id, file.path)), vscode.Uri.file(absolutePath(root, file.path)),
            `${path.basename(file.path)}: 控え ↔ 今(${entry.label})`);
    };

    /** 戻す。テキストを戻すときは、その祖先も一緒に戻す。 */
    const restore = async (entry: HistoryEntry, only?: HistoryFile): Promise<void> => {
        const root = rootOrWarn();
        if (!root) return;
        const fresh = readEntry(root, entry.id) || entry;
        let targets = only ? [only.path] : fresh.files.map((f) => f.path);
        if (only && only.kind === 'text') {
            const base = path.relative(root, baseSnapshotPath(root, snapshotKeyFor(root, absolutePath(root, only.path)))).split(path.sep).join('/');
            if (fresh.files.some((f) => f.path === base)) targets = targets.concat([base]);
        }
        const files = fresh.files.filter((f) => targets.includes(f.path));
        const back = files.filter((f) => f.existed && f.kind !== 'base');
        const created = files.filter((f) => !f.existed && f.kind !== 'base');

        // 保存していない変更があるテキストは、戻すと食い違う。先に保存か取り消しをしてもらう。
        const dirty = vscode.workspace.textDocuments.filter((d) => d.isDirty && files.some((f) => path.resolve(absolutePath(root, f.path)) === path.resolve(d.uri.fsPath)));
        if (dirty.length) {
            vscode.window.showWarningMessage('Text2Frame: 保存していない変更があるテキストがあります。保存するか元に戻してから、もう一度戻してください: '
                + dirty.map((d) => path.basename(d.uri.fsPath)).join('、'));
            return;
        }
        const what = only ? `「${only.path}」を` : `「${fresh.label}」の前に`;
        const detail = [
            back.length ? `${back.length} 個のファイルを、この操作をする前の中身に書き戻します。` : '',
            created.length ? `この操作でできた ${created.length} 個のファイルは、消さずにそのまま残します。` : '',
            '戻したことも履歴に残るので、あとから取り消せます。'
        ].filter((s) => s).join('\n');
        const ok = await vscode.window.showWarningMessage(`Text2Frame: ${what}戻しますか？`, { modal: true, detail }, '戻す');
        if (ok !== '戻す') return;

        // 戻したのを取り消すときは「戻す: 戻す: …」と重ねずに、取り消しと分かる名前にする。
        const original = fresh.label.replace(/^(戻す|戻したのを取り消す): /, '');
        const label = only ? '戻す: ' + only.path
            : fresh.op !== 'restore' ? '戻す: ' + fresh.label
                : fresh.label.startsWith('戻す: ') ? '戻したのを取り消す: ' + original : '戻す: ' + original;
        const result = withHistory(root, 'restore', label, { keep: historyKeep() }, () => restoreEntry(root, fresh, targets));
        for (const f of files) {
            if (f.kind === 'data' && result.restored.includes(f.path)) recordDataState(context, absolutePath(root, f.path));
        }
        provider.refresh();
        const shown = result.restored.filter((p) => !p.split('/').includes('.t2f-base'));
        const message = [
            `Text2Frame: 戻しました(${shown.length} ファイル)。`,
            result.created.filter((p) => !p.split('/').includes('.t2f-base')).length ? `この操作でできたファイルは残しています: ${result.created.filter((p) => !p.split('/').includes('.t2f-base')).join('、')}` : '',
            result.missing.length ? `控えが見つからず戻せなかったもの: ${result.missing.join('、')}` : '',
            shown.some((p) => fresh.files.find((f) => f.path === p)?.kind === 'data') ? 'テストプレイ中なら、ゲームを読み直してください。' : ''
        ].filter((s) => s).join('');
        vscode.window.showInformationMessage(message);
    };

    const pickFile = async (entry: HistoryEntry): Promise<HistoryFile | undefined> => {
        const files = shownFiles(entry);
        if (files.length <= 1) return files[0];
        const pick = await vscode.window.showQuickPick(files.map((f) => ({ label: f.path, description: f.kind === 'data' ? 'データ' : 'テキスト', file: f })), { placeHolder: 'どのファイルの差分を見ますか' });
        return pick ? pick.file : undefined;
    };

    context.subscriptions.push(
        view,
        vscode.workspace.registerTextDocumentContentProvider(SCHEME, contents),
        onHistoryChange(() => provider.refresh()),
        vscode.commands.registerCommand('text2frame.history.refresh', () => provider.refresh()),
        vscode.commands.registerCommand('text2frame.history.show', async () => {
            await vscode.commands.executeCommand('workbench.view.extension.text2frame');
            await vscode.commands.executeCommand('text2frameHistory.focus');
        }),
        vscode.commands.registerCommand('text2frame.history.openFolder', () => {
            const root = rootOrWarn();
            if (!root) return;
            const dir = historyRoot(root);
            if (!fs.existsSync(dir)) {
                vscode.window.showInformationMessage('Text2Frame: まだ履歴はありません。反映や取り出しをすると、ここに残ります。');
                return;
            }
            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(dir));
        }),
        vscode.commands.registerCommand('text2frame.history.diff', async (node: HistoryNode) => {
            if (!node) return;
            const file = node.file || await pickFile(node.entry);
            if (file) await showDiff(node.entry, file);
        }),
        vscode.commands.registerCommand('text2frame.history.restore', (node: HistoryNode) => node && restore(node.entry)),
        vscode.commands.registerCommand('text2frame.history.restoreFile', (node: HistoryNode) => node && node.file && restore(node.entry, node.file)),
        view.onDidChangeVisibility((e) => { if (e.visible) provider.refresh(); })
    );
}
