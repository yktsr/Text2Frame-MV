const chai = require('chai')
const expect = chai.expect
const mcp = require('../../t2f-mcp.js')
const database = require('../out/db/database')

/* 名前の出どころの表が2か所にある。ルートの t2f-mcp.js の NAME_SOURCES と、拡張の
 * src/db/database.ts の SOURCES。
 *
 * **なぜ分けてあるか**: GameDatabase を使えば1か所で済むが、あれは TypeScript の
 * 生成物で、配り方によっては無い。無いときに道具の形(inputSchema の enum)が変わると、
 * 同じ版のサーバが入れ方によって違う契約を名乗る二層の製品になる。だから読み手は
 * ルート側に持ち、**種類の集合だけをここで突き合わせる**。
 *
 * 根のテストではなく拡張の側に置いてあるのは、借りている層が確実にある場所だから
 * (pretest = npm run compile の後に走る)。test_mcp_history.js と同じ理由。 */
describe('name sources agree with the extension', function () {
  it('covers exactly the same kinds', function () {
    const mine = Object.keys(mcp.NAME_SOURCES).sort()
    const theirs = database.KINDS.slice().sort()

    expect(mine).to.eql(theirs)
  })

  it('has all sixteen', function () {
    expect(Object.keys(mcp.NAME_SOURCES)).to.have.lengthOf(16)
  })

  /* 同じ種類が同じファイルを見ていること。片方だけ直すと、名前が引けているのに
   * 別のファイルを読んでいる状態になる。 */
  it('reads the same file for each kind', function () {
    Object.keys(mcp.NAME_SOURCES).forEach(function (kind) {
      expect(mcp.NAME_SOURCES[kind].file, kind + ' の出どころが違います')
        .to.equal(database.SOURCES[kind].file)
    })
  })
})
