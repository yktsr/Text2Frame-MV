const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
const shown = []
globalThis.$gameMessage = { add: function (t) { shown.push(String(t)) } }
globalThis.PluginManager = {
  parameters: function () {
    return {
      'Default Window Position': 'Bottom',
      'Default Background': 'Window',
      'Default Scenario Folder': 'text',
      'Default Scenario File': 'message.txt',
      'Default Common Event ID': '1',
      'Default MapID': '1',
      'Default EventID': '1',
      'Default PageID': '1',
      IsOverwrite: 'false',
      'Comment Out Char': '%',
      IsDebug: 'false',
      DisplayMsg: 'true',
      DisplayWarning: 'true'
    }
  },
  registerCommand: function () {}
}
require('../Text2Frame.js')

// 3 ファイルとも祖先(.t2f-base)が無い = TOFU 警告が 3 回発生する状況を作る。
describe('BATCH_IMPORT_MESSAGES_FROM_FOLDER warning aggregation', function () {
  const textRoot = path.resolve('/virt/text/ja')
  const eventPage = function (line) {
    return { list: [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [line] },
      { code: 0, indent: 0, parameters: [] }
    ] }
  }
  const mapData = {
    events: [null,
      { id: 1, pages: [eventPage('Hello 1')] },
      { id: 2, pages: [eventPage('Hello 2')] },
      { id: 3, pages: [eventPage('Hello 3')] }
    ]
  }
  const textFor = function (eventId) {
    return '---\nkind: event\nmapId: 1\neventId: ' + eventId + '\npageId: 1\nlocale: ja\n---\n\nBonjour ' + eventId + '\n'
  }

  beforeEach(function () {
    shown.length = 0
    sinon.stub(fs, 'readdirSync').callsFake(function (dir) {
      if (String(dir) === textRoot) return ['e1.txt', 'e2.txt', 'e3.txt']
      return []
    })
    sinon.stub(fs, 'statSync').callsFake(function () {
      return { isDirectory: function () { return false }, isFile: function () { return true } }
    })
    sinon.stub(fs, 'readFileSync').callsFake(function (p) {
      const s = String(p)
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no ancestor') // 祖先なし = TOFU
      const m = s.match(/e(\d)\.txt$/)
      if (m) return textFor(m[1])
      if (s.indexOf('Map001') !== -1) return JSON.stringify(mapData)
      throw new Error('unexpected read: ' + s)
    })
    sinon.stub(fs, 'existsSync').returns(false)
    sinon.stub(fs, 'mkdirSync').returns(undefined)
    sinon.stub(fs, 'writeFileSync').returns(undefined)
  })

  afterEach(function () {
    sinon.restore()
  })

  const runBatch = function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('BATCH_IMPORT_MESSAGES_FROM_FOLDER', [textRoot, 'merge'])
  }
  const countShown = function (needle) {
    return shown.filter(function (t) { return t.indexOf(needle) !== -1 }).length
  }

  it('shows a repeated warning once with its count, not once per file', function () {
    runBatch()

    const tofu = shown.filter(function (t) { return t.indexOf('初回反映') !== -1 })
    expect(tofu).to.have.lengthOf(1)
    expect(tofu[0]).to.match(/^\[3件\] /)
    expect(countShown('Completed: 3 success, 0 errors')).to.equal(1)
  })

  it('shows the restart notice once and no per-file success lines', function () {
    runBatch()

    expect(countShown('開き直してください')).to.equal(1)
    expect(countShown('書き出し成功')).to.equal(0)
  })

  it('skips the restart notice when nothing was applied', function () {
    fs.readdirSync.restore()
    sinon.stub(fs, 'readdirSync').returns([])

    runBatch()

    expect(countShown('開き直してください')).to.equal(0)
    expect(countShown('Completed: 0 success, 0 errors')).to.equal(1)
  })
})
