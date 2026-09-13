import { TAG_HELP_SECTIONS, TAG_HELP_INDEX } from './tagHelpData';

/**
 * タグの説明(ホバーに出す文)。VS Code に依存しない。
 *
 * 説明は Text2Frame.js のヘルプ(@help)の該当する見出しをそのまま使う(scripts/update-tag-help.js が
 * tagHelpData.ts に取り出している)。別名(ShowChoices / 選択肢の表示 / SHC など)も同じ説明になる。
 * タグ名は、書かれたタグから名前だけを切り出し、大小文字を区別せずに名前全体で比べる
 * (先頭一致だと <SetMovementRoute> に <Set> の説明が出てしまう)。コンパイラもタグ名の大小文字を区別しない。
 */

/** タグ(`<SetMovementRoute: 1, …>` のような文字列)の説明の見出しと本文。知らないタグは undefined。 */
export function tagHelpSection(tag: string): { title: string; body: string } | undefined {
    const m = tag.match(/^<\s*\/?\s*([^\s:>]+)/);
    if (!m) return undefined;
    const k = TAG_HELP_INDEX[m[1].toLowerCase()];
    return k === undefined ? undefined : TAG_HELP_SECTIONS[k];
}

/** ホバーに出す Markdown。見出しを太字にし、本文はヘルプの字下げのまま等幅で出す。 */
export function tagHelpText(tag: string): string | undefined {
    const s = tagHelpSection(tag);
    if (!s) return undefined;
    // 本文に ``` があっても囲みが閉じないよう、本文より長い ` の列で囲む。
    const longest = Math.max(2, ...Array.from(s.body.matchAll(/`+/g), (m) => m[0].length));
    const fence = '`'.repeat(longest + 1);
    return `**${s.title}**\n\n${fence}text\n${s.body}\n${fence}`;
}
