/**
 * 画面(Webview)の言葉。画面の HTML は拡張の側で組み立てるので、決まった言葉はそこで tr() で選ぶ。
 * 画面の中のスクリプトが組み立てる言葉は、選んだものを表 L にして渡す({0} に値を入れるのは fmt)。
 */

/** HTML の中身や属性に入れる言葉。 */
export function html(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 画面のスクリプトの先頭に置く、言葉の表 L と fmt。<script> の中でも切れない形にする。 */
export function scriptText(table: Record<string, string | string[]>): string {
    const json = JSON.stringify(table).replace(/</g, '\\u003c');
    return `const L = ${json};\n  const fmt = (s, ...a) => s.replace(/\\{(\\d)\\}/g, (_m, i) => String(a[Number(i)]));`;
}
