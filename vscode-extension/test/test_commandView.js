const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { GameDatabase } = require('../out/db/database')
const { renderCommands } = require('../out/db/commandView')
const { setJapanese } = require('../out/db/lang')
const { describeColor } = require('../out/db/colors')
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

  it('puts a colour swatch on tints and flashes', function () {
    const tint = rows('<TintScreen: Duration[1][Wait for Completion], ColorTone[-255][-255][-255][255]>')[0]
    expect(tint.label + '：' + tint.text).to.equal('画面の色調変更：(-255,-255,-255,255), 1フレーム (ウェイト)')
    expect(tint.swatch.color).to.equal('rgba(0, 0, 0, 1)')
    expect(rows('<TintPicture: 3, Duration[60][], ColorTone[Sepia]>')[0].text).to.equal('#3, (34,-34,-68,170), 60フレーム')
    expect(rows('<FlashScreen: 255, 0, 0, 255, 30, OFF>')[0].swatch.color).to.equal('rgba(255, 0, 0, 1)')
    expect(heads('<ChangeWindowColor: -255, 0, 68>')).to.eql(['ウィンドウカラーの変更：(-255,0,68)'])
    expect(rows('<Wait: 60>')[0].swatch).to.equal(undefined)
  })

  it('puts the database name on switches, variables, maps, common events and animations', function () {
    expect(heads('<Switch: 13, ON>')).to.eql(['スイッチの操作：#0013 シャチ出てくる = ON'])
    expect(heads('<Sub: 5, 1>')).to.eql(['変数の操作：#0005 体力 -= 1'])
    expect(heads('<TransferPlayer: Direct[1][1][9], Retain, Black>')).to.eql(['場所移動：水族館4 (1,9), 向き そのまま, フェード 黒'])
    expect(heads('<TransferPlayer: WithVariables[5][2][3], Up, None>')).to.eql(['場所移動：{#0005 体力} ({#0002},{#0003}), 向き 上, フェード なし'])
    expect(heads('<場所移動: 直接指定[1][1][9], 下, 白>')).to.eql(['場所移動：水族館4 (1,9), 向き 下, フェード 白'])
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

  it('names map events with where they stand, when the map is known', function () {
    const events = { mapId: 1, events: [null, { name: 'ヤドカリ', x: 8, y: 11 }] }
    const r = renderCommands(T2F.compile('<SetMovementRoute: 1, OFF, OFF, Wait for Completion>\n<MoveRight>\n<ShowBalloonIcon: 2, Heart>'), db, events)
    expect(r[0].label + '：' + r[0].text).to.equal('移動ルートの設定：EV001 ヤドカリ (8,11) (ウェイト)')
    expect(r[2].text).to.equal('EV002 (マップに無い), ハート')
    expect(heads('<SetMovementRoute: 1, OFF, OFF, OFF>')).to.eql(['移動ルートの設定：EV001']) // マップが分からなければ番号だけ
  })

  it('knows which sound a command plays, for the play button', function () {
    expect(rows('<PlayBGM: Theme1, 80, 110, -20>')[0].audio).to.eql({ folder: 'bgm', name: 'Theme1', volume: 80, pitch: 110, pan: -20 })
    expect(rows('<PlaySE: Door4, 55, 100, 0>')[0].audio.folder).to.equal('se')
    expect(rows('<PlayME: Victory1>')[0].audio.folder).to.equal('me')
    expect(rows('<PlayBGS: River>')[0].audio.folder).to.equal('bgs')
    expect(rows('<SetMovementRoute: This Event, OFF, OFF, OFF>\n<McPlaySe: Door4, 55, 100, 0>')[1].audio.name).to.equal('Door4')
    expect(rows('<PlayBGM: None>')[0].audio).to.equal(undefined) // なし(止める)は鳴らさない
    expect(rows('<Wait: 60>')[0].audio).to.equal(undefined)
  })

  it('spells out the steps of a movement route', function () {
    const r = rows('<SetMovementRoute: This Event, OFF, OFF, Wait for Completion>\n<MoveRight>\n<TurnDown>')
    expect(r[0].label + '：' + r[0].text).to.equal('移動ルートの設定：このイベント (ウェイト)')
    expect(r.slice(1, 3).map(function (x) { return x.text })).to.eql(['◇右に移動', '◇下を向く'])
  })

  it('spells out the arguments of movement steps instead of dumping objects', function () {
    const r = rows('<SetMovementRoute: This Event, OFF, OFF, Wait for Completion>\n<McPlaySe: Door4, 55, 100, 0>\n<Jump: 1, -2>\n<ChangeSpeed: x2 faster>\n<ChangeFrequency: Highest>\n<ChangeBlendMode: Additive>')
    expect(r.slice(1, 6).map(function (x) { return x.text })).to.eql([
      '◇SEの演奏：Door4 (55, 100, 0)', '◇ジャンプ：+1, -2', '◇移動速度の変更：2倍速', '◇移動頻度の変更：最高', '◇合成方法の変更：加算'
    ])
  })

  it('adds database names after the arguments of commands it does not format in detail', function () {
    expect(heads('<EnemyTransform: 1, 5>')).to.eql(['敵キャラの変身：[0,5]  #0005 (データベースに無い)'])
  })

  it('translates numbers into words and names for actor, timer, weather and similar commands', function () {
    expect(heads('<ChangeHp: V[5], Decrease, 3>')).to.eql(['HPの増減：{#0005 体力}, - 3'])
    expect(heads('<ChangeHp: Entire Party, Increase, V[5], true>')).to.eql(['HPの増減：パーティ全体, + #0005 体力 (戦闘不能を許可)'])
    expect(heads('<ChangeParameter: 1, Attack, Increase, 2>')).to.eql(['能力値の増減：#0001 (データベースに無い), 攻撃力 + 2'])
    expect(heads('<ChangeEquipment: 1, 3, None>')[0]).to.contain('= なし')
    expect(heads('<GetLocationInfo: 5, Region ID, WithVariables[5][5]>')).to.eql(['指定位置の情報取得：#0005 体力, リージョンID, ({#0005 体力},{#0005 体力})'])
    expect(heads('<Timer: Start, 1, 30>')).to.eql(['タイマーの操作：スタート, 1分30秒'])
    expect(heads('<SetEventLocation: This Event, Exchange[8], Down>')).to.eql(['イベントの位置設定：このイベント, EV008 と交換, 向き 下'])
    expect(heads('<SetVehicleLocation: Boat, Direct[1][4][5]>')).to.eql(['乗り物の位置設定：小型船, #0001 水族館4 (4,5)'])
    expect(heads('<SetWeatherEffect: Snow, 5, 60, Wait for Completion>')).to.eql(['天候の設定：雪, 強さ 5, 60フレーム (ウェイト)'])
    expect(heads('<ChangeMenuAccess: Disable>')).to.eql(['メニュー禁止の変更：禁止'])
    expect(heads('<ScrollMap: Up, 3, x2 slower, OFF>')).to.eql(['マップのスクロール：上, 3, 1/2倍速'])
    expect(heads('<ShowBalloonIcon: This Event, Music note, Wait for Completion>')).to.eql(['フキダシアイコンの表示：このイベント, 音符 (ウェイト)'])
    const images = rows('<ChangeActorImages: 1, Actor1, 2, Actor1, 0, Actor1_1>')[0]
    expect(images.face).to.eql({ name: 'Actor1', index: 2 })
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

  describe('in English', function () {
    before(function () { setJapanese(false) })
    after(function () { setJapanese(true) })

    it('uses the English editor names for commands and their arguments', function () {
      expect(heads('<Switch: 13, ON>')).to.eql(['Control Switches：#0013 シャチ出てくる = ON'])
      expect(heads('<TransferPlayer: Direct[1][1][9], Retain, Black>')).to.eql(['Transfer Player：水族館4 (1,9), Direction Retain, Fade Black'])
      expect(heads('<If: Switches[13], ON>\n<End>')[0]).to.equal('If：#0013 シャチ出てくる is ON')
      expect(heads('<Timer: Start, 1, 30>')).to.eql(['Control Timer：Start, 1 min 30 sec'])
      expect(heads('<SetWeatherEffect: Snow, 5, 60, Wait for Completion>')).to.eql(['Set Weather Effect：Snow, Power 5, 60 frames (Wait)'])
      expect(heads('<Switch: 400, ON>')).to.eql(['Control Switches：#0400 (not in the database) = ON'])
    })

    it('spells out movement steps and branches in English', function () {
      const r = rows('<SetMovementRoute: This Event, OFF, OFF, Wait for Completion>\n<MoveRight>\n<ChangeSpeed: x2 faster>')
      expect(r[0].label + '：' + r[0].text).to.equal('Set Movement Route：This Event (Wait)')
      expect(r.slice(1, 3).map(function (x) { return x.text })).to.eql(['◇Move Right', '◇Change Speed: x2 Faster'])
      const choices = rows('<ShowChoices>\n<When: はい>\n<When: Cancel>\n<End>').map(function (x) { return x.text })
      expect(choices).to.include('When [はい]')
      expect(choices).to.include('End')
    })

    it('writes the colour swatch title and unknown commands in English', function () {
      expect(describeColor('flash', [255, 0, 0, 170])).to.equal('Flash R255 G0 B0 Power170')
      expect(renderCommands([{ code: 999, indent: 0, parameters: [] }], db)[0].label).to.equal('(code 999)')
    })
  })
})
