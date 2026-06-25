// Copy the RAW compiler (Text2Frame.js) into the extension's lib/ so the packaged
// .vsix is self-contained (cannot reach ../Text2Frame.js once installed).
// The raw file is the Node entry (exports applyTextFile) and works under require();
// the browser-oriented Text2Frame.cjs.js does not resolve Node builtins.
const fs = require('fs')
const path = require('path')

const extDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(extDir, '..')
const source = path.join(repoRoot, 'Text2Frame.js')
const libDir = path.join(extDir, 'lib')
const dest = path.join(libDir, 'Text2Frame.js')

if (!fs.existsSync(source)) {
  console.error('[bundle-compiler] Not found: ' + source)
  process.exit(1)
}

if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true })
}
fs.copyFileSync(source, dest)
console.log('[bundle-compiler] copied ' + path.relative(repoRoot, source) + ' -> ' + path.relative(repoRoot, dest))
