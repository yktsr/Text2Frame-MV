import * as fs from 'fs';
import * as path from 'path';
import { restoreAsset } from './originalCore';

/**
 * 顔画像(img/faces/*.png)を読み、指定の番号のコマを切り出す。VS Code に依存しない。
 *
 * 顔画像は 4列×2行。1コマの大きさは MZ なら System.json の faceSize、MV は 144。
 */

export const FACE_COLUMNS = 4;
export const FACE_ROWS = 2;
const ENCRYPTED_EXTENSIONS = ['.png_', '.rpgmvp'];

export interface Cell {
    x: number;
    y: number;
    size: number;
}

/** 番号 n のコマ。はみ出した番号(8以上・負)は undefined。 */
export function faceCell(index: number, faceSize: number): Cell | undefined {
    if (!Number.isInteger(index) || index < 0 || index >= FACE_COLUMNS * FACE_ROWS) return undefined;
    return { x: (index % FACE_COLUMNS) * faceSize, y: Math.floor(index / FACE_COLUMNS) * faceSize, size: faceSize };
}

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
function isPng(buf: Buffer): boolean {
    return buf.length >= PNG_SIGNATURE.length && buf.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

/** 顔画像1枚を PNG として読む。見つからない・読めないときは undefined。 */
export function readFaceSheet(imgDir: string, faceName: string, encryptionKey?: string): Buffer | undefined {
    const base = path.join(imgDir, 'faces', faceName);
    const plain = base + '.png';
    if (fs.existsSync(plain)) return fs.readFileSync(plain);
    if (!encryptionKey) return undefined;
    for (const ext of ENCRYPTED_EXTENSIONS) {
        const p = base + ext;
        if (!fs.existsSync(p)) continue;
        const image = restoreAsset(path.dirname(imgDir), fs.readFileSync(p), encryptionKey);
        return image && isPng(image) ? image : undefined;
    }
    return undefined;
}

/** 顔画像のファイル名(拡張子なし)の一覧。補完に使う。 */
export function listFaceNames(imgDir: string): string[] {
    const dir = path.join(imgDir, 'faces');
    if (!fs.existsSync(dir)) return [];
    const names = new Set<string>();
    for (const f of fs.readdirSync(dir)) {
        for (const ext of ['.png'].concat(ENCRYPTED_EXTENSIONS)) {
            if (f.endsWith(ext)) names.add(f.slice(0, -ext.length));
        }
    }
    return Array.from(names).sort();
}

/** PNG の幅と高さ(IHDR)。 */
export function pngSize(png: Buffer): { width: number; height: number } | undefined {
    if (!isPng(png) || png.length < 24) return undefined;
    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/**
 * 1コマだけを見せる SVG を data URI で返す。画像を切り抜く処理を持たずに済むよう、
 * 顔画像全体を埋め込んで viewBox で1コマに絞る。ホバー(Markdown)にもそのまま貼れる。
 */
export function faceSvgDataUri(png: Buffer, index: number, faceSize: number, displaySize = 96): string | undefined {
    const cell = faceCell(index, faceSize);
    const size = pngSize(png);
    if (!cell || !size) return undefined;
    const href = 'data:image/png;base64,' + png.toString('base64');
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
        `width="${displaySize}" height="${displaySize}" viewBox="${cell.x} ${cell.y} ${cell.size} ${cell.size}">` +
        `<image width="${size.width}" height="${size.height}" href="${href}" xlink:href="${href}"/></svg>`;
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}
