/*
 * 書き出し(JSON -> テキスト)のスナップショットを作る / 照合する。
 *
 *   node tools/snapshot-text.js           test/snapshot/*.txt を書き直す
 *   node tools/snapshot-text.js --check   ずれていれば終了コード 1(書き換えない)
 *
 * なぜ要るか: このリポジトリの一番強い検査は往復一致(compile(decompile(x)) == x)だが、
 * あれは「書き出したテキストが変わった」という種類の変化に原理的に反応しない。両辺が
 * 一緒に動くため。実際、英語タグの値が英語のまま出ていた不具合は、修正前も修正後も
 * 実データ往復 2902/2902 で緑のままだった。だから「出力そのもの」を別に見張る。
 *
 * 検体は test/test_cases.js の130件をそのまま使う(追跡済みなので CI でも回る)。
 * expfile は取り込みの期待値=コマンド列なので、書き出しの入力としてちょうどよい。
 *
 * 言語を2通り出すのは、片方だけでは今回の不具合が見えなかったから。
 * 既定と同じ顔・背景・位置のタグは「省かない」で出す(omitDefaults: false)。
 * 見張る面を広くするためで、利用者の既定の見た目を写したものではない。
 *
 * 時刻は入れない。入れると毎回差分が出て「ずれているか」の判定が無意味になる
 * (tools/stamp-build-meta.js が刻印の対象を絞っているのと同じ理由)。
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const { installEngine } = require(path.join(root, 'test', 'helpers'))

installEngine()
// 既定のタグを省くかの判定で Text2Frame の既定値を引くため、両方を読む。
require(path.join(root, 'Text2Frame.js'))
const frame2text = require(path.join(root, 'Frame2Text.js'))

const OUT_DIR = path.join(root, 'test', 'snapshot')
/** 書き出す組み合わせ。ファイル名 -> decompile に渡す englishTag。 */
const VARIANTS = [
  { file: 'decompile-en.txt', englishTag: true, label: 'englishTag: true' },
  { file: 'decompile-ja.txt', englishTag: false, label: 'englishTag: false' }
]

const outPath = function (variant) { return path.join(OUT_DIR, variant.file) }

/** 検体1件のコマンド列。expfile は取り込みの期待値(マップの形)で入っている。 */
const listOf = function (testCase) {
  const data = JSON.parse(fs.readFileSync(path.join(root, testCase.expfile), 'utf8'))
  return data.events[1].pages[0].list
}

/** 1つの組み合わせの中身を組み立てる。ファイルには書かない。 */
const build = function (variant) {
  const tests = require(path.join(root, 'test', 'test_cases.js'))
  const lines = [
    '# 書き出しのスナップショット (' + variant.label + ', omitDefaults: false)',
    '# tools/snapshot-text.js が作る生成物。手で編集しない。',
    '# 作り直す: npm run update-snapshot',
    ''
  ]
  tests.forEach(function (testCase) {
    lines.push('===== ' + testCase.title + ' =====')
    lines.push(frame2text.decompile(listOf(testCase), variant.englishTag, { pretty: true, omitDefaults: false }))
    lines.push('')
  })
  return lines.join('\n')
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
      console.error('スナップショットがずれています: ' + diff.join(', '))
      console.error('作り直してから差分を確かめてください: npm run update-snapshot')
      process.exit(1)
    }
    console.log('スナップショットは最新です (' + VARIANTS.length + ' 通り)')
  } else {
    const changed = write()
    console.log(changed.length
      ? '書き直しました: ' + changed.join(', ')
      : '変わりませんでした (' + VARIANTS.length + ' 通り)')
  }
}
