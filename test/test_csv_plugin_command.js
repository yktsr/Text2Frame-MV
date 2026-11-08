const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

// 偽のツクールは本体を読み込む前に置く(読み込み時にパラメータを読むため)。
const { bottom, installEngine } = require('./helpers')
const { shown } = installEngine()
const text2frame = require('../Text2Frame.js')
require('../Frame2Text.js')
const csv = text2frame._csv

/* ツクールの画面からも CSV を往復できること。既存の一括コマンドに「形式」の引数を
 * 末尾に足しただけなので、**今までの書き方(引数を省く・3つだけ渡す)も動き続ける**
 * ことを一緒に固める ── MV のプラグインコマンドは引数を手書きするので、
 * 後ろを省いた呼び方が実在する。 */
describe('the batch plugin commands with a format argument', function () {
  let tmp
  let cwd
  let mainModule
  const message = [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: ['やあ'] },
    { code: 121, indent: 0, parameters: [1, 1, 0] },
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: ['またね'] },
    bottom
  ]

  const pull = function (args) {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER', args)
  }
  const push = function (args) {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandText2Frame('BATCH_IMPORT_MESSAGES_FROM_FOLDER', args)
  }
  const said = function () {
    const list = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
      .events[1].pages[0].list
    return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
  }
  const sheet = function () { return path.join(tmp, 'scenario.csv') }
  const rows = function () { return csv.parseCsv(fs.readFileSync(sheet(), 'utf8')).rows }
  const put = function (list) { fs.writeFileSync(sheet(), csv.formatCsv(list)) }
  const message_of = function (word) {
    return shown.filter(function (line) { return String(line).indexOf(word) !== -1 })
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-plugin-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    const second = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['こちらは2つ目'] },
      bottom
    ]
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [
        null,
        { id: 1, name: 'EV001', pages: [{ conditions: {}, list: message }] },
        { id: 2, name: 'EV002', pages: [{ conditions: {}, list: second }] }
      ]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([null]), 'utf8')
    cwd = process.cwd()
    process.chdir(tmp)
    mainModule = process.mainModule
    process.mainModule = { filename: path.join(tmp, 'Text2Frame.js') }
  })

  afterEach(function () {
    process.mainModule = mainModule
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  describe('the way they were called before the argument existed', function () {
    it('writes the texts and no CSV when the format is left off', function () {
      pull([path.join(tmp, 'text'), 'overwrite', 'conversation'])
      expect(fs.readdirSync(path.join(tmp, 'text'))).to.have.length.above(0)
      expect(fs.existsSync(sheet())).to.equal(false)
    })

    it('writes the texts and no CSV when every argument is left off', function () {
      pull([])
      expect(fs.existsSync(sheet())).to.equal(false)
    })

    it('imports the texts when the format is left off', function () {
      pull([path.join(tmp, 'text'), 'overwrite', 'conversation'])
      const file = path.join(tmp, 'text', fs.readdirSync(path.join(tmp, 'text'))[0])
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('またね', 'さようなら'))
      push([path.join(tmp, 'text'), 'overwrite'])
      expect(said()).to.include('さようなら')
    })
  })

  describe('exporting with the format set to csv', function () {
    it('writes the texts and the CSV beside the game', function () {
      pull([path.join(tmp, 'text'), 'overwrite', 'conversation', 'csv'])
      expect(fs.readdirSync(path.join(tmp, 'text'))).to.have.length.above(0)
      expect(fs.existsSync(sheet())).to.equal(true)
      // text/ の中には置かない(祖先の鍵がテキストの置き場所で決まるため)。
      expect(fs.readdirSync(path.join(tmp, 'text'))).to.not.include('scenario.csv')
    })

    it('says where it put the CSV', function () {
      pull([path.join(tmp, 'text'), 'overwrite', 'conversation', 'csv'])
      expect(message_of('scenario.csv')).to.have.length.above(0)
    })

    it('writes the same table the CLI writes', function () {
      pull([path.join(tmp, 'text'), 'overwrite', 'conversation', 'csv'])
      const list = rows()
      expect(list[0].種別).to.equal('見出し')
      expect(list[0].本文).to.contain('EV001')
      expect(list.map(function (r) { return r.本文 })).to.include('やあ')
      // 宛先はイベントごと。2つ目のイベントも同じ1枚に入る。
      expect(new Set(list.map(function (r) { return r.宛先 })))
        .to.eql(new Set(['map001_event001_page1', 'map001_event002_page1']))
    })

    it('leaves out the tag rows when it is told dialogue only', function () {
      pull([path.join(tmp, 'text'), 'overwrite', 'conversation', 'csv', 'dialogue'])
      const kinds = rows().map(function (r) { return r.種別 })
      expect(new Set(kinds)).to.eql(new Set(['見出し', 'セリフ']))
    })
  })

  describe('importing with the format set to csv', function () {
    beforeEach(function () {
      pull([path.join(tmp, 'text'), 'overwrite', 'conversation', 'csv'])
    })

    it('puts what the sheet says into the game', function () {
      const list = rows()
      const at = list.findIndex(function (r) { return r.本文 === 'またね' })
      list[at].本文 = 'ではまた'
      put(list)
      push([path.join(tmp, 'text'), 'merge', 'csv'])
      expect(said()).to.include('ではまた')
      expect(said()).to.not.include('またね')
      // CSV が触っていない行は残る。
      expect(said()).to.include('やあ')
    })

    it('puts an added line in, right after the row it follows', function () {
      const list = rows()
      const at = list.findIndex(function (r) { return r.本文 === 'やあ' })
      list.splice(at + 1, 0, { 種別: 'セリフ', 宛先: list[at].宛先, ID: '', 本文: '元気ですか', 版: list[at].版 })
      put(list)
      push([path.join(tmp, 'text'), 'merge', 'csv'])
      expect(said()).to.include('元気ですか')
      expect(said().indexOf('元気ですか')).to.equal(said().indexOf('やあ') + 1)
    })

    it('writes the row-by-row result beside the sheet', function () {
      push([path.join(tmp, 'text'), 'merge', 'csv'])
      const result = path.join(tmp, 'scenario.result.csv')
      expect(fs.existsSync(result)).to.equal(true)
      const marks = csv.parseCsv(fs.readFileSync(result, 'utf8')).rows.map(function (r) { return r.判定 })
      expect(marks).to.include('そのまま')
      expect(message_of('scenario.result.csv')).to.have.length.above(0)
    })

    it('refuses rows missing from the sheet, and names the switch to press', function () {
      put(rows().filter(function (r) { return r.本文 !== 'またね' }))
      push([path.join(tmp, 'text'), 'merge', 'csv'])
      /* 文面は入口ごとに違う ── CLI は --allow-delete、ツクールは選択肢の名前。
       * 断る理由そのものは1か所が決めている。 */
      expect(message_of('消えた行を消す')).to.have.length.above(0)
      expect(message_of('--allow-delete')).to.have.lengthOf(0)
      expect(said()).to.include('またね')
    })

    it('deletes them when the switch is on', function () {
      put(rows().filter(function (r) { return r.本文 !== 'またね' }))
      push([path.join(tmp, 'text'), 'merge', 'csv', 'true'])
      expect(said()).to.not.include('またね')
    })

    it('refuses a sheet that was pasted over, and names the other switch', function () {
      put(rows().map(function (r) {
        return r.ID ? Object.assign({}, r, { 本文: 'まるごと貼り替えた', 見た目: '' }) : r
      }))
      push([path.join(tmp, 'text'), 'merge', 'csv'])
      expect(message_of('多すぎる書き換えも通す')).to.have.length.above(0)
      expect(said()).to.not.include('まるごと貼り替えた')
    })

    it('applies it when that switch is on', function () {
      put(rows().map(function (r) {
        return r.ID ? Object.assign({}, r, { 本文: 'まるごと貼り替えた', 見た目: '' }) : r
      }))
      push([path.join(tmp, 'text'), 'merge', 'csv', 'false', 'true'])
      expect(said()).to.include('まるごと貼り替えた')
    })

    it('says so when there is no CSV to read', function () {
      fs.rmSync(sheet())
      push([path.join(tmp, 'text'), 'merge', 'csv'])
      expect(message_of('CSV がありません')).to.have.length.above(0)
      expect(message_of('一括取り出し')).to.have.length.above(0)
    })

    /* CSV から戻すときに、CSV に出ていない宛先まで一括反映しない。「シートを戻した」
     * つもりの操作がテキスト全体の反映になると、別の宛先の編集が巻き込まれる。 */
    it('leaves the targets the sheet does not mention alone', function () {
      // 2つ目のイベントの行を CSV から全部外し、そのテキストだけ直接書き換えておく。
      const mine = rows().filter(function (r) { return r.宛先 !== 'map001_event002_page1' })
      expect(mine.length).to.be.below(rows().length)
      put(mine)
      const other = path.join(tmp, 'text', 'map001_event002_page1.txt')
      expect(fs.existsSync(other)).to.equal(true)
      fs.writeFileSync(other, fs.readFileSync(other, 'utf8').replace('こちらは2つ目', 'テキストだけ直した'))

      push([path.join(tmp, 'text'), 'merge', 'csv'])
      const two = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
        .events[2].pages[0].list
        .filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
      expect(two).to.include('こちらは2つ目')
      expect(two).to.not.include('テキストだけ直した')
    })
  })
})
