import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceRootFor, workspaceRootOrWarn, recordDataState, historyKeep, dataDirFor, textBaseDirFor } from './compiler';
import { review, reviewEnabled, ReviewItem } from './review';
import { commitPull, ExportTarget, newTextPathFor, planPull, PullPlan, renderCommands, textIndexFor } from './exportText';
import { busy } from './reviewApply';
import { pageList, PageRef } from './dryRun';
import { tr } from './db/lang';
import { placeFromKey } from './placeLabel';
import { targetKeyFromMeta } from './db/baseKey';
import { mapSlowly, SlowlyOptions } from './db/slowly';
import { isBaseCopy, RestorePiece, restoreOverview } from './db/restorePlan';
import {
    HistoryEntry, HistoryFile, listEntries, readEntry, restoreTo, snapshotFile, historyRoot, withHistory, onHistoryChange, absolutePath, undoneBy
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

/* 場所の鍵(e:マップ:イベント:ページ / c:コモン)の読み方は placeFromKey に1つ。 */
function pageRefOf(key: string): PageRef | undefined {
    const place = placeFromKey(key);
    if (!place) return undefined;
    return place.kind === 'common'
        ? { kind: 'common', commonEventId: String(place.commonEventId) }
        : { kind: 'event', mapId: String(place.mapId), eventId: String(place.eventId), pageId: String(place.pageId) };
}

function pageName(key: string): string {
    const place = placeFromKey(key);
    if (!place) return key;
    if (place.kind === 'common') return tr(`コモンイベント ${place.commonEventId}`, `Common event ${place.commonEventId}`);
    const ev = String(place.eventId).padStart(3, '0');
    return tr(`マップ${place.mapId} EV${ev} ${place.pageId}ページ`, `Map${place.mapId} EV${ev} page ${place.pageId}`);
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
            const entries = listEntries(root);
            return entries.map((entry) => {
                const files = shownFiles(entry);
                const data = files.filter((f) => f.kind === 'data').length;
                const texts = files.length - data;
                const what = [
                    data ? tr(`ゲームのデータ ${data}件`, `${data} game data`) : '',
                    texts ? tr(`テキスト ${texts}件`, `${texts} text(s)`) : ''
                ].filter((s) => s).join(tr('・', ' · '));
                // 一緒に取り消される、この操作より後の操作の数。
                const later = Math.max(0, undoneBy(entries, entry).length - 1);
                // 出す時刻は「始めた時刻」。巻き戻す先はこの操作の直前なので、確認の文と同じ数字になる。
                const began = entry.started || entry.time;
                const node = new HistoryNode('entry', entry.label, vscode.TreeItemCollapsibleState.Collapsed, entry);
                // 祖先の控えだけの操作は what が空になる(祖先は行に出さない)。区切りだけ残さない。
                node.description = [clock(began), ago(began, now), what].filter((s) => s).join(tr('・', ' · '));
                node.iconPath = new vscode.ThemeIcon(OP_ICONS[entry.op] || 'history');
                node.tooltip = tr(
                    `${entry.label}\n${new Date(began).toLocaleString()}\n「巻き戻す」で、この操作の直前まで戻します。`
                    + (later ? `このあとの ${later} 件の操作も、一緒に取り消されます。` : '')
                    + 'ゲームのデータが戻るページは、テキストもその内容に作り直してそろえます。',
                    `${entry.label}\n${new Date(began).toLocaleString()}\nRewind brings everything back to just before this operation.`
                    + (later ? ` The ${later} operation(s) after it are undone too.` : '')
                    + ' Pages whose game data goes back get their texts rebuilt to match.');
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
        const root = workspaceRootOrWarn();
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

    const relOf = (root: string, abs: string): string => path.relative(root, abs).split(path.sep).join('/');

    /** 巻き戻したあとの中身。控えがあればその中身、無ければ今のまま。 */
    const afterRestore = (root: string, planned: Map<string, string>, rel: string): string | undefined => {
        const id = planned.get(rel);
        try {
            return fs.readFileSync(id ? snapshotFile(root, id, rel) : absolutePath(root, rel), 'utf8');
        } catch (e) {
            return undefined;
        }
    };

    /**
     * ゲームのデータが戻るページを、テキストとそろえる計画。巻き戻したあとの命令列からテキストを
     * 作り直す(まだ書いていないので、控えから読んで planPull に渡す)。書き方(コメント行・空行の幅・
     * タグの綴り)は、巻き戻したあとのテキストから引き継ぐ。
     * そろえるのはゲームのデータが動くページだけ。取り出しの巻き戻し(動くのはテキストだけ)で
     * ゲームから作り直すと、戻したテキストをまた取り出し直すことになり、何もしないのと同じになる。
     */
    const alignPlans = async (root: string, planned: Map<string, string>, data: RestorePiece[], slowly: SlowlyOptions):
        Promise<{ key: string; plan: PullPlan }[] | undefined> => {
        const wanted: { path: string; key: string }[] = [];
        data.forEach((f) => f.pages.forEach((key) => wanted.push({ path: f.path, key })));
        const textDir = textBaseDirFor(root);
        const dataDir = dataDirFor(root);
        // 索引は1回だけ。ページごとに引くと、テキストのフォルダを何百回も読み直すことになる。
        const index = textIndexFor(context, root, textDir);
        const made = await mapSlowly(wanted, (it) => {
            const place = placeFromKey(it.key);
            const ref = pageRefOf(it.key);
            const raw = afterRestore(root, planned, it.path);
            if (!place || !ref || raw === undefined) return undefined;
            let list: unknown[] | undefined;
            try {
                list = pageList(JSON.parse(raw), ref);
            } catch (e) {
                list = undefined;
            }
            if (!list) return undefined; // 巻き戻したあとには、このページが無い
            const target: ExportTarget = place.kind === 'common'
                ? { kind: 'common', commonEventId: String(place.commonEventId), textPath: '' }
                : { kind: 'event', mapId: String(place.mapId), eventId: String(place.eventId ?? 0), pageId: String(place.pageId ?? 1), textPath: '' };
            const key = targetKeyFromMeta({
                kind: target.kind,
                mapId: target.mapId || '',
                eventId: target.eventId || '',
                pageId: target.pageId || '',
                commonEventId: target.commonEventId || ''
            });
            target.textPath = (key && index.paths[key]) || newTextPathFor(context, root, dataDir, textDir, target);
            const previous = afterRestore(root, planned, relOf(root, target.textPath));
            if (previous !== undefined) target.frontMatterSource = previous;
            return { key: it.key, plan: planPull(context, root, target, 'overwrite', list) };
        }, slowly);
        return made && made.filter((a): a is { key: string; plan: PullPlan } => !!a);
    };

    /* ある操作の直前まで巻き戻す。その操作以降の書き換えをすべて取り消し、ゲームのデータが戻る
     * ページは、テキストもその内容に作り直してそろえる。
     * 操作1つだけを取り消す形にしていたが、「反映を取り消したのにテキストは動かない(動くのは
     * ゲームのデータ)」が分かりにくかったため、時点で戻し、テキストもそろえる形にした。 */
    const restore = async (entry: HistoryEntry): Promise<void> => {
        const root = workspaceRootOrWarn();
        if (!root) return;
        const fresh = readEntry(root, entry.id) || entry;
        const entries = listEntries(root);
        const overview = restoreOverview(entries, fresh);
        if (!overview.files.length && !overview.created.length && !overview.removed.length) {
            vscode.window.showInformationMessage(tr('Text2Frame: この時点から変わったものはありません。', 'Text2Frame: Nothing has changed since then.'));
            return;
        }
        const planned = new Map(overview.files.map((f) => [f.path, f.entryId]));
        const aligns = overview.data.length
            ? await busy(tr('Text2Frame: 巻き戻したあとのテキストを作っています…', 'Text2Frame: Making the texts for after the rewind…'),
                (slowly: SlowlyOptions) => alignPlans(root, planned, overview.data, slowly))
            : [];
        if (!aligns) {
            vscode.window.setStatusBarMessage(tr('Text2Frame: 巻き戻しをやめました。', 'Text2Frame: Stopped the rewind.'), 4000);
            return;
        }

        /* 1つのテキストは1件だけ出す。そろえるページのテキストは作り直した中身、
         * それ以外は控えの中身が「巻き戻したあと」になる。 */
        const byText = new Map<string, { key: string; plan: PullPlan }>();
        aligns.forEach((a) => { if (a.plan.ok && a.plan.text !== undefined) byText.set(relOf(root, a.plan.target.textPath), a); });

        // 保存していない変更があるテキストは、巻き戻すと食い違う。先に保存か取り消しをしてもらう。
        const willWrite = new Set(overview.files.map((f) => path.resolve(absolutePath(root, f.path))));
        byText.forEach((a) => willWrite.add(path.resolve(a.plan.target.textPath)));
        const dirty = vscode.workspace.textDocuments.filter((d) => d.isDirty && willWrite.has(path.resolve(d.uri.fsPath)));
        if (dirty.length) {
            vscode.window.showWarningMessage(tr('Text2Frame: 保存していない変更があるテキストがあります。保存するか元に戻してから、もう一度巻き戻してください: ', 'Text2Frame: Some texts have unsaved changes. Save or revert them, then rewind again: ')
                + dirty.map((d) => path.basename(d.uri.fsPath)).join(tr('、', ', ')));
            return;
        }

        /* 巻き戻す前に、変わる所をまとめて差分で見せる(反映・取り出しの確認と同じ画面)。
         * 左が「今」、右が「巻き戻したあと」。ゲームのデータは、そろえたテキストが代わりに表している。 */
        const items: ReviewItem[] = [];
        const shownTexts = new Map<string, string>(); // 相対パス -> 差分に出す名前
        overview.texts.forEach((f) => shownTexts.set(f.path, f.path));
        byText.forEach((a, rel) => shownTexts.set(rel, pageName(a.key)));
        let rebuilt = 0;
        let restoredTexts = 0;
        shownTexts.forEach((label, rel) => {
            const a = byText.get(rel);
            const after = a ? (a.plan.text as string) : afterRestore(root, planned, rel);
            if (after === undefined) return;
            const abs = absolutePath(root, rel);
            const now = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : undefined;
            if (now === after) return;
            if (a) rebuilt++; else restoredTexts++;
            items.push({ label, before: now === undefined ? '' : vscode.Uri.file(abs), after });
        });
        // テキストを作れなかったページは、今までどおりゲームのデータの差分で見せる。
        const done = new Set(aligns.filter((a) => a.plan.ok).map((a) => a.key));
        overview.data.forEach((f) => {
            (f.pages.length ? f.pages : [undefined]).forEach((page) => {
                if (page && done.has(page)) return;
                const after = sideText(root, f.entryId, f.path, 'before', page);
                const now = sideText(root, f.entryId, f.path, 'now', page);
                if (now === after) return;
                items.push({ label: page ? `${path.basename(f.path)}（${pageName(page)}）` : f.path, before: now, after });
            });
        });

        const when = clock(fresh.started);
        const where = tr(`「${fresh.label}」の直前（${when}）`, `just before "${fresh.label}" (${when})`);
        // 数え方は差分の一覧と合わせる(確認に出す数と、見せる差分の件数が食い違わないように)。
        const dataCount = overview.pages.length
            ? tr(`ゲームのデータ ${overview.pages.length} ページ`, `${overview.pages.length} page(s) of game data`)
            : tr(`ゲームのデータ ${overview.data.length} 個`, `${overview.data.length} game data file(s)`);
        const detail = [
            overview.data.length
                ? tr(`${dataCount}を、この操作の直前の内容に戻します。`, `${dataCount} get back what they held just before this operation.`)
                : '',
            rebuilt
                ? tr(`そのページのテキスト ${rebuilt} 個も、同じ内容に作り直してそろえます。テキストに残っている未反映の編集は、ゲームの内容に置き換わります。`, `${rebuilt} text(s) of those pages are rebuilt to match, so changes in them that were never applied are replaced by the game's contents.`)
                : '',
            restoredTexts
                ? tr(`テキスト ${restoredTexts} 個を、この操作の直前の内容に戻します。`, `${restoredTexts} text(s) get back what they held just before this operation.`)
                : '',
            overview.laterOps
                ? tr(`このあとの ${overview.laterOps} 件の操作も、一緒に取り消されます。`, `The ${overview.laterOps} operation(s) after it are undone too.`)
                : '',
            overview.created.length
                ? tr(`このあとに作られた ${overview.created.length} 個のファイルは、消さずにそのまま残します。`, `The ${overview.created.length} files made after that point are kept, not deleted.`)
                : '',
            tr('巻き戻したことも履歴に残るので、あとから取り消せます。', 'The rewind is recorded in the history too, so you can undo it later.')
        ].filter((s) => s);
        const rewind = tr('巻き戻す', 'Rewind');
        if (reviewEnabled() && items.length) {
            const notes = [
                overview.data.length ? dataCount : '',
                rebuilt ? tr(`テキスト ${rebuilt} 個は作り直してそろえます`, `${rebuilt} text(s) are rebuilt to match`) : '',
                restoredTexts ? tr(`テキスト ${restoredTexts} 個を戻します`, `${restoredTexts} text(s) go back`) : '',
                overview.laterOps ? tr(`このあとの ${overview.laterOps} 件の操作も取り消します`, `the ${overview.laterOps} operation(s) after it are undone too`) : '',
                overview.created.length ? tr(`このあとに作られた ${overview.created.length} 個は残します`, `${overview.created.length} files made after that point are kept`) : ''
            ].filter((s) => s);
            const accepted = await review({
                title: tr(`巻き戻す前の確認（${items.length} 件）`, `Review the rewind (${items.length} items)`),
                sides: [tr('今', 'Now'), tr('巻き戻したあと', 'After the rewind')],
                items,
                message: tr(`Text2Frame: ${where}まで巻き戻すと、${items.length} 件が変わります。差分を見て、決めてください。`, `Text2Frame: Rewinding to ${where} changes ${items.length} items. Look at the changes and decide.`)
                    + (notes.length ? `（${notes.join(tr('、', '; '))}）` : ''),
                acceptLabel: rewind,
                cancelLabel: tr('キャンセル', 'Cancel')
            });
            if (!accepted) return;
        } else {
            const ok = await vscode.window.showWarningMessage(
                tr(`Text2Frame: ${where}まで巻き戻しますか？`, `Text2Frame: Rewind to ${where}?`), { modal: true, detail: detail.join('\n') }, rewind
            );
            if (ok !== rewind) return;
        }

        const label = tr(`${when} まで巻き戻す`, `Rewind to ${when}`);
        const result = withHistory(root, 'restore', label, { keep: historyKeep() }, () => {
            const restored = restoreTo(root, listEntries(root), fresh);
            // 戻したデータからテキストを作り直す。同じ1つの操作に入るので、まとめて取り消せる。
            const wrote = aligns.filter((a) => a.plan.ok)
                .map((a) => ({ key: a.key, out: commitPull(context, root, a.plan) }));
            return { ...restored, wrote };
        });
        overview.data.forEach((f) => {
            if (result.restored.includes(f.path)) recordDataState(context, absolutePath(root, f.path));
        });
        provider.refresh();
        const shown = result.restored.filter((p) => !isBaseCopy(p));
        const broken = aligns.filter((a) => !a.plan.ok).map((a) => a.key)
            .concat(result.wrote.filter((w) => !w.out.ok).map((w) => w.key))
            .map(pageName);
        const message = [
            tr(`Text2Frame: ${where}まで巻き戻しました(${shown.length} ファイル)。`, `Text2Frame: Rewound to ${where} (${shown.length} files). `),
            rebuilt ? tr(`テキスト ${rebuilt} 個は、戻したゲームの内容に合わせて作り直しました。`, `${rebuilt} text(s) were rebuilt to match the game. `) : '',
            overview.created.length ? tr(`このあとに作られたファイルは残しています: ${overview.created.join('、')}`, `The files made after that point are kept: ${overview.created.join(', ')}. `) : '',
            result.missing.length ? tr(`控えが見つからず戻せなかったもの: ${result.missing.join('、')}`, `Could not go back, no copy found: ${result.missing.join(', ')}. `) : '',
            broken.length ? tr(`テキストをそろえられなかったページ: ${broken.join('、')}`, `Could not line up the texts of: ${broken.join(', ')}. `) : '',
            overview.data.length ? tr('テストプレイ中なら、ゲームを読み直してください。', 'If a test play is running, reload the game.') : ''
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
            const root = workspaceRootOrWarn();
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
