const { expect } = require('chai')
const { findSelfSwitchRefs, scanSelfSwitchLines } = require('../out/db/selfSwitchRefs')

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
})
