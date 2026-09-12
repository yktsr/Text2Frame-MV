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
const compiled = function (line, tail) {
  return T2F.compile(line + (tail || '')).reduce(function (acc, c) { return acc.concat(commandRefs(c)) }, [])
}

/* 表(タグの別名)がコンパイラとずれていないことを、コンパイラに訊いて確かめる。
 * コンパイラ側で書き方が変わればここが落ちるので、表だけが黙って古くなることがない。 */
describe('tagRefs agrees with the compiler', function () {
  const cases = [
    // [行, コンパイルに通すときに足す続き]
    ['<Face: suzu1(4)>', '\nこんにちは'],
    ['<FC: Actor1(7)>', '\nx'],
    ['<顔: ruru1(0)>', '\nx'],
    ['<Switch: 79, ON>'],
    ['<SW: 3-5, OFF>'],
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
    ['<アニメーションの表示: プレイヤー, 5, ON>']
  ]

  cases.forEach(function (c) {
    it(c[0], function () {
      const fromText = shape(expand(findRefs(c[0])))
      expect(fromText, 'テキスト側で何も拾えていない').to.not.be.empty
      expect(fromText).to.eql(shape(compiled(c[0], c[1])))
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
    expect(at('<Face: suzu1(4)>', findRefs('<Face: suzu1(4)>')[0])).to.equal('suzu1(4)')
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
    expect(findRefs('こんにちは \\V[3] さん')).to.eql([]) // 文章中の制御文字は対象外
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
})

describe('expectedAt', function () {
  const exp = function (s) { return expectedAt(s, s.length) }

  it('knows which kind of number goes at the cursor', function () {
    expect(exp('<Switch: ').kind).to.equal('switch')
    expect(exp('<SW: 7').typed).to.equal('7')
    expect(exp('<Set: ').kind).to.equal('variable')
    expect(exp('<Set: 1, V[').kind).to.equal('variable')
    expect(exp('<If: Switches[').kind).to.equal('switch')
    expect(exp('<If: Items[').kind).to.equal('item')
    expect(exp('<CommonEvent: ').kind).to.equal('commonEvent')
    expect(exp('<TransferPlayer: Direct[').kind).to.equal('map')
    expect(exp('<ShowAnimation: This Event, ').kind).to.equal('animation')
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
