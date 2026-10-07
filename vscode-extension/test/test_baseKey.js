const { expect } = require('chai')
const path = require('path')
const { snapshotKeyForTarget, targetKeyFromMeta, textScopeOf } = require('../out/db/baseKey')

describe('ancestor key', function () {
  const root = path.join(path.sep, 'game')
  const text = (...parts) => path.join(root, ...parts)

  it('names the ancestor after the target', function () {
    expect(targetKeyFromMeta({ kind: 'event', mapId: '2', eventId: '13', pageId: '3' })).to.equal('map002_event013_page3')
    expect(targetKeyFromMeta({ kind: 'event', mapId: '2', eventId: '13' })).to.equal('map002_event013_page1')
    expect(targetKeyFromMeta({ kind: 'common', commonEventId: '7' })).to.equal('common007')
  })

  it('has no key when the front matter does not say where to go', function () {
    expect(targetKeyFromMeta({})).to.equal(undefined)
    expect(targetKeyFromMeta({ kind: 'event', mapId: '1' })).to.equal(undefined)
    expect(targetKeyFromMeta({ kind: 'common' })).to.equal(undefined)
  })

  it('keeps the same key when the text is renamed or moved', function () {
    const meta = { kind: 'event', mapId: '1', eventId: '1', pageId: '1' }
    const expected = 'text/map001_event001_page1'
    expect(snapshotKeyForTarget(root, text('text', 'map001_event001_page1.txt'), meta)).to.equal(expected)
    expect(snapshotKeyForTarget(root, text('text', 'オープニング.txt'), meta)).to.equal(expected)
    expect(snapshotKeyForTarget(root, text('text', '第1章', 'オープニング.txt'), meta)).to.equal(expected)
  })

  it('keeps separate keys for separate text folders', function () {
    const meta = { kind: 'event', mapId: '1', eventId: '1', pageId: '1' }
    expect(snapshotKeyForTarget(root, text('text-en', 'x.txt'), meta)).to.equal('text-en/map001_event001_page1')
    expect(textScopeOf(root, text('text', 'a', 'b.txt'))).to.equal('text')
  })

  it('falls back to the path when the target is unknown', function () {
    expect(snapshotKeyForTarget(root, text('text', 'x.txt'), {})).to.equal('text/x')
  })
})
