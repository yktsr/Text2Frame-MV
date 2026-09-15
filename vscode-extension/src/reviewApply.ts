import * as vscode from 'vscode';
import * as path from 'path';
import { review, reviewEnabled, ReviewItem } from './review';
import { tryApply, fingerprint, ApplyModule, TrialStep } from './dryRun';
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

async function busy<T>(title: string, work: () => T): Promise<T> {
    return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title }, async () => {
        await new Promise((r) => setTimeout(r, 0));
        return work();
    });
}

/** 反映したあとのゲームを写しで作り、今のゲームと並べて見せる。 */
export async function reviewDeploy(
    context: vscode.ExtensionContext,
    root: string,
    mod: ApplyModule,
    candidates: DeployCandidate[],
    scope: string
): Promise<Decision> {
    const inputs = candidates.flatMap((c) => c.inputs);
    for (;;) {
        const before = fingerprint(inputs);
        const trials = await busy('Text2Frame: 反映したあとの形を調べています…', () => tryApply(mod, candidates.map((c) => c.step)));
        const items: ReviewItem[] = [];
        let failed = 0;
        let conflicts = 0;
        trials.forEach((trial, i) => {
            if (!trial.result.ok) {
                failed++;
                return;
            }
            conflicts += trial.result.conflicts || 0;
            const was = renderCommands(context, root, trial.before);
            const will = renderCommands(context, root, trial.after);
            if (was !== will) items.push({ label: relative(root, candidates[i].textPath), before: was, after: will });
        });
        if (!items.length) return 'unchanged';
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
    makePlans: () => PullPlan[],
    scope: string
): Promise<{ plans: PullPlan[]; unchanged: boolean } | undefined> {
    if (!reviewEnabled()) return { plans: makePlans(), unchanged: false };
    for (;;) {
        const plans = await busy('Text2Frame: 取り出したあとのテキストを作っています…', makePlans);
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
