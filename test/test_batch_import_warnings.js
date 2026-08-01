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

describe('BATCH_IMPORT_MESSAGES_FROM_FOLDER report', function () {
  const textRoot = path.resolve('/virt/text/ja')
  const eventPage = function (list) { return { list } }
  const msg = function (line) {
    return [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [line] }
    ]
  }
  const bottom = { code: 0, indent: 0, parameters: [] }
  const mapData = {
    events: [null,
      { id: 1, pages: [eventPage(msg('Hello 1').concat([bottom]))] },
      { id: 2, pages: [eventPage(msg('Hello 2').concat([bottom]))] },
      { id: 3, pages: [eventPage(msg('Hello 3').concat([bottom]))] }
    ]
  }
  const textFor = function (eventId) {
    return '---\nkind: event\nmapId: 1\neventId: ' + eventId + '\npageId: 1\nlocale: ja\n---\n\nBonjour ' + eventId + '\n'
  }

  // 既定は「祖先なし = TOFU 警告が全ファイルで出る」状況。個別テストで上書きする。
  let entries = ['e1.txt', 'e2.txt', 'e3.txt']
  let readText = function (s) {
    if (s.indexOf('.t2f-base') !== -1) throw new Error('no ancestor')
    const m = s.match(/e(\d)\.txt$/)
    if (m) return textFor(m[1])
    if (s.indexOf('Map001') !== -1) return JSON.stringify(mapData)
    throw new Error('unexpected read: ' + s)
  }

  beforeEach(function () {
    shown.length = 0
    entries = ['e1.txt', 'e2.txt', 'e3.txt']
    sinon.stub(fs, 'readdirSync').callsFake(function (dir) {
      return String(dir) === textRoot ? entries : []
    })
    sinon.stub(fs, 'statSync').callsFake(function () {
      return { isDirectory: function () { return false }, isFile: function () { return true } }
    })
    sinon.stub(fs, 'readFileSync').callsFake(function (p) { return readText(String(p)) })
    // 反映元フォルダだけ存在する扱い(祖先やバックアップは無い)。
    sinon.stub(fs, 'existsSync').callsFake(function (p) { return String(p) === textRoot })
    sinon.stub(fs, 'mkdirSync').returns(undefined)
    sinon.stub(fs, 'writeFileSync').returns(undefined)
  })

  afterEach(function () {
    sinon.restore()
    readText = function (s) {
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no ancestor')
      const m = s.match(/e(\d)\.txt$/)
      if (m) return textFor(m[1])
      if (s.indexOf('Map001') !== -1) return JSON.stringify(mapData)
      throw new Error('unexpected read: ' + s)
    }
  })

  const runBatch = function (root) {
    Game_Interpreter.prototype.pluginCommandText2Frame('BATCH_IMPORT_MESSAGES_FROM_FOLDER', [root || textRoot, 'merge'])
  }
  const countShown = function (needle) {
    return shown.filter(function (t) { return t.indexOf(needle) !== -1 }).length
  }
  const line = function (needle) {
    return shown.filter(function (t) { return t.indexOf(needle) !== -1 })[0]
  }

  it('shows a repeated warning once with its count, not once per file', function () {
    runBatch()

    const tofu = shown.filter(function (t) { return t.indexOf('初回反映') !== -1 })
    expect(tofu).to.have.lengthOf(1)
    expect(tofu[0]).to.match(/^\[3件\] /)
  })

  it('shows the restart notice once and no per-file success lines', function () {
    runBatch()

    expect(countShown('開き直してください')).to.equal(1)
    expect(countShown('書き出し成功')).to.equal(0)
  })

  it('reports the count, the kind breakdown and the source folder', function () {
    runBatch()

    expect(line('反映完了')).to.contain('成功 3件 (イベント 3 / コモン 0)、失敗 0件')
    expect(line('反映元')).to.contain(textRoot)
  })

  it('counts text files without front matter as skipped', function () {
    entries = ['e1.txt', 'e2.txt', 'e3.txt', 'memo.txt']
    const prev = readText
    readText = function (s) { return /memo\.txt$/.test(s) ? 'ただのメモ\n' : prev(s) }

    runBatch()

    expect(line('反映完了')).to.contain('見出し情報なしで対象外 1件')
  })

  it('names the files that still have conflicts', function () {
    // 祖先あり・ゲームとテキストが同じ位置に別々の追加 => 衝突
    const conflictMap = {
      events: [null, { id: 1, pages: [eventPage(msg('Hello').concat([{ code: 121, indent: 0, parameters: [7, 7, 0, 0] }, bottom]))] }]
    }
    entries = ['e1.txt']
    readText = function (s) {
      if (s.indexOf('.t2f-base') !== -1) return '---\nkind: event\n---\n\nHello\n'
      if (/e1\.txt$/.test(s)) return '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\nlocale: ja\n---\n\nHello\n\nBonjour\n'
      if (s.indexOf('Map001') !== -1) return JSON.stringify(conflictMap)
      throw new Error('unexpected read: ' + s)
    }

    runBatch()

    expect(line('衝突が未解決のファイル')).to.contain('e1')
    expect(line('祖先(.t2f-base)を更新していません')).to.be.a('string')
  })

  it('names each failing file with its reason', function () {
    entries = ['e1.txt', 'broken.txt']
    const prev = readText
    readText = function (s) {
      // kind はあるが eventId が無い => applyTextFile がエラーを返す
      if (/broken\.txt$/.test(s)) return '---\nkind: event\nmapId: 1\nlocale: ja\n---\n\nどこへ？\n'
      return prev(s)
    }

    runBatch()

    expect(line('反映完了')).to.contain('失敗 1件')
    expect(line('失敗: broken')).to.contain('eventId is required')
  })

  it('says so when the source folder is missing or empty', function () {
    runBatch(path.resolve('/virt/missing'))
    expect(line('反映元フォルダが見つかりません')).to.contain('missing')
    expect(line('反映完了')).to.equal(undefined)

    shown.length = 0
    entries = []
    runBatch()
    expect(line('テキストが見つかりませんでした')).to.contain(textRoot)
  })
})
