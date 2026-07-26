const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

const sync = require('../t2f-sync.js')

function texts (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}

describe('t2f-sync controller', function () {
  let tmp
  let opts

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2fsync-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        pages: [{ list: [
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          { code: 401, indent: 0, parameters: ['Hello'] },
          { code: 121, indent: 0, parameters: [7, 7, 0, 0] }, // dev-added switch
          { code: 0, indent: 0, parameters: [] }
        ] }]
      }]
    }))
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([
      null,
      { id: 1, list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: ['CommonHello'] },
        { code: 0, indent: 0, parameters: [] }
      ] }
    ]))
    opts = { root: tmp, dataDir: 'data', textDir: 'text', locale: 'ja', strategy: 'merge' }
  })
  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  const evText = function () { return path.join(tmp, 'text', 'ja', 'map001_event001_page1.txt') }
  const mapList = function () {
    return JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).events[1].pages[0].list
  }

  it('pull writes front-matter text and the .t2f-base ancestor', function () {
    const res = sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    expect(res).to.have.lengthOf(1)
    expect(res[0].ok).to.equal(true)

    const text = fs.readFileSync(evText(), 'utf8')
    expect(text.indexOf('---\n')).to.equal(0)
    expect(text).to.contain('kind: event')
    expect(text).to.contain('mapId: 1')
    expect(text).to.contain('Hello')
    expect(fs.existsSync(path.join(tmp, '.t2f-base', 'ja', 'map001_event001_page1.txt'))).to.equal(true)
  })

  it('push applies the text to the game and keeps dev structure under merge', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'こんにちは'))

    const res = sync.pushFile(evText(), opts)
    expect(res.ok).to.equal(true)
    expect(texts(mapList())).to.eql(['こんにちは'])
    expect(mapList().some(function (c) { return c.code === 121 })).to.equal(true) // merge kept the switch
  })

  it('pull with merge keeps the translation and brings in the new game line', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'こんにちは'))
    sync.pushFile(evText(), opts)

    // dev adds a line in the editor
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list.push(
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['NewDevLine'] },
      { code: 0, indent: 0, parameters: [] }
    )
    fs.writeFileSync(mapPath, JSON.stringify(map))

    sync.pullDataFile(mapPath, opts)
    const after = fs.readFileSync(evText(), 'utf8')
    expect(after).to.contain('こんにちは')  // translation survived
    expect(after).to.contain('NewDevLine')  // game change pulled in
  })

  it('push with a conflict does not advance .t2f-base (kept-both left for the user)', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts) // base := Hello
    const basePath = path.join(tmp, '.t2f-base', 'ja', 'map001_event001_page1.txt')
    const baseBefore = fs.readFileSync(basePath, 'utf8')
    // Diverge both sides on the same line → genuine 3-way conflict.
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'Bonjour')) // theirs (text)
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list[1].parameters[0] = 'ゲーム変更' // ours (game)
    fs.writeFileSync(mapPath, JSON.stringify(map))

    const res = sync.pushFile(evText(), opts)
    expect(res.ok).to.equal(true)
    // Ancestor must be unchanged until the conflict is resolved.
    expect(fs.readFileSync(basePath, 'utf8')).to.equal(baseBefore)
  })

  it('pull with a conflict does not advance .t2f-base', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    sync.pullDataFile(mapPath, opts) // base := Hello
    const basePath = path.join(tmp, '.t2f-base', 'ja', 'map001_event001_page1.txt')
    const baseBefore = fs.readFileSync(basePath, 'utf8')
    // Diverge both sides on the same line → conflict on pull.
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'Bonjour')) // theirs (text)
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list[1].parameters[0] = 'ゲーム変更' // ours (game)
    fs.writeFileSync(mapPath, JSON.stringify(map))

    const res = sync.pullDataFile(mapPath, opts)
    expect(res[0].conflicts).to.be.greaterThan(0)
    expect(fs.readFileSync(basePath, 'utf8')).to.equal(baseBefore)
  })

  it('pull with overwrite replaces the text wholesale', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'こんにちは'))

    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), Object.assign({}, opts, { strategy: 'overwrite' }))
    const after = fs.readFileSync(evText(), 'utf8')
    expect(after).to.contain('Hello')
    expect(after).to.not.contain('こんにちは')
  })

  it('syncOnce both directions reports pulled and pushed entries', function () {
    const r = sync.syncOnce(Object.assign({}, opts, { direction: 'both' }))
    expect(r.pulled.length).to.equal(2)  // Map001 event + common001
    expect(r.pushed.length).to.equal(2)
    expect(r.pulled.concat(r.pushed).every(function (x) { return x.ok })).to.equal(true)
  })

  it('echo guard suppresses the controller\'s own write, then re-arms', function () {
    const guard = sync.createEchoGuard()
    const f = path.join(tmp, 'probe.txt')

    fs.writeFileSync(f, 'written-by-us')
    guard.record(f, 'written-by-us')
    expect(guard.isEcho(f)).to.equal(true)   // our own write -> ignored
    expect(guard.isEcho(f)).to.equal(false)  // consumed; no longer suppressed

    // a write by someone else must NOT be treated as an echo
    guard.record(f, 'written-by-us')
    fs.writeFileSync(f, 'changed-by-someone-else')
    expect(guard.isEcho(f)).to.equal(false)
  })

  it('push records the data file it caused, so the pull watcher ignores it', function () {
    const guard = sync.createEchoGuard()
    const o = Object.assign({}, opts, { guard })
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'Edited'))

    const res = sync.pushFile(evText(), o)
    expect(res.ok).to.equal(true)
    expect(guard.isEcho(res.dataPath)).to.equal(true) // the data write is recognised as ours
  })
})
