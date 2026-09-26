import { HistoryEntry, HistoryFileKind, HistoryPoint, planRestoreTo, undoneBy } from './history';

/**
 * 巻き戻しの見立て。何がいくつ戻るのか、一緒に取り消される操作はいくつあるのかを数える。
 * 画面に出す文はここの数から組み立てる。VS Code に依存しないので、テストから直接使える。
 */

/** 戻る1ファイル。data のときは、その操作で触ったページの鍵(e:マップ:イベント:ページ / c:番号)。 */
export interface RestorePiece {
    path: string;
    entryId: string;
    kind: HistoryFileKind;
    pages: string[];
}

export interface RestoreOverview {
    /** 中身が戻るファイル(祖先の控えも含む)。 */
    files: RestorePiece[];
    /** 中身が戻るゲームのデータ。 */
    data: RestorePiece[];
    /** 中身が戻るテキスト。 */
    texts: RestorePiece[];
    /** 戻るゲームのデータのページ(重複を除く)。ここがテキストとそろえる相手になる。 */
    pages: string[];
    /** その時点より後にできたファイル。消さずに残す(祖先の控えは planRestoreTo が除く)。 */
    created: string[];
    /** その時点には無かった祖先の控え。巻き戻しで消すもの(利用者には見せない)。 */
    removed: string[];
    /** 選んだ操作と一緒に取り消される、そのあとの操作の数。 */
    laterOps: number;
}

/** 祖先の控えは利用者に見せない(テキストと一緒に戻るだけのもの)。 */
export const isBaseCopy = (rel: string): boolean => rel.split('/').includes('.t2f-base');

export function restoreOverview(entries: HistoryEntry[], from: HistoryPoint): RestoreOverview {
    const plan = planRestoreTo(entries, from);
    const files: RestorePiece[] = plan.files.map((f) =>
        ({ path: f.path, entryId: f.entryId, kind: f.kind, pages: f.pages || [] }));
    const data = files.filter((f) => f.kind === 'data');
    const pages: string[] = [];
    for (const f of data) {
        for (const key of f.pages) if (!pages.includes(key)) pages.push(key);
    }
    return {
        files,
        data,
        texts: files.filter((f) => f.kind === 'text'),
        pages,
        created: plan.created,
        removed: plan.removed,
        laterOps: Math.max(0, undoneBy(entries, from).length - 1)
    };
}
