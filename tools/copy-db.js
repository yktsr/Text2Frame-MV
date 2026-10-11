/*
 * 拡張が持っている「構造の層」を、npm で配るためにルートの db/ へ写す。
 *
 *   node tools/copy-db.js
 *
 * なぜ要るか: t2f-mcp.js の逆引き(t2f_usages)は vscode-extension/src/db/* を借りている。
 * あれは vscode に依存しない純粋な層で、.vsix には out/db/ として既に入っているが、
 * npm の tarball には入らない(TypeScript の生成物で gitignore されている)。写さないと
 * npm 経由の利用者だけ道具が1つ消える。
 *
 * prepack(npm pack / npm publish の両方で走る)と tools/pack-all.sh の両方がここを呼ぶ。
 * 「ルートに置く」という約束を知っているのはこのファイルだけにしておく。
 *
 * **一括コピーにしない。** out/db/ は閉じた集合ではない — checks.js は ../tagBrackets を、
 * fixes.js は ../tagHelpData を require している。全部写すと require で落ちるものを配る。
 * 借りている4つだけを名指しし、閉じていることを下で機械的に確かめる。
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const outDir = process.env.DB_SOURCE_DIR || path.join(root, 'vscode-extension', 'out', 'db')
const dbDir = path.join(root, 'db')
/* t2f-mcp.js の loadDb が読むものと、それが読む兄弟。増やすときは下の閉じ検査が守る。 */
const MODULES = [
  'eventLinks.js', 'eventPages.js', 'database.js', 'lang.js',
  // 素材の実在を見るのに要る。faces が originalCore と png を読むので一緒に写す
  // (閉じ検査がそう言う)。実在の確認はファイル名の照合だけで、復号には触らない。
  'faces.js', 'png.js', 'originalCore.js',
  // 参照している素材を取り出すのに要る。**手で足すしかない** - eventLinks は
  // RpgCommand を型だけ取り込むので実行時の require が無く、閉じ検査では炙り出されない。
  'commandRefs.js'
]

const fail = function (message) {
  console.error('copy-db: ' + message)
  process.exit(1)
}

if (!fs.existsSync(outDir)) {
  fail(path.relative(root, outDir) + ' がありません(先に npm run build:db)')
}

/* 半端に古い状態を作らないよう、書く前に消す。 */
fs.rmSync(dbDir, { recursive: true, force: true })
fs.mkdirSync(dbDir, { recursive: true })

MODULES.forEach(function (name) {
  const from = path.join(outDir, name)
  const to = path.join(dbDir, name)
  if (!fs.existsSync(from)) fail(name + ' が ' + path.relative(root, outDir) + ' にありません(先に npm run build:db)')
  fs.copyFileSync(from, to)
  // 写せたことを中身で確かめる(権限や空き容量で黙って失敗することがある)。
  if (fs.readFileSync(from).compare(fs.readFileSync(to)) !== 0) fail('ルートの db/' + name + ' を更新できませんでした')
})

/* 写した集合が閉じていること。db/ の外へ出る require が1つでもあれば止める。
 *
 * これが無いと、将来 src/db/eventLinks.ts に import を1つ足した日に、リポジトリも
 * .vsix も緑のまま(どちらも out/ を丸ごと持つ)**npm の利用者だけ**が黙って t2f_usages を
 * 失う。リポジトリの中からは見えない壊れ方なので、ここで捕まえる。 */
MODULES.forEach(function (name) {
  const source = fs.readFileSync(path.join(dbDir, name), 'utf8')
  const outside = (source.match(/require\(["']\.\.\/[^"')]+["']\)/g) || [])
  if (outside.length) {
    fail('db/' + name + ' が db/ の外を読んでいます: ' + outside.join(', ') +
      '\n  写す集合に足すか、拡張側でその依存を db/ の中へ移してください。')
  }
  const siblings = (source.match(/require\(["']\.\/([^"')]+)["']\)/g) || []).map(function (hit) {
    return hit.replace(/^require\(["']\.\//, '').replace(/["']\)$/, '') + '.js'
  })
  siblings.forEach(function (needed) {
    if (MODULES.indexOf(needed) === -1) fail('db/' + name + ' が ' + needed + ' を読みますが写していません')
  })
})

console.log('copy-db: ' + MODULES.length + 'つをルートの db/ へ写しました')
