const chai = require('chai')
const expect = chai.expect

const text2frame = require('../Text2Frame.js')
const applyThreeWayMerge = text2frame.applyThreeWayMerge

const bottom = { code: 0, indent: 0, parameters: [] }
const msg = function (text) {
  return [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: [text] }
  ]
}
const sw = function (id) { return { code: 121, indent: 0, parameters: [id, id, 0, 0] } }
const texts = function (cmds) { return cmds.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] }) }
const codes = function (cmds) { return cmds.map(function (c) { return c.code }) }

describe('ThreeWayMerge (applyThreeWayMerge) Test', function () {
  it('theirs-only change: takes the writer edit', function () {
    const base = msg('Hello').concat([bottom])
    const ours = msg('Hello').concat([bottom]) // dev unchanged
    const theirs = msg('Bonjour').concat([bottom]) // writer translated
    const res = applyThreeWayMerge(base, ours, theirs)
    expect(texts(res.commands)).to.eql(['Bonjour'])
    expect(res.conflicts).to.equal(0)
  })

  it('ours-only change: keeps the dev structural edit', function () {
    const base = msg('Hello').concat([bottom])
    const ours = msg('Hello').concat([sw(5)]).concat([bottom]) // dev added a switch
    const theirs = msg('Hello').concat([bottom]) // writer unchanged
    const res = applyThreeWayMerge(base, ours, theirs)
    expect(codes(res.commands)).to.include(121) // switch preserved
    expect(res.conflicts).to.equal(0)
  })

  it('both changed different parts: merges both (dev switch + writer text)', function () {
    const base = msg('Hello').concat([bottom])
    const ours = msg('Hello').concat([sw(5)]).concat([bottom]) // dev added switch
    const theirs = msg('Bonjour').concat([bottom]) // writer translated the message
    const res = applyThreeWayMerge(base, ours, theirs)
    expect(texts(res.commands)).to.eql(['Bonjour']) // writer text applied
    expect(codes(res.commands)).to.include(121) // dev switch kept
    expect(res.conflicts).to.equal(0)
  })

  it('both changed the SAME unit differently: keeps both with comment markers', function () {
    const base = msg('Hello').concat([bottom])
    const ours = msg('こんにちは').concat([bottom]) // dev edited the same message
    const theirs = msg('Bonjour').concat([bottom]) // writer edited the same message
    const res = applyThreeWayMerge(base, ours, theirs)
    const t = texts(res.commands)
    expect(t).to.include('Bonjour')
    expect(t).to.include('こんにちは')
    expect(res.conflicts).to.equal(1)
    // comment markers (108) present
    const comments = res.commands.filter(function (c) { return c.code === 108 })
    expect(comments.length).to.be.greaterThan(0)
    // 衝突は conflicts で数えて返す。呼び出し側が件数付きで 1 行出すので、
    // ここで衝突ごとの警告文は積まない(同じ内容が衝突の数だけ重なるため)。
    expect(res.warnings).to.have.lengthOf(0)
  })

  it('does not split a control structure: choice tree stays one unit', function () {
    const choice = [
      { code: 102, indent: 0, parameters: [['A', 'B'], 1, 0, 2, 0] },
      { code: 402, indent: 0, parameters: [0, 'A'] },
      { code: 401, indent: 1, parameters: ['bodyA'] },
      { code: 402, indent: 0, parameters: [1, 'B'] },
      { code: 401, indent: 1, parameters: ['bodyB'] },
      { code: 404, indent: 0, parameters: [] }
    ]
    const base = choice.concat([bottom])
    const ours = choice.concat([sw(9)]).concat([bottom]) // dev added a switch after the choice
    const theirs = choice.concat([bottom]) // writer unchanged
    const res = applyThreeWayMerge(base, ours, theirs)
    expect(codes(res.commands)).to.include(121)
    // choice structure intact: one 102, one 404
    expect(res.commands.filter(function (c) { return c.code === 102 })).to.have.lengthOf(1)
    expect(res.commands.filter(function (c) { return c.code === 404 })).to.have.lengthOf(1)
    expect(res.conflicts).to.equal(0)
  })
})
