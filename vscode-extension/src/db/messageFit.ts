import { readStructure, StructureNode } from './structure';

/**
 * メッセージがウィンドウに収まるかの見積もり。VS Code に依存しない。
 * 幅は「全角何文字ぶん」で数える(全角1・半角0.5。ツクールの既定のフォントは等幅)。
 * 入る幅は、ウィンドウの中の幅から顔の分を引き、文字の大きさで割ったもの。
 *   MZ: 幅は System.json の advanced.uiAreaWidth、余白は左右12、顔があれば 顔の幅+20、無ければ 4 を空ける
 *   MV: 幅は 816、余白は左右18、顔があれば 168 を空ける。文字の大きさは 28
 * 制御文字は見た目の幅に直す(\C[n] などは0、\N[n] はアクター名、\I[n] はアイコン1つぶん)。
 * 知らない制御文字(プラグインのもの)は0として、「目安」扱いにする。
 */

export interface MessageMetrics {
    /** ウィンドウの中の幅(px)。 */
    contentWidth: number;
    fontSize: number;
    /** 顔があるとき・無いときに、左に空ける幅(px)。 */
    faceMargin: number;
    plainMargin: number;
    iconWidth: number;
}

export function messageMetrics(system: { uiAreaWidth?: number; fontSize?: number; faceSize?: number; iconSize?: number }): MessageMetrics {
    const mz = system.uiAreaWidth !== undefined || system.fontSize !== undefined;
    return mz
        ? { contentWidth: (system.uiAreaWidth || 816) - 24, fontSize: system.fontSize || 26, faceMargin: (system.faceSize || 144) + 20, plainMargin: 4, iconWidth: (system.iconSize || 32) + 4 }
        : { contentWidth: 816 - 36, fontSize: 28, faceMargin: 168, plainMargin: 0, iconWidth: 36 };
}

/** 1行に入る幅(全角何文字ぶん)。lineLength を渡すと、顔の無いときの幅をそれにする。 */
export function capacity(m: MessageMetrics, face: boolean, lineLength?: number): number {
    const plain = lineLength && lineLength > 0 ? lineLength : (m.contentWidth - m.plainMargin) / m.fontSize;
    return face ? plain - (m.faceMargin - m.plainMargin) / m.fontSize : plain;
}

export interface WidthLookups {
    actorName?: (id: number) => string | undefined;
    currencyUnit?: string;
}

const HALF = /[ -~｡-ﾟ]/;
const charWidth = (ch: string): number => (HALF.test(ch) ? 0.5 : 1);
const textUnits = (text: string): number => Array.from(text).reduce((n, ch) => n + charWidth(ch), 0);

interface Piece {
    start: number;
    end: number;
    width: number;
}

/** 行を、見た目の幅を持つかたまりに分ける(制御文字は1かたまり)。 */
function pieces(line: string, m: MessageMetrics, lookups: WidthLookups): { list: Piece[]; approximate: boolean } {
    const list: Piece[] = [];
    let approximate = false;
    let i = 0;
    while (i < line.length) {
        if (line[i] === '\\') {
            const rest = line.slice(i);
            let e: RegExpMatchArray | null;
            let width = 0;
            let length = 1;
            if ((e = rest.match(/^\\([VNP])\[(\d+)\]/i))) {
                const kind = e[1].toUpperCase();
                width = kind === 'V' ? 1.5 : kind === 'N' ? textUnits((lookups.actorName && lookups.actorName(Number(e[2]))) || 'ＮＮＮＮ') : 4;
                if (kind !== 'N' || !(lookups.actorName && lookups.actorName(Number(e[2])))) approximate = true;
                length = e[0].length;
            } else if ((e = rest.match(/^\\I\[(\d+)\]/i))) {
                width = m.iconWidth / m.fontSize;
                length = e[0].length;
            } else if ((e = rest.match(/^\\G/i))) {
                width = textUnits(lookups.currencyUnit || 'G');
                length = 2;
            } else if ((e = rest.match(/^\\C\[\d+\]/i))) {
                length = e[0].length;
            } else if ((e = rest.match(/^\\[{}$.|!><^]/))) {
                if (e[0] === '\\{' || e[0] === '\\}') approximate = true;
                length = 2;
            } else if (rest.startsWith('\\\\')) {
                width = 0.5;
                length = 2;
            } else if ((e = rest.match(/^\\[A-Za-z]+(?:\[[^\]]*\])?/))) {
                approximate = true;
                length = e[0].length;
            } else {
                width = 0.5;
            }
            list.push({ start: i, end: i + length, width });
            i += length;
            continue;
        }
        const ch = String.fromCodePoint(line.codePointAt(i) as number);
        list.push({ start: i, end: i + ch.length, width: charWidth(ch) });
        i += ch.length;
    }
    return { list, approximate };
}

export function lineWidth(line: string, m: MessageMetrics, lookups: WidthLookups = {}): { width: number; approximate: boolean } {
    const { list, approximate } = pieces(line, m, lookups);
    return { width: list.reduce((n, p) => n + p.width, 0), approximate };
}

/** 幅が入る幅を超える最初の位置(制御文字の途中では切らない)。収まれば -1。 */
export function overflowAt(line: string, cap: number, m: MessageMetrics, lookups: WidthLookups = {}): number {
    let used = 0;
    for (const p of pieces(line, m, lookups).list) {
        used += p.width;
        if (used > cap + 1e-9) return p.start;
    }
    return -1;
}

export interface MessageProblem {
    line: number;
    kind: 'width';
    /** はみ出し始める位置。 */
    start: number;
    width?: number;
    capacity?: number;
    approximate?: boolean;
}

/** 有効な自動改行のプラグイン(js/plugins.js)があれば、その名前。 */
export function autoWrapPlugin(pluginsJs: string): string | undefined {
    const m = pluginsJs.match(/\$plugins\s*=\s*(\[[\s\S]*\])\s*;?/);
    if (!m) return undefined;
    let list: Array<{ name?: string; status?: boolean }>;
    try {
        list = JSON.parse(m[1]);
    } catch (e) {
        return undefined;
    }
    const hit = list.find((p) => p && p.status && typeof p.name === 'string' && /word\s*wrap|auto\s*line\s*break|auto\s*wrap/i.test(p.name));
    return hit ? hit.name : undefined;
}

export function messageProblems(
    lines: string[],
    m: MessageMetrics,
    options: { lookups?: WidthLookups; lineLength?: number; commentOutChar?: string } = {}
): MessageProblem[] {
    const out: MessageProblem[] = [];
    const visit = (nodes: StructureNode[]): void => {
        for (const n of nodes) {
            if (n.kind === 'message') {
                const cap = capacity(m, !!n.faceName, options.lineLength);
                for (let line = n.startLine; line <= n.endLine; line++) {
                    const text = lines[line].trim() === '<br>' ? '' : lines[line];
                    const at = overflowAt(text, cap, m, options.lookups);
                    if (at >= 0) {
                        const { width, approximate } = lineWidth(text, m, options.lookups);
                        out.push({ line, kind: 'width', start: at, width, capacity: cap, approximate });
                    }
                }
            }
            visit(n.children);
        }
    };
    visit(readStructure(lines, options.commentOutChar));
    return out.sort((a, b) => a.line - b.line);
}
