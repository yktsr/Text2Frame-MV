import { bracketProblems } from '../tagBrackets';

/**
 * 1つのテキストの中だけで分かる指摘。VS Code に依存しない。
 * エディタの指摘(extension.ts)と、プロジェクト全体の検査(projectCheck.ts)が同じものを使う。
 */

export interface LineProblem {
    line: number;
    start: number;
    end: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code: string;
}

/** タグの閉じ忘れ・閉じ括弧の多すぎ・空のタグ。 */
export function basicProblems(lines: string[]): LineProblem[] {
    const out: LineProblem[] = [];
    for (const { line, problem } of bracketProblems(lines)) {
        out.push({
            line,
            start: 0,
            end: lines[line].length,
            message: problem === 'unclosed' ? 'タグが閉じられていません' : '閉じ括弧が多すぎます',
            severity: 'error',
            code: problem === 'unclosed' ? 'unclosed' : 'extra-bracket'
        });
    }
    lines.forEach((text, line) => {
        const m = text.match(/<\s*>/);
        if (m && m.index !== undefined) {
            out.push({ line, start: m.index, end: m.index + m[0].length, message: '空のタグは使用できません', severity: 'warning', code: 'empty-tag' });
        }
    });
    return out;
}

export type AudioFolderName = 'bgm' | 'bgs' | 'me' | 'se';

export interface AudioRef {
    folder: AudioFolderName;
    name: string;
    start: number;
    end: number;
}

const PLAY_TAGS: Array<[RegExp, AudioFolderName]> = [
    [/(<(?:playbgm|BGMの演奏)\s*:\s*)([^,<>]+)/i, 'bgm'],
    [/(<(?:playbgs|BGSの演奏)\s*:\s*)([^,<>]+)/i, 'bgs'],
    [/(<(?:playme|MEの演奏)\s*:\s*)([^,<>]+)/i, 'me'],
    [/(<(?:playse|SEの演奏)\s*:\s*)([^,<>]+)/i, 'se']
];

/** BGM・BGS・ME・SE を鳴らすタグの、音声の名前。「なし」は拾わない。 */
export function audioRefs(line: string): AudioRef[] {
    const out: AudioRef[] = [];
    for (const [re, folder] of PLAY_TAGS) {
        const m = line.match(re);
        if (!m || m.index === undefined) continue;
        const name = m[2].trim();
        if (!name || /^(?:none|なし)$/i.test(name)) continue;
        const start = m.index + m[1].length + (m[2].length - m[2].trimStart().length);
        out.push({ folder, name, start, end: start + name.length });
    }
    return out;
}

/** 音声のファイル名から、拡張子(暗号化済みも)を除いた名前。 */
export function audioBaseName(file: string): string | undefined {
    const m = file.match(/^(.*)\.(?:ogg|m4a|ogg_|m4a_|rpgmvo|rpgmvm)$/i);
    return m ? m[1] : undefined;
}
