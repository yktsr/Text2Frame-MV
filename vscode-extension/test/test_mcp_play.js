const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const mcp = require('../../t2f-mcp.js')

/* 動いているゲームを MCP から操る9つの道具。
 *
 * **根ではなく拡張の側に置く理由**: 借りている層は TypeScript の生成物で、CI の core
 * ジョブは拡張をコンパイルしない。根に置くと、そのジョブで道具が1つも出ず全部飛ぶ
 * (前に t2f_usages でそうなった)。test_mcp_usages.js と同じ理由・同じ置き場所。
 *
 * 偽のゲームを繋いで、**道具が何を送り、返ってきたものをどう読むか**を見る。
 *
 * ぶら下がり対策: afterEach で必ず閉じ、待ちには全部締め切りを置く
 * (tools/run-tests.js の締め切りまで走らせない)。 */
describe('mcp play tools', function () {
  this.timeout(20000)

  let tmp
  let root
  let ctx
  let fake

  const META = {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientCapabilities': {}
  }

  /** 道具を1つ呼ぶ。handle は再生の道具だけ Promise を返すので、どちらでも待てる形で。 */
  const call = async function (name, args) {
    const response = await Promise.resolve(mcp.handle({
      jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args || {}, _meta: META }
    }, ctx))
    return response
  }
  const ok = async function (name, args) {
    const response = await call(name, args)
    expect(response.error, name + ' が JSON-RPC エラーになりました: ' + JSON.stringify(response.error)).to.equal(undefined)
    expect(response.result.isError, name + ' が失敗しました: ' + JSON.stringify(response.result.content)).to.not.equal(true)
    return response.result
  }
  const text = function (result) { return result.content.map(function (c) { return c.text }).join('\n') }

  const get = function (port, p) {
    return new Promise(function (resolve, reject) {
      const req = http.request({ host: '127.0.0.1', port, path: p }, function (res) {
        const chunks = []
        res.on('data', function (c) { chunks.push(c) })
        res.on('end', function () { resolve(Buffer.concat(chunks).toString()) })
      })
      req.on('error', reject)
      req.end()
    })
  }

  /** 偽のゲームを繋ぐ。繋がってから返す。 */
  const connectFakeGame = async function () {
    const game = ctx.game()
    const port = game.server.port
    const token = /var TOKEN = "([0-9a-f]{32})"/.exec(await get(port, '/index.html'))[1]
    const heard = []
    const sse = await new Promise(function (resolve, reject) {
      const req = http.get({ host: '127.0.0.1', port, path: '/__t2f/events?token=' + token }, function (res) {
        if (res.statusCode !== 200) return reject(new Error('SSE が ' + res.statusCode))
        let buffer = ''
        let opened = false
        res.on('data', function (c) {
          buffer += c
          let at = buffer.indexOf('\n\n')
          while (at >= 0) {
            const frame = buffer.slice(0, at)
            buffer = buffer.slice(at + 2)
            /* 名前付きの報せは拾わない。本物の EventSource.onmessage も名前の無いもの
             * だけを拾う(相乗りしている相手への中継がここに混ざらないのはそのため)。 */
            const m = /^event:/m.test(frame) ? null : /^data: (.*)$/m.exec(frame)
            if (m) heard.push(JSON.parse(m[1]))
            at = buffer.indexOf('\n\n')
          }
          if (!opened) { opened = true; resolve(req) }
        })
      })
      req.on('error', reject)
    })

    const post = function (message) {
      return new Promise(function (resolve, reject) {
        const body = Buffer.from(JSON.stringify(message), 'utf8')
        const req = http.request({
          host: '127.0.0.1',
          port,
          path: '/__t2f/state',
          method: 'POST',
          headers: { 'content-type': 'application/json', 'content-length': body.length, 'x-t2f-token': token }
        }, function (res) { res.resume(); res.on('end', resolve) })
        req.on('error', reject)
        req.end(body)
      })
    }

    // 1通送って「繋がっている」にする。
    await post({ scene: 'Scene_Map', map: 1, player: { x: 3, y: 4, direction: 2 } })
    fake = { token, heard, sse, post }
    return fake
  }

  /** 偽のゲームが受け取った命令のうち、鍵 field を持つ最後のもの。 */
  const lastHeard = function (field) {
    const hits = fake.heard.filter(function (c) { return c[field] !== undefined })
    return hits[hits.length - 1]
  }

  /** 命令が届くのを待つ(送信は同期だが、届くのは1往復ぶん遅れる)。 */
  const waitHeard = async function (field, ms) {
    const until = Date.now() + (ms || 3000)
    while (Date.now() < until) {
      if (lastHeard(field)) return lastHeard(field)
      await new Promise(function (r) { setTimeout(r, 20) })
    }
    throw new Error('命令が届きませんでした: ' + field + ' / 聞いたもの: ' + JSON.stringify(fake.heard))
  }

/* 2行目は**自前のコマンド**にする。素の文章2行は 401 の続きなので、頭の 101 へ
 * ずらされる(runLines の TEXT_CONTINUATIONS がそう決めている)。それは正しい振る舞い
 * だが、それでは「行がコマンドに直った」ことを見られない。 */
const BODY = ['こんにちは。', '<ウェイト: 30>'].join('\n')

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-play-'))
    root = path.join(tmp, 'game')
    fs.mkdirSync(path.join(root, 'data'), { recursive: true })
    fs.mkdirSync(path.join(root, 'text'), { recursive: true })
    fs.writeFileSync(path.join(root, 'index.html'), '<html><head></head><body></body></html>')
    fs.writeFileSync(path.join(root, 'data', 'System.json'), JSON.stringify({
      gameTitle: 'play', switches: ['', 'はじまり'], variables: ['', 'かぞえ'], equipTypes: [''], armorTypes: [''], skillTypes: ['']
    }))
    fs.writeFileSync(path.join(root, 'data', 'CommonEvents.json'), JSON.stringify([null, { id: 1, name: 'ためし', list: [{ code: 0, indent: 0, parameters: [] }] }]))

    /* ゲームのデータは**テキストをコンパイルして**作る。そうすれば alignCommands が
     * 必ず揃い、ブレークポイントの行→コマンドの変換が意味のある検査になる。 */
    ctx = mcp.createContext({ root })
    const commands = ctx.t2f.compile(BODY)
    fs.writeFileSync(path.join(root, 'data', 'Map001.json'), JSON.stringify({
      events: [null, { id: 1, name: 'ひと', x: 7, y: 9, pages: [{ list: commands.concat([{ code: 0, indent: 0, parameters: [] }]) }] }]
    }))
    fs.writeFileSync(path.join(root, 'text', 'map001_event001_page001.txt'),
      ['---', 'kind: event', 'mapId: 1', 'eventId: 1', 'pageId: 1', '---', BODY].join('\n'))
  })

  afterEach(async function () {
    if (fake) {
      fake.sse.destroy()
      fake = null
    }
    if (ctx) await mcp.closeContext(ctx)
    ctx = null
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('offers the play tools only where the live layer resolved', function () {
    const listed = mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } }, ctx).result.tools
    expect(listed.map(function (t) { return t.name }).filter(function (n) { return n.indexOf('t2f_play_') === 0 }))
      .to.have.lengthOf(10)
  })

  it('starts a server and says the game is not connected yet', async function () {
    const result = await ok('t2f_play_start')

    expect(result.structuredContent.running).to.equal(true)
    expect(result.structuredContent.connected, 'まだ誰も繋がっていないのに繋がっていると言っています').to.equal(false)
    expect(result.structuredContent.openUrl).to.match(/^http:\/\/127\.0\.0\.1:\d+\/index\.html\?test$/)
    expect(text(result)).to.contain('ブラウザでここを開いてください')
  })

  /* 2度呼んでも同じサーバ。URL が変わると localStorage=セーブが別になる。 */
  it('reuses the server when it is already running', async function () {
    const first = await ok('t2f_play_start')
    const second = await ok('t2f_play_start')

    expect(second.structuredContent.port).to.equal(first.structuredContent.port)
    expect(text(second)).to.contain('既に動いていました')
  })

  it('serves FOSSILindex.html when the game has one', async function () {
    fs.writeFileSync(path.join(root, 'FOSSILindex.html'), '<html></html>')
    const result = await ok('t2f_play_start')

    expect(result.structuredContent.page).to.equal('FOSSILindex.html')
    expect(text(result)).to.contain('FOSSIL')
  })

  it('reports what the game says about itself', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    const status = await ok('t2f_play_status')

    expect(status.structuredContent.connected, 'ゲームが繋がったのに気づいていません').to.equal(true)
    expect(status.structuredContent.scene).to.equal('Scene_Map')
    expect(status.structuredContent.player).to.eql({ x: 3, y: 4, direction: 2 })
    expect(text(status)).to.contain('いる場所: マップ1 (3,4)')
  })

  it('tells the agent whether a message is open', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ message: { busy: true, choice: false } })
    const status = await ok('t2f_play_status')

    expect(status.structuredContent.message).to.eql({ busy: true, choice: false })
    expect(text(status)).to.contain('メッセージ: 出ています')
  })

  /* **開いているかどうかだけでは足りない。** 何が書いてあるか分からないと、外から操る側は
   * 自分が出したかった台詞が出たのかを確かめられない。 */
  it('says what the message actually shows', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ message: { busy: true, choice: false, lines: ['【スーズ】', 'ねぇ…君になら'] } })
    const status = await ok('t2f_play_status')

    expect(status.structuredContent.message.lines).to.eql(['【スーズ】', 'ねぇ…君になら'])
    expect(text(status)).to.contain('| ねぇ…君になら')
  })

  /* 選択肢が出ているのに中身が分からないと、どれを選ぶか決められない。 */
  it('lists the choices on offer', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ message: { busy: true, choice: true, lines: ['どうする？'], choices: ['逃げる', '見る'] } })
    const status = await ok('t2f_play_status')

    expect(status.structuredContent.message.choices).to.eql(['逃げる', '見る'])
    expect(text(status)).to.contain('1) 逃げる')
    expect(text(status)).to.contain('2) 見る')
  })

  /* **拡張がエディタで光らせるのと同じ場所**を、走っている間も文字で返す。
   * 番号だけ返すと、呼んだ側がテキストを読み直す往復が要る。 */
  it('says where the running event is, in the text', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ run: [{ key: 'e:1:1:1', index: 2 }] })
    const status = await ok('t2f_play_status')

    const at = status.structuredContent.frames[0]
    expect(at).to.include({ place: 'e:1:1:1', commandIndex: 2, line: 8, exact: true })
    expect(at.textPath).to.contain('map001_event001_page001.txt')
    expect(at.text).to.equal('<ウェイト: 30>')
    expect(text(status)).to.contain('8 行目')
    expect(text(status)).to.contain('<ウェイト: 30>')
  })

  /* テキストをまだ取り出していないイベントでは、行は分からない。黙って落ちない。 */
  it('still says the place when there is no text for it', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ run: [{ key: 'e:9:9:1', index: 0 }] })
    const status = await ok('t2f_play_status')

    expect(status.structuredContent.frames[0]).to.include({ place: 'e:9:9:1', commandIndex: 0, line: null })
    expect(text(status)).to.contain('e:9:9:1 の 1 番目')
  })

  it('shows the values with their names', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ switches: { 1: true }, variables: { 1: 5 }, gold: 300 })
    const state = await ok('t2f_play_state')

    expect(text(state)).to.contain('1「はじまり」')
    expect(text(state)).to.contain('1「かぞえ」 = 5')
    // name は素の名前、label が表示用。structuredContent に id があるので番号は重ねない。
    expect(state.structuredContent.switches).to.deep.include({ id: 1, name: 'はじまり', label: '1「はじまり」', value: true })
  })

  /* 鍵をまるごと返すこと(実機で1文字ずつ割れていた)。 */
  it('lists the self switches by their whole key', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ selfSwitches: { '1,8,A': true } })
    const state = await ok('t2f_play_state')

    expect(state.structuredContent.selfSwitches).to.eql([{ key: '1,8,A', value: true }])
    expect(text(state)).to.contain('1,8,A')
  })

  it('says what is running in parallel', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ parallel: { events: [4], commons: [9] } })
    const state = await ok('t2f_play_state')

    expect(state.structuredContent.parallel).to.eql({ events: [4], commons: [9] })
    expect(text(state)).to.contain('並列処理: イベント4, コモン9')
  })

  it('sends switches and variables to the game', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await ok('t2f_play_set', { switches: { 1: true }, variables: { 1: 7 } })

    expect(await waitHeard('switches')).to.eql({ switches: { 1: true }, variables: { 1: 7 } })
  })

  /* t2f_play_state が返すのは [{id, name, label, value}] の配列。**読んだ形をそのまま
   * 書けること** - 畳まないと、値を見てから変えるたびに形を組み直すことになる。 */
  it('takes the same shape t2f_play_state hands back', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ switches: { 1: true }, variables: { 1: 5 } })
    const state = await ok('t2f_play_state')

    await ok('t2f_play_set', { switches: state.structuredContent.switches, variables: state.structuredContent.variables })

    expect(await waitHeard('switches')).to.eql({ switches: { 1: true }, variables: { 1: 5 } })
  })

  it('presses keys and taps the screen', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await ok('t2f_play_input', { keys: ['ok'], waitMs: 0 })
    expect((await waitHeard('input')).input).to.eql({ keys: ['ok'] })

    await ok('t2f_play_input', { tap: { x: 10, y: 20 }, waitMs: 0 })
    expect((await waitHeard('input')).input).to.eql({ tap: { x: 10, y: 20 } })
  })

  it('presses a key several times', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await ok('t2f_play_input', { key: 'ok', times: 3, waitMs: 0 })

    await waitHeard('input')
    expect(fake.heard.filter(function (c) { return c.input }), '3回ぶん届いていません').to.have.lengthOf(3)
  })

  it('refuses an input with nothing to press', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    const result = (await call('t2f_play_input', { times: 2 })).result

    expect(result.isError).to.equal(true)
    expect(text(result)).to.contain('押すもの')
  })

  /* 聞いているゲームが無ければ**すぐ**失敗する。殻は鎖なので、ここで待つと次の要求も止まる。 */
  it('fails at once when no game is listening', async function () {
    await ok('t2f_play_start')
    const result = (await call('t2f_play_set', { switches: [{ id: 1, value: true }] })).result

    expect(result.isError).to.equal(true)
    expect(text(result)).to.contain('ゲームが聞いていません')
  })

  it('refuses every play tool before the server is up', async function () {
    for (const name of ['t2f_play_status', 't2f_play_state', 't2f_play_goto', 't2f_play_step']) {
      const response = await call(name, name === 't2f_play_step' ? { how: 'next' } : { mapId: 1, eventId: 1 })
      const said = text(response.result) + ' ' + JSON.stringify(response.result.structuredContent)
      expect(said, name).to.match(/t2f_play_start|動いていません/)
    }
  })

  it('runs an event and passes the game answer through', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()

    const running = ok('t2f_play_goto', { mapId: 1, eventId: 1, waitMs: 5000 })
    const sent = await waitHeard('visit')
    // 立つ場所はゲームのデータから取る(テキストに座標は無い)。
    expect(sent.visit).to.include({ mapId: 1, eventId: 1, pageId: 1, x: 7, y: 9, run: true })
    await fake.post({ visit: 'ran' })
    const result = await running

    expect(result.structuredContent.result).to.equal('ran')
    expect(result.structuredContent.ok).to.equal(true)
    expect(text(result)).to.contain('走らせました')
  })

  it('stands in front of the event when asked to', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()

    const running = ok('t2f_play_goto', { key: 'map001_event001_page1', mode: 'stand', waitMs: 5000 })
    expect((await waitHeard('visit')).visit.run).to.equal(false)
    await fake.post({ visit: 'stood' })

    expect(text(await running)).to.contain('前に立ちました')
  })

  it('reserves a common event', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()

    const running = ok('t2f_play_goto', { mode: 'common', commonEventId: 1, waitMs: 5000 })
    expect((await waitHeard('visit')).visit).to.eql({ common: 1 })
    await fake.post({ visit: 'ran' })

    expect(text(await running)).to.contain('走らせました')
  })

  /* **同じゲームが既に配られていたら、自分で配り直さず相乗りする。**
   * 配り直すと番地(ポート)が変わり、ブラウザのセーブは番地ごとに分かれるので、
   * 続きから調べられなくなる。 */
  describe('riding along with a server that is already there', function () {
    const { startGameServer, stablePort } = require('../out/gameServer')
    let owner

    afterEach(async function () {
      if (owner) await owner.close()
      owner = null
    })

    it('joins the one that is already serving this game', async function () {
      owner = await startGameServer(root, undefined, { onState: function () {} })
      expect(owner.port, 'いつもの番号が取れていません').to.equal(stablePort(root))

      const result = await ok('t2f_play_start')

      expect(result.structuredContent.joined, '相乗りしていません').to.equal(true)
      expect(result.structuredContent.port, '番地が変わっています').to.equal(owner.port)
      expect(text(result)).to.contain('相乗り')
    })

    /* 相乗り先の報せが、こちらの様子にそのまま出ること。 */
    it('sees what the game tells the other server', async function () {
      owner = await startGameServer(root, undefined, { onState: function () {} })
      await ok('t2f_play_start')
      const token = /var TOKEN = "([0-9a-f]{32})"/.exec(await get(owner.port, '/index.html'))[1]
      const body = Buffer.from(JSON.stringify({ scene: 'Scene_Map', map: 7 }), 'utf8')
      await new Promise(function (resolve, reject) {
        const req = http.request({
          host: '127.0.0.1',
          port: owner.port,
          path: '/__t2f/state',
          method: 'POST',
          headers: { 'content-type': 'application/json', 'content-length': body.length, 'x-t2f-token': token }
        }, function (res) { res.resume(); res.on('end', resolve) })
        req.on('error', reject)
        req.end(body)
      })

      const until = Date.now() + 3000
      while (Date.now() < until && (await ok('t2f_play_status')).structuredContent.mapId !== 7) {
        await new Promise(function (r) { setTimeout(r, 50) })
      }
      expect((await ok('t2f_play_status')).structuredContent.mapId, '相乗り先の報せが届いていません').to.equal(7)
    })

    /* **乗る前からのことも見えること。** 報せは変わったぶんだけなので、乗った時点で
     * 頼み直さないとマップも値も空のままになる(実際にそうなった)。 */
    it('catches up with what happened before it joined', async function () {
      owner = await startGameServer(root, undefined, { onState: function () {} })
      const token = /var TOKEN = "([0-9a-f]{32})"/.exec(await get(owner.port, '/index.html'))[1]
      const world = { reset: true, map: 7, variables: { 2: 42 }, scene: 'Scene_Map', message: { busy: false, choice: false } }
      const tell = function (what) {
        return new Promise(function (resolve, reject) {
          const body = Buffer.from(JSON.stringify(what), 'utf8')
          const req = http.request({
            host: '127.0.0.1',
            port: owner.port,
            path: '/__t2f/state',
            method: 'POST',
            headers: { 'content-type': 'application/json', 'content-length': body.length, 'x-t2f-token': token }
          }, function (res) { res.resume(); res.on('end', resolve) })
          req.on('error', reject)
          req.end(body)
        })
      }

      // 本物の監視と同じふるまい: 頼まれたら全部を報せ直す。
      const listening = await new Promise(function (resolve, reject) {
        const req = http.get({ host: '127.0.0.1', port: owner.port, path: '/__t2f/events?token=' + token }, function (res) {
          let buffer = ''
          res.setEncoding('utf8')
          res.on('data', function (chunk) {
            buffer += chunk
            let at = buffer.indexOf('\n\n')
            while (at >= 0) {
              const frame = buffer.slice(0, at)
              buffer = buffer.slice(at + 2)
              if (!/^event:/m.test(frame)) {
                const m = /^data: (.*)$/m.exec(frame)
                if (m && JSON.parse(m[1]).resend === true) tell(world)
              }
              at = buffer.indexOf('\n\n')
            }
            resolve(req)
          })
        })
        req.on('error', reject)
      })
      try {
        // 乗る**前**に起きたこと。
        await tell(world)
        await ok('t2f_play_start')

        const until = Date.now() + 4000
        while (Date.now() < until && (await ok('t2f_play_status')).structuredContent.mapId !== 7) {
          await new Promise(function (r) { setTimeout(r, 50) })
        }
        const status = (await ok('t2f_play_status')).structuredContent
        expect(status.mapId, '乗る前のことが見えていません').to.equal(7)
        expect(status.scene).to.equal('Scene_Map')
      } finally {
        listening.destroy()
      }
    })

    /* 止めるのは自分の聞き口だけ。**向こうのサーバは止めない**(あちらの持ち物)。 */
    it('leaves the other server running when it stops', async function () {
      owner = await startGameServer(root, undefined, { onState: function () {} })
      await ok('t2f_play_start')
      await ok('t2f_play_stop')

      expect(await get(owner.port, '/index.html')).to.contain('__t2f')
    })

    /* 相乗りの口が無い相手(古い版)には乗らない。乗ると、繋がったように見えて
     * 報せが1つも来ない - 一番分かりにくい壊れ方になる。 */
    it('does not join something that cannot relay', async function () {
      const plain = http.createServer(function (req, res) {
        if (req.url.indexOf('/__t2f/') === 0) { res.writeHead(404).end(); return }
        res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html><script>var TOKEN = "' + '0'.repeat(32) + '";</script></html>')
      })
      await new Promise(function (r) { plain.listen(stablePort(root), '127.0.0.1', r) })
      try {
        const result = await ok('t2f_play_start')

        expect(result.structuredContent.joined, '古い相手に乗ってしまいました').to.equal(false)
        expect(result.structuredContent.port).to.not.equal(stablePort(root))
      } finally {
        await new Promise(function (r) { plain.close(r) })
      }
    })
  })

  /* セーブから再開する。**セーブはブラウザの番地ごとに分かれる**ので、別のポートで
   * 遊んだぶんは見えない。そこは道具の文面で言う。 */
  describe('resuming from a save', function () {
    it('lists the saves that are there', async function () {
      await ok('t2f_play_start')
      await connectFakeGame()

      const listing = ok('t2f_play_load', { waitMs: 3000 })
      await waitHeard('saves')
      await fake.post({ saves: [{ slot: 1, playtime: '00:12:34' }, { slot: 3 }] })
      const result = await listing

      expect(result.structuredContent.saves).to.have.lengthOf(2)
      expect(text(result)).to.contain('1 番')
      expect(text(result)).to.contain('00:12:34')
      expect(text(result)).to.contain('3 番')
    })

    /* 無いときは「無い」と言い、**なぜ見えないことがあるか**まで言う。 */
    it('says there is none, and why that can happen', async function () {
      await ok('t2f_play_start')
      await connectFakeGame()

      const listing = ok('t2f_play_load', { waitMs: 3000 })
      await waitHeard('saves')
      await fake.post({ saves: [] })
      const result = await listing

      expect(result.structuredContent.saves).to.eql([])
      expect(text(result)).to.contain('セーブはありません')
      expect(text(result)).to.contain('番地')
    })

    it('resumes from the slot it was given', async function () {
      await ok('t2f_play_start')
      await connectFakeGame()

      const loading = ok('t2f_play_load', { slot: 2, waitMs: 3000 })
      expect((await waitHeard('load')).load).to.equal(2)
      await fake.post({ load: 'loaded', scene: 'Scene_Map', map: 4 })
      const result = await loading

      expect(result.structuredContent.ok).to.equal(true)
      expect(result.structuredContent.slot).to.equal(2)
      expect(text(result)).to.contain('セーブから再開しました')
    })

    /* ゲームが断ったらそのまま伝える。こちらで言い換えない。 */
    it('passes a refusal through as it is', async function () {
      await ok('t2f_play_start')
      await connectFakeGame()

      const loading = ok('t2f_play_load', { slot: 9, waitMs: 3000 })
      await waitHeard('load')
      await fake.post({ load: 'noSave' })
      const result = await loading

      expect(result.structuredContent.ok).to.equal(false)
      expect(text(result)).to.contain('そのセーブがありません')
    })

    it('gives up with an explanation when the game never answers', async function () {
      await ok('t2f_play_start')
      await connectFakeGame()
      const result = (await call('t2f_play_load', { slot: 1, waitMs: 500 })).result

      expect(result.isError).to.equal(true)
      expect(text(result)).to.contain('答えが返りませんでした')
    })
  })

  /* **実機で踏んだループ。** タイトル画面から走らせるとそこで新しいゲームが始まり、
   * 直前に入れたスイッチが消えて分岐に入らない。外から操る側にはそれが見えないので
   * 「立てる→走らせる→入らない→立て直す」で回り続けた。 */
  describe('the values survive a new game', function () {
    /* visit に答える係。タイトルからだと、先に立たせる1回ぶんが増えて2回来る。 */
    const answer = async function (times, word) {
      for (let i = 0; i < times; i++) {
        const seen = fake.heard.filter(function (c) { return c.visit }).length
        const until = Date.now() + 3000
        while (Date.now() < until && fake.heard.filter(function (c) { return c.visit }).length <= seen) {
          await new Promise(function (r) { setTimeout(r, 20) })
        }
        await fake.post({ visit: word || 'ran' })
      }
    }

    const onTitle = async function () {
      await ok('t2f_play_start')
      await connectFakeGame()
      await fake.post({ scene: 'Scene_Title', message: { busy: false, choice: false } })
    }

    it('puts the values back when the run starts a new game', async function () {
      await onTitle()
      await ok('t2f_play_set', { switches: { 5: true }, variables: { 2: 4 } })

      const running = ok('t2f_play_goto', { mapId: 1, eventId: 1, waitMs: 5000 })
      await answer(2)
      const result = await running

      // 立たせる1回と走らせる1回で、visit は2回。
      expect(fake.heard.filter(function (c) { return c.visit }), 'visit の回数').to.have.lengthOf(2)
      expect(fake.heard.filter(function (c) { return c.visit })[0].visit.run, '1回目は立つだけ').to.equal(false)
      expect(fake.heard.filter(function (c) { return c.visit })[1].visit.run, '2回目が本番').to.equal(true)
      // 入れ直しは、立たせたあと・走らせる前。
      const put = fake.heard.filter(function (c) { return c.switches })
      expect(put, '値を入れ直していません').to.have.lengthOf(2)
      expect(put[1]).to.include.keys('switches', 'variables')
      expect(put[1].switches).to.eql({ 5: true })
      expect(put[1].variables).to.eql({ 2: 4 })
      // 黙ってやらない。
      expect(text(result)).to.contain('入れ直しました')
    })

    it('puts the breakpoints back too', async function () {
      await onTitle()
      await ok('t2f_play_break', { mapId: 1, eventId: 1, lines: [8] })
      await fake.post({ scene: 'Scene_Title', message: { busy: false, choice: false } })

      const running = ok('t2f_play_goto', { mapId: 1, eventId: 1, waitMs: 5000 })
      await answer(2)
      await running

      expect(fake.heard.filter(function (c) { return c.breakpoints }), '置き直していません').to.have.lengthOf(2)
    })

    /* 入れたものが無ければ、余計な往復はしない。 */
    it('does not take the long way round when nothing was set', async function () {
      await onTitle()

      const running = ok('t2f_play_goto', { mapId: 1, eventId: 1, waitMs: 5000 })
      await answer(1)
      const result = await running

      expect(fake.heard.filter(function (c) { return c.visit })).to.have.lengthOf(1)
      expect(text(result)).to.not.contain('入れ直しました')
    })

    /* タイトルでなければ新しいゲームは始まらないので、そのまま走らせる。 */
    it('runs straight away when the game is already going', async function () {
      await ok('t2f_play_start')
      await connectFakeGame()
      await fake.post({ scene: 'Scene_Map' })
      await ok('t2f_play_set', { switches: { 5: true } })

      const running = ok('t2f_play_goto', { mapId: 1, eventId: 1, waitMs: 5000 })
      await answer(1)
      const result = await running

      expect(fake.heard.filter(function (c) { return c.visit })).to.have.lengthOf(1)
      expect(text(result)).to.not.contain('入れ直しました')
    })
  })

  /* ゲームが「無い」と答えたらそのまま伝える。こちらで言い換えない。 */
  it('passes a refusal from the game through as it is', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()

    const running = ok('t2f_play_goto', { mapId: 1, eventId: 1, waitMs: 5000 })
    await waitHeard('visit')
    await fake.post({ visit: 'noPage' })
    const result = await running

    expect(result.structuredContent.ok).to.equal(false)
    expect(text(result)).to.contain('そのページがありません')
  })

  /* 答えが来ないまま締め切りを越えたら、黙って待ち続けず説明して戻る。 */
  it('gives up with an explanation when the game never answers', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    const result = (await call('t2f_play_goto', { mapId: 1, eventId: 1, waitMs: 500 })).result

    expect(result.isError).to.equal(true)
    expect(text(result)).to.contain('答えが返りませんでした')
  })

  /* **行番号でブレークポイントを置く。** ゲームが知っているのはコマンドの番号だけなので、
   * テキストの行を lineMap と alignCommands で直してから送る。 */
  it('turns a text line into a command index', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    // 見出し情報6行のあと、7行目が文、8行目がウェイト。
    const result = await ok('t2f_play_break', { mapId: 1, eventId: 1, lines: [8] })

    expect(result.structuredContent.key).to.equal('e:1:1:1')
    expect(result.structuredContent.placed).to.have.lengthOf(1)
    expect(result.structuredContent.placed[0].line).to.equal(8)
    expect(result.structuredContent.placed[0].commandIndex).to.be.greaterThan(0)
    expect(text(result)).to.contain('8 行目 -> コマンド')

    const sent = await waitHeard('breakpoints')
    expect(sent.breakpoints['e:1:1:1']).to.eql([result.structuredContent.placed[0].commandIndex])
  })

  it('clears the breakpoints of one event, and all of them', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await ok('t2f_play_break', { mapId: 1, eventId: 1, lines: [7] })

    const cleared = await ok('t2f_play_break', { mapId: 1, eventId: 1, lines: [] })
    expect(text(cleared)).to.contain('消しました')
    expect((await waitHeard('breakpoints')).breakpoints).to.eql({})

    await ok('t2f_play_break', { mapId: 1, eventId: 1, lines: [7] })
    const all = await ok('t2f_play_break', { clearAll: true })
    expect(all.structuredContent.breakpoints).to.eql({})
  })

  /* コモンイベントの鍵は c:n。テキストの鍵を削って作ると e:... になって黙って無効になる。 */
  it('uses c:n for a common event', async function () {
    fs.writeFileSync(path.join(root, 'text', 'common001.txt'),
      ['---', 'kind: common', 'commonEventId: 1', '---', ''].join('\n'))
    await ok('t2f_play_start')
    await connectFakeGame()
    const result = await ok('t2f_play_break', { commonEventId: 1, lines: [] })

    expect(result.structuredContent.key).to.equal('c:1')
  })

  it('says why a line cannot hold a breakpoint', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    const result = await ok('t2f_play_break', { mapId: 1, eventId: 1, lines: [999] })

    expect(result.structuredContent.placed).to.have.lengthOf(0)
    expect(result.structuredContent.missed[0].why).to.equal('noCommand')
    expect(text(result)).to.contain('置けません')
  })

  /* 止まった所は**テキストの行に戻して**返す。コマンドの番号だけ返しても、
   * 外から操る側はどこで止まったのか分からない。 */
  it('turns the place it stopped back into a text line', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    const placed = await ok('t2f_play_break', { mapId: 1, eventId: 1, lines: [8] })
    const index = placed.structuredContent.placed[0].commandIndex

    const stepping = ok('t2f_play_step', { how: 'next', waitMs: 5000 })
    await waitHeard('debug')
    await fake.post({ paused: { reason: 'breakpoint', frames: [{ key: 'e:1:1:1', index }] } })
    const result = await stepping

    expect(result.structuredContent.paused).to.equal(true)
    expect(result.structuredContent.reason).to.equal('breakpoint')
    // stoppedAt は「止まった場所」、frames は「いま走っているもの」で別物。
    expect(result.structuredContent.stoppedAt[0].line).to.equal(8)
    expect(result.structuredContent.stoppedAt[0].commandIndex).to.equal(index)
    expect(result.structuredContent.stoppedAt[0].exact).to.equal(true)
    expect(result.structuredContent.stoppedAt[0].textPath).to.contain('map001_event001_page001.txt')
    expect(text(result)).to.contain('8 行目')
  })

  /* 止まっていることを言わないと、見にきた側は入力を送り続けてしまう(実機で踏んだ)。 */
  it('says it is stopped at a breakpoint', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    await fake.post({ paused: { reason: 'breakpoint', frames: [{ key: 'e:1:1:1', index: 2 }] } })
    const status = await ok('t2f_play_status')

    expect(status.structuredContent.paused.reason).to.equal('breakpoint')
    expect(status.structuredContent.paused.at[0]).to.include({ place: 'e:1:1:1', commandIndex: 2, line: 8 })
    expect(text(status)).to.contain('止まっています')
    expect(text(status)).to.contain('t2f_play_step')
    expect(text(status)).to.contain('8 行目')
  })

  it('says nothing about stopping while the game runs', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()

    expect((await ok('t2f_play_status')).structuredContent.paused).to.equal(null)
  })

  it('does not wait after continue', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    const result = await ok('t2f_play_step', { how: 'continue' })

    expect((await waitHeard('debug')).debug).to.equal('continue')
    expect(text(result)).to.contain('続けました')
  })

  it('says it is still running when nothing stopped', async function () {
    await ok('t2f_play_start')
    await connectFakeGame()
    const result = await ok('t2f_play_step', { how: 'pause', waitMs: 300 })

    expect(result.structuredContent.paused).to.equal(false)
    expect(text(result)).to.contain('まだ止まっていません')
  })

  it('stops the server, and says so when it was not running', async function () {
    await ok('t2f_play_start')
    const port = ctx.game().server.port
    const stopped = await ok('t2f_play_stop')

    expect(stopped.structuredContent.stopped).to.equal(true)
    expect(ctx.game()).to.equal(undefined)
    await new Promise(function (resolve, reject) {
      const req = http.request({ host: '127.0.0.1', port, path: '/index.html' }, function () { reject(new Error('まだ配っています')) })
      req.on('error', resolve)
      req.end()
    })
    fake = null

    expect((await ok('t2f_play_stop')).structuredContent.stopped).to.equal(false)
  })
})
