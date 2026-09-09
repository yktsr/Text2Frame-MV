const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
const shown = []
globalThis.$gameMessage = { add: function (t) { shown.push(String(t)) } }

const BASE_PARAMS = {
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
  EnglishTag: 'false'
}

/* プラグイン設定は読み込み時に一度だけ読まれるので、設定ごとに読み直す。 */
const loadFrame2Text = function (extra) {
  globalThis.PluginManager = {
    parameters: function () { return Object.assign({}, BASE_PARAMS, extra) },
    registerCommand: function () {}
  }
  const p = require.resolve('../Frame2Text.js')
  delete require.cache[p]
  require(p)
}

/* 「警告文表示」は取り出しでも効く(ヘルプにそう書いてある)。
 * 「メッセージ表示」を切っても警告は残る。 */
describe('Frame2Text DisplayWarning', function () {
  let tmp
  let dataDir
  let outDir
  let cwd

  const runExport = function () {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER',
      ['overwrite', outDir, dataDir])
    return shown.join('')
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-warn-'))
    // 祖先(.t2f-base)の置き場所は cwd 基準。リポジトリを汚さないよう移しておく。
    cwd = process.cwd()
    process.chdir(tmp)
    dataDir = path.join(tmp, 'data')
    outDir = path.join(tmp, 'text')
    fs.mkdirSync(dataDir)
    // 取り出す対象が1件も無い状態。警告だけが出る。
    fs.writeFileSync(path.join(dataDir, 'CommonEvents.json'), JSON.stringify([null]), 'utf8')
  })

  afterEach(function () {
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  // この設定が無かった頃に導入したプロジェクトでは保存値が無い。黙って消さない。
  it('shows warnings when the parameter has never been saved', function () {
    loadFrame2Text({})
    expect(runExport()).to.contain('取り出し対象が見つかりませんでした')
  })

  it('shows warnings when it is on', function () {
    loadFrame2Text({ DisplayWarning: 'true' })
    expect(runExport()).to.contain('取り出し対象が見つかりませんでした')
  })

  it('hides warnings when it is off', function () {
    loadFrame2Text({ DisplayWarning: 'false' })
    expect(runExport()).to.equal('')
  })

  it('keeps warnings when only DisplayMsg is off', function () {
    loadFrame2Text({ DisplayMsg: 'false', DisplayWarning: 'true' })
    expect(runExport()).to.contain('取り出し対象が見つかりませんでした')
  })

  it('hides the ordinary report when DisplayMsg is off', function () {
    // 取り出せる対象を1件用意する。完了報告(通常のメッセージ)が出る条件。
    fs.writeFileSync(path.join(dataDir, 'CommonEvents.json'), JSON.stringify([null, {
      id: 1,
      list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: ['こんにちは'] },
        { code: 0, indent: 0, parameters: [] }
      ]
    }]), 'utf8')

    loadFrame2Text({ DisplayMsg: 'true', DisplayWarning: 'true' })
    expect(runExport()).to.contain('取り出し完了')

    loadFrame2Text({ DisplayMsg: 'false', DisplayWarning: 'true' })
    expect(runExport()).to.not.contain('取り出し完了')
  })
})
