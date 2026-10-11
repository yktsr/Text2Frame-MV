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
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([
      null,
      null,
      null,
      { id: 3, name: '呼ばれるやつ', trigger: 0, switchId: 0, list: [bottom] }
    ]))
    fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify({
      switches: ['', '', '', '', '', '扉が開いた'],
      variables: ['', '', '', '', '', '', '', '話した回数']
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

  /* **この道具の約束の境目。** 条件分岐(111)での読みは図に入らない。
   * 入っていないことを知らせずに返すと、エージェントは「他で使われていない」と
   * 誤解して消しにかかる。将来 case 111 を足したらここが落ちて気づく。 */
  it('leaves conditional-branch reads out, and says so', function () {
    const result = usages({ kind: 'switch', id: 5 })

    // 読んでいるのもイベント1の1ページだが、入るのは ON にした1本だけ。
    expect(result.structuredContent.inboundTotal).to.equal(1)
    expect(result.structuredContent.readsNotIncluded).to.equal(true)
    expect(textOf(result)).to.contain('条件分岐での読みは入っていません')
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
