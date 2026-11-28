/*
 * ゲームの `js/plugins.js` にあるプラグインの設定。vscode に依存しない(src/db/* の約束)。
 *
 * ツクールがこのファイルに書き出した設定を読む。ここで要るのは2つ:
 *   - 自動で改行するプラグインが入っているか(はみ出しを調べるかの判断)
 *   - Text2Frame のコメント文字(`%` 以外にしている人がいる)
 *
 * コメント文字を知らないと、**その人のコメント行が本文として色分けされ、本文がコメントとして
 * 消える**。反映の側は本体(Text2Frame.js)が同じファイルを読んで直したので、画面の側も揃える。
 * パラメータの名前は本体が宣言しているものなので、`test_projectParams.js` が本体の
 * ヘルプと突き合わせている。
 */

export interface PluginEntry {
    name?: string;
    status?: boolean;
    parameters?: { [key: string]: unknown };
}

/** 本体が宣言しているパラメータの名前。 */
export const COMMENT_OUT_CHAR = 'Comment Out Char';

/** 設定を読む相手のプラグイン。 */
export const TEXT2FRAME = 'Text2Frame';

/** ツクールが書く `$plugins = [...]` を読む。読めなければ空。 */
export function parsePlugins(pluginsJs: string): PluginEntry[] {
    const m = pluginsJs.match(/\$plugins\s*=\s*(\[[\s\S]*\])\s*;?/);
    if (!m) return [];
    try {
        const list = JSON.parse(m[1]);
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

/** 有効になっているプラグインを名前で探す。 */
export function enabledPlugin(pluginsJs: string, name: string): PluginEntry | undefined {
    return parsePlugins(pluginsJs).find((one) => one && one.status === true && one.name === name);
}

/**
 * このゲームの Text2Frame が使うコメント文字。
 * プラグインが入っていない・切ってある・空のときは undefined(呼び側が既定の `%` を使う)。
 */
export function commentOutCharIn(pluginsJs: string): string | undefined {
    const mine = enabledPlugin(pluginsJs, TEXT2FRAME);
    const value = mine && mine.parameters ? mine.parameters[COMMENT_OUT_CHAR] : undefined;
    return typeof value === 'string' && value !== '' ? value : undefined;
}
