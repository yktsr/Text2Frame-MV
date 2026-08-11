const chai = require('chai')
const expect = chai.expect

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
globalThis.$gameMessage = { add: function () {} }
globalThis.PluginManager = {
  parameters: function () {
    return {
      'Default Window Position': 'Bottom',
      'Default Background': 'Window',
      'Default Scenario Folder': 'text',
      'Default Scenario File': 'message.txt',
      'Default Common Event ID': '1',
      'Default MapID': '1',
      'Default EventID': '1',
      'Default PageID': '1',
      IsOverwrite: 'false',
      'Comment Out Char': '%',
      IsDebug: 'false'
    }
  },
  registerCommand: function () {}
}
const T2F = require('../Text2Frame.js')

/* コメント行(既定は %)は compile が落とすのでコマンド列に残らない。元テキストが手元に
 * ある経路(書き戻し・取り出し)だけは、行の対応を取って元の位置へ戻せる。
 *
 * この関数の安全の根拠は精度ではなく「% はコンパイル対象外」であること。だから
 * どこへ入れても取り込み結果は変わらず、最悪でもテキストの中で位置がずれるだけ。
 * その不変条件を毎回確かめる。 */
describe('restoreCommentOutLines', function () {
  const restore = function (original, regenerated) {
    return T2F.restoreCommentOutLines(original, regenerated, '%')
  }
  // 復元結果から % を抜くと、必ず元の再生成テキストに戻ること。
  const strip = function (text) {
    return text.split('\n').filter(function (l) { return !/^ *%/.test(l) }).join('\n')
  }
  const check = function (original, regenerated) {
    const r = restore(original, regenerated)
    expect(strip(r.text), 'コメントを抜くと再生成テキストに戻る').to.equal(regenerated)
    return r
  }

  it('leaves a text without comments untouched', function () {
    const r = restore('こんにちは\n\nさようなら\n', 'こんにちは\n\nさようなら\n')

    expect(r.text).to.equal('こんにちは\n\nさようなら\n')
    expect(r.approximate).to.equal(0)
  })

  it('puts the comment back where it was when nothing changed', function () {
    const original = '% 一幕: 酒場\nこんにちは\n\nさようなら\n'
    const regenerated = 'こんにちは\n\nさようなら\n'

    const r = check(original, regenerated)

    expect(r.text).to.equal(original)
    expect(r.approximate).to.equal(0)
  })

  /* % は続く内容へのメモとして書かれるので、後ろの行が第一のアンカー。
   * ゲームが別の場所に足しても、メモは元の「次の行」に付いたまま。 */
  it('stays attached to the line that follows it when the game adds elsewhere', function () {
    const original = 'はじめ\n\n% 二幕: 港\nこんにちは\n'
    const regenerated = 'はじめ\n\nゲームが足した\n\nこんにちは\n'

    const r = check(original, regenerated)

    const lines = r.text.split('\n')
    expect(lines[lines.indexOf('% 二幕: 港') + 1]).to.equal('こんにちは')
  })

  /* 狙った行そのものをゲームが書き換えたときは、差し替わった塊の「先頭」に置く。
   * ここを「次に残っている行の手前」にすると差し替わった内容の後ろへ落ちる。
   * 実データではこの違いだけで位置一致が 99.9% -> 71.5% まで下がった。 */
  it('lands at the head of the replacement when its anchor was rewritten', function () {
    const original = 'はじめ\n% ここはスーズの台詞\n【スーズ】\nこんにちは\n'
    const regenerated = 'はじめ\n【クリス】\nやあ\nこんにちは\n'

    const r = check(original, regenerated)

    const lines = r.text.split('\n')
    // 差し替わった内容(【クリス】)の手前。後ろではない。
    expect(lines[lines.indexOf('% ここはスーズの台詞') + 1]).to.equal('【クリス】')
  })

  it('keeps consecutive comments in their original order', function () {
    const original = '% 一行目\n% 二行目\n% 三行目\nこんにちは\n'
    const regenerated = 'こんにちは\n'

    const r = check(original, regenerated)

    expect(r.text).to.equal(original)
  })

  it('keeps a comment at the very top and at the very bottom', function () {
    const original = '% 先頭のメモ\nこんにちは\n% 末尾のメモ'
    const regenerated = 'こんにちは\n'

    const r = check(original, regenerated)

    expect(r.text).to.contain('% 先頭のメモ')
    expect(r.text).to.contain('% 末尾のメモ')
    expect(r.text.indexOf('% 先頭のメモ')).to.be.lessThan(r.text.indexOf('こんにちは'))
    expect(r.text.indexOf('% 末尾のメモ')).to.be.greaterThan(r.text.indexOf('こんにちは'))
  })

  /* ブロックの中でも % は行を落とす(test/45-comment-out.txt が固定している仕様)。
   * 落ちる以上、戻すのもブロックの中。 */
  it('restores a comment inside a script block', function () {
    const original = '<script>\n% ここは後で消す\nconsole.log(1)\n</script>\n'
    const regenerated = '<script>\nconsole.log(1)\n</script>\n'

    const r = check(original, regenerated)

    const lines = r.text.split('\n')
    expect(lines[lines.indexOf('% ここは後で消す') + 1]).to.equal('console.log(1)')
  })

  // 内容が丸ごと入れ替わっても消えはしない。位置があやしいことだけ知らせる。
  it('never drops a comment, even when nothing survives', function () {
    const original = '% 大事なメモ\nむかしの内容\n'
    const regenerated = 'まるごと別物\n'

    const r = check(original, regenerated)

    expect(r.text).to.contain('% 大事なメモ')
    expect(r.approximate).to.equal(1)
  })

  /* 空行しか手掛かりが残らなくても「あやしい」とは数えない。差し替わった塊の先頭に
   * 置けているため。ここを数えると、既定タグ省略への書式移行だけで実データの
   * 1696 件中 1124 件が警告になり、報告が使い物にならなくなる。 */
  it('does not cry wolf when only a blank line survives', function () {
    const original = 'むかしの一行目\n\n% メモ\nむかしの二行目\n'
    const regenerated = 'あたらしい一行目\n\nあたらしい二行目\n'

    const r = check(original, regenerated)

    expect(r.text).to.contain('% メモ')
    expect(r.approximate).to.equal(0)
    // 空行の直後(= 差し替わった塊の先頭)に置かれる。
    const lines = r.text.split('\n')
    expect(lines[lines.indexOf('% メモ') - 1]).to.equal('')
    expect(lines[lines.indexOf('% メモ') + 1]).to.equal('あたらしい二行目')
  })

  // 対応付けをあきらめる大きさでも、内容は落とさない。
  it('gives up placing but not keeping when the text is huge', function () {
    const big = new Array(2200).join('x\n')
    const original = '% 巨大ファイルのメモ\n' + big
    const regenerated = big + 'ゲームが足した\n'

    const r = check(original, regenerated)

    expect(r.text).to.contain('% 巨大ファイルのメモ')
    expect(r.approximate).to.equal(1)
  })

  // 判定は eraseCommentOutLines と同じ組み立て。行頭の空白は許し、途中の % は本文。
  it('matches the same lines that compile drops', function () {
    const original = '   % 字下げしたメモ\nこんにちは 50% 増量\n'
    const regenerated = 'こんにちは 50% 増量\n'

    const r = check(original, regenerated)

    expect(r.text).to.equal(original)
  })

  it('uses the plugin parameter when no comment char is given', function () {
    const r = T2F.restoreCommentOutLines('% メモ\nこんにちは\n', 'こんにちは\n')

    expect(r.text).to.equal('% メモ\nこんにちは\n')
  })
})
