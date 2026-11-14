const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const T2F = require('../Text2Frame.js')
const csv = T2F._csv

/* 「シートに無い行は消されたのか、出していないだけなのか」を、残っている行から推測していた。
 * だから**その種別の行を全部消されると推測が外れ、黙って何もしない**(絞った表では
 * 1行しか見えない宛先が実物で約半分あった)。見出しの行が出した範囲を持つようにして、
 * 推測をやめる ── この回だけが「消える行」を変えるので、ここを厚く測る。 */
describe('what the heading row of a sheet is for', function () {
  const t2f = path.resolve(__dirname, '..', 'Text2Frame.js')
  const f2t = path.resolve(__dirname, '..', 'Frame2Text.js')
  let root
  let csvPath

  const say = function (word) {
    return [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [word] }
    ]
  }

  beforeEach(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-head-'))
    fs.mkdirSync(path.join(root, 'data'))
    fs.writeFileSync(path.join(root, 'data', 'Map001.json'), JSON.stringify({
      events: [
        null,
        {
          id: 1,
          name: 'EV001',
          pages: [{
            conditions: {},
            list: say('ひとこと').concat([{ code: 0, indent: 0, parameters: [] }])
          }]
        },
        {
          // 会話が1つも無いイベント。--scope all で出すと、見出しの行だけになる。
          id: 2,
          name: 'EV002',
          pages: [{
            conditions: {},
            list: [
              { code: 121, indent: 0, parameters: [1, 1, 0] },
              { code: 0, indent: 0, parameters: [] }
            ]
          }]
        }
      ]
    }))
    fs.writeFileSync(path.join(root, 'data', 'CommonEvents.json'), JSON.stringify([null]))
    csvPath = path.join(root, 'scenario.csv')
  })
  afterEach(function () { fs.rmSync(root, { recursive: true, force: true }) })

  const pull = function (args) {
    expect(cp.spawnSync('node', [f2t, '--mode', 'batch', '--root', root, '--scope', 'all'],
      { encoding: 'utf8' }).status).to.equal(0)
    const r = cp.spawnSync('node',
      [f2t, '--mode', 'csv', '--root', root, '--scope', 'all'].concat(args || []),
      { encoding: 'utf8' })
    expect(r.status, r.stderr).to.equal(0)
  }
  const run = function (args) {
    return cp.spawnSync('node', [t2f, '--mode', 'csv', '--root', root].concat(args || []),
      { encoding: 'utf8' })
  }
  const rows = function () { return csv.parseCsv(fs.readFileSync(csvPath, 'utf8')).rows }
  const put = function (list) { fs.writeFileSync(csvPath, csv.formatCsv(list)) }
  const result = function () {
    return csv.parseCsv(fs.readFileSync(path.join(root, 'scenario.result.csv'), 'utf8')).rows
  }
  const headOf = function (key) {
    return result().filter(function (r) { return r.種別 === '見出し' && r.宛先 === key })[0]
  }
  const textsNow = function () {
    const dir = path.join(root, 'text')
    const out = {}
    fs.readdirSync(dir).forEach(function (name) {
      out[name] = fs.readFileSync(path.join(dir, name), 'utf8')
    })
    return out
  }

  describe('a target the sheet shows no content for', function () {
    it('appears as a heading row alone', function () {
      pull(['--rows', 'dialogue'])
      const mine = rows().filter(function (r) { return r.宛先 === 'map001_event002_page1' })
      expect(mine.map(function (r) { return r.種別 })).to.eql(['見出し'])
    })

    it('is left completely alone, not written and not counted as applied', function () {
      /* 書いてしまうと、取り込みが一括反映に化ける ── 誰も触っていないイベントまで
       * 書き直すことになる(絞った表では、そういう宛先が多数になる)。 */
      pull(['--rows', 'dialogue'])
      const before = textsNow()
      const r = run([])
      expect(r.status, r.stderr).to.equal(0)
      expect(textsNow()).to.eql(before)
      const out = JSON.parse(r.stdout)
      expect(out.targets).to.equal(2)
      expect(out.applied).to.equal(1)
      expect(out.untouched).to.equal(1)
    })

    it('says so on the only row it has left', function () {
      pull(['--rows', 'dialogue'])
      run([])
      expect(headOf('map001_event002_page1').エラー).to.contain('中身の行がありません')
    })
  })

  describe('a sheet someone emptied of one target', function () {
    const emptyOut = function () {
      put(rows().filter(function (r) {
        return !(r.宛先 === 'map001_event001_page1' && r.ID)
      }))
    }

    it('is refused and named, where it used to do nothing at all', function () {
      pull(['--rows', 'dialogue'])
      emptyOut()
      const before = textsNow()
      const r = run([])
      expect(r.status).to.equal(1)
      expect(r.stderr).to.contain('行が消えています')
      expect(textsNow()).to.eql(before)
    })

    it('says it on the heading row, the only row of that target left', function () {
      pull(['--rows', 'dialogue'])
      emptyOut()
      run([])
      expect(headOf('map001_event001_page1').エラー).to.contain('行が消えています')
    })

    it('goes through when deleting was asked for, and says how many', function () {
      pull(['--rows', 'dialogue'])
      emptyOut()
      const r = run(['--allow-delete'])
      expect(r.status, r.stderr).to.equal(0)
      expect(headOf('map001_event001_page1').エラー).to.contain('消した')
      const list = JSON.parse(fs.readFileSync(path.join(root, 'data', 'Map001.json'), 'utf8'))
        .events[1].pages[0].list
      expect(list.filter(function (c) { return c.code === 401 })).to.have.lengthOf(0)
    })
  })

  describe('the kind written in a cell', function () {
    it('cannot talk the import into deleting rows it never showed', function () {
      /* 種別 のセルは書き換えられる。出した範囲は**見出しの行**が持っているので、
       * そちらを読む ── 読まないと、見えてもいないタグの行が消える。 */
      pull(['--rows', 'dialogue'])
      const before = textsNow()
      put(rows().map(function (r) {
        return r.ID ? Object.assign({}, r, { 種別: '自動' }) : r
      }))
      const r = run(['--allow-delete'])
      expect(r.status, r.stderr).to.equal(0)
      expect(textsNow()).to.eql(before)
    })
  })

  describe('a sheet from before the heading row carried the range', function () {
    it('still works, and says that the range was guessed', function () {
      pull(['--rows', 'dialogue'])
      // 古い CSV のかたち(印が無い)。
      put(rows().map(function (r) {
        return r.種別 === '見出し' ? Object.assign({}, r, { 見た目: '', 版: '' }) : r
      }))
      const r = run([])
      expect(r.status, r.stderr).to.equal(0)
      expect(r.stderr).to.contain('推測した')
    })
  })

  describe('a sheet handed out before the text was pulled again', function () {
    it('is refused for that target, even with nothing but a heading row', function () {
      pull(['--rows', 'dialogue'])
      const kept = rows().filter(function (r) { return r.宛先 !== 'map001_event001_page1' || !r.ID })
      put(kept)
      // テキストを取り出し直す(指紋が変わる)。
      const dir = path.join(root, 'text')
      const file = fs.readdirSync(dir).map(function (n) { return path.join(dir, n) })
        .filter(function (full) { return fs.readFileSync(full, 'utf8').indexOf('ひとこと') >= 0 })[0]
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8') + '\nあとから足した行\n')
      const r = run(['--allow-delete'])
      expect(r.status).to.equal(1)
      expect(r.stderr).to.contain('版が合いません')
    })
  })
})
