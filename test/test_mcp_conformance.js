const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')
const mcp = require('../t2f-mcp')

/* 仕様(schema/2026-07-28/schema.ts)が必須としている項目を、こちらの結果が持っていること。
 *
 * これを足したのは、全部緑のままクライアントに繋がらなかったから。
 * test/snapshot/mcp-protocol.txt は**こちらが出すもの**を固定するだけで、仕様が求めるものとは
 * 突き合わせていない。回帰の検知器であって、適合の検査ではなかった。
 * 実際に ttlMs と cacheScope が無いまま 673 件が緑で、tools/list が3回リトライされて切られた。
 *
 * だからここには**仕様から読んだ必須項目を手で書き写す**。仕様が増えたらここに足す。
 * 筆記録と役割が違うので、どちらも要る。
 */
/* 仕様(schema/2026-07-28/schema.ts)が定める9つのメソッドと、その結果の約束。
 * **ここは人が仕様の原文を読んで書き写す表**で、機械では守れない。足すときは原文を見ること。
 *
 * cacheable は「結果型が CacheableResult を継承するか」。継承する6つだけが true。
 * requires は resultType / _meta / ttlMs / cacheScope / nextCursor を除いた必須の中身。
 *
 * 未実装のメソッドも載せてある。実装した日に、この表が自動で番人になる(下の検査が
 * -32601 を「未実装」として飛ばすので、実装すると検査対象に入る)。
 * これが無かったために、resources / prompts を足す日に同じ事故を繰り返す余地が残っていた。 */
const SPEC = {
  'server/discover': { cacheable: true, requires: ['supportedVersions', 'capabilities'] },
  'tools/list': { cacheable: true, requires: ['tools'] },
  'tools/call': { cacheable: false, requires: ['content'] },
  'resources/list': { cacheable: true, requires: ['resources'] },
  'resources/templates/list': { cacheable: true, requires: ['resourceTemplates'] },
  'resources/read': { cacheable: true, requires: ['contents'] },
  'prompts/list': { cacheable: true, requires: ['prompts'] },
  'prompts/get': { cacheable: false, requires: ['messages'] },
  'completion/complete': { cacheable: false, requires: ['completion'] }
}

/* 各メソッドを1回成功させるための引数。SPEC に行を足したらここにも要る(下の検査が見る)。 */
const PROBE = {
  'server/discover': {},
  'tools/list': {},
  'tools/call': { name: 't2f_syntax', arguments: {} },
  'resources/list': {},
  'resources/templates/list': {},
  'resources/read': { uri: 't2f:///text/map001_event001_page1' },
  'prompts/list': {},
  'prompts/get': { name: 'translate' },
  'completion/complete': { ref: {}, argument: {} }
}

