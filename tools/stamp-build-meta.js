const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const pkgPath = path.join(root, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const distDir = process.env.DIST_DIR || path.join(root, 'dist')

const version = (process.env.BUILD_VERSION || pkg.version || '0.0.0').trim()
const buildId = (process.env.BUILD_ID || process.env.GITHUB_SHA || 'local').trim()

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

const targets = [
  'Frame2Text.js',
  'Text2Frame.js',
  'Text2Frame.cjs.js',
  'Text2Frame.es.mjs',
  'Text2Frame.umd.js'
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

  const banner = `/* Text2Frame-MV dist | version: ${version} | build: ${buildId} */\n`
  const existingBannerPattern = /^\/\* Text2Frame-MV dist \| version: .*? \| build: .*? \*\/\r?\n/
  if (existingBannerPattern.test(next)) {
    next = next.replace(existingBannerPattern, banner)
  } else {
    next = banner + next
  }

  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf8')
    changedCount += 1
    console.log(`Stamped ${rel}: version=${version}, build=${buildId}`)
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
