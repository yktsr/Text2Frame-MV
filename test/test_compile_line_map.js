const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')

const T2F = require('../Text2Frame.js')

/* compile(text, { lineMap: true }) は、コマンドごとに「テキストの何行目から出たか」を返す。
 * エディタ拡張のプレビューがカーソルとコマンドを結ぶのに使う。
 * % 行は取り除かれ、<script> などの複数行ブロックは1行に畳まれてから解釈されるので、
 * 解釈中の行番号は元の行番号と一致しない。それを元に戻せていることを確かめる。 */
describe('compile with lineMap', function () {
  const mapped = function (text) {
    const r = T2F.compile(text, { lineMap: true })
    expect(r.lineMap).to.have.lengthOf(r.commands.length)
    return r.commands.map(function (c, k) { return [c.code, r.lineMap[k]] })
  }

  it('leaves the default output exactly as it was, for every fixture', function () {
    const cases = require('./test_cases.js')
    cases.forEach(function (c) {
      const text = fs.readFileSync(path.resolve(__dirname, '..', c.infile), 'utf8')
      const plain = T2F.compile(text)
      expect(Array.isArray(plain), c.title).to.equal(true)
      expect(T2F.compile(text, { lineMap: true }).commands, c.title).to.eql(plain)
    })
  })

  it('maps each command to its own line', function () {
    expect(mapped('<Switch: 1, ON>\n<Wait: 60>\n<Switch: 3, OFF>')).to.eql([[121, 0], [230, 1], [121, 2]])
  })

  it('skips the lines taken out by the comment-out character', function () {
    expect(mapped('<Switch: 1, ON>\n% <Switch: 2, ON>\n%\n<Switch: 3, ON>')).to.eql([[121, 0], [121, 3]])
  })

  it('maps the lines after a multi-line block back to where they were', function () {
    const text = [
      '<Switch: 1, ON>', //    0
      '<script>', //           1
      'a()', //                2
      'b()', //                3
      '</script>', //          4
      '<Switch: 5, ON>' //     5
    ].join('\n')
    // ブロックのコマンドは開始タグの行に対応させる。
    expect(mapped(text)).to.eql([[121, 0], [355, 1], [655, 1], [121, 5]])
  })

  it('handles comment and scrolling-text blocks, and a message after them', function () {
    const text = [
      '<comment>', //                     0
      'メモ', //                           1
      '</comment>', //                    2
      '<ShowScrollingText: 2, OFF>', //   3
      '流れる文', //                       4
      '</ShowScrollingText>', //          5
      'こんにちは' //                       6
    ].join('\n')
    expect(mapped(text)).to.eql([[108, 0], [105, 3], [405, 3], [101, 6], [401, 6]])
  })

  it('keeps the text before and after a block on the same line', function () {
    expect(mapped('<Switch: 1, ON><comment>note</comment><Switch: 2, ON>\n<Wait: 1>'))
      .to.eql([[121, 0], [108, 0], [121, 0], [230, 1]])
  })

  it('handles one block closing and the next opening on the same line', function () {
    const text = [
      '<script>', //              0
      'a()', //                   1
      '</script><script>', //     2
      'b()', //                   3
      '</script>', //             4
      '<Switch: 9, ON>' //        5
    ].join('\n')
    expect(mapped(text)).to.eql([[355, 0], [355, 2], [121, 5]])
  })

  it('counts CRLF lines the same as LF lines', function () {
    expect(mapped('<Switch: 1, ON>\r\n% x\r\n<Switch: 2, ON>')).to.eql([[121, 0], [121, 2]])
  })

  it('puts the commands added to close an unclosed branch on the last line', function () {
    const r = mapped('<If: Switches[1], ON>\n<Switch: 2, ON>')
    expect(r.slice(0, 2)).to.eql([[111, 0], [121, 1]])
    r.slice(2).forEach(function (x) { expect(x[1]).to.equal(1) })
  })
})
