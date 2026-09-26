// Copy the RAW compiler (Text2Frame.js) into the extension's lib/ so the packaged
// .vsix is self-contained (cannot reach ../Text2Frame.js once installed).
// The raw file is the Node entry (exports applyTextFile) and works under require();
// the browser-oriented Text2Frame.cjs.js does not resolve Node builtins.
const fs = require('fs')
const path = require('path')

const extDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(extDir, '..')
const libDir = path.join(extDir, 'lib')

if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true })
}

// Text2Frame.js (deploy/import) and Frame2Text.js (export) are both required.
for (const name of ['Text2Frame.js', 'Frame2Text.js']) {
  const source = path.join(repoRoot, name)
  if (!fs.existsSync(source)) {
    console.error('[bundle-compiler] Not found: ' + source)
    process.exit(1)
  }
  fs.copyFileSync(source, path.join(libDir, name))
  console.log('[bundle-compiler] copied ' + name + ' -> ' + path.relative(repoRoot, path.join(libDir, name)))
}
