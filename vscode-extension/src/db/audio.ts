import * as fs from 'fs';
import * as path from 'path';
import { restoreAsset } from './originalCore';

/**
 * 音声ファイル(audio/bgm・bgs・me・se)を読む。VS Code に依存しない。プレビューで試しに鳴らすのに使う。
 *
 * MV は .ogg と .m4a の両方を置き、MZ は .ogg だけ。
 * VS Code のブラウザは .m4a(AAC)を鳴らせないことがあるので、.ogg を先に探す。
 */

export type AudioFolder = 'bgm' | 'bgs' | 'me' | 'se';
export const AUDIO_FOLDERS: AudioFolder[] = ['bgm', 'bgs', 'me', 'se'];

export interface AudioFile {
    data: Buffer;
    mime: string;
    file: string;
}

const OGG = 'audio/ogg';
const M4A = 'audio/mp4';
const CANDIDATES: Array<{ ext: string; mime: string; encrypted: boolean }> = [
    { ext: '.ogg', mime: OGG, encrypted: false },
    { ext: '.ogg_', mime: OGG, encrypted: true },
    { ext: '.rpgmvo', mime: OGG, encrypted: true },
    { ext: '.m4a', mime: M4A, encrypted: false },
    { ext: '.m4a_', mime: M4A, encrypted: true },
    { ext: '.rpgmvm', mime: M4A, encrypted: true }
];

export function isOgg(b: Buffer): boolean {
    return b.length >= 4 && b.toString('latin1', 0, 4) === 'OggS';
}

export function isM4a(b: Buffer): boolean {
    return b.length >= 8 && b.toString('latin1', 4, 8) === 'ftyp';
}

/** 音声1つを読む。無い・読めない・フォルダの外を指す名前なら undefined。 */
export function readAudio(audioDir: string, folder: AudioFolder, name: string, encryptionKey?: string): AudioFile | undefined {
    if (!AUDIO_FOLDERS.includes(folder) || !name) return undefined;
    const dir = path.resolve(audioDir, folder);
    const base = path.resolve(dir, name);
    if (!base.startsWith(dir + path.sep)) return undefined;
    for (const c of CANDIDATES) {
        const file = base + c.ext;
        if (!fs.existsSync(file)) continue;
        if (!c.encrypted) return { data: fs.readFileSync(file), mime: c.mime, file };
        if (!encryptionKey) continue;
        const data = restoreAsset(path.dirname(audioDir), fs.readFileSync(file), encryptionKey);
        if (data && (c.mime === OGG ? isOgg(data) : isM4a(data))) return { data, mime: c.mime, file };
    }
    return undefined;
}
