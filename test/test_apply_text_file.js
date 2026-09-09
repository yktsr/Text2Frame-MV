const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')

// Do NOT define PluginManager: let Text2Frame.js self-initialize (non-plugin branch),
// matching test/test_json_eq.js. That sets CommentOutChar and stubs $gameMessage.
const text2frame = require('../Text2Frame.js')

describe('applyTextFile (deploy core) Test', function () {
  let tmp
  let dataDir
  let mapPath
  let cePath
  let body
  let cwd

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-test-'))
    // 祖先(.t2f-base)の置き場所は cwd 基準。リポジトリを汚さないよう移しておく。
    cwd = process.cwd()
    process.chdir(tmp)
    dataDir = path.join(tmp, 'data')
    fs.mkdirSync(dataDir)

    mapPath = path.join(dataDir, 'Map001.json')
    fs.writeFileSync(mapPath, JSON.stringify({
      events: [
        null,
        { id: 1, name: 'EV001', pages: [{ list: [{ code: 0, indent: 0, parameters: [] }] }] }
      ]
    }, null, '  '))

    cePath = path.join(dataDir, 'CommonEvents.json')
    fs.writeFileSync(cePath, JSON.stringify([
      null,
      { id: 1, list: [{ code: 0, indent: 0, parameters: [] }] }
    ], null, '  '))

    // Canonical, known-to-compile input.
    body = fs.readFileSync(path.join(__dirname, 'basic.txt'), 'utf8')
  })

  afterEach(function () {
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  const writeTextWithMeta = function (name, metaLines) {
    const p = path.join(tmp, name)
    fs.writeFileSync(p, metaLines.concat(['', body]).join('\n'))
    return p
  }

  it('exports applyTextFile', function () {
    expect(text2frame.applyTextFile).to.be.a('function')
  })

  it('overwrite strategy: writes the event page list and returns ok + target', function () {
    const textPath = writeTextWithMeta('map001_event001_page1.txt', ['---', 'kind: event', 'mapId: 1', 'eventId: 1', 'pageId: 1', '---'])
    const res = text2frame.applyTextFile({ textPath, mapPath, strategy: 'overwrite', overwrite: true })
    expect(res.ok).to.equal(true)
    expect(res.kind).to.equal('event')
    expect(res.target).to.include({ eventId: '1', pageId: '1' })
    const after = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    expect(after.events[1].pages[0].list.length).to.be.greaterThan(1)
    expect(after.events[1].pages[0].list[0].code).to.equal(101)
  })

  it('resolves target purely from front matter (no opts overrides)', function () {
    const textPath = writeTextWithMeta('fm.txt', ['---', 'kind: event', 'mapId: 1', 'eventId: 1', 'pageId: 1', '---'])
    const res = text2frame.applyTextFile({ textPath, mapPath, strategy: 'overwrite', overwrite: true })
    expect(res.ok).to.equal(true)
    expect(res.dataPath).to.equal(mapPath)
  })

  it('overwrite on unchanged content produces no warnings', function () {
    const textPath = writeTextWithMeta('map001_event001_page1.txt', ['---', 'kind: event', 'mapId: 1', 'eventId: 1', 'pageId: 1', '---'])
    text2frame.applyTextFile({ textPath, mapPath, strategy: 'overwrite', overwrite: true })
    const res = text2frame.applyTextFile({ textPath, mapPath, strategy: 'overwrite' })
    expect(res.ok).to.equal(true)
    expect(res.warnings).to.eql([])
  })

  it('common kind: writes the common event list', function () {
    const textPath = writeTextWithMeta('common001.txt', ['---', 'kind: common', 'commonEventId: 1', '---'])
    const res = text2frame.applyTextFile({ textPath, commonEventPath: cePath, strategy: 'overwrite', overwrite: true })
    expect(res.ok).to.equal(true)
    expect(res.target).to.include({ commonEventId: '1' })
    const after = JSON.parse(fs.readFileSync(cePath, 'utf8'))
    expect(after[1].list.length).to.be.greaterThan(1)
  })

  it('returns ok:false with error (does not throw) on bad eventId', function () {
    const textPath = writeTextWithMeta('bad.txt', ['---', 'kind: event', 'mapId: 1', 'eventId: 1', 'pageId: 1', '---'])
    const res = text2frame.applyTextFile({ textPath, mapPath, eventId: '99', strategy: 'overwrite', overwrite: true })
    expect(res.ok).to.equal(false)
    expect(res.error).to.be.a('string')
  })

  it('returns ok:false on unknown strategy', function () {
    const textPath = writeTextWithMeta('x.txt', ['---', 'kind: event', 'mapId: 1', 'eventId: 1', '---'])
    const res = text2frame.applyTextFile({ textPath, mapPath, strategy: 'nope' })
    expect(res.ok).to.equal(false)
    expect(res.error).to.match(/strategy/i)
  })

  it('backup:true creates .bak once (pristine) and does not clobber it', function () {
    const textPath = writeTextWithMeta('map001_event001_page1.txt', ['---', 'kind: event', 'mapId: 1', 'eventId: 1', 'pageId: 1', '---'])
    const pristine = fs.readFileSync(mapPath, 'utf8')
    text2frame.applyTextFile({ textPath, mapPath, strategy: 'overwrite', overwrite: true, backup: true })
    expect(fs.existsSync(mapPath + '.bak')).to.equal(true)
    expect(fs.readFileSync(mapPath + '.bak', 'utf8')).to.equal(pristine)
    // Second deploy must not overwrite the pristine .bak.
    text2frame.applyTextFile({ textPath, mapPath, strategy: 'overwrite', overwrite: true, backup: true })
    expect(fs.readFileSync(mapPath + '.bak', 'utf8')).to.equal(pristine)
  })
})

