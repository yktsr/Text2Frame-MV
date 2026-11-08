const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const T2F = require('../Text2Frame.js')
const csv = T2F._csv

/* 取り込みは、タグを知らない人が触ったシートを受け取る。壊れた形は黙って通さず、
 * **どの行か**を言って断る ── 言わないと、シートのどこを直せばいいか分からない。
 * 断るもの1つにつき1件。 */
describe('text2frame --mode csv refuses what it cannot trust', function () {
  const t2f = path.resolve(__dirname, '..', 'Text2Frame.js')
  const f2t = path.resolve(__dirname, '..', 'Frame2Text.js')
  let root
  let csvPath

  beforeEach(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-guard-'))
    fs.mkdirSync(path.join(root, 'data'))
    fs.writeFileSync(path.join(root, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        name: 'EV001',
        pages: [
          {
            conditions: {},
            list: [
              { code: 121, indent: 0, parameters: [1, 1, 0] },
              { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
              { code: 401, indent: 0, parameters: ['こんにちは'] },
              { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
              { code: 401, indent: 0, parameters: ['さようなら'] },
              { code: 0, indent: 0, parameters: [] }
            ]
          },
          {
            conditions: {},
            list: [
              { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
              { code: 401, indent: 0, parameters: ['2ページ目'] },
              { code: 0, indent: 0, parameters: [] }
            ]
          }
        ]
      }]
    }))
    fs.writeFileSync(path.join(root, 'data', 'CommonEvents.json'), JSON.stringify([null]))
    csvPath = path.join(root, 'scenario.csv')
    // 取り出し -> CSV の順で、本物の形を作る。
    expect(cp.spawnSync('node', [f2t, '--mode', 'batch', '--root', root], { encoding: 'utf8' }).status).to.equal(0)
    expect(cp.spawnSync('node', [f2t, '--mode', 'csv', '--root', root], { encoding: 'utf8' }).status).to.equal(0)
  })
  afterEach(function () { fs.rmSync(root, { recursive: true, force: true }) })

  const rows = function () { return csv.parseCsv(fs.readFileSync(csvPath, 'utf8')).rows }
  const put = function (list, columns) { fs.writeFileSync(csvPath, csv.formatCsv(list, columns)) }
  const run = function (args) {
    return cp.spawnSync('node', [t2f, '--mode', 'csv', '--root', root].concat(args || []), { encoding: 'utf8' })
  }
  const textFile = function () {
    const dir = path.join(root, 'text')
    return path.join(dir, fs.readdirSync(dir)[0])
  }
  const said = function () {
    const list = JSON.parse(fs.readFileSync(path.join(root, 'data', 'Map001.json'), 'utf8'))
      .events[1].pages[0].list
    return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
  }

  /** 断られたこと・テキストが動いていないこと・文面が行か ID を名指ししていること。 */
  const refused = function (args) {
    const before = fs.readFileSync(textFile(), 'utf8')
    const r = run(args)
    expect(r.status, r.stdout).to.equal(1)
    expect(fs.readFileSync(textFile(), 'utf8'), 'テキストが動いています').to.equal(before)
    return r.stdout + r.stderr
  }

  it('refuses a sheet whose heading row was deleted, without guessing from the column count', function () {
    const list = rows()
    fs.writeFileSync(csvPath, csv.formatCsv(list).split('\r\n').slice(1).join('\r\n'))
    const r = run()
    expect(r.status).to.not.equal(0)
    expect(r.stderr).to.contain('1行目が列の見出しになっていません')
    expect(r.stderr).to.contain('列の数からは推測しません')
  })

  it('names the row whose target cell is empty, as a merged cell leaves it', function () {
    const list = rows()
    const at = list.findIndex(function (x) { return x.種別 === 'セリフ' })
    list[at].宛先 = ''
    put(list)
    const out = refused()
    expect(out).to.contain('行目: 宛先の列が空です')
    expect(out).to.contain('セルを結合')
  })

  it('names the id that this target does not have', function () {
    const list = rows()
    const at = list.findIndex(function (x) { return x.種別 === 'セリフ' })
    list[at].ID = 'r099'
    put(list)
    expect(refused()).to.contain('r099')
  })

  it('names the id that appears twice', function () {
    const list = rows()
    const at = list.findIndex(function (x) { return x.種別 === 'セリフ' })
    list.splice(at + 1, 0, Object.assign({}, list[at]))
    put(list)
    const out = refused()
    expect(out).to.contain('2回出ています')
    expect(out).to.contain(list[at].ID)
  })

  it('refuses a sheet that was sorted', function () {
    const list = rows()
    const body = list.filter(function (x) { return x.種別 !== '見出し' })
    const head = list.filter(function (x) { return x.種別 === '見出し' })
    put(head.concat(body.slice().reverse()))
    expect(refused()).to.contain('並べ替えた')
  })

  it('refuses a line added above everything, because its place is not decided', function () {
    const list = rows()
    const at = list.findIndex(function (x) { return x.ID })
    list.splice(at, 0, { 種別: 'セリフ', 宛先: list[at].宛先, ID: '', 本文: 'いきなり' })
    put(list)
    expect(refused()).to.contain('見えている最初の行')
  })

  it('refuses a target whose text was pulled again after the sheet went out', function () {
    const list = rows()
    const file = textFile()
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8') + '\nあとから足した行\n')
    put(list)
    const out = refused()
    expect(out).to.contain('版が合いません')
    expect(out).to.contain('取り出し直されています')
  })

  it('refuses a text that still carries conflict markers, and says which file', function () {
    const file = textFile()
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8') +
      '\n<注釈>\n=== テキストの変更 / from text ===\n</注釈>\n')
    const r = run()
    expect(r.status).to.equal(1)
    expect(r.stderr).to.contain('衝突の目印が残っています')
    expect(r.stderr).to.contain(file)
  })

  it('refuses rows missing from the sheet unless it is told to delete', function () {
    const list = rows().filter(function (x) { return x.本文 !== 'さようなら' })
    put(list)
    const out = refused()
    expect(out).to.contain('消えています')
    expect(out).to.contain('--allow-delete')
    expect(said()).to.include('さようなら')
  })

  it('deletes them when it is told to', function () {
    const list = rows().filter(function (x) { return x.本文 !== 'さようなら' })
    put(list)
    const r = run(['--allow-delete'])
    expect(r.status, r.stderr).to.equal(0)
    expect(said()).to.not.include('さようなら')
  })

  /* シートの事故(全体を貼り替えた、1列ずれた)は、だいたい「ほとんどの行が変わった」
   * 形で出る。1行直すのと見分けが付くので、割合で止める。 */
  const pastedOver = function () {
    return rows().map(function (x) {
      return x.ID ? Object.assign({}, x, { 本文: 'まるごと貼り替えた', 見た目: '' }) : x
    })
  }

  it('refuses a target where too much changed, and says how much', function () {
    put(pastedOver())
    const out = refused()
    expect(out).to.contain('% の行が変わっています')
    expect(out).to.contain('--force')
    expect(out).to.contain('1列ずれて')
  })

  it('applies it with --force', function () {
    put(pastedOver())
    expect(run(['--force']).status).to.equal(0)
    expect(said()).to.include('まるごと貼り替えた')
  })

  it('takes a different share from --max-change', function () {
    put(pastedOver())
    expect(run(['--max-change', '100']).status).to.equal(0)
  })

  it('lets one changed line through on the default share', function () {
    const list = rows()
    const at = list.findIndex(function (x) { return x.本文 === 'さようなら' })
    list[at].本文 = 'またね'
    put(list)
    expect(run().status, 'ふつうの1行の直しを止めてはいけない').to.equal(0)
    expect(said()).to.include('またね')
  })

  /* ページは増やせない。文面は MCP の findTarget と同じものを出す(規則を2つに割らない)。 */
  it('refuses a page this event does not have, and says pages cannot be added from text', function () {
    const list = rows()
    const one = list.filter(function (x) { return x.宛先 === 'map001_event001_page1' })
      .map(function (x) { return Object.assign({}, x, { 宛先: 'map001_event001_page9' }) })
    put(one)
    const r = run()
    expect(r.status).to.equal(1)
    expect(r.stderr).to.contain('このイベントは 2 ページまでです')
    expect(r.stderr).to.contain('テキストからページを増やすことはできません')
  })

  it('says the same thing the MCP tool says', function () {
    // 同じ関数を両方が使っていること。文面が2か所で別々に腐らないように。
    const reason = T2F._internal.missingPageReason(
      [{ kind: 'event', mapId: '1', eventId: '1', pageId: '1' }, { kind: 'event', mapId: '1', eventId: '1', pageId: '2' }],
      { kind: 'event', mapId: '1', eventId: '1', pageId: '9' })
    expect(reason).to.contain('このイベントは 2 ページまでです')
  })

  it('refuses a target with no text yet, and says to pull first', function () {
    const list = rows()
    fs.rmSync(textFile())
    put(list)
    const r = run()
    expect(r.status).to.equal(1)
    expect(r.stderr).to.contain('テキストがまだありません')
    expect(r.stderr).to.contain('--mode batch')
  })

  it('refuses when there is no CSV at all', function () {
    fs.rmSync(csvPath)
    const r = run()
    expect(r.status).to.not.equal(0)
    expect(r.stderr).to.contain('CSV がありません')
    expect(r.stderr).to.contain('frame2text --mode csv')
  })

  it('keeps going for the other targets when one is refused', function () {
    // 1件だけ壊す。残りは通ること(1件のせいで全部止めない)。
    const list = rows().map(function (x) {
      return x.宛先 === 'map001_event001_page2' ? Object.assign({}, x, { 版: 'deadbeef' }) : x
    })
    put(list)
    const r = run()
    const out = JSON.parse(r.stdout.split('[csv]')[0])
    expect(out.failed).to.equal(1)
    expect(out.applied).to.be.above(0)
  })
})
