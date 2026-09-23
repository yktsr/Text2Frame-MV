#!/usr/bin/env node
/* テストを走らせる。
 *
 * mocha を1ファイルずつ、別のプロセスで動かす。各スイートはプラグイン本体を読み込む前に
 * 偽の PluginManager や Game_Interpreter を置くので(読み込み時にパラメータを読む作りのため)、
 * 1つのプロセスに詰めると最初の1本の設定しか効かない。プロセスを分けるのはそのため。
 *
 * 手で並べた鎖(&& でつないだ29本)と違うところ:
 *   - test/test_*.js を自分で見つける(足したスイートが走らないことが無い)
 *   - 1本落ちても最後まで走らせ、落ちたものだけまとめて出す
 *   - 空いているコアを使って同時に走らせる
 *
 * 使い方: node tools/run-tests.js [--jobs N] [--serial] [ファイル...]
 */
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TEST_DIR = path.join(ROOT, 'test')
const MOCHA = path.join(ROOT, 'node_modules', 'mocha', 'bin', 'mocha.js')

const argv = process.argv.slice(2)
let jobs = Math.max(1, Math.min(8, os.cpus().length - 1))
const files = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--serial') jobs = 1
  else if (a === '--jobs') jobs = Math.max(1, Number(argv[++i]) || 1)
  else if (a.startsWith('--jobs=')) jobs = Math.max(1, Number(a.slice(7)) || 1)
  else files.push(path.resolve(ROOT, a))
}

/* 検体の目録(describe を持たないファイル)はスイートではないので外す。 */
const discover = function () {
  return fs.readdirSync(TEST_DIR)
    .filter(function (n) { return /^test_.*\.js$/.test(n) })
    .map(function (n) { return path.join(TEST_DIR, n) })
    .filter(function (p) { return fs.readFileSync(p, 'utf8').indexOf('describe(') !== -1 })
    .sort()
}

const suites = files.length ? files : discover()
if (!suites.length) {
  console.error('走らせるスイートがありません。')
  process.exit(1)
}

const countOf = function (out, word) {
  const m = out.match(new RegExp('(\\d+) ' + word))
  return m ? Number(m[1]) : 0
}

const started = Date.now()
const results = []
let next = 0
let running = 0

const runOne = function (file, done) {
  const child = cp.spawn(process.execPath, [MOCHA, file], { cwd: ROOT, encoding: 'utf8' })
  let out = ''
  child.stdout.on('data', function (d) { out += d })
  child.stderr.on('data', function (d) { out += d })
  child.on('close', function (code) {
    const passing = countOf(out, 'passing')
    const failing = countOf(out, 'failing')
    const pending = countOf(out, 'pending')
    const name = path.relative(ROOT, file)
    const ok = code === 0 && failing === 0
    results.push({ name, ok, passing, failing, pending, out })
    console.log((ok ? '  ok  ' : '  NG  ') + name +
      '  (' + passing + (pending ? ' passing, ' + pending + ' pending' : ' passing') +
      (failing ? ', ' + failing + ' failing' : '') + ')')
    done()
  })
}

const pump = function () {
  while (running < jobs && next < suites.length) {
    running++
    runOne(suites[next++], function () {
      running--
      if (next < suites.length) pump()
      else if (running === 0) finish()
    })
  }
}

const finish = function () {
  const bad = results.filter(function (r) { return !r.ok })
  const total = function (key) { return results.reduce(function (s, r) { return s + r[key] }, 0) }
  bad.forEach(function (r) {
    console.log('\n' + '='.repeat(70) + '\n' + r.name + '\n' + '='.repeat(70))
    console.log(r.out.trimEnd())
  })
  const secs = ((Date.now() - started) / 1000).toFixed(1)
  console.log('\n' + results.length + ' suites, ' + total('passing') + ' passing' +
    (total('pending') ? ', ' + total('pending') + ' pending' : '') +
    (total('failing') ? ', ' + total('failing') + ' failing' : '') +
    (bad.length ? '  [' + bad.length + ' suite(s) NG]' : '') +
    '  (' + secs + 's, ' + jobs + ' 並列)')
  process.exit(bad.length ? 1 : 0)
}

console.log(suites.length + ' suites, ' + jobs + ' 並列\n')
pump()