describe('mcp protocol conformance', function () {
  let tmp
  let ctx

  const META = {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientCapabilities': {}
  }

  /** 生の応答。未実装のメソッドも見たいので、エラーを期待しない。 */
  const send = function (method, params) {
    return mcp.handle({
      jsonrpc: '2.0',
      id: 1,
      method,
      params: Object.assign({ _meta: META }, params)
    }, ctx)
  }

  const ask = function (method, params) {
    const response = send(method, params)
    expect(response.error, JSON.stringify(response.error)).to.equal(undefined)
    return response.result
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-conf-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.mkdirSync(path.join(tmp, 'text'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({ events: [null] }))
    ctx = mcp.createContext({ root: tmp })
  })
  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  /** CacheableResult: ttlMs は 0 以上の数、cacheScope は2語のどちらか。どちらも必須。 */
  const expectCacheable = function (result, label) {
    expect(result.ttlMs, label + ' に ttlMs がありません').to.be.a('number')
    expect(result.ttlMs, label + ' の ttlMs が負です').to.be.at.least(0)
    expect(result.cacheScope, label + ' の cacheScope が2語のどちらでもありません')
      .to.be.oneOf(['public', 'private'])
  }

  /* Result は resultType を必須で持つ。 */
  it('puts resultType on every result', function () {
    expect(ask('server/discover').resultType).to.equal('complete')
    expect(ask('tools/list').resultType).to.equal('complete')
    expect(ask('tools/call', { name: 't2f_syntax', arguments: {} }).resultType).to.equal('complete')
  })

  /* DiscoverResult extends CacheableResult。
   * ここが抜けていても Claude Code の握手は通ってしまう(検証が緩い)ので、
   * クライアントの寛容さに寄りかからないよう、こちらで見る。 */
  it('makes server/discover cacheable, with its own required fields', function () {
    const result = ask('server/discover')

    expectCacheable(result, 'server/discover')
    expect(result.supportedVersions).to.eql(mcp.PROTOCOL_VERSIONS)
    expect(result.capabilities).to.be.an('object')
    expect(result.capabilities.tools).to.be.an('object')
  })

  /* ListToolsResult extends PaginatedResult, CacheableResult。
   * これが無くて落ちた。クライアントは結果の**最上位**に両方を求める。 */
  it('makes tools/list cacheable, with its own required fields', function () {
    const result = ask('tools/list')

    expectCacheable(result, 'tools/list')
    expect(result.tools).to.be.an('array').with.length.at.least(1)
  })

  /* --read-only でも同じ。道具が減るだけで、結果の形は変わらない。 */
  it('makes tools/list cacheable under --read-only too', function () {
    ctx = mcp.createContext({ root: tmp, readOnly: true })
    const result = ask('tools/list')

    expectCacheable(result, 'tools/list (--read-only)')
    expect(result.tools.length).to.be.below(mcp.TOOLS.length)
  })

  /* CallToolResult は Result を直に継承する。**載せてはいけない**側。
   * jsonrpcResult にまとめて足すと全結果に載ってここが破れるので、その抑止として見る。 */
  it('keeps the cache fields off tools/call', function () {
    const result = ask('tools/call', { name: 't2f_syntax', arguments: {} })

    expect(result.ttlMs, 'tools/call に ttlMs が載っています').to.equal(undefined)
    expect(result.cacheScope, 'tools/call に cacheScope が載っています').to.equal(undefined)
    expect(result.content).to.be.an('array').with.length.at.least(1)
  })

  /* Tool は name と inputSchema を必須で持ち、inputSchema の type は "object"。 */
  it('declares every tool with the fields the spec requires', function () {
    ask('tools/list').tools.forEach(function (tool) {
      expect(tool.name, JSON.stringify(tool)).to.be.a('string').with.length.at.least(1)
      expect(tool.name, tool.name + ' に使えない字があります').to.match(/^[A-Za-z0-9_.-]+$/)
      expect(tool.inputSchema, tool.name + ' に inputSchema がありません').to.be.an('object')
      expect(tool.inputSchema.type, tool.name + ' の inputSchema.type').to.equal('object')
    })
  })

  /* 表を回す本番。仕様の9つを handle に通し、-32601 のものは未実装として飛ばす。
   *
   * **handle を通すこと。** 実装を直に呼ぶとキャッシュ指定を付けている層を飛ばすので、
   * 何も検査していないのに緑になる。
   *
   * 残る穴: SPEC に無いメソッドを実装しても、ここは気づかない(handler がどのメソッドに
   * 答えるかを列挙できないため)。仕様の改訂でメソッドが増えたら、この表に足すのは人の仕事。 */
  it('holds every implemented method to what the spec says about its result', function () {
    const methods = Object.keys(SPEC)
    let answered = 0
    let skipped = 0

    methods.forEach(function (method) {
      const response = send(method, PROBE[method])
      if (response.error && response.error.code === -32601) {
        skipped++
        return
      }
      answered++
      expect(response.error, method + ' が予期しないエラーを返しました: ' +
        JSON.stringify(response.error)).to.equal(undefined)
      const result = response.result

      if (SPEC[method].cacheable) {
        expectCacheable(result, method)
      } else {
        expect(result.ttlMs, method + ' に ttlMs が載っています(仕様は載せない側)').to.equal(undefined)
        expect(result.cacheScope, method + ' に cacheScope が載っています(仕様は載せない側)')
          .to.equal(undefined)
      }

      SPEC[method].requires.forEach(function (field) {
        expect(result[field], method + ' に ' + field + ' がありません').to.not.equal(undefined)
      })
    })

    // 全部飛んだら、表のメソッド名か handler のどちらかが壊れている(鳴らない番人になる)。
    expect(answered, '仕様のメソッドが1つも答えませんでした').to.be.at.least(3)
    expect(answered + skipped).to.equal(methods.length)
  })

  /* 表に行を足して引数を忘れると、そのメソッドは永久に飛ばされる側になる。 */
  it('has a probe for every method in the table', function () {
    expect(Object.keys(PROBE).sort()).to.eql(Object.keys(SPEC).sort())
  })

  /* いま実装しているのは3つ。残り6つが未実装であることを記録しておく
   * (resources / prompts を出した日にここが落ち、上の検査が効き始めたことに気づける)。 */
  it('implements three of the nine, and says so', function () {
    const implemented = Object.keys(SPEC).filter(function (method) {
      const response = send(method, PROBE[method])
      return !(response.error && response.error.code === -32601)
    })
    expect(implemented).to.eql(['server/discover', 'tools/list', 'tools/call'])
  })

  /* 選んだ値そのもの。変えるときは CACHE_TTL_MS のコメントの理由ごと変えること。 */
  it('caches nothing, in this process only', function () {
    expect(mcp.CACHE_TTL_MS).to.equal(0)
    expect(mcp.CACHE_SCOPE).to.equal('private')
  })
})
