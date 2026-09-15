import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 反映・取り出しの前に、変わる所を VS Code の差分画面で見せ、「反映する」を押したときだけ進める。
 * 右(と、ゲーム側なら左)は、この拡張が持つ仮のファイル(t2f-review:)として開く。
 * 確認待ちは一度に1つだけ。新しい確認が来たら前のものは「やめる」扱いにする。
 */

export const REVIEW_SCHEME = 't2f-review';
const PENDING_KEY = 'text2frame.reviewPending';

export interface ReviewItem {
    /** 一覧に出す名前(テキストのファイル名など)。 */
    label: string;
    /** 左。文字列なら仮のファイル、Uri なら実際のファイル。 */
    before: string | vscode.Uri;
    after: string;
}

export interface ReviewRequest {
    /** 差分のタブの題。 */
    title: string;
    /** 左右の見出し(例: 「ゲームの今」「反映後」)。1件のときの題に添える。 */
    sides: [string, string];
    items: ReviewItem[];
    /** 通知の文。 */
    message: string;
    acceptLabel: string;
}

interface Pending {
    resolve: (accepted: boolean) => void;
    uris: Set<string>;
    watchTabs: boolean;
    shown: boolean;
}

const docs = new Map<string, string>();
const changed = new vscode.EventEmitter<vscode.Uri>();
let pending: Pending | undefined;
let seq = 0;

function tabUris(tab: vscode.Tab): string[] {
    const input = tab.input as { original?: vscode.Uri; modified?: vscode.Uri; textDiffs?: Array<{ original?: vscode.Uri; modified?: vscode.Uri }> } | undefined;
    if (!input) return [];
    const pairs = input.textDiffs || [input];
    const out: string[] = [];
    for (const pair of pairs) {
        if (pair.original) out.push(pair.original.toString());
        if (pair.modified) out.push(pair.modified.toString());
    }
    return out;
}

function reviewTabs(uris: Set<string>): vscode.Tab[] {
    const out: vscode.Tab[] = [];
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            if (tabUris(tab).some((u) => uris.has(u))) out.push(tab);
        }
    }
    return out;
}

function finish(accepted: boolean): void {
    const current = pending;
    if (!current) return;
    pending = undefined;
    vscode.commands.executeCommand('setContext', PENDING_KEY, false);
    const tabs = reviewTabs(current.uris);
    if (tabs.length) vscode.window.tabGroups.close(tabs).then(undefined, () => undefined);
    current.uris.forEach((u) => docs.delete(u));
    current.resolve(accepted);
}

function virtualUri(id: number, index: number, side: string, label: string): vscode.Uri {
    const name = path.basename(label).replace(/\.[^.]*$/, '') + '.t2f';
    return vscode.Uri.from({ scheme: REVIEW_SCHEME, path: `/${id}/${index}/${side}/${name}` });
}

/** 差分を見せて、反映するかを聞く。反映するなら true。 */
export async function review(request: ReviewRequest): Promise<boolean> {
    finish(false);
    const id = ++seq;
    const uris = new Set<string>();
    const pairs = request.items.map((item, index) => {
        const right = virtualUri(id, index, 'after', item.label);
        docs.set(right.toString(), item.after);
        uris.add(right.toString());
        let left: vscode.Uri;
        if (typeof item.before === 'string') {
            left = virtualUri(id, index, 'before', item.label);
            docs.set(left.toString(), item.before);
            uris.add(left.toString());
        } else {
            left = item.before;
        }
        return { item, left, right };
    });

    const decided = new Promise<boolean>((resolve) => {
        pending = { resolve, uris, watchTabs: false, shown: false };
    });
    await vscode.commands.executeCommand('setContext', PENDING_KEY, true);

    const openOne = (pair: typeof pairs[number]): Thenable<unknown> =>
        vscode.commands.executeCommand('vscode.diff', pair.left, pair.right,
            `${pair.item.label}（${request.sides[0]} ↔ ${request.sides[1]}）`, { preview: pairs.length > 1 });
    const listed = pairs.length > 1 && !(await vscode.commands.getCommands(true)).includes('vscode.changes');
    try {
        if (pairs.length === 1) {
            await openOne(pairs[0]);
        } else if (!listed) {
            await vscode.commands.executeCommand('vscode.changes', request.title,
                pairs.map((p) => [vscode.Uri.from({ scheme: REVIEW_SCHEME, path: '/' + p.item.label }), p.left, p.right]));
        } else {
            await openOne(pairs[0]);
        }
    } catch (e) {
        finish(false);
        vscode.window.showErrorMessage('Text2Frame: 差分を開けませんでした - ' + (e instanceof Error ? e.message : String(e)));
        return decided;
    }
    if (pending && pending.uris === uris) {
        pending.watchTabs = !listed;
        pending.shown = reviewTabs(uris).length > 0;
    }

    const buttons = listed ? [request.acceptLabel, 'やめる', '一覧から見る'] : [request.acceptLabel, 'やめる'];
    const ask = (): void => {
        vscode.window.showInformationMessage(request.message, ...buttons).then((choice) => {
            if (!pending || pending.uris !== uris) return;
            if (choice === request.acceptLabel) finish(true);
            else if (choice === 'やめる') finish(false);
            else if (choice === '一覧から見る') {
                vscode.window.showQuickPick(pairs.map((p) => ({ label: p.item.label, pair: p })), { placeHolder: '差分を見るファイル' })
                    .then((pick) => { if (pick) openOne(pick.pair); ask(); });
            }
        });
    };
    ask();
    return decided;
}

export function registerReview(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        changed,
        vscode.workspace.registerTextDocumentContentProvider(REVIEW_SCHEME, {
            onDidChange: changed.event,
            provideTextDocumentContent: (uri) => docs.get(uri.toString()) ?? ''
        }),
        vscode.commands.registerCommand('text2frame.review.accept', () => finish(true)),
        vscode.commands.registerCommand('text2frame.review.cancel', () => finish(false)),
        vscode.window.tabGroups.onDidChangeTabs(() => {
            if (!pending || !pending.watchTabs) return;
            const open = reviewTabs(pending.uris).length > 0;
            if (open) pending.shown = true;
            else if (pending.shown) finish(false);
        }),
        { dispose: () => finish(false) }
    );
}

export const reviewEnabled = (): boolean =>
    vscode.workspace.getConfiguration('text2frame').get<boolean>('reviewBeforeApply', true);
