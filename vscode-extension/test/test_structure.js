const { expect } = require('chai')
const { readStructure, foldingRanges, labelLine } = require('../out/db/structure')

const brief = (nodes) => nodes.map((n) => {
  const out = [n.kind, n.label, n.startLine, n.endLine]
  if (n.children.length) out.push(brief(n.children))
  return out
})

describe('structure', function () {
  it('nests choices, branches and loops and closes them at <End>', function () {
    const lines = [
      '---', 'kind: event', '---', // 0-2
      '<ShowChoices: Window, Right, 1, 2>', // 3
      '<When: はい>', // 4
      'そうですか！', // 5
      '<If: Switches[1], ON>', // 6
      'スイッチがON', // 7
      '<Else>', // 8
      'スイッチがOFF', // 9
      '<End>', // 10
      '<When: いいえ>', // 11
      '残念です。', // 12
      '<End>', // 13
      '<Loop>', // 14
      '<BreakLoop>', // 15
      '<RepeatAbove>' // 16
    ]
    expect(brief(readStructure(lines))).to.eql([
      ['choices', '選択肢: Window, Right, 1, 2', 3, 13, [
        ['when', 'はい', 4, 10, [
          ['message', 'そうですか！', 5, 5],
          ['if', '条件分岐: Switches[1], ON', 6, 10, [
            ['message', 'スイッチがON', 7, 7],
            ['else', 'それ以外のとき', 8, 9, [['message', 'スイッチがOFF', 9, 9]]]
          ]]
        ]],
        ['when', 'いいえ', 11, 12, [['message', '残念です。', 12, 12]]]
      ]],
      ['loop', 'ループ', 14, 16]
    ])
  })

  it('groups message lines with the face and name before them', function () {
    const lines = [
      '<Face: Actor1(2)>',
      '<Name: 涼風青葉>',
      '一行目',
      '二行目',
      '',
      '<Face: Actor1(0)>',
      '別のメッセージ',
      '<Wait: 60>',
      'ウェイトのあと'
    ]
    const nodes = readStructure(lines)
    expect(brief(nodes)).to.eql([
      ['message', '一行目', 2, 3],
      ['message', '別のメッセージ', 6, 6],
      ['message', 'ウェイトのあと', 8, 8]
    ])
    expect([nodes[0].name, nodes[0].faceName, nodes[0].faceIndex]).to.eql(['涼風青葉', 'Actor1', 2])
    expect([nodes[1].name, nodes[1].faceName, nodes[1].faceIndex]).to.eql([undefined, 'Actor1', 0])
    expect(nodes[2].faceName).to.equal(undefined)
  })

  it('does not read tags inside comments and scripts, and folds those blocks', function () {
    const lines = [
      '<comment>', // 0
      '* オープニング', // 1
      '<If: Switches[1], ON>', // 2
      '</comment>', // 3
      '<script>', // 4
      'const a = 1', // 5
      '</script>', // 6
      '% <ShowChoices: はい>', // 7
      '<comment>一行の注釈</comment>', // 8
      '% 注釈のあとの行', // 9
      'セリフ' // 10
    ]
    const nodes = readStructure(lines)
    expect(brief(nodes)).to.eql([
      ['comment', '注釈: オープニング', 0, 3],
      ['script', 'スクリプト', 4, 6],
      ['comment', '注釈', 8, 8],
      ['message', 'セリフ', 10, 10]
    ])
    expect(foldingRanges(nodes)).to.eql([{ start: 0, end: 3, comment: true }, { start: 4, end: 6, comment: false }])
  })

  it('closes what is left open at the end, and reads battle branches and labels', function () {
    const lines = [
      '<BattleProcessing: Direct, 1>',
      '<IfWin>',
      '勝った',
      '<IfLose>',
      '負けた',
      '<End>',
      '<Label: 開始>',
      '<If: Switches[2], ON>',
      '閉じ忘れ'
    ]
    expect(brief(readStructure(lines))).to.eql([
      ['battle', '戦闘の処理: Direct, 1', 0, 5, [
        ['battleBranch', '勝ったとき', 1, 2, [['message', '勝った', 2, 2]]],
        ['battleBranch', '負けたとき', 3, 4, [['message', '負けた', 4, 4]]]
      ]],
      ['label', 'ラベル: 開始', 6, 6],
      ['if', '条件分岐: Switches[2], ON', 7, 8, [['message', '閉じ忘れ', 8, 8]]]
    ])
    expect(labelLine(lines, '開始')).to.equal(6)
    expect(labelLine(lines, '無い')).to.equal(-1)
  })

  it('accepts the Japanese and short names', function () {
    const lines = ['<選択肢の表示: ウィンドウ, 右, 1, 2>', '<選択肢: はい>', '<キャンセルのとき>', '<分岐終了>', '<ループ>', '<RA>']
    expect(brief(readStructure(lines))).to.eql([
      ['choices', '選択肢: ウィンドウ, 右, 1, 2', 0, 3, [['when', 'はい', 1, 1], ['when', 'キャンセルのとき', 2, 2]]],
      ['loop', 'ループ', 4, 5]
    ])
  })
})
