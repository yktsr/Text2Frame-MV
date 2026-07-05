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
require('../Text2Frame.js')

describe('Plugin command MERGE3_MESSAGE_TO_EVENT (name-style router)', function () {
  const oursMap = {
    events: [null, {
      id: 1,
      pages: [{ list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: ['Hello'] },
        { code: 121, indent: 0, parameters: [7, 7, 0, 0] }, // dev-added switch
        { code: 0, indent: 0, parameters: [] }
      ] }]
    }]
  }
  const theirsText = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nBonjour\n'
  const baseText = 'Hello\n'
  let written

  beforeEach(function () {
    written = null
    sinon.stub(fs, 'readFileSync').callsFake(function (p) {
      const s = String(p)
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no auto base') // explicit-base scenarios only
      if (s.indexOf('Map001') !== -1) return JSON.stringify(oursMap)
      if (s.indexOf('ancestor') !== -1) return baseText
      if (s.indexOf('message.txt') !== -1) return theirsText
      throw new Error('unexpected read: ' + s)
    })
    sinon.stub(fs, 'writeFileSync').callsFake(function (p, data) {
      if (String(p).indexOf('Map001') !== -1) written = data
    })
    sinon.stub(fs, 'mkdirSync')
    sinon.stub(console, 'log')
  })
  afterEach(function () { sinon.restore() })

  function eventList () {
    return JSON.parse(written).events[1].pages[0].list
  }
  function texts (list) {
    return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
  }

  it('3-way merges writer text with dev switch when a base is given', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE3_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '1', '1', 'base', 'ancestor.txt'])
    expect(written).to.not.equal(null)
    const list = eventList()
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true)
    expect(texts(list)).to.include('Bonjour')
  })

  it('falls back to overlay (keeps switch) when no base is given', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE3_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '1', '1', '', ''])
    expect(written).to.not.equal(null)
    const list = eventList()
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true)
    expect(texts(list)).to.include('Bonjour')
  })

  it('canonical MERGE_MESSAGE_TO_EVENT (no base) keeps dev switch and updates text', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '1', '1', '', ''])
    expect(written).to.not.equal(null)
    const list = eventList()
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true) // overlay keeps structure
    expect(texts(list)).to.include('Bonjour')
  })

  it('canonical MERGE_MESSAGE_TO_EVENT with base does 3-way (keeps switch, applies text)', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '1', '1', 'base', 'ancestor.txt'])
    expect(written).to.not.equal(null)
    const list = eventList()
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true)
    expect(texts(list)).to.include('Bonjour')
  })
})

describe('Plugin command MERGE_MESSAGE_TO_EVENT on empty target (overwrite path)', function () {
  const emptyMap = {
    events: [null, { id: 1, pages: [{ list: [{ code: 0, indent: 0, parameters: [] }] }] }]
  }
  const theirsText = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\n<Switch: 7, ON>\nBonjour\n'
  let written

  beforeEach(function () {
    written = null
    sinon.stub(fs, 'readFileSync').callsFake(function (p) {
      const s = String(p)
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no auto base')
      if (s.indexOf('Map001') !== -1) return JSON.stringify(emptyMap)
      if (s.indexOf('message.txt') !== -1) return theirsText
      throw new Error('unexpected read: ' + s)
    })
    sinon.stub(fs, 'writeFileSync').callsFake(function (p, data) {
      if (String(p).indexOf('Map001') !== -1) written = data
    })
    sinon.stub(fs, 'mkdirSync')
    sinon.stub(console, 'log')
  })
  afterEach(function () { sinon.restore() })

  it('applies text whole (incl. switch) when target is empty', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '1', '1', '', ''])
    expect(written).to.not.equal(null)
    const list = JSON.parse(written).events[1].pages[0].list
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true) // empty -> overwrite applies switch
    expect(list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })).to.include('Bonjour')
  })
})
