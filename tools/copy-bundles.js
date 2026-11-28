/*
 * 公開されるバンドルを dist/ からルートへ写す。
 *
 *   node tools/copy-bundles.js
 *
 * なぜ要るか: rollup の出力先は dist/ だが、公開されるのは package.json の files に
 * 並んだ「ルートの」3つ。この3つはコミットしていない生成物なので、写す手順が無いと
 * files に並んでいるのに実体が無く、npm は警告もせず tarball から落とす。
 *
 * prepack(npm pack / npm publish の両方で走る)と tools/pack-all.sh の両方がここを呼ぶ。
 * 「ルートに置く」という約束を知っているのはこのファイルだけにしておく。
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const distDir = process.env.DIST_DIR || path.join(root, 'dist')
const BUNDLES = ['Text2Frame.es.mjs', 'Text2Frame.cjs.js', 'Text2Frame.umd.js']

const fail = function (message) {
  console.error('copy-bundles: ' + message)
  process.exit(1)
}

BUNDLES.forEach(function (name) {
  const from = path.join(distDir, name)
  const to = path.join(root, name)
  if (!fs.existsSync(from)) fail(name + ' が ' + path.relative(root, distDir) + ' にありません(先に npm run build:dist)')
  fs.copyFileSync(from, to)
  // 写せたことを中身で確かめる(権限や空き容量で黙って失敗することがある)。
  if (fs.readFileSync(from).compare(fs.readFileSync(to)) !== 0) fail('ルートの ' + name + ' を更新できませんでした')
})

console.log('copy-bundles: ' + BUNDLES.length + ' つをルートへ写しました')
