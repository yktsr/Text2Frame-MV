import { RefKind } from './commandRefs';

/**
 * テキスト1行から、データベースの番号が「どの種類で、何文字目から何文字目にあるか」を取り出す。
 * VS Code に依存しない。名前の薄い表示・ホバー・警告・「使っている箇所を探す」がこれを使う。
 *
 * タグの別名(英語・日本語・短縮形)は Text2Frame.js の正規表現と揃えてある。
 * ずれていないことは、例文をコンパイラに通した結果(commandRefs)と突き合わせるテストで確かめる。
 * 位置は JavaScript の文字列の添字(UTF-16)で、VS Code の列と同じ。
 */

export interface TagRef {
    kind: RefKind;
    id: number;
    /** `1-10` のような範囲指定の終わり。 */
    endId?: number;
    /** 顔だけ。顔画像のファイル名。id は何番目の顔か。 */
    faceName?: string;
    /** 行の中の位置(この範囲に番号が書かれている)。 */
    start: number;
    end: number;
}

// 変数の操作の演算子(Text2Frame.js の set/add/sub/mul/div/mod_operation_list)。
const VARIABLE_OPS = 'set|代入|=|add|加算|\\+|sub|減算|-|mul|乗算|\\*|div|除算|\\/|mod|剰余|%';
const SWITCH_TAGS = 'sw|switch|スイッチ';
const COMMON_EVENT_TAGS = 'commonevent|ce|コモンイベント';
const FACE_TAGS = 'face|fc|顔';
const IF_TAGS = 'if|条件分岐';
const TRANSFER_TAGS = 'transferplayer|場所移動';
const ANIMATION_TAGS = 'showanimation|アニメーションの表示';
// 変数を指す書き方。`\V[n]`(文章中の制御文字)は別物なので、直前が英字・\ のものは除く。
const VARIABLE_REF = '(?<![A-Za-z_\\\\])(?:variables|v|変数)\\[';

/** 条件分岐の対象 → 種類(Text2Frame.js の getConditionalBranch)。 */
const IF_TARGET_KINDS: Array<[RegExp, RefKind]> = [
    [/^(?:switches|スイッチ|sw)$/i, 'switch'],
    [/^(?:variables|変数|v)$/i, 'variable'],
    [/^(?:actors|アクター)$/i, 'actor'],
    [/^(?:items|アイテム)$/i, 'item'],
    [/^(?:weapons|武器)$/i, 'weapon'],
    [/^(?:armors|防具)$/i, 'armor']
];

const each = function (re: RegExp, line: string, fn: (m: RegExpExecArray) => void): void {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        fn(m);
        if (m[0].length === 0) re.lastIndex++;
    }
};

/** タグの中(`<` の後、対になる `>` の前)の変数参照 `V[n]` を拾う。offset は s の行内の位置。 */
const variableRefsIn = function (s: string, offset: number, out: TagRef[]): void {
    each(new RegExp('(' + VARIABLE_REF + ')(\\d+)\\]', 'gi'), s, (m) => {
        const start = offset + m.index + m[1].length;
        out.push({ kind: 'variable', id: Number(m[2]), start, end: start + m[2].length });
    });
};

export function findRefs(line: string): TagRef[] {
    const out: TagRef[] = [];

    // 顔: <Face: suzu1(4)>。番号だけでなく「名前(番号)」全体を範囲にする。
    // <Face: (5)> は顔画像なし(番号だけ残っている)。コンパイラも顔なしと読むので拾わない。
    each(new RegExp(`(<(?:${FACE_TAGS}) *: *)([^()<>\\s][^()<>]*?)\\((\\d+)\\)`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        out.push({ kind: 'face', id: Number(m[3]), faceName: m[2], start, end: start + m[2].length + m[3].length + 2 });
    });

    // スイッチの操作: <Switch: 79, ON> / <SW: 3-5, OFF>
    each(new RegExp(`(<(?:${SWITCH_TAGS}) *: *)(\\d+)(?:-(\\d+))?`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        const text = m[2] + (m[3] !== undefined ? '-' + m[3] : '');
        out.push({ kind: 'switch', id: Number(m[2]), endId: m[3] !== undefined ? Number(m[3]) : undefined, start, end: start + text.length });
    });

    // 変数の操作: <Set: 5, V[20]>。左辺と、右辺の変数参照。
    each(new RegExp(`(<(?:${VARIABLE_OPS}) *: *)(\\d+)(?:-(\\d+))?([^<>]*)>`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        const text = m[2] + (m[3] !== undefined ? '-' + m[3] : '');
        out.push({ kind: 'variable', id: Number(m[2]), endId: m[3] !== undefined ? Number(m[3]) : undefined, start, end: start + text.length });
        variableRefsIn(m[4], start + text.length, out);
    });

    // 条件分岐: <If: Switches[79], ON> / <If: V[2], >=, V[9]>。比較演算子に > が入るので行末の > まで取る。
    each(new RegExp(`(<(?:${IF_TAGS})\\s*:\\s*)([^\\[\\]<>,\\s]+)\\[(\\d+)\\](.*)>`, 'gi'), line, (m) => {
        const target = IF_TARGET_KINDS.find(([re]) => re.test(m[2]));
        if (!target) return;
        const start = m.index + m[1].length + m[2].length + 1;
        out.push({ kind: target[1], id: Number(m[3]), start, end: start + m[3].length });
        if (target[1] === 'variable') variableRefsIn(m[4], start + m[3].length + 1, out);
    });

    // コモンイベント: <CommonEvent: 7>
    each(new RegExp(`(<(?:${COMMON_EVENT_TAGS}) *: *)(\\d+)`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        out.push({ kind: 'commonEvent', id: Number(m[2]), start, end: start + m[2].length });
    });

    // 場所移動: 直接指定ならマップ、変数で指定なら3つとも変数。
    each(new RegExp(`(<(?:${TRANSFER_TAGS})\\s*:\\s*)(direct|0|直接指定|withvariables|変数で指定)\\[(\\d+)\\]\\[(\\d+)\\]\\[(\\d+)\\]`, 'gi'), line, (m) => {
        let pos = m.index + m[1].length + m[2].length + 1;
        const direct = /^(?:direct|0|直接指定)$/i.test(m[2]);
        [m[3], m[4], m[5]].forEach((value, i) => {
            if (direct && i === 0) out.push({ kind: 'map', id: Number(value), start: pos, end: pos + value.length });
            if (!direct) out.push({ kind: 'variable', id: Number(value), start: pos, end: pos + value.length });
            pos += value.length + 2;
        });
    });

    // アニメーションの表示: <ShowAnimation: This Event, 123, OFF>
    each(new RegExp(`(<(?:${ANIMATION_TAGS})\\s*:\\s*[^,<>]*,\\s*)(\\d+)`, 'gi'), line, (m) => {
        const start = m.index + m[1].length;
        out.push({ kind: 'animation', id: Number(m[2]), start, end: start + m[2].length });
    });

    return out.sort((a, b) => a.start - b.start);
}

