const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const { commandMark, alignCommands, locateCommand, commandLines, stableJson } = require('../out/db/runLines')

const T2F = require('../../Text2Frame.js')
const compile = function (text) { return (T2F.compile || T2F.default.compile)(text, { lineMap: true }) }
const marks = function (commands) { return commands.map(commandMark) }
const END = { code: 0, indent: 0, parameters: [] }

describe('runLines', function () {
  const text = [
    '<Switch: 1, ON>',
    'やあ',
    'こんにちは',
    '<Wait: 30>',
    '<CommonEvent: 3>',
    '<Switch: 2, OFF>'
  ].join('\n')

  it('writes objects the same way whatever the key order', function () {
    expect(stableJson({ b: 1, a: [2, { d: null, c: undefined }] })).to.equal('{"a":[2,{"d":null}],"b":1}')
    expect(commandMark({ code: 1, indent: 0, parameters: [{ x: 1, y: 2 }] })).to.eql(commandMark({ code: 1, indent: 0, parameters: [{ y: 2, x: 1 }] }))
    expect(commandMark({ code: 1, indent: 0, parameters: [1] })).to.not.eql(commandMark({ code: 1, indent: 0, parameters: [2] }))
  })

  it('matches every command when the game has what the text makes', function () {
    const { commands } = compile(text)
    const game = marks(commands.concat([END]))
    const alignment = alignCommands(game, marks(commands))
    expect(alignment.slice(0, commands.length)).to.eql(commands.map(function (_c, i) { return i }))
    expect(locateCommand(alignment, commands.length)).to.eql({ index: commands.length - 1, exact: false })
  })

  it('follows lines that were added or removed after the game got the event', function () {
    const before = compile(text).commands
    const after = compile(text.replace('<Wait: 30>', '<Wait: 30>\n<Wait: 60>\n<Wait: 90>').replace('<Switch: 1, ON>\n', '')).commands
    const alignment = alignCommands(marks(before.concat([END])), marks(after))
    const common = before.findIndex(function (c) { return c.code === 117 })
    const target = locateCommand(alignment, common)
    expect(target.exact).to.equal(true)
    expect(after[target.index].code).to.equal(117)
    expect(locateCommand(alignment, 0)).to.eql({ index: 0, exact: false })
  })

  it('pairs commands whose values changed by their kind', function () {
    const before = compile(text).commands
    const after = compile(text.replace('<Wait: 30>', '<Wait: 45>')).commands
    const wait = before.findIndex(function (c) { return c.code === 230 })
    expect(locateCommand(alignCommands(marks(before), marks(after)), wait)).to.eql({ index: wait, exact: true })
  })

  it('goes back to the first line of a message', function () {
    const { commands, lineMap } = compile(text)
    const last401 = commands.map(function (c) { return c.code }).lastIndexOf(401)
    expect(commandLines(commands, lineMap, last401)).to.eql({ from: lineMap[last401 - 2], to: lineMap[last401] })
    const wait = commands.findIndex(function (c) { return c.code === 230 })
    expect(commandLines(commands, lineMap, wait)).to.eql({ from: lineMap[wait], to: lineMap[wait] })
    expect(commandLines(commands, lineMap, 99)).to.equal(undefined)
  })

  it('matches real texts with themselves, quickly', function () {
    const dir = path.join(__dirname, '..', '..', '250901_アクアリウムは踊らない_日本語_1', 'text')
    if (!fs.existsSync(dir)) this.skip()
    const files = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.txt') }).sort().slice(0, 300)
    let checked = 0
    for (const f of files) {
      const body = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '')
      let commands
      try { commands = compile(body).commands } catch (e) { continue }
      const m = marks(commands)
      const alignment = alignCommands(m.concat([commandMark(END)]), m)
      expect(alignment.slice(0, m.length).every(function (v, i) { return v === i }), f).to.equal(true)
      const shifted = alignCommands(m.concat([commandMark(END)]), [commandMark({ code: 108, indent: 0, parameters: ['x'] })].concat(m))
      expect(shifted.slice(0, m.length).every(function (v, i) { return v === i + 1 }), f).to.equal(true)
      checked++
    }
    expect(checked).to.be.greaterThan(100)
  })
})
