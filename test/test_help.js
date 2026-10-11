const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const { buildTagHelp, sections, helpLines, COMPILER } = require('../t2f-help.js')

/* ヘルプの読み解き。元は拡張の scripts/update-tag-help.js にあり、あちらが
 * src/tagHelpData.ts を作るのに使っていた。MCP サーバもタグ記法を引くのに同じ解析を
 * 使うため、npm にも届くルートへ出した(files に tools/ は入らない)。
 * 拡張側の「ヘルプと同期している」検査は vscode-extension/test/test_tagHelp.js が持つ。
 * ここでは MCP が依る所、つまり「ヘルプから節とタグ名が引けること」を見る。 */
describe('tag help', function () {
  const source = fs.readFileSync(COMPILER, 'utf8')
  const built = buildTagHelp(source)

  it('finds the headings in the help', function () {
    // 節が数十しか取れていないなら、見出しの切り方が壊れている。
    expect(built.sections.length).to.be.greaterThan(100)
    built.sections.forEach(function (s) {
      expect(s.title, JSON.stringify(s).slice(0, 80)).to.be.a('string').and.not.equal('')
      expect(s.body).to.be.a('string')
    })
  })

  it('maps tag names to those headings', function () {
    expect(Object.keys(built.tags).length).to.be.greaterThan(300)
    Object.keys(built.tags).forEach(function (name) {
      expect(built.sections[built.tags[name]], name).to.be.an('object')
    })
  })

  /* 代表的なタグから、意図した節が引けること。英語名・日本語名・短縮名のどれでも同じ節。 */
  it('resolves a tag to its own heading, by any of its names', function () {
    const title = function (name) { return built.sections[built.tags[name]].title }
    expect(title('switch')).to.contain('スイッチの操作')
    // タグ名は <スイッチ: 1, ON> なので鍵は「スイッチ」。見出しの「スイッチの操作」ではない。
    expect(title('スイッチ')).to.equal(title('switch'))
    expect(title('showchoices')).to.contain('選択肢の表示')
    expect(title('選択肢の表示')).to.equal(title('showchoices'))
    expect(title('if')).to.contain('条件分岐')
    expect(title('条件分岐')).to.equal(title('if'))
    expect(title('set')).to.contain('変数の操作')
  })

  /* ヘルプと本文の食い違いは、見つけたら知らせる作り。今は0件で、増えたら気づきたい。 */
  it('reports no mismatch between a heading and its body', function () {
    expect(built.mismatches).to.eql([])
  })

  it('reads the help block itself', function () {
    const lines = helpLines(source)
    expect(lines.length).to.be.greaterThan(1000)
    /* コメントの飾り(" * ")は1回だけ落ちる。ヘルプ本文にも "*" の箇条書きがあるので、
     * 剥がしたあとに " * " で始まる行が残るのは正しい(落としすぎてはいけない)。 */
    expect(lines[0]).to.not.match(/^ \*/)
    expect(lines.some(function (l) { return l === '○ (1) 選択肢の表示' })).to.equal(true)
    expect(lines.some(function (l) { return /^ \* /.test(l) })).to.equal(true)
    /* buildTagHelp は見出しの節に、移動コマンドぶんを足して返す(「(40) 移動ルートの設定」の中身)。
     * だから生の節より多いか同じ。少なくなっていたら、どちらかの切り方が壊れている。 */
    expect(sections(lines).length).to.be.greaterThan(100)
    expect(built.sections.length).to.be.at.least(sections(lines).length)
  })
})
