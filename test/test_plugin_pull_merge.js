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
    pages: [{ list: [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['こんにちは'] },
      { code: 0, indent: 0, parameters: [] }
    ] }]
  }]
}
// existing text already translated to Hello
const existingText = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nHello\n'

describe('Frame2Text plugin MERGE_EVENT_TO_MESSAGE (pull keeps translation)', function () {
  let written
  beforeEach(function () {
    written = null
    sinon.stub(fs, 'readFileSync').callsFake(function (p) {
      const s = String(p)
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no base') // no ancestor -> overlay
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

  it('keeps the existing translation (Hello), not the game text (こんにちは)', function () {
    Game_Interpreter.prototype.pluginCommandFrame2Text('MERGE_EVENT_TO_MESSAGE',
      ['text', 'message.txt', '1', '1', '1', '', ''])
    expect(written).to.not.equal(null)
    expect(written.indexOf('Hello')).to.be.greaterThan(-1)
    expect(written.indexOf('こんにちは')).to.equal(-1)
  })
})
