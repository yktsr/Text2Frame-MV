/*
 * 畳み方(テキスト -> CSV の行)のスナップショットを作る / 照合する。
 *
 *   node tools/snapshot-csv.js           test/snapshot/csv-*.csv を書き直す
 *   node tools/snapshot-csv.js --check   ずれていれば終了コード 1(書き換えない)
 *
 * なぜ要るか: 畳み方の合格条件は「コマンドの一致」で、それは強い。ただし
 * コマンドが同じでも**畳み方だけが変わる**ことはいくらでもある(窓の切れ目の
 * 数え方、見た目のタグをどちらの行に寄せるか、空行をいくつに割るか)。
 * 人が読む表の形が黙って変わるのがいちばん困るので、出力そのものを別に見張る。
 * tools/snapshot-text.js と同じ理由・同じ作法。
 *
 * 検体は test/test_cases.js の130件。expfile(取り込みの期待値=コマンド列)を
 * 書き出してテキストにし、それを畳む。
 *
 * 2通り出すのは、絞った表が「全部の表の部分集合」でしかないことを固定するため
 * ── 絞ったときだけ畳み方が変わっていたら、ここで差分になる。
 * 時刻もパスも入れない(入れると毎回差分が出て、照合が無意味になる)。
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const { installEngine } = require(path.join(root, 'test', 'helpers'))

installEngine()
const text2frame = require(path.join(root, 'Text2Frame.js'))
const frame2text = require(path.join(root, 'Frame2Text.js'))
const csv = text2frame._csv

const OUT_DIR = path.join(root, 'test', 'snapshot')
/** 書き出す組み合わせ。ファイル名 -> foldToRows に渡す rows。 */
const VARIANTS = [
  { file: 'csv-ja.csv', rows: 'all', label: 'rows: all' },
  { file: 'csv-ja-dialogue.csv', rows: 'dialogue', label: 'rows: dialogue' }
]

const outPath = function (variant) { return path.join(OUT_DIR, variant.file) }

/** 検体1件のコマンド列。expfile は取り込みの期待値(マップの形)で入っている。 */
const listOf = function (testCase) {
  const data = JSON.parse(fs.readFileSync(path.join(root, testCase.expfile), 'utf8'))
  return data.events[1].pages[0].list
}

/** 検体の題から宛先の鍵を作る。実在のマップには依らない(機械に依存させない)。 */
const keyOf = function (n) {
  const s = String(n + 1)
  return 'case' + (s.length >= 3 ? s : ('00' + s).slice(-3))
}

/** 1つの組み合わせの中身を組み立てる。ファイルには書かない。 */
const build = function (variant) {
  const tests = require(path.join(root, 'test', 'test_cases.js'))
  const rows = []
  tests.forEach(function (testCase, n) {
    const text = frame2text.decompile(listOf(testCase), false, { pretty: true, omitDefaults: false })
    // 題を見出しの行として置く。読むときにどの検体か分かるように。
    const head = {}
    csv.COLUMNS.forEach(function (c) { head[c] = '' })
    head.種別 = '見出し'
    head.宛先 = keyOf(n)
    head.本文 = testCase.title
    rows.push(head)
    csv.foldToRows(text, keyOf(n), { rows: variant.rows }).forEach(function (r) { rows.push(r) })
  })
  return csv.formatCsv(rows)
}

/** 書き直す。戻り値は実際に中身が変わったファイル名。 */
const write = function () {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const changed = []
  VARIANTS.forEach(function (variant) {
    const next = build(variant)
    let current = null
    try { current = fs.readFileSync(outPath(variant), 'utf8') } catch (e) { /* まだ無い */ }
    if (current === next) return
    fs.writeFileSync(outPath(variant), next, 'utf8')
    changed.push(variant.file)
  })
  return changed
}

/** ずれている組み合わせを返す。空なら一致。 */
const stale = function () {
  return VARIANTS.filter(function (variant) {
    let current = null
    try { current = fs.readFileSync(outPath(variant), 'utf8') } catch (e) { /* 無いのもずれ */ }
    return current !== build(variant)
  }).map(function (variant) { return variant.file })
}

module.exports = { build, write, stale, outPath, VARIANTS, OUT_DIR }

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const diff = stale()
    if (diff.length) {
      console.error('CSV のスナップショットがずれています: ' + diff.join(', '))
      console.error('作り直してから差分を確かめてください: npm run update-csv-snapshot')
      process.exit(1)
    }
    console.log('CSV のスナップショットは最新です (' + VARIANTS.length + ' 通り)')
  } else {
    const changed = write()
    console.log(changed.length
      ? '書き直しました: ' + changed.join(', ')
      : '変わりませんでした (' + VARIANTS.length + ' 通り)')
  }
}
