const chai = require('chai')
const expect = chai.expect

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
globalThis.$gameMessage = { add: function () {} }
/* プラグインパラメータは読み込み時に一度だけ読まれるので、既定を変えたプロジェクトを
 * 模すには require の前に差し替える必要がある。そのためこれだけ別ファイルにしている。 */
globalThis.PluginManager = {
  parameters: function () {
    return {
      'Default Window Position': '上',      // 出荷時は「下」
      'Default Background': '暗くする',      // 出荷時は「ウインドウ」
      'Comment Out Char': '%',
      IsOverwrite: 'false',
      'Default Scenario Folder': 'text',
      'Default Scenario File': 'message.txt',
      'Default Common Event ID': '1',
      'Default MapID': '1',
      'Default EventID': '1',
      'Default PageID': '1',
      IsDebug: 'false',
      DisplayMsg: 'false',
      DisplayWarning: 'false',
      EnglishTag: 'true',
      OmitDefaultTags: 'true'
    }
  },
  registerCommand: function () {}
}
const text2frame = require('../Text2Frame.js')
const frame2text = require('../Frame2Text.js')

/* 省略の基準は「タグが無いとき compile が補う値」でなければならない。
 * 出荷時の既定(ウインドウ/下)を基準にすると、既定を変えているプロジェクトで
 * ゲームの見た目が黙って変わる。これがこの機能でいちばん壊しやすいところ。 */
describe('omitting tags follows the project\'s own defaults', function () {
  const bottom = { code: 0, indent: 0, parameters: [] }
  const msg = function (background, position, text) {
    return [
      { code: 101, indent: 0, parameters: ['', 0, background, position, ''] },
      { code: 401, indent: 0, parameters: [text] }
    ]
  }
  const out = function (list) {
    return frame2text.decompile(list.concat([bottom]), true, { pretty: true })
  }
  const expectRoundTrip = function (list) {
    expect(text2frame.compile(out(list))).to.eql(list)
  }

  it('reads the defaults from the plugin parameters, not the shipped values', function () {
    // 暗くする = 1, 上 = 0
    expect(text2frame.getMessageDefaults()).to.eql({ background: 1, windowPosition: 0 })
  })

  it('omits what this project fills in', function () {
    expect(out(msg(1, 0, 'あ'))).to.equal('あ')
    expectRoundTrip(msg(1, 0, 'あ'))
  })

  it('keeps the shipped defaults, because here they are not the defaults', function () {
    expect(out(msg(0, 2, 'あ'))).to.equal('<Background: Window><WindowPosition: Bottom>\nあ')
    expectRoundTrip(msg(0, 2, 'あ'))
  })
})
