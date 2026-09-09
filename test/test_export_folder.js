const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const F2T = path.join(ROOT, 'Frame2Text.js')
const T2F = require('../Text2Frame.js')

function msgEvent (line) {
  return {
    id: 1,
    pages: [{
      list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: [line] },
        { code: 0, indent: 0, parameters: [] }
      ]
    }]
  }
}
function stripFrontMatter (text) {
  const n = String(text).replace(/\r\n/g, '\n')
  if (n.indexOf('---\n') !== 0) return n
  const e = n.indexOf('\n---\n', 4)
  return e < 0 ? n : n.slice(e + 5)
}
function texts (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}

describe('BATCH_EXPORT_MESSAGES_TO_FOLDER (CLI --mode batch)', function () {
  let tmp
  let cwd

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-export-'))
    // 祖先(.t2f-base)の置き場所は cwd 基準。リポジトリを汚さないよう移しておく。
    cwd = process.cwd()
    process.chdir(tmp)
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'),
      JSON.stringify({ events: [null, msgEvent('Hello from event')] }))
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'),
      JSON.stringify([null, {
        id: 1,
        list: [
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          { code: 401, indent: 0, parameters: ['Hello from common'] },
          { code: 0, indent: 0, parameters: [] }
        ]
      }]))
  })
  afterEach(function () {
    process.chdir(cwd)
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  it('writes one front-matter .txt per event/common directly under textBase', function () {
    cp.execFileSync('node', [F2T, '--mode', 'batch', '--data-dir', 'data', '--text-dir', 'text'],
      { cwd: tmp, encoding: 'utf8' })

    const evPath = path.join(tmp, 'text', 'map001_event001_page1.txt')
    const cePath = path.join(tmp, 'text', 'common001.txt')
    expect(fs.existsSync(evPath)).to.equal(true)
    expect(fs.existsSync(cePath)).to.equal(true)

    const evText = fs.readFileSync(evPath, 'utf8')
    // (a) starts with front matter carrying the routing fields
    expect(evText.indexOf('---\n')).to.equal(0)
    expect(evText).to.contain('kind: event')
    expect(evText).to.contain('mapId: 1')
    expect(evText).to.contain('eventId: 1')
    expect(evText).to.contain('pageId: 1')
    // 宛先は mapId/eventId/pageId で決まる。ファイル名と同じ key: は書き出さない。
    expect(evText).to.not.contain('key: ')
    // (b) body round-trips through compile
    expect(texts(T2F.compile(stripFrontMatter(evText)))).to.include('Hello from event')

    const ceText = fs.readFileSync(cePath, 'utf8')
    expect(ceText.indexOf('---\n')).to.equal(0)
    expect(ceText).to.contain('kind: common')
    expect(ceText).to.contain('commonEventId: 1')
    expect(ceText).to.not.contain('key: ')
    expect(texts(T2F.compile(stripFrontMatter(ceText)))).to.include('Hello from common')
  })

  it('saves a .t2f-base ancestor so a later merge applies added lines (no overlay drop)', function () {
    cp.execFileSync('node', [F2T, '--mode', 'batch', '--data-dir', 'data', '--text-dir', 'text'],
      { cwd: tmp, encoding: 'utf8' })
    // Export must establish the 3-way ancestor.
    const basePath = path.join(tmp, '.t2f-base', 'text', 'map001_event001_page1.txt')
    expect(fs.existsSync(basePath)).to.equal(true)

    // Add a brand-new message line in the text, then import with the default (merge) strategy.
    const evPath = path.join(tmp, 'text', 'map001_event001_page1.txt')
    fs.writeFileSync(evPath, fs.readFileSync(evPath, 'utf8').replace('Hello from event', 'Hello from event\n\nBrand new line'))
    cp.execFileSync('node', [path.join(ROOT, 'Text2Frame.js'), '--mode', 'batch', '--text-dir', 'text'],
      { cwd: tmp, encoding: 'utf8' })

    // 3-way (base==game, text added a line) applies the addition rather than dropping it via overlay.
    const map = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
    expect(texts(map.events[1].pages[0].list)).to.include('Brand new line')
  })

  it('Text2Frame exposes its base API on a global for in-engine Frame2Text access', function () {
    // In the game runtime (NW.js) Frame2Text cannot require('./Text2Frame.js'); it resolves the
    // shared API via globalThis.$LaurusText2Frame instead. Guard that contract here.
    require('../Text2Frame.js')
    expect(global.$LaurusText2Frame).to.be.an('object')
    expect(global.$LaurusText2Frame.saveBaseText).to.be.a('function')
    expect(global.$LaurusText2Frame.readBaseText).to.be.a('function')
    expect(global.$LaurusText2Frame.deriveBaseId).to.be.a('function')
  })

  it('-s merge keeps the translation in the text and brings in the game change', function () {
    // 1回目: 祖先を作る(既存テキストが無いので merge でも全取り出しと同じ結果)
    cp.execFileSync('node', [F2T, '--mode', 'batch', '--data-dir', 'data', '--text-dir', 'text'],
      { cwd: tmp, encoding: 'utf8' })
    const evPath = path.join(tmp, 'text', 'map001_event001_page1.txt')
    // 翻訳者がテキストを訳す
    fs.writeFileSync(evPath, fs.readFileSync(evPath, 'utf8').replace('Hello from event', 'Bonjour'))
    // 開発者がゲーム側に行を足す
    const map = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
    map.events[1].pages[0].list.splice(2, 0,
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Added in the editor'] })
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify(map))

    cp.execFileSync('node', [F2T, '--mode', 'batch', '--data-dir', 'data', '--text-dir', 'text', '-s', 'merge'],
      { cwd: tmp, encoding: 'utf8' })

    const merged = fs.readFileSync(evPath, 'utf8')
    expect(merged).to.contain('Bonjour')
    expect(merged).to.contain('Added in the editor')
    expect(merged).to.not.contain('Hello from event')
  })

  it('-s overwrite replaces the text wholesale', function () {
    cp.execFileSync('node', [F2T, '--mode', 'batch', '--data-dir', 'data', '--text-dir', 'text'],
      { cwd: tmp, encoding: 'utf8' })
    const evPath = path.join(tmp, 'text', 'map001_event001_page1.txt')
    fs.writeFileSync(evPath, fs.readFileSync(evPath, 'utf8').replace('Hello from event', 'Bonjour'))

    cp.execFileSync('node', [F2T, '--mode', 'batch', '--data-dir', 'data', '--text-dir', 'text', '-s', 'overwrite'],
      { cwd: tmp, encoding: 'utf8' })

    const out = fs.readFileSync(evPath, 'utf8')
    expect(out).to.contain('Hello from event')
    expect(out).to.not.contain('Bonjour')
  })

  it('round-trips: exported text re-imports via --mode batch', function () {
    cp.execFileSync('node', [F2T, '--mode', 'batch', '--data-dir', 'data', '--text-dir', 'text'],
      { cwd: tmp, encoding: 'utf8' })
    // Edit the exported event text, then deploy it back with overwrite.
    const evPath = path.join(tmp, 'text', 'map001_event001_page1.txt')
    fs.writeFileSync(evPath, fs.readFileSync(evPath, 'utf8').replace('Hello from event', 'Edited line'))
    cp.execFileSync('node', [path.join(ROOT, 'Text2Frame.js'), '--mode', 'batch', '--text-dir', 'text', '--strategy', 'overwrite'],
      { cwd: tmp, encoding: 'utf8' })

    const map = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
    expect(texts(map.events[1].pages[0].list)).to.include('Edited line')
  })
})
