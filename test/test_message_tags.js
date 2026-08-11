const chai = require('chai')
const expect = chai.expect
const fs = require('fs')

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
globalThis.$gameMessage = { add: function () {} }
// プラグインパラメータは読み込み時に一度だけ読まれる。既定を変えた場合の確認は
// test_message_tags_custom_defaults.js で行う(読み込み前に差し替える必要があるため)。
const params = {
  'Default Window Position': 'Bottom',
  'Default Background': 'Window',
  'Comment Out Char': '%',
  IsOverwrite: 'false',
  'Default Scenario Folder': 'text',
  'Default Scenario File': 'message.txt',
  'Default Common Event ID': '1',
  'Default MapID': '1',
  'Default EventID': '1',
  'Default PageID': '1',
  IsDebug: 'false',
  DisplayMsg: 'false',
  DisplayWarning: 'false',
  EnglishTag: 'true',
  OmitDefaultTags: 'true'
}
globalThis.PluginManager = {
  parameters: function () { return params },
  registerCommand: function () {}
}
const text2frame = require('../Text2Frame.js')
const frame2text = require('../Frame2Text.js')

/* 取り出したテキストは、メッセージごとに
 *   <Face: (0)><Background: Window><WindowPosition: Bottom>
 * が付く。実プロジェクトでは「文章の表示」の 43.8% がこの3つとも既定値で、
 * タグ行がまるごと雑音になっている。既定と同じなら書かないようにする。
 *
 * 省略してよいのは「タグが無いとき compile が補う値」と同じときだけ。
 * 出荷時の既定を基準にすると、パラメータを変えているプロジェクトで中身が変わってしまう。 */
