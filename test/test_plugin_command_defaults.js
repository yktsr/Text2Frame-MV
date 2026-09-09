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
      // 省略した引数はここへ戻る。取り違えが分かるよう、どれも 1 にしておく。
      'Default Scenario Folder': 'text',
      'Default Scenario File': 'message.txt',
      'Default Common Event ID': '1',
      'Default MapID': '1',
      'Default EventID': '1',
      'Default PageID': '1',
      IsDebug: 'false',
      DisplayMsg: 'true',
      DisplayWarning: 'false',
      WriteBackAfterMerge: 'off'
    }
  },
  registerCommand: function () {}
}
require('../Text2Frame.js')

/* MV のプラグインコマンドは引数を手書きするので、後ろの引数をまるごと省ける。
 * 省いた枠は「直前の実行が入れた値」ではなくプラグインパラメータに戻らなければならない
 * (ヘルプの「プラグインパラメータで指定した…とは違うパラメータで実行できる」)。 */
describe('MV plugin command: omitted arguments fall back to the plugin parameters', function () {
  let tmp
  let cwd
  let mainModule

  const page = function (line) {
    return {
      list: line
        ? [{ code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
            { code: 401, indent: 0, parameters: [line] },
            { code: 0, indent: 0, parameters: [] }]
        : [{ code: 0, indent: 0, parameters: [] }]
    }
  }
  const event = function (id) { return { id, name: 'EV' + id, pages: [page(), page()] } }

  const mapFile = function (n) { return path.join(tmp, 'data', 'Map' + ('000' + n).slice(-3) + '.json') }
  const texts = function (list) {
    return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
  }
  // マップ n のイベント e ページ p の本文。
  const eventTexts = function (n, e, p) {
    const map = JSON.parse(fs.readFileSync(mapFile(n), 'utf8'))
    return texts(map.events[e].pages[p - 1].list)
  }
  const commonTexts = function (id) {
    const ce = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'CommonEvents.json'), 'utf8'))
    return texts(ce[id].list)
  }
  const write = function (rel, body) { fs.writeFileSync(path.join(tmp, rel), body, 'utf8') }
  const run = function (command, args) {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandText2Frame(command, args)
  }
  const said = function (needle) {
    const all = shown.join('')
    return all.indexOf(needle) !== -1
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-defaults-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.mkdirSync(path.join(tmp, 'text'))
    fs.mkdirSync(path.join(tmp, 'batch'))
    for (let n = 1; n <= 3; n++) {
      fs.writeFileSync(mapFile(n), JSON.stringify({ events: [null, event(1), event(2), event(3)] }), 'utf8')
    }
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'),
      JSON.stringify([null, { id: 1, list: page().list }, { id: 2, list: page().list }, { id: 3, list: page().list }]),
      'utf8')
    // 見出し情報を持たないテキスト。行き先は引数とパラメータだけで決まる。
    write('text/a.txt', 'AAA\n')
    write('text/b.txt', 'BBB\n')
    write('text/message.txt', 'CCC\n')

    mainModule = process.mainModule
    process.mainModule = { filename: path.join(tmp, 'game.js') }
    cwd = process.cwd()
    process.chdir(tmp)
  })

  afterEach(function () {
    process.chdir(cwd)
    process.mainModule = mainModule
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('does not inherit the destination from the preceding import (event)', function () {
    run('IMPORT_MESSAGE_TO_EVENT', ['text', 'a.txt', '3', '2', '2', 'overwrite'])
    expect(eventTexts(3, 2, 2)).to.eql(['AAA'])

    // 行き先を1つも書いていない。パラメータの 1/1/1 に戻るべき。
    run('IMPORT_MESSAGE_TO_EVENT', ['text', 'b.txt', undefined, undefined, undefined, 'overwrite'])

    expect(eventTexts(1, 1, 1)).to.eql(['BBB'])
    expect(eventTexts(3, 2, 2)).to.eql(['AAA']) // 前回の行き先は無傷
  })

  it('does not inherit the destination from the preceding import (common event)', function () {
    run('IMPORT_MESSAGE_TO_CE', ['text', 'a.txt', '3', 'overwrite'])
    expect(commonTexts(3)).to.eql(['AAA'])

    run('IMPORT_MESSAGE_TO_CE', ['text', 'b.txt', undefined, 'overwrite'])

    expect(commonTexts(1)).to.eql(['BBB'])
    expect(commonTexts(3)).to.eql(['AAA'])
  })

  it('does not inherit the folder and file name either', function () {
    run('IMPORT_MESSAGE_TO_EVENT', ['text', 'a.txt', '1', '1', '1', 'overwrite'])
    expect(eventTexts(1, 1, 1)).to.eql(['AAA'])

    // 反映元も省略。パラメータの text/message.txt に戻るべき。
    run('IMPORT_MESSAGE_TO_EVENT', [undefined, undefined, '1', '1', '1', 'overwrite'])

    expect(eventTexts(1, 1, 1)).to.eql(['CCC'])
  })

  /* 反映先のパスは MapID とは別に持っている。フォルダ名とファイル名を省くと
   * そちらだけ据え置かれ、MapID に入れた値が使われないことがあった。 */
  it('writes to the map the argument names, even when the folder is omitted', function () {
    run('IMPORT_MESSAGE_TO_EVENT', ['', '', '3', '2', '2', 'overwrite'])

    expect(eventTexts(3, 2, 2)).to.eql(['CCC'])
    // 指定していないマップは触らない。
    expect(eventTexts(1, 2, 2)).to.eql([])
    expect(eventTexts(1, 1, 1)).to.eql([])
  })

  it('reports the map it actually wrote to', function () {
    run('IMPORT_MESSAGE_TO_EVENT', ['', '', '3', '2', '2', 'overwrite'])

    expect(said('MapID: 3')).to.equal(true)
    expect(eventTexts(3, 2, 2)).to.eql(['CCC'])
  })

  /* 一括反映は COMMAND_LINE 経由で反映先を直接渡す。その値が残っていると、
   * 続けて実行した単発の反映が一括の最後のファイルの行き先を引き継いでしまう。 */
  it('does not inherit the destination from a preceding batch import', function () {
    write('batch/one.txt', '---\nkind: event\nmapId: 2\neventId: 3\npageId: 1\n---\n\nBATCH\n')
    run('BATCH_IMPORT_MESSAGES_FROM_FOLDER', [path.join(tmp, 'batch'), 'overwrite', 'off'])
    expect(eventTexts(2, 3, 1)).to.eql(['BATCH'])

    run('IMPORT_MESSAGE_TO_EVENT', ['text', 'b.txt', undefined, undefined, undefined, 'overwrite'])

    expect(eventTexts(1, 1, 1)).to.eql(['BBB'])
    expect(eventTexts(2, 3, 1)).to.eql(['BATCH'])
  })

  // 見出し情報による振り分けは仕様。引数より優先されることを固定しておく。
  it('still lets the front matter route the import, over the arguments', function () {
    write('text/fm.txt', '---\nkind: event\nmapId: 2\neventId: 3\npageId: 1\n---\n\nFM\n')

    run('IMPORT_MESSAGE_TO_EVENT', ['text', 'fm.txt', '3', '2', '2', 'overwrite'])

    expect(eventTexts(2, 3, 1)).to.eql(['FM'])
    expect(eventTexts(3, 2, 2)).to.eql([])
  })
})
