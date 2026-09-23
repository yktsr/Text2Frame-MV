/* テストの足場。同じ写しが各スイートに散らないように、ここ1か所に置く。
 *
 * プラグイン本体は読み込み時に PluginManager.parameters() を読み、Game_Interpreter.prototype に
 * コマンドを付ける。だから偽のツクールは「本体を require する前」に置かないといけない。
 *   const { installEngine } = require('./helpers')
 *   const { shown } = installEngine()
 *   const text2frame = require('../Text2Frame.js')
 */

/* ツクールの出荷時の既定と同じ値。変えたい分だけ installEngine に渡す。 */
const DEFAULT_PARAMETERS = {
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

/* 偽のツクールを置く。shown には $gameMessage に出た文、registered には MZ の登録が入る。 */
const installEngine = function (overrides) {
  const parameters = Object.assign({}, DEFAULT_PARAMETERS, overrides || {})
  const shown = []
  const registered = []
  globalThis.Game_Interpreter = {}
  globalThis.Game_Interpreter.prototype = {}
  globalThis.$gameMessage = { add: function (t) { shown.push(String(t)) } }
  globalThis.PluginManager = {
    parameters: function () { return parameters },
    registerCommand: function (plugin, name, fn) { registered.push({ plugin, name, fn }) }
  }
  return { shown, registered, parameters }
}

/* ツクールのコマンド列を作る部品。 */
const bottom = { code: 0, indent: 0, parameters: [] } // 一覧の終わり(書き換えないこと)
const msg = function (text) {
  return [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: [text] }
  ]
}
const texts = function (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}
const markers = function (list) {
  return list.filter(function (c) {
    return (c.code === 108 || c.code === 408) && String(c.parameters[0]).indexOf('===') === 0
  })
}

module.exports = { installEngine, bottom, msg, texts, markers }
