const chai = require('chai')
const expect = chai.expect
const { stale, build, VARIANTS } = require('../tools/snapshot-text')

/* 往復一致(compile(decompile(x)) == x)は「書き出したテキストが変わった」ことに
 * 反応しない。両辺が一緒に動くため。だから出力そのものを見張る。
 * 落ちたら test/snapshot/*.txt を作り直し、git diff で意図した変更か見分ける。 */
describe('decompile snapshot', function () {
  it('is up to date with the compiler (run `npm run update-snapshot` if this fails)', function () {
    expect(stale()).to.eql([])
  })

  /* 言語は2通り見る。片方だけだと、タグ名は正しいのに値が英語のまま出る類を見逃す。 */
  it('watches both tag languages', function () {
    expect(VARIANTS.map(function (v) { return v.englishTag })).to.eql([true, false])
  })

  it('writes the same text twice in a row', function () {
    VARIANTS.forEach(function (variant) {
      expect(build(variant), variant.file).to.equal(build(variant))
    })
  })

  /* 言語を変えたら中身が変わること。両方同じなら、見張っていないのと同じになる。 */
  it('gets different text out of the two languages', function () {
    expect(build(VARIANTS[0])).to.not.equal(build(VARIANTS[1]))
  })
})
