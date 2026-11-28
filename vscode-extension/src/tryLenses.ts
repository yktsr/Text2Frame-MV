import { tr } from './db/lang';

/*
 * テキストのいちばん上に出す行。vscode に依存しない(src/db/* と同じ約束)ので、テストから
 * 直接呼べる。画面を作る側は src/tryEvent.ts。
 *
 * ここに置くのは**いちばんよく使う2つだけ**にしてある。行が長いと、どれを押せばよいか
 * かえって分からない。
 *
 *   ▶ テストプレイ          ゲームを動かす。自分で用意したセーブから試すのが本筋の確かめ方で、
 *                           ツクラーにいちばん馴染みがある
 *   ▶ このページをすぐ実行  出現条件を整えずに、このページの中身だけを動かす(ツクールに同じ手が無い)
 *
 * 「イベントの前に立つ」はここから外した(「操作」パネルと一覧の右クリックにある)。
 */

export interface LensSpec {
    title: string;
    command: string;
    /** text2frame.tryEvent に渡す試し方。テストプレイには無い。 */
    mode?: 'run' | 'common';
}

/** 見出し情報(front matter)から、その行に出すもの。宛先が分からなければ何も出さない。 */
export function lensesFor(meta: { [key: string]: string }): LensSpec[] {
    const play: LensSpec = { title: tr('▶ テストプレイ', '▶ Test play'), command: 'text2frame.testPlay' };
    if (meta.kind === 'common') {
        if (!meta.commonEventId) return [];
        return [{ title: tr('▶ すぐ実行', '▶ Run now'), command: 'text2frame.tryEvent', mode: 'common' }, play];
    }
    if (!meta.mapId || !meta.eventId) return [];
    return [{ title: tr('▶ このページをすぐ実行', '▶ Run this page now'), command: 'text2frame.tryEvent', mode: 'run' }, play];
}
