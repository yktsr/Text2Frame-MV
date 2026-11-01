/*
 * 「Maps / Common Events」の一覧を、テキストがあるものだけに絞る判断。vscode に依存しない
 * (src/db/* と同じ約束)ので、テストから直接呼べる。画面を作る側は src/tree.ts。
 *
 * **既定では絞らない。** テキストがまだ無い行は「押すとそのページをゲームから取り出せる」
 * 唯一の入口なので、隠すとテキストを作れなくなる。絞るのは、もう全部取り出してあって
 * 編集している人のための切り替え。
 *
 * 絞るときは親も数え直す。ページを隠しただけだと、**開けるのに中が空のイベント**が残る。
 */

/** テキストがあるページの番号(0 から)。`has` はそのページにテキストがあるか。 */
export function pagesWithText(pages: number, has: (index: number) => boolean): number[] {
    const out: number[] = [];
    for (let index = 0; index < Math.max(0, pages); index++) {
        if (has(index)) out.push(index);
    }
    return out;
}

/** そのイベントに、テキストのあるページが1つでもあるか。 */
export function eventHasText(pages: number, has: (index: number) => boolean): boolean {
    return pagesWithText(pages, has).length > 0;
}
