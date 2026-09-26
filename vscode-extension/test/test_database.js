const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { GameDatabase, padId } = require('../out/db/database')

/* 実データで見つかった癖を、作り物の data/ で再現する:
 * 同じ名前が複数の番号に付いている / 数字だけの名前 / 名前なし / 範囲外。 */
describe('GameDatabase', function () {
  let dir

  const write = function (file, json) {
    fs.writeFileSync(path.join(dir, file), JSON.stringify(json), 'utf8')
  }

  beforeEach(function () {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-db-'))
    write('System.json', {
      switches: ['', '村人と話した', '橋がかかった', '', '橋がかかった', '1'],
      variables: ['', '所持金', ''],
      faceSize: 120,
      encryptionKey: '00112233445566778899aabbccddeeff'
    })
    write('Actors.json', [null, { id: 1, name: 'ハロルド', faceName: 'Actor2', faceIndex: 0 }, null])
    write('MapInfos.json', [null, { id: 1, name: 'はじまりの村' }, null, { id: 3, name: '宿屋' }])
  })

  afterEach(function () {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('looks up a named entry', function () {
    const db = GameDatabase.load(dir)
    expect(db.lookup('switch', 1)).to.eql({ status: 'named', id: 1, name: '村人と話した' })
    expect(db.lookup('map', 3)).to.eql({ status: 'named', id: 3, name: '宿屋' })
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
    expect(db.lookup('switch', 1).name).to.equal('村人と話した')
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

  it('reads the face and icon sizes and key from System.json, and 144 / 32 when absent (MV)', function () {
    expect(GameDatabase.load(dir).system).to.eql({ faceSize: 120, iconSize: 32, encryptionKey: '00112233445566778899aabbccddeeff' })
    write('System.json', { switches: [], variables: [], iconSize: 48 })
    expect(GameDatabase.load(dir).system).to.eql({ faceSize: 144, iconSize: 48, encryptionKey: undefined })
  })

  it('reads classes, equipment types and tilesets', function () {
    write('System.json', { switches: [], variables: [], equipTypes: ['', '武器', '盾'] })
    write('Classes.json', [null, { id: 1, name: '勇者' }])
    write('Tilesets.json', [null, { id: 1, name: 'フィールド' }])
    const db = GameDatabase.load(dir)
    expect(db.lookup('class', 1)).to.eql({ status: 'named', id: 1, name: '勇者' })
    expect(db.lookup('equipType', 2)).to.eql({ status: 'named', id: 2, name: '盾' })
    expect(db.lookup('tileset', 1)).to.eql({ status: 'named', id: 1, name: 'フィールド' })
  })

  it('knows which items, skills and states use an icon', function () {
    write('Items.json', [null, { id: 1, name: '薬草', iconIndex: 176 }, { id: 2, name: '毒消し', iconIndex: 176 }])
    write('Skills.json', [null, { id: 1, name: '攻撃', iconIndex: 76 }])
    const db = GameDatabase.load(dir)
    expect(db.iconUsers(176).map((u) => u.kind + ':' + u.name)).to.eql(['item:薬草', 'item:毒消し'])
    expect(db.iconUsers(76)).to.eql([{ kind: 'skill', id: 1, name: '攻撃' }])
    expect(db.iconUsers(5)).to.eql([])
  })

  it('names the actor whose default face it is', function () {
    const db = GameDatabase.load(dir)
    expect(db.faceOwner('Actor2', 0)).to.equal('ハロルド')
    expect(db.faceOwner('Actor2', 4)).to.equal(undefined)
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
