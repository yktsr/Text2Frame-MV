#!/usr/bin/env node
/*
 * Round-trip verifier (DESTRUCTIVE — overwrites data/ and text/).
 *
 * Reproduces the extension's "Export All -> Deploy All" over real data and
 * checks the result is identical to the original:
 *
 *   1. snapshot  : read every Map###.json / CommonEvents.json, remember each
 *                  event/page (and common) command `list`.
 *   2. export    : decompile each non-empty list -> text/<locale>/<key>.txt
 *                  (front matter + body), like "Export All".
 *   3. deploy    : applyTextFile(import) each text file back into data,
 *                  like "Deploy All".
 *   4. compare   : re-read data and deep-equal each list against the snapshot
 *                  (key-order-insensitive; trailing {code:0} normalized).
 *
 * Differences are either real bugs or acceptable normalization — the report
 * prints the first differing command so you can judge. Restore originals from
 * git afterwards (e.g. `git checkout -- <dataDir>`).
 *
 * Usage:
 *   node tools/verify-roundtrip.js [dataDir] [--text=text] [--locale=ja]
 *                                  [--en=true] [--max=20]
 *   (dataDir default: sample/data)
 */
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const t2f = require(path.join(repoRoot, 'Text2Frame.js'))
const f2t = require(path.join(repoRoot, 'Frame2Text.js'))

// --- args ---
const rawArgs = process.argv.slice(2)
const opts = { text: 'text', locale: 'ja', en: 'true', max: '20' }
let dataDirArg = null
for (const a of rawArgs) {
  const m = a.match(/^--([^=]+)=(.*)$/)
  if (m) { opts[m[1]] = m[2] } else if (!dataDirArg) { dataDirArg = a }
}
const dataDir = path.resolve(repoRoot, dataDirArg || 'sample/data')
const textBase = path.resolve(repoRoot, opts.text)
const locale = opts.locale
const englishTag = String(opts.en) !== 'false'
const maxDiffs = parseInt(opts.max, 10) || 20

if (!fs.existsSync(dataDir)) {
  console.error('data dir not found: ' + dataDir)
  process.exit(1)
}

// --- helpers ---
// Canonical JSON (sorted keys) so key-order differences are not false mismatches.
const canon = (v) => {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']'
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'
  }
  return JSON.stringify(v)
}
// Drop a single trailing terminator {code:0} so "list" vs "list + bottom" match.
const stripTail = (list) => {
  if (Array.isArray(list) && list.length > 0) {
    const last = list[list.length - 1]
    if (last && last.code === 0) return list.slice(0, -1)
  }
  return list
}
// 101(文章の表示)は MV=4引数 / MZ=5引数(第5=名前ボックス)。compile は常に MZ 形式
// (空名前は "")で出力するため、MV データとの往復で末尾に "" が増える。これは無害な
// MV→MZ 正規化なので、末尾の空 "" 第5引数は同一とみなす(実際の名前差は保持)。
// --strict=true で無効化(生の差分を見る)。
const strict = String(opts.strict) === 'true'
const normalizeCmd = (c) => {
  if (!strict && c && c.code === 101 && Array.isArray(c.parameters) &&
      c.parameters.length === 5 && c.parameters[4] === '') {
    return Object.assign({}, c, { parameters: c.parameters.slice(0, 4) })
  }
  return c
}
const norm = (list) => stripTail(list).map(normalizeCmd)
const listsEqual = (a, b) => canon(norm(a)) === canon(norm(b))
const firstDiffIndex = (a, b) => {
  const x = norm(a)
  const y = norm(b)
  const n = Math.max(x.length, y.length)
  for (let i = 0; i < n; i++) {
    if (canon(x[i]) !== canon(y[i])) return i
  }
  return -1
}
const pad3 = (n) => ('000' + String(n)).slice(-3)
const mapFile = (mapId) => path.join(dataDir, 'Map' + pad3(mapId) + '.json')
const cePath = path.join(dataDir, 'CommonEvents.json')

const renderFrontMatter = (t) => {
  const lines = ['---', 'generator: text2frame-mv@' + (f2t.VERSION || 'unknown'), 'kind: ' + t.kind]
  if (t.kind === 'common') {
    lines.push('commonEventId: ' + t.commonEventId)
  } else {
    lines.push('mapId: ' + t.mapId, 'eventId: ' + t.eventId, 'pageId: ' + t.pageId)
  }
  lines.push('---')
  return lines.join('\n') + '\n'
}

