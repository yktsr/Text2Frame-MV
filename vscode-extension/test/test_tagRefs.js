const { expect } = require('chai')
const path = require('path')
const { findRefs, scanLines, expectedAt } = require('../out/db/tagRefs')
const { commandRefs } = require('../out/db/commandRefs')

// 突き合わせの相手。リポジトリ直下のコンパイラそのもの。
const T2F = require(path.resolve(__dirname, '..', '..', 'Text2Frame.js'))

const shape = function (refs) {
  return refs.map(function (r) { return r.kind + ':' + r.id + (r.faceName ? '@' + r.faceName : '') }).sort()
}
// 範囲指定(1-10)は tagRefs では1つ、コマンドでは番号ごとに出るので、揃えてから比べる。
const expand = function (refs) {
  const out = []
  refs.forEach(function (r) {
    for (let id = r.id; id <= (r.endId || r.id); id++) out.push(Object.assign({}, r, { id }))
  })
  return out
}
const compiled = function (line, tail, head) {
  return T2F.compile((head || '') + line + (tail || '')).reduce(function (acc, c) { return acc.concat(commandRefs(c)) }, [])
}

/* 表(タグの別名)がコンパイラとずれていないことを、コンパイラに訊いて確かめる。
 * コンパイラ側で書き方が変わればここが落ちるので、表だけが黙って古くなることがない。 */
