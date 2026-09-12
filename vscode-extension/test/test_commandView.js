const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { GameDatabase } = require('../out/db/database')
const { renderCommands } = require('../out/db/commandView')
const T2F = require(path.resolve(__dirname, '..', '..', 'Text2Frame.js'))

/* プレビューの1行が、ツクールのイベント一覧と同じ書き方になること。
 * 入力はテキストをコンパイラに通したもの(実際のプレビューと同じ経路)。 */
describe('renderCommands', function () {
  let dir
  let db

  before(function () {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-view-'))
    const w = function (f, j) { fs.writeFileSync(path.join(dir, f), JSON.stringify(j)) }
    w('System.json', { switches: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'シャチ出てくる'], variables: ['', '', '', '', '', '体力'] })
    w('MapInfos.json', [null, { id: 1, name: '水族館4' }])
    w('CommonEvents.json', [null, { id: 1, name: 'リュウグウ音' }])
    w('Animations.json', [null, { id: 1, name: 'キラキラ' }])
    db = GameDatabase.load(dir)
  })

  after(function () {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  const heads = function (text) {
    return renderCommands(T2F.compile(text), db).filter(function (r) { return r.head && r.label }).map(function (r) { return r.label + '：' + r.text })
  }
  const rows = function (text) { return renderCommands(T2F.compile(text), db) }

  it('shows a message with its face, and the lines as continuations', function () {
    const r = rows('<Face: suzu1(2)>\n【スーズ】\nおわっ')
    expect(r[0].label + '：' + r[0].text).to.equal('文章：suzu1(2), ウィンドウ, 下')
    expect(r[0].face).to.eql({ name: 'suzu1', index: 2 })
    expect(r.slice(1, 3).map(function (x) { return [x.head, x.text] })).to.eql([[false, '【スーズ】'], [false, 'おわっ']])
  })

  it('puts the database name on switches, variables, maps, common events and animations', function () {
    expect(heads('<Switch: 13, ON>')).to.eql(['スイッチの操作：#0013 シャチ出てくる = ON'])
    expect(heads('<Sub: 5, 1>')).to.eql(['変数の操作：#0005 体力 -= 1'])
    expect(heads('<TransferPlayer: Direct[1][1][9], Retain, Black>')).to.eql(['場所移動：水族館4 (1,9)'])
    expect(heads('<CommonEvent: 1>')).to.eql(['コモンイベント：#0001 リュウグウ音'])
    expect(heads('<ShowAnimation: This Event, 1, OFF>')).to.eql(['アニメーションの表示：このイベント, #0001 キラキラ'])
  })

  it('writes conditions the way the editor does', function () {
    expect(heads('<If: Switches[13], ON>\n<End>')[0]).to.equal('条件分岐：#0013 シャチ出てくる が ON')
    expect(heads('<If: Variables[5], >=, 3>\n<End>')[0]).to.equal('条件分岐：#0005 体力 ≥ 3')
  })

  it('says which ids are unnamed or missing instead of hiding them', function () {
    expect(heads('<Switch: 3, ON>')).to.eql(['スイッチの操作：#0003 = ON'])
    expect(heads('<Switch: 400, ON>')).to.eql(['スイッチの操作：#0400 (データベースに無い) = ON'])
  })

  it('spells out the steps of a movement route', function () {
    const r = rows('<SetMovementRoute: This Event, OFF, OFF, Wait for Completion>\n<MoveRight>\n<TurnDown>')
    expect(r[0].label + '：' + r[0].text).to.equal('移動ルートの設定：このイベント (ウェイト)')
    expect(r.slice(1, 3).map(function (x) { return x.text })).to.eql(['◇右に移動', '◇下を向く'])
  })

  it('never drops a command it does not format in detail', function () {
    const r = renderCommands([{ code: 999, indent: 0, parameters: [1, 2] }, { code: 221, indent: 0, parameters: [] }], db)
    expect(r[0].label).to.equal('(コード 999)')
    expect(r[0].text).to.equal('[1,2]')
    expect(r[1].label + r[1].text).to.equal('画面のフェードアウト')
  })

  it('keeps the indent of nested commands', function () {
    const r = rows('<If: Switches[13], ON>\n<Switch: 13, OFF>\n<End>')
    const inner = r.find(function (x) { return x.code === 121 })
    expect(inner.indent).to.equal(1)
  })
})
