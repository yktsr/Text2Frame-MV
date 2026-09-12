const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const faces = require('../out/db/faces')

/* 画素は読まないので、PNG の署名と IHDR(幅・高さ)だけ持つ最小の PNG で足りる。 */
function fakePng (width, height) {
  const buf = Buffer.alloc(40)
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buf, 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12, 'latin1')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  buf.fill(0x5a, 24)
  return buf
}

const KEY = '00112233445566778899aabbccddeeff'
const MZ_CORE = 'function Utils() {}\nUtils.setEncryptionInfo = function (a, b, key) { this._key = key; };\n' +
  'Utils.decryptArrayBuffer = function (source) { if (this._key !== "' + KEY + '") throw new Error("key"); return source.slice(16); };\n//----\n'
const packed = function (png) { return Buffer.concat([Buffer.alloc(16), png]) }
const withCore = function (img) {
  fs.mkdirSync(path.join(path.dirname(img), 'js'), { recursive: true })
  fs.writeFileSync(path.join(path.dirname(img), 'js', 'rmmz_core.js'), MZ_CORE)
}

describe('faces', function () {
  describe('faceCell', function () {
    it('lays the eight faces out four across, two down (MV 144)', function () {
      expect(faces.faceCell(0, 144)).to.eql({ x: 0, y: 0, size: 144 })
      expect(faces.faceCell(3, 144)).to.eql({ x: 432, y: 0, size: 144 })
      expect(faces.faceCell(4, 144)).to.eql({ x: 0, y: 144, size: 144 })
      expect(faces.faceCell(7, 144)).to.eql({ x: 432, y: 144, size: 144 })
    })

    it('follows the MZ face size', function () {
      expect(faces.faceCell(5, 120)).to.eql({ x: 120, y: 120, size: 120 })
    })

    it('has no cell outside 0..7', function () {
      expect(faces.faceCell(8, 144)).to.equal(undefined)
      expect(faces.faceCell(-1, 144)).to.equal(undefined)
    })
  })

  describe('readFaceSheet', function () {
    let game
    let img

    beforeEach(function () {
      game = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-img-'))
      img = path.join(game, 'img')
      fs.mkdirSync(path.join(img, 'faces'), { recursive: true })
    })

    afterEach(function () {
      fs.rmSync(game, { recursive: true, force: true })
    })

    it('reads a plain png', function () {
      const png = fakePng(576, 288)
      fs.writeFileSync(path.join(img, 'faces', 'Actor1.png'), png)
      expect(faces.readFaceSheet(img, 'Actor1').equals(png)).to.equal(true)
    })

    for (const ext of ['.png_', '.rpgmvp']) {
      it('reads ' + ext + ' through the game\'s own script', function () {
        const png = fakePng(576, 288)
        fs.writeFileSync(path.join(img, 'faces', 'suzu1' + ext), packed(png))
        expect(faces.readFaceSheet(img, 'suzu1', KEY)).to.equal(undefined)
        withCore(img)
        expect(faces.readFaceSheet(img, 'suzu1', KEY).equals(png)).to.equal(true)
        expect(faces.readFaceSheet(img, 'suzu1')).to.equal(undefined)
        expect(faces.readFaceSheet(img, 'suzu1', 'ffffffffffffffffffffffffffffffff')).to.equal(undefined)
      })
    }

    it('does not take what is not an image', function () {
      withCore(img)
      fs.writeFileSync(path.join(img, 'faces', 'broken.png_'), packed(Buffer.from('not a png at all')))
      expect(faces.readFaceSheet(img, 'broken', KEY)).to.equal(undefined)
    })

    it('lists face names across plain and encrypted files', function () {
      fs.writeFileSync(path.join(img, 'faces', 'Actor1.png'), fakePng(576, 288))
      fs.writeFileSync(path.join(img, 'faces', 'suzu1.png_'), Buffer.alloc(20))
      fs.writeFileSync(path.join(img, 'faces', 'notes.txt'), '')
      expect(faces.listFaceNames(img)).to.eql(['Actor1', 'suzu1'])
    })
  })

  // 1コマだけの小さな PNG にする。顔画像1枚をまるごと貼るとホバーの長さの上限を超える。
  it('crops one face into a small PNG', function () {
    const { encodePng, decodePng } = require('../out/db/png')
    // 8コマをそれぞれ別の色で塗った顔画像(1コマ 4px)。
    const w = 16; const h = 8; const data = Buffer.alloc(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = Math.floor(y / 4) * 4 + Math.floor(x / 4)
        data.set([cell * 30, 0, 0, 255], (y * w + x) * 4)
      }
    }
    const sheet = decodePng(encodePng({ width: w, height: h, data }))
    const face = decodePng(faces.cropFace(sheet, 5, 4, 2))
    expect([face.width, face.height]).to.eql([2, 2])
    expect(Array.from(face.data.subarray(0, 4))).to.eql([150, 0, 0, 255])
    expect(faces.cropFace(sheet, 8, 4)).to.equal(undefined)
    expect(faces.pngDataUri(Buffer.from([1, 2]))).to.equal('data:image/png;base64,AQI=')
  })

  it('crops one icon, sixteen across', function () {
    const { encodePng, decodePng } = require('../out/db/png')
    // 1個 2px のアイコンが横16個・縦2段。番号 n を赤 n で塗る。
    const size = 2; const w = 16 * size; const h = 2 * size; const data = Buffer.alloc(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) data.set([Math.floor(y / size) * 16 + Math.floor(x / size), 0, 0, 255], (y * w + x) * 4)
    }
    const sheet = decodePng(encodePng({ width: w, height: h, data }))
    expect(faces.iconCount(sheet, size)).to.equal(32)
    const icon = decodePng(faces.cropIcon(sheet, 19, size))
    expect([icon.width, icon.height, icon.data[0]]).to.eql([2, 2, 19])
    expect(faces.cropIcon(sheet, 32, size)).to.equal(undefined)
  })

  it('reads the icon sheet from img/system', function () {
    const game = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-icon-'))
    try {
      const img = path.join(game, 'img')
      fs.mkdirSync(path.join(img, 'system'), { recursive: true })
      const png = fakePng(32, 32)
      fs.writeFileSync(path.join(img, 'system', 'IconSet.png_'), packed(png))
      withCore(img)
      expect(faces.readIconSheet(img, KEY).equals(png)).to.equal(true)
      expect(faces.readIconSheet(img)).to.equal(undefined)
    } finally {
      fs.rmSync(game, { recursive: true, force: true })
    }
  })
})
