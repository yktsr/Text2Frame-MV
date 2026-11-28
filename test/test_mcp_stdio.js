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
      input: lines.join('\n') + '\n',
      /* spawnSync の既定は 1MB で、超えると**子を殺して status に出す** - サーバの
       * 不具合と見分けが付かない。tools/list は1回で約19KB(道具21個の説明文)なので、
       * 下の「60回ぶん吐き切る」検査が既定のままだと必ず当たる。測りたいのは
       * 吐き切るかどうかなので、ここは広く取る。 */
      maxBuffer: 64 * 1024 * 1024
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

  /* 書き込みまで殻越しに通す。applyTextFile はライブラリで唯一 stdout へ届きうる
   * console.log を持つ経路(いまは _quiet で抑えられている)なので、ここで通路を見る。 */
  it('plans and applies through the shell without touching the channel', function () {
    const plan = request(1, 'tools/call', {
      name: 't2f_write_plan',
      arguments: { key: 'map001_event001_page1', text: 'こんばんは\n' }
    })
    const first = messages(run(['-v'], [plan]).stdout)
    const token = first[0].result.structuredContent.token
    expect(token).to.be.a('string')

    const r = run(['-v'], [plan, request(2, 'tools/call', { name: 't2f_write_apply', arguments: { token } })])
    const out = messages(r.stdout)

    expect(out).to.have.lengthOf(2)
    expect(out[1].result.isError, JSON.stringify(out[1].result)).to.equal(undefined)
    expect(out[1].result.structuredContent.historyId).to.be.a('string')
    // 反映の案内(RESTART_NOTICE)は _quiet で抑えられている。漏れていれば通路に出る。
    expect(r.stdout).to.not.contain('RPGツクール')
    expect(r.stdout).to.not.contain('Please restart')
    // 本当に書けたこと。
    const list = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).events[1].pages[0].list
    expect(list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })).to.eql(['こんばんは'])
    expect(fs.existsSync(path.join(tmp, '.t2f-history'))).to.equal(true)
  })

  /* 殻は要求を1本の鎖に並べる。**N の答えを送るまで N+1 を始めない。**
   * 再生の道具が待つ(サーバの起動、visit の答え)ので、素朴に await を足すと2つの要求が
   * 同時に飛び、Laurus.Text2Frame の共有状態が交錯する。鎖ならそれが起きない。
   *
   * ここでは鎖の壊れやすい所を3つ見る。どれも外すと静かに壊れる。 */
  describe('the request chain', function () {
    /* 通知は handle が null を返す。鎖で if (response) を落とすと "null" の行が通路に出る。 */
    it('writes nothing at all for a notification, even between answers', function () {
      const r = run([], [
        request(1, 'tools/list'),
        JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } }),
        request(2, 'tools/list')
      ])

      expect(r.stdout).to.not.contain('null')
      expect(messages(r.stdout).map(function (m) { return m.id })).to.eql([1, 2])
    })

    /* 読めない行の知らせも鎖に乗る。乗せないと通路に書き手が2人になり、
     * 待つ道具が走っている間に順序が入れ替わる。 */
    it('keeps the parse error in the same queue as the answers', function () {
      const r = run([], [
        request(1, 'tools/list'),
        'これは JSON ではない',
        request(3, 'tools/list')
      ])
      const out = messages(r.stdout)

      expect(out).to.have.lengthOf(3)
      expect(out[0].id).to.equal(1)
      expect(out[1].error.code).to.equal(-32700)
      expect(out[2].id).to.equal(3)
    })

    /* 道具が投げても、答えは返るし**鎖は止まらない**。止まると以後の要求が全部無視される。 */
    it('answers a failing call and keeps serving afterwards', function () {
      const r = run([], [
        // 宛先が無いので t2f_read が投げる(道具の中のことなので isError で返る)。
        request(1, 'tools/call', { name: 't2f_read', arguments: { key: 'map999_event999_page1' } }),
        request(2, 'tools/list')
      ])
      const out = messages(r.stdout)

      expect(out).to.have.lengthOf(2)
      expect(out[0].result.isError).to.equal(true)
      expect(out[1].result.tools, '鎖が止まっています').to.be.an('array')
    })
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