describe('tagRefs agrees with the compiler', function () {
  const cases = [
    // [行, コンパイルに通すときに足す続き, 前に置く行]
    ['<Face: suzu1(4)>', '\nこんにちは'],
    ['<FC: Actor1(7)>', '\nx'],
    ['<顔: ruru1(0)>', '\nx'],
    ['<Switch: 79, ON>'],
    ['<SW: 3-5, OFF>'],
    ['<SwitchOn: 128>', '', '<SetMovementRoute: This Event, OFF, OFF, Wait for Completion>\n'],
    ['<SwitchOff: 5>', '', '<SetMovementRoute: Player, OFF, OFF, Wait for Completion>\n'],
    ['<スイッチON: 12>', '', '<移動ルートの設定: プレイヤー, OFF, OFF, ON>\n'],
    ['<スイッチOFF: 9>', '', '<移動ルートの設定: プレイヤー, OFF, OFF, ON>\n'],
    ['<スイッチ: 12, オン>'],
    ['<Set: 5, 1>'],
    ['<代入: 5, V[20]>'],
    ['<=: 2-4, Variables[7]>'],
    ['<Add: 1, 変数[3]>'],
    ['<加算: 1, 1>'],
    ['<+: 1, 1>'],
    ['<Sub: 5, 1>'],
    ['<-: 5, 1>'],
    ['<Mul: 1, 2>'],
    ['<*: 1, 2>'],
    ['<Div: 1, 2>'],
    ['</: 1, 2>'],
    ['<Mod: 1, V[2]>'],
    ['<%: 1, 2>'],
    ['<剰余: 1, 2>'],
    ['<If: Switches[79], ON>', '\n<End>'],
    ['<If: SW[3], OFF>', '\n<End>'],
    ['<条件分岐: スイッチ[4], ON>', '\n<End>'],
    ['<If: Variables[11], ==, 1111>', '\n<End>'],
    ['<If: V[2], >=, V[9]>', '\n<End>'],
    ['<If: 変数[2], ==, 変数[3]>', '\n<End>'],
    ['<If: Actors[1], InTheParty>', '\n<End>'],
    ['<If: アクター[2], InTheParty>', '\n<End>'],
    ['<If: Items[3]>', '\n<End>'],
    ['<If: アイテム[3]>', '\n<End>'],
    ['<If: Weapons[2], Include>', '\n<End>'],
    ['<If: Armors[4], Include>', '\n<End>'],
    ['<CommonEvent: 7>'],
    ['<CE: 3>'],
    ['<コモンイベント: 12>'],
    ['<TransferPlayer: Direct[83][1][9], Retain, Black>'],
    ['<場所移動: 直接指定[5][2][3], Retain, Black>'],
    ['<TransferPlayer: WithVariables[1][2][3], Retain, Black>'],
    ['<ShowAnimation: This Event, 123, OFF>'],
    ['<アニメーションの表示: プレイヤー, 5, ON>'],
    ['<ShowAnimation: 7, 3, OFF>'],
    // 引数の位置で種類が決まるタグ
    ['<ChangeGold: Increase, V[9]>'],
    ['<ChangeItems: 5, Increase, 1>'],
    ['<アイテムの増減: 3, 減らす, V[4]>'],
    ['<ChangeWeapons: 2, Decrease, V[3], true>'],
    ['<防具の増減: 4, Increase, 1>'],
    ['<ChangePartyMember: 3, Add, true>'],
    ['<ChangeHp: 2, Increase, V[5], true>'],
    ['<ChangeHp: V[7], Decrease, 5>'],
    ['<ChangeHp: Entire Party, Increase, V[2]>'],
    ['<ChangeMp: 1, Increase, 5>'],
    ['<ChangeTp: V[1], Decrease, V[2]>'],
    ['<ChangeExp: 3, Increase, 100, true>'],
    ['<ChangeLevel: 4, Increase, 1>'],
    ['<ChangeState: 1, Add, 4>'],
    ['<ステートの変更: V[3], Remove, 2>'],
    ['<RecoverAll: V[2]>'],
    ['<全回復: 3>'],
    ['<ChangeParameter: 1, Attack, Increase, V[6]>'],
    ['<ChangeSkill: 2, Learn, 10>'],
    ['<ChangeEquipment: 1, 1, 5>'],
    ['<ChangeEquipment: 1, 2, 3>'],
    ['<ChangeEquipment: 1, 3, None>'],
    ['<ChangeName: 2, ハロルド>'],
    ['<ChangeNickname: 3, 勇者>'],
    ['<ChangeProfile: 4, 一行目, 二行目>'],
    ['<ChangeClass: 2, 3, true>'],
    ['<ChangeActorImages: 1, Actor1, 2, Actor1, 0, Actor1_1>'],
    ['<SetVehicleLocation: Boat, Direct[3][4][5]>'],
    ['<SetVehicleLocation: Ship, WithVariables[3][4][5]>'],
    ['<SetEventLocation: 5, WithVariables[1][2], Retain>'],
    ['<SetEventLocation: This Event, Exchange[8], Down>'],
    ['<SetEventLocation: 3, Direct[1][2], Down>'],
    ['<SetMovementRoute: 6, OFF, OFF, ON>'],
    ['<ShowBalloonIcon: 4, Exclamation>'],
    ['<ChangeTileset: 4>'],
    ['<GetLocationInfo: 12, Region ID, WithVariables[3][4]>'],
    ['<GetLocationInfo: 12, Event ID, Character[7]>'],
    ['<GetLocationInfo: 12, Terrain Tag, Direct[1][2]>'],
    ['<BattleProcessing: 5>'],
    ['<BattleProcessing: V[3]>'],
    ['<NameInputProcessing: 1, 8>'],
    ['<Merchandise: Item, 5>'],
    ['<商品: 防具, 3, 100>'],
    ['<ChangeEnemyHp: 1, Increase, V[3]>'],
    ['<ChangeEnemyState: 1, Add, 3>'],
    ['<EnemyTransform: 1, 9>'],
    ['<ShowBattleAnimation: Entire Troop, 4>'],
    ['<ForceAction: Actors[2], 10, Random>'],
    ['<ForceAction: 1, 10, Random>'],
    ['<InputNumber: 7, 3>'],
    ['<SelectItem: 8, Key Item>'],
    // 条件分岐の職業・スキル・装備・ステート、敵キャラのステート、キャラクター
    ['<If: Actors[1], Class, 3>', '\n<End>'],
    ['<If: Actors[1],Skill,4>', '\n<End>'],
    ['<If: Actors[2], Weapon, 5>', '\n<End>'],
    ['<If: Actors[2], Armor, 6>', '\n<End>'],
    ['<If: アクター[2], ステート, 5>', '\n<End>'],
    ['<If: Enemies[2], State, 7>', '\n<End>'],
    ['<If: Characters[5], Down>', '\n<End>'],
    // 変数の操作のゲームデータ
    ['<Set: 1, GameData[Item][5]>'],
    ['<Set: 1, GameData[Weapon][4]>'],
    ['<Set: 1, gd[防具][4]>'],
    ['<Set: 1, GameData[Actor][2][Level]>'],
    ['<Set: 1, GameData[Character][3][MapX]>'],
    // ピクチャの位置を変数で指定
    ['<ShowPicture: 1, pic, Position[Upper Left][Variables[3]][V[4]]>'],
    ['<MovePicture: 1, Position[Center][V[5]][V[6]], Duration[60][]>'],
    // 文章中の制御文字
    ['こんにちは\\N[2]、\\V[5]個'],
    ['移動…\\I[40]\\i[56]'],
    ['<Name: \\N[1]>', '\nこんにちは'],
    ['<When: \\V[2]個>', '\n<End>', '<ShowChoices>\n']
  ]

  cases.forEach(function (c) {
    it(c[0], function () {
      const fromText = shape(expand(findRefs(c[0])))
      expect(fromText, 'テキスト側で何も拾えていない').to.not.be.empty
      expect(fromText).to.eql(shape(compiled(c[0], c[1], c[2])))
    })
  })
})

