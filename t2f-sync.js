#!/usr/bin/env node
/*
 * t2f-sync — テキストとゲームデータを双方向に同期するコントローラ。
 *
 * Text2Frame.js / Frame2Text.js は「ライブラリ」として使い、ここが双方向を所有する。
 * 1プロセスが双方向を持つので「自分が書いたファイル」を確実に識別でき、
 * text -> game -> text の無限ループを防げる(内容ハッシュで自分の書き込みを無視)。
 *
 * 注意: RPGツクールはプロジェクト保存時に data/*.json を丸ごと書き戻すため、
 * エディタを開いたまま push した内容は保存操作で失われることがある。
 */
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const T2F = require('./Text2Frame.js')
const F2T = require('./Frame2Text.js')

const sha1 = function (s) { return crypto.createHash('sha1').update(String(s)).digest('hex') }
const pad3 = function (n) { return ('000' + String(n)).slice(-3) }
const mapFileName = function (mapId) { return 'Map' + pad3(mapId) + '.json' }

const parseFrontMatter = function (text) {
  const meta = {}
  const n = String(text).replace(/\r\n/g, '\n')
  if (n.indexOf('---\n') !== 0) return { meta: null, body: n }
  const e = n.indexOf('\n---\n', 4)
  if (e < 0) return { meta: null, body: n }
  n.slice(4, e).split('\n').forEach(function (line) {
    const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/)
    if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  })
  return { meta, body: n.slice(e + 5) }
}

const readIfExists = function (p) {
  try { return fs.readFileSync(p, 'utf8') } catch (e) { return null }
}

/* 自分が書いたファイルを内容ハッシュで覚えておき、その変更イベントは無視する。 */
function createEchoGuard () {
  const own = new Map()
  return {
    record: function (absPath, content) { own.set(path.resolve(absPath), sha1(content)) },
    recordFile: function (absPath) {
      const c = readIfExists(absPath)
      if (c !== null) own.set(path.resolve(absPath), sha1(c))
    },
    // 自分の書き込みが原因のイベントなら true(記録は消費する)
    isEcho: function (absPath) {
      const key = path.resolve(absPath)
      if (!own.has(key)) return false
      const cur = readIfExists(key)
      if (cur !== null && own.get(key) === sha1(cur)) { own.delete(key); return true }
      own.delete(key)
      return false
    }
  }
}

/* ---------- push: text -> game ---------- */

function pushFile (textPath, opts) {
  const o = opts || {}
  const root = o.root || process.cwd()
  const dataDir = path.resolve(root, o.dataDir || 'data')
  const raw = readIfExists(textPath)
  if (raw === null) return { ok: false, textPath, error: 'text not readable' }
  const parsed = parseFrontMatter(raw)
  if (!parsed.meta || !parsed.meta.kind) return null // front matter 無しは対象外
  const meta = parsed.meta
  const kind = String(meta.kind).toLowerCase()

  // applyTextFile はモジュール位置基準でデータを探すため、明示的に渡す。
  const applyOpts = {
    textPath: path.resolve(textPath),
    strategy: o.strategy || 'merge',
    writeBack: o.writeBack,
    baseRoot: root,
    isDebug: !!o.verbose
  }
  if (kind === 'common') applyOpts.commonEventPath = path.join(dataDir, 'CommonEvents.json')
  else if (meta.mapId) applyOpts.mapPath = path.join(dataDir, mapFileName(meta.mapId))

  const res = T2F.applyTextFile(applyOpts)
  if (res.ok && res.dataPath && o.guard) o.guard.recordFile(res.dataPath)
  return res
}

/* ---------- pull: game -> text ---------- */

function targetsForDataFile (dataDir, dataFile) {
  const base = path.basename(dataFile)
  const all = F2T.enumerateTargets(dataDir)
  if (/^CommonEvents\.json$/i.test(base)) {
    return all.filter(function (t) { return t.kind === 'common' })
  }
  const m = base.match(/^Map(\d+)\.json$/i)
  if (!m) return []
  const mapId = String(parseInt(m[1], 10))
  return all.filter(function (t) { return t.kind === 'event' && String(t.mapId) === mapId })
}

