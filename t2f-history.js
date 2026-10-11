/*
 * 書き換える直前の中身を .t2f-history に控える。戻すのは VSCode 拡張の「編集履歴を表示する」。
 *
 * 形式は拡張の vscode-extension/src/db/history.ts が持っているもので、ここは**書くだけ**。
 * 読み・巻き戻し(listEntries / planRestoreTo / restoreTo)はあちらが権威。だから
 *   <ゲームのフォルダ>/.t2f-history/<id>/entry.json
 *   <ゲームのフォルダ>/.t2f-history/<id>/files/<相対パス>
 * の形を1つも崩さないこと。崩れていないことは vscode-extension/test/test_mcp_history.js が
 * 拡張の読み手に実際に読ませて確かめる(こちらだけで assert しても意味がない)。
 *
 * MCP から書くために出した。エージェントの誤爆から人が戻せることが、書き込みを許す条件。
 */
'use strict'

const fs = require('fs')
const path = require('path')

const HISTORY_DIR = '.t2f-history'
const ENTRY_FILE = 'entry.json'
const FILES_DIR = 'files'

const historyRoot = function (root) { return path.join(root, HISTORY_DIR) }
const entryDir = function (root, id) { return path.join(historyRoot(root), id) }
const snapshotFile = function (root, id, rel) {
  return path.join.apply(path, [entryDir(root, id), FILES_DIR].concat(rel.split('/')))
}
const toRel = function (root, abs) { return path.relative(root, abs).split(path.sep).join('/') }

/** 「e:マップ:イベント:ページ」「c:コモンイベント」。拡張の placeLabel.ts:28 と同じ形。 */
const pageKeyOf = function (target) {
  if (!target) return undefined
  if (String(target.kind) === 'common') {
    return target.commonEventId === undefined ? undefined : 'c:' + Number(target.commonEventId)
  }
  if (target.eventId === undefined) return undefined
  return 'e:' + Number(target.mapId) + ':' + Number(target.eventId) + ':' + Number(target.pageId || 1)
}

let sequence = 0
const newId = function (now) {
  const d = new Date(now)
  const pad = function (n, w) { return String(n).padStart(w || 2, '0') }
  sequence = (sequence + 1) % 1000
  return String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate()) +
    '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) +
    '-' + pad(d.getMilliseconds(), 3) + '-' + pad(sequence, 3)
}

const readOrUndefined = function (file) {
  try { return fs.readFileSync(file) } catch (e) { return undefined }
}

/* 控えの置き場所を用意する。ゲームのフォルダが git で管理されていても控えが入らないように
 * 中に .gitignore を置く(利用者の .gitignore は触らない)。拡張と同じ扱い。 */
const ensureRoot = function (root) {
  const dir = historyRoot(root)
  fs.mkdirSync(dir, { recursive: true })
  const ignore = path.join(dir, '.gitignore')
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n', 'utf8')
}

const readEntry = function (root, id) {
  try {
    const entry = JSON.parse(fs.readFileSync(path.join(entryDir(root, id), ENTRY_FILE), 'utf8'))
    return entry && entry.id === id && Array.isArray(entry.files) ? entry : undefined
  } catch (e) { return undefined }
}

/** 残っている操作(新しい順)。prune のためだけに読む。 */
const listEntries = function (root) {
  let names = []
  try { names = fs.readdirSync(historyRoot(root)) } catch (e) { return [] }
  const out = []
  names.forEach(function (name) {
    if (name.indexOf('.') === 0) return
    const entry = readEntry(root, name)
    if (entry) out.push(entry)
  })
  return out.sort(function (a, b) { return b.time - a.time || (a.id < b.id ? 1 : -1) })
}

/** 残す数を超えた古い操作を消す。いちばん新しい操作は残す(拡張の prune と同じ約束)。 */
const prune = function (root, keep) {
  const removed = []
  listEntries(root).forEach(function (entry, i) {
    if (i < Math.max(1, keep)) return
    fs.rmSync(entryDir(root, entry.id), { recursive: true, force: true })
    removed.push(entry.id)
  })
  return removed
}

/**
 * 1つの操作の記録係。書く前に note を呼び、終わったら finish を呼ぶ。
 * 控えはディスクにすぐ書かず持っておき、終わって本当に変わっていたものだけ書く
 * (変わらないファイルの写しを作っては消すと、ファイルを見張る git などがいっせいに動く)。
 */
const beginEntry = function (root, op, label, options) {
  const o = options || {}
  const keep = o.keep === undefined ? 100 : Number(o.keep)
  const now = o.now || Date.now
  const started = now()
  const entry = { id: newId(started), time: started, started, op, label, files: [] }
  const known = {}
  const before = {}
  let touched = false

  const note = function (absPath, kind, pages) {
    if (keep <= 0) return
    const rel = toRel(root, absPath)
    // 根の外と、控えそのものは記録しない。
    if (!rel || rel.indexOf('..') === 0 || path.isAbsolute(rel) || rel.split('/')[0] === HISTORY_DIR) return
    if (known[rel]) {
      if (pages && pages.length) {
        known[rel].pages = Object.keys((known[rel].pages || []).concat(pages).reduce(function (set, p) {
          set[p] = true
          return set
        }, {}))
      }
      return
    }
    touched = true
    const held = readOrUndefined(absPath)
    if (held !== undefined) before[rel] = held
    const file = { path: rel, existed: held !== undefined, kind }
    if (pages && pages.length) {
      file.pages = Object.keys(pages.reduce(function (set, p) {
        set[p] = true
        return set
      }, {}))
    }
    known[rel] = file
    entry.files.push(file)
  }

  const finish = function () {
    if (!touched || keep <= 0) return undefined
    const kept = []
    entry.files.forEach(function (file) {
      const abs = path.join.apply(path, [root].concat(file.path.split('/')))
      const held = before[file.path]
      const current = readOrUndefined(abs)
      const changed = file.existed ? !(current && held && current.equals(held)) : current !== undefined
      if (!changed) return
      if (held !== undefined) {
        const copy = snapshotFile(root, entry.id, file.path)
        fs.mkdirSync(path.dirname(copy), { recursive: true })
        fs.writeFileSync(copy, held)
      }
      kept.push(file)
    })
    entry.files = kept
    /* 何も変わっていない操作と、祖先(.t2f-base)だけが変わった操作は残さない。
     * 祖先は履歴の行に出ないので、残すと中身の無い行になる(拡張の finish と同じ判断)。 */
    if (!kept.some(function (file) { return file.kind !== 'base' })) {
      fs.rmSync(entryDir(root, entry.id), { recursive: true, force: true })
      return undefined
    }
    ensureRoot(root)
    entry.time = now()
    entry.bytes = kept.reduce(function (sum, file) {
      if (!file.existed) return sum
      try { return sum + fs.statSync(snapshotFile(root, entry.id, file.path)).size } catch (e) { return sum }
    }, 0)
    fs.mkdirSync(entryDir(root, entry.id), { recursive: true })
    fs.writeFileSync(path.join(entryDir(root, entry.id), ENTRY_FILE), JSON.stringify(entry, null, 1), 'utf8')
    prune(root, keep)
    return entry
  }

  return { id: entry.id, note, finish }
}

module.exports = {
  HISTORY_DIR,
  beginEntry,
  historyRoot,
  snapshotFile,
  listEntries,
  readEntry,
  prune,
  pageKeyOf
}
