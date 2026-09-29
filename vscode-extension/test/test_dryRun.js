const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const T2F = require('../../Text2Frame.js')
const F2T = require('../../Frame2Text.js')
const { tryApply, pageList, fingerprint } = require('../out/dryRun')

const message = (text) => [
  { code: 101, indent: 0, parameters: ['', 0, 0, 2] },
  { code: 401, indent: 0, parameters: [text] }
]
const page = (text) => ({ list: message(text).concat([{ code: 0, indent: 0, parameters: [] }]) })
const front = (pageId) => ['---', 'kind: event', 'mapId: 1', 'eventId: 1', 'pageId: ' + pageId, '---', ''].join('\n')

describe('dryRun', function () {
  let root
  let mapPath

  beforeEach(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-dry-'))
    fs.mkdirSync(path.join(root, 'data'))
    fs.mkdirSync(path.join(root, 'text'))
    mapPath = path.join(root, 'data', 'Map001.json')
    fs.writeFileSync(mapPath, JSON.stringify({ events: [null, { id: 1, pages: [page('古いセリフ'), page('二つ目')] }] }))
  })

  afterEach(function () {
    fs.rmSync(root, { recursive: true, force: true })
  })

  const step = (pageId, text) => {
    const textPath = path.join(root, 'text', 'map001_event001_page' + pageId + '.txt')
    fs.writeFileSync(textPath, front(pageId) + '\n' + text + '\n')
    return {
      applyOpts: { textPath, kind: 'event', mapId: '1', eventId: '1', pageId: String(pageId), mapPath, strategy: 'merge', baseRoot: root },
      dataPath: mapPath,
      ref: { kind: 'event', mapId: '1', eventId: '1', pageId: String(pageId) }
    }
  }
  const render = (list) => F2T.decompile(list, true, { pretty: true, omitDefaults: true })

  it('shows the game after the apply without writing the data or the ancestor', function () {
    const original = fs.readFileSync(mapPath)
    const [trial] = tryApply(T2F, [step(1, '新しいセリフ')])
    expect(trial.result.ok).to.equal(true)
    expect(render(trial.before)).to.contain('古いセリフ')
    expect(render(trial.after)).to.contain('新しいセリフ')
    expect(render(trial.after)).not.to.contain('古いセリフ')
    expect(fs.readFileSync(mapPath).equals(original)).to.equal(true)
    expect(fs.existsSync(path.join(root, '.t2f-base'))).to.equal(false)
  })

  it('matches what the real apply writes afterwards', function () {
    const s = step(1, '本物と同じになる文')
    const [trial] = tryApply(T2F, [s])
    const real = T2F.applyTextFile(s.applyOpts)
    expect(real.ok).to.equal(true)
    expect(pageList(JSON.parse(fs.readFileSync(mapPath, 'utf8')), s.ref)).to.eql(trial.after)
  })

  it('stacks two pages of the same map on one copy', function () {
    const trials = tryApply(T2F, [step(1, 'ページ1の新しい文'), step(2, 'ページ2の新しい文')])
    expect(trials.map((t) => t.result.ok)).to.eql([true, true])
    expect(render(trials[0].after)).to.contain('ページ1の新しい文')
    expect(render(trials[1].after)).to.contain('ページ2の新しい文')
    expect(render(trials[1].before)).to.contain('二つ目')
  })

  it('gives the same text before and after when nothing changes', function () {
    const [trial] = tryApply(T2F, [step(1, '古いセリフ')])
    expect(trial.result.ok).to.equal(true)
    expect(render(trial.after)).to.equal(render(trial.before))
  })

  it('reports a text that cannot be applied, and leaves no after', function () {
    const bad = step(1, '<When: はい>')
    const [trial] = tryApply(T2F, [bad])
    expect(trial.result.ok).to.equal(false)
    expect(trial.after).to.equal(undefined)
    expect(render(trial.before)).to.contain('古いセリフ')
  })

  it('reads a page or a common event from the data', function () {
    const json = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    expect(pageList(json, { kind: 'event', eventId: '1', pageId: '2' })[1].parameters[0]).to.equal('二つ目')
    expect(pageList(json, { kind: 'event', eventId: '1', pageId: '3' })).to.equal(undefined)
    expect(pageList([null, { list: [1] }], { kind: 'common', commonEventId: '1' })).to.eql([1])
    expect(pageList(undefined, { kind: 'common', commonEventId: '1' })).to.equal(undefined)
  })

  it('takes a fingerprint that changes with the contents', function () {
    const a = fingerprint([mapPath, path.join(root, 'none.txt'), undefined])
    expect(fingerprint([path.join(root, 'none.txt'), mapPath])).to.equal(a)
    fs.writeFileSync(mapPath, '{}')
    expect(fingerprint([mapPath, path.join(root, 'none.txt')])).not.to.equal(a)
  })
})
