const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const CLI = path.join(ROOT, 'Text2Frame.js')

/* cwd を省いたときは呼び出し側(= 一時プロジェクトへ移動済み)をそのまま引き継ぐ。
 * 祖先(.t2f-base)は CLI の cwd の下に作られるので、既定をリポジトリ直下にはしない。 */
function runCli (args, cwd) {
  return cp.execFileSync('node', [CLI].concat(args), { cwd, encoding: 'utf8' })
}
function eventList (mapPath, id) {
  return JSON.parse(fs.readFileSync(mapPath, 'utf8')).events[id].pages[0].list
}
function texts (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}
function makeEvent (id, line) {
  return {
    id,
    name: 'EV' + id,
    pages: [{
      list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: [line] },
        { code: 121, indent: 0, parameters: [7, 7, 0, 0] }, // dev-added switch (structure)
        { code: 0, indent: 0, parameters: [] }
      ]
    }]
  }
}

describe('Phase E: front-matter-first batch (CLI)', function () {
  let tmp
  let dataDir
  let textDir
  let mapPath
  let cwd

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2ffm-'))
    // 祖先(.t2f-base)の置き場所は cwd 基準。リポジトリを汚さないよう移しておく。
    cwd = process.cwd()
    process.chdir(tmp)
    dataDir = path.join(tmp, 'data')
    textDir = path.join(tmp, 'text')
    fs.mkdirSync(dataDir)
    fs.mkdirSync(textDir)
    mapPath = path.join(dataDir, 'Map001.json')
    fs.writeFileSync(mapPath, JSON.stringify({
      events: [null, makeEvent(1, 'Hello-1'), makeEvent(2, 'Hello-2')]
    }))
  })
  afterEach(function () {
    process.chdir(cwd)
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  it('E-2: manifest-less batch scans text dir and deploys by front matter (TOFU: no base → text authoritative)', function () {
    fs.writeFileSync(path.join(textDir, 'ev.txt'),
      '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nBonjour\n')
    runCli(['--mode', 'batch', '--text-dir', 'text'], tmp)
    const list = eventList(mapPath, 1)
    expect(texts(list)).to.eql(['Bonjour'])
    expect(list.some(function (c) { return c.code === 121 })).to.equal(false) // TOFU: switch absent from text is dropped
  })

  it('E-2: manifest-less batch skips files without front matter', function () {
    fs.writeFileSync(path.join(textDir, 'nofm.txt'), 'PlainNoFrontMatter\n')
    let threw = false
    try {
      runCli(['--mode', 'batch', '--text-dir', 'text'], tmp)
    } catch (e) {
      threw = true // no front-matter files => error "No front-matter text files found"
    }
    expect(threw).to.equal(true)
    // Map untouched.
    expect(texts(eventList(mapPath, 1))).to.eql(['Hello-1'])
  })

  /* front matter の strategy: は読まない(反映のしかたは引数だけで決まる)。
   * 読んでいた頃は add が冪等でないので、流すたびに末尾へ積み上がっていた。 */
  it('ignores a strategy: in front matter', function () {
    fs.writeFileSync(path.join(textDir, 'ev.txt'),
      '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\nstrategy: add\n---\n\nBonjour\n')
    runCli(['--mode', 'batch', '--text-dir', 'text'], tmp)
    expect(texts(eventList(mapPath, 1))).to.eql(['Bonjour'])
    // 引数の既定は merge。祖先も揃ったので、もう一度流しても増えない。
    runCli(['--mode', 'batch', '--text-dir', 'text'], tmp)
    expect(texts(eventList(mapPath, 1))).to.eql(['Bonjour'])
  })

  it('takes overwrite from the CLI flag', function () {
    fs.writeFileSync(path.join(textDir, 'ev.txt'),
      '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nReplaced\n')
    runCli(['--mode', 'batch', '--text-dir', 'text', '--strategy', 'overwrite'], tmp)
    const list = eventList(mapPath, 1)
    expect(texts(list)).to.eql(['Replaced'])
    expect(list.some(function (c) { return c.code === 121 })).to.equal(false)
  })
})
