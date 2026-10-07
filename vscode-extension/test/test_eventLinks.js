const { expect } = require('chai')
const {
  nodeKey, nodeFromKey, commandLinks, conditionLinks, commonTriggerLinks, LinkIndex, mapLinks
} = require('../out/db/eventLinks')

const page = 'e:3:5:2'

describe('eventLinks', function () {
  it('reads a place from its key and back', function () {
    expect(nodeFromKey('e:3:5:2')).to.eql({ kind: 'page', mapId: 3, eventId: 5, pageId: 2 })
    expect(nodeFromKey('ss:3:5:A')).to.eql({ kind: 'selfSwitch', mapId: 3, eventId: 5, letter: 'A' })
    expect(nodeFromKey('c:12')).to.eql({ kind: 'common', id: 12 })
    expect(nodeFromKey('m:7')).to.eql({ kind: 'map', id: 7 })
    expect(nodeFromKey('x:1')).to.equal(undefined)
    expect(nodeKey({ kind: 'variable', id: 5 })).to.equal('v:5')
  })

  it('finds what a page calls, moves to and changes', function () {
    const links = commandLinks(page, [
      { code: 117, parameters: [12] },
      { code: 201, parameters: [0, 7, 4, 5, 0, 0] },
      { code: 201, parameters: [1, 20, 21, 22, 0, 0] },
      { code: 202, parameters: [0, 0, 9, 1, 1, 0] },
      { code: 121, parameters: [3, 5, 0] },
      { code: 121, parameters: [8, 8, 1] },
      { code: 122, parameters: [2, 2, 0, 0, 4] },
      { code: 123, parameters: ['A', 0] },
      { code: 205, parameters: [0, {}] },
      { code: 505, parameters: [{ code: 27, parameters: [11] }] },
      { code: 505, parameters: [{ code: 45, parameters: ['this.foo()'] }] },
      { code: 401, parameters: ['ただの文章'] }
    ])
    expect(links.map((l) => [l.to, l.how, l.index])).to.eql([
      ['c:12', 'call', 0],
      ['m:7', 'transfer', 1],
      ['v:20', 'transfer', 2],
      ['m:9', 'vehicle', 3],
      ['s:3', 'switchOn', 4], ['s:4', 'switchOn', 4], ['s:5', 'switchOn', 4],
      ['s:8', 'switchOff', 5],
      ['v:2', 'variable', 6],
      ['ss:3:5:A', 'selfSwitchOn', 7],
      ['s:11', 'switchOn', 9]
    ])
    expect(links[2].byVariable).to.equal(true)
  })

  it('does not guess the event of a self switch inside a common event', function () {
    expect(commandLinks('c:4', [{ code: 123, parameters: ['B', 0] }])).to.eql([])
  })

  it('finds which switches make a page appear', function () {
    const links = conditionLinks([{
      mapId: 3,
      eventId: 5,
      summaries: [
        { trigger: 0 },
        { trigger: 0, switch1: 12, variable: [5, 3], selfSwitch: 'A' }
      ]
    }])
    expect(links.map((l) => [l.from, l.to, l.how, l.note])).to.eql([
      ['s:12', 'e:3:5:2', 'condition', 'ON で出る'],
      ['v:5', 'e:3:5:2', 'condition', '3 以上で出る'],
      ['ss:3:5:A', 'e:3:5:2', 'condition', 'ON で出る']
    ])
  })

  it('finds which switch starts a common event by itself', function () {
    const links = commonTriggerLinks([{ id: 1, trigger: 0, switchId: 0 }, { id: 2, trigger: 2, switchId: 7 }])
    expect(links.map((l) => [l.from, l.to, l.note])).to.eql([['s:7', 'c:2', 'ON で並列処理']])
  })

  it('looks the links up both ways', function () {
    const index = new LinkIndex([
      ...commandLinks(page, [{ code: 121, parameters: [12, 12, 0] }]),
      ...conditionLinks([{ mapId: 4, eventId: 1, summaries: [{ trigger: 0, switch1: 12 }] }])
    ])
    expect(index.out(page).map((l) => l.to)).to.eql(['s:12'])
    expect(index.out('s:12').map((l) => l.to)).to.eql(['e:4:1:1'])
    expect(index.in('s:12').map((l) => l.from)).to.eql([page])
    expect(index.in('nothing')).to.eql([])
  })

  it('turns the transfers into map to map links', function () {
    const links = [
      ...commandLinks(page, [{ code: 201, parameters: [0, 7, 4, 5, 0, 0] }, { code: 201, parameters: [1, 20, 21, 22, 0, 0] }]),
      ...commandLinks('c:4', [{ code: 201, parameters: [0, 9, 1, 1, 0, 0] }])
    ]
    expect(mapLinks(links)).to.eql([
      { fromMap: 3, toMap: 7, at: page, index: 0, how: 'transfer', variableId: undefined },
      { fromMap: 3, toMap: undefined, at: page, index: 1, how: 'transfer', variableId: 20 },
      { fromMap: undefined, toMap: 9, at: 'c:4', index: 0, how: 'transfer', variableId: undefined }
    ])
  })
})
