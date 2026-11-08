const chai = require('chai')
const expect = chai.expect

const T2F = require('../Text2Frame.js')
const csv = T2F._csv

/* 取り込みは「CSV を戻す」のではなく「いまのテキストに当てる」。CSV からテキストを
 * 作ってしまうと、絞って出したときに出していない行がそこで消える ── 実物のアクアリウムで
 * 957対象のうち377しか一致しなかった。だからいまのテキストをもう一度畳んで、
 * ID が合う行だけ差し替える。ここがこの機能でいちばん壊しやすい。 */
describe('applying CSV rows to the text that is there now', function () {
  const KEY = 'map001_event001_page1'
  const TEXT = [
    '<Switch: 1, ON>', //       r001  自動
    '<Face: suzu(0)>', //       r002  セリフ(見た目)
    'こんにちは', //              r002  セリフ(本文)
    '', //                      r003  空行
    '<Wait: 60>', //            r004  自動
    'さようなら' //              r005  セリフ
  ].join('\n')

  const fold = function (opts) { return csv.foldToRows(TEXT, KEY, opts) }
  // シートを一度通す(文字列になって戻ってくることまで含めて測る)。
  const through = function (rows) { return csv.parseCsv(csv.formatCsv(rows)).rows }
  const apply = function (rows, opts) {
    return csv.mergeRows(TEXT, through(rows), Object.assign({ key: KEY }, opts || {}))
  }
  const edit = function (rows, id, body) {
    return rows.map(function (r) {
      return r.ID === id ? Object.assign({}, r, { 本文: body }) : r
    })
  }
  const insertAfter = function (rows, id, body) {
    const out = rows.slice()
    const at = out.findIndex(function (r) { return r.ID === id })
    // ID を空にした行が「足された行」。
    out.splice(at + 1, 0, Object.assign({}, out[at], { ID: '', 見た目: '', 本文: body }))
    return out
  }

  it('changes nothing when nothing was changed', function () {
    const r = apply(fold())
    expect(r.ok).to.equal(true)
    expect(r.text).to.equal(TEXT)
  })

  it('changes nothing when nothing was changed in the dialogue-only sheet', function () {
    // 出していない行(タグ・空行)がここで消えないこと。これが絞った版の肝。
    const r = apply(fold({ rows: 'dialogue' }))
    expect(r.ok).to.equal(true)
    expect(r.text).to.equal(TEXT)
  })

  it('puts an edited line into the text', function () {
    const r = apply(edit(fold(), 'r005', 'またね'))
    expect(r.text.split('\n')).to.eql(TEXT.split('\n').slice(0, 5).concat(['またね']))
  })

  it('keeps the look of a window when only its body was rewritten', function () {
    const r = apply(edit(fold(), 'r002', 'やあ'))
    expect(r.text).to.contain('<Face: suzu(0)>\nやあ')
  })

  it('puts an added line right after the row it follows', function () {
    const r = apply(insertAfter(fold(), 'r002', '元気ですか'))
    expect(r.ok).to.equal(true)
    expect(r.text.split('\n').slice(1, 4)).to.eql(['<Face: suzu(0)>', 'こんにちは', '元気ですか'])
  })

  it('reaches the game through compile, lines and all', function () {
    const r = apply(insertAfter(edit(fold(), 'r005', 'またね'), 'r005', 'ではまた'))
    const said = T2F.compile(r.text).filter(function (c) { return c.code === 401 })
      .map(function (c) { return c.parameters[0] })
    expect(said).to.include('またね')
    expect(said).to.include('ではまた')
  })

  describe('the same edit, made in the full sheet and in the dialogue-only sheet', function () {
    it('lands the same way', function () {
      const one = apply(insertAfter(edit(fold(), 'r005', 'またね'), 'r005', 'ではまた'))
      const few = apply(insertAfter(edit(fold({ rows: 'dialogue' }), 'r005', 'またね'), 'r005', 'ではまた'))
      expect(few.ok).to.equal(true)
      expect(few.text).to.equal(one.text)
    })

    it('says how many rows the sheet did not show between the two it did', function () {
      // 足された行の置き場所は「直前の行の後ろ」の一本。またぐ行があるときは報告で言う。
      const few = apply(insertAfter(fold({ rows: 'dialogue' }), 'r002', '元気ですか'))
      expect(few.inserted).to.eql([{ after: 'r002', count: 1, hidden: 2 }])
    })

    it('says nothing about hidden rows when the two rows are next to each other', function () {
      const all = apply(insertAfter(fold(), 'r004', '<Wait: 1>'))
      expect(all.inserted).to.eql([{ after: 'r004', count: 1, hidden: 0 }])
    })
  })

  describe('rows the sheet no longer has', function () {
    it('keeps the ones whose kind was never exported', function () {
      const r = apply(fold({ rows: 'dialogue' }))
      const kept = r.missing.filter(function (m) { return !m.消された })
      expect(kept.map(function (m) { return m.ID })).to.eql(['r001', 'r003', 'r004'])
      expect(r.text).to.equal(TEXT)
    })

    it('calls a missing dialogue row deleted, and still keeps it unless told otherwise', function () {
      const rows = fold().filter(function (r) { return r.ID !== 'r005' })
      const r = apply(rows)
      expect(r.missing).to.eql([{ ID: 'r005', 種別: 'セリフ', 消された: true }])
      // 黙って消さない。消すのは頼まれたときだけ。
      expect(r.text).to.equal(TEXT)
    })

    it('removes it when it is told to', function () {
      const rows = fold().filter(function (r) { return r.ID !== 'r005' })
      const r = apply(rows, { allowDelete: true })
      expect(r.text).to.equal(TEXT.split('\n').slice(0, 5).join('\n'))
    })

    it('still does not remove a row the dialogue-only sheet never showed', function () {
      // 絞った版で --allow-delete を渡しても、出していない種別は消えない。
      const r = apply(fold({ rows: 'dialogue' }), { allowDelete: true })
      expect(r.text).to.equal(TEXT)
    })
  })

  describe('what it refuses', function () {
    const refuse = function (rows, opts) {
      const r = apply(rows, opts)
      expect(r.ok).to.equal(false)
      // 断ったら、いまのテキストをそのまま返す(途中まで当てた形を作らない)。
      expect(r.text).to.equal(TEXT)
      return r.problems
    }

    it('refuses a row whose version does not match, and names the sheet row', function () {
      const rows = fold().map(function (r) { return Object.assign({}, r, { 版: 'deadbeef' }) })
      const p = refuse(rows)
      expect(p[0].kind).to.equal('版')
      expect(p[0].detail).to.contain('2行目')
      expect(p[0].detail).to.contain('取り出し直されています')
    })

    it('refuses an id this target does not have', function () {
      const rows = edit(fold(), 'r005', 'x').map(function (r) {
        return r.ID === 'r005' ? Object.assign({}, r, { ID: 'r099' }) : r
      })
      const p = refuse(rows)
      expect(p[0].kind).to.equal('知らない ID')
      expect(p[0].detail).to.contain('r099')
    })

    it('refuses the same id twice', function () {
      const rows = fold()
      const p = refuse(rows.concat([rows[1]]))
      expect(p[0].kind).to.equal('ID の重複')
      expect(p[0].detail).to.contain('r002')
    })

    it('refuses a sheet that was sorted', function () {
      const rows = fold()
      const swapped = [rows[0], rows[2], rows[1]].concat(rows.slice(3))
      const p = refuse(swapped)
      expect(p[0].kind).to.equal('並べ替え')
      expect(p[0].detail).to.contain('並べ替えた')
    })

    it('refuses a line added above everything, because its place is not decided', function () {
      const rows = fold()
      const p = refuse([Object.assign({}, rows[0], { ID: '', 本文: 'いきなり' })].concat(rows))
      expect(p[0].kind).to.equal('置き場所なし')
      expect(p[0].detail).to.contain('見えている最初の行')
    })
  })

  it('does not mind a sheet that dropped the columns it does not need', function () {
    const slim = csv.parseCsv(csv.formatCsv(fold(), ['ID', '本文', '見た目', '版', '種別'])).rows
    const r = csv.mergeRows(TEXT, slim, { key: KEY })
    expect(r.ok).to.equal(true)
    expect(r.text).to.equal(TEXT)
  })

  it('works on a text it cannot compile, because it never compiles the result', function () {
    const broken = '<GetLocationInfo: 1>\nこんにちは'
    const rows = csv.foldToRows(broken, KEY)
    const r = csv.mergeRows(broken, through(rows), { key: KEY })
    expect(r.ok).to.equal(true)
    expect(r.text).to.equal(broken)
  })
})
