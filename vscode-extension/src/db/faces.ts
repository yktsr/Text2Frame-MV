import * as fs from 'fs';
import * as path from 'path';
import { Rgba, crop, shrink, encodePng } from './png';
import { restoreAsset } from './originalCore';

/**
 * 顔画像(img/faces/*.png)を読み、指定の番号のコマを切り出す。VS Code に依存しない。
 *
 * 顔画像は 4列×2行。1コマの大きさは MZ なら System.json の faceSize、MV は 144。
 */

export const FACE_COLUMNS = 4;
export const FACE_ROWS = 2;
/** アイコン画像(img/system/IconSet)は横16個。縦は画像の高さで決まる。 */
export const ICON_COLUMNS = 16;
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
    return readImage(imgDir, path.join('faces', faceName), encryptionKey);
}

/** アイコン画像(img/system/IconSet)を PNG として読む。 */
export function readIconSheet(imgDir: string, encryptionKey?: string): Buffer | undefined {
    return readImage(imgDir, path.join('system', 'IconSet'), encryptionKey);
}

function readImage(imgDir: string, name: string, encryptionKey?: string): Buffer | undefined {
    const base = path.join(imgDir, name);
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

/**
 * 1コマだけを切り出し、displaySize 四方に縮めた PNG を返す。番号がはみ出していれば undefined。
 * ホバー・補完・プレビューに data URI で貼る。顔画像1枚をまるごと貼ると data URI が
 * 数十万文字を超え、VS Code のホバーが途中で切ってしまうため、ここで小さくしておく。
 */
export function cropFace(sheet: Rgba, index: number, faceSize: number, displaySize = 96): Buffer | undefined {
    const cell = faceCell(index, faceSize);
    if (!cell) return undefined;
    return encodePng(shrink(crop(sheet, cell.x, cell.y, cell.size, cell.size), displaySize, displaySize));
}

/** アイコンの数(画像の大きさから)。 */
export function iconCount(sheet: Rgba, iconSize: number): number {
    return Math.floor(sheet.width / iconSize) >= ICON_COLUMNS ? ICON_COLUMNS * Math.floor(sheet.height / iconSize) : 0;
}

/** アイコン1つを切り出して displaySize 四方にした PNG。番号が画像の外なら undefined。 */
export function cropIcon(sheet: Rgba, index: number, iconSize: number, displaySize = iconSize): Buffer | undefined {
    if (!Number.isInteger(index) || index < 0 || index >= iconCount(sheet, iconSize)) return undefined;
    const x = (index % ICON_COLUMNS) * iconSize;
    const y = Math.floor(index / ICON_COLUMNS) * iconSize;
    return encodePng(shrink(crop(sheet, x, y, iconSize, iconSize), displaySize, displaySize));
}

export function pngDataUri(png: Buffer): string {
    return 'data:image/png;base64,' + png.toString('base64');
}
