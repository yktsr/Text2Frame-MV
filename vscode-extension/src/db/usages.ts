import { scanLines } from './tagRefs';
import { DbKind } from './database';

/**
 * データベースの番号を使っている箇所を、grep のように前後の行つきでまとめる。VS Code に依存しない。
 * 「79」という文字ではなく、その種類の番号として使っている所だけを拾う(1-10 の範囲も含める)。
 */

export interface UsageHit {
    /** 0 始まりの行番号。 */
    line: number;
    /** 行の中で番号が書かれている範囲。 */
    start: number;
    end: number;
}

/** 前後の行を含めた、ひと続きの行の範囲(両端を含む)。近い使用箇所は1つにまとめる。 */
export interface UsageBlock {
    from: number;
    to: number;
    hits: UsageHit[];
}

export function usageHits(lines: string[], kind: DbKind, id: number, commentOutChar = '%'): UsageHit[] {
    return scanLines(lines, commentOutChar)
        .filter((r) => r.kind === kind && r.id <= id && id <= (r.endId ?? r.id))
        .map((r) => ({ line: r.line, start: r.start, end: r.end }));
}

/** 使用箇所の前後 context 行を付けて、重なる・隣り合うものをつなげる。first より前の行(フロントマター)は出さない。 */
export function usageBlocks(lineCount: number, hits: UsageHit[], context: number, first = 0): UsageBlock[] {
    const blocks: UsageBlock[] = [];
    const sorted = hits.slice().sort((a, b) => a.line - b.line || a.start - b.start);
    for (const hit of sorted) {
        const from = Math.min(hit.line, Math.max(first, hit.line - context));
        const to = Math.min(lineCount - 1, hit.line + context);
        const last = blocks[blocks.length - 1];
        if (last && from <= last.to + 1) {
            last.to = Math.max(last.to, to);
            last.hits.push(hit);
        } else {
            blocks.push({ from, to, hits: [hit] });
        }
    }
    return blocks;
}

/** 本文の最初の行(フロントマターの閉じ --- の次)。フロントマターが無ければ 0。 */
export function bodyStart(lines: string[]): number {
    if (lines[0] !== '---') return 0;
    const end = lines.indexOf('---', 1);
    return end < 0 ? 0 : end + 1;
}
