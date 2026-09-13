import { RpgCommand } from './commandRefs';

/**
 * 色を指定するタグから、見本の色を作る。VS Code に依存しない。
 * エディタでは値の前に小さな四角で、プレビューではその行に出す。
 *
 * 色の書き方は2通りある。
 *   - 色調(画面の色調変更・ピクチャの色調変更・ウィンドウカラーの変更): 赤・緑・青を -255〜255 で
 *     足し引きする量と、グレー(0〜255、色を抜く強さ)。色そのものではないので、
 *     中間の灰色(128)にかけた色を見本にする。灰色は色を抜いても変わらないので、グレーは見本に出ない。
 *   - フラッシュ: 赤・緑・青(0〜255)と強さ(0〜255)。強さを不透明度にした色を見本にする。
 *
 * 読み方は Text2Frame.js(getPictureOptions の colortone、flash_screen、change_window_color)と揃えてある。
 * ずれていないことは、例文をコンパイラに通した結果(commandColor)と突き合わせるテストで確かめる。
 */

export interface Swatch {
    r: number;
    g: number;
    b: number;
    /** 不透明度 0〜1。 */
    a: number;
}

export type ColorKind = 'tone' | 'flash';

export interface ColorRef {
    kind: ColorKind;
    /** 色調は [赤, 緑, 青, グレー]、フラッシュは [赤, 緑, 青, 強さ]。 */
    values: number[];
    swatch: Swatch;
    /** 行の中の位置(この範囲に色が書かれている)。 */
    start: number;
    end: number;
}

const BASE_GRAY = 128;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function toneSwatch(tone: number[]): Swatch {
    const [r, g, b] = [0, 1, 2].map((i) => clamp(Math.round(BASE_GRAY + (Number(tone[i]) || 0)), 0, 255));
    return { r, g, b, a: 1 };
}

export function flashSwatch(color: number[]): Swatch {
    const [r, g, b] = [0, 1, 2].map((i) => clamp(Math.round(Number(color[i]) || 0), 0, 255));
    return { r, g, b, a: clamp((Number(color[3]) || 0) / 255, 0, 1) };
}

export function cssColor(s: Swatch): string {
    return `rgba(${s.r}, ${s.g}, ${s.b}, ${Math.round(s.a * 1000) / 1000})`;
}

/** 見本に添える説明。 */
export function describeColor(kind: ColorKind, values: number[]): string {
    const [r, g, b, x] = values;
    return kind === 'tone'
        ? `色調 赤${r} 緑${g} 青${b} グレー${x}(見本は変化量の目安)`
        : `フラッシュ 赤${r} 緑${g} 青${b} 強さ${x}`;
}

/** コンパイル後のコマンドの色。色を持たないコマンドは undefined。 */
export function commandColor(cmd: RpgCommand): { kind: ColorKind; values: number[]; swatch: Swatch } | undefined {
    const p = cmd.parameters || [];
    const tone = (v: unknown) => (Array.isArray(v) ? { kind: 'tone' as const, values: v.slice(0, 4), swatch: toneSwatch(v) } : undefined);
    switch (cmd.code) {
        case 138: return tone(p[0]); // ウィンドウカラーの変更(グレーは常に 0)
        case 223: return tone(p[0]); // 画面の色調変更
        case 234: return tone(p[1]); // ピクチャの色調変更
        case 224: // 画面のフラッシュ
            return Array.isArray(p[0]) ? { kind: 'flash', values: p[0].slice(0, 4), swatch: flashSwatch(p[0]) } : undefined;
        default:
            return undefined;
    }
}

// 色調の名前(Text2Frame.js の getPictureOptions)。
const TONE_PRESETS: Record<string, number[]> = {
    normal: [0, 0, 0, 0], 通常: [0, 0, 0, 0],
    dark: [-68, -68, -68, 0], ダーク: [-68, -68, -68, 0],
    sepia: [34, -34, -68, 170], セピア: [34, -34, -68, 170],
    sunset: [68, -34, -34, 0], 夕暮れ: [68, -34, -34, 0],
    night: [-68, -68, 0, 68], 夜: [-68, -68, 0, 68]
};
const TONE_KEYS = ['colortone', '色調', 'ct'];
// getPictureOptions の option_regexp と同じ。キー(角括弧の前)と、角括弧の並び。
const OPTION = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])/i;

