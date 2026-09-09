const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const CLI = path.join(ROOT, 'Text2Frame.js')

/* 祖先(.t2f-base)は CLI を動かした cwd の下に作られる。呼び出し側が一時プロジェクトへ
 * 移っているので cwd はそのまま引き継ぐ(リポジトリ直下に作らせない)。 */
function runCli (args) {
  return cp.execFileSync('node', [CLI].concat(args), { encoding: 'utf8' })
}
function listOf (mapPath) {
  return JSON.parse(fs.readFileSync(mapPath, 'utf8')).events[1].pages[0].list
}
function texts (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}
function hasSwitch (list) {
  return list.some(function (c) { return c.code === 121 })
}

describe('CLI merge strategies (--mode map)', function () {
  let tmp
  let mapPath
  let textPath
  let basePath
  let cwd

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2fcli-'))
    // 祖先(.t2f-base)の置き場所は cwd 基準。リポジトリを汚さないよう移しておく。
    cwd = process.cwd()
    process.chdir(tmp)
    mapPath = path.join(tmp, 'Map001.json')
    fs.writeFileSync(mapPath, JSON.stringify({
      events: [null, {
        id: 1,
        name: 'EV',
        pages: [{
          list: [
            { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
            { code: 401, indent: 0, parameters: ['Hello'] },
            { code: 121, indent: 0, parameters: [7, 7, 0, 0] }, // dev-added switch
            { code: 0, indent: 0, parameters: [] }
          ]
        }]
      }]
    }))
    textPath = path.join(tmp, 'ev.txt')
    fs.writeFileSync(textPath, '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nBonjour\n')
    basePath = path.join(tmp, 'base.txt')
    fs.writeFileSync(basePath, 'Hello\n') // ancestor: message only, no switch
  })

  afterEach(function () {
    process.chdir(cwd)
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  it('merge without a base → TOFU: text is authoritative, dev switch dropped', function () {
    // 祖先が無い初回反映は現在のゲーム状態を祖先とみなし、完全表現のテキストをそのまま反映する。
    // テキストに無いスイッチ(121)は削除される(overlay 廃止・TOFU 一本化)。
    runCli(['--mode', 'map', '--strategy', 'merge', '--text_path', textPath, '--output_path', mapPath, '--event_id', '1', '--page_id', '1'])
    const list = listOf(mapPath)
    expect(hasSwitch(list)).to.equal(false)
    expect(texts(list)).to.eql(['Bonjour'])
  })

  it('merge with --base merges writer text and dev switch cleanly (3-way)', function () {
    runCli(['--mode', 'map', '--strategy', 'merge', '--base', basePath, '--text_path', textPath, '--output_path', mapPath, '--event_id', '1', '--page_id', '1'])
    const list = listOf(mapPath)
    expect(hasSwitch(list)).to.equal(true)
    expect(texts(list)).to.eql(['Bonjour'])
  })
})
