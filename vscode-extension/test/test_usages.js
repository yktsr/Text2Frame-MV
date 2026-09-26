const { expect } = require('chai')
const { usageHits, usageBlocks, bodyStart, conditionHits } = require('../out/db/usages')

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

describe('conditionHits', function () {
  const events = [
    { mapId: 3, eventId: 1, pages: [{ trigger: 0 }, { trigger: 3, switch1: 12 }] },
    { mapId: 3, eventId: 5, pages: [{ trigger: 0, switch2: 12 }, { trigger: 0, variable: [7, 3] }] },
    { mapId: 8, eventId: 2, pages: [{ trigger: 0, item: 4 }, { trigger: 0, actor: 2 }] }
  ]

  it('finds the pages a switch makes appear, in both condition slots', function () {
    expect(conditionHits(events, 'switch', 12)).to.eql([
      { mapId: 3, eventId: 1, pageId: 2, note: 'ON で出る' },
      { mapId: 3, eventId: 5, pageId: 1, note: 'ON で出る' }
    ])
  })

  it('says how a variable, an item and an actor make a page appear', function () {
    expect(conditionHits(events, 'variable', 7)).to.eql([{ mapId: 3, eventId: 5, pageId: 2, note: '3 以上で出る' }])
    expect(conditionHits(events, 'item', 4)).to.eql([{ mapId: 8, eventId: 2, pageId: 1, note: '持っていると出る' }])
    expect(conditionHits(events, 'actor', 2)).to.eql([{ mapId: 8, eventId: 2, pageId: 2, note: '仲間にいると出る' }])
  })

  it('finds nothing for another number, or for a kind conditions cannot use', function () {
    expect(conditionHits(events, 'switch', 13)).to.eql([])
    expect(conditionHits(events, 'commonEvent', 12)).to.eql([])
    expect(conditionHits(events, 'switch', 0)).to.eql([])
  })
})
