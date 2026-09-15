import { AudioFolderName } from './checks';

/**
 * 素材を選ぶ画面で選んだ顔画像・音声を、テキストの行に入れる。VS Code に依存しない。
 * 行にもうそのタグがあれば中身を置き換え、無ければ、その行の上に新しいタグの行を足す。
 */

export type AssetEdit = { kind: 'replace'; text: string } | { kind: 'insert'; text: string };

const FACE_TAG = /(<(?:face|fc|顔)\s*:\s*)([^<>]*?)(\s*>)/i;

export function faceEdit(line: string, name: string, index: number): AssetEdit {
    const value = `${name}(${index})`;
    const m = line.match(FACE_TAG);
    if (m && m.index !== undefined) {
        return { kind: 'replace', text: line.slice(0, m.index) + m[1] + value + m[3] + line.slice(m.index + m[0].length) };
    }
    return { kind: 'insert', text: `<Face: ${value}>` };
}

const PLAY_TAGS: Record<AudioFolderName, { re: RegExp; tag: string }> = {
    bgm: { re: /(<(?:playbgm|BGMの演奏)\s*:\s*)([^,<>]*)/i, tag: 'PlayBGM' },
    bgs: { re: /(<(?:playbgs|BGSの演奏)\s*:\s*)([^,<>]*)/i, tag: 'PlayBGS' },
    me: { re: /(<(?:playme|MEの演奏)\s*:\s*)([^,<>]*)/i, tag: 'PlayME' },
    se: { re: /(<(?:playse|SEの演奏)\s*:\s*)([^,<>]*)/i, tag: 'PlaySE' }
};

export function audioEdit(line: string, folder: AudioFolderName, name: string): AssetEdit {
    const { re, tag } = PLAY_TAGS[folder];
    const m = line.match(re);
    if (m && m.index !== undefined) {
        const trailing = m[2].length - m[2].trimEnd().length;
        return { kind: 'replace', text: line.slice(0, m.index) + m[1] + name + ' '.repeat(trailing) + line.slice(m.index + m[0].length) };
    }
    return { kind: 'insert', text: `<${tag}: ${name}, 90, 100, 0>` };
}

/** 行にある音声のタグの種類(BGM・BGS・ME・SE)。無ければ undefined。 */
export function audioFolderOf(line: string): AudioFolderName | undefined {
    return (Object.keys(PLAY_TAGS) as AudioFolderName[]).find((f) => PLAY_TAGS[f].re.test(line));
}

export const hasFaceTag = (line: string): boolean => FACE_TAG.test(line);
