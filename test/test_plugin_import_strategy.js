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

describe('Plugin command MERGE_MESSAGE_TO_EVENT (name-style router)', function () {
  const oursMap = {
    events: [null, {
      id: 1,
      pages: [{ list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: ['Hello'] },
        { code: 121, indent: 0, parameters: [7, 7, 0, 0] }, // dev-added switch
        { code: 0, indent: 0, parameters: [] }
      ] }]
    }, {
      id: 2,
      pages: [{ list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: ['Other event'] },
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
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '1', '1', 'base', 'ancestor.txt'])
    expect(written).to.not.equal(null)
    const list = eventList()
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true)
    expect(texts(list)).to.include('Bonjour')
  })

  it('TOFU when no base is given: text is authoritative, dev switch dropped', function () {
    // 祖先が無い初回反映は現在のゲーム状態を祖先とみなし、完全表現のテキストをそのまま反映する。
    // テキストに無いスイッチ(121)は削除される(overlay 廃止・TOFU 一本化)。
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '1', '1', '', ''])
    expect(written).to.not.equal(null)
    const list = eventList()
    expect(list.some(function (c) { return c.code === 121 })).to.equal(false)
    expect(texts(list)).to.include('Bonjour')
  })

  it('front matter routes MERGE, overriding the arg (front matter eventId 1 wins over arg 2)', function () {
    // front matter は mapId:1 eventId:1 pageId:1。引数 EventID には 2 を渡すが front matter が優先される。
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '2', '1', '', ''])
    expect(written).to.not.equal(null)
    const map = JSON.parse(written)
    // イベント1(front matter の宛先)が反映され、イベント2(引数の宛先)は無傷。
    expect(texts(map.events[1].pages[0].list)).to.include('Bonjour')
    expect(texts(map.events[2].pages[0].list)).to.eql(['Other event'])
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

describe('Plugin command MERGE_MESSAGE_TO_EVENT on empty target WITH a base (regression)', function () {
  // 再現: 同じテキストを一度マージ済み(=祖先が保存されている)で、その後イベントを空にクリアし、
  // 同じテキストを再マージするケース。祖先ありでも空イベントは新規反映され、内容が消えてはいけない。
  const emptyMap = {
    events: [null, { id: 1, pages: [{ list: [{ code: 0, indent: 0, parameters: [] }] }] }]
  }
  const theirsText = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\n<Switch: 7, ON>\nBonjour\n'
  const baseText = 'Bonjour\n' // 前回反映した内容が祖先として残っている想定
  let written

  beforeEach(function () {
    written = null
    sinon.stub(fs, 'readFileSync').callsFake(function (p) {
      const s = String(p)
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no auto base') // explicit-base scenario only
      if (s.indexOf('Map001') !== -1) return JSON.stringify(emptyMap)
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

  it('re-applies text (not empty) even when a base exists', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('MERGE_MESSAGE_TO_EVENT',
      ['text', 'message.txt', '1', '1', '1', 'base', 'ancestor.txt'])
    expect(written).to.not.equal(null)
    const list = JSON.parse(written).events[1].pages[0].list
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true) // switch applied
    expect(list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })).to.include('Bonjour')
  })
})
