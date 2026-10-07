import { frontMatterBody } from './compiler';
import { T2FModule } from './deploy';
import { RpgCommand } from './db/commandRefs';
import { tr } from './db/lang';

/**
 * テキストをコンパイルし、出てきたコマンドと、それぞれが出てきた文書の行番号(0始まり)を返す。
 * コンパイラには本文だけを渡すので、フロントマターの行数だけずらす。
 * lineMap を知らない古いコンパイラでは lines が無い。コンパイルできなければ例外を投げる。
 */
export function compileWithLines(mod: T2FModule, text: string): { commands: RpgCommand[]; lines?: number[] } {
    if (typeof mod.compile !== 'function') throw new Error(tr('コンパイラ (Text2Frame.js) が見つかりません。', 'The compiler (Text2Frame.js) was not found.'));
    const out = mod.compile(frontMatterBody(text), { lineMap: true });
    if (Array.isArray(out)) return { commands: out as RpgCommand[] };
    const r = out as { commands: RpgCommand[]; lineMap: number[] };
    const offset = bodyLineOffset(text);
    return { commands: r.commands, lines: r.lineMap.map((l) => l + offset) };
}

/** front matter(--- から ---)の行数。 */
export function bodyLineOffset(text: string): number {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const body = frontMatterBody(text);
    if (body === text || !normalized.endsWith(body)) return 0;
    return normalized.slice(0, normalized.length - body.length).split('\n').length - 1;
}