describe('findRefs positions', function () {
  const at = function (line, ref) { return line.slice(ref.start, ref.end) }

  it('points at the number itself', function () {
    const line = '<Switch: 79, ON>'
    expect(at(line, findRefs(line)[0])).to.equal('79')
  })

  it('covers the whole range and the whole face', function () {
    expect(at('<SW: 3-5, OFF>', findRefs('<SW: 3-5, OFF>')[0])).to.equal('3-5')
    expect(at('    <SwitchOn: 128>', findRefs('    <SwitchOn: 128>')[0])).to.equal('128')
    expect(at('<Face: suzu1(4)>', findRefs('<Face: suzu1(4)>')[0])).to.equal('suzu1(4)')
  })

  it('reads \\V[n] and \\N[n] in message text as a variable and an actor', function () {
    const line = 'こんにちは \\N[12] さん、\\v[3]個'
    expect(findRefs(line).map(function (r) { return [r.kind, at(line, r)] })).to.eql([['actor', '12'], ['variable', '3']])
  })

  it('finds each number in a line with several', function () {
    const line = '<If: V[2], >=, V[9]>'
    expect(findRefs(line).map(function (r) { return at(line, r) })).to.eql(['2', '9'])
    const t = '<TransferPlayer: WithVariables[1][22][333], Retain, Black>'
    expect(findRefs(t).map(function (r) { return at(t, r) })).to.eql(['1', '22', '333'])
  })

  it('leaves alone the tags that only look similar', function () {
    expect(findRefs('<SelfSwitch: A, ON>')).to.eql([])
    expect(findRefs('<SetMovementRoute: This Event, OFF, OFF, Wait for Completion>')).to.eql([])
    expect(findRefs('<If: SelfSwitches[A], ON>')).to.eql([])
    expect(findRefs('<PluginCommand: foo \\V[3]>')).to.eql([]) // プラグインコマンドの中の制御文字は読まない
    expect(findRefs('<ShowChoices: \\V[3]個, いいえ>')).to.eql([]) // 選択肢の文言は <When> から作られる
  })

  // 顔画像なしで番号だけ残っている書き方。コンパイラも顔なしと読む(実データに 233 件)。
  it('takes <Face: (5)> as no face, as the compiler does', function () {
    expect(findRefs('<Face: (5)>')).to.eql([])
    expect(commandRefs(T2F.compile('<Face: (5)>\nx')[0])).to.eql([])
  })
})

