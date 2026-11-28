import { SaveSlot } from './liveState';
import { tr } from './db/lang';

/*
 * セーブの一覧に出す文字と、再開したときの答えの言い換え。vscode に依存しない
 * (src/db/* と同じ約束)ので、テストから直接呼べる。画面を作る側は src/saveFiles.ts。
 *
 * 答えの名前を取り違えると、利用者には生の英単語がそのまま出る。ゲーム側が返しうる名前と
 * ここが突き合わせられるように、一覧を名前で持っている。
 */

/** ゲームが返しうる、再開の答え。 */
export const LOAD_RESULTS = ['loaded', 'noSave', 'failed'] as const;

export type LoadResult = typeof LOAD_RESULTS[number];

/** 答えごとの「うまくいったか」と、知らせる言葉。言葉は呼ばれたときの言語で選ぶ。 */
export function loadWording(): Record<LoadResult, { ok: boolean; text: string }> {
    return {
        loaded: { ok: true, text: tr('セーブから再開しました。', 'Resumed from the save.') },
        noSave: { ok: false, text: tr('その番号にセーブがありません。', 'There is no save in that slot.') },
        failed: { ok: false, text: tr('セーブを読めませんでした。', 'Could not read the save.') }
    };
}

/**
 * ブラウザには無い機能(Node の `require`)。これが理由なら、ツクール本体の中でだけ動く
 * 作りのプラグインが、読み込みに割り込んでいる。
 */
const ONLY_IN_RPG_MAKER = /require is not defined/i;

/**
 * 知らせる1行。**読めなかったときは、ゲームが言った理由を添える。**
 * 「読めませんでした」だけでは、セーブが壊れているのか、プラグインを入れ替えて古い
 * セーブが使えなくなったのかが分からない。知らない答えは、そのまま見せる。
 *
 * ツクール本体(nw.js)の中でだけ動く作りのプラグインがあると、ブラウザで動かすこちらでは
 * そこで止まる。**どのプラグインとは言わない** ── プラグインが悪いのではなく、動かす場所が
 * 違うだけで、どれを切るかは利用者が一覧から選ぶ(「テストプレイで切るプラグインを選ぶ」)。
 */
export function loadMessage(result: string, why?: string): { ok: boolean; text: string } {
    const told = loadWording()[result as LoadResult];
    const ok = told ? told.ok : false;
    let text = told ? told.text : result;
    if (ok) return { ok, text };
    if (why) text += tr(`ゲームが言った理由: ${why}`, ` The game said: ${why}`);
    if (!why || !ONLY_IN_RPG_MAKER.test(why)) return { ok, text };
    return {
        ok,
        text: text + tr(
            'ブラウザには無い機能を使っているので、ツクール本体の中でだけ動くプラグインが読み込みに関わっているようです。「テストプレイで切るプラグインを選ぶ」から外して試せます。',
            ' Something a browser does not have was used, so a plugin that only runs inside RPG Maker itself seems to be involved in reading the save. You can leave it out from "Choose the plugins to turn off for test play".')
    };
}

export interface SlotLine {
    slot: number;
    label: string;
    /** 名前の横に薄く出す、遊んだ時間と日時。分からなければ空。 */
    description: string;
    /** さらに下の行。セーブに題が付いていれば。 */
    detail?: string;
}

/** 一覧の1行。遊んだ時間と日時は在れば添える(どのセーブか見分けるのに要る)。 */
export function slotLine(one: SaveSlot, when?: (at: number) => string): SlotLine {
    const stamp = one.at ? (when ? when(one.at) : new Date(one.at).toLocaleString()) : '';
    return {
        slot: one.slot,
        label: tr(`${one.slot} 番`, `Slot ${one.slot}`),
        description: [one.playtime, stamp].filter((s) => s).join(tr('・', ' · ')),
        detail: one.title
    };
}
