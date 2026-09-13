import { RpgCommand } from './commandRefs';

export type CommandMark = [number, number, number];

export interface RunTarget {
    index: number;
    exact: boolean;
}

const TEXT_CONTINUATIONS = new Set([401, 405, 408, 505, 605, 655, 657]);
const MAX_TABLE = 4_000_000;

export function stableJson(v: unknown): string {
    if (v === undefined || v === null || typeof v === 'function') return 'null';
    if (Array.isArray(v)) return '[' + v.map(stableJson).join(',') + ']';
    if (typeof v === 'object') {
        const o = v as Record<string, unknown>;
        const names = Object.keys(o).filter((k) => o[k] !== undefined && typeof o[k] !== 'function').sort();
        return '{' + names.map((k) => JSON.stringify(k) + ':' + stableJson(o[k])).join(',') + '}';
    }
    return JSON.stringify(v);
}

export function hashText(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
}

export function commandMark(c: RpgCommand): CommandMark {
    const code = Number(c && c.code) || 0;
    const indent = Number(c && c.indent) || 0;
    return [code, indent, hashText(stableJson([code, indent, (c && c.parameters) || []]))];
}

function lcs<T>(a: T[], b: T[], same: (x: T, y: T) => boolean): Array<[number, number]> {
    const n = a.length;
    const m = b.length;
    if (!n || !m || n * m > MAX_TABLE) return [];
    const table = new Uint32Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            table[i * (m + 1) + j] = same(a[i], b[j])
                ? table[(i + 1) * (m + 1) + j + 1] + 1
                : Math.max(table[(i + 1) * (m + 1) + j], table[i * (m + 1) + j + 1]);
        }
    }
    const pairs: Array<[number, number]> = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (same(a[i], b[j])) {
            pairs.push([i, j]);
            i++;
            j++;
        } else if (table[(i + 1) * (m + 1) + j] >= table[i * (m + 1) + j + 1]) {
            i++;
        } else {
            j++;
        }
    }
    return pairs;
}

const sameCommand = (x: CommandMark, y: CommandMark): boolean => x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
const sameKind = (x: CommandMark, y: CommandMark): boolean => x[0] === y[0] && x[1] === y[1];

export function alignCommands(game: CommandMark[], text: CommandMark[]): Array<number | undefined> {
    const g = game.length && game[game.length - 1][0] === 0 && game[game.length - 1][1] === 0 ? game.slice(0, -1) : game;
    const out: Array<number | undefined> = new Array(game.length).fill(undefined);
    let head = 0;
    while (head < g.length && head < text.length && sameCommand(g[head], text[head])) {
        out[head] = head;
        head++;
    }
    let tail = 0;
    while (tail < g.length - head && tail < text.length - head && sameCommand(g[g.length - 1 - tail], text[text.length - 1 - tail])) {
        out[g.length - 1 - tail] = text.length - 1 - tail;
        tail++;
    }
    const gMid = g.slice(head, g.length - tail);
    const tMid = text.slice(head, text.length - tail);
    const anchors = lcs(gMid, tMid, sameCommand).map(([i, j]) => [i + head, j + head] as [number, number]);
    const bounds: Array<[number, number]> = [[head - 1, head - 1], ...anchors, [g.length - tail, text.length - tail]];
    for (const [i, j] of anchors) out[i] = j;
    for (let k = 0; k + 1 < bounds.length; k++) {
        const [gi, ti] = bounds[k];
        const [gj, tj] = bounds[k + 1];
        const gGap = g.slice(gi + 1, gj);
        const tGap = text.slice(ti + 1, tj);
        for (const [i, j] of lcs(gGap, tGap, sameKind)) out[gi + 1 + i] = ti + 1 + j;
    }
    return out;
}

export function locateCommand(alignment: Array<number | undefined>, gameIndex: number): RunTarget | undefined {
    if (!alignment.length) return undefined;
    const at = Math.max(0, Math.min(alignment.length - 1, gameIndex));
    const hit = alignment[at];
    if (hit !== undefined) return { index: hit, exact: true };
    for (let i = at - 1; i >= 0; i--) {
        const before = alignment[i];
        if (before !== undefined) return { index: before, exact: false };
    }
    for (let i = at + 1; i < alignment.length; i++) {
        const after = alignment[i];
        if (after !== undefined) return { index: after, exact: false };
    }
    return undefined;
}

export function commandLines(commands: RpgCommand[], lineMap: number[], index: number): { from: number; to: number } | undefined {
    if (index < 0 || index >= commands.length || lineMap[index] === undefined) return undefined;
    let head = index;
    while (head > 0 && TEXT_CONTINUATIONS.has(commands[head].code)) head--;
    const from = lineMap[head];
    const to = lineMap[index];
    return from === undefined ? { from: to, to } : { from: Math.min(from, to), to: Math.max(from, to) };
}
