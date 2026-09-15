import { lineKinds } from './tagRefs';

/**
 * テキストの組み立て(選択肢・条件分岐・ループ・注釈・ラベル・メッセージのまとまり)を読む。VS Code に依存しない。
 * アウトライン・折りたたみ・ラベルへの移動が使う。タグの名前と別名は Text2Frame.js の正規表現と揃える。
 * 閉じ忘れたブロックは、テキストの最後で閉じたものとして扱う。
 */

export type NodeKind =
    | 'if' | 'else' | 'choices' | 'when' | 'battle' | 'battleBranch' | 'loop' | 'skip'
    | 'comment' | 'script' | 'scrolling' | 'label' | 'message';

export interface StructureNode {
    kind: NodeKind;
    /** 見出し(選択肢の文言・条件・メッセージの1行目など)。 */
    label: string;
    /** 0 始まり。両端を含む。 */
    startLine: number;
    endLine: number;
    children: StructureNode[];
    /** メッセージだけ。話し手の手がかり。 */
    name?: string;
    faceName?: string;
    faceIndex?: number;
}

const IF = /<(?:if|条件分岐)\s*:\s*(.*)>/i;
const ELSE = /<(?:else|それ以外のとき)>/i;
const END = /<(?:end|分岐終了)>/i;
const LOOP = /<(?:loop|ループ)>/i;
const REPEAT = /<(?:repeatabove|以上繰り返し|ra)>/i;
const SKIP = /<(?:skip|スキップ)>/i;
const SKIP_END = /<(?:skipend|スキップ終了)>/i;
const CHOICES = /<(?:showchoices|shc|選択肢の表示)(?:\s*:*\s*([^>]*))?>/i;
const WHEN = /<(?:when|選択肢)\s*:\s*(.+)>/i;
const WHEN_CANCEL = /<(?:whencancel|キャンセルのとき)>/i;
const BATTLE = /<(?:battleprocessing|戦闘の処理)\s*:\s*(.*)>/i;
const BATTLE_BRANCHES: Array<[RegExp, string]> = [
    [/<(?:ifwin|勝ったとき)>/i, '勝ったとき'],
    [/<(?:ifescape|逃げたとき)>/i, '逃げたとき'],
    [/<(?:iflose|負けたとき)>/i, '負けたとき']
];
export const LABEL = /<(?:label|ラベル)\s*:\s*(\S+)\s*>/i;
export const JUMP_TO_LABEL = /<(?:jumptolabel|ラベルジャンプ|jtl)\s*:\s*(\S+)\s*>/i;
const COMMENT_OPEN = /<(?:comment|co|注釈)>/i;
const SCRIPT_OPEN = /<(?:script|sc|スクリプト)>/i;
const SCROLLING_OPEN = /<(?:showscrollingtext|sst|文章のスクロール表示)(?=[\s:,>])[^>]*>/i;
const FACE = /<(?:face|fc|顔)\s*:\s*([^()<>]*?)\((\d+)\)\s*>/i;
const NAME = /<(?:name|nm|名前)\s*:\s*([^<>]*)>/i;
const MESSAGE_SETTING = /^\s*(?:<(?:face|fc|顔|name|nm|名前|windowposition|wp|位置|background|bg|背景)\s*:[^>]*>\s*)+$/i;

const MAX_LABEL = 40;
const shorten = (text: string): string => {
    const t = text.trim().replace(/\s+/g, ' ');
    return t.length > MAX_LABEL ? t.slice(0, MAX_LABEL - 1) + '…' : t;
};

/** 本文の最初の行(フロントマターの閉じ --- の次)。 */
function firstBodyLine(lines: string[]): number {
    if (lines[0] !== '---') return 0;
    const end = lines.indexOf('---', 1);
    return end < 0 ? 0 : end + 1;
}

