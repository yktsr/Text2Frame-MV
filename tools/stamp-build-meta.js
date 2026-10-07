const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const root = process.cwd()
const pkgPath = path.join(root, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const distDir = process.env.DIST_DIR || path.join(root, 'dist')

const version = (process.env.BUILD_VERSION || pkg.version || '0.0.0').trim()

// 利用者が js/plugins/ に置いた1枚から「どの版をいつ作ったものか」を辿れるようにする。
// プラグインはファイル単体で配るので、package.json のような外側のメタデータが無い。
const git = function (args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch (e) {
    return ''
  }
}
// CI は BUILD_ID に GITHUB_SHA(40桁)を入れてくる。読めるところまで詰める。
const shorten = function (id) { return /^[0-9a-f]{40}$/i.test(id) ? id.slice(0, 12) : id }
const commit = (function () {
  const given = (process.env.BUILD_ID || process.env.GITHUB_SHA || '').trim()
  if (given) return shorten(given)
  const head = git(['rev-parse', '--short=12', 'HEAD'])
  if (!head) return 'unknown'
  // 未コミットの変更を含むビルドは、その旨が分からないと後から再現できない。
  return git(['status', '--porcelain']) ? head + '+dirty' : head
})()
const builtAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

const sourceText2FramePath = path.join(root, 'Text2Frame.js')
const sourceFrame2TextPath = path.join(root, 'Frame2Text.js')
const distText2FramePath = path.join(distDir, 'Text2Frame.js')
const distFrame2TextPath = path.join(distDir, 'Frame2Text.js')

if (!fs.existsSync(distDir)) {
  console.error(`Missing dist directory: ${distDir}`)
  process.exit(1)
}

if (!fs.existsSync(sourceText2FramePath)) {
  console.error('Missing source file: Text2Frame.js')
  process.exit(1)
}

if (!fs.existsSync(sourceFrame2TextPath)) {
  console.error('Missing source file: Frame2Text.js')
  process.exit(1)
}

fs.copyFileSync(sourceText2FramePath, distText2FramePath)
fs.copyFileSync(sourceFrame2TextPath, distFrame2TextPath)

// 刻印するのは単体で配るプラグイン2枚だけ。cjs/es/umd は npm 経由でしか渡らず、
// 版と公開日時はレジストリと package.json が持っている。加えてこの3つはリポジトリに
// コミットする成果物なので、刻印の時刻が入ると毎ビルド差分が出て「古いかどうか」の
// 判定(pack-all.sh の git diff)が意味を失う。
const targets = [
  'Frame2Text.js',
  'Text2Frame.js'
]

let changedCount = 0

for (const rel of targets) {
  const filePath = path.join(distDir, rel)
  if (!fs.existsSync(filePath)) {
    console.error(`Missing build output: ${rel}`)
    process.exitCode = 1
    continue
  }

  const original = fs.readFileSync(filePath, 'utf8')
  let next = original

  const banner = `/* Text2Frame-MV | version: ${version} | built: ${builtAt} | commit: ${commit} */\n`
  // 旧形式(dist | version | build)も拾って置き換える。取りこぼすと刻印が積み重なる。
  const existingBannerPattern = /^\/\* Text2Frame-MV (?:dist )?\| version: .*? \*\/\r?\n/
  if (existingBannerPattern.test(next)) {
    next = next.replace(existingBannerPattern, banner)
  } else {
    next = banner + next
  }

  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf8')
    changedCount += 1
    console.log(`Stamped ${rel}: version=${version}, built=${builtAt}, commit=${commit}`)
  } else {
    console.warn(`No stamp target matched in ${rel}`)
  }
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode)
}

if (changedCount === 0) {
  console.warn('No output files were stamped.')
}
