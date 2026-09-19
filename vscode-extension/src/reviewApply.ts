import * as vscode from 'vscode';
import * as path from 'path';
import { review, reviewEnabled, ReviewItem } from './review';
import { tryApplySlowly, fingerprint, ApplyModule, TrialStep } from './dryRun';
import { eachSlowly, SlowlyOptions } from './db/slowly';
import { renderCommands, PullPlan } from './exportText';

/**
 * 反映・取り出しを、差分で確かめてから進める流れ。書き込みはしない(書くのは呼ぶ側)。
 * 「反映する」を押したら材料の指紋を取り直し、確かめたときと違えば、もう一度確かめ直す。
 */

export interface DeployCandidate {
    textPath: string;
    step: TrialStep;
    /** 材料(テキスト・反映先のデータ・祖先)。 */
    inputs: string[];
}

export type Decision = 'accept' | 'cancel' | 'unchanged';

const CHANGED_AGAIN = 'Text2Frame: 確かめているあいだに、テキストかゲームの内容が変わりました。もう一度確かめてください。';

const relative = (root: string, file: string): string => path.relative(root, file) || path.basename(file);

/** 時間のかかる準備。進み具合を出し、途中でやめられる(やめたら undefined を返す作りにする)。 */
export async function busy<T>(title: string, work: (slowly: SlowlyOptions) => Promise<T>): Promise<T> {
    return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title, cancellable: true }, async (progress, token) => {
        let shown = 0;
        const slowly: SlowlyOptions = {
            onProgress: (done, total) => {
                const percent = total ? (100 * done) / total : 100;
                progress.report({ message: `${done} / ${total}`, increment: Math.max(0, percent - shown) });
                shown = Math.max(shown, percent);
            },
            cancelled: () => token.isCancellationRequested
        };
        await new Promise((r) => setTimeout(r, 0));
        return work(slowly);
    });
}

/** 反映したらゲームが変わるテキストと、書き方の誤りで反映できないテキスト(呼ぶ側が受け取る)。 */
export interface DeploySort {
    changed: Set<string>;
    failed: Set<string>;
}

/**
 * 反映したあとのゲームを写しで作り、今のゲームと並べて見せる。
 * sort を渡すと、変わるテキスト・反映できないテキストをそこに集める。show が false なら画面は出さない。
 */
export async function reviewDeploy(
    context: vscode.ExtensionContext,
    root: string,
    mod: ApplyModule,
    candidates: DeployCandidate[],
    scope: string,
    options: { sort?: DeploySort; show?: boolean } = {}
): Promise<Decision> {
    const inputs = candidates.flatMap((c) => c.inputs);
    for (;;) {
        const before = fingerprint(inputs);
        const items: ReviewItem[] = [];
        let failed = 0;
        let conflicts = 0;
        const finished = await busy('Text2Frame: 反映したあとの形を調べています…', async (slowly) => {
            const trials = await tryApplySlowly(mod, candidates.map((c) => c.step), slowly);
            if (!trials) return false;
            if (options.sort) {
                options.sort.changed.clear();
                options.sort.failed.clear();
            }
            return eachSlowly(trials, (trial, i) => {
                if (!trial.result.ok) {
                    failed++;
                    options.sort?.failed.add(candidates[i].textPath);
                    return;
                }
                conflicts += trial.result.conflicts || 0;
                // ほとんどのページは変わらない。中身が同じなら、テキストに直さずに済ませる。
                if (JSON.stringify(trial.before) === JSON.stringify(trial.after)) return;
                const was = renderCommands(context, root, trial.before);
                const will = renderCommands(context, root, trial.after);
                if (was !== will) {
                    items.push({ label: relative(root, candidates[i].textPath), before: was, after: will });
                    options.sort?.changed.add(candidates[i].textPath);
                }
            }, { cancelled: slowly.cancelled });
        });
        if (!finished) return 'cancel';
        if (!items.length) return 'unchanged';
        if (options.show === false) return 'accept';
        const notes = [
            conflicts ? `競合 ${conflicts} 件は両方を残します` : '',
            failed ? `書き方の誤りで反映できないものが ${failed} 件あります` : ''
        ].filter(Boolean);
        const accepted = await review({
            title: `反映の確認（${items.length} ページ）`,
            sides: ['ゲームの今', '反映後'],
            items,
            message: `Text2Frame: ${scope}で、ゲームの ${items.length} ページが変わります。差分を見て、反映するか決めてください。`
                + (notes.length ? `（${notes.join('。')}）` : ''),
            acceptLabel: '反映する'
        });
        if (!accepted) return 'cancel';
        if (fingerprint(inputs) === before) return 'accept';
        vscode.window.showWarningMessage(CHANGED_AGAIN);
    }
}

/**
 * 取り出しで書くテキストを作り、今のテキストと並べて見せる。進めてよいなら計画を返す(やめたら undefined)。
 * 確かめない設定なら、そのまま計画を返す。新しく作るファイルは差分に出さず、数だけ知らせる。
 */
export async function reviewPull(
    root: string,
    makePlans: (slowly: SlowlyOptions) => PullPlan[] | Promise<PullPlan[] | undefined>,
    scope: string
): Promise<{ plans: PullPlan[]; unchanged: boolean } | undefined> {
    const title = 'Text2Frame: 取り出したあとのテキストを作っています…';
    if (!reviewEnabled()) {
        const plans = await busy(title, async (slowly) => makePlans(slowly));
        return plans ? { plans, unchanged: false } : undefined;
    }
    for (;;) {
        const plans = await busy(title, async (slowly) => makePlans(slowly));
        if (!plans) return undefined;
        const inputs = plans.flatMap((p) => p.inputs);
        const before = fingerprint(inputs);
        const usable = plans.filter((p) => p.ok && !p.skipped);
        const items: ReviewItem[] = usable
            .filter((p) => p.previous !== undefined && p.text !== p.previous)
            .map((p) => ({ label: relative(root, p.target.textPath), before: vscode.Uri.file(p.target.textPath), after: p.text as string }));
        if (!items.length) return { plans, unchanged: !usable.some((p) => p.previous === undefined) };
        const created = usable.filter((p) => p.previous === undefined).length;
        const conflicts = usable.reduce((n, p) => n + (p.conflicts || 0), 0);
        const notes = [
            created ? `新しく作るテキストが ${created} 件あります` : '',
            conflicts ? `競合 ${conflicts} 件は両方を残します` : ''
        ].filter(Boolean);
        const accepted = await review({
            title: `取り出しの確認（${items.length} ファイル）`,
            sides: ['今のテキスト', '取り出し後'],
            items,
            message: `Text2Frame: ${scope}で、テキスト ${items.length} ファイルが変わります。差分を見て、書き込むか決めてください。`
                + (notes.length ? `（${notes.join('。')}）` : ''),
            acceptLabel: '書き込む'
        });
        if (!accepted) return undefined;
        if (fingerprint(inputs) === before) return { plans, unchanged: false };
        vscode.window.showWarningMessage(CHANGED_AGAIN);
    }
}
