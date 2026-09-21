import { scanLines } from './tagRefs';
import { DbKind } from './database';
import { PageSummary } from './eventPages';

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

/** 出現条件で使っているページ。データ(Map###.json)から拾う(テキストには出ないため)。 */
export interface ConditionHit {
    mapId: number;
    eventId: number;
    /** 1 から。 */
    pageId: number;
    /** 「ON で出る」「3 以上で出る」など。 */
    note: string;
}

/** 出現条件を見るイベント。 */
export interface ConditionEvent {
    mapId: number;
    eventId: number;
    pages: PageSummary[];
}

/**
 * その番号が出現条件になっているページ。スイッチ・変数・アイテム・アクターだけ。
 * 言い回しは呼び出し階層(eventLinks の conditionLinks)と合わせる。
 */
export function conditionHits(events: ConditionEvent[], kind: DbKind, id: number): ConditionHit[] {
    if (!['switch', 'variable', 'item', 'actor'].includes(kind) || !Number.isInteger(id) || id <= 0) return [];
    const out: ConditionHit[] = [];
    for (const event of events) {
        event.pages.forEach((page, index) => {
            const add = (note: string): void => { out.push({ mapId: event.mapId, eventId: event.eventId, pageId: index + 1, note }); };
            if (kind === 'switch' && (page.switch1 === id || page.switch2 === id)) add('ON で出る');
            else if (kind === 'variable' && page.variable && page.variable[0] === id) add(`${page.variable[1]} 以上で出る`);
            else if (kind === 'item' && page.item === id) add('持っていると出る');
            else if (kind === 'actor' && page.actor === id) add('仲間にいると出る');
        });
    }
    return out;
}
