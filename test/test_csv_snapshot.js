const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')
const { stale, build, VARIANTS } = require('../tools/snapshot-csv')
const { run } = require('../tools/csv-roundtrip')

/* コマンドの一致は強いが、**コマンドが同じまま畳み方だけが変わる**ことはいくらでもある
 * (窓の切れ目、見た目のタグをどちらの行に寄せるか、空行をいくつに割るか)。
 * 人が読む表の形が黙って変わるのがいちばん困るので、出力そのものを見張る。
 * 落ちたら test/snapshot/csv-*.csv を作り直し、git diff で意図した変更か見分ける。 */
describe('CSV fold snapshot', function () {
  it('is up to date with the fold (run `npm run update-csv-snapshot` if this fails)', function () {
    expect(stale()).to.eql([])
  })

  it('writes the same CSV twice in a row', function () {
    VARIANTS.forEach(function (variant) {
      expect(build(variant), variant.file).to.equal(build(variant))
    })
  })

  /* 2通り見る。絞った表が「全部の表の部分集合」でしかないことを固定するため ──
   * 絞ったときだけ畳み方が変わっていたら、ここで差分になる。 */
  it('watches the full sheet and the dialogue-only sheet', function () {
    expect(VARIANTS.map(function (v) { return v.rows })).to.eql(['all', 'dialogue'])
  })

  it('gets a shorter CSV out of the dialogue-only sheet', function () {
    const lines = function (v) { return build(v).split('\r\n').length }
    expect(lines(VARIANTS[1])).to.be.below(lines(VARIANTS[0]))
  })

  it('keeps the dialogue-only sheet a subset of the full one, row for row', function () {
    /* 見比べるのは**中身の行(ID を持つ行)だけ**。見出しの行は、出した行の範囲を
     * 印として持つので2つの表でわざと違う(`rows=all` / `rows=dialogue`)。 */
    const rowsOf = function (v) {
      return build(v).split('\r\n').slice(1)
        .filter(function (l) { return l !== '' && !/^,見出し,/.test(l) })
    }
    const all = new Set(rowsOf(VARIANTS[0]))
    rowsOf(VARIANTS[1]).forEach(function (line) {
      // 同じ行が、同じ綴りで全部の表にも居ること。
      expect(all.has(line), line.slice(0, 60)).to.equal(true)
    })
  })

  it('marks each heading row with the rows the sheet was given', function () {
    const marks = function (v) {
      return build(v).split('\r\n').filter(function (l) { return /^,見出し,/.test(l) })
        .map(function (l) { return l.split(',')[4] })
    }
    expect(new Set(marks(VARIANTS[0]))).to.eql(new Set(['rows=all']))
    expect(new Set(marks(VARIANTS[1]))).to.eql(new Set(['rows=dialogue']))
  })
})

/* 往復のオラクル自体も、手元の既定プロジェクトで1回回す。実物の2つのゲームは
 * 追跡していないので CI では回せない(手元で `node tools/csv-roundtrip.js <ゲーム>`)。 */
describe('the CSV round-trip oracle', function () {
  /* ゲームのフォルダを歩く道。Project1 にも実物のゲームにも頼らない(どちらも
   * 追跡していないので CI には無い)。手元で実データに当てるのは
   * `node tools/csv-roundtrip.js <ゲームのフォルダ>`。 */
  it('finds nothing wrong in a game it reads from the data', function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-game-'))
    try {
      fs.mkdirSync(path.join(root, 'data'))
      const page = function (list) { return { conditions: {}, list } }
      fs.writeFileSync(path.join(root, 'data', 'Map001.json'), JSON.stringify({
        events: [null, {
          id: 1,
          name: 'EV',
          pages: [page([
            { code: 121, indent: 0, parameters: [1, 1, 0] },
            { code: 101, indent: 0, parameters: ['suzu', 0, 0, 2, ''] },
            { code: 401, indent: 0, parameters: ['こんにちは'] },
            { code: 401, indent: 0, parameters: ['今日はいい天気'] },
            { code: 108, indent: 0, parameters: ['メモ'] },
            { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
            { code: 401, indent: 0, parameters: ['さようなら'] },
            { code: 0, indent: 0, parameters: [] }
          ])]
        }]
      }))
      fs.writeFileSync(path.join(root, 'data', 'CommonEvents.json'), JSON.stringify([null, {
        id: 1,
        name: 'CE',
        list: [
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          { code: 401, indent: 0, parameters: ['共通のせりふ'] },
          { code: 0, indent: 0, parameters: [] }
        ]
      }]))

      const report = run(root, { quiet: true })
      expect(report.targets).to.be.above(0)
      expect(report.failures).to.eql([])
      expect(report.command).to.equal(report.targets)
      expect(report.narrowed).to.equal(report.targets)
      expect(report.edit).to.equal(report.editable)
      expect(report.editable).to.be.above(0)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  /* テキストのフォルダを歩く道も測る。実在のフォルダ(Project1/text など)には依らない
   * ── あれは追跡していないので、CI では無い。無いものに頼る検査は鳴らない番人になる。 */
  it('reads the texts of a folder as well as the data of a game', function () {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-oracle-'))
    try {
      fs.writeFileSync(path.join(dir, 'a.txt'),
        '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n' +
        '<Face: suzu(0)>\nこんにちは\n\n<Switch: 1, ON>\nさようなら\n')
      fs.mkdirSync(path.join(dir, 'nested'))
      fs.writeFileSync(path.join(dir, 'nested', 'b.txt'), '<comment>\nメモ\n</comment>\nやあ\n')
      // 祖先は元のテキストではないので歩かない。見てしまうと衝突の目印を畳むことになる。
      fs.mkdirSync(path.join(dir, '.t2f-base'))
      fs.writeFileSync(path.join(dir, '.t2f-base', 'old.txt'), 'ふるい\n')

      const report = run(dir, { quiet: true })
      expect(report.targets).to.equal(2)
      expect(report.failures).to.eql([])
      expect(report.command).to.equal(2)
      expect(report.narrowed).to.equal(2)
      expect(report.edit).to.equal(report.editable)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
