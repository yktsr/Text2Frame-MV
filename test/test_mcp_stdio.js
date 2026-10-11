const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CLI = path.join(ROOT, 't2f-mcp.js')

/* 殻(標準入出力)だけを見る。サーバは標準入力が閉じたら終わるので、要求列を全部 input に
 * 入れて spawnSync すれば、閉じて・吐いて・終わる。常駐させないので子プロセスが漏れない
 * (tools/run-tests.js には kill もタイムアウトも無いため、漏らすと実行全体が止まる)。
 *
 * 見るのは1つだけ: **標準出力に MCP のメッセージ以外が1バイトも混じらないこと**。
 * ライブラリの中には console.log を持つ経路があり、1行混じるとクライアントは
 * 「ストリームが読めない」という追いにくい壊れ方をする。
 * 手本は test/test_cli_batch_report.js:22(標準出力を素で JSON.parse する契約テスト)。 */
const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {}
}

describe('mcp over stdio', function () {
  this.timeout(20000)
  let tmp

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-stdio-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.mkdirSync(path.join(tmp, 'text'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        name: 'EV001',
        pages: [{
          list: [
            { code: 121, indent: 0, parameters: [1, 1, 0] },
            { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
            { code: 401, indent: 0, parameters: ['こんにちは'] },
            { code: 0, indent: 0, parameters: [] }
          ]
        }]
      }]
    }))
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([null, { id: 1, list: [] }]))
  })
  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  const request = function (id, method, params) {
    return JSON.stringify({ jsonrpc: '2.0', id, method, params: Object.assign({ _meta: META }, params) })
  }

  const run = function (args, lines) {
    const r = cp.spawnSync(process.execPath, [CLI, '--root', tmp].concat(args || []), {
      encoding: 'utf8',
      input: lines.join('\n') + '\n'
    })
    expect(r.status, r.stderr).to.equal(0)
    return r
  }

  /** 標準出力の全行。1行でも JSON でなければ、どの行かを言って落ちる。 */
  const messages = function (stdout) {
    const out = []
    stdout.split('\n').forEach(function (line, i) {
      if (line === '') return
      try {
        out.push(JSON.parse(line))
      } catch (e) {
        expect.fail('標準出力の ' + (i + 1) + ' 行目が JSON ではありません: ' + JSON.stringify(line))
      }
    })
    return out
  }

  it('answers every request, one JSON message per line', function () {
    const r = run([], [
      request(1, 'server/discover'),
      request(2, 'tools/list'),
      request(3, 'tools/call', { name: 't2f_project_info', arguments: {} })
    ])
    const out = messages(r.stdout)

    expect(out.map(function (m) { return m.id })).to.eql([1, 2, 3])
    out.forEach(function (m) { expect(m.result.resultType, JSON.stringify(m)).to.equal('complete') })
  })

  /* 出力を全部吐き切ってから終わること。標準出力がパイプのときは非同期なので、
   * 吐き終わる前に exit すると後ろが切り落ちる。 */
  it('does not truncate a long run', function () {
    const lines = []
    for (let i = 1; i <= 60; i++) lines.push(request(i, 'tools/list'))
    const out = messages(run([], lines).stdout)

    expect(out).to.have.lengthOf(60)
    expect(out[59].id).to.equal(60)
  })

  it('keeps the diagnostics out of the channel', function () {
    // -v はログを出す。出先は標準エラーで、通路ではない。
    const r = run(['-v'], [
      request(1, 'tools/call', { name: 't2f_read', arguments: { key: 'map001_event001_page1' } }),
      request(2, 'tools/call', { name: 't2f_check', arguments: { text: '<位置: よこ>\n' } })
    ])
    const out = messages(r.stdout)

    expect(out).to.have.lengthOf(2)
    expect(r.stderr).to.contain('[mcp]')
    expect(r.stdout).to.not.contain('[mcp]')
    // 失敗した compile は本文を標準エラーへ出す。通路には出さない。
    expect(r.stdout).to.not.contain('文法エラー\n')
  })

  it('reports a line it cannot parse, and keeps going', function () {
    const r = run([], ['これは JSON ではない', request(2, 'tools/list')])
    const out = messages(r.stdout)

    expect(out[0].error.code).to.equal(-32700)
    expect(out[1].id).to.equal(2)
  })

  it('says nothing to a notification', function () {
    const r = run([], [
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } }),
      request(2, 'tools/list')
    ])
    expect(messages(r.stdout).map(function (m) { return m.id })).to.eql([2])
  })

  /* 端末から起こしたときだけ使い方を出す。クライアントはパイプで繋ぐので、そのときは黙る。 */
  it('does not print the usage when the input is a pipe', function () {
    const r = run([], [request(1, 'tools/list')])
    expect(r.stdout).to.not.contain('Usage:')
    expect(r.stdout).to.not.contain('t2f-mcp')
  })

  /* 終わり方。kill されずに自分で終わること(殺されるなら何かがループを掴んでいる)。 */
  it('exits on its own when the input closes', function () {
    const r = cp.spawnSync(process.execPath, [CLI, '--root', tmp], {
      encoding: 'utf8',
      input: request(1, 'tools/list') + '\n',
      timeout: 10000
    })
    expect(r.signal).to.equal(null)
    expect(r.status).to.equal(0)
  })

  it('refuses a root it cannot use', function () {
    const r = cp.spawnSync(process.execPath, [CLI, '--root', tmp, '--data-dir', '../outside'], {
      encoding: 'utf8',
      input: request(1, 'tools/list') + '\n'
    })
    expect(r.status).to.equal(1)
    expect(r.stderr).to.contain('--root の外')
    expect(r.stdout).to.equal('')
  })
})
