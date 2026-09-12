const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { GameDatabase, padId } = require('../out/db/database')

/* 実データ(アクアリウム)で見つかった癖を、作り物の data/ で再現する:
 * 同じ名前が複数の番号に付いている / 数字だけの名前 / 名前なし / 範囲外。 */
describe('GameDatabase', function () {
  let dir

  const write = function (file, json) {
    fs.writeFileSync(path.join(dir, file), JSON.stringify(json), 'utf8')
  }

  beforeEach(function () {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-db-'))
    write('System.json', {
      switches: ['', '全部の水槽みた', 'シャチ出てくる', '', 'シャチ出てくる', '1'],
      variables: ['', '所持金', ''],
      faceSize: 120,
      encryptionKey: '00112233445566778899aabbccddeeff'
    })
    write('Actors.json', [null, { id: 1, name: 'スーズ', faceName: 'suzu1', faceIndex: 0 }, null])
    write('MapInfos.json', [null, { id: 1, name: '水族館4' }, null, { id: 3, name: 'カウンター' }])
  })

  afterEach(function () {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('looks up a named entry', function () {
    const db = GameDatabase.load(dir)
    expect(db.lookup('switch', 1)).to.eql({ status: 'named', id: 1, name: '全部の水槽みた' })
    expect(db.lookup('map', 3)).to.eql({ status: 'named', id: 3, name: 'カウンター' })
  })

  it('tells an unnamed entry apart from a missing one', function () {
    const db = GameDatabase.load(dir)
    expect(db.lookup('switch', 3)).to.eql({ status: 'unnamed', id: 3 })
    expect(db.lookup('switch', 6)).to.eql({ status: 'missing', id: 6, max: 5 })
    expect(db.lookup('switch', 0).status).to.equal('missing')
    // MapInfos の空き番号(null)は名前なし扱い。
    expect(db.lookup('map', 2)).to.eql({ status: 'unnamed', id: 2 })
  })

  // 名前が "1" のスイッチは番号 5。番号 1 と取り違えない。
  it('keeps a purely numeric name as a name, not an id', function () {
    const db = GameDatabase.load(dir)
    expect(db.lookup('switch', 5)).to.eql({ status: 'named', id: 5, name: '1' })
    expect(db.lookup('switch', 1).name).to.equal('全部の水槽みた')
  })

  it('lists the other ids that share the same name', function () {
    const db = GameDatabase.load(dir)
    expect(db.sameName('switch', 2)).to.eql([4])
    expect(db.sameName('switch', 4)).to.eql([2])
    expect(db.sameName('switch', 1)).to.eql([])
    expect(db.sameName('switch', 3)).to.eql([]) // 名前なし同士は同名扱いしない
  })

  it('lists every id including the unnamed ones', function () {
    const db = GameDatabase.load(dir)
    expect(db.entries('switch').map((e) => e.id)).to.eql([1, 2, 3, 4, 5])
    expect(db.entries('switch')[2]).to.eql({ id: 3, name: '' })
    expect(db.max('variable')).to.equal(2)
  })

  it('reads the face size and key from System.json, and 144 when absent (MV)', function () {
    expect(GameDatabase.load(dir).system).to.eql({ faceSize: 120, encryptionKey: '00112233445566778899aabbccddeeff' })
    write('System.json', { switches: [], variables: [] })
    expect(GameDatabase.load(dir).system).to.eql({ faceSize: 144, encryptionKey: undefined })
  })

  it('names the actor whose default face it is', function () {
    const db = GameDatabase.load(dir)
    expect(db.faceOwner('suzu1', 0)).to.equal('スーズ')
    expect(db.faceOwner('suzu1', 4)).to.equal(undefined)
  })

  it('treats a missing file as an empty kind and records a broken one', function () {
    fs.writeFileSync(path.join(dir, 'Items.json'), '{ not json', 'utf8')
    const db = GameDatabase.load(dir)
    expect(db.max('weapon')).to.equal(0) // Weapons.json は無い
    expect(db.max('item')).to.equal(0)
    expect(db.errors).to.have.lengthOf(1)
    expect(db.errors[0]).to.contain('Items.json')
  })

  it('pads ids to four digits like the editor does', function () {
    expect(padId(79)).to.equal('0079')
    expect(padId(1234)).to.equal('1234')
  })
})
