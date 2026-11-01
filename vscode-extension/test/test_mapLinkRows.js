const { expect } = require('chai')

/* 「マップのつながり」の行に出す文字。
 *
 * この図の行はどちらの向きでも「場所移動のコマンドが書いてある側のページ」を指している。
 * 「行き先のマップ」の下に並ぶ行は**いま見ているマップのページ**なので、それが書いていないと
 * 「行き先のマップのページ」に見え、押すと関係ないテキストが開いたように感じる(報告のとおり)。
 * だから、どちらのマップにあるコマンドなのかを必ず言う。 */
const { placeDetail, canFollow } = require('../out/mapLinkRows')
const { setJapanese } = require('../out/db/lang')

describe('a row of the map links', function () {
  afterEach(function () { setJapanese(true) })

  /* 行き先の側。コマンドはいま見ているマップにある。 */
  it('says the command is on the map you are looking at', function () {
    expect(placeDetail({ kind: 'page', onThisMap: true, mapName: 'みなと' })).to.equal('このマップにある')
  })

  /* ここへ来る側。コマンドは相手のマップにある。 */
  it('names the other map when the command is there', function () {
    expect(placeDetail({ kind: 'page', onThisMap: false, mapName: 'みなと' })).to.equal('みなと にある')
  })

  /* どちらの側でも、どこにあるかを必ず言う(そこが抜けていたのが元の症状)。 */
  it('always says where the command is', function () {
    const both = [
      placeDetail({ kind: 'page', onThisMap: true, mapName: 'みなと' }),
      placeDetail({ kind: 'page', onThisMap: false, mapName: 'みなと' })
    ]

    both.forEach(function (one) { expect(one).to.not.equal('') })
    expect(both[0]).to.not.equal(both[1])
  })

  it('says a common event is not tied to a map', function () {
    expect(placeDetail({ kind: 'common', onThisMap: false })).to.equal('どのマップからかは決まりません')
  })

  it('adds that it is a vehicle', function () {
    expect(placeDetail({ kind: 'page', onThisMap: true, vehicle: true })).to.equal('このマップにある・乗り物')
  })

  it('says nothing it cannot know', function () {
    expect(placeDetail({ kind: 'other', onThisMap: false })).to.equal('')
  })

  it('writes the row in English too', function () {
    setJapanese(false)

    expect(placeDetail({ kind: 'page', onThisMap: true })).to.equal('on this map')
    expect(placeDetail({ kind: 'page', onThisMap: false, mapName: 'Port', vehicle: true })).to.equal('on Port · vehicle')
  })

  describe('following a map row', function () {
    it('follows another map', function () {
      expect(canFollow(3, 6)).to.equal(true)
    })

    /* 同じマップへ切り替える先は無い。押して何も起きないボタンは出さない。 */
    it('does not follow the map already shown', function () {
      expect(canFollow(6, 6)).to.equal(false)
    })

    it('does not follow a map it does not have', function () {
      expect(canFollow(0, 6)).to.equal(false)
      expect(canFollow(NaN, 6)).to.equal(false)
    })
  })
})
