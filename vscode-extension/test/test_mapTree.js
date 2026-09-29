const { expect } = require('chai')
const {
  readMapInfos, mapTree, mapLabel, pageConditionTexts, pageDescription, commonDescription,
  eventLiveMark, pageLiveMark, commonLiveMark
} = require('../out/db/mapTree')

const shape = (nodes) => nodes.map((n) => [n.info.id, shape(n.children)])

describe('mapTree', function () {
  it('reads MapInfos.json, skipping the empty first slot', function () {
    const infos = readMapInfos([null, { id: 1, name: 'はじまりの村', parentId: 0, order: 2, expanded: true }, { id: 2, name: '', parentId: 1, order: 1 }])
    expect(infos).to.eql([
      { id: 1, name: 'はじまりの村', parentId: 0, order: 2, expanded: true },
      { id: 2, name: '', parentId: 1, order: 1, expanded: false }
    ])
    expect(readMapInfos('not a list')).to.eql([])
  })

  it('nests maps under their parent, in the order of the editor', function () {
    const infos = readMapInfos([
      null,
      { id: 1, name: 'B', parentId: 3, order: 3 },
      { id: 2, name: 'A', parentId: 3, order: 2 },
      { id: 3, name: '親', parentId: 0, order: 1 },
      { id: 4, name: '子の子', parentId: 2, order: 4 }
    ])
    expect(shape(mapTree(infos))).to.eql([[3, [[2, [[4, []]]], [1, []]]]])
  })

  it('puts a map with a missing or looping parent at the top', function () {
    const infos = readMapInfos([
      null,
      { id: 1, name: '親がいない', parentId: 99, order: 2 },
      { id: 2, name: '輪1', parentId: 3, order: 3 },
      { id: 3, name: '輪2', parentId: 2, order: 1 }
    ])
    expect(shape(mapTree(infos))).to.eql([[3, []], [1, []], [2, []]])
  })

  it('names a map without a name by its number', function () {
    expect(mapLabel({ id: 3, name: '港町' })).to.equal('港町')
    expect(mapLabel({ id: 3, name: '' })).to.equal('マップ0003')
  })

  it('describes the trigger and the conditions of a page', function () {
    const page = { trigger: 3, switch1: 12, variable: [5, 3], selfSwitch: 'A' }
    expect(pageDescription(page, false)).to.equal('自動実行・S0012 が ON・V0005 ≥ 3・セルフ A が ON')
    expect(pageDescription({ trigger: 0 }, true)).to.equal('中身なし・決定ボタン')
    const names = (kind, id) => (kind === 'switch' && id === 12 ? '橋がかかった' : undefined)
    expect(pageConditionTexts(page, names)[0]).to.equal('S0012 橋がかかった が ON')
  })

  // 行の右にも名前を出す。番号だけだと、どのスイッチか分からない。
  it('puts the names in the row too, and shortens a long one', function () {
    const page = { trigger: 3, switch1: 12, item: 3 }
    const names = (kind, id) => {
      if (kind === 'switch' && id === 12) return '橋がかかった'
      if (kind === 'item' && id === 3) return 'とてもながい名前のアイテムです'
      return undefined
    }
    const text = pageDescription(page, false, names)
    expect(text).to.contain('S0012 橋がかかった が ON')
    expect(text).to.contain('とてもながい名前のアイテ…') // 12文字で切る
    // 名前を渡さなければ今までどおり
    expect(pageDescription(page, false)).to.equal('自動実行・S0012 が ON・アイテム(0003)を持つ')
  })

  it('marks what the game is doing now', function () {
    const marks = {
      mapId: 3,
      pages: new Map([[1, 2], [2, 0]]),
      parallelEvents: new Set([2]),
      parallelCommons: new Set([7]),
      running: new Set(['e:3:1:2', 'c:9'])
    }
    expect(eventLiveMark(marks, 3, 1)).to.equal('今 2ページ・▶ 実行中')
    expect(eventLiveMark(marks, 3, 2)).to.equal('出ていない・並列')
    expect(eventLiveMark(marks, 4, 1)).to.equal('')
    expect(eventLiveMark(undefined, 3, 1)).to.equal('')
    expect(eventLiveMark(marks, 3, 1, 3)).to.equal('今 2/3ページ・▶ 実行中') // 全ページ数も出す
    expect(eventLiveMark(marks, 3, 2, 3)).to.equal('出ていない・並列')
    expect(pageLiveMark(marks, 3, 1, 2)).to.equal('● 今のページ・▶ 実行中')
    expect(pageLiveMark(marks, 3, 1, 1)).to.equal('')
    expect(commonLiveMark(marks, 7)).to.equal('並列')
    expect(commonLiveMark(marks, 9)).to.equal('▶ 実行中')
    expect(commonLiveMark(marks, 1)).to.equal('')
  })

  it('describes a common event that runs by itself', function () {
    expect(commonDescription(2, 7, false, (kind, id) => (id === 7 ? '雨' : undefined))).to.equal('並列処理・S0007 雨 が ON')
    expect(commonDescription(0, 0, false)).to.equal('')
    expect(commonDescription(0, 0, true)).to.equal('中身なし')
  })
})
