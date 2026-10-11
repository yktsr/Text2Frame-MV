const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')
const mcp = require('../t2f-mcp')

/* 道具の振る舞い。handler を**プロセス内で**叩く(子プロセスを起こさない)。
 * tools/run-tests.js には kill もタイムアウトも無いので、常駐させるテストは1つ漏らすと
 * 実行全体が止まる。殻(標準入出力)だけを test_mcp_stdio.js が spawnSync で見る。
 * プロトコルの形は test/snapshot/mcp-protocol.txt が固定しているので、ここでは中身を見る。 */
const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {}
}

const bottom = { code: 0, indent: 0, parameters: [] }
const msg = function (text) {
  return [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: [text] }
  ]
}

describe('mcp tools', function () {
  let tmp
  let ctx

  const call = function (name, args) {
    const response = mcp.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args || {}, _meta: META }
    }, ctx)
    expect(response, 'tools/call が応答しませんでした').to.be.an('object')
    expect(response.error, JSON.stringify(response.error)).to.equal(undefined)
    return response.result
  }
  const textOf = function (result) { return result.content[0].text }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.mkdirSync(path.join(tmp, 'text'))
    fs.mkdirSync(path.join(tmp, 'js'))
    // MV か MZ かはコアのファイル名で見分ける。
    fs.writeFileSync(path.join(tmp, 'js', 'rmmz_core.js'), '// MZ')
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        name: 'EV001',
        pages: [{ list: [{ code: 121, indent: 0, parameters: [1, 1, 0] }].concat(msg('こんにちは'), [bottom]) }]
      }]
    }))
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([
      null, { id: 1, name: 'CE001', list: msg('コモンの文').concat([bottom]) }
    ]))
    fs.writeFileSync(path.join(tmp, 'data', 'MapInfos.json'), JSON.stringify([
      null, { id: 1, name: 'はじまりの村', order: 1, parentId: 0 }
    ]))
    /* gameTitle と partyMembers は「名前を付けるときに壊してはいけないもの」の見張り。
     * System.json にはゲームの設定が丸ごと入っている。 */
    fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify({
      gameTitle: 'テストのゲーム',
      partyMembers: [1, 2],
      switches: ['', 'ドアを開けた', '橋がかかった', ''],
      variables: ['', '所持金', '']
    }))
    ctx = mcp.createContext({ root: tmp })
  })

  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  const writeText = function (name, body) {
    fs.writeFileSync(path.join(tmp, 'text', name), body)
  }
  const frontMatter = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\n'

  describe('t2f_project_info', function () {
    it('tells MV from MZ and counts the routed texts', function () {
      writeText('a.txt', frontMatter + 'やあ\n')
      writeText('loose.txt', '見出しのないテキスト\n')
      const info = call('t2f_project_info').structuredContent

      expect(info.engine).to.equal('MZ')
      expect(info.textCount).to.equal(2)
      expect(info.routedCount).to.equal(1)
      expect(info.withoutFrontMatter).to.eql(['text/loose.txt'])
    })

    it('names the texts that fight over one target', function () {
      writeText('a.txt', frontMatter + 'やあ\n')
      writeText('b.txt', frontMatter + 'やあ\n')
      const info = call('t2f_project_info').structuredContent

      expect(Object.keys(info.duplicates)).to.eql(['map001_event001_page1'])
      expect(textOf(call('t2f_project_info'))).to.contain('見送られる宛先')
    })

    /* 目印が残っている間は統合が止まるので、書き込む前に気づけること。 */
    it('names the texts with unresolved conflict markers', function () {
      writeText('a.txt', frontMatter + '<comment>\n=== テキストの変更 / from text ===\n</comment>\nやあ\n')
      const info = call('t2f_project_info').structuredContent

      expect(info.withConflictMarkers).to.eql(['text/a.txt'])
      expect(textOf(call('t2f_project_info'))).to.contain('目印3行を消して')
    })

    it('warns about the editor and the sync watcher', function () {
      expect(textOf(call('t2f_project_info'))).to.contain('t2f-sync')
    })
  })

  describe('t2f_list', function () {
    it('shows where a text already is, and where a missing one would go', function () {
      writeText('mine.txt', frontMatter + 'やあ\n')
      const rows = call('t2f_list').structuredContent.targets

      const event = rows.filter(function (r) { return r.key === 'map001_event001_page1' })[0]
      expect(event.textPath).to.equal('text/mine.txt')
      expect(event.plannedTextPath).to.equal(null)
      expect(event.mapName).to.equal('はじまりの村')

      const common = rows.filter(function (r) { return r.kind === 'common' })[0]
      expect(common.textPath).to.equal(null)
      expect(common.plannedTextPath).to.contain('common001')
    })

    it('takes the scope, and custom needs an existing text', function () {
      expect(call('t2f_list', { scope: 'custom' }).structuredContent.targets).to.eql([])
      writeText('mine.txt', frontMatter + 'やあ\n')
      expect(call('t2f_list', { scope: 'custom' }).structuredContent.targets).to.have.lengthOf(1)
    })

    /* 実プロジェクトでは全件が 986,112 文字になり、クライアントが返せなかった。
     * 切る線で分けず**構造で分ける** — 絞っていなくて多すぎるときは行を1つも返さない。
     * 行の部分集合を返すと「その宛先は無い」と誤解する余地が残る。 */
    describe('when the project is too big to list', function () {
      // このマップだけ宛先を増やす(ほかのマップは beforeEach のまま)。
      const manyEvents = function (count) {
        const events = [null]
        for (let i = 1; i <= count; i++) {
          events.push({ id: i, name: 'EV' + i, pages: [{ list: msg('やあ').concat([bottom]) }] })
        }
        fs.writeFileSync(path.join(tmp, 'data', 'Map002.json'), JSON.stringify({ events }))
        fs.writeFileSync(path.join(tmp, 'data', 'MapInfos.json'), JSON.stringify([
          null, { id: 1, name: 'はじまりの村', order: 1, parentId: 0 }, { id: 2, name: '大きな町', order: 2, parentId: 0 }
        ]))
      }

      /* 既定(100)に収まるうちは今までどおり全行返すこと(切り方を変えていない)。 */
      it('still returns every row while it fits', function () {
        manyEvents(8)
        const result = call('t2f_list', { scope: 'all' })

        expect(result.structuredContent.targets).to.be.an('array').with.length.at.least(8)
        expect(result.structuredContent.truncated).to.equal(false)
      })

      /* 既定(100)を超えたら要約に倒れること。 */
      it('falls back to the summary past the default limit', function () {
        manyEvents(130)
        const result = call('t2f_list', { scope: 'all' })

        expect(result.structuredContent.targets, '行を返してはいけない').to.equal(null)
        expect(result.structuredContent.summary).to.be.an('array').with.length.at.least(2)
        expect(result.structuredContent.total).to.be.above(100)
        expect(textOf(result)).to.contain('mapId を渡すと')
      })

      /* 絞れば全件返る。これが「切らずに済む」側の約束。 */
      it('returns every row of one map when narrowed', function () {
        manyEvents(130)
        const result = call('t2f_list', { scope: 'all', mapId: 2 })

        expect(result.structuredContent.targets).to.have.lengthOf(130)
        expect(result.structuredContent.truncated).to.equal(false)
        // マップを指すとコモンイベントは落ちる(enumerateTargets の onlyFile の約束)。
        expect(result.structuredContent.targets.every(function (r) { return r.kind !== 'common' })).to.equal(true)
      })

      /* この道具自身が行の mapId を文字列で返すので、返った値をそのまま渡せること。 */
      it('takes the mapId as a string too', function () {
        manyEvents(130)
        expect(call('t2f_list', { scope: 'all', mapId: '2' }).structuredContent.total).to.equal(130)
        // 道具の中で起きたことは JSON-RPC エラーではなく isError の本文で返る。
        const bad = call('t2f_list', { mapId: 'いろは' })
        expect(bad.isError).to.equal(true)
        expect(textOf(bad)).to.contain('mapId')
      })

      it('honours an explicit limit and offset, and reports the real total', function () {
        manyEvents(130)
        const result = call('t2f_list', { scope: 'all', limit: 3, offset: 10 })

        expect(result.structuredContent.targets).to.have.lengthOf(3)
        expect(result.structuredContent.offset).to.equal(10)
        expect(result.structuredContent.truncated).to.equal(true)
        expect(result.structuredContent.total).to.be.above(100)
        expect(textOf(result)).to.contain('11〜13 件目')
      })

      /* 片方だけ切ると UI とモデルの見え方が食い違う。同じ1つの配列から作ること。 */
      it('keeps the text and the structured rows in step', function () {
        manyEvents(130)
        const result = call('t2f_list', { scope: 'all', mapId: 2, limit: 7 })

        expect(textOf(result).split('\n').filter(function (l) { return l.indexOf('map002_') === 0 }))
          .to.have.lengthOf(result.structuredContent.targets.length)
      })
    })
  })

  /* ここだけが data/System.json を書く。ほかの道具は「イベントのテキスト」の話なので、
   * 境界を1つ越えている。だから対象を switch と variable の名前だけに絞ってある。
   *
   * なぜ要るか: MCP でイベントを1つ作ったら、使ったスイッチが名前の無いまま残った。
   * 番号だけが残ると、後で読む人にも AI にも効く。 */
  /* テキストからページは増やせない。増やすと条件の無いページが末尾に付き、コアは
   * pages.length-1 から逆に走るので(findProperPageIndex)既存のページが到達しなくなる。
   * findTarget が存在するページしか解決しないので**起きない**が、断り方が
   * 「その宛先はありません」だけだとエージェントは名前を間違えたと思って迷う。 */
  /* **ゲームが実際に落ちてから分かった。** MCP で <BattleProcessing> を入れたら
   * 「Failed to load img/enemies/Orc.png」。番号としては正しいので文法の検査も下書きも
   * 全部通り、落ちたのはゲームを起動してから。あのゲームは戦闘を使わないので敵の画像を
   * 全部削除していた。
   *
   * 参照の取り方は commandRefs に任せる(新しい規則を書かない)。だから覆うのは顔と
   * 敵グループだけ。借りている層が無い配り方では黙る。 */
  /* 別セッションが「t2f_read が本文を返さない」と報告した。**誤りだった** - 本文は
   * content[0].text にある。だが structuredContent には無く、そこを見た注意深い読み手が
   * 自信を持って誤った結論に達した。仕様も「structured を返すなら content にも」と
   * 言っていて、t2f_read と t2f_syntax は向きが逆だった(本文が content だけ)。
   *
   * どちらの半分だけを見ても足りる形にする。 */
  /* 再生の道具は待つ(サーバの起動、visit の答え)。tools/call だけが Promise を覚え、
   * 書き込みの道具は同期のまま。**待つ道具が失敗しても、答えは isError で返る。** */
  describe('a tool that waits', function () {
    const slow = function (run) {
      return { name: 't2f_slow_probe', title: '試験用', annotations: { readOnlyHint: true }, inputSchema: { type: 'object', additionalProperties: false }, run }
    }
    afterEach(function () {
      const at = mcp.TOOLS.map(function (t) { return t.name }).indexOf('t2f_slow_probe')
      if (at >= 0) mcp.TOOLS.splice(at, 1)
    })

    it('answers with what the promise resolves to', function () {
      mcp.TOOLS.push(slow(function () { return Promise.resolve({ content: [{ type: 'text', text: '待った' }] }) }))

      return Promise.resolve(mcp.handle({
        jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 't2f_slow_probe', arguments: {}, _meta: META }
      }, ctx)).then(function (response) {
        expect(response.result.content[0].text).to.equal('待った')
        expect(response.result.resultType).to.equal('complete')
      })
    })

    /* 拒否されたら isError の本文にする。**投げっぱなしにすると鎖が止まり、
     * 以後の要求が全部無視される**(殻の .catch が最後の砦だが、ここで拾うのが本筋)。 */
    it('turns a rejected promise into a tool error, not a dead chain', function () {
      mcp.TOOLS.push(slow(function () { return Promise.reject(new Error('繋がっていません')) }))

      return Promise.resolve(mcp.handle({
        jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 't2f_slow_probe', arguments: {}, _meta: META }
      }, ctx)).then(function (response) {
        expect(response.error, JSON.stringify(response.error)).to.equal(undefined)
        expect(response.result.isError).to.equal(true)
        expect(response.result.content[0].text).to.contain('繋がっていません')
      })
    })

    /* 同期の道具は今までどおり同期で返る(Promise に包まない)。 */
    it('leaves the synchronous tools synchronous', function () {
      const response = mcp.handle({
        jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 't2f_syntax', arguments: { tag: 'switch' }, _meta: META }
      }, ctx)

      expect(response.then, '同期の道具が Promise になっています').to.equal(undefined)
      expect(response.result.content[0].text).to.contain('スイッチの操作')
    })
  })

  describe('both halves of a result', function () {
    it('puts the body in the structured half too', function () {
      writeText('mine.txt', frontMatter + 'やあ\n')
      const result = call('t2f_read', { key: 'map001_event001_page1' })

      expect(result.structuredContent.text, 'structuredContent に本文がありません').to.be.a('string')
      expect(result.structuredContent.text).to.equal(textOf(result))
    })

    it('does the same for the translation-only form', function () {
      const result = call('t2f_read', { key: 'map001_event001_page1', translationOnly: true })
      expect(result.structuredContent.text).to.equal(textOf(result))
    })

    it('puts the help body in the structured half', function () {
      const result = call('t2f_syntax', { tag: 'switch' })
      expect(result.structuredContent.body).to.be.a('string').with.length.at.least(20)
      expect(textOf(result)).to.contain(result.structuredContent.body)
    })

    /* 新しい道具を足したときにここが鳴る。どれか1つでも structuredContent を
     * 空にしたら、片方しか見ないクライアントがその道具を使えない。 */
    it('gives every tool a non-empty structured half', function () {
      writeText('mine.txt', frontMatter + 'やあ\n')
      const probes = {
        t2f_project_info: {},
        t2f_list: {},
        t2f_read: { key: 'map001_event001_page1' },
        t2f_search: { query: 'こんにちは' },
        t2f_syntax: { tag: 'switch' },
        t2f_names: { kind: 'switch' },
        t2f_check: { text: '【誰か】\nやあ\n' },
        t2f_name_plan: { kind: 'switch', id: 3, name: '検査' }
      }
      const offered = mcp.handle({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: { _meta: META }
      }, ctx).result.tools.map(function (t) { return t.name })

      Object.keys(probes).forEach(function (name) {
        expect(offered, name + ' が tools/list に出ていません').to.include(name)
        const result = call(name, probes[name])
        expect(result.structuredContent, name + ' の structuredContent が空です').to.be.an('object')
        expect(Object.keys(result.structuredContent), name + ' の structuredContent に中身がありません')
          .to.have.length.at.least(1)
      })
    })
  })

  describe('missing assets', function () {
    const img = function (folder, name) {
      fs.mkdirSync(path.join(tmp, 'img', folder), { recursive: true })
      fs.writeFileSync(path.join(tmp, 'img', folder, name + '.png'), 'PNG')
    }
    const hasLayer = function () { return !!(ctx.structure() && ctx.assets()) }

    beforeEach(function () {
      img('faces', 'suzu1')
      // 敵グループ1はこうもり。画像は置かない(落ちたゲームと同じ形)。
      fs.writeFileSync(path.join(tmp, 'data', 'Troops.json'), JSON.stringify([
        null, { id: 1, name: 'こうもり*2', members: [{ enemyId: 1 }, { enemyId: 1 }] }
      ]))
      fs.writeFileSync(path.join(tmp, 'data', 'Enemies.json'), JSON.stringify([
        null, { id: 1, name: 'こうもり', battlerName: 'Bat' }
      ]))
      ctx = mcp.createContext({ root: tmp })
    })

    it('says nothing when every asset is there', function () {
      if (!hasLayer()) this.skip()
      const result = call('t2f_check', { text: '<Face: suzu1(0)>\n【スーズ】\nやあ\n' })

      expect(textOf(result)).to.not.contain('素材がありません')
      expect(result.structuredContent.missingAssets).to.eql([])
    })

    it('catches a face that is not in img/faces', function () {
      if (!hasLayer()) this.skip()
      const result = call('t2f_check', { text: '<Face: いない人(0)>\n【誰か】\nやあ\n' })

      expect(textOf(result)).to.contain('img/faces/いない人')
      expect(result.structuredContent.missingAssets).to.have.lengthOf(1)
      // 文法は通っていることも言う(片方だけ直せばよいと分かるように)。
      expect(textOf(result)).to.contain('文法の誤りはありません')
    })

    /* 落ちた形そのもの。これが黙っていたので起動してから落ちた。 */
    it('catches a battle whose enemy art is missing', function () {
      if (!hasLayer()) this.skip()
      const result = call('t2f_check', { text: '<BattleProcessing: 1>\n' })

      expect(textOf(result)).to.contain('img/enemies/Bat')
      expect(textOf(result)).to.contain('こうもり*2')
    })

    it('accepts the battle once the art is there', function () {
      if (!hasLayer()) this.skip()
      img('enemies', 'Bat')
      ctx = mcp.createContext({ root: tmp })

      expect(call('t2f_check', { text: '<BattleProcessing: 1>\n' }).structuredContent.missingAssets).to.eql([])
    })

    /* 横向き戦闘は sv_enemies を使う。どちらかにあれば足りる。 */
    it('takes sv_enemies as well', function () {
      if (!hasLayer()) this.skip()
      img('sv_enemies', 'Bat')
      ctx = mcp.createContext({ root: tmp })

      expect(call('t2f_check', { text: '<BattleProcessing: 1>\n' }).structuredContent.missingAssets).to.eql([])
    })

    /* 最初に呼ぶ道具で分かれば、戦闘を使わない作りを最初から選べる。 */
    it('warns in t2f_project_info when the game has no enemy art at all', function () {
      if (!hasLayer()) this.skip()
      const info = call('t2f_project_info')

      expect(info.structuredContent.battleArt).to.equal(0)
      expect(textOf(info)).to.contain('敵の画像が1枚もありません')
    })

    it('stops warning once the game has enemy art', function () {
      if (!hasLayer()) this.skip()
      img('enemies', 'Bat')
      ctx = mcp.createContext({ root: tmp })

      expect(textOf(call('t2f_project_info'))).to.not.contain('敵の画像が1枚もありません')
    })
  })

  describe('when a page does not exist', function () {
    beforeEach(function () {
      // 2ページのイベントにする(2ページ目には条件を付けておく)。
      const data = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
      data.events[1].pages.push({ conditions: { switch1Valid: true, switch1Id: 1 }, list: msg('2ページ目').concat([bottom]) })
      fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify(data))
      ctx = mcp.createContext({ root: tmp })
    })

    it('says pages cannot be added from text, and why', function () {
      const result = call('t2f_read', { key: 'map001_event001_page3' })

      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('2 ページまで')
      expect(textOf(result)).to.contain('増やすことはできません')
      expect(textOf(result)).to.contain('RPGツクール')
    })

    it('says the same on the writing side', function () {
      const result = call('t2f_write_plan', { key: 'map001_event001_page3', text: frontMatter + 'やあ\n' })
      expect(textOf(result)).to.contain('増やすことはできません')
    })

    it('explains it for the mapId/eventId/pageId form too', function () {
      const result = call('t2f_read', { mapId: 1, eventId: 1, pageId: 3 })
      expect(textOf(result)).to.contain('増やすことはできません')
    })

    /* 本当に名前を間違えたときに同じ説明を出すと、今度はそちらが迷う。 */
    it('keeps the plain message when the key is simply wrong', function () {
      const result = call('t2f_read', { key: 'map009_event009_page1' })

      expect(textOf(result)).to.contain('t2f_list')
      expect(textOf(result)).to.not.contain('増やすことはできません')
    })
  })

  describe('t2f_name_plan と t2f_name_apply', function () {
    const systemFile = function () { return path.join(tmp, 'data', 'System.json') }
    const system = function () { return JSON.parse(fs.readFileSync(systemFile(), 'utf8')) }

    it('names an unnamed switch, and nothing else in System.json moves', function () {
      const before = system()
      const plan = call('t2f_name_plan', { kind: 'switch', id: 3, name: 'サメが出た' })
      expect(plan.isError, textOf(plan)).to.equal(undefined)
      // 下書きは1バイトも書かない。
      expect(system()).to.eql(before)

      const applied = call('t2f_name_apply', { token: plan.structuredContent.token })
      expect(applied.isError, textOf(applied)).to.equal(undefined)

      const after = system()
      expect(after.switches[3]).to.equal('サメが出た')
      // 配列の長さも、ほかのキーも動かさない(全体を作り直していないこと)。
      expect(after.switches).to.have.lengthOf(before.switches.length)
      expect(after.gameTitle).to.equal('テストのゲーム')
      expect(after.partyMembers).to.eql([1, 2])
      expect(after.variables).to.eql(before.variables)
    })

    it('names a variable too', function () {
      const plan = call('t2f_name_plan', { kind: 'variable', id: 2, name: '話した回数' })
      call('t2f_name_apply', { token: plan.structuredContent.token })

      expect(system().variables[2]).to.equal('話した回数')
    })

    /* 人が付けた名前を黙って奪わない。 */
    it('refuses a name that is already taken unless forced', function () {
      const refused = call('t2f_name_plan', { kind: 'switch', id: 1, name: '別の名前' })
      expect(refused.isError).to.equal(true)
      expect(textOf(refused)).to.contain('ドアを開けた')
      expect(textOf(refused)).to.contain('force')

      const forced = call('t2f_name_plan', { kind: 'switch', id: 1, name: '別の名前', force: true })
      expect(forced.isError, textOf(forced)).to.equal(undefined)
      call('t2f_name_apply', { token: forced.structuredContent.token })
      expect(system().switches[1]).to.equal('別の名前')
    })

    /* 同じ名前を頼んだだけで force を要求するのは、やることが無いのに手間を増やしている。 */
    it('says there is nothing to do when the name already matches', function () {
      const result = call('t2f_name_plan', { kind: 'switch', id: 1, name: 'ドアを開けた' })

      expect(result.isError).to.equal(undefined)
      expect(result.structuredContent.changed).to.equal(false)
      expect(result.structuredContent.token).to.equal(undefined)
    })

    it('only takes switches and variables', function () {
      const result = call('t2f_name_plan', { kind: 'item', id: 1, name: 'なにか' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('switch')
    })

    it('will not name a slot the game does not have', function () {
      const result = call('t2f_name_plan', { kind: 'switch', id: 99, name: 'なにか' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('RPGツクール')
    })

    it('turns down an empty name', function () {
      expect(call('t2f_name_plan', { kind: 'switch', id: 3, name: '   ' }).isError).to.equal(true)
    })

    /* 札は一度だけ。使い回せると、同じ書き込みが二度走る。 */
    it('spends the token once', function () {
      const plan = call('t2f_name_plan', { kind: 'switch', id: 3, name: '一回だけ' })
      call('t2f_name_apply', { token: plan.structuredContent.token })

      const again = call('t2f_name_apply', { token: plan.structuredContent.token })
      expect(again.isError).to.equal(true)
      expect(textOf(again)).to.contain('その札は使えません')
    })

    /* ツクールのエディタが書き戻していたら断る(あちらも System.json を持っている)。 */
    it('refuses when System.json moved after the draft', function () {
      const plan = call('t2f_name_plan', { kind: 'switch', id: 3, name: 'あとで' })
      const data = system()
      data.gameTitle = '誰かが変えた'
      fs.writeFileSync(systemFile(), JSON.stringify(data))

      const result = call('t2f_name_apply', { token: plan.structuredContent.token })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('System.json が変わりました')
      expect(system().switches[3]).to.equal('')
    })

    /* 戻せることが、書き込みを許す条件。 */
    it('keeps the previous System.json in .t2f-history', function () {
      const plan = call('t2f_name_plan', { kind: 'switch', id: 3, name: '控えの検査' })
      const applied = call('t2f_name_apply', { token: plan.structuredContent.token })

      expect(applied.structuredContent.historyId).to.be.a('string')
      const entries = fs.readdirSync(path.join(tmp, '.t2f-history')).filter(function (n) { return n.indexOf('.') !== 0 })
      expect(entries).to.have.lengthOf(1)
      const entry = JSON.parse(fs.readFileSync(path.join(tmp, '.t2f-history', entries[0], 'entry.json'), 'utf8'))
      expect(entry.op).to.equal('mcp-name')
      expect(entry.files.map(function (f) { return f.path })).to.eql(['data/System.json'])
    })
  })

  describe('t2f_read', function () {
    it('returns the front matter and the body, and writes nothing', function () {
      const before = fs.readdirSync(path.join(tmp, 'text'))
      const text = textOf(call('t2f_read', { key: 'map001_event001_page1' }))

      expect(text).to.contain('kind: event')
      expect(text).to.contain('<Switch: 1, ON>')
      expect(text).to.contain('こんにちは')
      expect(fs.readdirSync(path.join(tmp, 'text'))).to.eql(before)
    })

    it('finds the target by ids as well as by key', function () {
      expect(textOf(call('t2f_read', { mapId: '1', eventId: '1', pageId: '1' })))
        .to.equal(textOf(call('t2f_read', { key: 'map001_event001_page1' })))
      expect(textOf(call('t2f_read', { commonEventId: '1' }))).to.contain('コモンの文')
    })

    /* 会話だけ抜いたものは往復しないので、書き戻す元には使えない。 */
    it('drops everything but the conversation when asked', function () {
      const text = textOf(call('t2f_read', { key: 'map001_event001_page1', translationOnly: true }))

      expect(text).to.contain('こんにちは')
      expect(text).to.not.contain('<Switch:')
    })

    it('says so when the target does not exist', function () {
      expect(call('t2f_read', { key: 'map999_event001_page1' }).isError).to.equal(true)
    })
  })

  describe('t2f_search', function () {
    it('resolves a hit back to its target', function () {
      writeText('a.txt', frontMatter + 'やあ\nこんにちは\n')
      const hits = call('t2f_search', { query: 'こんにちは' }).structuredContent.hits

      expect(hits).to.have.lengthOf(1)
      expect(hits[0].textPath).to.equal('text/a.txt')
      expect(hits[0].line).to.equal(9)
      expect(hits[0].target).to.contain('map 1')
    })

    it('marks a hit in a text that has no front matter', function () {
      writeText('loose.txt', 'こんにちは\n')
      expect(call('t2f_search', { query: 'こんにちは' }).structuredContent.hits[0].target).to.equal(null)
    })

    it('honours the limit', function () {
      writeText('a.txt', frontMatter + 'やあ\nやあ\nやあ\n')
      expect(call('t2f_search', { query: 'やあ', limit: 2 }).structuredContent.hits).to.have.lengthOf(2)
    })
  })

  describe('t2f_syntax', function () {
    it('lists the headings when asked for nothing', function () {
      const sections = call('t2f_syntax').structuredContent.sections
      expect(sections.length).to.be.greaterThan(100)
    })

    it('looks a tag up by any of its names, with or without the brackets', function () {
      const plain = textOf(call('t2f_syntax', { tag: 'switch' }))
      expect(plain).to.contain('スイッチの操作')
      expect(textOf(call('t2f_syntax', { tag: '<Switch: 1, ON>' }))).to.equal(plain)
      expect(textOf(call('t2f_syntax', { tag: 'スイッチ' }))).to.equal(plain)
    })

    /* 命令は日本語名・英語名・短縮形で書けるが、節を読まないとそれが分からない。 */
    it('says the other names the same command answers to', function () {
      const result = call('t2f_syntax', { tag: 'add' })

      expect(textOf(result)).to.contain('書ける名前')
      expect(result.structuredContent.aliases).to.include.members(['add', '加算', '+'])
    })

    /* **これが引けなかった。** 照合がタグ名だけで、見出しの題を見ていなかった。
     * 実プロジェクトでイベントを作る試用のとき、ここで実際に手が止まった。 */
    it('finds a command by its heading, not just by its tag name', function () {
      // 「変数」というタグ名は1つも無く、見出しの題にだけ出る。
      expect(textOf(call('t2f_syntax', { tag: '変数' }))).to.contain('変数の操作')
      expect(textOf(call('t2f_syntax', { tag: '変数の操作' }))).to.contain('変数の操作')
    })

    /* 題が複数に当たるのは曖昧さが本物のとき(スイッチ / セルフスイッチ)。
     * そのときは**引き直せるタグ名**を添える。題だけ見せて「タグ名で引き直して」は不親切。 */
    it('lists the candidates with a tag you can look up again', function () {
      const result = call('t2f_syntax', { tag: 'スイッチの操作' })
      const titles = result.structuredContent.candidates.map(function (c) { return c.title })

      expect(titles.join(' / ')).to.contain('セルフスイッチの操作')
      result.structuredContent.candidates.forEach(function (c) {
        expect(c.tag, c.title + ' に引き直せる tag がありません').to.be.a('string')
        // 添えた tag で本当に節が引けること(鳴らない案内にしない)。
        expect(textOf(call('t2f_syntax', { tag: c.tag }))).to.contain('○ ')
      })
    })

    it('still says so when nothing matches at all', function () {
      const result = call('t2f_syntax', { tag: 'そんなタグは無い' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('見出しの一覧')
    })
  })

  describe('t2f_names', function () {
    it('gives the number for a named switch', function () {
      const names = call('t2f_names', { kind: 'switch' }).structuredContent.switch
      expect(names).to.eql([{ id: 1, name: 'ドアを開けた' }, { id: 2, name: '橋がかかった' }])
    })

    it('narrows by name across every kind', function () {
      const out = call('t2f_names', { query: '橋' }).structuredContent
      expect(out.switch).to.eql([{ id: 2, name: '橋がかかった' }])
      expect(out.variable).to.equal(undefined)
    })

    it('says when a project has no names yet', function () {
      fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify({ switches: ['', ''], variables: [''] }))
      expect(textOf(call('t2f_names', { kind: 'switch' }))).to.contain('まだ名前が付いていません')
    })
  })

  describe('t2f_names の種類と同名', function () {
    it('offers all sixteen kinds', function () {
      const names = mcp.TOOLS.filter(function (t) { return t.name === 't2f_names' })[0]
      const kinds = mcp.describeTool(names).inputSchema.properties.kind.enum

      expect(kinds).to.have.lengthOf(16)
      // 前は13種類で、この3つが無かった。
      expect(kinds).to.include.members(['equipType', 'map', 'tileset'])
    })

    it('reads the three that were missing', function () {
      fs.writeFileSync(path.join(tmp, 'data', 'Tilesets.json'), JSON.stringify([null, { id: 1, name: '街の外' }]))
      const data = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'System.json'), 'utf8'))
      data.equipTypes = ['', '武器', '盾']
      fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify(data))
      ctx = mcp.createContext({ root: tmp })

      expect(call('t2f_names', { kind: 'tileset' }).structuredContent.tileset[0].name).to.equal('街の外')
      expect(call('t2f_names', { kind: 'equipType' }).structuredContent.equipType[0].name).to.equal('武器')
      // map は MapInfos.json から。
      expect(call('t2f_names', { kind: 'map' }).structuredContent.map[0].name).to.equal('はじまりの村')
    })

    /* 実データでは258件のスイッチのうち12の名前が重複していた。名前で探すと複数に
     * 当たるので、番号を取り違える。 */
    it('marks the entries that share a name', function () {
      const data = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'System.json'), 'utf8'))
      data.switches = ['', 'シャチ', '橋がかかった', 'シャチ']
      fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify(data))
      ctx = mcp.createContext({ root: tmp })

      const rows = call('t2f_names', { kind: 'switch' }).structuredContent.switch
      const shared = rows.filter(function (r) { return r.name === 'シャチ' })
      expect(shared).to.have.lengthOf(2)
      shared.forEach(function (r) { expect(r.sameName).to.equal(2) })
      expect(rows.filter(function (r) { return r.name === '橋がかかった' })[0].sameName).to.equal(undefined)
      expect(textOf(call('t2f_names', { kind: 'switch' }))).to.contain('同名 ×2')
    })

    /* 絞り込むと重複が1件しか返らないので、**数えるのは絞る前**でなければ印が消える。 */
    it('keeps the mark even when the query narrows it to one', function () {
      const data = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'System.json'), 'utf8'))
      data.switches = ['', 'シャチ', 'シャチ']
      fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify(data))
      ctx = mcp.createContext({ root: tmp })

      const rows = call('t2f_names', { kind: 'switch', query: 'シャチ' }).structuredContent.switch
      rows.forEach(function (r) { expect(r.sameName, '絞り込みで印が消えています').to.equal(2) })
    })
  })

  describe('t2f_check', function () {
    it('counts the commands when the text is sound', function () {
      const result = call('t2f_check', { text: '<スイッチ: 1, オン>\nやあ\n' })
      expect(result.isError).to.equal(undefined)
      expect(result.structuredContent.commandCount).to.be.greaterThan(0)
    })

    /* コンパイラは寛容で、知らないタグはセリフになる。投げるのは値が選択肢から外れたとき。 */
    it('reports the mistake instead of throwing', function () {
      const result = call('t2f_check', { text: '<位置: よこ>\n' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('文法エラー')
    })

    it('treats an unknown tag as dialogue, not as a mistake', function () {
      expect(call('t2f_check', { text: '<Nope: 1>\n' }).isError).to.equal(undefined)
    })

    it('ignores the front matter', function () {
      expect(call('t2f_check', { text: frontMatter + 'やあ\n' }).isError).to.equal(undefined)
    })
  })

  describe('the root', function () {
    it('refuses a data folder outside it', function () {
      expect(function () { mcp.createContext({ root: tmp, dataDir: '../elsewhere' }) }).to.throw('--root の外')
    })

    it('refuses a text folder outside it', function () {
      expect(function () { mcp.createContext({ root: tmp, textDir: '/tmp/elsewhere' }) }).to.throw('--root の外')
    })

    it('refuses a strategy it cannot pass on', function () {
      // add は走査のたびに内容が二重になるので、この前面からは出さない。
      expect(function () { mcp.createContext({ root: tmp, strategy: 'add' }) }).to.throw('merge か overwrite')
    })
  })

  describe('t2f_write_plan', function () {
    const plan = function (args) {
      return call('t2f_write_plan', Object.assign({ key: 'map001_event001_page1' }, args))
    }

    /* 下書きは本物を1バイトも書かない。写しに当ててから捨てる。 */
    it('writes nothing at all', function () {
      const dataBefore = fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')
      const result = plan({ text: 'こんばんは\n' })

      expect(result.isError).to.equal(undefined)
      expect(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).to.equal(dataBefore)
      expect(fs.readdirSync(path.join(tmp, 'text'))).to.eql([])
    })

    it('shows the game as it is and as it would become', function () {
      const out = plan({ text: 'こんばんは\n' }).structuredContent

      expect(out.before).to.contain('こんにちは')
      expect(out.after).to.contain('こんばんは')
      expect(out.token).to.be.a('string').with.length.greaterThan(20)
      expect(out.textExists).to.equal(false)
      /* まだ無いテキストの名前は defaultFileName が決める。MapInfos があるので
       * ツリー順と階層つきマップ名が入る(読めないときだけ map001_event001_page1 の形)。 */
      expect(out.textPath).to.equal('text/001_はじまりの村_EV001_page1_map001-event001.txt')
    })

    /* 祖先が無い回はテキストが丸ごと勝つ。エージェントが気づけるよう、警告をそのまま載せる。 */
    it('passes the first-apply warning through', function () {
      expect(plan({ text: 'こんばんは\n' }).structuredContent.warnings.join('\n')).to.contain('初回反映')
    })

    /* 祖先があるときは初回扱いにしない。下書きが実物と食い違わないよう、本物の祖先を読む。 */
    it('reads the real ancestor, so an existing one is not reported as the first apply', function () {
      const token = plan({ text: 'こんばんは\n' }).structuredContent.token
      call('t2f_write_apply', { token })

      const again = plan({ text: 'こんばんは、また\n' }).structuredContent
      expect(again.warnings.join('\n')).to.not.contain('初回反映')
    })

    it('says the same token for the same plan', function () {
      expect(plan({ text: 'やあ\n' }).structuredContent.token).to.equal(plan({ text: 'やあ\n' }).structuredContent.token)
      expect(plan({ text: 'やあ\n' }).structuredContent.token).to.not.equal(plan({ text: 'ちがう\n' }).structuredContent.token)
    })

    it('refuses a strategy it cannot pass on', function () {
      expect(plan({ text: 'やあ\n', strategy: 'add' }).isError).to.equal(true)
    })

    it('reports a text it cannot compile instead of throwing', function () {
      const result = plan({ text: '<位置: よこ>\n' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('反映できません')
    })
  })

  describe('t2f_write_apply', function () {
    const planFor = function (text) {
      return call('t2f_write_plan', { key: 'map001_event001_page1', text }).structuredContent.token
    }
    const gameText = function () {
      const list = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).events[1].pages[0].list
      return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] }).join(',')
    }

    it('writes the game and the text, and records the pre-image', function () {
      const result = call('t2f_write_apply', { token: planFor('こんばんは\n') })

      expect(result.isError).to.equal(undefined)
      expect(gameText()).to.equal('こんばんは')
      expect(fs.existsSync(path.join(tmp, 'text', result.structuredContent.textPath.replace('text/', '')))).to.equal(true)
      expect(result.structuredContent.historyId).to.be.a('string')
      expect(fs.existsSync(path.join(tmp, '.t2f-history', result.structuredContent.historyId))).to.equal(true)
    })

    /* 控えのフォルダは、利用者のゲームが git 管理下でも入らないようにしておく。 */
    it('keeps its own snapshots out of git', function () {
      call('t2f_write_apply', { token: planFor('こんばんは\n') })
      expect(fs.readFileSync(path.join(tmp, '.t2f-history', '.gitignore'), 'utf8')).to.equal('*\n')
    })

    it('spends the token, so the same plan cannot be applied twice', function () {
      const token = planFor('こんばんは\n')
      expect(call('t2f_write_apply', { token }).isError).to.equal(undefined)
      expect(call('t2f_write_apply', { token }).isError).to.equal(true)
    })

    it('refuses a token it does not know', function () {
      const result = call('t2f_write_apply', { token: 'でたらめ' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('t2f_write_plan からやり直して')
    })

    /* 下書きのあとに人かツクールが触っていたら断る(拡張がレビュー後に指紋を見直すのと同じ)。 */
    it('refuses when the game changed after the plan', function () {
      const token = planFor('こんばんは\n')
      const dataPath = path.join(tmp, 'data', 'Map001.json')
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      data.events[1].pages[0].list[2].parameters[0] = 'ツクールで直した'
      fs.writeFileSync(dataPath, JSON.stringify(data))

      const result = call('t2f_write_apply', { token })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('ゲームのデータが変わりました')
      expect(gameText()).to.equal('ツクールで直した')
    })

    it('refuses when the text changed after the plan', function () {
      writeText('map001_event001_page1.txt', frontMatter + 'さいしょ\n')
      const token = planFor('こんばんは\n')
      writeText('map001_event001_page1.txt', frontMatter + 'あとで直した\n')

      const result = call('t2f_write_apply', { token })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('テキストが変わりました')
    })
  })

  /* 目印が残っている間は統合が止まる。上書きは詰まった統合からの出口なので通す。 */
  describe('conflict markers', function () {
    const marked = '<comment>\n=== テキストの変更 / from text ===\n</comment>\n\nやあ\n'

    it('stops a merge', function () {
      const result = call('t2f_write_plan', { key: 'map001_event001_page1', text: marked, strategy: 'merge' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('目印')
    })

    it('lets an overwrite through, which is the way out', function () {
      const result = call('t2f_write_plan', { key: 'map001_event001_page1', text: marked, strategy: 'overwrite' })
      expect(result.isError).to.equal(undefined)
    })
  })

  describe('read-only', function () {
    it('offers only the reading tools', function () {
      const readOnly = mcp.createContext({ root: tmp, readOnly: true })
      const listed = mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } }, readOnly)

      expect(listed.result.tools.length).to.be.greaterThan(0)
      listed.result.tools.forEach(function (tool) {
        expect(tool.annotations.readOnlyHint, tool.name).to.equal(true)
      })
      const names = listed.result.tools.map(function (t) { return t.name })
      expect(names).to.not.include('t2f_write_apply')
      /* 下書きも隠す。本当に何も書かないので readOnlyHint は true のままだが、
       * 適用できない下書きを勧めても使えない。注釈とこの絞り込みは別の関心。 */
      expect(names).to.not.include('t2f_write_plan')
    })

    /* 一覧から消すだけでなく、名前で呼ばれても断る。 */
    it('refuses to call a write tool even by name', function () {
      const readOnly = mcp.createContext({ root: tmp, readOnly: true })
      const response = mcp.handle({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 't2f_write_apply', arguments: { token: 'x' }, _meta: META }
      }, readOnly)

      expect(response.error.code).to.equal(-32602)
    })

    /* 再生の道具は、ゲームを動かすしかできない(--read-only では t2f_play_start が
     * 隠れるので、見えても繋ぐ手段が無い)。だから一群ごと消す。 */
    it('hides the play tools too', function () {
      const readOnly = mcp.createContext({ root: tmp, readOnly: true })
      const names = mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } }, readOnly)
        .result.tools.map(function (t) { return t.name })

      expect(names.filter(function (n) { return n.indexOf('t2f_play_') === 0 })).to.eql([])
    })
  })

  /* 再生の層(gameServer / liveState)は TypeScript の生成物なので、配り方によっては無い。
   * **この機械に層があるかで検査が変わらないよう、ctx.live を差し替えて両方を見る**
   * (tools/snapshot-mcp.js が筆記録で同じことをしている)。往復そのものは拡張の側の
   * test_mcp_play.js が本物の層で見る。 */
  describe('the live layer', function () {
    const listed = function (ctx) {
      return mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } }, ctx)
        .result.tools.map(function (t) { return t.name })
        .filter(function (n) { return n.indexOf('t2f_play_') === 0 })
    }

    it('offers the nine play tools where it resolved', function () {
      const withLive = mcp.createContext({ root: tmp })
      withLive.live = function () { return { gameServer: {}, liveState: {} } }

      expect(listed(withLive)).to.have.lengthOf(9)
    })

    it('offers none of them where it did not', function () {
      const without = mcp.createContext({ root: tmp })
      without.live = function () { return undefined }

      expect(listed(without)).to.eql([])
    })

    /* 一覧から消すだけでなく、名前で呼ばれても断る。扱いを1つに保つ。 */
    it('refuses to call one by name where it did not resolve', function () {
      const without = mcp.createContext({ root: tmp })
      without.live = function () { return undefined }
      const response = mcp.handle({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 't2f_play_start', arguments: {}, _meta: META }
      }, without)

      expect(response.error.code).to.equal(-32602)
      expect(response.error.message).to.contain('知らない道具')
    })

    /* **待つのはこの一群だけ**(殻の不変条件: 書き込みの道具は同期のまま)。旗を立てて
     * 数えると旗の方が腐るので、実際に呼んで Promise が返らないことを見る。 */
    it('is the only group whose tools may wait', function () {
      const sync = {
        t2f_project_info: {},
        t2f_list: {},
        t2f_read: { key: 'map001_event001_page1' },
        t2f_search: { query: 'ごはん' },
        t2f_syntax: {},
        t2f_names: { kind: 'switch' },
        t2f_check: { text: 'ごはん' },
        t2f_write_plan: { key: 'map001_event001_page1', text: 'ごはん' }
      }
      Object.keys(sync).forEach(function (name) {
        const response = mcp.handle({
          jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: sync[name], _meta: META }
        }, ctx)
        expect(typeof response.then, name + ' が待つようになっています').to.equal('undefined')
      })
    })
  })
})
