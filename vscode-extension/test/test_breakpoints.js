const { expect } = require('chai')
const T2F = require('../../Text2Frame.js')
const { alignCommands, commandMark } = require('../out/db/runLines')
const { breakpointAt, readWatch } = require('../out/db/breakpoints')

const compile = (lines) => {
  const r = T2F.compile(lines.join('\n'), { lineMap: true })
  return { commands: r.commands, lineMap: r.lineMap }
}

describe('breakpoints', function () {
  const text = [
    '<Wait: 30>', // 0
    '', // 1
    '<Face: Actor1(0)>', // 2
    'こんにちは', // 3
    '二行目', // 4
    '<Switch: 1, ON>', // 5
    '<If: Switches[1], ON>', // 6
    '<Wait: 10>', // 7
    '<End>' // 8
  ]
  const { commands, lineMap } = compile(text)
  const game = commands.map(commandMark).concat([[0, 0, 0]])
  const same = alignCommands(game, commands.map(commandMark))

  it('maps a line to the game command that runs it', function () {
    expect(breakpointAt(commands, lineMap, same, 0)).to.eql({ game: 0, line: 0 })
    expect(breakpointAt(commands, lineMap, same, 5).game).to.equal(commands.findIndex((c) => c.code === 121))
    expect(breakpointAt(commands, lineMap, same, 7).game).to.equal(commands.findIndex((c) => c.code === 230 && c.parameters[0] === 10))
  })

  it('moves a line without a command to the next one, and a message line to its head', function () {
    const empty = breakpointAt(commands, lineMap, same, 1)
    expect(commands[empty.game].code).to.equal(101)
    const second = breakpointAt(commands, lineMap, same, 4)
    expect(commands[second.game].code).to.equal(101)
    expect(second.line).to.equal(empty.line)
    expect(breakpointAt(commands, lineMap, same, 99)).to.eql({ problem: 'noCommand' })
  })

  it('says so when the game does not have the command', function () {
    const other = compile(['<Wait: 30>', '<PlaySE: Door4, 90, 100, 0>']).commands.map(commandMark)
    expect(breakpointAt(commands, lineMap, alignCommands(other, commands.map(commandMark)), 5)).to.eql({ problem: 'mismatch' })
  })

  it('reads switch and variable expressions to watch', function () {
    expect(readWatch('S12')).to.eql({ kind: 'switch', id: 12 })
    expect(readWatch(' スイッチ 12 ')).to.eql({ kind: 'switch', id: 12 })
    expect(readWatch('Switches[3]')).to.eql({ kind: 'switch', id: 3 })
    expect(readWatch('V5')).to.eql({ kind: 'variable', id: 5 })
    expect(readWatch('\\V[5]')).to.eql({ kind: 'variable', id: 5 })
    expect(readWatch('変数7')).to.eql({ kind: 'variable', id: 7 })
    expect(readWatch('1 + 2')).to.equal(undefined)
  })
})