// --- 1. enumerate targets + snapshot ---
const targets = []
const snapshot = {}
for (const file of fs.readdirSync(dataDir).sort()) {
  const m = file.match(/^Map(\d+)\.json$/)
  if (!m) continue
  const mapId = String(parseInt(m[1], 10))
  let map
  try { map = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) } catch (e) { continue }
  if (!map.events || !Array.isArray(map.events)) continue
  map.events.forEach((ev, eventIndex) => {
    if (!ev || !ev.pages) return
    ev.pages.forEach((page, pageIndex) => {
      if (!page || !Array.isArray(page.list) || page.list.length <= 1) return
      const eventId = String(eventIndex)
      const pageId = String(pageIndex + 1)
      const key = 'map' + pad3(mapId) + '_event' + pad3(eventId) + '_page' + pageId
      targets.push({ kind: 'event', mapId, eventId, pageId, key, dataPath: mapFile(mapId) })
      snapshot[key] = JSON.parse(JSON.stringify(page.list))
    })
  })
}
if (fs.existsSync(cePath)) {
  try {
    const ce = JSON.parse(fs.readFileSync(cePath, 'utf8'))
    ce.forEach((entry, index) => {
      if (!entry || !Array.isArray(entry.list) || entry.list.length <= 1) return
      const key = 'common' + pad3(index)
      targets.push({ kind: 'common', commonEventId: String(index), key, dataPath: cePath })
      snapshot[key] = JSON.parse(JSON.stringify(entry.list))
    })
  } catch (e) { /* ignore */ }
}

console.log('[verify] dataDir=' + path.relative(repoRoot, dataDir) + ' targets=' + targets.length + ' englishTag=' + englishTag)

// --- 2. export (data -> text) ---
const outDir = path.join(textBase, locale)
fs.mkdirSync(outDir, { recursive: true })
let exported = 0
for (const t of targets) {
  let list
  if (t.kind === 'common') {
    list = JSON.parse(fs.readFileSync(cePath, 'utf8'))[Number(t.commonEventId)].list
  } else {
    list = JSON.parse(fs.readFileSync(t.dataPath, 'utf8')).events[Number(t.eventId)].pages[Number(t.pageId) - 1].list
  }
  const body = f2t.decompile(list, englishTag, { pretty: true })
  fs.writeFileSync(path.join(outDir, t.key + '.txt'), renderFrontMatter(t) + '\n' + body + '\n', 'utf8')
  exported++
}
console.log('[verify] exported ' + exported + ' text files -> ' + path.relative(repoRoot, outDir))

// --- 3. deploy (text -> data, import) ---
const deployFails = []
for (const t of targets) {
  const textPath = path.join(outDir, t.key + '.txt')
  const o = { textPath, kind: t.kind, strategy: 'import', overwrite: true }
  if (t.kind === 'common') { o.commonEventId = t.commonEventId; o.commonEventPath = cePath } else { o.mapId = t.mapId; o.eventId = t.eventId; o.pageId = t.pageId; o.mapPath = t.dataPath }
  const res = t2f.applyTextFile(o)
  if (!res.ok) deployFails.push({ key: t.key, error: (res.error || '').split('\n')[0], line: res.errorLineText })
}
console.log('[verify] deployed; deploy failures: ' + deployFails.length)

// --- 4. compare re-read data vs snapshot ---
let identical = 0
const mismatches = []
for (const t of targets) {
  let list
  try {
    if (t.kind === 'common') {
      list = JSON.parse(fs.readFileSync(cePath, 'utf8'))[Number(t.commonEventId)].list
    } else {
      list = JSON.parse(fs.readFileSync(t.dataPath, 'utf8')).events[Number(t.eventId)].pages[Number(t.pageId) - 1].list
    }
  } catch (e) { mismatches.push({ key: t.key, reason: 'read-error: ' + e.message }); continue }
  if (listsEqual(snapshot[t.key], list)) {
    identical++
  } else {
    const i = firstDiffIndex(snapshot[t.key], list)
    mismatches.push({
      key: t.key,
      reason: 'list differs at index ' + i,
      lenBefore: norm(snapshot[t.key]).length,
      lenAfter: norm(list).length,
      before: i >= 0 ? canon(norm(snapshot[t.key])[i]) : '(end)',
      after: i >= 0 ? canon(norm(list)[i]) : '(end)'
    })
  }
}

// --- report ---
console.log('\n===== Round-trip result =====')
console.log('targets   : ' + targets.length)
console.log('identical : ' + identical)
console.log('mismatched: ' + mismatches.length)
console.log('deploy-fail: ' + deployFails.length)

if (deployFails.length) {
  console.log('\n--- deploy failures (first ' + Math.min(maxDiffs, deployFails.length) + ') ---')
  deployFails.slice(0, maxDiffs).forEach((f) => console.log('FAIL ' + f.key + '  ' + f.error + (f.line ? '  @ ' + f.line : '')))
}
if (mismatches.length) {
  console.log('\n--- mismatches (first ' + Math.min(maxDiffs, mismatches.length) + ') ---')
  mismatches.slice(0, maxDiffs).forEach((d) => {
    console.log('DIFF ' + d.key + '  ' + d.reason + (d.lenBefore !== undefined ? '  (len ' + d.lenBefore + '->' + d.lenAfter + ')' : ''))
    if (d.before !== undefined) {
      console.log('   before: ' + (d.before.length > 300 ? d.before.slice(0, 300) + '…' : d.before))
      console.log('   after : ' + (d.after.length > 300 ? d.after.slice(0, 300) + '…' : d.after))
    }
  })
}

const clean = mismatches.length === 0 && deployFails.length === 0
console.log('\n' + (clean ? '✅ PERFECT round-trip (all lists identical)' : '⚠️ differences found — inspect above (real bug vs acceptable normalization). Restore data with: git checkout -- ' + path.relative(repoRoot, dataDir)))
process.exitCode = clean ? 0 : 1
