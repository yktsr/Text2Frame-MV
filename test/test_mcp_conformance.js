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
describe('mcp protocol conformance', function () {
  let tmp
  let ctx

  const META = {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientCapabilities': {}
  }

  const ask = function (method, params) {
    const response = mcp.handle({
      jsonrpc: '2.0',
      id: 1,
      method,
      params: Object.assign({ _meta: META }, params)
    }, ctx)
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

  /* 選んだ値そのもの。変えるときは CACHE_TTL_MS のコメントの理由ごと変えること。 */
  it('caches nothing, in this process only', function () {
    expect(mcp.CACHE_TTL_MS).to.equal(0)
    expect(mcp.CACHE_SCOPE).to.equal('private')
  })
})
