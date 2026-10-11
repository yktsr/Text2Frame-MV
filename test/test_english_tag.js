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

/* 畳み方は toEnglishTag の1か所に寄せてある。未設定のときどちらに寄せるかだけは入口で違い、
 * プラグインパラメータだけ「未設定なら日本語」(この設定が無かった頃からの扱い)を残している。
 * パラメータは読み込み時に1度だけ読まれるので、別のプロセスで確かめる。 */
describe('english tag from the plugin parameter', function () {
  const show = function (parameter) {
    const code = 'const { installEngine } = require("./test/helpers");' +
      'installEngine({ EnglishTag: ' + parameter + ' });' +
      'const f = require("./Frame2Text.js");' +
      'process.stdout.write(f.decompile([{ code: 121, indent: 0, parameters: [1, 1, 0] }], undefined, { pretty: true }))'
    const r = cp.spawnSync(process.execPath, ['-e', code], { cwd: ROOT, encoding: 'utf8' })
    expect(r.status, r.stderr).to.equal(0)
    return r.stdout
  }

  it('writes English when the parameter says true', function () {
    expect(show('"true"')).to.contain('<Switch: 1, ON>')
  })

  it('writes Japanese when the parameter says false', function () {
    expect(show('"false"')).to.contain('<スイッチ: 1, オン>')
  })

  it('writes Japanese when the parameter is not set at all', function () {
    expect(show('undefined')).to.contain('<スイッチ: 1, オン>')
    expect(show('""')).to.contain('<スイッチ: 1, オン>')
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

  /* 以前は batch だけ述語が違い(=== 'true')、-w TRUE や -w 1 で日本語になっていた。 */
  it('--mode batch treats anything but "false" as English', function () {
    run(['-m', 'batch', '-d', 'data', '-t', 'text', '-w', 'TRUE', '--scope', 'nonempty'])
    const dir = path.join(tmp, 'text')
    const file = fs.readdirSync(dir).filter(function (f) { return /\.txt$/.test(f) })[0]
    expect(fs.readFileSync(path.join(dir, file), 'utf8')).to.contain('<Switch: 1, ON>')
  })

  it('--mode decompile follows -w, and writes English without it', function () {
    japanese(run(['-m', 'decompile', '-w', 'false'], mapData))
    expect(run(['-m', 'decompile'], mapData)).to.contain('<Switch: 1, ON>')
  })
})

/* ツクールの中の同期(START_DATA_SYNC)の取り出し側は、Frame2Text の設定を読む。
 * 以前はここだけ Laurus.Text2Frame.EnglishTag という「誰も代入しない名前」を読んでいて、
 * 設定を切っても常に英語で書き出していた。見張りを張って駆動すると非同期で不安定な
 * 試験になるので、壊れていた性質(存在しない名前を読む)をソースで固定する。
 * ソースを直に見る検査は test_l10n.js / test_grammar.js と同じ流儀。 */
describe('english tag in the in-game sync', function () {
  const source = fs.readFileSync(path.join(ROOT, 'Text2Frame.js'), 'utf8')

  it('does not read an english tag that nothing assigns', function () {
    expect(source).to.not.contain('Laurus.Text2Frame.EnglishTag')
  })

  it('reads it from the Frame2Text namespace instead', function () {
    expect(source).to.contain('Laurus.Frame2Text && Laurus.Frame2Text.EnglishTag')
  })
})

/* t2f-sync の公開 API。CLI は自分で畳んでから渡すが、ライブラリとして呼ぶ人は
 * CLI から受けた文字列をそのまま渡す。以前はここで真偽値に変換していたため、
 * 'false' が truthy のまま通って英語になっていた。 */
describe('english tag through t2f-sync', function () {
  const sync = require('../t2f-sync.js')
  let tmp
  let cwd

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-sync-tag-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, { id: 1, name: 'EV001', pages: [{ list: list.concat([{ code: 0, indent: 0, parameters: [] }]) }] }]
    }), 'utf8')
    cwd = process.cwd()
    process.chdir(tmp)
  })
  afterEach(function () {
    process.chdir(cwd)
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  const pulled = function (englishTag) {
    const target = frame2text.enumerateTargets('data', { scope: 'nonempty' })[0]
    const r = sync.pullTarget(target, { root: tmp, dataDir: 'data', textDir: 'text', englishTag, strategy: 'overwrite' })
    expect(r.ok, r.error).to.equal(true)
    return fs.readFileSync(r.textPath, 'utf8')
  }

  it('takes the string "false" as Japanese', function () {
    expect(pulled('false')).to.contain('<スイッチ: 1, オン>')
  })

  it('takes the boolean false as Japanese', function () {
    expect(pulled(false)).to.contain('<スイッチ: 1, オン>')
  })

  it('writes English when nothing is asked for', function () {
    expect(pulled(undefined)).to.contain('<Switch: 1, ON>')
  })
})
