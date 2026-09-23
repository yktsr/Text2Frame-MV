const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')

const frame2text = require('../Frame2Text.js')
require('../Text2Frame.js')
const sync = require('../t2f-sync.js')

/* 取り出しの書き先は「front matter が指す行き先」で決まる。
 * 利用者がファイル名を変えても、その場所に書き続ける(同じ行き先のファイルが増えない)。 */
describe('text index (front matter -> file)', function () {
  let tmp
  let dataDir
  let textDir
  let cwd

  const bottom = { code: 0, indent: 0, parameters: [] }
  const msg = function (text) {
    return [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [text] }
    ]
  }
  const files = function (dir) {
    const out = []
    const walk = function (cur, rel) {
      fs.readdirSync(cur).forEach(function (name) {
        const full = path.join(cur, name)
        if (fs.statSync(full).isDirectory()) walk(full, rel ? rel + '/' + name : name)
        else out.push(rel ? rel + '/' + name : name)
      })
    }
    walk(dir, '')
    return out.sort()
  }
  const pullAll = function () {
    const index = frame2text.indexTexts(textDir)
    return frame2text.enumerateTargets(dataDir).map(function (t) {
      if (index.duplicates[t.key]) return { skipped: t.key }
      return frame2text.pullTargetToText({
        dataDir,
        target: t,
        outPath: frame2text.outPathFor(textDir, index, t),
        baseDir: frame2text.baseDirForTextDir(tmp, textDir),
        englishTag: true,
        strategy: 'merge'
      })
    })
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-index-'))
    cwd = process.cwd()
    process.chdir(tmp)
    dataDir = path.join(tmp, 'data')
    textDir = path.join(tmp, 'text')
    fs.mkdirSync(dataDir)
    fs.mkdirSync(textDir)
    fs.writeFileSync(path.join(dataDir, 'Map001.json'), JSON.stringify({
      events: [null, { id: 1, name: 'EV001', pages: [{ list: msg('ゲームの版').concat([bottom]) }] }]
    }))
    fs.writeFileSync(path.join(dataDir, 'CommonEvents.json'), JSON.stringify([null]))
    pullAll()
  })

  afterEach(function () {
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('finds the text by its front matter, whatever it is called', function () {
    fs.renameSync(path.join(textDir, 'map001_event001_page1.txt'), path.join(textDir, 'オープニング.txt'))

    const index = frame2text.indexTexts(textDir)

    expect(index.paths.map001_event001_page1).to.equal(path.join(textDir, 'オープニング.txt'))
    expect(index.duplicates).to.eql({})
  })

  it('leaves the conversation-only and translation files out of the index', function () {
    fs.writeFileSync(path.join(textDir, 'map001_event001_page1.conversation.txt'),
      fs.readFileSync(path.join(textDir, 'map001_event001_page1.txt'), 'utf8'))

    const index = frame2text.indexTexts(textDir)

    expect(index.paths.map001_event001_page1).to.equal(path.join(textDir, 'map001_event001_page1.txt'))
    expect(index.duplicates).to.eql({})
  })

  it('writes into the renamed text instead of making a second file', function () {
    const renamed = path.join(textDir, '第1章', 'オープニング.txt')
    fs.mkdirSync(path.dirname(renamed))
    fs.renameSync(path.join(textDir, 'map001_event001_page1.txt'), renamed)
    // ゲーム側を変えてから取り出す
    const mapPath = path.join(dataDir, 'Map001.json')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list = msg('ツクールで直した').concat([bottom])
    fs.writeFileSync(mapPath, JSON.stringify(map))

    pullAll()

    expect(files(textDir)).to.eql(['第1章/オープニング.txt'])
    expect(fs.readFileSync(renamed, 'utf8')).to.contain('ツクールで直した')
  })

  it('skips a target that two texts point at', function () {
    const copy = path.join(textDir, 'コピー.txt')
    fs.copyFileSync(path.join(textDir, 'map001_event001_page1.txt'), copy)

    const index = frame2text.indexTexts(textDir)

    expect(index.duplicates.map001_event001_page1).to.have.length(2)
    expect(pullAll()[0]).to.eql({ skipped: 'map001_event001_page1' })
  })

  it('t2f-sync pulls into the renamed text too', function () {
    const renamed = path.join(textDir, 'オープニング.txt')
    fs.renameSync(path.join(textDir, 'map001_event001_page1.txt'), renamed)
    const mapPath = path.join(dataDir, 'Map001.json')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list = msg('同期で直した').concat([bottom])
    fs.writeFileSync(mapPath, JSON.stringify(map))

    const results = sync.pullDataFile(mapPath, { root: tmp, dataDir: 'data', textDir: 'text', strategy: 'merge' })

    expect(results[0].ok, results[0].error).to.equal(true)
    expect(files(textDir)).to.eql(['オープニング.txt'])
    expect(fs.readFileSync(renamed, 'utf8')).to.contain('同期で直した')
  })
})
