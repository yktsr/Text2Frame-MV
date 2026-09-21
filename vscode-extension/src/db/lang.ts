/**
 * 画面に出す言葉の言語。VS Code の表示言語が日本語なら日本語、それ以外は英語。
 * 言葉は使うときに選ぶ(ファイルを読み込んだときには、まだ言語が決まっていない)。
 */

let japanese = true;

export function setJapanese(on: boolean): void {
    japanese = on;
}

export function isJapanese(): boolean {
    return japanese;
}

/** 日本語と英語のうち、今の言語の方。 */
export function tr(ja: string, en: string): string {
    return japanese ? ja : en;
}

/** [日本語, 英語] の組から、今の言語の方。 */
export function pick(pair: readonly [string, string]): string {
    return japanese ? pair[0] : pair[1];
}

/** 日本語と英語の並びのうち、今の言語の方。 */
export function trList(ja: string[], en: string[]): string[] {
    return japanese ? ja : en;
}
