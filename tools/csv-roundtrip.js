/*
 * CSV の往復を実データで測る。**読み取りだけ。1バイトも書かない。**
 *
 *   node tools/csv-roundtrip.js <テキストのフォルダ または ゲームのフォルダ> [--rows dialogue]
 *
 * 見るのは4つ。いちばん大事なのは1つ目。
 *
 *   1. コマンドの一致   compile(戻したテキスト) が compile(元のテキスト) と等しい
 *   2. バイトの一致     参考。**これだけでは何も測れない** ── 行を分けてまた繋げば、
 *                       分割の規則が正しかろうが間違っていようず必ず一致する
 *   3. 絞っても同じ     シナリオだけの表を何も直さず当てて、テキストが動かない
 *   4. 直しが同じ       同じ1か所を全部版と絞った版で直して、結果が一致する
 *
 * 3 と 4 が要るのは、絞った表の取り込みが「CSV からテキストを作る」形だと
 * 出していない行がそこで消えるから。実物で 957 対象のうち 377 しか一致しなかった。
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const T2F = require(path.join(root, 'Text2Frame.js'))
const F2T = require(path.join(root, 'Frame2Text.js'))
const csv = T2F._csv

const pad3 = function (n) {
  const s = String(n)
  return s.length >= 3 ? s : ('00' + s).slice(-3)
}

/** テキストのフォルダを歩く。見出し(front matter)は畳まないので外す。 */
const fromTextDir = function (dir) {
  const out = []
  const walk = function (at) {
    fs.readdirSync(at, { withFileTypes: true }).forEach(function (entry) {
      const full = path.join(at, entry.name)
      // 祖先(.t2f-base)と履歴(.t2f-history)は元のテキストではないので見ない。
      if (entry.isDirectory()) {
        if (entry.name.indexOf('.t2f-') !== 0) walk(full)
        return
      }
      if (!/\.txt$/i.test(entry.name)) return
      const whole = fs.readFileSync(full, 'utf8')
      out.push({ key: path.relative(dir, full).replace(/\.txt$/i, ''), text: T2F.parseFrontMatter(whole).body })
    })
  }
  walk(dir)
  return out
}

/** ゲームのフォルダから、いま取り出せるテキストを組み立てる(ファイルは書かない)。 */
const fromGame = function (gameRoot) {
  const dataDir = path.join(gameRoot, 'data')
  const cache = {}
  const read = function (file) {
    if (!cache[file]) cache[file] = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'))
    return cache[file]
  }
  const listOf = function (t) {
    if (t.kind === 'common') {
      const ce = read('CommonEvents.json')[t.commonEventId]
      return ce ? ce.list : null
    }
    const map = read('Map' + pad3(t.mapId) + '.json')
    const ev = map.events[t.eventId]
    if (!ev) return null
    const page = ev.pages[t.pageId - 1]
    return page ? page.list : null
  }
  const out = []
  F2T.enumerateTargets(dataDir, { scope: 'conversation' }).forEach(function (t) {
    const list = listOf(t)
    if (!list) return
    out.push({ key: t.key, text: String(F2T.decompile(list, false, { pretty: true, gameRoot })) })
  })
  return out
}

const same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b) }
const compiled = function (text) {
  try { return T2F.compile(text) } catch (e) { return { error: String((e && e.message) || e) } }
}
const through = function (rows) { return csv.parseCsv(csv.formatCsv(rows)).rows }

/** 同じ1か所を直した表を作る。最初のセリフを書き換え、そのうしろに1行足す。 */
const edited = function (rows, id) {
  const out = rows.map(function (r) { return Object.assign({}, r) })
  const at = out.findIndex(function (r) { return r.ID === id })
  if (at < 0) return null
  out[at].本文 = String(out[at].本文).split('\n')[0] + '\n畳み方の検査で書き換えた行。'
  out.splice(at + 1, 0, Object.assign({}, out[at], { ID: '', 見た目: '', 本文: '畳み方の検査で足した行。' }))
  return out
}

const run = function (target, opts) {
  const sources = fs.existsSync(path.join(target, 'data')) ? fromGame(target) : fromTextDir(target)
  const gameRoot = fs.existsSync(path.join(target, 'data')) ? target : undefined
  const report = { targets: 0, rowsAll: 0, rowsFew: 0, command: 0, byte: 0, narrowed: 0, edit: 0, editable: 0, failures: [] }
  sources.forEach(function (one) {
    report.targets++
    const want = compiled(one.text)
    const all = csv.foldToRows(one.text, one.key, { gameRoot })
    const few = csv.foldToRows(one.text, one.key, { gameRoot, rows: 'dialogue' })
    report.rowsAll += all.length
    report.rowsFew += few.length

    const back = csv.rowsToLines(through(all), { gameRoot }).join('\n')
    if (same(compiled(back), want)) report.command++
    else if (report.failures.length < 10) report.failures.push(one.key + ' (コマンド)')
    if (back === one.text.replace(/\r\n/g, '\n')) report.byte++

    const idle = csv.mergeRows(one.text, through(few), { key: one.key, gameRoot })
    if (idle.ok && same(compiled(idle.text), want)) report.narrowed++
    else if (report.failures.length < 10) report.failures.push(one.key + ' (絞った表を当てる)')

    const first = all.filter(function (r) { return r.種別 === 'セリフ' })[0]
    if (!first) return
    report.editable++
    const a = csv.mergeRows(one.text, through(edited(all, first.ID)), { key: one.key, gameRoot })
    const b = csv.mergeRows(one.text, through(edited(few, first.ID)), { key: one.key, gameRoot })
    const landed = a.ok && b.ok && !compiled(a.text).error && same(compiled(a.text), compiled(b.text))
    if (landed) report.edit++
    else if (report.failures.length < 10) report.failures.push(one.key + ' (同じ直しが同じ結果にならない)')
  })
  if (opts && opts.quiet) return report

  console.log('■ ' + target)
  console.log('  対象 ' + report.targets + ' 件 / 行 ' + report.rowsAll +
    ' (シナリオのみ ' + report.rowsFew + ', ' + (report.rowsAll ? Math.round(report.rowsFew / report.rowsAll * 100) : 0) + '%)')
  console.log('  コマンドの一致            : ' + report.command + ' / ' + report.targets)
  console.log('  絞った表を当てても同じ    : ' + report.narrowed + ' / ' + report.targets)
  console.log('  同じ直しが同じ結果        : ' + report.edit + ' / ' + report.editable)
  console.log('  (参考)バイトも一致       : ' + report.byte + ' / ' + report.targets)
  report.failures.forEach(function (f) { console.log('  × ' + f) })
  return report
}

module.exports = { run, fromTextDir, fromGame }

if (require.main === module) {
  const args = process.argv.slice(2).filter(function (a) { return a.indexOf('--') !== 0 })
  if (!args.length) {
    console.error('使い方: node tools/csv-roundtrip.js <テキストのフォルダ または ゲームのフォルダ>')
    process.exit(2)
  }
  let bad = 0
  args.forEach(function (one) {
    const report = run(path.resolve(one))
    if (report.command !== report.targets || report.narrowed !== report.targets || report.edit !== report.editable) bad++
  })
  if (bad) {
    console.error('\n一致しないものがあります。')
    process.exit(1)
  }
  console.log('\n✅ 一致しました')
}
