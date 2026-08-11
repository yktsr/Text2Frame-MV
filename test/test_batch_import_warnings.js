const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')

globalThis.Game_Interpreter = {}
Game_Interpreter.prototype = {}
const shown = []
globalThis.$gameMessage = { add: function (t) { shown.push(String(t)) } }
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
      IsDebug: 'false',
      DisplayMsg: 'true',
      DisplayWarning: 'true'
    }
  },
  registerCommand: function () {}
}
require('../Text2Frame.js')

describe('BATCH_IMPORT_MESSAGES_FROM_FOLDER report', function () {
  const textRoot = path.resolve('/virt/text/ja')
  const eventPage = function (list) { return { list } }
  const msg = function (line) {
    return [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [line] }
    ]
  }
  const bottom = { code: 0, indent: 0, parameters: [] }
  const mapData = {
    events: [null,
      { id: 1, pages: [eventPage(msg('Hello 1').concat([bottom]))] },
      { id: 2, pages: [eventPage(msg('Hello 2').concat([bottom]))] },
      { id: 3, pages: [eventPage(msg('Hello 3').concat([bottom]))] }
    ]
  }
  const textFor = function (eventId) {
    return '---\nkind: event\nmapId: 1\neventId: ' + eventId + '\npageId: 1\nlocale: ja\n---\n\nBonjour ' + eventId + '\n'
  }

  // 既定は「祖先なし = TOFU 警告が全ファイルで出る」状況。個別テストで上書きする。
  let entries = ['e1.txt', 'e2.txt', 'e3.txt']
  let readText = function (s) {
    if (s.indexOf('.t2f-base') !== -1) throw new Error('no ancestor')
    const m = s.match(/e(\d)\.txt$/)
    if (m) return textFor(m[1])
    if (s.indexOf('Map001') !== -1) return JSON.stringify(mapData)
    throw new Error('unexpected read: ' + s)
  }

  beforeEach(function () {
    shown.length = 0
    entries = ['e1.txt', 'e2.txt', 'e3.txt']
    sinon.stub(fs, 'readdirSync').callsFake(function (dir) {
      return String(dir) === textRoot ? entries : []
    })
    sinon.stub(fs, 'statSync').callsFake(function () {
      return { isDirectory: function () { return false }, isFile: function () { return true } }
    })
    sinon.stub(fs, 'readFileSync').callsFake(function (p) { return readText(String(p)) })
    // 反映元フォルダだけ存在する扱い(祖先やバックアップは無い)。
    sinon.stub(fs, 'existsSync').callsFake(function (p) { return String(p) === textRoot })
    sinon.stub(fs, 'mkdirSync').returns(undefined)
    sinon.stub(fs, 'writeFileSync').returns(undefined)
  })

  afterEach(function () {
    sinon.restore()
    readText = function (s) {
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no ancestor')
      const m = s.match(/e(\d)\.txt$/)
      if (m) return textFor(m[1])
      if (s.indexOf('Map001') !== -1) return JSON.stringify(mapData)
      throw new Error('unexpected read: ' + s)
    }
  })

  // 実引数の並びはよく変える順に [Strategy, WriteBack, TextFolder]。テストは呼びやすさ
  // 優先で root を先に取り、ここで実際の並びへ組み替える(位置がずれれば全件落ちる)。
  const runBatch = function (root, strategy, writeBack) {
    Game_Interpreter.prototype.pluginCommandText2Frame('BATCH_IMPORT_MESSAGES_FROM_FOLDER',
      [strategy || 'merge', writeBack || 'off', root || textRoot])
  }
  /* 画面幅(半角55)を超えるメッセージは addMessage が自動で折り返すため、
   * 1つの文章が複数の $gameMessage 行にまたがる。行ごとではなく通しの文字列から探し、
   * 次のメッセージの先頭([batch] など)までを「1つの文章」として返す。 */
  const messageOf = function (needle) {
    const all = shown.join('')
    const at = all.indexOf(needle)
    if (at === -1) return undefined
    const PREFIX = /\[(batch-import|batch|sync)\]/g
    let start = 0
    let end = all.length
    let m
    while ((m = PREFIX.exec(all)) !== null) {
      if (m.index <= at) start = m.index
      else { end = m.index; break }
    }
    return all.slice(start, end)
  }
  const countShown = function (needle) {
    return shown.join('').split(needle).length - 1
  }
  const line = messageOf

  it('takes the strategy as its 1st argument, like the batch export does', function () {
    Game_Interpreter.prototype.pluginCommandText2Frame('BATCH_IMPORT_MESSAGES_FROM_FOLDER', ['overwrite', 'off', textRoot])

    // 1番目が反映のしかた、2番目が書き戻し、3番目が反映元フォルダとして読まれている。
    // (位置が入れ替わっていると 'overwrite' や 'off' をフォルダ名として走査し 0 件になる)
    expect(line('反映完了')).to.contain('成功 3件')
    expect(line('反映元')).to.contain(textRoot)
    // overwrite なので 3-way の祖先まわりの警告(初回反映)は出ない。
    expect(countShown('初回反映')).to.equal(0)
  })

  it('shows a repeated warning once with its count, not once per file', function () {
    runBatch()

    const tofu = shown.filter(function (t) { return t.indexOf('初回反映') !== -1 })
    expect(tofu).to.have.lengthOf(1)
    expect(tofu[0]).to.match(/^\[3件\] /)
  })

  it('shows the restart notice once and no per-file success lines', function () {
    runBatch()

    expect(countShown('開き直してください')).to.equal(1)
    expect(countShown('書き出し成功')).to.equal(0)
  })

  it('reports the count, the kind breakdown and the source folder', function () {
    runBatch()

    expect(line('反映完了')).to.contain('成功 3件 (イベント 3 / コモン 0)、失敗 0件')
    expect(line('反映元')).to.contain(textRoot)
  })

  it('counts text files without front matter as skipped', function () {
    entries = ['e1.txt', 'e2.txt', 'e3.txt', 'memo.txt']
    const prev = readText
    readText = function (s) { return /memo\.txt$/.test(s) ? 'ただのメモ\n' : prev(s) }

    runBatch()

    expect(line('反映完了')).to.contain('見出し情報なしで対象外 1件')
  })

  it('names the files that still have conflicts', function () {
    // 祖先あり・ゲームとテキストが同じ位置に別々の追加 => 衝突
    const conflictMap = {
      events: [null, { id: 1, pages: [eventPage(msg('Hello').concat([{ code: 121, indent: 0, parameters: [7, 7, 0, 0] }, bottom]))] }]
    }
    entries = ['e1.txt']
    readText = function (s) {
      if (s.indexOf('.t2f-base') !== -1) return '---\nkind: event\n---\n\nHello\n'
      if (/e1\.txt$/.test(s)) return '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\nlocale: ja\n---\n\nHello\n\nBonjour\n'
      if (s.indexOf('Map001') !== -1) return JSON.stringify(conflictMap)
      throw new Error('unexpected read: ' + s)
    }

    runBatch()

    expect(line('衝突 1件')).to.contain('e1')
    // 書き戻していない(Frame2Text が無い)ので、直す場所はゲーム側のまま。
    expect(line('ツクールで目印3行を消して')).to.be.a('string')
  })

  /* add(末尾に追記)は単発の IMPORT コマンドだけのもの。一括で通すと走査のたびに
   * 内容が二重になるので、front matter に書かれていても既定へ落とす。 */
  it('ignores strategy: add in front matter and falls back to the default', function () {
    entries = ['e1.txt']
    let writtenMap = null
    readText = function (s) {
      if (s.indexOf('.t2f-base') !== -1) throw new Error('no ancestor')
      if (/e1\.txt$/.test(s)) {
        return '---\nkind: event\nstrategy: add\nmapId: 1\neventId: 1\npageId: 1\nlocale: ja\n---\n\nBonjour 1\n'
      }
      if (s.indexOf('Map001') !== -1) return writtenMap || JSON.stringify(mapData)
      throw new Error('unexpected read: ' + s)
    }
    fs.writeFileSync.restore()
    sinon.stub(fs, 'writeFileSync').callsFake(function (p, data) {
      if (String(p).indexOf('Map001') !== -1) writtenMap = String(data)
    })
    const lines = function () {
      return JSON.parse(writtenMap).events[1].pages[0].list
        .filter(function (c) { return c.code === 401 })
        .map(function (c) { return c.parameters[0] })
    }

    runBatch()
    expect(lines()).to.eql(['Bonjour 1'])

    // 2回目でも増えない(add なら 'Bonjour 1' が2つ並ぶ)。
    runBatch()
    expect(lines()).to.eql(['Bonjour 1'])
  })

  it('names each failing file with its reason', function () {
    entries = ['e1.txt', 'broken.txt']
    const prev = readText
    readText = function (s) {
      // kind はあるが eventId が無い => applyTextFile がエラーを返す
      if (/broken\.txt$/.test(s)) return '---\nkind: event\nmapId: 1\nlocale: ja\n---\n\nどこへ？\n'
      return prev(s)
    }

    runBatch()

    expect(line('反映完了')).to.contain('失敗 1件')
    expect(line('失敗: broken')).to.contain('eventId is required')
  })

  it('refuses to merge a file whose game side still has conflict markers', function () {
    const marker = function (text) { return { code: 108, indent: 0, parameters: [text] } }
    const markedMap = {
      events: [null, {
        id: 1,
        pages: [eventPage(msg('Hello').concat([
          marker('=== テキストの変更 / from text ==='),
          marker('=== ゲームの変更 / from game ==='),
          marker('=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ==='),
          bottom
        ]))]
      }]
    }
    entries = ['e1.txt']
    const prev = readText
    readText = function (s) { return s.indexOf('Map001') !== -1 ? JSON.stringify(markedMap) : prev(s) }

    runBatch()

    // 目印が残っているのは「失敗」ではなく「まだ直していない」。書き戻しを使うと毎回ここに来るため、
    // 失敗の件数とは分けて数え、ファイル名を名指しする。
    expect(line('反映完了')).to.contain('失敗 0件')
    expect(line('目印が残っていて反映できないファイル 1件')).to.contain('e1')
    // 反映を止めたので、目印が二重化するような書き込みは起きていない。
    expect(fs.writeFileSync.called).to.equal(false)
  })

  it('refuses to merge a text that still has conflict markers', function () {
    entries = ['e1.txt']
    const prev = readText
    readText = function (s) {
      if (/e1\.txt$/.test(s)) {
        return '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\nlocale: ja\n---\n\n' +
          '<comment>\n=== テキストの変更 / from text ===\n</comment>\n\nBonjour\n'
      }
      return prev(s)
    }

    runBatch()

    expect(line('目印が残っていて反映できないファイル 1件')).to.contain('e1')
    expect(fs.writeFileSync.called).to.equal(false)
  })

  it('still lets overwrite through, so it stays the way out of a stuck merge', function () {
    const marker = function (text) { return { code: 108, indent: 0, parameters: [text] } }
    const markedMap = {
      events: [null, {
        id: 1,
        pages: [eventPage(msg('Hello').concat([
          marker('=== テキストの変更 / from text ==='),
          marker('=== ゲームの変更 / from game ==='),
          marker('=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ==='),
          bottom
        ]))]
      }]
    }
    entries = ['e1.txt']
    const prev = readText
    readText = function (s) { return s.indexOf('Map001') !== -1 ? JSON.stringify(markedMap) : prev(s) }

    runBatch(textRoot, 'overwrite')

    expect(line('反映完了')).to.contain('成功 1件')
    const written = fs.writeFileSync.getCalls().filter(function (c) { return String(c.args[0]).indexOf('Map001') !== -1 })
    expect(written).to.have.lengthOf(1)
    // 上書きなので目印はゲームから消えている。
    expect(String(written[0].args[1])).to.not.contain('=== ゲームの変更')
  })

  it('says so when the source folder is missing or empty', function () {
    runBatch(path.resolve('/virt/missing'))
    expect(line('反映元フォルダが見つかりません')).to.contain('missing')
    expect(line('反映完了')).to.equal(undefined)

    shown.length = 0
    entries = []
    runBatch()
    expect(line('テキストが見つかりませんでした')).to.contain(textRoot)
  })
})
