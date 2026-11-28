/*
 * 「操作」の画面から設定へ飛ぶための合い言葉。vscode に依存しない(src/db/* と同じ約束)ので、
 * テストから直接呼べる。vscode を使う側は src/commandsView.ts。
 *
 * 設定は VS Code の設定画面にあって辿り着きにくい。そこを開けるようにするのが目的で、
 * 開くときの合い言葉(@ext:)の作り方はここだけが知っている。
 */

export const EXTENSION_ID = 'yktsr.text2frame-language-support';

/** この拡張の設定をまとめて開く合い言葉。 */
export function allSettingsQuery(): string {
    return '@ext:' + EXTENSION_ID;
}