export interface LineRef extends TagRef {
    line: number;
}

// 中身がタグとして読まれないブロック(Text2Frame.js の getBlockStatement と同じ3種)。
// \b は ASCII の単語境界なので「文章のスクロール表示>」の間では効かない。先読みで区切る。
const BLOCK_OPEN = /<(?:script|sc|スクリプト)>|<(?:comment|co|注釈)>|<(?:ShowScrollingText|sst|文章のスクロール表示)(?=[\s:,>])[^>]*>/i;
const BLOCK_CLOSE = /<\/(?:script|sc|スクリプト|comment|co|注釈|ShowScrollingText|sst|文章のスクロール表示)>/i;

/**
 * 文書全体を走査する。% で始まる行(コメントアウト)と、スクリプト・注釈・スクロール文章の
 * ブロックの中は飛ばす(そこに書かれた <Switch: 1, ON> はコマンドにならないので)。
 */
export function scanLines(lines: string[], commentOutChar = '%'): LineRef[] {
    const out: LineRef[] = [];
    let inBlock = false;
    const comment = new RegExp('^ *' + commentOutChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    lines.forEach((text, line) => {
        if (inBlock) {
            if (BLOCK_CLOSE.test(text)) inBlock = false;
            return;
        }
        const open = text.match(BLOCK_OPEN);
        if (open) {
            // 同じ行で閉じていなければ、次の行からブロックの中。
            if (!BLOCK_CLOSE.test(text.slice((open.index || 0) + open[0].length))) inBlock = true;
            return;
        }
        if (comment.test(text)) return;
        for (const ref of findRefs(text)) out.push(Object.assign({ line }, ref));
    });
    return out;
}

export interface Expected {
    kind: RefKind;
    /** カーソルの前に打ってある部分(補完の絞り込みに使い、確定したら置き換える)。 */
    typed: string;
    start: number;
    /** 顔の番号を選んでいるときの、顔画像のファイル名。 */
    faceName?: string;
}

const FRAGMENT = '([^,<>\\[\\]()\\s]*)$';
const EXPECT: Array<[RegExp, RefKind]> = [
    [new RegExp(`<(?:${SWITCH_TAGS})\\s*:\\s*${FRAGMENT}`, 'i'), 'switch'],
    [new RegExp(`<(?:${VARIABLE_OPS})\\s*:\\s*${FRAGMENT}`, 'i'), 'variable'],
    [new RegExp(`<(?:${COMMON_EVENT_TAGS})\\s*:\\s*${FRAGMENT}`, 'i'), 'commonEvent'],
    [new RegExp(`<(?:${TRANSFER_TAGS})\\s*:\\s*(?:direct|0|直接指定)\\[${FRAGMENT}`, 'i'), 'map'],
    [new RegExp(`<(?:${ANIMATION_TAGS})\\s*:\\s*[^,<>]*,\\s*${FRAGMENT}`, 'i'), 'animation'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:switches|スイッチ|sw)\\[${FRAGMENT}`, 'i'), 'switch'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:actors|アクター)\\[${FRAGMENT}`, 'i'), 'actor'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:items|アイテム)\\[${FRAGMENT}`, 'i'), 'item'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:weapons|武器)\\[${FRAGMENT}`, 'i'), 'weapon'],
    [new RegExp(`<(?:${IF_TAGS})\\s*:\\s*(?:armors|防具)\\[${FRAGMENT}`, 'i'), 'armor'],
    [new RegExp(`${VARIABLE_REF}${FRAGMENT}`, 'i'), 'variable'],
    [new RegExp(`<(?:${FACE_TAGS})\\s*:\\s*${FRAGMENT}`, 'i'), 'face']
];
const FACE_INDEX = new RegExp(`<(?:${FACE_TAGS})\\s*:\\s*([^()<>]+?)\\(${FRAGMENT}`, 'i');

/** カーソル位置でどの種類の番号を打とうとしているか。補完に使う。タグの外なら undefined。 */
export function expectedAt(line: string, column: number): Expected | undefined {
    const before = line.slice(0, column);
    if (before.lastIndexOf('<') <= before.lastIndexOf('>')) return undefined; // タグの中ではない
    const face = before.match(FACE_INDEX);
    if (face) return { kind: 'face', typed: face[2], start: column - face[2].length, faceName: face[1] };
    for (const [re, kind] of EXPECT) {
        const m = before.match(re);
        if (m) return { kind, typed: m[1], start: column - m[1].length };
    }
    return undefined;
}
