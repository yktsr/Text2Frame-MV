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
    expect(describeRef(db, { kind: 'map', id: 1 }).problem.message).to.contain('マップは1つもありません')
  })

  it('does not put a text hint on a face, and checks the sheet and the number', function () {
    const ok = describeRef(db, { kind: 'face', id: 0, faceName: 'suzu1' }, { exists: () => true })
    expect(ok.hint).to.equal(undefined)
    expect(ok.lines).to.eql(['スーズ の既定の顔'])
    expect(describeRef(db, { kind: 'face', id: 0, faceName: 'nobody' }, { exists: () => false }).problem.severity).to.equal('warning')
    expect(describeRef(db, { kind: 'face', id: 8, faceName: 'suzu1' }, { exists: () => true }).problem.message).to.contain('0〜7')
  })
})