export function readStructure(lines: string[], commentOutChar = '%'): StructureNode[] {
    const kinds = lineKinds(lines, commentOutChar);
    const roots: StructureNode[] = [];
    const stack: StructureNode[] = [];
    const last = lines.length - 1;
    let pendingFace: { name: string; index: number } | undefined;
    let pendingName: string | undefined;
    let message: StructureNode | undefined;

    const add = (node: StructureNode): StructureNode => {
        (stack.length ? stack[stack.length - 1].children : roots).push(node);
        return node;
    };
    const node = (kind: NodeKind, label: string, line: number): StructureNode => ({ kind, label, startLine: line, endLine: line, children: [] });
    const closeBranch = (line: number): void => {
        const top = stack[stack.length - 1];
        if (top && (top.kind === 'else' || top.kind === 'when' || top.kind === 'battleBranch')) {
            top.endLine = Math.max(top.startLine, line - 1);
            stack.pop();
        }
    };
    const closeBlock = (kinds: NodeKind[], line: number): void => {
        closeBranch(line);
        const top = stack[stack.length - 1];
        if (top && kinds.includes(top.kind)) {
            top.endLine = line;
            stack.pop();
        }
    };
    const endMessage = (): void => {
        message = undefined;
        pendingFace = undefined;
        pendingName = undefined;
    };

    for (let i = firstBodyLine(lines); i < lines.length; i++) {
        const text = lines[i];
        const kind = kinds[i];
        if (kind !== 'tag') {
            endMessage();
            let block: RegExpMatchArray | null;
            if ((block = text.match(COMMENT_OPEN)) || (block = text.match(SCRIPT_OPEN)) || (block = text.match(SCROLLING_OPEN))) {
                const blockKind: NodeKind = COMMENT_OPEN.test(block[0]) ? 'comment' : SCRIPT_OPEN.test(block[0]) ? 'script' : 'scrolling';
                let end = i;
                if (!/<\//.test(text.slice((block.index || 0) + block[0].length))) {
                    while (end < last && kinds[end + 1] !== 'tag') {
                        end++;
                        if (/<\//.test(lines[end])) break;
                    }
                }
                const first = blockKind === 'comment' ? lines.slice(i + 1, end).find((l) => l.trim() && !/<\//.test(l)) : undefined;
                const title = blockKind === 'comment' ? (first ? '注釈: ' + shorten(first.replace(/^\s*\*?\s*/, '')) : '注釈')
                    : blockKind === 'script' ? 'スクリプト' : 'スクロール文章';
                const n = add(node(blockKind, title, i));
                n.endLine = end;
                i = end;
            }
            continue;
        }
        const trimmed = text.trim();
        if (!trimmed) {
            endMessage();
            continue;
        }
        let m: RegExpMatchArray | null;
        if ((m = text.match(CHOICES))) {
            endMessage();
            stack.push(add(node('choices', '選択肢' + (m[1] && m[1].trim() ? `: ${shorten(m[1])}` : ''), i)));
        } else if ((m = text.match(WHEN))) {
            endMessage();
            closeBranch(i);
            stack.push(add(node('when', shorten(m[1]), i)));
        } else if (WHEN_CANCEL.test(text)) {
            endMessage();
            closeBranch(i);
            stack.push(add(node('when', 'キャンセルのとき', i)));
        } else if ((m = text.match(IF))) {
            endMessage();
            stack.push(add(node('if', '条件分岐: ' + shorten(m[1]), i)));
        } else if (ELSE.test(text)) {
            endMessage();
            closeBranch(i);
            stack.push(add(node('else', 'それ以外のとき', i)));
        } else if ((m = text.match(BATTLE))) {
            endMessage();
            stack.push(add(node('battle', '戦闘の処理: ' + shorten(m[1]), i)));
        } else if (BATTLE_BRANCHES.some(([re]) => re.test(text))) {
            endMessage();
            closeBranch(i);
            const branch = BATTLE_BRANCHES.find(([re]) => re.test(text)) as [RegExp, string];
            stack.push(add(node('battleBranch', branch[1], i)));
        } else if (END.test(text)) {
            endMessage();
            closeBlock(['if', 'choices', 'battle'], i);
        } else if (LOOP.test(text)) {
            endMessage();
            stack.push(add(node('loop', 'ループ', i)));
        } else if (REPEAT.test(text)) {
            endMessage();
            closeBlock(['loop'], i);
        } else if (SKIP_END.test(text)) {
            endMessage();
            closeBlock(['skip'], i);
        } else if (SKIP.test(text)) {
            endMessage();
            stack.push(add(node('skip', 'スキップ', i)));
        } else if ((m = text.match(LABEL))) {
            endMessage();
            add(node('label', 'ラベル: ' + m[1], i));
        } else if (MESSAGE_SETTING.test(text)) {
            if (message) endMessage();
            const face = text.match(FACE);
            const name = text.match(NAME);
            if (face) pendingFace = { name: face[1].trim(), index: Number(face[2]) };
            if (name) pendingName = name[1].trim();
        } else if (/^\s*</.test(text) && trimmed !== '<br>') {
            endMessage();
        } else if (message) {
            message.endLine = i;
        } else {
            message = add(node('message', shorten(trimmed === '<br>' ? '' : trimmed) || '(空行)', i));
            if (pendingName) message.name = pendingName;
            if (pendingFace) {
                message.faceName = pendingFace.name;
                message.faceIndex = pendingFace.index;
            }
        }
    }
    while (stack.length) {
        const open = stack.pop() as StructureNode;
        open.endLine = last;
    }
    return roots;
}

/** 折りたためる範囲(2行以上のブロック)。 */
export function foldingRanges(nodes: StructureNode[]): Array<{ start: number; end: number; comment: boolean }> {
    const out: Array<{ start: number; end: number; comment: boolean }> = [];
    const walk = (list: StructureNode[]): void => {
        for (const n of list) {
            if (n.kind !== 'label' && n.endLine > n.startLine) out.push({ start: n.startLine, end: n.endLine, comment: n.kind === 'comment' });
            walk(n.children);
        }
    };
    walk(nodes);
    return out;
}

/** 同じテキストの <Label: name> の行。無ければ -1。 */
export function labelLine(lines: string[], name: string, commentOutChar = '%'): number {
    const kinds = lineKinds(lines, commentOutChar);
    for (let i = 0; i < lines.length; i++) {
        if (kinds[i] !== 'tag') continue;
        const m = lines[i].match(LABEL);
        if (m && m[1] === name) return i;
    }
    return -1;
}

/** その行を含むメッセージの前に書かれた、顔・名前・位置・背景の行。 */
export function messageSettingsFor(lines: string[], line: number, commentOutChar = '%'): string[] {
    let found: StructureNode | undefined;
    const walk = (nodes: StructureNode[]): void => {
        for (const n of nodes) {
            if (n.kind === 'message' && n.startLine <= line && line <= n.endLine) found = n;
            walk(n.children);
        }
    };
    walk(readStructure(lines, commentOutChar));
    const out: string[] = [];
    if (!found) return out;
    for (let i = found.startLine - 1; i >= 0 && MESSAGE_SETTING.test(lines[i]); i--) out.unshift(lines[i]);
    return out;
}
