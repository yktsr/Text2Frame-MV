import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceRootFor, recordDataState, historyKeep } from './compiler';
import { review, reviewEnabled, ReviewItem } from './review';
import { renderCommands } from './exportText';
import { pageList, PageRef } from './dryRun';
import { tr } from './db/lang';
import {
    HistoryEntry, HistoryFile, listEntries, readEntry, planRestoreTo, restoreTo, snapshotFile, historyRoot, withHistory, onHistoryChange, absolutePath
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
    if (minutes < 1) return tr('いま', 'just now');
    if (minutes < 60) return tr(`${minutes}分前`, `${minutes} min ago`);
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return tr(`${hours}時間前`, `${hours} h ago`);
    return tr(`${Math.floor(hours / 24)}日前`, `${Math.floor(hours / 24)} d ago`);
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
    if (e) return tr(`マップ${e[1]} EV${e[2].padStart(3, '0')} ${e[3]}ページ`, `Map${e[1]} EV${e[2].padStart(3, '0')} page ${e[3]}`);
    const c = /^c:(\d+)$/.exec(key);
    return c ? tr(`コモンイベント ${c[1]}`, `Common event ${c[1]}`) : key;
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
                node.description = tr(`${clock(entry.time)}・${ago(entry.time, now)}・${files.length}ファイル`, `${clock(entry.time)} · ${ago(entry.time, now)} · ${files.length} files`);
                node.iconPath = new vscode.ThemeIcon(OP_ICONS[entry.op] || 'history');
                node.tooltip = tr(`${entry.label}\n${new Date(entry.time).toLocaleString()}\n右クリック →「この時点に戻す」で、この操作を始める直前の状態(テキストもゲームのデータも)に戻せます。`, `${entry.label}\n${new Date(entry.time).toLocaleString()}\nRight-click → Go back to this point, to bring the texts and the game data back to how they were just before this operation.`);
                return node;
            });
        }
        if (element.kind === 'entry') {
            return shownFiles(element.entry).map((file) => {
                const node = new HistoryNode('file', file.path, vscode.TreeItemCollapsibleState.None, element.entry, file);
                node.description = [file.kind === 'data' ? tr('ゲームのデータ', 'Game data') : tr('テキスト', 'Text'), file.existed ? '' : tr('(この操作でできた)', '(made by this operation)')].filter((s) => s).join(tr('・', ' · '));
                node.iconPath = new vscode.ThemeIcon(file.kind === 'data' ? 'json' : 'file-text');
                node.command = { command: 'text2frame.history.diff', title: tr('差分を見る', 'Show changes'), arguments: [node] };
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
        if (!root) vscode.window.showErrorMessage(tr('Text2Frame: ワークスペースフォルダが見つかりません。', 'Text2Frame: No workspace folder was found.'));
        return root;
    };

    /* 1ファイル(データならそのページ)の中身を文字列で。控え(before)と今(now)で共通。
     * まとめて差分を見せるときと、1件の差分を開くときの両方から使う。 */
    const sideText = (root: string, entryId: string, rel: string, side: 'before' | 'now', page?: string): string => {
        const file = side === 'before' ? snapshotFile(root, entryId, rel) : absolutePath(root, rel);
        let raw: string;
        try {
            raw = fs.readFileSync(file, 'utf8');
        } catch (e) {
            return side === 'before' ? tr('(この時点には、このファイルはありませんでした)', '(This file did not exist at that point)') : tr('(今は、このファイルはありません)', '(This file does not exist now)');
        }
        if (!page) return raw;
        const ref = pageRefOf(page);
        let json: unknown;
        try { json = JSON.parse(raw); } catch (e) { return raw; }
        const list = ref ? pageList(json, ref) : undefined;
        return list ? renderCommands(context, root, list) : tr('(このページはありません)', '(This page does not exist)');
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
            return sideText(root, id, rel, side === 'before' ? 'before' : 'now', page || undefined);
        }
    };

    const historyUri = (entry: HistoryEntry, rel: string, side: 'before' | 'now', page?: string): vscode.Uri =>
        vscode.Uri.from({
            scheme: SCHEME,
            path: '/' + (side === 'before' ? tr('控え', 'before') : tr('今', 'now')) + '/' + rel + (page ? '.txt' : ''),
            query: new URLSearchParams({ id: entry.id, path: rel, side, ...(page ? { page } : {}) }).toString()
        });

    const showDiff = async (entry: HistoryEntry, file: HistoryFile): Promise<void> => {
        const root = rootOrWarn();
        if (!root) return;
        if (file.kind === 'data' && file.pages && file.pages.length) {
            let page = file.pages[0];
            if (file.pages.length > 1) {
                const pick = await vscode.window.showQuickPick(file.pages.map((p) => ({ label: pageName(p), page: p })), { placeHolder: tr('どのページの差分を見ますか', 'Which page do you want to compare?') });
                if (!pick) return;
                page = pick.page;
            }
            await vscode.commands.executeCommand('vscode.diff', historyUri(entry, file.path, 'before', page), historyUri(entry, file.path, 'now', page),
                tr(`${pageName(page)}: 控え ↔ 今(${entry.label})`, `${pageName(page)}: before ↔ now (${entry.label})`));
            return;
        }
        if (!file.existed) {
            await vscode.window.showTextDocument(vscode.Uri.file(absolutePath(root, file.path)), { preview: true });
            return;
        }
        await vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(snapshotFile(root, entry.id, file.path)), vscode.Uri.file(absolutePath(root, file.path)),
            tr(`${path.basename(file.path)}: 控え ↔ 今(${entry.label})`, `${path.basename(file.path)}: before ↔ now (${entry.label})`));
    };

    /* ある時点に戻す。その操作を始める直前の状態へ、テキストもゲームのデータもまとめてそろえる。
     * 操作1つだけを取り消す形にしていたが、「反映を取り消したのにテキストは動かない(動くのは
     * ゲームのデータ)」が分かりにくかったため、時点で戻す形にした。 */
    const restore = async (entry: HistoryEntry): Promise<void> => {
        const root = rootOrWarn();
        if (!root) return;
        const fresh = readEntry(root, entry.id) || entry;
        const plan = planRestoreTo(listEntries(root), fresh);
        const shownFilesOf = (paths: string[]): string[] => paths.filter((p) => !p.split('/').includes('.t2f-base'));
        const texts = plan.files.filter((f) => f.kind === 'text');
        const data = plan.files.filter((f) => f.kind === 'data');

        // 保存していない変更があるテキストは、戻すと食い違う。先に保存か取り消しをしてもらう。
        const dirty = vscode.workspace.textDocuments.filter((d) => d.isDirty && plan.files.some((f) => path.resolve(absolutePath(root, f.path)) === path.resolve(d.uri.fsPath)));
        if (dirty.length) {
            vscode.window.showWarningMessage(tr('Text2Frame: 保存していない変更があるテキストがあります。保存するか元に戻してから、もう一度戻してください: ', 'Text2Frame: Some texts have unsaved changes. Save or revert them, then go back again: ')
                + dirty.map((d) => path.basename(d.uri.fsPath)).join(tr('、', ', ')));
            return;
        }
        if (!plan.files.length && !plan.created.length) {
            vscode.window.showInformationMessage(tr('Text2Frame: この時点から変わったものはありません。', 'Text2Frame: Nothing has changed since then.'));
            return;
        }
        const when = clock(fresh.started);
        const createdShown = shownFilesOf(plan.created);
        /* 戻す前に、変わる所をまとめて差分で見せる(反映・取り出しの確認と同じ画面)。
         * 左が「今」、右が「戻したあと」。ゲームのデータは、触ったページだけテキストに直して並べる。 */
        const items: ReviewItem[] = [];
        for (const f of plan.files) {
            if (f.kind === 'base') continue;
            const pages = f.kind === 'data' && f.pages && f.pages.length ? f.pages : [undefined];
            for (const page of pages) {
                const after = sideText(root, f.entryId, f.path, 'before', page);
                const now = sideText(root, f.entryId, f.path, 'now', page);
                if (now === after) continue;
                const label = page ? `${path.basename(f.path)}（${pageName(page)}）` : f.path;
                items.push({ label, before: page ? now : vscode.Uri.file(absolutePath(root, f.path)), after });
            }
        }
        const detail = [
            tr(`テキスト ${texts.length} 個、ゲームのデータ ${data.length} 個を、この時点の中身に書き戻します。`, `${texts.length} text file(s) and ${data.length} game data file(s) get back what they held at that point.`),
            createdShown.length ? tr(`このあとに作られた ${createdShown.length} 個のファイルは、消さずにそのまま残します。`, `The ${createdShown.length} files made after that point are kept, not deleted.`) : '',
            tr('戻したことも履歴に残るので、あとから取り消せます。', 'Going back is recorded in the history too, so you can undo it later.')
        ].filter((s) => s).join('\n');
        const goBack = tr('戻す', 'Go back');
        if (reviewEnabled() && items.length) {
            const accepted = await review({
                title: tr(`戻す前の確認（${items.length} 件）`, `Review going back (${items.length} items)`),
                sides: [tr('今', 'Now'), tr('戻したあと', 'After going back')],
                items,
                message: tr(`Text2Frame: ${when} の状態に戻すと、${items.length} 件が変わります。差分を見て、戻すか決めてください。`, `Text2Frame: Going back to ${when} changes ${items.length} items. Look at the changes and decide.`)
                    + (createdShown.length ? tr(`（このあとに作られた ${createdShown.length} 件は残します）`, ` (${createdShown.length} files made after that point are kept)`) : ''),
                acceptLabel: goBack
            });
            if (!accepted) return;
        } else {
            const ok = await vscode.window.showWarningMessage(
                tr(`Text2Frame: ${when} の状態に戻しますか？`, `Text2Frame: Go back to how things were at ${when}?`), { modal: true, detail }, goBack
            );
            if (ok !== goBack) return;
        }

        const label = tr(`${when} の状態に戻す`, `Go back to ${when}`);
        const result = withHistory(root, 'restore', label, { keep: historyKeep() }, () => restoreTo(root, listEntries(root), fresh));
        for (const f of plan.files) {
            if (f.kind === 'data' && result.restored.includes(f.path)) recordDataState(context, absolutePath(root, f.path));
        }
        provider.refresh();
        const shown = shownFilesOf(result.restored);
        const message = [
            tr(`Text2Frame: ${when} の状態に戻しました(${shown.length} ファイル)。`, `Text2Frame: Went back to ${when} (${shown.length} files). `),
            createdShown.length ? tr(`このあとに作られたファイルは残しています: ${createdShown.join('、')}`, `The files made after that point are kept: ${createdShown.join(', ')}. `) : '',
            result.missing.length ? tr(`控えが見つからず戻せなかったもの: ${result.missing.join('、')}`, `Could not go back, no copy found: ${result.missing.join(', ')}. `) : '',
            data.length ? tr('テストプレイ中なら、ゲームを読み直してください。', 'If a test play is running, reload the game.') : ''
        ].filter((s) => s).join('');
        vscode.window.showInformationMessage(message);
    };

    const pickFile = async (entry: HistoryEntry): Promise<HistoryFile | undefined> => {
        const files = shownFiles(entry);
        if (files.length <= 1) return files[0];
        const pick = await vscode.window.showQuickPick(files.map((f) => ({ label: f.path, description: f.kind === 'data' ? tr('データ', 'Data') : tr('テキスト', 'Text'), file: f })), { placeHolder: tr('どのファイルの差分を見ますか', 'Which file do you want to compare?') });
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
                vscode.window.showInformationMessage(tr('Text2Frame: まだ履歴はありません。反映や取り出しをすると、ここに残ります。', 'Text2Frame: No history yet. Applying or pulling records it here.'));
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
        view.onDidChangeVisibility((e) => { if (e.visible) provider.refresh(); })
    );
}
