import { tr } from './db/lang';

/*
 * 「マップのつながり」の行に出す文字。vscode に依存しない(src/db/* と同じ約束)ので、
 * テストから直接呼べる。画面を作る側は src/mapLinksView.ts。
 *
 * **並べるのは移動コマンドそのもので、マップでまとめない。** まとめていた間は、行が
 * どちらの端の話なのかが形から読めなかった ── 「行き先のマップ」の下の行は見ている
 * マップのページ、「ここへ来る」の下の行は相手のマップのページで、見た目が同じまま
 * 意味が入れ替わっていた(報告のとおり)。まとめをやめると、マップ名が注記ではなく
 * 行の中身になり、行ごとに変わる情報になる。
 *
 * 書き方の規則は2つだけ。
 *   - **着地点は、どちらの向きも「マップ名 (x,y)」。** 来る側はいま見ているマップに着く
 *     ので名前は全行で同じ文字になるが、2つの列が同じ形に読めることを採った
 *   - **コマンドのあるマップは、いま見ているマップなら呼ばない。** 名前が付いていれば
 *     「他のマップのイベント」と読める
 * 座標はどちらの向きも「着く場所」で、出る側は相手のマップの、来る側はこのマップの着地点。
 */

export interface LinkRow {
    /** 移動コマンドが書いてあるイベント(押すと開く側)。見出しはもう組んである。 */
    event: string;
    /** そのイベントがあるマップ。いま見ているマップなら渡さない。 */
    onMap?: string;
    /** 着地点のマップ。**いま見ているマップでも渡す**(2つの列を同じ形に読ませるため)。 */
    toMap?: string;
    toX?: number;
    toY?: number;
    /** 乗り物の位置設定(202)。人が降りるのではない。 */
    vehicle?: boolean;
    /** 行き先を変数で決めているときの、その変数。 */
    byVariable?: number;
}

/** 行の見出し。どのマップのイベントかが分からなくならないように、他のマップなら名前を付ける。 */
export function rowLabel(row: LinkRow): string {
    return row.onMap ? `${row.onMap} ${row.event}` : row.event;
}

/** 見出しの横に薄く出す言葉。どこへ着くか。 */
export function rowDetail(row: LinkRow): string {
    if (row.byVariable) {
        return tr(`→ 変数${row.byVariable} で決まる行き先`, `→ destination from variable ${row.byVariable}`);
    }
    const at = row.toX === undefined || row.toY === undefined ? '' : `(${row.toX},${row.toY})`;
    const where = [row.toMap || '', at].filter((s) => s).join(' ');
    if (!where) return '';
    return row.vehicle
        ? tr(`→ ${where} に乗り物を置く`, `→ puts a vehicle at ${where}`)
        : tr(`→ ${where} に着く`, `→ arrives at ${where}`);
}