describe('choice / branch compile invariants', function () {
  it('compiles choices that follow a SetMovementRoute (205 block is closed before the next When)', function () {
    const body = [
      '<ShowChoices: Window, Right, 1, 2>',
      '<When: はい>',
      '<SetMovementRoute: This Event, OFF, OFF, Wait for Completion>',
      '<When: いいえ>',
      '<End>'
    ].join('\n')
    const cmds = text2frame.compile(body)
    const choice = cmds.find(function (c) { return c.code === 102 })
    expect(choice.parameters[0]).to.eql(['はい', 'いいえ'])
    expect(cmds.filter(function (c) { return c.code === 402 })).to.have.lengthOf(2)
  })

  it('reports a clear error for <When> without an enclosing <ShowChoices>', function () {
    expect(function () { text2frame.compile('<When: はい>\nhi') }).to.throw(/When/)
  })

  it('reports a clear error for <WhenCancel> without an enclosing <ShowChoices>', function () {
    expect(function () { text2frame.compile('<WhenCancel>\nhi') }).to.throw(/WhenCancel/)
  })

  it('resolves <End> as choice-end (404), not if-end (412), when the last When branch ends with a SetMovementRoute', function () {
    const body = [
      '<ShowChoices: Window, Right, 1, 2>',
      '<When: はい>',
      '<TransferPlayer: Direct[6][15][11], Retain, Black>',
      '<When: いいえ>',
      '<SetMovementRoute: Player, OFF, OFF, Wait for Completion>',
      '<End>'
    ].join('\n')
    const cmds = text2frame.compile(body)
    expect(cmds.some(function (c) { return c.code === 404 })).to.equal(true)
    expect(cmds.some(function (c) { return c.code === 412 })).to.equal(false)
  })

  it('compiles a Skip(109) block: <Skip> body <SkipEnd> -> 109, body indent+1, {0}, 409', function () {
    const body = ['<Skip>', '<Switch: 43, ON>', '<SkipEnd>'].join('\n')
    const cmds = text2frame.compile(body)
    expect(cmds.slice(0, 4).map(function (c) { return c.code })).to.eql([109, 121, 0, 409])
    const byCode = function (code) { return cmds.find(function (c) { return c.code === code }) }
    expect(byCode(109).indent).to.equal(0)
    expect(byCode(121).indent).to.equal(1) // body is indented under <Skip>
    expect(byCode(409).indent).to.equal(0)
  })
})
