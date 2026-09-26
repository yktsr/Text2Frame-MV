const { expect } = require('chai')
const { graphEdges, buildGraph } = require('../out/db/mapGraph')

const link = (fromMap, toMap, how = 'transfer', at = 'e:1:1:1', index = 0) => ({ fromMap, toMap, at, index, how, variableId: undefined })

describe('mapGraph', function () {
  it('puts the two ways between a pair of maps into one arrow', function () {
    const edges = graphEdges([link(1, 2), link(2, 1, 'transfer', 'e:2:1:1'), link(1, 2, 'transfer', 'e:1:3:1')])
    expect(edges.length).to.equal(1)
    expect([edges[0].from, edges[0].to, edges[0].both, edges[0].places.length]).to.eql([1, 2, true, 3])
    expect(edges[0].places.map((p) => p.forward)).to.eql([true, false, true])
  })

  it('leaves out the vehicles unless they are asked for, and moves inside one map', function () {
    expect(graphEdges([link(1, 2, 'vehicle')])).to.eql([])
    expect(graphEdges([link(1, 2, 'vehicle')], true)[0].vehicle).to.equal(true)
    expect(graphEdges([link(3, 3)])).to.eql([])
  })

  it('lays the maps out by how many moves away they are', function () {
    const links = [link(1, 2), link(2, 3), link(3, 4), link(1, 5)]
    const graph = buildGraph(links, { center: 1, hops: 2 })
    expect(graph.nodes.map((n) => [n.id, n.column, n.row])).to.eql([[1, 0, 0], [2, 1, 0], [5, 1, 1], [3, 2, 0]])
    expect(graph.edges.map((e) => [e.from, e.to])).to.eql([[1, 2], [2, 3], [1, 5]])
    expect(graph.truncated).to.equal(false)
  })

  it('puts a map next to the one it is connected to, so the arrows cross less', function () {
    // 1 → 2, 1 → 3。その先は 11 が 2 から、10 が 3 から。番号の順に並べると線が交わる。
    const links = [link(1, 2), link(1, 3), link(3, 10), link(2, 11)]
    const graph = buildGraph(links, { center: 1, hops: 2 })
    const rowOf = (id) => graph.nodes.find((n) => n.id === id).row
    expect([rowOf(2), rowOf(3)]).to.eql([0, 1])
    expect([rowOf(11), rowOf(10)]).to.eql([0, 1])
  })

  it('stops when there are too many maps', function () {
    const links = []
    for (let id = 2; id <= 40; id++) links.push(link(1, id))
    const graph = buildGraph(links, { center: 1, hops: 3, maxNodes: 10 })
    expect(graph.nodes.length).to.equal(10)
    expect(graph.truncated).to.equal(true)
  })

  it('shows every map when no map is in the middle, each group spread out', function () {
    const graph = buildGraph([link(1, 2), link(3, 4)], { center: 0, hops: 1 })
    expect(graph.nodes.map((n) => n.id).sort((a, b) => a - b)).to.eql([1, 2, 3, 4])
    const at = (id) => { const n = graph.nodes.find((x) => x.id === id); return [n.column, n.row] }
    expect([at(1), at(3)]).to.eql([[0, 0], [0, 1]])
    expect([at(2), at(4)]).to.eql([[1, 0], [1, 1]])
  })
})
