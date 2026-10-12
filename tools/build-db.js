/*
 * 拡張をコンパイルして、借りている「構造の層」を作る。
 *
 *   node tools/build-db.js
 *
 * なぜ要るか: ルートの db/(npm で配るぶん)の元は vscode-extension/out/db/ で、あれは
 * TypeScript の生成物。prepack は npm がファイル一覧を作る**前**にこれを済ませないと、
 * files に "db/" と書いてあっても実体が無く、npm は警告もせず tarball から落とす
 * (tools/copy-bundles.js を刺したのと同じ穴)。
 *
 * 直に `cd vscode-extension && npm run compile` でもよいが、素のクローンだと
 * `tsc: command not found` で止まって理由が分からない。ルートの npm ci は拡張の依存を
 * 入れない(ロックファイルが別)ので、そこを名指しする。
 */
const cp = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const extDir = path.join(root, 'vscode-extension')

const fail = function (message) {
  console.error('build-db: ' + message)
  process.exit(1)
}

if (!fs.existsSync(path.join(extDir, 'node_modules', 'typescript'))) {
  fail('拡張の依存が入っていません。先にこれを実行してください:\n' +
    '  cd vscode-extension && npm ci')
}

const run = cp.spawnSync('npm', ['run', 'compile'], { cwd: extDir, stdio: 'inherit' })
if (run.error) fail(run.error.message)
if (run.status !== 0) fail('拡張のコンパイルが失敗しました(終了コード ' + run.status + ')')

if (!fs.existsSync(path.join(extDir, 'out', 'db'))) {
  fail('コンパイルは通ったのに vscode-extension/out/db がありません')
}

console.log('build-db: 拡張をコンパイルしました')
