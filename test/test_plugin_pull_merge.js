const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
globalThis.$gameMessage = { add: function () {} }
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
      IsDebug: 'false'
    }
  },
  registerCommand: function () {}
}
// Pre-load both modules before fs is stubbed (Frame2Text lazy-requires Text2Frame at runtime;
// stubbing fs.readFileSync would otherwise break the module loader).
require('../Text2Frame.js')
require('../Frame2Text.js')

// game event 1: こんにちは (untranslated in game)
const gameMap = {
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
}
// existing text already translated to Hello
const existingText = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nHello\n'

describe('Frame2Text plugin EXPORT_EVENT_TO_MESSAGE with strategy=merge (pull without ancestor)', function () {
  let written
  beforeEach(function () {
    written = null
    sinon.stub(fs, 'readFileSync').callsFake(function (p) {
      const s = String(p)
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no base') // no ancestor -> overwrite text from game
      if (s.indexOf('Map001') !== -1) return JSON.stringify(gameMap)
      if (s.indexOf('message.txt') !== -1) return existingText
      throw new Error('unexpected read: ' + s)
    })
    sinon.stub(fs, 'writeFileSync').callsFake(function (p, data) {
      const s = String(p)
      if (s.indexOf('message.txt') !== -1 && s.indexOf('.t2f-base') === -1) written = String(data)
    })
    sinon.stub(fs, 'mkdirSync')
    sinon.stub(fs, 'existsSync').returns(true)
    sinon.stub(console, 'error')
  })
  afterEach(function () { sinon.restore() })

  it('no ancestor → overwrites text from game (overlay removed; translation not preserved)', function () {
    // overlay 廃止により、祖先が無い pull はゲーム内容でテキストを生成する。
    // 翻訳を保つには先に export で祖先を作る必要がある(3-way は test_sync_controller で担保)。
    Game_Interpreter.prototype.pluginCommandFrame2Text('EXPORT_EVENT_TO_MESSAGE',
      ['text', 'message.txt', '1', '1', '1', 'merge', '', ''])
    expect(written).to.not.equal(null)
    expect(written.indexOf('こんにちは')).to.be.greaterThan(-1)
    expect(written.indexOf('Hello')).to.equal(-1)
  })
})

/* コメント行(%)は取り出しでも消えていた。テキストを作り直す以上、統合でも全上書きでも
 * 元テキストが手元にあるので戻せる。% はゲームに入らないので、「ゲームの内容で全部
 * 置き換える」という全上書きの約束の対象外(置き換える相手が存在しない)。 */
describe('pull keeps the comment lines', function () {
  const withComments = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\n% 一幕: 酒場\nHello\n'
  let written
  beforeEach(function () {
    written = null
    sinon.stub(fs, 'readFileSync').callsFake(function (p) {
      const s = String(p)
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no base')
      if (s.indexOf('Map001') !== -1) return JSON.stringify(gameMap)
      if (s.indexOf('message.txt') !== -1) return withComments
      throw new Error('unexpected read: ' + s)
    })
    sinon.stub(fs, 'writeFileSync').callsFake(function (p, data) {
      const s = String(p)
      if (s.indexOf('message.txt') !== -1 && s.indexOf('.t2f-base') === -1) written = String(data)
    })
    sinon.stub(fs, 'mkdirSync')
    sinon.stub(fs, 'existsSync').returns(true)
    sinon.stub(console, 'error')
  })
  afterEach(function () { sinon.restore() })

  it('merge keeps them', function () {
    Game_Interpreter.prototype.pluginCommandFrame2Text('EXPORT_EVENT_TO_MESSAGE',
      ['text', 'message.txt', '1', '1', '1', 'merge', '', ''])

    expect(written).to.contain('% 一幕: 酒場')
    expect(written).to.contain('こんにちは')
  })

  it('overwrite keeps them too', function () {
    Game_Interpreter.prototype.pluginCommandFrame2Text('EXPORT_EVENT_TO_MESSAGE',
      ['text', 'message.txt', '1', '1', '1', 'overwrite', '', ''])

    expect(written).to.contain('% 一幕: 酒場')
    expect(written).to.contain('こんにちは')
    // 全上書きなので本文はゲームの内容だけ。残るのはコメントだけ。
    expect(written).to.not.contain('Hello')
  })
})
