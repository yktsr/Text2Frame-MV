const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

/* 「マップのつながり」の行に出す文字。
 *
 * 元の症状は、行がマップでまとめられていて「どちらの端の話か」が形から読めなかったこと。
 * 「行き先」の下の行は見ているマップのページ、「ここへ来る」の下の行は相手のマップの
 * ページで、見た目が同じまま意味が入れ替わっていた。
 *
 * まとめをやめて並べるだけにしたので、ここで守るのは書き方の規則2つ。
 *   - **いま見ているマップは名前で呼ばない**(だからマップ名が出ていれば他のマップ)
 *   - **座標は必ず「着く場所」**(出る側は相手のマップの、来る側はこのマップの着地点) */
const { rowLabel, rowDetail } = require('../out/mapLinkRows')
const { setJapanese } = require('../out/db/lang')

describe('a row of the map links', function () {
  afterEach(function () { setJapanese(true) })

  /* 出る側。コマンドは見ているマップにあるので、マップ名は付かない。 */
  it('does not name the map you are looking at', function () {
    expect(rowLabel({ event: 'EV002 / 1ページ' })).to.equal('EV002 / 1ページ')
  })

  /* 来る側。コマンドは相手のマップにあるので、どのマップかを必ず言う。 */
  it('names the map when the command is on another one', function () {
    expect(rowLabel({ event: 'EV006 / 2ページ', onMap: 'みなと' })).to.equal('みなと EV006 / 2ページ')
  })

  /* 出る側の着地点。相手のマップの、どのマスに降りるか。 */
  it('says which map and tile it arrives at', function () {
    expect(rowDetail({ event: 'EV002 / 1ページ', toMap: 'みなと', toX: 12, toY: 7 })).to.equal('→ みなと (12,7) に着く')
  })

  /* 来る側の着地点は**このマップ**なので、座標だけ。
   * 「このマップのどこに人が降りてくるか」が、今までどこにも出ていなかったもの。 */
  it('gives just the tile when it arrives on the map you are looking at', function () {
    expect(rowDetail({ event: 'みなと EV006 / 2ページ', toX: 24, toY: 11 })).to.equal('→ (24,11) に着く')
  })

  /* 乗り物(202)は人が降りるのではない。同じ言葉で言うと嘘になる。 */
  it('says a vehicle is placed, not that someone arrives', function () {
    expect(rowDetail({ event: 'EV004 / 1ページ', toMap: 'みなと', toX: 3, toY: 4, vehicle: true }))
      .to.equal('→ みなと (3,4) に乗り物を置く')
  })

  it('says the destination comes from a variable', function () {
    expect(rowDetail({ event: 'EV009 / 1ページ', byVariable: 7 })).to.equal('→ 変数7 で決まる行き先')
  })

  /* 行き先が分からないものを、座標があるように見せない。 */
  it('says nothing it cannot know', function () {
    expect(rowDetail({ event: 'EV009 / 1ページ' })).to.equal('')
    expect(rowDetail({ event: 'EV009 / 1ページ', toX: 3 })).to.equal('')
  })

  it('writes the row in English too', function () {
    setJapanese(false)

    expect(rowLabel({ event: 'EV006 / page 2', onMap: 'Port' })).to.equal('Port EV006 / page 2')
    expect(rowDetail({ event: 'EV002 / page 1', toMap: 'Port', toX: 12, toY: 7 })).to.equal('→ arrives at Port (12,7)')
    expect(rowDetail({ event: 'EV009 / page 1', byVariable: 7 })).to.equal('→ destination from variable 7')
  })

  /* **並べるだけ**にしたことを固定する。マップの行を戻すなら、それは判断として行う
   * (黙って戻ると、行がどちらの端の話かが、また形から読めなくなる)。 */
  it('keeps the view to two flat lists', function () {
    const view = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'mapLinksView.ts'), 'utf8')
    const types = /type NodeType =([^;]*);/.exec(view)

    expect(types, 'NodeType が見つかりません').to.not.equal(null)
    expect(types[1]).to.contain("'group'")
    expect(types[1]).to.contain("'place'")
    expect(types[1], 'マップの行が戻っています').to.not.contain("'map'")
  })
})
