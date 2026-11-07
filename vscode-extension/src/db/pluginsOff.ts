/*
 * テストプレイのときだけ、名前で指定されたプラグインを切る。vscode に依存しない
 * (src/db/* と同じ約束)ので、テストから直接呼べる。配る側は src/gameServer.ts。
 *
 * **なぜ要るか。** ツクールのプラグインには、nw.js (ツクール本体)の中でだけ動く作りのものが
 * ある ── Node の `require` を使うものがそれで、ブラウザには `require` が無い。ゲームの
 * フォルダを HTTP で配ってブラウザで動かすテストプレイでは、そういうプラグインがゲームの
 * 動きに関わっていると、そこで止まる(実物のゲームで、セーブの読み込みに関わっていて
 * 読めなかった)。**プラグインが悪いのではなく、動かす場所が違うだけ。**
 *
 * **ゲームのフォルダは書き換えない。** 配るときに中身だけ差し替える。ツクール本体の
 * テストプレイには何の影響も無い。
 */

/** `SomePlugin` と `SomePlugin.js` と大文字小文字の違いを、同じものとして扱う。 */
const same = (name: string): string => String(name || '').trim().replace(/\.js$/i, '').toLowerCase();

/**
 * `js/plugins.js` の中身を、名前の挙がったプラグインだけ `status: false` にして返す。
 *
 * 読めない形だったときは**何もせずそのまま返す**。切れないことより、配るものを壊さない方が
 * 大事(切れていなければ、利用者には今までと同じ失敗が見える)。
 */
export function pluginsOff(source: string, names: string[]): string {
    const wanted = (names || []).map(same).filter((one) => one);
    if (!wanted.length) return source;
    /* ツクールが書く形は `var $plugins =\n[ … ];` で、中身は JSON。
     * 同じ切り方を src/db/messageFit.ts の autoWrapPlugin が既にしている。 */
    const hit = /\$plugins\s*=\s*(\[[\s\S]*\])\s*;?/.exec(source);
    if (!hit) return source;
    let list: unknown;
    try {
        list = JSON.parse(hit[1]);
    } catch (e) {
        return source;
    }
    if (!Array.isArray(list)) return source;
    let changed = false;
    const after = list.map((one) => {
        const plugin = one as { name?: unknown; status?: unknown };
        if (!plugin || typeof plugin !== 'object' || typeof plugin.name !== 'string') return one;
        if (wanted.indexOf(same(plugin.name)) === -1) return one;
        if (plugin.status === false) return one;
        changed = true;
        return Object.assign({}, plugin, { status: false });
    });
    if (!changed) return source;
    const at = source.indexOf(hit[1]);
    return source.slice(0, at) + JSON.stringify(after) + source.slice(at + hit[1].length);
}

/**
 * 選べるプラグインの名前。plugins.js に並んでいる順。
 *
 * **区切りの行は出さない。** ツクールのプラグイン管理では `-----------------` や `-CORE`
 * のような行を入れて束ねられる(実物のゲームで88件のうち14件がそれだった)。あれはプラグイン
 * ではないので、選ばせると一覧が読めなくなる。
 */
export function pluginNames(source: string): string[] {
    const hit = /\$plugins\s*=\s*(\[[\s\S]*\])\s*;?/.exec(source);
    if (!hit) return [];
    try {
        const list = JSON.parse(hit[1]);
        if (!Array.isArray(list)) return [];
        return list
            .map((one) => (one && typeof one.name === 'string' ? one.name : ''))
            .filter((one) => /^[^-\s]/.test(one));
    } catch (e) {
        return [];
    }
}
