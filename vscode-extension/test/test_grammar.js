const { expect } = require('chai')
const fs = require('fs')
const { compilerTagNames, applyNames, render, COMPILER, GRAMMAR } = require('../scripts/update-grammar')

// 突き合わせの相手。リポジトリ直下のコンパイラそのもの。
const T2F = require(COMPILER)

const source = fs.readFileSync(COMPILER, 'utf8')
const names = compilerTagNames(source)
const all = [].concat(names.message, names.event, names.block.script, names.block.comment, names.block.scrolling)

/* コンパイラがその名前をタグとして受け付けるか。知らないタグはその行が文章(401)として
 * そのまま残るので、残らない(別のコマンドになる・引数の誤りで止まる)なら受け付けている。
 * 引数の形はタグごとに違うので、いくつかの形を試す。ブロックのタグは閉じタグと対で試す。 */
const accepts = function (name) {
  const texts = ['<' + name + '>', '<' + name + ': 1>', '<' + name + ': 1, 1>', '<' + name + ': 1, 1, 1>', '<' + name + ': A, ON>',
    '<' + name + '>\nx\n</' + name + '>']
  return texts.some(function (text) {
    const head = text.split('\n')[0]
    try {
      return !T2F.compile(text).some(function (c) { return c.code === 401 && c.parameters[0] === head })
    } catch (e) {
      return true
    }
  })
}

describe('syntax grammar tag names', function () {
  it('are up to date with the compiler (run `npm run update-grammar` if this fails)', function () {
    const current = fs.readFileSync(GRAMMAR, 'utf8')
    expect(render(applyNames(JSON.parse(current), names)) === current).to.equal(true)
  })

  it('are all accepted by the compiler as tags', function () {
    // でたらめな引数を渡すので、コンパイラが console に出す注意は黙らせる。
    const saved = { log: console.log, warn: console.warn, error: console.error }
    console.log = console.warn = console.error = function () {}
    let unknown, rejected
    try {
      unknown = accepts('Foo')
      rejected = all.filter(function (n) { return !accepts(n) })
    } finally {
      Object.assign(console, saved)
    }
    expect(unknown, 'an unknown tag stays message text').to.equal(false)
    expect(rejected).to.eql([])
  })

  it('cover the tags that were missing from the hand-written list', function () {
    const lower = all.map(function (n) { return n.toLowerCase() })
    const expected = ['wait', 'ウェイト', 'throughon', 'すり抜けon', 'moveleft', 'turn180', 'br', 'skip', 'skipend',
      'sw', 'ssw', '=', '/', 'timer', 'タイマー', 'co', 'sc', 'sst', 'plugincommandmz']
    expect(expected.filter(function (n) { return !lower.includes(n) })).to.eql([])
  })

  it('leave out names that only appear inside values', function () {
    // <Set: 1, GameData[Gold]> の GameData は値の書き方で、タグではない。
    const lower = all.map(function (n) { return n.toLowerCase() })
    expect(['gd', 'gamedata', 'ゲームデータ'].filter(function (n) { return lower.includes(n) })).to.eql([])
  })

  it('keep the message settings apart from the event commands', function () {
    expect(names.message.map(function (n) { return n.toLowerCase() }).sort())
      .to.eql(['background', 'bg', 'face', 'fc', 'name', 'nm', 'windowposition', 'wp', '位置', '名前', '背景', '顔'].sort())
    expect(names.block).to.eql({
      script: ['script', 'sc', 'スクリプト'],
      comment: ['comment', 'co', '注釈'],
      scrolling: ['ShowScrollingText', 'sst', '文章のスクロール表示']
    })
  })
})
