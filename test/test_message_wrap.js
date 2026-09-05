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
      EnglishTag: 'false'
    }
  },
  registerCommand: function () {}
}
require('../Text2Frame.js')
require('../Frame2Text.js')

/* $gameMessage は画面幅を超えた分を表示できず、黙って切れる。
 * ツクールMVの既定(ウィンドウ816px - 余白18px×2 = 780px、半角14px)で半角55文字ぶん。
 * addMessage はそれを超える文章を自動で折り返す。 */
describe('message wrapping for $gameMessage', function () {
  const LIMIT = 55
  // 禁則(句読点を行頭に落とさない)ではみ出す分。ウィンドウの余白に収まる範囲。
  const SLACK = 2
  const NO_LINE_START = /^[、。！？」』）\]｝}：；,.!?)]/

  const charWidth = function (ch) { return /[⺀-꓏＀-｠￠-￦]/.test(ch) ? 2 : 1 }
  const width = function (s) {
    let w = 0
    for (const ch of String(s)) w += charWidth(ch)
    return w
  }

  const expectFits = function () {
    shown.forEach(function (l) {
      expect(width(l), '表示幅を超えた行: ' + l).to.be.at.most(LIMIT + SLACK)
      expect(NO_LINE_START.test(l), '行頭に句読点が落ちた: ' + l).to.equal(false)
    })
  }

  let tmp
  let cwd
  let mainModule
  let outDir

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-wrap-'))
    // 折り返しが要るほど長い出力先を作る。
    outDir = path.join(tmp, 'とても長い名前のフォルダ', 'and-a-long-ascii-subfolder-name', 'nested')
    fs.mkdirSync(path.join(tmp, 'data'), { recursive: true })
    // 同期は text/ が無いと開始しないので用意しておく。
    fs.mkdirSync(path.join(tmp, 'text'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        pages: [{
          list: [
            { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
            { code: 401, indent: 0, parameters: ['こんにちは'] },
            { code: 0, indent: 0, parameters: [] }
          ]
        }]
      }]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'),
      JSON.stringify([null, { id: 1, list: [{ code: 0, indent: 0, parameters: [] }] }]), 'utf8')
    cwd = process.cwd()
    process.chdir(tmp)
    mainModule = process.mainModule
    process.mainModule = { filename: path.join(tmp, 'game.js') }
    shown.length = 0
  })

  afterEach(function () {
    try { Game_Interpreter.prototype.pluginCommandText2Frame('STOP_DATA_SYNC', []) } catch (e) { /* ignore */ }
    process.mainModule = mainModule
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  // Frame2Text 側(取り出し)。出力先のパスがそのまま入るので長くなりやすい。
  it('wraps a long path message and loses nothing (Frame2Text)', function () {
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER',
      ['merge', outDir, path.join(tmp, 'data')])

    expect(shown.length).to.be.greaterThan(0)
    expectFits()
    // 折り返しは改行を挟むだけで、文字は落とさない。
    expect(shown.join('')).to.contain('[batch] 出力先: ' + outDir)
  })

  // Text2Frame 側(反映)。同じ折り返しを別実装で持っているので両方を確かめる。
  it('wraps a long path message and loses nothing (Text2Frame)', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('BATCH_IMPORT_MESSAGES_FROM_FOLDER',
      ['merge', 'off', outDir])

    expect(shown.length).to.be.greaterThan(0)
    expectFits()
    expect(shown.join('')).to.contain(outDir)
  })

  it('leaves a message that already fits untouched', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('STOP_DATA_SYNC', [])

    // 「同期は動いていません。」は幅に収まるので1行のまま。
    expect(shown).to.have.lengthOf(1)
    expect(width(shown[0])).to.be.at.most(LIMIT)
  })

  // 句点だけが次の行に取り残されると読みにくい。1文字ぶんは余白に収まるのではみ出させる。
  it('does not leave a full stop stranded at the start of a line', function () {
    const syncArgs = ['push', 'merge', 'off', path.join(tmp, 'text'), path.join(tmp, 'data')]
    Game_Interpreter.prototype.pluginCommandText2Frame('START_DATA_SYNC', syncArgs)
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandText2Frame('START_DATA_SYNC', syncArgs)

    const joined = shown.join('')
    expect(joined).to.contain('すでに動いています(push / merge)。')
    expectFits()
  })

  it('keeps the embedded newline of the restart notice as a line break', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('BATCH_IMPORT_MESSAGES_FROM_FOLDER',
      ['merge', 'off', path.join(tmp, 'text')])

    // 反映元が無いので案内は出ないが、出るときは \n が行の区切りになる。
    // ここでは折り返しが幅を壊していないことだけ確かめる。
    expectFits()
  })
})
