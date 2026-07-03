const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

const text2frame = require('../Text2Frame.js')
const resolveStrategy = text2frame.resolveStrategy
const applyTextFile = text2frame.applyTextFile

describe('resolveStrategy (alias normalization)', function () {
  it('maps legacy names to merge/overwrite', function () {
    expect(resolveStrategy('import')).to.eql({ strategy: 'overwrite', sync: false })
    expect(resolveStrategy('diff')).to.eql({ strategy: 'overwrite', sync: false })
    expect(resolveStrategy('overlay')).to.eql({ strategy: 'merge', sync: false })
    expect(resolveStrategy('merge3')).to.eql({ strategy: 'merge', sync: false })
    expect(resolveStrategy('sync')).to.eql({ strategy: 'merge', sync: true })
  })
  it('passes through merge/overwrite and defaults to merge', function () {
    expect(resolveStrategy('merge')).to.eql({ strategy: 'merge', sync: false })
    expect(resolveStrategy('overwrite')).to.eql({ strategy: 'overwrite', sync: false })
    expect(resolveStrategy(undefined)).to.eql({ strategy: 'merge', sync: false })
    expect(resolveStrategy(null)).to.eql({ strategy: 'merge', sync: false })
  })
  it('returns null for unknown', function () {
    expect(resolveStrategy('bogus')).to.equal(null)
  })
})

describe('merge strategy auto behavior (via applyTextFile)', function () {
  let tmp
  let mapPath
  let textPath

  function setup (existingList) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2fstrat-'))
    const dataDir = path.join(tmp, 'data')
    fs.mkdirSync(dataDir)
    mapPath = path.join(dataDir, 'Map001.json')
    fs.writeFileSync(mapPath, JSON.stringify({ events: [null, { id: 1, pages: [{ list: existingList }] }] }))
    textPath = path.join(tmp, 'ev.txt')
    fs.writeFileSync(textPath, ['---', 'kind: event', 'mapId: 1', 'eventId: 1', 'pageId: 1', '---', '', '<Switch: 3, ON>', 'Hello', ''].join('\n'))
  }
  function deployed () {
    return JSON.parse(fs.readFileSync(mapPath, 'utf8')).events[1].pages[0].list
  }
  const withMovement = [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: ['元の台詞'] },
    { code: 205, indent: 0, parameters: [-1, { list: [{ code: 0 }], repeat: false, skippable: false, wait: false }] },
    { code: 0, indent: 0, parameters: [] }
  ]
  afterEach(function () { try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) {} })

  it('empty target + default(merge) → overwrite (text applied whole, incl. switch)', function () {
    setup([{ code: 0, indent: 0, parameters: [] }])
    const res = applyTextFile({ textPath, kind: 'event', mapId: '1', eventId: '1', pageId: '1', mapPath })
    expect(res.ok).to.equal(true)
    const l = deployed()
    expect(l.some(function (c) { return c.code === 121 })).to.equal(true) // switch present
    expect(l.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })).to.eql(['Hello'])
  })

  it('non-empty target + merge → overlay (keeps movement, updates dialogue, no new switch)', function () {
    setup(JSON.parse(JSON.stringify(withMovement)))
    applyTextFile({ textPath, kind: 'event', mapId: '1', eventId: '1', pageId: '1', mapPath, strategy: 'merge' })
    const l = deployed()
    expect(l.some(function (c) { return c.code === 205 })).to.equal(true) // movement preserved
    expect(l.some(function (c) { return c.code === 121 })).to.equal(false) // overlay does not add non-conversation
    expect(l.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })).to.eql(['Hello'])
  })

  it('overwrite (and legacy diff alias) fully replaces (drops movement, adds switch)', function () {
    setup(JSON.parse(JSON.stringify(withMovement)))
    applyTextFile({ textPath, kind: 'event', mapId: '1', eventId: '1', pageId: '1', mapPath, strategy: 'diff' })
    const l = deployed()
    expect(l.some(function (c) { return c.code === 205 })).to.equal(false) // movement dropped
    expect(l.some(function (c) { return c.code === 121 })).to.equal(true) // switch added
  })
})
