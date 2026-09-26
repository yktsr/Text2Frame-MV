const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { GameDatabase } = require('../out/db/database')
const { placeFromMeta, placeKey, placeFromKey, placeLabel } = require('../out/placeLabel')

describe('placeLabel', function () {
  let dir
  let ctx
  const service = {
    mapEvents: function (_ctx, mapId) { return mapId === 4 ? [null, null, { name: '宝箱', x: 8, y: 11 }] : undefined }
  }

  before(function () {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-place-'))
    fs.writeFileSync(path.join(dir, 'System.json'), JSON.stringify({ switches: [''], variables: [''] }))
    fs.writeFileSync(path.join(dir, 'MapInfos.json'), JSON.stringify([null, null, null, null, { id: 4, name: 'はじまりの村' }]))
    fs.writeFileSync(path.join(dir, 'CommonEvents.json'), JSON.stringify([null, { id: 1, name: '回復の処理', list: [] }, { id: 2, name: '', list: [] }]))
    ctx = { db: GameDatabase.load(dir), dataDir: dir }
  })

  after(function () {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('reads the place from the front matter and back from a key', function () {
    const page = placeFromMeta({ kind: 'event', mapId: '4', eventId: '2', pageId: '3' })
    expect(page).to.eql({ kind: 'event', mapId: 4, eventId: 2, pageId: 3 })
    expect(placeKey(page)).to.equal('e:4:2:3')
    expect(placeKey(placeFromMeta({ mapId: '4', eventId: '2' }))).to.equal('e:4:2:1')
    expect(placeKey(placeFromMeta({ kind: 'common', commonEventId: '12' }))).to.equal('c:12')
    expect(placeFromKey('e:4:2:3')).to.eql(page)
    expect(placeFromKey('c:12')).to.eql({ kind: 'common', commonEventId: 12 })
    expect(placeFromKey('x')).to.equal(undefined)
    expect(placeFromMeta({ kind: 'common' })).to.equal(undefined)
    expect(placeKey(placeFromMeta({ mapId: '4' }))).to.equal(undefined)
  })

  it('names the map, the event and the page, or the common event', function () {
    expect(placeLabel(service, ctx, placeFromKey('e:4:2:1'))).to.equal('はじまりの村 / EV002 宝箱 / 1ページ')
    expect(placeLabel(service, ctx, placeFromMeta({ mapId: '4', eventId: '9' }))).to.equal('はじまりの村 / EV009')
    expect(placeLabel(service, ctx, placeFromMeta({ mapId: '7' }))).to.equal('マップ0007')
    expect(placeLabel(service, ctx, placeFromKey('c:1'))).to.equal('コモンイベント 0001 回復の処理')
    expect(placeLabel(service, ctx, placeFromKey('c:2'))).to.equal('コモンイベント 0002')
    expect(placeLabel(service, ctx, undefined)).to.equal('')
  })
})
