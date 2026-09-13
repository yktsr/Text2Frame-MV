const { expect } = require('chai')
const { bracketProblems } = require('../out/tagBrackets')

const problems = function (text) {
  return bracketProblems(text.split('\n')).map(function (p) { return (p.line + 1) + ':' + p.problem })
}

describe('bracketProblems', function () {
  it('does not count comparison signs in conditions', function () {
    expect(problems([
      '<If: Variables[2], >=, 5>',
      '<If: Variables[2], <=, V[3]>',
      '<If: Variables[2], >, 5>',
      '<If: Variables[2], <, 5>',
      '<If: Variables[2], !=, 5>',
      '<If: Timer, <=, 1, 30>',
      '<If: Gold, <, 100>',
      '<条件分岐: 変数[2], >=, 5>',
      '<End>'
    ].join('\n'))).to.eql([])
  })

  it('does not count what is inside scripts', function () {
    expect(problems([
      '<If: Script, $gameVariables.value(1) > 3 && a < b>',
      '<Set: 1, Script[a > b ? 1 : 2]>',
      '<McScript: this._x > 3>',
      '<script>',
      'if (a > b) { c() }',
      '</script>',
      '<comment>',
      '->',
      '</comment>',
      '% a > b'
    ].join('\n'))).to.eql([])
  })

  it('does not look at message text', function () {
    expect(problems('\\>さようなら\\.\\^\n「ε=┏(*`＞ω<)┛」\nA > B')).to.eql([])
  })

  it('still finds tags that are not closed, or closed twice', function () {
    expect(problems('<Wait: 60\n<Wait: 60>>\n<ChangeName: 6, >\n<If: Variables[2], >=, 5')).to.eql(['1:unclosed', '2:extra', '4:unclosed'])
  })
})