// タグの引数(Text2Frame.js と同じく、行の最後の > まで)。
const TINT_TAGS = new RegExp('(<(?:tintscreen|画面の色調変更)\\s*:?\\s*)([^\\s]*.*)>|(<(?:tintpicture|ピクチャの色調変更|tp)\\s*:\\s*)([^\\s].*)>', 'i');
const FLASH_TAG = /(<(?:flashscreen|画面のフラッシュ)\s*:\s*)([^\s].*)>/i;
const WINDOW_TAG = /(<(?:changewindowcolor|ウィンドウカラーの変更)\s*:\s*)([^\s].*)>/i;

/** 引数をカンマで分け、前後の空白を落とした各部分とその位置。 */
function splitArgs(args: string, offset: number): Array<{ text: string; start: number; end: number }> {
    const out: Array<{ text: string; start: number; end: number }> = [];
    let pos = 0;
    for (const piece of args.split(',')) {
        const lead = piece.length - piece.trimStart().length;
        const text = piece.trim();
        out.push({ text, start: offset + pos + lead, end: offset + pos + lead + text.length });
        pos += piece.length + 1;
    }
    return out;
}

function toneOf(option: string): number[] | undefined {
    const m = option.match(OPTION);
    if (!m || !TONE_KEYS.includes(m[1].toLowerCase())) return undefined;
    const values = m[2].slice(1, -1).split('][');
    const preset = TONE_PRESETS[values[0].toLowerCase()];
    return preset ? preset.slice() : [0, 1, 2, 3].map((i) => Number(values[i]) || 0);
}

export function findColors(line: string): ColorRef[] {
    const out: ColorRef[] = [];

    // 色調変更(画面・ピクチャ)。ColorTone[…] を書いたときだけ(書かなければ変わらない)。
    // 同じ行に2つ書けば後のものが効くので、見本も後のものにする。
    const tint = line.match(TINT_TAGS);
    if (tint) {
        const head = tint[1] !== undefined ? tint[1] : tint[3];
        const args = tint[1] !== undefined ? tint[2] : tint[4];
        const pieces = splitArgs(args, (tint.index || 0) + head.length);
        const options = tint[1] !== undefined ? pieces : pieces.slice(1); // ピクチャは先頭が番号
        let found: ColorRef | undefined;
        for (const o of options) {
            const tone = toneOf(o.text);
            if (tone) found = { kind: 'tone', values: tone, swatch: toneSwatch(tone), start: o.start, end: o.end };
        }
        if (found) out.push(found);
    }

    const flash = line.match(FLASH_TAG);
    if (flash) {
        const pieces = splitArgs(flash[2], (flash.index || 0) + flash[1].length);
        const values = pieces.slice(0, 4).map((p) => parseInt(p.text, 10));
        if (pieces.length >= 4 && values.every((v) => !Number.isNaN(v))) {
            out.push({ kind: 'flash', values, swatch: flashSwatch(values), start: pieces[0].start, end: pieces[3].end });
        }
    }

    const windowColor = line.match(WINDOW_TAG);
    if (windowColor) {
        const pieces = splitArgs(windowColor[2], (windowColor.index || 0) + windowColor[1].length);
        const values = pieces.slice(0, 3).map((p) => parseInt(p.text, 10));
        if (pieces.length >= 3 && values.every((v) => !Number.isNaN(v))) {
            const tone = values.concat([0]);
            out.push({ kind: 'tone', values: tone, swatch: toneSwatch(tone), start: pieces[0].start, end: pieces[2].end });
        }
    }

    return out.sort((a, b) => a.start - b.start);
}
