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

/** キャラ画像・ピクチャなど、img の下の1枚を PNG として読む(暗号化されていれば戻す)。 */
export function readImageSheet(imgDir: string, folder: string, name: string, encryptionKey?: string): Buffer | undefined {
    return readImage(imgDir, path.join(folder, name), encryptionKey);
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
    return listImageNames(imgDir, 'faces');
}

/** img の下のフォルダにある画像のファイル名(拡張子なし)の一覧。 */
export function listImageNames(imgDir: string, folder: string): string[] {
    const dir = path.join(imgDir, folder);
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

/* キャラ画像(img/characters)。1枚に 4列×2行の8体。名前が $ で始まる画像は1体だけ。
 * 1体はさらに 3列×4行のコマ(横が足踏み、縦が向き)。 */
export const CHARACTER_COLUMNS = 4;
export const CHARACTER_ROWS = 2;
const FRAME_COLUMNS = 3;
const FRAME_ROWS = 4;

/** その画像が1体だけか(ファイル名が $ で始まる)。 */
export function singleCharacter(name: string): boolean {
    return /^[$]/.test(name.replace(/^.*[\\/]/, ''));
}

/** 画像に入っている体の数(1 か 8)。 */
export function characterCount(name: string): number {
    return singleCharacter(name) ? 1 : CHARACTER_COLUMNS * CHARACTER_ROWS;
}

/**
 * 番号 index の体の「下を向いて止まった姿」を切り出し、displaySize に収まるよう縮めた PNG。
 * 番号がはみ出していれば undefined。番号の並びは <ChangeImage> と同じ(左上から右へ 0〜7)。
 */
export function cropCharacter(sheet: Rgba, name: string, index: number, displaySize = 72): Buffer | undefined {
    const count = characterCount(name);
    if (!Number.isInteger(index) || index < 0 || index >= count) return undefined;
    const single = count === 1;
    const blockW = Math.floor(sheet.width / (single ? 1 : CHARACTER_COLUMNS));
    const blockH = Math.floor(sheet.height / (single ? 1 : CHARACTER_ROWS));
    const frameW = Math.floor(blockW / FRAME_COLUMNS);
    const frameH = Math.floor(blockH / FRAME_ROWS);
    if (frameW <= 0 || frameH <= 0) return undefined;
    const bx = single ? 0 : (index % CHARACTER_COLUMNS) * blockW;
    const by = single ? 0 : Math.floor(index / CHARACTER_COLUMNS) * blockH;
    // 真ん中の列(止まった姿)・いちばん上の行(下向き)。
    const frame = crop(sheet, bx + frameW, by, frameW, frameH);
    return encodePng(fitInto(frame, displaySize));
}

/** 画像をまるごと、縦横の比を保ったまま box に収める PNG。 */
export function cropPicture(sheet: Rgba, box = 72): Buffer | undefined {
    return encodePng(fitInto(sheet, box));
}

/** 縦横の比を保ったまま box に収める。box より小さい画像はそのまま。 */
function fitInto(img: Rgba, box: number): Rgba {
    const scale = Math.min(1, box / Math.max(img.width, img.height));
    if (scale >= 1) return img;
    return shrink(img, Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale)));
}
