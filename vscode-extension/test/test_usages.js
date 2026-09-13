const { expect } = require('chai')
const { usageHits, usageBlocks, bodyStart } = require('../out/db/usages')

describe('usages', function () {
  const lines = [
    '<Switch: 13, ON>',
    'こんにちは',
    '<If: Switches[13], ON>',
    '  <Switch: 1-20, OFF>',
    '<End>',
    '% <Switch: 13, ON>',
    '<script>',
    '$gameSwitches.setValue(13, true)',
    '</script>',
    '<Switch: 130, ON>',
    '<Set: 13, 1>',
    'a',
    'b',
    'c',
    'd',
    '<スイッチ: 13, OFF>'
  ]

  it('finds the number only where it is used as that kind', function () {
    expect(usageHits(lines, 'switch', 13).map(function (h) { return h.line })).to.eql([0, 2, 3, 15])
    expect(usageHits(lines, 'variable', 13).map(function (h) { return h.line })).to.eql([10])
    const hit = usageHits(lines, 'switch', 13)[1]
    expect(lines[2].slice(hit.start, hit.end)).to.equal('13')
    expect(usageHits(['\\V[7] 本文'], 'variable', 7)).to.have.length(1)
  })

  it('adds the lines around each usage and joins the ones that touch', function () {
    const hits = usageHits(lines, 'switch', 13)
    expect(usageBlocks(lines.length, hits, 2).map(function (b) { return [b.from, b.to, b.hits.length] })).to.eql([[0, 5, 3], [13, 15, 1]])
    expect(usageBlocks(lines.length, hits, 0).map(function (b) { return [b.from, b.to] })).to.eql([[0, 0], [2, 3], [15, 15]])
    expect(usageBlocks(3, [], 2)).to.eql([])
  })

  it('leaves the front matter out of the lines around', function () {
    const text = ['---', 'kind: event', 'mapId: 1', '---', '', '<Switch: 13, ON>', 'x']
    expect(bodyStart(text)).to.equal(4)
    expect(bodyStart(['<Switch: 13, ON>'])).to.equal(0)
    expect(bodyStart(['---', 'kind: event'])).to.equal(0)
    const blocks = usageBlocks(text.length, usageHits(text, 'switch', 13), 2, bodyStart(text))
    expect(blocks.map(function (b) { return [b.from, b.to] })).to.eql([[4, 6]])
  })
})
