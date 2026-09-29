import { lineKinds } from './db/tagRefs';

/**
 * タグの < > の数が合わない行を探す。VS Code に依存しない。
 *
 * 見るのは < で始まる行(タグの行)だけ。文章の中の顔文字などは見ない。
 * 数えないもの:
 *   - % の行と、<script> <comment> <ShowScrollingText> のブロックの中(コンパイラもタグとして読まない)
 *   - 条件分岐の比較(<If: Variables[2], >=, 5> の >= など、引数そのものが記号のもの)
 *   - スクリプトの中身(Script[...]、<If: Script, ...>、<McScript: ...>)
 *   - 文章の制御文字 \< \>
 */

export type BracketProblem = 'unclosed' | 'extra';

const OPERATOR_ARG = /([:,]\s*)(?:>=|<=|==|!=|>|<)(?=\s*[,>])/g;
const SCRIPT_OPERAND = /((?:sc|script|スクリプト)\[)(.*)(\])/gi;
const SCRIPT_TAG = /^(\s*<\s*(?:(?:if|条件分岐)\s*:\s*(?:script|sc|スクリプト)\s*,|mcscript\s*:|移動コマンドスクリプト\s*:))(.*)(>\s*)$/i;
const CONTROL = /\\[<>]/g;

const blank = (s: string): string => s.replace(/[<>]/g, ' ');

/** 数えない < > を空白にした行。 */
export function countedBrackets(text: string): string {
    let t = text.replace(CONTROL, '  ');
    const script = t.match(SCRIPT_TAG);
    if (script) t = script[1] + blank(script[2]) + script[3];
    t = t.replace(SCRIPT_OPERAND, (_m, open: string, body: string, close: string) => open + blank(body) + close);
    return t.replace(OPERATOR_ARG, (m, head: string) => head + ' '.repeat(m.length - head.length));
}

/** 行ごとの問題。問題の無い行は含めない。 */
export function bracketProblems(lines: string[], commentOutChar = '%'): Array<{ line: number; problem: BracketProblem }> {
    const out: Array<{ line: number; problem: BracketProblem }> = [];
    lineKinds(lines, commentOutChar).forEach((kind, line) => {
        if (kind !== 'tag' || !/^\s*</.test(lines[line])) return;
        const t = countedBrackets(lines[line]);
        const open = (t.match(/</g) || []).length;
        const close = (t.match(/>/g) || []).length;
        if (open > close) out.push({ line, problem: 'unclosed' });
        else if (close > open) out.push({ line, problem: 'extra' });
    });
    return out;
}
