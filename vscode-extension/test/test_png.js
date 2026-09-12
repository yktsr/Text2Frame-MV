const { expect } = require('chai')
const zlib = require('zlib')
const png = require('../out/db/png')

/* 読み取りを確かめるため、形式(色の種類・ビット深度)とフィルタを選んで PNG を組み立てる。
 * rows は1行ぶんの生のバイト列(フィルタ前)。 */
const CRC = (function () {
  const t = []
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return function (buf) { let c = 0xffffffff; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
})()
function chunk (type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'latin1')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}
function paeth (a, b, c) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
function makePng (o) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(o.width, 0); ihdr.writeUInt32BE(o.height, 4)
  ihdr[8] = o.depth; ihdr[9] = o.color; ihdr[12] = o.interlace || 0
  const bpp = Math.max(1, Math.ceil(o.depth * ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 })[o.color] / 8))
  const out = []
  o.rows.forEach(function (row, y) {
    const prev = y > 0 ? o.rows[y - 1] : Buffer.alloc(row.length)
    const f = typeof o.filter === 'number' ? o.filter : y % 5 // 既定は行ごとに 0〜4 を回す
    const line = Buffer.alloc(row.length + 1); line[0] = f
    for (let x = 0; x < row.length; x++) {
      const a = x >= bpp ? row[x - bpp] : 0; const b = prev[x]; const c = x >= bpp ? prev[x - bpp] : 0
      const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][f]
      line[x + 1] = (row[x] - pred) & 0xff
    }
    out.push(line)
  })
  const parts = [Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr)]
  if (o.plte) parts.push(chunk('PLTE', Buffer.from(o.plte)))
  if (o.trns) parts.push(chunk('tRNS', Buffer.from(o.trns)))
  parts.push(chunk('IDAT', zlib.deflateSync(Buffer.concat(out))), chunk('IEND', Buffer.alloc(0)))
  return Buffer.concat(parts)
}
const px = function (img, x, y) { const i = (y * img.width + x) * 4; return Array.from(img.data.subarray(i, i + 4)) }

describe('png', function () {
  it('round-trips an RGBA image through encode and decode', function () {
    const data = Buffer.alloc(3 * 2 * 4)
    for (let i = 0; i < data.length; i++) data[i] = (i * 37) & 0xff
    const img = png.decodePng(png.encodePng({ width: 3, height: 2, data }))
    expect(img.width).to.equal(3)
    expect(img.data.equals(data)).to.equal(true)
  })

  // 行ごとに None / Sub / Up / Average / Paeth を回した画像が、元の画素に戻ること。
  it('undoes all five row filters', function () {
    const rows = []
    for (let y = 0; y < 10; y++) { const r = Buffer.alloc(7 * 4); for (let i = 0; i < r.length; i++) r[i] = (y * 53 + i * 29 + ((i * i) % 17)) & 0xff; rows.push(r) }
    const img = png.decodePng(makePng({ width: 7, height: 10, depth: 8, color: 6, rows }))
    for (let y = 0; y < 10; y++) expect(img.data.subarray(y * 28, y * 28 + 28).equals(rows[y]), 'row ' + y).to.equal(true)
  })

  it('reads RGB as opaque', function () {
    const img = png.decodePng(makePng({ width: 1, height: 1, depth: 8, color: 2, rows: [Buffer.from([10, 20, 30])] }))
    expect(px(img, 0, 0)).to.eql([10, 20, 30, 255])
  })

  it('reads an 8-bit palette with transparency', function () {
    const img = png.decodePng(makePng({
      width: 2, height: 1, depth: 8, color: 3, rows: [Buffer.from([0, 1])],
      plte: [255, 0, 0, 0, 0, 255], trns: [0]
    }))
    expect(px(img, 0, 0)).to.eql([255, 0, 0, 0])
    expect(px(img, 1, 0)).to.eql([0, 0, 255, 255])
  })

  it('reads a 4-bit palette packed two pixels to a byte, with an odd width', function () {
    const img = png.decodePng(makePng({
      width: 3, height: 1, depth: 4, color: 3, rows: [Buffer.from([0x12, 0x00])],
      plte: [0, 0, 0, 10, 10, 10, 20, 20, 20]
    }))
    expect([px(img, 0, 0), px(img, 1, 0), px(img, 2, 0)].map(function (p) { return p[0] })).to.eql([10, 20, 0])
  })

  it('reads 16-bit grey by its high byte, and grey with alpha', function () {
    const g16 = png.decodePng(makePng({ width: 1, height: 1, depth: 16, color: 0, rows: [Buffer.from([0x80, 0xff])] }))
    expect(px(g16, 0, 0)).to.eql([128, 128, 128, 255])
    const ga = png.decodePng(makePng({ width: 1, height: 1, depth: 8, color: 4, rows: [Buffer.from([50, 100])] }))
    expect(px(ga, 0, 0)).to.eql([50, 50, 50, 100])
  })

  it('declines interlaced images and anything that is not a PNG', function () {
    expect(png.decodePng(makePng({ width: 1, height: 1, depth: 8, color: 6, interlace: 1, rows: [Buffer.alloc(4)] }))).to.equal(undefined)
    expect(png.decodePng(Buffer.from('not a png'))).to.equal(undefined)
  })

  it('crops, leaving outside the image transparent', function () {
    const data = Buffer.from([1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255, 4, 4, 4, 255])
    const c = png.crop({ width: 2, height: 2, data }, 1, 1, 2, 2)
    expect(px(c, 0, 0)).to.eql([4, 4, 4, 255])
    expect(px(c, 1, 1)).to.eql([0, 0, 0, 0])
  })

  // 縮小は面積平均。色は不透明度で重みづけする(透明な縁の色が混ざって黒ずまない)。
  it('shrinks by averaging, weighting colour by opacity', function () {
    const data = Buffer.from([255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0])
    const s = png.shrink({ width: 2, height: 2, data }, 1, 1)
    expect(px(s, 0, 0)).to.eql([128, 0, 128, 128])
  })
})
