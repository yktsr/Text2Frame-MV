const { expect } = require('chai')
const { findSelfSwitchRefs, scanSelfSwitchLines, eventSelfSwitchLetters } = require('../out/db/selfSwitchRefs')

const letters = function (text) {
  return findSelfSwitchRefs(text).map(function (r) { return [r.letter, text.slice(r.start, r.end)] })
}

describe('selfSwitchRefs', function () {
  it('finds the letter in the self switch tags', function () {
    expect(letters('<SelfSwitch: A, ON>')).to.eql([['A', 'A']])
    expect(letters('<SSW: b, OFF>')).to.eql([['B', 'b']])
    expect(letters('<セルフスイッチ: C, オン>')).to.eql([['C', 'C']])
    expect(letters('<selfswitch : c , on>')).to.eql([['C', 'c']])
    expect(letters('<If: SelfSwitches[D], ON>')).to.eql([['D', 'D']])
    expect(letters('<条件分岐: セルフスイッチ[a], オフ>')).to.eql([['A', 'a']])
    expect(letters('<If: SSW[C], OFF>')).to.eql([['C', 'C']])
  })

  it('finds nothing in other tags', function () {
    expect(letters('<Switch: 1, ON>')).to.eql([])
    expect(letters('<SelfSwitch: E, ON>')).to.eql([])
    expect(letters('<If: Switches[1], ON>')).to.eql([])
    expect(letters('セルフスイッチAをONにする')).to.eql([])
  })

  it('skips % lines and blocks', function () {
    const lines = ['<SelfSwitch: A, ON>', '% <SelfSwitch: B, ON>', '<comment>', '<SelfSwitch: C, ON>', '</comment>', '  <If: SelfSwitches[D], ON>']
    expect(scanSelfSwitchLines(lines).map(function (r) { return [r.line, r.letter] })).to.eql([[0, 'A'], [5, 'D']])
  })

  it('tells which self switches an event uses in its pages', function () {
    const page = function (conditions, list) { return { conditions: conditions, list: list } }
    const event = {
      pages: [
        page({ selfSwitchValid: false, selfSwitchCh: 'A' }, [{ code: 123, parameters: ['B', 0] }, { code: 0, parameters: [] }]),
        page({ selfSwitchValid: true, selfSwitchCh: 'C' }, [{ code: 111, parameters: [2, 'D', 0] }, { code: 111, parameters: [0, 5, 0] }])
      ]
    }
    expect(eventSelfSwitchLetters(event)).to.eql(['B', 'C', 'D'])
    expect(eventSelfSwitchLetters({ pages: [page({ selfSwitchValid: false, selfSwitchCh: 'A' }, [{ code: 101, parameters: [] }])] })).to.eql([])
    expect(eventSelfSwitchLetters(null)).to.eql([])
    expect(eventSelfSwitchLetters({ pages: [null, { list: [null] }] })).to.eql([])
  })
})

describe('selfSwitchRefs writes', function () {
  it('marks where a self switch is changed, and not where it is read', function () {
    expect(findSelfSwitchRefs('<SelfSwitch: A, ON>').map((r) => [r.letter, !!r.write])).to.eql([['A', true]])
    expect(findSelfSwitchRefs('<If: SelfSwitches[B], ON>').map((r) => [r.letter, !!r.write])).to.eql([['B', false]])
  })
})
