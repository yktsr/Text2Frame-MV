import { tr } from './db/lang';

/*
 * 「マップのつながり」の行に出す文字。vscode に依存しない(src/db/* と同じ約束)ので、
 * テストから直接呼べる。画面を作る側は src/mapLinksView.ts。
 *
 * この図の行は、どちらの向きでも「**場所移動のコマンドが書いてある側のページ**」を指している。
 *   「ここへ来るマップ」… コマンドは相手のマップにあるので、押すと相手のテキストへ飛ぶ
 *   「行き先のマップ」  … コマンドは**いま見ているマップ**にあるので、押すと自分のテキストに戻る
 *
 * 行にそれが書いていなかったので、「行き先のマップの下にある行を押したのに、関係ないテキストが
 * 開く」と見えていた。どちら側のページなのかを行に出す。
 */

export interface PlaceRow {
    /** イベントのページか、コモンイベントか、どちらとも読めないか。 */
    kind: 'page' | 'common' | 'other';
    /** 移動のコマンドが、いま見ているマップにあるか。 */
    onThisMap: boolean;
    /** コマンドがあるマップの名前(`page` のときだけ)。 */
    mapName?: string;
    /** 乗り物で移動するもの。 */
    vehicle?: boolean;
}

/** 名前の横に薄く出す言葉。どのマップにあるコマンドなのかを必ず言う。 */
export function placeDetail(row: PlaceRow): string {
    const where = row.kind === 'common'
        ? tr('どのマップからかは決まりません', 'Which map it runs on is not fixed')
        : row.onThisMap
            ? tr('このマップにある', 'on this map')
            : row.mapName
                ? tr(`${row.mapName} にある`, `on ${row.mapName}`)
                : '';
    return [where, row.vehicle ? tr('乗り物', 'vehicle') : ''].filter((s) => s).join(tr('・', ' · '));
}

/**
 * マップの行を押したときに、その行き先へ切り替えられるか。
 * いま見ているマップと同じなら切り替える先が無いので、押しても何も起きない方が正直。
 */
export function canFollow(other: number, viewing: number): boolean {
    return Number.isInteger(other) && other > 0 && other !== viewing;
}
