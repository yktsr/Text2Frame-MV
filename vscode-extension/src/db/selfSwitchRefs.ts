import { lineKinds } from './tagRefs';

/**
 * セルフスイッチの文字(A〜D)が行のどこに書かれているか。VS Code に依存しない。
 * 書き方は Text2Frame.js と揃える:
 *   <SelfSwitch: A, ON>(SSW・セルフスイッチも)
 *   <If: SelfSwitches[A], ON>(SSW・セルフスイッチも。条件分岐も)
 */

export interface SelfSwitchRef {
    line: number;
    letter: string;
    start: number;
    end: number;
}

const CONTROL = /<(?:ssw|selfswitch|セルフスイッチ) *: *([abcd]) *,/gi;
const CONDITION = /<(?:if|条件分岐)\s*:\s*(?:selfswitches|セルフスイッチ|ssw)\[([abcd])\]/gi;

export function findSelfSwitchRefs(text: string): Array<Omit<SelfSwitchRef, 'line'>> {
    const out: Array<Omit<SelfSwitchRef, 'line'>> = [];
    for (const re of [CONTROL, CONDITION]) {
        for (const m of text.matchAll(re)) {
            const start = (m.index ?? 0) + m[0].lastIndexOf(m[1]);
            out.push({ letter: m[1].toUpperCase(), start, end: start + 1 });
        }
    }
    return out.sort((a, b) => a.start - b.start);
}

/** タグとして読まれる行だけを見る(% の行やブロックの中は見ない)。 */
export function scanSelfSwitchLines(lines: string[], commentOutChar = '%'): SelfSwitchRef[] {
    const out: SelfSwitchRef[] = [];
    lineKinds(lines, commentOutChar).forEach((kind, line) => {
        if (kind !== 'tag') return;
        for (const r of findSelfSwitchRefs(lines[line])) out.push({ line, ...r });
    });
    return out;
}
