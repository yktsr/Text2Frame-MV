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
require('../Frame2Text.js')

function msgEvent (line) {
  return { id: 1, pages: [{ list: [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: [line] },
    { code: 0, indent: 0, parameters: [] }
  ] }] }
}

describe('BATCH_EXPORT_MESSAGES_TO_FOLDER report', function () {
  let tmp
  let cwd
  const run = function (dataDir, textBase, locale) {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER', [dataDir, textBase, locale])
  }
  const line = function (needle) {
    return shown.filter(function (t) { return t.indexOf(needle) !== -1 })[0]
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-report-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'),
      JSON.stringify({ events: [null, msgEvent('こんにちは'), msgEvent('やあ')] }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'),
      JSON.stringify([null, { id: 1, list: [{ code: 0, indent: 0, parameters: [] }] }]), 'utf8')
    // .t2f-base は cwd 基準で作られるので、リポジトリを汚さないよう tmp に移る。
    cwd = process.cwd()
    process.chdir(tmp)
  })

  afterEach(function () {
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('reports the count, the kind breakdown and the output directory', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'ja')

    const summary = line('取り出し完了')
    expect(summary).to.match(/成功 3件 \(イベント 2 \/ コモン 1\)、失敗 0件/)
    expect(line('出力先')).to.contain(path.join(tmp, 'text', 'ja'))
    expect(fs.existsSync(path.join(tmp, 'text', 'ja', 'map001_event001_page1.txt'))).to.equal(true)
  })

  it('says how many existing text files were overwritten, and only when it happened', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'ja')
    expect(line('上書きしました')).to.equal(undefined)

    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'ja')
    expect(line('上書きしました')).to.contain('既存テキスト 3件')
  })

  it('names the data folder when it cannot be read', function () {
    run(path.join(tmp, 'missing'), path.join(tmp, 'text'), 'ja')

    expect(line('データフォルダを読めませんでした')).to.contain(path.join(tmp, 'missing'))
    expect(line('取り出し完了')).to.equal(undefined)
  })

  it('says so when the data folder holds no targets', function () {
    const empty = path.join(tmp, 'empty')
    fs.mkdirSync(empty)
    run(empty, path.join(tmp, 'text'), 'ja')

    expect(line('取り出し対象が見つかりませんでした')).to.contain(empty)
  })

  it('skips targets whose game side still has conflict markers, and keeps their text', function () {
    const marker = function (text) { return { code: 108, indent: 0, parameters: [text] } }
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, msgEvent('こんにちは'), {
        id: 2,
        pages: [{ list: [
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          { code: 401, indent: 0, parameters: ['やあ'] },
          marker('=== テキストの変更 / from text ==='),
          marker('=== ゲームの変更 / from game ==='),
          marker('=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ==='),
          { code: 0, indent: 0, parameters: [] }
        ] }]
      }]
    }), 'utf8')
    const kept = path.join(tmp, 'text', 'ja', 'map001_event002_page1.txt')
    fs.mkdirSync(path.dirname(kept), { recursive: true })
    fs.writeFileSync(kept, 'これは残るべき翻訳\n', 'utf8')

    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'ja')

    expect(line('取り出し完了')).to.contain('衝突未解決で除外 1件')
    expect(line('衝突未解決で取り出さなかったファイル')).to.contain('map001_event002_page1')
    // 除外したファイルのテキストと祖先は触っていない。
    expect(fs.readFileSync(kept, 'utf8')).to.equal('これは残るべき翻訳\n')
    expect(fs.existsSync(path.join(tmp, '.t2f-base', 'ja', 'map001_event002_page1.txt'))).to.equal(false)
  })

  it('reports each failing key with its reason', function () {
    fs.writeFileSync(path.join(tmp, 'data', 'Map002.json'),
      JSON.stringify({ events: [null, msgEvent('だめ')] }), 'utf8')
    // 出力先をディレクトリで塞いで、その 1 件だけ書き出しに失敗させる。
    fs.mkdirSync(path.join(tmp, 'text', 'ja', 'map002_event001_page1.txt'), { recursive: true })

    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'ja')

    expect(line('取り出し完了')).to.contain('失敗 1件')
    expect(line('失敗: map002_event001_page1')).to.contain('EISDIR')
  })
})
