const chai = require('chai')
const expect = chai.expect
const { build, stale, EXCHANGES } = require('../tools/snapshot-mcp')
const { TOOLS, handle, createContext } = require('../t2f-mcp')

/* プロトコルの表面(discover の結果・tools/list の全文・エラーの形)を固定する。
 * 道具の説明文は LLM への唯一の案内なので、1文が消えても気づきたい。手で書く assert では
 * そこを見張れないため、生成物と突き合わせる(test_grammar.js:29 / test_tagHelp.js:11 と同じ型)。 */
describe('mcp protocol snapshot', function () {
  it('is up to date (run `npm run update-mcp-snapshot` if this fails)', function () {
    expect(stale()).to.equal(false)
  })

  it('writes the same text twice in a row', function () {
    expect(build()).to.equal(build())
  })

  /* 版を埋め込むと、リリースのたびに筆記録が動いて意味が薄れる。 */
  it('keeps the version out of the recorded text', function () {
    const text = build()
    expect(text).to.contain('"<version>"')
    expect(text).to.not.contain(require('../package.json').version)
  })

  /* 記録した往復に、エラーの形と read-only の姿が入っていること。 */
  it('records the error shapes and the read-only listing', function () {
    const labels = EXCHANGES.map(function (e) { return e.label })
    expect(labels).to.include('server/discover')
    expect(labels).to.include('tools/list')
    expect(labels).to.include('tools/list (--read-only)')
    expect(labels.filter(function (l) { return l.indexOf('エラー') === 0 })).to.have.length.at.least(4)
  })

  /* 答えるメソッドが全部、どれかの往復に出ていること。
   * EXCHANGES は手で保つ列挙なので、新しいメソッドを足したときここに入れ忘れると、
   * **結果の形に人の目が入る唯一の場所**を黙って素通りする。
   * 実装しているかどうかは handler に訊く(-32601 なら未実装)。 */
  it('records an exchange for every method the server answers', function () {
    const META = {
      'io.modelcontextprotocol/protocolVersion': '2026-07-28',
      'io.modelcontextprotocol/clientCapabilities': {}
    }
    const probes = {
      'server/discover': {},
      'tools/list': {},
      'tools/call': { name: 't2f_syntax', arguments: {} },
      'resources/list': {},
      'resources/templates/list': {},
      'resources/read': {},
      'prompts/list': {},
      'prompts/get': {},
      'completion/complete': {}
    }
    const ctx = createContext({ root: __dirname })
    const recorded = EXCHANGES.map(function (e) { return e.request.method })

    Object.keys(probes).forEach(function (method) {
      const response = handle({
        jsonrpc: '2.0',
        id: 1,
        method,
        params: Object.assign({ _meta: META }, probes[method])
      }, ctx)
      if (response.error && response.error.code === -32601) return
      expect(recorded, method + ' に答えるのに、筆記録の往復に出ていません').to.include(method)
    })
  })

  /* 鳴らない番人は無いのと同じ。道具の説明を1文字変えたら、筆記録が変わること。 */
  it('notices a change to a tool description', function () {
    const before = build()
    const tool = TOOLS[0]
    const original = tool.description
    try {
      tool.description = original + '(足した一文)'
      expect(build()).to.not.equal(before)
    } finally {
      tool.description = original
    }
    expect(build()).to.equal(before)
  })
})
