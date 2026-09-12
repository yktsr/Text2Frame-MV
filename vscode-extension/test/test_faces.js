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

  it('crops one face with an SVG viewBox', function () {
    const uri = faces.faceSvgDataUri(fakePng(576, 288), 5, 144, 96)
    const svg = Buffer.from(uri.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf8')
    expect(svg).to.contain('viewBox="144 144 144 144"')
    expect(svg).to.contain('width="576" height="288"')
    expect(faces.faceSvgDataUri(fakePng(576, 288), 9, 144)).to.equal(undefined)
  })
})