describe('scanLines', function () {
  it('skips % lines and the inside of script / comment / scrolling blocks', function () {
    const lines = [
      '<Switch: 1, ON>',
      '% <Switch: 2, ON>',
      '<comment>',
      '<Switch: 3, ON>',
      '</comment>',
      '<script>',
      '<Switch: 4, ON>',
      '</script>',
      '<文章のスクロール表示: 2, OFF>',
      '<Switch: 5, ON>',
      '</文章のスクロール表示>',
      '<Switch: 6, ON>'
    ]
    expect(scanLines(lines).map(function (r) { return [r.line, r.id] })).to.eql([[0, 1], [11, 6]])
  })

  it('reads control characters inside scrolling text, but not inside scripts', function () {
    const lines = [
      '<ShowScrollingText: 2, OFF>',
      '所持数 \\V[7] 個',
      '</ShowScrollingText>',
      '<script>',
      'x = "\\V[8]"',
      '</script>'
    ]
    expect(scanLines(lines).map(function (r) { return [r.line, r.kind, r.id] })).to.eql([[1, 'variable', 7]])
  })
})

describe('expectedAt', function () {
  const exp = function (s) { return expectedAt(s, s.length) }

  it('knows which kind of number goes at the cursor', function () {
    expect(exp('<Switch: ').kind).to.equal('switch')
    expect(exp('<SwitchOn: ').kind).to.equal('switch')
    expect(exp('<スイッチOFF: 1').typed).to.equal('1')
    expect(exp('<SW: 7').typed).to.equal('7')
    expect(exp('<Set: ').kind).to.equal('variable')
    expect(exp('<Set: 1, V[').kind).to.equal('variable')
    expect(exp('<If: Switches[').kind).to.equal('switch')
    expect(exp('<If: Items[').kind).to.equal('item')
    expect(exp('<CommonEvent: ').kind).to.equal('commonEvent')
    expect(exp('<TransferPlayer: Direct[').kind).to.equal('map')
    expect(exp('<ShowAnimation: This Event, ').kind).to.equal('animation')
  })

  it('knows the kind from the argument position', function () {
    expect(exp('<ChangeItems: ').kind).to.equal('item')
    expect(exp('<ChangeHp: ').kind).to.equal('actor')
    expect(exp('<ChangeState: 1, Add, ').kind).to.equal('state')
    expect(exp('<ChangeEquipment: 1, 1, ').kind).to.equal('weapon')
    expect(exp('<ChangeEquipment: 1, 3, ').kind).to.equal('armor')
    expect(exp('<Merchandise: Armor, ').kind).to.equal('armor')
    expect(exp('<SetMovementRoute: ').kind).to.equal('event')
    expect(exp('<ChangeItems: 5, Increase, ')).to.equal(undefined) // 数か V[n]
    expect(exp('<ChangeItems: 5, Increase, V[').kind).to.equal('variable')
    expect(exp('こんにちは\\V[').kind).to.equal('variable')
    expect(exp('こんにちは\\N[1').typed).to.equal('1')
  })

  it('lets the writer type a name to filter, and replaces it', function () {
    const e = exp('<Switch: シャチ')
    expect(e).to.eql({ kind: 'switch', typed: 'シャチ', start: 9 })
  })

  it('offers face sheets first, then the face number of that sheet', function () {
    expect(exp('<Face: su')).to.eql({ kind: 'face', typed: 'su', start: 7 })
    expect(exp('<Face: suzu1(')).to.eql({ kind: 'face', typed: '', start: 13, faceName: 'suzu1' })
  })

  it('stays quiet outside a tag', function () {
    expect(exp('<Switch: 79, ON> ')).to.equal(undefined)
    expect(exp('こんにちは')).to.equal(undefined)
  })
})

describe('tagRefs writes', function () {
  it('marks where a switch or a variable is changed, and not where it is read', function () {
    const writes = (line) => findRefs(line).map((r) => [r.kind, r.id, !!r.write])
    expect(writes('<Switch: 3-5, ON>')).to.eql([['switch', 3, true]])
    expect(writes('<SwitchOn: 128>')).to.eql([['switch', 128, true]])
    expect(writes('<Set: 5, V[20]>')).to.eql([['variable', 5, true], ['variable', 20, false]])
    expect(writes('<If: Switches[3], ON>')).to.eql([['switch', 3, false]])
    expect(writes('<If: V[2], >=, V[9]>')).to.eql([['variable', 2, false], ['variable', 9, false]])
  })
})