function pullTarget (target, opts) {
  const o = opts || {}
  const root = o.root || process.cwd()
  const dataDir = path.resolve(root, o.dataDir || 'data')
  const englishTag = o.englishTag !== false
  const strategy = o.strategy || 'merge'
  const textPath = path.resolve(root, o.textDir || 'text', target.key + '.txt')

  let list = []
  if (target.kind === 'event') {
    const map = JSON.parse(fs.readFileSync(path.join(dataDir, mapFileName(target.mapId)), 'utf8'))
    const ev = map.events[Number(target.eventId)]
    const page = ev && ev.pages && ev.pages[Number(target.pageId) - 1]
    if (!page) return { ok: false, textPath, error: 'event/page not found' }
    list = page.list || []
  } else {
    const ce = JSON.parse(fs.readFileSync(path.join(dataDir, 'CommonEvents.json'), 'utf8'))
    if (!ce[Number(target.commonEventId)]) return { ok: false, textPath, error: 'common event not found' }
    list = ce[Number(target.commonEventId)].list || []
  }

  // 本文の組み立ては Frame2Text の buildPullText に一本化する(プラグイン/CLI と同じ挙動)。
  const existing = readIfExists(textPath)
  const id = T2F.deriveBaseId(textPath, root)
  const entryStrategy = String(strategy).toLowerCase() === 'overwrite' ? 'overwrite' : 'merge'
  const built = F2T.buildPullText({
    list,
    englishTag,
    strategy: entryStrategy,
    writeBack: o.writeBack,
    existingText: existing || '',
    baseText: (entryStrategy === 'merge' && T2F.readBaseText(root, id.key)) || '',
    fallbackHeader: F2T.renderFrontMatter(target, target.kind)
  })
  // 目印をまたいだ統合はできない(目印ごと再マージして二重化するため)。上書きなら取り出せる。
  if (built.skipped) {
    console.warn('[pull] skipped: cannot merge across unresolved conflict markers in the ' + built.skipped + '. ' +
      (built.skipped === 'game'
        ? 'Resolve them in the editor, or pull with --strategy overwrite and resolve in the text: '
        : 'Resolve them in the text, then push: ') + textPath)
    return { ok: true, textPath, skipped: built.skipped }
  }
  const conflicts = built.conflicts || 0
  const markers = !!built.markers

  /* 先にゲームへ書く。書けなければテキストも祖先も触らない。
   * 書いたものは自分の書き込みとして記録する(見張りが拾って回り続けないように)。 */
  const wrote = F2T.writeBackToGame(built.writeBack, target, {
    mapPath: target.kind === 'event' ? path.join(dataDir, mapFileName(target.mapId)) : undefined,
    commonEventPath: target.kind === 'common' ? path.join(dataDir, 'CommonEvents.json') : undefined
  })
  if (!wrote.ok) return { ok: false, textPath, error: wrote.error }
  if (wrote.dataPath && o.guard) o.guard.recordFile(wrote.dataPath)

  const written = built.text
  const prev = readIfExists(textPath)
  // ゲームへ書いたときは、テキストが同じでも祖先を進める(下まで通す)。
  if (prev === written && !wrote.dataPath) return { ok: true, textPath, unchanged: true, conflicts, markers }

  const dir = path.dirname(textPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(textPath, written, 'utf8')
  if (o.guard) o.guard.record(textPath, written)
  if (conflicts) {
    console.warn('[pull] ' + conflicts + ' conflict(s) written into the game ' +
      '(resolve the markers in the editor, then pull again): ' + textPath)
  }
  // コメント行(%)は元の位置へ戻すが、周りが大きく変わると位置があやしくなる。消えてはいない。
  if (built.approximate) {
    console.warn('[pull] ' + built.approximate + ' comment line(s) may have moved (nothing lost): ' + textPath)
  }
  const pullWarnings = built.warnings || []
  pullWarnings.forEach(function (w) { console.warn('[pull] ' + w + ': ' + textPath) })
  // 祖先に目印が入ると次回の 3-way がそれを再マージするので、そのときだけ進めない。
  // 衝突しただけなら進める(目印はゲームのみ)。据え置くと、ツクールで解決したあとの
  // 取り出しで同じ衝突が再発する。
  if (markers) {
    console.warn('[pull] exported with unresolved markers; .t2f-base not updated ' +
      '(resolve the markers in the text, then push with --strategy overwrite): ' + textPath)
  } else {
    try {
      const id = T2F.deriveBaseId(textPath, root)
      // 祖先は buildPullText が決めた側(書き戻したならテキストに書いた内容、でなければゲーム)。
      T2F.saveBaseText(root, id.key, built.baseText)
    } catch (e) { /* best effort */ }
  }
  return { ok: true, textPath, conflicts, markers }
}

function pullDataFile (dataFile, opts) {
  const o = opts || {}
  const root = o.root || process.cwd()
  const dataDir = path.resolve(root, o.dataDir || 'data')
  return targetsForDataFile(dataDir, dataFile).map(function (t) { return pullTarget(t, o) })
}

/* ---------- one-shot ---------- */

function walkTextFiles (dir) {
  const out = []
  const stack = [dir]
  while (stack.length) {
    const cur = stack.pop()
    let st
    try { st = fs.statSync(cur) } catch (e) { continue }
    if (st.isDirectory()) fs.readdirSync(cur).forEach(function (n) { stack.push(path.join(cur, n)) })
    else if (st.isFile() && /\.txt$/i.test(cur)) out.push(cur)
  }
  return out.sort()
}

function syncOnce (opts) {
  const o = opts || {}
  const root = o.root || process.cwd()
  const dir = o.direction || 'both'
  const dataDir = path.resolve(root, o.dataDir || 'data')
  const textRoot = path.resolve(root, o.textDir || 'text')
  const results = { pulled: [], pushed: [] }

  if (dir === 'pull' || dir === 'both') {
    let files = []
    try { files = fs.readdirSync(dataDir).filter(function (f) { return /^(Map\d+|CommonEvents)\.json$/i.test(f) }) } catch (e) { files = [] }
    files.sort().forEach(function (f) {
      pullDataFile(path.join(dataDir, f), o).forEach(function (r) { results.pulled.push(r) })
    })
  }
  if (dir === 'push' || dir === 'both') {
    walkTextFiles(textRoot).forEach(function (f) {
      const r = pushFile(f, o)
      if (r) results.pushed.push(r)
    })
  }
  return results
}

module.exports = { pushFile, pullTarget, pullDataFile, syncOnce, createEchoGuard, targetsForDataFile }

/* ---------- CLI ---------- */

if (require.main === module) {
  const { Command } = require('commander')
  const program = new Command()
  program
    .name('t2f-sync')
    .description('テキストとゲームデータを双方向に同期する (Text2Frame / Frame2Text のコントローラ)')
    .option('--direction <both|push|pull>', 'sync direction', /^(both|push|pull)$/i, 'both')
    .option('-t, --text-dir <dir>', 'text base directory', 'text')
    .option('-d, --data-dir <dir>', 'game data directory', 'data')
    .option('--root <dir>', 'project root for data/, text/ and .t2f-base (default: current directory)')
    .option('-s, --strategy <merge|overwrite>', 'sync strategy', /^(merge|overwrite)$/i, 'merge')
    .option('--write-back <always|off>', 'write the merge back to the other side too (default off; conflicts always are)', /^(always|off)$/i, 'off')
    .option('-w, --english_tag <true/false>', 'english tag on pull', 'true')
    .option('--watch', 'watch both sides and sync on change', false)
    .option('--debounce <ms>', 'debounce window for --watch', '250')
    .option('--poll', 'force polling (network/WSL paths)', false)
    .option('-v, --verbose', 'debug mode', false)
    .parse()

  const options = program.opts()
  /* テキスト・データ・祖先(.t2f-base)はすべてここから決まる。既定は cwd なので、
   * プロジェクト直下で流す通常の使い方は今までと同じ。Text2Frame.js の --root と同じ意味。 */
  const root = options.root ? path.resolve(options.root) : process.cwd()
  const guard = createEchoGuard()
  const opts = {
    root,
    dataDir: options.dataDir,
    textDir: options.textDir,
    strategy: String(options.strategy).toLowerCase(),
    writeBack: String(options.writeBack).toLowerCase(),
    englishTag: String(options.english_tag) !== 'false',
    direction: String(options.direction).toLowerCase(),
    verbose: options.verbose,
    guard
  }

  /* 根の外にあるテキストやデータは、祖先だけが根の側に取り残される。さらに根の外の
   * テキストは祖先の鍵が「フォルダ名/ファイル名」に丸められ、別プロジェクトと取り合う。
   * どちらも黙って起きるため入口で知らせる(Text2Frame.js の CLI と同じ扱い)。 */
  const outsideRoot = [];
  [['text', options.textDir], ['data', options.dataDir]].forEach(function (pair) {
    const abs = path.resolve(root, pair[1])
    const r = path.relative(root, abs)
    if (r && (path.isAbsolute(r) || r.split(path.sep)[0] === '..')) outsideRoot.push(pair[0] + ': ' + abs)
  })
  if (outsideRoot.length > 0) {
    console.warn('[warn] 次のパスが --root の外にあります / outside the project root (root: ' + root + ')')
    outsideRoot.forEach(function (line) { console.warn('       ' + line) })
    console.warn('  祖先(.t2f-base)は root 側に作られます。次の反映が祖先なし(テキストが正)に落ち、' +
      'テキストに書いていないゲーム側の変更が消えることがあります。--root でプロジェクトの場所を指定してください。' +
      ' / pass --root <project dir>')
  }

  const stamp = function () {
    const d = new Date()
    const p = function (n) { return ('0' + n).slice(-2) }
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
  }
  const rel = function (p) { return path.relative(root, p) || p }

  const reportPull = function (r) {
    if (!r.ok) { console.log('[' + stamp() + '] PULL  ' + rel(r.textPath) + '  FAIL  ' + r.error); return }
    if (r.unchanged) return
    console.log('[' + stamp() + '] PULL  ' + rel(r.textPath) + '  OK' + (r.conflicts ? '  (' + r.conflicts + ' conflicts kept both)' : ''))
  }
  const reportPush = function (r) {
    if (!r.ok) { console.log('[' + stamp() + '] PUSH  ' + rel(r.textPath) + '  FAIL  ' + r.error); return }
    const w = r.warnings && r.warnings.length ? '  (' + r.warnings.length + ' warnings)' : ''
    console.log('[' + stamp() + '] PUSH  ' + rel(r.textPath) + ' -> ' + rel(r.dataPath || '?') + '  OK' + w)
    if (r.warnings) r.warnings.forEach(function (x) { console.log('[' + stamp() + ']   warn: ' + x) })
  }

  const initial = syncOnce(opts)
  initial.pulled.forEach(reportPull)
  initial.pushed.forEach(reportPush)
  const failed = initial.pulled.concat(initial.pushed).filter(function (r) { return !r.ok }).length
  console.log('[' + stamp() + '] initial sync: ' + initial.pulled.length + ' pulled, ' +
    initial.pushed.length + ' pushed, ' + failed + ' failed (direction=' + opts.direction + ', strategy=' + opts.strategy + ')')
  if (failed > 0 && !options.watch) process.exitCode = 1

  if (options.watch) {
    let chokidar
    try { chokidar = require('chokidar') } catch (e) {
      throw new Error('chokidar is required for --watch. Run: npm install')
    }
    const textRoot = path.resolve(root, opts.textDir)
    const dataDir = path.resolve(root, opts.dataDir)
    const usePolling = !!options.poll || /wsl\.localhost|[/\\]mnt[/\\]/.test(root)
    const debounceMs = parseInt(options.debounce, 10) || 250
    const timers = {}
    const schedule = function (key, fn) {
      if (timers[key]) clearTimeout(timers[key])
      timers[key] = setTimeout(function () { delete timers[key]; fn() }, debounceMs)
    }

    const watched = []
    if (opts.direction === 'push' || opts.direction === 'both') watched.push(textRoot)
    if (opts.direction === 'pull' || opts.direction === 'both') watched.push(dataDir)

    const watcher = chokidar.watch(watched, {
      usePolling,
      interval: 300,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      ignoreInitial: true
    })

    watcher.on('all', function (event, file) {
      if (event !== 'add' && event !== 'change') return
      const abs = path.resolve(file)
      const inText = abs.indexOf(textRoot + path.sep) === 0
      const inData = abs.indexOf(dataDir + path.sep) === 0
      if (inText && !/\.txt$/i.test(abs)) return
      if (inData && !/^(Map\d+|CommonEvents)\.json$/i.test(path.basename(abs))) return
      if (guard.isEcho(abs)) return // 自分の書き込みが原因 -> ループさせない
      schedule(abs, function () {
        if (guard.isEcho(abs)) return
        if (inText) { const r = pushFile(abs, opts); if (r) reportPush(r) } else if (inData) { pullDataFile(abs, opts).forEach(reportPull) }
      })
    })

    console.log('[watch] ' + watched.map(rel).join(' + ') + ' を監視中 (direction=' + opts.direction +
      ', strategy=' + opts.strategy + (usePolling ? ', polling' : '') + ')  Ctrl-C で終了')
    if (opts.direction !== 'pull') {
      console.log('[watch] 注意: RPGツクールでプロジェクトを保存すると data/*.json が丸ごと書き戻され、反映済みの内容が失われることがあります。')
    }
    process.on('SIGINT', function () {
      console.log('\n[watch] stopping...')
      watcher.close().then(function () { process.exit(0) })
    })
  }
}
