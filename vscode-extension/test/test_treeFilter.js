const { expect } = require('chai')

/* 一覧を「テキストがあるものだけ」に絞る判断。
 *
 * **既定では絞らない。** テキストがまだ無い行は「押すとそのページをゲームから取り出せる」
 * 唯一の入口なので、隠すとテキストを作れなくなる。
 *
 * 絞るときに気をつけるのは親で、ページを隠しただけだと**開けるのに中が空のイベント**が残る。 */
const { pagesWithText, eventHasText } = require('../out/treeFilter')

describe('showing only what has a text', function () {
  /** 2ページめだけテキストがある、という状態。 */
  const only = function (indexes) {
    return function (index) { return indexes.indexOf(index) !== -1 }
  }

  it('keeps the pages that have one', function () {
    expect(pagesWithText(3, only([1]))).to.eql([1])
  })

  it('keeps every page when nothing is filtered', function () {
    expect(pagesWithText(3, function () { return true })).to.eql([0, 1, 2])
  })

  it('keeps none when none has a text', function () {
    expect(pagesWithText(3, only([]))).to.eql([])
  })

  /* これが親の数え直し。1つでも残るなら、そのイベントは出す。 */
  it('keeps an event that has at least one page with a text', function () {
    expect(eventHasText(3, only([2]))).to.equal(true)
  })

  /* 残らないイベントを出すと、開けるのに空の行になる。 */
  it('drops an event where no page has a text', function () {
    expect(eventHasText(3, only([]))).to.equal(false)
  })

  it('drops an event that has no pages at all', function () {
    expect(eventHasText(0, function () { return true })).to.equal(false)
    expect(pagesWithText(0, function () { return true })).to.eql([])
  })

  /* ページ数が読めなかったとき(壊れたデータ)に落ちない。 */
  it('does not fall over on a page count it cannot use', function () {
    expect(pagesWithText(-1, function () { return true })).to.eql([])
    expect(pagesWithText(NaN, function () { return true })).to.eql([])
  })
})
