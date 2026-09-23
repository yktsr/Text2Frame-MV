const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
const shown = []
globalThis.$gameMessage = { add: function (t) { shown.push(String(t)) } }
globalThis.PluginManager = {
  parameters: function () {
    return {
      'Default Window Position': 'Bottom',
      'Default Background': 'Window',
      'Comment Out Char': '%',
      IsOverwrite: 'false',
      'Default Scenario Folder': 'text',
      'Default Scenario File': 'message.txt',
      'Default Common Event ID': '1',
      'Default MapID': '1',
      'Default EventID': '1',
      'Default PageID': '1',
      IsDebug: 'false',
      DisplayMsg: 'true',
      DisplayWarning: 'true',
      EnglishTag: 'true'
    }
  },
  registerCommand: function () {}
}
const frame2text = require('../Frame2Text.js')

/* 取り出す範囲。数千イベントのプロジェクトでは、全部を書き出すと編集したいものを探せなくなる。
 * 既定は「中身のあるもの」だけ。会話があるものだけ・既にテキストがあるものだけも選べる。
 * どの範囲でも、既にテキストがあるものは必ず更新する(利用者のファイルを同期から外さない)。 */
describe('export scope', function () {
  let tmp
  let cwd
  let mainModule
  const bottom = { code: 0, indent: 0, parameters: [] }
  const message = [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: ['やあ'] },
    bottom
  ]
  // 会話を含まないページ(場所移動)。宝箱や移動イベントの代わり。
  const move = [{ code: 201, indent: 0, parameters: [0, 2, 5, 5, 0, 0] }, bottom]
  const empty = [bottom]

  const run = function (scope) {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER', [path.join(tmp, 'text'), 'merge', scope])
  }
  const written = function () {
    try { return fs.readdirSync(path.join(tmp, 'text')).sort() } catch (e) { return [] }
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-scope-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, { id: 1, pages: [{ list: message }, { list: move }, { list: empty }] }]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([null, { id: 1, list: empty }]), 'utf8')
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

  it('leaves out the empty pages by default', function () {
    run()

    expect(written()).to.eql(['map001_event001_page1.txt', 'map001_event001_page2.txt'])
  })

  it('writes everything when asked for all', function () {
    run('all')

    expect(written()).to.eql([
      'common001.txt', 'map001_event001_page1.txt', 'map001_event001_page2.txt', 'map001_event001_page3.txt'
    ])
  })

  it('writes only what holds a conversation when asked', function () {
    run('conversation')

    expect(written()).to.eql(['map001_event001_page1.txt'])
  })

  it('writes nothing new for custom, but keeps the texts that exist up to date', function () {
    run('conversation')
    // 会話の無いページのテキストを、利用者が自分で用意した場合
    const kept = path.join(tmp, 'text', '移動イベント.txt')
    fs.writeFileSync(kept, frame2text.renderFrontMatter({ mapId: '1', eventId: '1', pageId: '2' }, 'event'), 'utf8')
    fs.rmSync(path.join(tmp, 'text', 'map001_event001_page1.txt'))

    run('custom')

    // 新しくは作らない。既にあるテキスト(名前は自由)は更新する。
    expect(written()).to.eql(['移動イベント.txt'])
    expect(fs.readFileSync(kept, 'utf8')).to.contain('<Transfer')
  })

  it('accepts the Japanese words for the scope', function () {
    run('会話があるものだけ')

    expect(written()).to.eql(['map001_event001_page1.txt'])
  })
})
