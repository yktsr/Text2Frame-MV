const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { GameDatabase } = require('../out/db/database')
const { describeRef } = require('../out/db/describe')

describe('describeRef', function () {
  let dir
  let db

  before(function () {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-desc-'))
    fs.writeFileSync(path.join(dir, 'System.json'), JSON.stringify({
      switches: ['', '全部の水槽みた', 'シャチ出てくる', '', 'シャチ出てくる', '1'],
      variables: ['', '所持金']
    }))
    fs.writeFileSync(path.join(dir, 'Actors.json'), JSON.stringify([null, { id: 1, name: 'スーズ', faceName: 'suzu1', faceIndex: 0 }]))
    fs.writeFileSync(path.join(dir, 'MapInfos.json'), JSON.stringify([null, { id: 1, name: '水族館4' }]))
    fs.writeFileSync(path.join(dir, 'Items.json'), JSON.stringify([null, { id: 1, name: '薬草', iconIndex: 176 }]))
    db = GameDatabase.load(dir)
  })

  after(function () {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('shows the name next to a named id', function () {
    const info = describeRef(db, { kind: 'switch', id: 1 })
    expect(info.hint).to.equal('全部の水槽みた')
    expect(info.title).to.equal('スイッチ 0001')
    expect(info.problem).to.equal(undefined)
  })

  // 名前だけ見て取り違えないよう、同じ名前の番号をホバーに並べる。
  it('lists the other ids that share the name', function () {
    expect(describeRef(db, { kind: 'switch', id: 2 }).lines).to.eql(['シャチ出てくる', '同じ名前のスイッチ: 0004'])
  })

  it('marks an unnamed id quietly and a missing one as a warning', function () {
    const unnamed = describeRef(db, { kind: 'switch', id: 3 })
    expect(unnamed.hint).to.equal('(名前なし)')
    expect(unnamed.problem).to.eql({ severity: 'hint', message: 'スイッチ 0003 には名前がありません' })

    const missing = describeRef(db, { kind: 'switch', id: 9 })
    expect(missing.hint).to.equal(undefined) // 無い番号には名前を出さない(警告だけ)
    expect(missing.problem).to.eql({ severity: 'warning', message: 'スイッチ 0009 はデータベースにありません(0001〜0005)' })
  })

  it('describes a range by its first name and count, and flags the missing part', function () {
    const info = describeRef(db, { kind: 'switch', id: 1, endId: 3 })
    expect(info.title).to.equal('スイッチ 0001〜0003')
    expect(info.hint).to.equal('全部の水槽みた…(3件)')
    expect(info.lines).to.eql(['0001 全部の水槽みた', '0002 シャチ出てくる', '0003 (名前なし)'])
    expect(describeRef(db, { kind: 'switch', id: 4, endId: 7 }).problem.message).to.contain('0006, 0007')
  })

  it('says so when a kind has no entries at all', function () {
    expect(describeRef(db, { kind: 'troop', id: 1 }).problem.message).to.contain('敵グループは1つもありません')
  })

  it('does not put a text hint on a face, and checks the sheet and the number', function () {
    const ok = describeRef(db, { kind: 'face', id: 0, faceName: 'suzu1' }, { exists: () => true })
    expect(ok.hint).to.equal(undefined)
    expect(ok.lines).to.eql(['スーズ の既定の顔'])
    expect(describeRef(db, { kind: 'face', id: 0, faceName: 'nobody' }, { exists: () => false }).problem.severity).to.equal('warning')
    expect(describeRef(db, { kind: 'face', id: 8, faceName: 'suzu1' }, { exists: () => true }).problem.message).to.contain('0〜7')
  })

  it('names an event from the map of the text, and warns about one the map does not have', function () {
    const events = { mapId: 1, events: [null, { name: 'ヤドカリ', x: 8, y: 11 }, { name: '', x: 0, y: 3 }, null] }
    const named = describeRef(db, { kind: 'event', id: 1 }, { events })
    expect([named.hint, named.title, named.lines]).to.eql(['ヤドカリ (8,11)', 'イベント EV001', ['ヤドカリ', '座標 (8,11)', 'マップ 0001 水族館4']])
    expect(describeRef(db, { kind: 'event', id: 2 }, { events }).hint).to.equal('(名前なし) (0,3)')
    const missing = describeRef(db, { kind: 'event', id: 3 }, { events })
    expect(missing.problem.message).to.equal('イベント EV003 はマップ 0001 水族館4にありません')
    // コモンイベントのテキストなど、マップが決まらなければ名前も警告も出さない。
    const unknown = describeRef(db, { kind: 'event', id: 3 })
    expect([unknown.hint, unknown.problem]).to.eql([undefined, undefined])
  })

  it('lists what uses an icon, and checks the number against the icon sheet', function () {
    const info = describeRef(db, { kind: 'icon', id: 176 }, { iconCount: 256 })
    expect([info.hint, info.title, info.lines]).to.eql([undefined, 'アイコン 176', ['アイテム 0001 薬草']])
    expect(describeRef(db, { kind: 'icon', id: 300 }, { iconCount: 256 }).problem.message).to.contain('0〜255')
    expect(describeRef(db, { kind: 'icon', id: 300 }).problem).to.equal(undefined) // 画像が読めなければ確かめない
  })
})
