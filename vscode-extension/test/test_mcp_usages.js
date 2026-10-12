const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')
const mcp = require('../../t2f-mcp.js')
const eventLinks = require('../out/db/eventLinks')

/* 番号の逆引き。つながりを見分ける規則は1行も書いておらず、拡張の純粋な層
 * (src/db/eventLinks.ts の commandLinks / conditionLinks / commonTriggerLinks)が
 * 持っている。ここで見るのは配線の方 — 鍵の組み立て、結果に名前が付くこと、
 * **条件分岐での「読み」が入っていないこと**(入っていないと知らせる約束)。
 *
 * **根のテストではなく、こちらに置いてある。** 借りている層は TypeScript の生成物で
 * gitignore されており、拡張をコンパイルした機械にしか無い。根の suite に置くと
 * CI の core ジョブ(拡張をコンパイルしない別ジョブ)で毎回飛ばされ、鳴らない番人になる。
 * こちらは pretest = npm run compile の後に走るので必ず層がある。
 * 同じ理由で同じ場所に居るのが test_mcp_history.js(あちらも根の t2f-history.js と
 * 拡張の out/db/history を両方読む)。 */
const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {}
}

describe('mcp usages', function () {
  let tmp
  let ctx

  const call = function (name, args) {
    const response = mcp.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args || {}, _meta: META }
    }, ctx)
    expect(response.error, JSON.stringify(response.error)).to.equal(undefined)
    return response.result
  }
  const usages = function (args) { return call('t2f_usages', args) }
  const textOf = function (result) { return result.content[0].text }

  /* マップ1: イベント1 がスイッチ5を ON にし、変数7を変え、コモン3を呼び、
   * 条件分岐でスイッチ5を**読む**。イベント2 の2ページ目はスイッチ5で出現する。 */
  const bottom = { code: 0, indent: 0, parameters: [] }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-usages-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.mkdirSync(path.join(tmp, 'text'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        name: 'スイッチ係',
        pages: [{
          conditions: {},
          list: [
            { code: 121, indent: 0, parameters: [5, 5, 0] },
            { code: 122, indent: 0, parameters: [7, 7, 0, 0, 1] },
            { code: 117, indent: 0, parameters: [3] },
            // 条件分岐でスイッチ5を読む。これは**図に入らない**side。
            { code: 111, indent: 0, parameters: [0, 5, 0] },
            bottom
          ]
        }]
      }, {
        id: 2,
        name: 'あとで出る人',
        pages: [
          { conditions: {}, list: [bottom] },
          { conditions: { switch1Valid: true, switch1Id: 5 }, list: [bottom] }
        ]
      }]
    }))
    /* マップ2 は出口だけのマップ。関門のある出口と無い出口を並べる。
     * 「どの出口も無条件だ」と読まれると進行の詰まりを見落とすので、ここが肝。 */
    fs.writeFileSync(path.join(tmp, 'data', 'Map002.json'), JSON.stringify({
      events: [null, {
        id: 1,
        name: '素通り',
        pages: [{ conditions: {}, list: [{ code: 201, indent: 0, parameters: [0, 1, 5, 5, 0, 0] }, bottom] }]
      }, {
        id: 2,
        name: '関門',
        pages: [{
          conditions: {},
          list: [
            { code: 111, indent: 0, parameters: [1, 2, 0, 5, 1] },
            { code: 201, indent: 1, parameters: [0, 1, 9, 9, 0, 0] },
            { code: 412, indent: 0, parameters: [] },
            bottom
          ]
        }]
      }, {
        id: 3,
        name: 'それ以外のとき',
        pages: [{
          conditions: {},
          list: [
            { code: 111, indent: 0, parameters: [0, 5, 0] },
            { code: 411, indent: 0, parameters: [] },
            { code: 201, indent: 1, parameters: [0, 1, 1, 1, 0, 0] },
            { code: 412, indent: 0, parameters: [] },
            bottom
          ]
        }]
      }, {
        id: 4,
        name: '選ばせる',
        pages: [{
          conditions: {},
          list: [
            { code: 102, indent: 0, parameters: [['行く', 'やめる'], 1] },
            { code: 402, indent: 0, parameters: [0, '行く'] },
            { code: 201, indent: 1, parameters: [0, 1, 2, 2, 0, 0] },
            { code: 404, indent: 0, parameters: [] },
            bottom
          ]
        }]
      }, {
        id: 5,
        name: '二重の関門',
        pages: [{
          conditions: {},
          list: [
            { code: 111, indent: 0, parameters: [0, 5, 0] },
            { code: 111, indent: 1, parameters: [1, 2, 0, 5, 1] },
            { code: 201, indent: 2, parameters: [0, 1, 3, 3, 0, 0] },
            { code: 412, indent: 1, parameters: [] },
            { code: 412, indent: 0, parameters: [] },
            bottom
          ]
        }]
      }, {
        id: 6,
        name: '行き先は変数',
        pages: [{ conditions: {}, list: [{ code: 201, indent: 0, parameters: [1, 11, 12, 13, 0, 0] }, bottom] }]
      }]
    }))
    fs.writeFileSync(path.join(tmp, 'data', 'MapInfos.json'), JSON.stringify([
      null, { id: 1, name: '入口' }, { id: 2, name: '広間' }
    ]))
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([
      null,
      null,
      null,
      { id: 3, name: '呼ばれるやつ', trigger: 0, switchId: 0, list: [bottom] }
    ]))
    fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify({
      switches: ['', '', '', '', '', '扉が開いた'],
      variables: ['', '', 'ルルを探した', '', '', '', '', '話した回数']
    }))
    ctx = mcp.createContext({ root: tmp })
  })
  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  it('finds who turns a switch on, and which page it makes appear', function () {
    const result = usages({ kind: 'switch', id: 5 })

    expect(result.isError, textOf(result)).to.equal(undefined)
    expect(result.structuredContent.key).to.equal('s:5')
    // 操作しているのはイベント1の1ページ。
    expect(result.structuredContent.inbound.map(function (r) { return r.place })).to.eql(['e:1:1:1'])
    expect(result.structuredContent.inbound[0].how).to.equal('switchOn')
    // これで出現するのはイベント2の2ページ。
    expect(result.structuredContent.outbound.map(function (r) { return r.place })).to.eql(['e:1:2:2'])
    expect(result.structuredContent.outbound[0].how).to.equal('condition')
  })

  /* 番号だけ返しても人には読めない。名前はデータベースから引く。 */
  it('puts the database name on the subject and the event names on the places', function () {
    const text = textOf(usages({ kind: 'switch', id: 5 }))

    expect(text).to.contain('スイッチ5「扉が開いた」')
    expect(text).to.contain('イベント1「スイッチ係」')
  })

  it('finds a variable and a common event too', function () {

    const variable = usages({ kind: 'variable', id: 7 })
    expect(variable.structuredContent.label).to.contain('話した回数')
    expect(variable.structuredContent.inbound.map(function (r) { return r.how })).to.eql(['variable'])

    const common = usages({ kind: 'commonEvent', id: 3 })
    expect(common.structuredContent.inbound.map(function (r) { return r.place })).to.eql(['e:1:1:1'])
    expect(common.structuredContent.inbound[0].how).to.equal('call')
  })

  /* **マップの「出ていく側」。** index.out('m:N') は構造上いつも空(辺は必ず
   * 「ページかコモンイベント → もの」の向きで、マップは行き先にしかならない)。
   * 畳んだ移動から引き直す。 */
  describe('the exits of a map', function () {
    const exitsOf = function (id) { return usages({ kind: 'map', id }).structuredContent.exits }
    // 鍵は丸ごと突き合わせる。部分一致だと e:2:1:1 が eventId=2 にも当たる。
    const forEvent = function (id, eventId) {
      return exitsOf(id).filter(function (one) { return one.place === 'e:' + id + ':' + eventId + ':1' })[0]
    }

    it('lists where you can go from here, with the destination named', function () {
      const result = usages({ kind: 'map', id: 2 })

      expect(result.structuredContent.exitsTotal).to.equal(6)
      expect(forEvent(2, 1).toMap).to.equal(1)
      expect(forEvent(2, 1).toLabel).to.contain('入口')
      expect(textOf(result)).to.contain('ここから出ていく')
    })

    /* **今回の肝。** 条件が出ないと「どこへでも行ける」と読まれる(実際に誤読された)。 */
    it('says what blocks the exit', function () {
      const gated = forEvent(2, 2)

      expect(gated.guards).to.have.lengthOf(1)
      expect(gated.guards[0].text).to.contain('Variables[2]')
      expect(gated.guards[0].text).to.contain('5')
      expect(gated.guards[0].negated).to.equal(false)
      expect(textOf(usages({ kind: 'map', id: 2 }))).to.contain('条件: <If: Variables[2], >=, 5>')
    })

    /* 条件が無いことは**黙らずに言う**。黙ると、条件を取れていないのか本当に無いのかが
     * 区別できない。 */
    it('says plainly when an exit has no condition', function () {
      expect(forEvent(2, 1).guards).to.eql([])
      expect(textOf(usages({ kind: 'map', id: 2 }))).to.contain('条件なし')
    })

    it('says it the other way round for the else side', function () {
      const other = forEvent(2, 3)

      expect(other.guards).to.have.lengthOf(1)
      expect(other.guards[0].negated, 'それ以外のときだと言えていません').to.equal(true)
      expect(other.guards[0].text).to.contain('Switches[5]')
    })

    it('keeps both of a nested pair, outermost first', function () {
      const deep = forEvent(2, 5)

      expect(deep.guards).to.have.lengthOf(2)
      expect(deep.guards[0].text).to.contain('Switches[5]')
      expect(deep.guards[1].text).to.contain('Variables[2]')
    })

    /* 選択肢の先にある出口を「無条件」と言うと、選ばないと通れないことが消える。 */
    it('counts a chosen branch as a condition', function () {
      const picked = forEvent(2, 4)

      expect(picked.guards).to.have.lengthOf(1)
      expect(picked.guards[0].text).to.contain('行く')
    })

    /* 行き先が変数で決まる出口を落とすと「出口はこれで全部」と誤解させる。 */
    it('keeps an exit whose destination a variable decides', function () {
      const guess = forEvent(2, 6)

      expect(guess.toMap).to.equal(null)
      expect(guess.byVariable).to.be.a('number')
      expect(textOf(usages({ kind: 'map', id: 2 }))).to.contain('行き先は変数')
    })

    /* 入ってくる側はこれまでどおり。マップ1 へはマップ2 から6本入る。 */
    it('still answers which events come in here', function () {
      const result = usages({ kind: 'map', id: 1 })

      expect(result.structuredContent.inboundTotal).to.be.greaterThan(0)
      expect(textOf(result)).to.contain('ここへ入ってくる')
    })

    /* 覆えない範囲は書いておく。 */
    it('says what it does not cover', function () {
      expect(textOf(usages({ kind: 'map', id: 2 }))).to.contain('スクリプトやプラグインコマンド')
    })

    /* マップ以外では出口の節を出さない(意味が無い)。 */
    it('offers no exits for anything but a map', function () {
      expect(usages({ kind: 'switch', id: 5 }).structuredContent.exits).to.eql([])
    })
  })

  /* つながり(操作・呼び出し・出現条件)は commandLinks が持ち、**条件分岐での読みは
   * そこに入らない**。だから参照箇所を別の面として並べる。 */
  it('keeps the link graph to operations only', function () {
    const result = usages({ kind: 'switch', id: 5 })

    // 読んでいるのもイベント1の1ページだが、つながりに入るのは ON にした1本だけ。
    expect(result.structuredContent.inboundTotal).to.equal(1)
  })

  /* 条件分岐(111)での読みは、ここにしか出ない。 */
  it('lists the conditional branch as a reference', function () {
    const result = usages({ kind: 'switch', id: 5 })
    const refs = result.structuredContent.references

    expect(result.structuredContent.referencesCovered).to.equal(true)
    expect(refs.map(function (r) { return r.commandCode })).to.include(111)
    expect(textOf(result)).to.contain('参照箇所')
  })

  /* 操作でもある行には印を付ける。**引き算で読みを出さない**のがここの約束。 */
  it('marks a reference that is also an operation', function () {
    const result = usages({ kind: 'switch', id: 5 })
    const refs = result.structuredContent.references
    const write = refs.filter(function (r) { return r.commandCode === 121 })[0]

    expect(write, 'ON にしている箇所が参照に出ていません').to.be.an('object')
    expect(write.alsoOperates).to.equal(true)
    expect(refs.filter(function (r) { return r.commandCode === 111 })[0].alsoOperates).to.equal(false)
  })

  /* **引き算を捨てた理由。** 自己加算は最頻出の形で、「全参照 − 操作」では
   * 読みが消える。印を付けるだけなら残る。 */
  it('still lists a self-increment, which subtraction would have lost', function () {
    const data = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
    // 変数7 += 変数7
    data.events[1].pages[0].list.unshift({ code: 122, indent: 0, parameters: [7, 7, 1, 1, 7] })
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify(data))
    ctx = mcp.createContext({ root: tmp })

    const refs = usages({ kind: 'variable', id: 7 }).structuredContent.references
    const spot = refs.filter(function (r) { return r.commandCode === 122 })[0]

    expect(spot, '自己加算が参照に出ていません').to.be.an('object')
    expect(spot.alsoOperates).to.equal(true)
  })

  /* 書き込みなのに commandLinks が拾わないもの(数値入力)。引き算だと読みと誤判定する。
   * 印なら「参照箇所」に出るだけで、読みだとは言わない。 */
  it('does not call a number-input write a read', function () {
    const data = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
    data.events[1].pages[0].list.unshift({ code: 103, indent: 0, parameters: [9, 4] })
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify(data))
    ctx = mcp.createContext({ root: tmp })

    const result = usages({ kind: 'variable', id: 9 })
    expect(result.structuredContent.references.map(function (r) { return r.commandCode })).to.include(103)
    // 「読み」という言葉は使っていない(データが read/write の軸を持っていないため)。
    expect(textOf(result)).to.not.contain('読み')
  })

  /* 本文の \\V[5] もコマンドなので拾える。 */
  it('picks up an escape code in the message body', function () {
    const data = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
    data.events[1].pages[0].list.unshift({ code: 401, indent: 0, parameters: ['\\V[11] 個あります'] })
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify(data))
    ctx = mcp.createContext({ root: tmp })

    expect(usages({ kind: 'variable', id: 11 }).structuredContent.referencesTotal).to.be.at.least(1)
  })

  /* 空の節を黙って返さず、出ないと書く。 */
  it('says the references cannot be listed for a self switch', function () {
    const result = usages({ kind: 'selfSwitch', mapId: 1, eventId: 1, letter: 'A' })

    expect(result.structuredContent.referencesCovered).to.equal(false)
    expect(textOf(result)).to.contain('セルフスイッチには出せません')
  })

  it('takes a self switch by map, event and letter', function () {
    const result = usages({ kind: 'selfSwitch', mapId: 1, eventId: 1, letter: 'A' })

    expect(result.structuredContent.key).to.equal('ss:1:1:A')
    expect(result.structuredContent.label).to.contain('セルフスイッチ A')
  })

  it('says what is missing instead of guessing', function () {

    expect(textOf(usages({ kind: 'switch' }))).to.contain('id が要ります')
    expect(usages({ kind: 'switch' }).isError).to.equal(true)
    expect(textOf(usages({ kind: 'selfSwitch', mapId: 1 }))).to.contain('letter')
  })

  it('answers with nothing found rather than failing', function () {
    const result = usages({ kind: 'switch', id: 999 })

    expect(result.isError).to.equal(undefined)
    expect(result.structuredContent.inboundTotal).to.equal(0)
    expect(textOf(result)).to.contain('なし')
  })

  it('cuts both directions at the limit but reports the real total', function () {
    const result = usages({ kind: 'switch', id: 5, limit: 1 })

    expect(result.structuredContent.outbound).to.have.lengthOf(1)
    expect(result.structuredContent.outboundTotal).to.equal(1)
  })

  /* 根の loadDb が**この拡張の out/db を**掴んでいること。解決そのものに対する唯一の検査。
   *
   * もう1つの役目がある。loadDb の候補の先頭は根の db/ で、あれは npm 配布のために
   * prepack が作る生成物。一度 npm pack を走らせると根に db/ が残り(gitignore なので
   * 誰も消さない)、以後そちらが勝つ。この assert が無いと、src/db/eventLinks.ts を
   * 直して再コンパイルしても**古い写しを黙って検査し続ける**。手元だけで静かに起きる
   * (CI は package ジョブがテストを走らせず、extension ジョブは prepack を走らせない)。 */
  it('resolves the layer from this extension, not a stale copy', function () {
    expect(ctx.structure().eventLinks).to.equal(eventLinks)
  })

  it('offers the tool in tools/list', function () {
    const listed = mcp.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: { _meta: META }
    }, ctx).result.tools.map(function (t) { return t.name })

    expect(listed).to.include('t2f_usages')
  })
})
