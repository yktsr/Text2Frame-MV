const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const T2F = require('../Text2Frame.js')
const csv = T2F._csv

/* CSV は人に配るファイルなので、入口の形(どこへ書くか、何を報告するか)が
 * 黙って変わると困る。ここは本物のファイルに対して CLI を回して確かめる。 */
describe('frame2text --mode csv', function () {
  const bin = path.resolve(__dirname, '..', 'Frame2Text.js')
  let root

  const page = function (list) { return { conditions: {}, list } }
  const say = function (text) { return { code: 401, indent: 0, parameters: [text] } }

  beforeEach(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-cli-'))
    fs.mkdirSync(path.join(root, 'data'))
    fs.writeFileSync(path.join(root, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        name: 'EV001',
        pages: [page([
          { code: 121, indent: 0, parameters: [1, 1, 0] },
          { code: 101, indent: 0, parameters: ['suzu', 0, 0, 2, ''] },
          say('こんにちは'),
          say('今日はいい天気'),
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          say('さようなら'),
          { code: 0, indent: 0, parameters: [] }
        ])]
      }]
    }))
    fs.writeFileSync(path.join(root, 'data', 'CommonEvents.json'), JSON.stringify([null]))
  })
  afterEach(function () { fs.rmSync(root, { recursive: true, force: true }) })

  const run = function (args) {
    return cp.spawnSync('node', [bin, '--mode', 'csv', '--root', root].concat(args || []),
      { cwd: root, encoding: 'utf8' })
  }
  const pull = function () {
    const r = cp.spawnSync('node', [bin, '--mode', 'batch', '--root', root], { cwd: root, encoding: 'utf8' })
    expect(r.status, r.stderr).to.equal(0)
  }
  const report = function (r) {
    expect(r.status, r.stderr).to.equal(0)
    return JSON.parse(r.stdout)
  }

  it('writes scenario.csv at the root, not inside text/', function () {
    pull()
    const out = report(run())
    /* text/ の中には置かない ── 祖先(.t2f-base)の鍵はテキストの置き場所の
     * 第1階層で決まるので、そこへ物を増やさない。 */
    expect(out.csvPath).to.equal(path.join(root, 'scenario.csv'))
    expect(fs.existsSync(path.join(root, 'scenario.csv'))).to.equal(true)
    expect(fs.readdirSync(path.join(root, 'text'))).to.not.include('scenario.csv')
  })

  it('writes a CSV a spreadsheet can read', function () {
    pull()
    run()
    const text = fs.readFileSync(path.join(root, 'scenario.csv'), 'utf8')
    expect(text.charCodeAt(0)).to.equal(0xfeff) // BOM が無いと Excel が化ける
    expect(text.split('\r\n')[0].replace(/^\uFEFF/, '')).to.equal(csv.COLUMNS.join(','))
  })

  it('gives the reader a heading row per target, and the key on every row', function () {
    pull()
    run()
    const rows = csv.parseCsv(fs.readFileSync(path.join(root, 'scenario.csv'), 'utf8')).rows
    expect(rows[0].種別).to.equal('見出し')
    expect(rows[0].本文).to.contain('EV001')
    rows.forEach(function (r) { expect(r.宛先).to.equal('map001_event001_page1') })
  })

  it('writes where it was told to instead', function () {
    pull()
    const out = report(run(['-o', 'daihon.csv']))
    expect(out.csvPath).to.equal(path.join(root, 'daihon.csv'))
  })

  it('writes fewer rows for --rows dialogue, and says which mode it used', function () {
    pull()
    const all = report(run())
    const few = report(run(['--rows', 'dialogue', '-o', 'few.csv']))
    expect(all.mode).to.equal('all')
    expect(few.mode).to.equal('dialogue')
    expect(few.rows).to.be.below(all.rows)
    const kinds = csv.parseCsv(fs.readFileSync(path.join(root, 'few.csv'), 'utf8')).rows
      .map(function (r) { return r.種別 })
    expect(new Set(kinds)).to.eql(new Set(['見出し', 'セリフ']))
  })

  it('writes on each heading row which rows the sheet was given, and the stamp', function () {
    /* 取り込みがこれを読む ── 持たせないと「シートに無い行は消されたのか、出していない
     * だけなのか」を残っている行から推測するしかない。 */
    pull()
    run(['--rows', 'dialogue', '-o', 'few.csv'])
    const rows = csv.parseCsv(fs.readFileSync(path.join(root, 'few.csv'), 'utf8')).rows
    const heads = rows.filter(function (r) { return r.種別 === '見出し' })
    expect(heads).to.have.length.above(0)
    heads.forEach(function (h) {
      expect(h.見た目).to.equal('rows=dialogue')
      // 指紋は、その宛先の行と同じもの。
      const first = rows.filter(function (r) { return r.宛先 === h.宛先 && r.ID })[0]
      if (first) expect(h.版).to.equal(first.版)
      else expect(h.版).to.have.length.above(0)
    })
    run([])
    expect(csv.parseCsv(fs.readFileSync(path.join(root, 'scenario.csv'), 'utf8')).rows
      .filter(function (r) { return r.種別 === '見出し' })[0].見た目).to.equal('rows=all')
  })

  it('does not write or change one text file', function () {
    pull()
    const before = fs.readdirSync(path.join(root, 'text')).map(function (name) {
      return [name, fs.readFileSync(path.join(root, 'text', name), 'utf8')]
    })
    run()
    const after = fs.readdirSync(path.join(root, 'text')).map(function (name) {
      return [name, fs.readFileSync(path.join(root, 'text', name), 'utf8')]
    })
    expect(after).to.eql(before)
  })

  it('says how many targets have no text yet, and leaves them out', function () {
    // 取り出していないので text/ が無い。CSV は作るが、中身は見出しも無い。
    const out = report(run())
    expect(out.targets).to.be.above(0)
    expect(out.noText).to.equal(out.targets)
    expect(out.written).to.equal(0)
    expect(out.rows).to.equal(0)
  })

  it('tells the reader to pull first when a text is missing', function () {
    const r = run()
    expect(r.status, r.stderr).to.equal(0)
    expect(r.stderr).to.contain('--mode batch')
  })

  it('refuses a root with no data folder', function () {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-empty-'))
    try {
      const r = cp.spawnSync('node', [bin, '--mode', 'csv', '--root', empty], { cwd: empty, encoding: 'utf8' })
      expect(r.status).to.not.equal(0)
      expect(r.stderr).to.contain('Data directory not found')
    } finally {
      fs.rmSync(empty, { recursive: true, force: true })
    }
  })

  it('reports a text whose syntax does not compile, without dropping it', function () {
    pull()
    const file = path.join(root, 'text', fs.readdirSync(path.join(root, 'text'))[0])
    const whole = fs.readFileSync(file, 'utf8')
    fs.writeFileSync(file, whole + '\n<GetLocationInfo: 1>\n')
    const out = report(run())
    expect(out.brokenSyntax).to.equal(1)
    const rows = csv.parseCsv(fs.readFileSync(path.join(root, 'scenario.csv'), 'utf8')).rows
    const said = rows.filter(function (r) { return r.エラー })
    expect(said).to.have.length.above(0)
    // 1行1行そのまま出すので、行は失われない。
    expect(rows.map(function (r) { return r.本文 }).join('\n')).to.contain('<GetLocationInfo: 1>')
  })

  it('goes back into the text and into the game, through text2frame', function () {
    pull()
    run()
    const file = path.join(root, 'scenario.csv')
    const rows = csv.parseCsv(fs.readFileSync(file, 'utf8')).rows
    const at = rows.findIndex(function (r) { return r.本文 === 'さようなら' })
    expect(at).to.be.above(0)
    rows[at].本文 = 'またね'
    fs.writeFileSync(file, csv.formatCsv(rows))

    // いまはまだ取り込みの口が無いので、本体の口で当てて反映まで通す(回を分けている)。
    const textPath = path.join(root, 'text', fs.readdirSync(path.join(root, 'text'))[0])
    const whole = fs.readFileSync(textPath, 'utf8')
    const parsed = T2F.parseFrontMatter(whole)
    const merged = csv.mergeRows(parsed.body, rows, { key: rows[0].宛先, gameRoot: root })
    expect(merged.ok).to.equal(true)
    fs.writeFileSync(textPath, parsed.header + merged.text)

    const res = T2F.applyTextFile({
      textPath,
      strategy: 'merge',
      baseRoot: root,
      gameRoot: root,
      mapPath: path.join(root, 'data', 'Map001.json'),
      kind: 'event',
      mapId: 1,
      eventId: 1,
      pageId: 1
    })
    expect(res.ok, res.error).to.equal(true)
    const list = JSON.parse(fs.readFileSync(path.join(root, 'data', 'Map001.json'), 'utf8'))
      .events[1].pages[0].list
    const said = list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
    expect(said).to.include('またね')
    expect(said).to.not.include('さようなら')
    // スイッチの行は CSV に出ていても触っていない。消えていないこと。
    expect(list.filter(function (c) { return c.code === 121 })).to.have.lengthOf(1)
  })
})
