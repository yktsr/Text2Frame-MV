import { TAG_HELP_SECTIONS } from '../tagHelpData';

/**
 * クイックフィックス(電球)とスニペットのうち、VS Code に依存しない部分。
 */

/* ---------- 競合の目印 ---------- */

/** Text2Frame.js の CONFLICT_MARKERS と同じ文字列。 */
export const CONFLICT_MARKERS = [
    '=== テキストの変更 / from text ===',
    '=== ゲームの変更 / from game ===',
    '=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ==='
];

/** 目印1つぶんの行の範囲(<comment> で囲まれていれば、その3行)。両端を含む。 */
export interface MarkerUnit {
    start: number;
    end: number;
}

export interface Conflict {
    units: [MarkerUnit, MarkerUnit, MarkerUnit];
}

function markerUnit(lines: string[], line: number): MarkerUnit {
    const opens = /^\s*<(?:comment|co|注釈)>\s*$/i;
    const closes = /^\s*<\/(?:comment|co|注釈)>\s*$/i;
    if (line > 0 && line + 1 < lines.length && opens.test(lines[line - 1]) && closes.test(lines[line + 1])) {
        return { start: line - 1, end: line + 1 };
    }
    return { start: line, end: line };
}

/** 目印が3つそろった競合を、上から順に。 */
export function findConflicts(lines: string[]): Conflict[] {
    const out: Conflict[] = [];
    let found: MarkerUnit[] = [];
    lines.forEach((text, line) => {
        const which = CONFLICT_MARKERS.findIndex((m) => text.includes(m));
        if (which < 0) return;
        if (which === 0) found = [markerUnit(lines, line)];
        else if (which === found.length) found.push(markerUnit(lines, line));
        else found = [];
        if (found.length === 3) {
            out.push({ units: found as [MarkerUnit, MarkerUnit, MarkerUnit] });
            found = [];
        }
    });
    return out;
}

/** 競合を解いたあとの行(start から end まで(両端を含む)を置き換える)。 */
export function resolveConflict(lines: string[], conflict: Conflict, keep: 'text' | 'game' | 'both'): { start: number; end: number; lines: string[] } {
    const [a, b, c] = conflict.units;
    const text = lines.slice(a.end + 1, b.start);
    const game = lines.slice(b.end + 1, c.start);
    const kept = keep === 'text' ? text : keep === 'game' ? game : text.concat(game);
    return { start: a.start, end: c.end, lines: kept };
}

/* ---------- 知らないタグ ---------- */

/** 1行が、タグ1つだけに見えるか。見えればタグの名前。 */
export function tagLikeName(line: string): string | undefined {
    const m = line.match(/^\s*<([^\s:<>/][^\s:<>]*)\s*(?::[^<>]*)?>\s*$/);
    return m ? m[1] : undefined;
}

let knownNames: string[] | undefined;

/** ヘルプに出てくるタグの名前と別名。 */
export function knownTagNames(): string[] {
    if (!knownNames) {
        const names = new Set<string>();
        for (const section of TAG_HELP_SECTIONS) {
            for (const m of section.body.matchAll(/<([A-Za-z][A-Za-z0-9]*|[぀-ヿ一-鿿ー]+[A-Za-z0-9]*)(?=[\s:>])/g)) names.add(m[1]);
        }
        knownNames = Array.from(names);
    }
    return knownNames;
}

function distance(a: string, b: string): number {
    const d: number[][] = [];
    for (let i = 0; i <= a.length; i++) d.push([i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
    }
    return d[a.length][b.length];
}

/** 打ち間違いに近いタグの名前(近い順)。 */
export function similarTagNames(name: string, names: string[] = knownTagNames(), limit = 3): string[] {
    const lower = name.toLowerCase();
    const allowed = Math.max(1, Math.floor(name.length / 3));
    return names
        .map((n) => ({ n, d: distance(lower, n.toLowerCase()) }))
        .filter((x) => x.d > 0 && x.d <= allowed)
        .sort((x, y) => x.d - y.d || x.n.length - y.n.length)
        .map((x) => x.n)
        .filter((n, i, all) => all.findIndex((o) => o.toLowerCase() === n.toLowerCase()) === i)
        .slice(0, limit);
}

/** 行のタグの名前を置き換える。 */
export function replaceTagName(line: string, name: string): string {
    return line.replace(/^(\s*<)([^\s:<>]+)/, (_m, head: string) => head + name);
}

/* ---------- スニペット ---------- */

/** 選んだテキストを、スニペットの本文(行の配列)にする。$ と \ と } をスニペット用に逃がす。 */
export function snippetBody(text: string): string[] {
    return text.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/[\\$}]/g, (c) => '\\' + c));
}

/** スニペットを呼び出す言葉(空白と先頭の / を除く)。候補は行の頭で / に続けて打つと出る。 */
export function snippetWord(word: string): string {
    return word.trim().replace(/^\/+/, '').replace(/\s+/g, '');
}

export interface SnippetDef {
    name: string;
    words: string[];
    body: string[];
    description: string;
    /** 利用者が作ったもの。 */
    user: boolean;
}

/** スニペットのファイル({ 名前: { prefix, body, description } })を読む。形の合わないものは飛ばす。 */
export function readSnippetFile(json: unknown, user: boolean): SnippetDef[] {
    if (!json || typeof json !== 'object' || Array.isArray(json)) return [];
    const out: SnippetDef[] = [];
    for (const [name, value] of Object.entries(json as Record<string, unknown>)) {
        const v = value as { prefix?: unknown; body?: unknown; description?: unknown };
        if (!v || typeof v !== 'object') continue;
        const body = Array.isArray(v.body) ? v.body.map(String) : typeof v.body === 'string' ? [v.body] : undefined;
        if (!body) continue;
        const prefixes = Array.isArray(v.prefix) ? v.prefix.map(String) : typeof v.prefix === 'string' ? [v.prefix] : [name];
        const words = prefixes.map(snippetWord).filter(Boolean);
        out.push({ name, words: words.length ? words : [snippetWord(name)], body, description: typeof v.description === 'string' ? v.description : '', user });
    }
    return out;
}

/** 行の頭から / と言葉だけが打たれているか。打たれていれば、/ の位置と言葉。 */
export function slashAt(textBeforeCursor: string): { start: number; word: string } | undefined {
    const m = textBeforeCursor.match(/^(\s*)\/([^\s/]*)$/);
    return m ? { start: m[1].length, word: m[2] } : undefined;
}

/** その行だけをコンパイルすると、文章(401)としてしか読まれないか(タグとして読まれず、ゲームに文字で出る)。 */
export function compilesAsText(compile: (text: string) => unknown, line: string): boolean {
    const key = line.trim();
    try {
        const commands = compile(key) as Array<{ code: number; parameters: unknown[] }>;
        return Array.isArray(commands) &&
            commands.some((c) => c.code === 401 && c.parameters[0] === key) &&
            commands.every((c) => c.code === 101 || (c.code === 401 && c.parameters[0] === key));
    } catch (e) {
        return false;
    }
}
