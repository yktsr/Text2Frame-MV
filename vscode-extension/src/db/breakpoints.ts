import { RpgCommand } from './commandRefs';
import { TEXT_CONTINUATIONS } from './runLines';

/**
 * ブレークポイントの行を、ゲームのコマンドの番号に直す。VS Code に依存しない。
 *   lineMap: テキストのコマンドごとの行(compileWithLines)
 *   alignment: ゲームのコマンドの番号 → テキストのコマンドの番号(alignCommands)
 * コマンドの無い行は、次にコマンドのある行へずらす。文章の2行目以降のような続きの行は、
 * ゲームでは頭のコマンドがまとめて動かすので、頭のコマンドにずらす。
 */

export type BreakpointTarget = { game: number; line: number } | { problem: 'noCommand' | 'mismatch' };

export function breakpointAt(commands: RpgCommand[], lineMap: number[], alignment: Array<number | undefined>, line: number): BreakpointTarget {
    let best = -1;
    lineMap.forEach((l, k) => {
        if (l === undefined || l < line) return;
        if (best < 0 || l < lineMap[best]) best = k;
    });
    if (best < 0) return { problem: 'noCommand' };
    while (best > 0 && commands[best] && TEXT_CONTINUATIONS.has(commands[best].code)) best--;
    const game = alignment.findIndex((t) => t === best);
    if (game < 0) return { problem: 'mismatch' };
    return { game, line: lineMap[best] };
}

/** 式(S12・V5・スイッチ12・変数5・\V[5])を、スイッチか変数の番号に読む。 */
export function readWatch(expression: string): { kind: 'switch' | 'variable'; id: number } | undefined {
    const t = expression.trim();
    let m = t.match(/^(?:s|sw|switch|switches|スイッチ)\s*\[?\s*(\d+)\s*\]?$/i);
    if (m) return { kind: 'switch', id: Number(m[1]) };
    m = t.match(/^(?:v|var|variable|variables|変数|\\v)\s*\[?\s*(\d+)\s*\]?$/i);
    if (m) return { kind: 'variable', id: Number(m[1]) };
    return undefined;
}
