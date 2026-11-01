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
