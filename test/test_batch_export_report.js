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
    // merge 取り出しでは Text2Frame が遅延ロードされ、これらのパラメータでタグを解釈する。
    // 欠けていると "undefined" が既定値になり <Background: ...> 等が文法エラーになる。
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
      EnglishTag: 'true'
    }
  },
  registerCommand: function () {}
}
require('../Frame2Text.js')

function msgEvent (line) {
  return {
    id: 1,
    pages: [{
      list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: [line] },
        { code: 0, indent: 0, parameters: [] }
      ]
    }]
  }
}

describe('BATCH_EXPORT_MESSAGES_TO_FOLDER report', function () {
  let tmp
  let cwd
  // 実引数の並びはよく変える順に [Strategy, TextBase, DataFolder]。テストは
  // 呼びやすさ優先で strategy を末尾に置き、ここで実際の並びへ組み替える
  // (位置がずれれば全件落ちる)。
  const run = function (dataDir, textBase, strategy) {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER', [strategy, textBase, dataDir])
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
  const line = messageOf
  const textPathOf = function (key) { return path.join(tmp, 'text', key + '.txt') }
  const basePathOf = function (key) { return path.join(tmp, '.t2f-base', 'text', key + '.txt') }
  const ev1 = 'map001_event001_page1'
  const readIf = function (p) { try { return fs.readFileSync(p, 'utf8') } catch (e) { return '' } }
  const setEvent1 = function (lines) {
    const list = []
    lines.forEach(function (l) {
      list.push({ code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] })
      list.push({ code: 401, indent: 0, parameters: [l] })
    })
    list.push({ code: 0, indent: 0, parameters: [] })
    const map = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8'))
    map.events[1] = { id: 1, pages: [{ list }] }
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify(map), 'utf8')
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-report-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'),
      JSON.stringify({ events: [null, msgEvent('こんにちは'), msgEvent('やあ')] }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'),
      JSON.stringify([null, { id: 1, list: [{ code: 0, indent: 0, parameters: [] }] }]), 'utf8')
    // .t2f-base は cwd 基準で作られるので、リポジトリを汚さないよう tmp に移る。
    cwd = process.cwd()
    process.chdir(tmp)
  })

  afterEach(function () {
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('takes the strategy as its 1st argument, like the batch import does', function () {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER',
      ['merge', path.join(tmp, 'text'), path.join(tmp, 'data')])

    expect(line('取り出し完了(merge)')).to.be.a('string')
    // 3〜5番目がそのまま言語・出力先・データ元として読まれている。
    expect(line('取り出し完了(merge)')).to.contain('成功 3件')
    expect(line('出力先')).to.contain(path.join(tmp, 'text'))
  })

  it('reports the count, the kind breakdown and the output directory', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text'))

    const summary = line('取り出し完了')
    expect(summary).to.match(/成功 3件 \(イベント 2 \/ コモン 1\)、失敗 0件/)
    expect(line('出力先')).to.contain(path.join(tmp, 'text'))
    expect(fs.existsSync(path.join(tmp, 'text', 'map001_event001_page1.txt'))).to.equal(true)
  })

  it('says how many existing text files were overwritten, and only when it happened', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'overwrite')
    expect(line('上書きしました')).to.equal(undefined)

    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'overwrite')
    expect(line('上書きしました')).to.contain('既存テキスト 3件')
  })

  // 既定は merge。CLI・t2f-sync・VSCode と揃え、テキストに書いた内容を黙って消さない。
  it('defaults to merge, keeping what was written in the text', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text'))
    fs.writeFileSync(textPathOf(ev1), readIf(textPathOf(ev1)) + '\n<comment>\nテキスト側のメモ\n</comment>\n', 'utf8')

    run(path.join(tmp, 'data'), path.join(tmp, 'text')) // strategy 未指定

    expect(line('取り出し完了(merge)')).to.be.a('string')
    expect(readIf(textPathOf(ev1))).to.contain('テキスト側のメモ')
    expect(line('上書きしました')).to.equal(undefined)
  })

  it('names the data folder when it cannot be read', function () {
    run(path.join(tmp, 'missing'), path.join(tmp, 'text'))

    expect(line('データフォルダを読めませんでした')).to.contain(path.join(tmp, 'missing'))
    expect(line('取り出し完了')).to.equal(undefined)
  })

  it('says so when the data folder holds no targets', function () {
    const empty = path.join(tmp, 'empty')
    fs.mkdirSync(empty)
    run(empty, path.join(tmp, 'text'))

    expect(line('取り出し対象が見つかりませんでした')).to.contain(empty)
  })

  describe('a game side that still has conflict markers', function () {
    const ev2 = 'map001_event002_page1'
    const kept = function () { return path.join(tmp, 'text', ev2 + '.txt') }
    beforeEach(function () {
      const marker = function (text) { return { code: 108, indent: 0, parameters: [text] } }
      fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
        events: [null, msgEvent('こんにちは'), {
          id: 2,
          pages: [{
            list: [
              { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
              { code: 401, indent: 0, parameters: ['やあ'] },
              marker('=== テキストの変更 / from text ==='),
              marker('=== ゲームの変更 / from game ==='),
              marker('=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ==='),
              { code: 0, indent: 0, parameters: [] }
            ]
          }]
        }]
      }), 'utf8')
      fs.mkdirSync(path.join(tmp, 'text'), { recursive: true })
      fs.writeFileSync(kept(), 'これは残るべき翻訳\n', 'utf8')
    })

    it('is skipped by merge, which cannot merge across the markers', function () {
      run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'merge')

      expect(line('取り出し完了')).to.contain('衝突未解決で除外 1件')
      expect(line('衝突未解決で取り出さなかったファイル')).to.contain(ev2)
      // 除外したファイルのテキストと祖先は触っていない。
      expect(fs.readFileSync(kept(), 'utf8')).to.equal('これは残るべき翻訳\n')
      expect(fs.existsSync(basePathOf(ev2))).to.equal(false)
    })

    it('is exported markers and all by overwrite, so it can be resolved in the text', function () {
      run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'overwrite')

      const text = fs.readFileSync(kept(), 'utf8')
      expect(text).to.contain('=== どちらかを残し') // 目印ごとテキストへ出ている
      expect(text).to.contain('やあ')
      expect(line('取り出し完了')).to.contain('目印ごと取り出し 1件')
      expect(line('目印ごと取り出したファイル')).to.contain(ev2)
      // 祖先に目印を取り込むと次回の 3-way が壊れるので進めない。
      expect(fs.existsSync(basePathOf(ev2))).to.equal(false)
      // 目印の無い方は通常どおり祖先まで進む。
      expect(fs.existsSync(basePathOf(ev1))).to.equal(true)
    })
  })

  it('merge keeps the translation in the text and brings in the game change', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text')) // 既定 overwrite で祖先を作る
    // 翻訳者がテキストを訳す
    fs.writeFileSync(textPathOf(ev1), readIf(textPathOf(ev1)).replace('こんにちは', 'Bonjour'), 'utf8')
    // 開発者がゲーム側に行を足す
    setEvent1(['こんにちは', 'ゲーム側の追記'])

    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'merge')

    const text = readIf(textPathOf(ev1))
    expect(line('取り出し完了(merge)')).to.contain('成功 3件')
    expect(text).to.contain('Bonjour') // 翻訳が残っている
    expect(text).to.contain('ゲーム側の追記') // ゲームの変更が入っている
    expect(text).to.not.contain('こんにちは')
    // 上書きではないので「上書きしました」は出ない
    expect(line('上書きしました')).to.equal(undefined)
  })

  it('merge keeps both on a conflict and advances the ancestor to the game side', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text'))
    // テキストとゲームが同じ行を別々に変える
    fs.writeFileSync(textPathOf(ev1), readIf(textPathOf(ev1)).replace('こんにちは', 'テキスト側の変更'), 'utf8')
    setEvent1(['ゲーム側の変更'])

    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'merge')

    const text = readIf(textPathOf(ev1))
    expect(text).to.contain('テキスト側の変更')
    expect(text).to.contain('ゲーム側の変更')
    expect(text).to.contain('=== どちらかを残し')
    expect(line('衝突あり(両方残し)')).to.contain(ev1)
    expect(line('一括反映(merge)を実行してください')).to.be.a('string')
    // 祖先はゲーム側へ進める。据え置くと、テキストで解決したあとの反映で衝突が再発する。
    const base = readIf(basePathOf(ev1))
    expect(base).to.contain('ゲーム側の変更')
    expect(base).to.not.contain('テキスト側の変更')
    expect(base).to.not.contain('=== どちらかを残し')
  })

  // 取り出しのしかたは引数だけで決まる。front matter の strategy: は読まない。
  it('ignores a front-matter strategy and follows the command argument', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text'))
    // このファイルだけ overwrite 指定 + 翻訳あり
    fs.writeFileSync(textPathOf(ev1),
      readIf(textPathOf(ev1)).replace('kind: event', 'kind: event\nstrategy: overwrite').replace('こんにちは', 'Bonjour'), 'utf8')
    setEvent1(['ゲームが正'])

    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'merge')

    // 引数どおり統合されるので、テキストに書いた翻訳は残る。
    const text = readIf(textPathOf(ev1))
    expect(text).to.contain('ゲームが正')
    expect(text).to.contain('Bonjour')
  })

  it('skips a merge whose text still has conflict markers', function () {
    run(path.join(tmp, 'data'), path.join(tmp, 'text'))
    const marked = readIf(textPathOf(ev1)) + '\n<comment>\n=== ゲームの変更 / from game ===\n</comment>\n'
    fs.writeFileSync(textPathOf(ev1), marked, 'utf8')
    setEvent1(['ゲーム側の追記'])

    run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'merge')

    expect(line('取り出し完了(merge)')).to.contain('衝突未解決で除外 1件')
    expect(line('衝突未解決で取り出さなかったファイル')).to.contain(ev1)
    expect(readIf(textPathOf(ev1))).to.equal(marked) // 触っていない
  })

  it('rejects an unknown strategy instead of silently picking one', function () {
    expect(function () {
      run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'rebase')
    }).to.throw(/Unknown strategy/)
  })

  // merge が既定になったので、Text2Frame を入れていない人はここで必ず当たる。
  // 全ファイルが同じ理由で失敗して原因が埋もれないよう、走査前に 1 回だけ止める。
  // 黙って overwrite に落とすことはしない(テキストに書いた内容が消えるため)。
  it('stops once with a reason when merge is asked for without the Text2Frame plugin', function () {
    // 3-way を持たない Text2Frame(古い版・未導入相当)を共有グローバルに置く。
    // resolveText2Frame はこれを先に見るので、require のフォールバックまで進まない。
    const saved = globalThis.$LaurusText2Frame
    globalThis.$LaurusText2Frame = { saveBaseText: function () {} }
    try {
      run(path.join(tmp, 'data'), path.join(tmp, 'text'), 'merge')
    } finally {
      globalThis.$LaurusText2Frame = saved
    }

    expect(line('Text2Frame プラグインが必要です')).to.be.a('string')
    expect(line('overwrite を指定してください')).to.be.a('string')
    expect(line('取り出し完了')).to.equal(undefined) // 1件も書いていない
    expect(fs.existsSync(textPathOf(ev1))).to.equal(false)
  })

  it('reports each failing key with its reason', function () {
    fs.writeFileSync(path.join(tmp, 'data', 'Map002.json'),
      JSON.stringify({ events: [null, msgEvent('だめ')] }), 'utf8')
    // 出力先をディレクトリで塞いで、その 1 件だけ書き出しに失敗させる。
    fs.mkdirSync(path.join(tmp, 'text', 'map002_event001_page1.txt'), { recursive: true })

    run(path.join(tmp, 'data'), path.join(tmp, 'text'))

    expect(line('取り出し完了')).to.contain('失敗 1件')
    expect(line('失敗: map002_event001_page1')).to.contain('EISDIR')
  })
})
