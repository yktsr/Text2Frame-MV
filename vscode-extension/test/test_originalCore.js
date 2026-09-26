const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { restoreAsset } = require('../out/db/originalCore')
const { readAudio } = require('../out/db/audio')

const KEY = '0123456789abcdef0123456789abcdef'
const MZ_CORE = [
  'function Utils() {}',
  'Utils.setEncryptionInfo = function (a, b, key) { this._key = key; };',
  'Utils.decryptArrayBuffer = function (source) { if (this._key !== "' + KEY + '") throw new Error("key"); return source.slice(16); };',
  '//-----------------------------------------------------------------------------',
  'throw new Error("not this part");'
].join('\n')
const MV_CORE = [
  'function Decrypter() {}',
  'Decrypter.decryptArrayBuffer = function (arrayBuffer) { if ($dataSystem.encryptionKey !== "' + KEY + '") throw new Error("key"); return arrayBuffer.slice(16); };',
  '//-----------------------------------------------------------------------------',
  'Graphics.initialize();'
].join('\n')

describe('originalCore', function () {
  let game

  beforeEach(function () {
    game = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-core-'))
    fs.mkdirSync(path.join(game, 'js'))
  })

  afterEach(function () {
    fs.rmSync(game, { recursive: true, force: true })
  })

  const data = Buffer.concat([Buffer.alloc(16, 7), Buffer.from('hello')])

  it('calls the MZ script of the game', function () {
    expect(restoreAsset(game, data, KEY)).to.equal(undefined)
    fs.writeFileSync(path.join(game, 'js', 'rmmz_core.js'), MZ_CORE)
    expect(restoreAsset(game, data, KEY).toString()).to.equal('hello')
    expect(restoreAsset(game, data, 'ffffffffffffffffffffffffffffffff')).to.equal(undefined)
  })

  it('calls the MV script of the game', function () {
    fs.writeFileSync(path.join(game, 'js', 'rpg_core.js'), MV_CORE)
    expect(restoreAsset(game, data, KEY).toString()).to.equal('hello')
    expect(restoreAsset(game, data, 'ffffffffffffffffffffffffffffffff')).to.equal(undefined)
  })

  it('gives nothing when the script does not have it', function () {
    fs.writeFileSync(path.join(game, 'js', 'rmmz_core.js'), 'function Other() {}\n')
    expect(restoreAsset(game, data, KEY)).to.equal(undefined)
  })

  it('reads audio the same way', function () {
    fs.writeFileSync(path.join(game, 'js', 'rmmz_core.js'), MZ_CORE)
    fs.mkdirSync(path.join(game, 'audio', 'se'), { recursive: true })
    const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(8)])
    fs.writeFileSync(path.join(game, 'audio', 'se', 'Door4.ogg_'), Buffer.concat([Buffer.alloc(16), ogg]))
    const audio = readAudio(path.join(game, 'audio'), 'se', 'Door4', KEY)
    expect(audio.mime).to.equal('audio/ogg')
    expect(audio.data.equals(ogg)).to.equal(true)
    expect(readAudio(path.join(game, 'audio'), 'se', 'Door4')).to.equal(undefined)
  })

  /* 本物のゲームで確かめる。場所は環境変数 T2F_GAME_DIR で渡す(未設定なら飛ばす)。
   * 誰のゲームかがリポジトリに残らないよう、パスは書かない。
   *   T2F_GAME_DIR=/path/to/game npm test */
  it('works with a real game', function () {
    const root = process.env.T2F_GAME_DIR
    if (!root) return this.skip()
    const faces = path.join(root, 'img', 'faces')
    if (!fs.existsSync(faces)) return this.skip()
    const file = fs.readdirSync(faces).find(function (f) { return f.endsWith('.png_') })
    if (!file) return this.skip()
    const key = JSON.parse(fs.readFileSync(path.join(root, 'data', 'System.json'), 'utf8')).encryptionKey
    const image = restoreAsset(root, fs.readFileSync(path.join(faces, file)), key)
    expect(image.subarray(0, 8).toString('hex')).to.equal('89504e470d0a1a0a')
  })
})
