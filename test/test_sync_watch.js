const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
const shown = []
globalThis.$gameMessage = { add: function (t) { shown.push(String(t)) } }
globalThis.PluginManager = {
  parameters: function () {
    return {
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
      DisplayMsg: 'true',
      DisplayWarning: 'true',
      EnglishTag: 'false'
    }
  },
  registerCommand: function () {}
}
require('../Text2Frame.js')
require('../Frame2Text.js')

/* 監視は実際の fs.watch とタイマーで動くので、ここだけは本物のファイルを使う。
 * デバウンス(250ms)ぶん待つ必要があるため、待ち時間は余裕をみて取る。 */
describe('START_SYNC_WATCH / STOP_SYNC_WATCH', function () {
  this.timeout(10000)
  const SETTLE = 900
  const ARM = 300

  let tmp
  let cwd
  let mainModule

  const msg = function (line) {
    return [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [line] }
    ]
  }
  const bottom = { code: 0, indent: 0, parameters: [] }
  const mapPath = function () { return path.join(tmp, 'data', 'Map001.json') }
  const textPath = function (key) { return path.join(tmp, 'text', 'ja', key + '.txt') }
  const ev1 = 'map001_event001_page1'
  const readIf = function (p) { try { return fs.readFileSync(p, 'utf8') } catch (e) { return '' } }
  const texts = function () {
    return JSON.parse(readIf(mapPath())).events[1].pages[0].list
      .filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
  }
  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms) }) }

  const start = function (strategy, direction) {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandText2Frame('START_SYNC_WATCH',
      [strategy || 'merge', direction || 'both', 'ja', path.join(tmp, 'text'), path.join(tmp, 'data')])
    return shown.slice()
  }
  /* fs.watch(macOS の FSEvents)は張った直後の変更を取りこぼす。
   * 監視が効き始めるまで少し待ってから変更を起こす。 */
  const startArmed = async function (strategy, direction) {
    const out = start(strategy, direction)
    await wait(ARM)
    return out
  }
  const stop = function () {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandText2Frame('STOP_SYNC_WATCH', [])
    return shown.slice()
  }
  /* 画面幅(半角55)を超えるメッセージは addMessage が自動で折り返すので、
   * 1つの文章が複数行にまたがる。行ごとではなく通しの文字列から探す。 */
  const line = function (out, needle) {
    const all = out.join('')
    return all.indexOf(needle) === -1 ? undefined : all
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-watch-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, { id: 1, pages: [{ list: msg('こんにちは').concat([bottom]) }] }]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'Map002.json'), JSON.stringify({
      events: [null, { id: 1, pages: [{ list: msg('やあ').concat([bottom]) }] }]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'Map003.json'), JSON.stringify({
      events: [null, { id: 1, pages: [{ list: msg('どうも').concat([bottom]) }] }]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'Map004.json'), JSON.stringify({
      events: [null, { id: 1, pages: [{ list: msg('また') .concat([bottom]) }] }]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'),
      JSON.stringify([null, { id: 1, list: [bottom] }]), 'utf8')
    // .t2f-base は cwd 基準、データは BASE_PATH 基準で解決される。両方 tmp に向ける。
    cwd = process.cwd()
    process.chdir(tmp)
    mainModule = process.mainModule
    process.mainModule = { filename: path.join(tmp, 'game.js') }
    // 監視の前に一度取り出して、見出し付きテキストと祖先をそろえておく(実際の使い方と同じ)。
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER',
      ['merge', path.join(tmp, 'data'), path.join(tmp, 'text'), 'ja'])
  })

  afterEach(function () {
    try { Game_Interpreter.prototype.pluginCommandText2Frame('STOP_SYNC_WATCH', []) } catch (e) { /* ignore */ }
    process.mainModule = mainModule
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('reports what it is watching and leaves the watcher running', function () {
    const out = start()

    expect(line(out, '同期監視を開始しました')).to.contain('both')
    expect(line(out, '監視中')).to.contain('text')
    expect(line(out, '監視中')).to.contain('data')
  })

  // 二重に監視すると同じ変更を2回処理する。開始は冪等にする。
  it('does not start a second watcher while one is running', function () {
    expect(line(start(), '同期監視を開始しました')).to.be.a('string')

    const out = start()

    expect(line(out, 'すでに動いています')).to.be.a('string')
    expect(line(out, '同期監視を開始しました')).to.equal(undefined)
    // 1回止めれば止まる(2つ動いていたら1回目の停止で終わらない)。
    expect(line(stop(), '停止しました')).to.be.a('string')
    expect(line(stop(), '動いていません')).to.be.a('string')
  })

  it('stops, and says so when nothing is running', function () {
    start()
    expect(line(stop(), '停止しました')).to.be.a('string')

    expect(line(stop(), '動いていません')).to.be.a('string')
  })

  it('applies a text edit to the game', async function () {
    await startArmed()

    fs.writeFileSync(textPath(ev1), readIf(textPath(ev1)).replace('こんにちは', 'テキストで直した'), 'utf8')
    await wait(SETTLE)

    expect(texts()).to.eql(['テキストで直した'])
  })

  it('pulls a game edit into the text', async function () {
    await startArmed()

    const map = JSON.parse(readIf(mapPath()))
    map.events[1].pages[0].list.find(function (c) { return c.code === 401 }).parameters[0] = 'ツクールで直した'
    fs.writeFileSync(mapPath(), JSON.stringify(map), 'utf8')
    await wait(SETTLE)

    expect(readIf(textPath(ev1))).to.contain('ツクールで直した')
  })

  // 反映は data を書き、取り出しは text を書く。エコーガードが無いと
  // 反映 -> data 変更 -> 取り出し -> text 変更 -> 反映 ... と回り続ける。
  it('does not bounce its own writes back and forth', async function () {
    await startArmed()

    fs.writeFileSync(textPath(ev1), readIf(textPath(ev1)).replace('こんにちは', '一度だけ'), 'utf8')
    await wait(SETTLE)
    const textAfterPush = readIf(textPath(ev1))
    const dataAfterPush = readIf(mapPath())

    // 反映が書いた data を取り出しが拾って text を書き直す、ということが起きていない。
    await wait(SETTLE)
    expect(readIf(textPath(ev1))).to.equal(textAfterPush)
    expect(readIf(mapPath())).to.equal(dataAfterPush)
    expect(texts()).to.eql(['一度だけ'])
  })

  // ツクールの「プロジェクトの保存」は data/*.json を丸ごと書き戻す。1件ずつ取り出すと
  // 全マップぶん走ってゲームが数秒止まるので、まとまった変更は見送る。
  it('skips the pull when many data files change at once (project save)', async function () {
    await startArmed()
    const warned = []
    const realWarn = console.warn
    console.warn = function (m) { warned.push(String(m)) }
    try {
      ;['Map001.json', 'Map002.json', 'Map003.json', 'Map004.json'].forEach(function (f) {
        const p = path.join(tmp, 'data', f)
        const d = JSON.parse(readIf(p))
        d.events[1].pages[0].list.find(function (c) { return c.code === 401 }).parameters[0] = '保存で書き戻った'
        fs.writeFileSync(p, JSON.stringify(d), 'utf8')
      })
      await wait(SETTLE)
    } finally {
      console.warn = realWarn
    }

    expect(warned.join('\n')).to.contain('プロジェクト保存とみなして')
    // テキストは書き換わっていない。
    expect(readIf(textPath(ev1))).to.contain('こんにちは')
  })

  // 非同期コールバックから $gameMessage.add を呼ぶと、メッセージ表示中でないタイミングで
  // 積まれて出る場所が読めない。進行状況はコンソールにだけ出す。
  it('reports progress to the console only, never to $gameMessage', async function () {
    await startArmed()
    shown.length = 0

    fs.writeFileSync(textPath(ev1), readIf(textPath(ev1)).replace('こんにちは', '静かに反映'), 'utf8')
    await wait(SETTLE)

    expect(texts()).to.eql(['静かに反映'])
    expect(shown).to.eql([])
  })

  // 監視を張る直前に書かれたファイルの変更イベントは、張った後から遅れて届く。
  // 一括取り出しの直後に監視を始めると必ず起きるので、中身が変わっていなければ処理しない。
  // (大きなプロジェクトだと、開始直後に全ファイルの反映が走ってゲームが固まる)
  it('ignores the settling events from files written just before it started', async function () {
    // beforeEach の一括取り出しで書かれたばかりのテキストがある状態で監視を始める。
    const before = readIf(path.join(tmp, 'data', 'CommonEvents.json'))
    await startArmed()
    await wait(SETTLE)

    expect(readIf(path.join(tmp, 'data', 'CommonEvents.json'))).to.equal(before)
    expect(texts()).to.eql(['こんにちは'])
  })

  it('honours direction=push: a game edit is not pulled', async function () {
    await startArmed('merge', 'push')

    const map = JSON.parse(readIf(mapPath()))
    map.events[1].pages[0].list.find(function (c) { return c.code === 401 }).parameters[0] = 'ゲームだけの変更'
    fs.writeFileSync(mapPath(), JSON.stringify(map), 'utf8')
    await wait(SETTLE)

    expect(readIf(textPath(ev1))).to.contain('こんにちは')
    expect(readIf(textPath(ev1))).to.not.contain('ゲームだけの変更')
  })

  it('rejects an unknown strategy or direction instead of silently picking one', function () {
    expect(function () {
      Game_Interpreter.prototype.pluginCommandText2Frame('START_SYNC_WATCH', ['rebase', 'both'])
    }).to.throw(/Unknown strategy/)
    expect(function () {
      Game_Interpreter.prototype.pluginCommandText2Frame('START_SYNC_WATCH', ['merge', 'sideways'])
    }).to.throw(/Unknown direction/)
  })

  // ヘルプに書く名前は必ず case に入れる(一括コマンドで案内と実装がずれた前例がある)。
  it('works under the Japanese command aliases', function () {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandText2Frame('同期監視の開始',
      ['merge', 'both', 'ja', path.join(tmp, 'text'), path.join(tmp, 'data')])
    expect(line(shown.slice(), '同期監視を開始しました')).to.be.a('string')

    shown.length = 0
    Game_Interpreter.prototype.pluginCommandText2Frame('同期監視の停止', [])
    expect(line(shown.slice(), '停止しました')).to.be.a('string')
  })
})
