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
    /** セルフスイッチを書き換える所(<SelfSwitch: A, ON>)。条件分岐は読むだけ。 */
    write?: boolean;
}

const CONTROL = /<(?:ssw|selfswitch|セルフスイッチ) *: *([abcd]) *,/gi;
const CONDITION = /<(?:if|条件分岐)\s*:\s*(?:selfswitches|セルフスイッチ|ssw)\[([abcd])\]/gi;

export function findSelfSwitchRefs(text: string): Array<Omit<SelfSwitchRef, 'line'>> {
    const out: Array<Omit<SelfSwitchRef, 'line'>> = [];
    for (const re of [CONTROL, CONDITION]) {
        for (const m of text.matchAll(re)) {
            const start = (m.index ?? 0) + m[0].lastIndexOf(m[1]);
            out.push({ letter: m[1].toUpperCase(), start, end: start + 1, ...(re === CONTROL ? { write: true } : {}) });
        }
    }
    return out.sort((a, b) => a.start - b.start);
}

export function eventSelfSwitchLetters(event: unknown): string[] {
    const letters = new Set<string>();
    const pages = event && typeof event === 'object' && Array.isArray((event as { pages?: unknown }).pages) ? (event as { pages: any[] }).pages : [];
    for (const page of pages) {
        const c = page && page.conditions;
        if (c && c.selfSwitchValid && typeof c.selfSwitchCh === 'string') letters.add(c.selfSwitchCh);
        for (const cmd of (page && Array.isArray(page.list) ? page.list : [])) {
            const p = cmd && Array.isArray(cmd.parameters) ? cmd.parameters : [];
            if (cmd && cmd.code === 123 && typeof p[0] === 'string') letters.add(p[0]);
            if (cmd && cmd.code === 111 && p[0] === 2 && typeof p[1] === 'string') letters.add(p[1]);
        }
    }
    return Array.from(letters).sort();
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
