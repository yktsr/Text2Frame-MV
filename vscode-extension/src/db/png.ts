import * as zlib from 'zlib';

/**
 * PNG を読み書きする最小の実装。VS Code に依存せず、Node 標準の zlib だけを使う。
 *
 * 顔画像から1コマを切り出して小さな PNG にするためにある。顔画像1枚をまるごと埋め込むと
 * data URI が数十万〜百万文字を超え、VS Code のホバーは10万文字で Markdown を切るので
 * 画像の記法が途中で切れて文字のまま出てしまう。1コマ・縮小済みなら数万文字に収まる。
 *
 * 読めるのは非インターレースの PNG(色の種類はグレー・RGB・パレット・グレー+α・RGBA、
 * ビット深度 1〜16)。インターレース(Adam7)は読まずに undefined を返す。書くのは 8bit RGBA だけ。
 */

export interface Rgba {
    width: number;
    height: number;
    /** 1画素4バイト(R, G, B, A)を左上から並べたもの。 */
    data: Buffer;
}

const SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function decodePng(png: Buffer): Rgba | undefined {
    if (png.length < 8 || !png.subarray(0, 8).equals(SIGNATURE)) return undefined;
    let width = 0, height = 0, depth = 0, color = 0, interlace = 0;
    let palette: Buffer | undefined;
    let transparency: Buffer | undefined;
    const idat: Buffer[] = [];
    for (let pos = 8; pos + 8 <= png.length;) {
        const length = png.readUInt32BE(pos);
        const type = png.toString('latin1', pos + 4, pos + 8);
        const data = png.subarray(pos + 8, pos + 8 + length);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            depth = data[8];
            color = data[9];
            interlace = data[12];
        } else if (type === 'PLTE') palette = data;
        else if (type === 'tRNS') transparency = data;
        else if (type === 'IDAT') idat.push(data);
        else if (type === 'IEND') break;
        pos += 12 + length;
    }
    const channels = CHANNELS[color];
    if (!width || !height || !channels || interlace !== 0 || ![1, 2, 4, 8, 16].includes(depth)) return undefined;
    if (color === 3 && !palette) return undefined;

    let raw: Buffer;
    try {
        raw = zlib.inflateSync(Buffer.concat(idat));
    } catch (e) {
        return undefined;
    }
    const bitsPerPixel = depth * channels;
    const stride = Math.ceil((width * bitsPerPixel) / 8);
    const bpp = Math.max(1, Math.ceil(bitsPerPixel / 8)); // フィルタが「左の画素」とみなすバイト数
    if (raw.length < height * (stride + 1)) return undefined;

    // 行ごとのフィルタを外す。
    const rows = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        const src = y * (stride + 1) + 1;
        const dst = y * stride;
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? rows[dst + x - bpp] : 0;
            const b = y > 0 ? rows[dst - stride + x] : 0;
            const c = x >= bpp && y > 0 ? rows[dst - stride + x - bpp] : 0;
            let v = raw[src + x];
            switch (filter) {
                case 1: v += a; break;
                case 2: v += b; break;
                case 3: v += (a + b) >> 1; break;
                case 4: {
                    const p = a + b - c;
                    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                    v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
                    break;
                }
            }
            rows[dst + x] = v & 0xff;
        }
    }

    // 1画素ぶんの各チャンネルを 0〜255 で取り出す。
    const max = (1 << depth) - 1;
    const sample = (y: number, x: number, ch: number): number => {
        const i = x * channels + ch;
        if (depth === 8) return rows[y * stride + i];
        if (depth === 16) return rows[y * stride + i * 2]; // 上位バイト
        const bit = i * depth;
        const byte = rows[y * stride + (bit >> 3)];
        return (byte >> (8 - depth - (bit & 7))) & max;
    };
    const scale = (v: number): number => (depth >= 8 ? v : Math.round((v * 255) / max));

    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const o = (y * width + x) * 4;
            let r: number, g: number, b: number, a = 255;
            if (color === 3) {
                const idx = sample(y, x, 0);
                r = palette![idx * 3]; g = palette![idx * 3 + 1]; b = palette![idx * 3 + 2];
                if (transparency && idx < transparency.length) a = transparency[idx];
            } else if (color === 0 || color === 4) {
                r = g = b = scale(sample(y, x, 0));
                if (color === 4) a = scale(sample(y, x, 1));
                else if (transparency && transparency.length >= 2 && sample(y, x, 0) === transparency.readUInt16BE(0) >> (depth === 16 ? 8 : 0)) a = 0;
            } else {
                r = scale(sample(y, x, 0)); g = scale(sample(y, x, 1)); b = scale(sample(y, x, 2));
                if (color === 6) a = scale(sample(y, x, 3));
                else if (transparency && transparency.length >= 6 &&
                    r === transparency[depth === 16 ? 0 : 1] && g === transparency[depth === 16 ? 2 : 3] && b === transparency[depth === 16 ? 4 : 5]) a = 0;
            }
            out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
        }
    }
    return { width, height, data: out };
}

