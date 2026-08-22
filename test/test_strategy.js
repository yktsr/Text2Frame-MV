const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

const text2frame = require('../Text2Frame.js')
const resolveStrategy = text2frame.resolveStrategy
const applyTextFile = text2frame.applyTextFile

describe('resolveStrategy', function () {
  it('passes through merge/overwrite and defaults to merge', function () {
    expect(resolveStrategy('merge')).to.eql({ strategy: 'merge' })
    expect(resolveStrategy('overwrite')).to.eql({ strategy: 'overwrite' })
    expect(resolveStrategy(undefined)).to.eql({ strategy: 'merge' })
    expect(resolveStrategy(null)).to.eql({ strategy: 'merge' })
  })
  it('returns null for unknown (incl. removed legacy names)', function () {
    expect(resolveStrategy('bogus')).to.equal(null)
    expect(resolveStrategy('import')).to.equal(null)
    expect(resolveStrategy('diff')).to.equal(null)
    expect(resolveStrategy('overlay')).to.equal(null)
    expect(resolveStrategy('merge3')).to.equal(null)
    expect(resolveStrategy('sync')).to.equal(null)
  })

  /* add(末尾に追記)は一括反映の既定でもある(単発の取り込みと揃えるため)。
   * 冪等ではないので、繰り返し流す同期監視は START_DATA_SYNC 側で merge を既定にしてある。 */
  it('accepts add, which the batch import uses as its default', function () {
    expect(resolveStrategy('add')).to.eql({ strategy: 'add' })
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

  it('non-empty target + merge, no ancestor → TOFU (text applied whole, movement dropped, switch added)', function () {
    // 祖先が無いので現在のゲーム状態を祖先とみなし、完全表現のテキストをそのまま反映する(=overwrite相当)。
    setup(JSON.parse(JSON.stringify(withMovement)))
    applyTextFile({ textPath, kind: 'event', mapId: '1', eventId: '1', pageId: '1', mapPath, strategy: 'merge', baseRoot: tmp })
    const l = deployed()
    expect(l.some(function (c) { return c.code === 205 })).to.equal(false) // movement not in text → dropped
    expect(l.some(function (c) { return c.code === 121 })).to.equal(true) // switch from text applied
    expect(l.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })).to.eql(['Hello'])
  })

  it('overwrite fully replaces (drops movement, adds switch)', function () {
    setup(JSON.parse(JSON.stringify(withMovement)))
    applyTextFile({ textPath, kind: 'event', mapId: '1', eventId: '1', pageId: '1', mapPath, strategy: 'overwrite' })
    const l = deployed()
    expect(l.some(function (c) { return c.code === 205 })).to.equal(false) // movement dropped
    expect(l.some(function (c) { return c.code === 121 })).to.equal(true) // switch added
  })
})
