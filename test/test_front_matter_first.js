const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const CLI = path.join(ROOT, 'Text2Frame.js')

function runCli (args, cwd) {
  return cp.execFileSync('node', [CLI].concat(args), { cwd: cwd || ROOT, encoding: 'utf8' })
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
    pages: [{ list: [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [line] },
      { code: 121, indent: 0, parameters: [7, 7, 0, 0] }, // dev-added switch (structure)
      { code: 0, indent: 0, parameters: [] }
    ] }]
  }
}

describe('Phase E: front-matter-first batch (CLI)', function () {
  let tmp
  let dataDir
  let textDir
  let mapPath

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2ffm-'))
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
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  it('E-2: manifest-less batch scans text dir and deploys by front matter (merge default keeps switch)', function () {
    fs.writeFileSync(path.join(textDir, 'ev.txt'),
      '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nBonjour\n')
    runCli(['--mode', 'batch', '--text_path', 'text'], tmp)
    const list = eventList(mapPath, 1)
    expect(texts(list)).to.eql(['Bonjour'])
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true) // merge kept structure
  })

  it('E-2: manifest-less batch skips files without front matter', function () {
    fs.writeFileSync(path.join(textDir, 'nofm.txt'), 'PlainNoFrontMatter\n')
    let threw = false
    try {
      runCli(['--mode', 'batch', '--text_path', 'text'], tmp)
    } catch (e) {
      threw = true // no front-matter files => error "No front-matter text files found"
    }
    expect(threw).to.equal(true)
    // Map untouched.
    expect(texts(eventList(mapPath, 1))).to.eql(['Hello-1'])
  })

  it('E-1: front matter wins over a conflicting manifest entry (deploys to FM eventId)', function () {
    fs.writeFileSync(path.join(textDir, 'ev.txt'),
      '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nFMWIN\n')
    // Manifest says eventId 2, but front matter says 1 -> front matter must win.
    fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({
      version: 1,
      entries: [{ kind: 'event', mapId: '1', eventId: '2', pageId: '1', textPath: 'text/ev.txt' }]
    }))
    runCli(['--mode', 'batch', '--manifest', 'manifest.json', '--strategy', 'overwrite'], tmp)
    expect(texts(eventList(mapPath, 1))).to.eql(['FMWIN']) // event 1 (front matter)
    expect(texts(eventList(mapPath, 2))).to.eql(['Hello-2']) // event 2 untouched
  })

  it('E-3: manifest run backfills front matter into files lacking it, leaves existing FM untouched', function () {
    const noFmPath = path.join(textDir, 'nofm.txt')
    const withFmPath = path.join(textDir, 'withfm.txt')
    fs.writeFileSync(noFmPath, 'NoFM\n')
    const withFmContent = '---\nkind: event\nmapId: 1\neventId: 2\npageId: 1\n---\n\nWithFM\n'
    fs.writeFileSync(withFmPath, withFmContent)
    fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({
      version: 1,
      entries: [
        { kind: 'event', mapId: '1', eventId: '1', pageId: '1', textPath: 'text/nofm.txt' },
        { kind: 'event', mapId: '1', eventId: '2', pageId: '1', textPath: 'text/withfm.txt' }
      ]
    }))
    runCli(['--mode', 'batch', '--manifest', 'manifest.json'], tmp)

    // nofm.txt now has front matter prepended, body preserved.
    const nofmAfter = fs.readFileSync(noFmPath, 'utf8')
    expect(nofmAfter.indexOf('---\n')).to.equal(0)
    expect(nofmAfter).to.contain('eventId: 1')
    expect(nofmAfter).to.contain('kind: event')
    expect(nofmAfter).to.contain('NoFM')

    // withfm.txt is byte-for-byte unchanged (existing front matter respected).
    expect(fs.readFileSync(withFmPath, 'utf8')).to.equal(withFmContent)
  })

  it('E-4: front matter strategy overrides the batch default (overwrite drops dev switch)', function () {
    // Batch default is merge (keeps switch); this file requests overwrite in front matter.
    fs.writeFileSync(path.join(textDir, 'ev.txt'),
      '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\nstrategy: overwrite\n---\n\nReplaced\n')
    runCli(['--mode', 'batch', '--text_path', 'text'], tmp)
    const list = eventList(mapPath, 1)
    expect(texts(list)).to.eql(['Replaced'])
    expect(list.some(function (c) { return c.code === 121 })).to.equal(false) // overwrite removed the switch
  })
})
