const { expect } = require('chai')
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { bottom, msg } = require('./helpers')

const ROOT = path.resolve(__dirname, '..')
const F2T = path.join(ROOT, 'Frame2Text.js')

/* CLI の一括取り出しが出す報告(標準出力の JSON)。
 * 画面向けの報告(プラグイン側)は test_batch_export_report.js が見ている。こちらは
 * 「機械が読む側」で、形が変わると使う人の道具が黙って壊れるため、鍵と欄を固定する。 */
describe('batch pull report (CLI --mode batch)', function () {
  let tmp

  const run = function (args) {
    const r = cp.spawnSync(process.execPath, [F2T, '--mode', 'batch', '--root', tmp].concat(args || []),
      { encoding: 'utf8' })
    let json = null
    try { json = JSON.parse(r.stdout) } catch (e) { json = null }
    return { status: r.status, json, stdout: r.stdout, stderr: r.stderr }
  }
  const textFiles = function () {
    try { return fs.readdirSync(path.join(tmp, 'text')).sort() } catch (e) { return [] }
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-clirep-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [
        null,
        { id: 1, name: 'EV001', pages: [{ list: msg('こんにちは').concat([bottom]) }] },
        { id: 2, name: '宝箱', pages: [{ list: msg('たからばこ').concat([bottom]) }] }
      ]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'),
      JSON.stringify([null, { id: 1, name: '回復', list: msg('かいふく').concat([bottom]) }]), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'MapInfos.json'),
      JSON.stringify([null, { id: 1, name: 'はじまりの村' }]), 'utf8')
  })

  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  it('reports the counts and the strategy', function () {
    const r = run(['--scope', 'all'])

    expect(r.status, r.stderr).to.equal(0)
    expect(Object.keys(r.json)).to.eql(['total', 'failed', 'conflicts', 'skipped', 'carried', 'approximate', 'strategy', 'results'])
    expect(r.json.total).to.equal(3)
    expect(r.json.failed).to.equal(0)
    expect(r.json.strategy).to.equal('merge')
    expect(r.json.results).to.have.lengthOf(3)
  })

  /* 成功1件の欄。ここに本文(text)まで入れると、数千件のプロジェクトでは標準出力が
   * 本文で埋まり、報告が読めなくなる(取り出した中身はファイルにある)。 */
  it('says where each text went, and never puts the text itself in the report', function () {
    const r = run(['--scope', 'all'])

    const ok = r.json.results[0]
    expect(Object.keys(ok)).to.eql(['ok', 'textPath', 'conflicts', 'markers', 'approximate', 'wroteGame'])
    expect(ok.textPath).to.contain('text')
    expect(r.json.results.some(function (x) { return 'text' in x })).to.equal(false)
    expect(r.stdout).to.not.contain('こんにちは')
  })

  it('names the file that failed, and comes back with an error code', function () {
    run(['--scope', 'all'])
    const [first] = textFiles()
    const failing = path.join(tmp, 'text', first)
    fs.rmSync(failing)
    // 同じ名前のフォルダを置くと、テキストとして書けない。
    fs.mkdirSync(failing)

    const r = run(['--scope', 'all'])

    expect(r.status).to.equal(1)
    expect(r.json.failed).to.equal(1)
    const failed = r.json.results.filter(function (x) { return !x.ok })
    expect(Object.keys(failed[0])).to.eql(['ok', 'key', 'error'])
    expect(failed[0].key).to.be.a('string')
    expect(failed[0].error).to.be.a('string')
  })

  /* 同じ行き先を指すテキストが2つあると、どちらに書くか決められない。見送って名前を出す。 */
  it('skips a target that two texts point at, and says which', function () {
    run(['--scope', 'all'])
    const [first] = textFiles()
    fs.copyFileSync(path.join(tmp, 'text', first), path.join(tmp, 'text', 'copy-' + first))

    const r = run(['--scope', 'all'])

    expect(r.status, r.stderr).to.equal(0)
    expect(r.json.total).to.equal(2)
    expect(r.stderr).to.contain('target(s) skipped')
  })
})
