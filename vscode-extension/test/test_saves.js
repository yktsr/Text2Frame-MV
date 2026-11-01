const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')

/* ゲームのフォルダにあるセーブの見分け方。
 *
 * ここは MCP サーバと拡張の両方が使う1か所。片方だけ MZ に対応している状態を作らないため、
 * 拡張子の見分けはここにしかない。 */
const { savesOnDisk, SAVE_MAX_BYTES } = require('../out/db/saves')

describe('the saves in the game folder', function () {
  let tmp

  const game = function (files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-saves-'))
    tmp.push(root)
    if (files) {
      fs.mkdirSync(path.join(root, 'save'))
      Object.keys(files).forEach(function (name) {
        fs.writeFileSync(path.join(root, 'save', name), files[name])
      })
    }
    return root
  }

  const namesOf = function (rows) { return rows.map(function (r) { return r.name }) }

  beforeEach(function () { tmp = [] })
  afterEach(function () {
    tmp.forEach(function (dir) {
      try { fs.rmSync(dir, { recursive: true, force: true }) } catch (e) { /* ignore */ }
    })
  })

  /* MZ のテストプレイが書くもの。 */
  it('reads the saves of an MZ game', function () {
    const root = game({ 'file1.rmmzsave': 'ひとつめ', 'file2.rmmzsave': 'ふたつめ' })

    const rows = savesOnDisk(root)

    expect(namesOf(rows)).to.eql(['file1', 'file2'])
    expect(rows[0].data).to.equal('ひとつめ')
  })

  /* MV のテストプレイが書くもの。拡張子が違うだけ。 */
  it('reads the saves of an MV game', function () {
    const root = game({ 'file1.rpgsave': 'ひとつめ', 'global.rpgsave': 'ぜんたい' })

    expect(namesOf(savesOnDisk(root))).to.eql(['file1', 'global'])
  })

  /* config は音量などの設定で、セーブではない。 */
  it('leaves out the settings file', function () {
    const root = game({ 'file1.rmmzsave': 'ひとつめ', 'config.rmmzsave': 'おんりょう' })

    expect(namesOf(savesOnDisk(root))).to.eql(['file1'])
  })

  it('leaves out anything that is not a save', function () {
    const root = game({ 'file1.rmmzsave': 'ひとつめ', 'メモ.txt': 'ただのメモ', 'file9': 'かくしなし' })

    expect(namesOf(savesOnDisk(root))).to.eql(['file1'])
  })

  /* 大きすぎるものは読まないが、名前は返す。黙って落とすと「そのセーブは無い」と誤解させる。 */
  it('names a save that is too big instead of reading it', function () {
    const root = game({ 'file1.rmmzsave': 'x'.repeat(SAVE_MAX_BYTES + 1) })

    const rows = savesOnDisk(root)

    expect(namesOf(rows)).to.eql(['file1'])
    expect(rows[0].tooBig).to.equal(true)
    expect(rows[0].data).to.equal(undefined)
  })

  it('gives the size of every save it finds', function () {
    const root = game({ 'file1.rmmzsave': 'abc' })

    expect(savesOnDisk(root)[0].bytes).to.equal(3)
  })

  it('says there is nothing when the game has never been saved', function () {
    expect(savesOnDisk(game())).to.eql([])
  })

  it('says there is nothing for a folder that does not exist', function () {
    expect(savesOnDisk(path.join(os.tmpdir(), 't2f-no-such-game-' + Date.now()))).to.eql([])
  })

  /* 順番が決まっていないと、スロットの並びが実行ごとに変わる。 */
  it('always answers in the same order', function () {
    const root = game({ 'file10.rmmzsave': 'じゅう', 'file2.rmmzsave': 'に', 'file1.rmmzsave': 'いち' })

    expect(namesOf(savesOnDisk(root))).to.eql(['file1', 'file10', 'file2'])
  })
})