describe('omitting message tags that match the defaults', function () {
  const bottom = { code: 0, indent: 0, parameters: [] }
  const msg = function (face, faceId, background, position, name, text) {
    return [
      { code: 101, indent: 0, parameters: [face, faceId, background, position, name] },
      { code: 401, indent: 0, parameters: [text] }
    ]
  }
  const out = function (list, options) {
    return frame2text.decompile(list.concat([bottom]), true,
      Object.assign({ pretty: true }, options))
  }
  // 取り出したテキストを取り込み直すと元のコマンドに戻る、が守るべき性質。
  const expectRoundTrip = function (list, options) {
    expect(text2frame.compile(out(list, options))).to.eql(list)
  }
  it('drops the whole tag line when face, background and position are all default', function () {
    const list = msg('', 0, 0, 2, '', 'こんにちは')

    expect(out(list)).to.equal('こんにちは')
    expectRoundTrip(list)
  })

  it('keeps only the tag that differs', function () {
    expect(out(msg('Actor1', 2, 0, 2, '', 'こんにちは'))).to.equal('<Face: Actor1(2)>\nこんにちは')
    expect(out(msg('', 0, 1, 2, '', 'こんにちは'))).to.equal('<Background: Dim>\nこんにちは')
    expect(out(msg('', 0, 0, 0, '', 'こんにちは'))).to.equal('<WindowPosition: Top>\nこんにちは')
    expectRoundTrip(msg('Actor1', 2, 0, 2, '', 'こんにちは'))
    expectRoundTrip(msg('', 0, 1, 2, '', 'こんにちは'))
  })

  it('always keeps the name tag', function () {
    expect(out(msg('', 0, 0, 2, 'アリス', 'こんにちは'))).to.equal('<Name: アリス>\nこんにちは')
    expectRoundTrip(msg('', 0, 0, 2, 'アリス', 'こんにちは'))
  })

  it('reports the defaults compile will fill in', function () {
    expect(text2frame.getMessageDefaults()).to.eql({ background: 0, windowPosition: 2 })
  })

  /* Text2Frame が無いと何を補われるか分からないので背景・位置は省略できない。
   * 顔だけはパラメータが無く compile が必ず ''/0 を補うので、単独でも省略してよい。 */
  it('does not omit background or position when Text2Frame is unavailable', function () {
    const saved = globalThis.$LaurusText2Frame
    // resolveText2Frame が拾える形にしつつ、既定を答えられない古い版を模す。
    globalThis.$LaurusText2Frame = { saveBaseText: function () {} }
    try {
      expect(out(msg('', 0, 0, 2, '', 'あ'))).to.equal('<Background: Window><WindowPosition: Bottom>\nあ')
    } finally {
      globalThis.$LaurusText2Frame = saved
    }
  })

  it('still separates consecutive messages into their own windows', function () {
    const two = msg('', 0, 0, 2, '', '一つ目').concat(msg('', 0, 0, 2, '', '二つ目'))

    // 区切りは空行が担う。詰めて書くと1つのウィンドウの2行になってしまう。
    expect(out(two)).to.equal('一つ目\n\n二つ目')
    expectRoundTrip(two)
  })

  it('handles an empty message, a preceding command and a choice branch', function () {
    expectRoundTrip([{ code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [''] }])
    expectRoundTrip([{ code: 121, indent: 0, parameters: [1, 1, 0] }]
      .concat(msg('', 0, 0, 2, '', 'こんにちは')))
    expectRoundTrip([
      { code: 102, indent: 0, parameters: [['はい'], 1, 0, 2, 0] },
      { code: 402, indent: 0, parameters: [0, 'はい'] },
      { code: 101, indent: 1, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 1, parameters: ['うん'] },
      { code: 0, indent: 1, parameters: [] },
      { code: 404, indent: 0, parameters: [] }
    ].concat(msg('', 0, 0, 2, '', 'こんにちは')))
  })

  it('writes every tag when the option is off', function () {
    const list = msg('', 0, 0, 2, '', 'こんにちは')

    expect(out(list, { omitDefaults: false }))
      .to.equal('<Face: (0)><Background: Window><WindowPosition: Bottom>\nこんにちは')
    expectRoundTrip(list, { omitDefaults: false })
  })

  /* buildPullText の統合(merge)は Text2Frame.applyMergePull を経由して本文を作る。
   * 上書きの経路だけに option を通すと、VS Code の「ゲームから取り出す」(既定=統合)で
   * 設定が効かないという分かりにくい壊れ方をする。両方の経路で効くことを確かめる。 */
  describe('the option reaches both buildPullText strategies', function () {
    const header = '---\nkind: common\ncommonEventId: 1\n---\n'
    const list = msg('', 0, 0, 2, '', 'こんにちは').concat([bottom])
    const full = '<Face: (0)><Background: Window><WindowPosition: Bottom>'
    const pull = function (strategy, omitDefaults, existingText) {
      return frame2text.buildPullText({
        list,
        strategy,
        omitDefaults,
        existingText: existingText || '',
        baseText: existingText || '',
        fallbackHeader: header
      }).text
    }

    it('omits on both when on', function () {
      expect(pull('overwrite', true), 'overwrite').to.not.contain(full)
      // 既存テキストと祖先があってはじめて 3-way に入る(無ければ素の取り出しと同じ経路)。
      expect(pull('merge', true, header + 'こんにちは\n'), 'merge').to.not.contain(full)
    })

    it('keeps every tag on both when off', function () {
      expect(pull('overwrite', false), 'overwrite').to.contain(full)
      expect(pull('merge', false, header + full + '\nこんにちは\n'), 'merge').to.contain(full)
    })
  })

  /* 省略は見た目だけの話で、取り込んだ結果は変わってはいけない。
   * 手元のテストデータ全件で、省略ON/OFF が同じコマンド列に戻ることを確かめる。 */
  it('produces the same commands with and without omission, across all fixtures', function () {
    const cases = require('./test_cases.js')
    const seen = {}
    let checked = 0
    cases.forEach(function (t) {
      if (seen[t.expfile]) return
      seen[t.expfile] = true
      let data
      try { data = JSON.parse(fs.readFileSync(t.expfile, 'utf8')) } catch (e) { return }
      const lists = []
      if (Array.isArray(data)) data.forEach(function (ce) { if (ce && ce.list) lists.push(ce.list) })
      else if (data.events) {
        data.events.forEach(function (ev) {
          if (ev && ev.pages) ev.pages.forEach(function (p) { if (p.list) lists.push(p.list) })
        })
      }
      lists.forEach(function (list) {
        let on, off
        try {
          on = frame2text.decompile(list, true, { pretty: true, omitDefaults: true })
          off = frame2text.decompile(list, true, { pretty: true, omitDefaults: false })
        } catch (e) { return }
        checked++
        expect(text2frame.compile(on), t.expfile).to.eql(text2frame.compile(off))
      })
    })
    expect(checked, '検査したページが0件では意味がない').to.be.greaterThan(20)
  })
})