/** 切り出す。範囲が画像からはみ出す部分は透明にする。 */
export function crop(img: Rgba, x: number, y: number, w: number, h: number): Rgba {
    const out = Buffer.alloc(w * h * 4);
    for (let j = 0; j < h; j++) {
        const sy = y + j;
        if (sy < 0 || sy >= img.height) continue;
        for (let i = 0; i < w; i++) {
            const sx = x + i;
            if (sx < 0 || sx >= img.width) continue;
            img.data.copy(out, (j * w + i) * 4, (sy * img.width + sx) * 4, (sy * img.width + sx) * 4 + 4);
        }
    }
    return { width: w, height: h, data: out };
}

/**
 * 縮小する。出力の1画素に重なる元の画素を、重なった面積で平均する(面積平均)。
 * 透明な縁が黒ずまないよう、色は不透明度で重みづけする。拡大には使わない。
 */
export function shrink(img: Rgba, w: number, h: number): Rgba {
    if (w >= img.width && h >= img.height) return img;
    const out = Buffer.alloc(w * h * 4);
    const fx = img.width / w;
    const fy = img.height / h;
    for (let j = 0; j < h; j++) {
        const y0 = j * fy, y1 = y0 + fy;
        for (let i = 0; i < w; i++) {
            const x0 = i * fx, x1 = x0 + fx;
            let sr = 0, sg = 0, sb = 0, sa = 0, area = 0;
            for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
                const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
                for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
                    const wgt = wy * (Math.min(x1, sx + 1) - Math.max(x0, sx));
                    const p = (sy * img.width + sx) * 4;
                    const a = img.data[p + 3] * wgt;
                    sr += img.data[p] * a; sg += img.data[p + 1] * a; sb += img.data[p + 2] * a;
                    sa += a; area += wgt;
                }
            }
            const o = (j * w + i) * 4;
            if (sa > 0) {
                out[o] = Math.round(sr / sa); out[o + 1] = Math.round(sg / sa); out[o + 2] = Math.round(sb / sa);
            }
            out[o + 3] = Math.round(sa / area);
        }
    }
    return { width: w, height: h, data: out };
}

/** 8bit RGBA の PNG にする。 */
export function encodePng(img: Rgba): Buffer {
    const stride = img.width * 4;
    const raw = Buffer.alloc(img.height * (stride + 1));
    for (let y = 0; y < img.height; y++) {
        raw[y * (stride + 1)] = 0; // フィルタなし
        img.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(img.width, 0);
    ihdr.writeUInt32BE(img.height, 4);
    ihdr[8] = 8; // ビット深度
    ihdr[9] = 6; // RGBA
    return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function chunk(type: string, data: Buffer): Buffer {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
}

let CRC_TABLE: Uint32Array | undefined;
function crc32(buf: Buffer): number {
    if (!CRC_TABLE) {
        CRC_TABLE = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            CRC_TABLE[n] = c >>> 0;
        }
    }
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
