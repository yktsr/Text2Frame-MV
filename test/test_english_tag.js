const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { installEngine } = require('./helpers')

installEngine()
const text2frame = require('../Text2Frame.js')
const frame2text = require('../Frame2Text.js')

const ROOT = path.resolve(__dirname, '..')

/* 英語タグの指定は、タグ名だけでなく値(オン・変数[7]・上 など)にも効く。
 * 値を組み立てる関数は decompile の本体の外にあり、以前は読み込み時の言語で固定されて
 * いたため、ライブラリ・CLI・同期・VSCode 拡張では日本語を頼んでも値が英語で出ていた。 */
const list = [
  { code: 121, indent: 0, parameters: [1, 1, 0] }, // スイッチの操作: 1 を ON
  { code: 122, indent: 0, parameters: [3, 3, 0, 1, 7] }, // 変数の操作: 3 に 変数[7] を代入
  { code: 111, indent: 0, parameters: [0, 1, 0] }, // 条件分岐: スイッチ[1] が ON
  { code: 121, indent: 1, parameters: [2, 2, 1] }, // 分岐の中: スイッチの操作: 2 を OFF
  { code: 0, indent: 1, parameters: [] }, // 分岐の終端(ツクールが必ず置く)
  { code: 412, indent: 0, parameters: [] },
  { code: 101, indent: 0, parameters: ['Actor1', 0, 0, 0, 'Alice'] }, // 文章の表示(背景も位置も既定以外)
  { code: 401, indent: 0, parameters: ['やあ'] }
]
// 既定どおりのタグを省く設定は別の話なので、ここでは切って言語だけを見る。
const out = function (englishTag) {
  return frame2text.decompile(list, englishTag, { pretty: true, omitDefaults: false })
}

describe('english tag', function () {
  it('writes tag names and values in English', function () {
    const text = out(true)
    expect(text).to.contain('<Switch: 1, ON>')
    expect(text).to.contain('<Switch: 2, OFF>')
    expect(text).to.contain('<Set: 3, Variables[7]>')
    expect(text).to.contain('<If: Switches[1], ON>')
    expect(text).to.contain('<End>')
    expect(text).to.contain('<Background: Window>')
    expect(text).to.contain('<WindowPosition: Top>')
  })

  it('writes tag names and values in Japanese', function () {
    const text = out(false)
    expect(text).to.contain('<スイッチ: 1, オン>')
    expect(text).to.contain('<スイッチ: 2, オフ>')
    expect(text).to.contain('<代入: 3, 変数[7]>')
    expect(text).to.contain('<条件分岐: スイッチ[1], オン>')
    expect(text).to.contain('<分岐終了>')
    expect(text).to.contain('<背景: ウインドウ>')
    expect(text).to.contain('<位置: 上>')
  })

  /* 値を組み立てる関数が1つでも取り残されていれば、日本語を頼んだ出力に英語の語が残る。 */
  it('leaves no English word behind when Japanese is asked for', function () {
    const text = out(false)
    ;['ON', 'OFF', 'Switches[', 'Variables[', 'Top', 'Middle', 'Bottom', 'Window'].forEach(function (word) {
      expect(text, word).to.not.contain(word)
    })
  })

  /* プラグインコマンドの引数と CLI の -w は文字列で届く。'false' は truthy なので、
   * 畳まないと「日本語で」という指定がそのまま無視される。 */
  it('takes the strings "true" and "false" as well as the booleans', function () {
    expect(out('false')).to.equal(out(false))
    expect(out('true')).to.equal(out(true))
  })

  it('keeps the plugin parameter when the argument is omitted', function () {
    expect(frame2text.decompile(list, undefined, { pretty: true, omitDefaults: false })).to.equal(out(true))
  })

  /* 1回の呼び出しの指定が次の呼び出しに残らないこと(呼び出しの間だけ差し替えている)。 */
  it('does not let one call leak into the next', function () {
    out(false)
    expect(out(true)).to.contain('<Switch: 1, ON>')
    out(true)
    expect(out(false)).to.contain('<スイッチ: 1, オン>')
  })

  it('imports back to the same commands in either language', function () {
    expect(text2frame.commandsEqual(list, text2frame.compile(out(true)))).to.equal(true)
    expect(text2frame.commandsEqual(list, text2frame.compile(out(false)))).to.equal(true)
  })
})

describe('english tag from the command line', function () {
  const CLI = path.join(ROOT, 'Frame2Text.js')
  const mapData = JSON.stringify({
    events: [null, { id: 1, name: 'EV001', pages: [{ list: list.concat([{ code: 0, indent: 0, parameters: [] }]) }] }]
  })
  let tmp

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-entag-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), mapData)
  })
  afterEach(function () { fs.rmSync(tmp, { recursive: true, force: true }) })

  const run = function (args, input) {
    const r = cp.spawnSync('node', [CLI].concat(args), { cwd: tmp, encoding: 'utf8', input })
    expect(r.status, r.stderr).to.equal(0)
    return r.stdout
  }
  const japanese = function (text) {
    expect(text).to.contain('<スイッチ: 1, オン>')
    expect(text).to.contain('<代入: 3, 変数[7]>')
    expect(text).to.not.contain('<Switch:')
    expect(text).to.not.contain('Variables[')
  }

  it('--mode map follows -w', function () {
    run(['-m', 'map', '-i', 'data/Map001.json', '-e', '1', '-o', 'out.txt', '-w', 'false'])
    japanese(fs.readFileSync(path.join(tmp, 'out.txt'), 'utf8'))
  })

  it('--mode batch follows -w', function () {
    run(['-m', 'batch', '-d', 'data', '-t', 'text', '-w', 'false', '--scope', 'nonempty'])
    const dir = path.join(tmp, 'text')
    const file = fs.readdirSync(dir).filter(function (f) { return /\.txt$/.test(f) })[0]
    japanese(fs.readFileSync(path.join(dir, file), 'utf8'))
  })

  it('--mode decompile follows -w, and writes English without it', function () {
    japanese(run(['-m', 'decompile', '-w', 'false'], mapData))
    expect(run(['-m', 'decompile'], mapData)).to.contain('<Switch: 1, ON>')
  })
})
