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

/* 祖先(.t2f-base)の置き場所は --root で決まる。指定しなければ cwd なので、
 * プロジェクト直下で流す通常の使い方は今までどおり。プロジェクトの外から
 * 絶対パスで流すときに、祖先だけが cwd に取り残されるのを防ぐためのもの。 */
describe('CLI --root (where .t2f-base lives)', function () {
  let proj
  let elsewhere
  let mapPath
  let textPath
  let cwd

  // 開発側だけが持つスイッチ(121)。テキストには書かれていない。
  const devSwitch = { code: 121, indent: 0, parameters: [7, 7, 0, 0] }
  const mapWith = function (line, extra) {
    return JSON.stringify({
      events: [null, {
        id: 1,
        name: 'EV',
        pages: [{
          list: [
            { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
            { code: 401, indent: 0, parameters: [line] }
          ].concat(extra || []).concat([{ code: 0, indent: 0, parameters: [] }])
        }]
      }]
    })
  }
  const textWith = function (line) {
    return '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\n' + line + '\n'
  }
  const baseDirs = function (dir) {
    try { return fs.readdirSync(path.join(dir, '.t2f-base')) } catch (e) { return null }
  }
  const runFromElsewhere = function (args) {
    return cp.execFileSync('node', [CLI].concat(args), { cwd: elsewhere, encoding: 'utf8' })
  }
  const deploy = function (extraArgs) {
    return runFromElsewhere(['--mode', 'map', '--strategy', 'merge',
      '--text_path', textPath, '--output_path', mapPath,
      '--event_id', '1', '--page_id', '1'].concat(extraArgs || []))
  }

  beforeEach(function () {
    // プロジェクトと、CLI を叩く場所を別々に用意する。
    proj = fs.mkdtempSync(path.join(os.tmpdir(), 't2froot-proj-'))
    elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 't2froot-cwd-'))
    fs.mkdirSync(path.join(proj, 'data'))
    mapPath = path.join(proj, 'data', 'Map001.json')
    textPath = path.join(proj, 'ev.txt')
    fs.writeFileSync(mapPath, mapWith('Hello'))
    fs.writeFileSync(textPath, textWith('Hello'))
    // 一時プロジェクトの外(リポジトリ)に祖先を作らせない。
    cwd = process.cwd()
    process.chdir(elsewhere)
  })

  afterEach(function () {
    process.chdir(cwd)
    for (const d of [proj, elsewhere]) {
      try { fs.rmSync(d, { recursive: true, force: true }) } catch (e) { /* ignore */ }
    }
  })

  it('puts the ancestor under --root, not under the current directory', function () {
    deploy(['--root', proj])

    expect(baseDirs(proj)).to.not.equal(null)
    expect(baseDirs(elsewhere)).to.equal(null)
  })

  it('leaves the ancestor in the current directory when --root is omitted', function () {
    deploy()

    expect(baseDirs(elsewhere)).to.not.equal(null)
    expect(baseDirs(proj)).to.equal(null)
  })

  /* --root を渡さないと、2回目の反映で祖先が見つからず TOFU(テキストが正)に落ち、
   * テキストに書いていない開発側のスイッチがエラーなしで消える。 */
  it('makes the second deploy a real 3-way, keeping the dev switch', function () {
    deploy(['--root', proj])
    // ツクール側でスイッチを足し、テキスト側は文言を直した。
    fs.writeFileSync(mapPath, mapWith('Hello', [devSwitch]))
    fs.writeFileSync(textPath, textWith('Bonjour'))

    deploy(['--root', proj])

    const list = listOf(mapPath)
    expect(hasSwitch(list)).to.equal(true)
    expect(texts(list)).to.eql(['Bonjour'])
  })

  it('drops the dev switch without --root, because the ancestor was left behind', function () {
    deploy()
    fs.writeFileSync(mapPath, mapWith('Hello', [devSwitch]))
    fs.writeFileSync(textPath, textWith('Bonjour'))
    // 祖先は最初の cwd にあるが、2回目は別の場所から流す。
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 't2froot-cwd2-'))
    cp.execFileSync('node', [CLI, '--mode', 'map', '--strategy', 'merge',
      '--text_path', textPath, '--output_path', mapPath,
      '--event_id', '1', '--page_id', '1'], { cwd: other, encoding: 'utf8' })

    expect(hasSwitch(listOf(mapPath))).to.equal(false)
    fs.rmSync(other, { recursive: true, force: true })
  })

  /* 根の外を指したまま流すと、祖先だけが根の側に取り残される。黙って起きると
   * 次の反映で開発側の変更が消えるので、入口で理由を出す。 */
  it('warns when the text and the data sit outside the root', function () {
    const r = cp.spawnSync('node', [CLI, '--mode', 'map', '--strategy', 'merge',
      '--text_path', textPath, '--output_path', mapPath,
      '--event_id', '1', '--page_id', '1', '--root', elsewhere],
    { cwd: elsewhere, encoding: 'utf8' })

    expect(r.status).to.equal(0) // 警告だけで、反映は止めない
    expect(r.stderr).to.contain('--root の外にあります')
    expect(r.stderr).to.contain('text: ' + textPath)
    expect(r.stderr).to.contain('data: ' + mapPath)
  })

  it('says nothing when everything is inside the root', function () {
    const r = cp.spawnSync('node', [CLI, '--mode', 'map', '--strategy', 'merge',
      '--text_path', textPath, '--output_path', mapPath,
      '--event_id', '1', '--page_id', '1', '--root', proj],
    { cwd: elsewhere, encoding: 'utf8' })

    expect(r.status).to.equal(0)
    expect(r.stderr).to.not.contain('--root の外にあります')
  })
})
