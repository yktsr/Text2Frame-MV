const chai = require('chai')
const expect = chai.expect
const { bottom, markers, msg, texts } = require('./helpers')
const fs = require('fs')
const os = require('os')
const path = require('path')

// PluginManager は定義しない(非プラグイン分岐で自己初期化させる)。
// この分岐(CLI / t2f-sync / ライブラリ)でも、統合のあとは毎回テキストへ書き戻す。
const text2frame = require('../Text2Frame.js')
require('../Frame2Text.js')

/* 統合のあとの書き戻し。
 *
 * 反映が衝突したとき、衝突の目印はこれまでゲーム側に入っていた。直すにはツクールを開くしかなく、
 * テキストで書いている人をいちばん避けたい場所へ追いやっていた。今は衝突は「テキストだけ」に出る:
 *   ゲーム   … 自分の版(ours)だけ。目印を書かないのでそのまま遊べる
 *   テキスト … 両方 + 衝突の目印
 *   祖先     … ゲームに書いたものと同じ
 * こうすると、テキストで目印を消して統合(merge)のまま反映するだけで片が付く(overwrite が要らない)。 */
describe('write-back after merge', function () {
  let tmp
  let dataDir
  let mapPath
  let textPath
  let cwd

  const header = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n'
  const MARKER = '=== どちらかを残し'

  const writeMap = function (list) {
    fs.writeFileSync(mapPath, JSON.stringify({
      events: [null, { id: 1, name: 'EV001', pages: [{ list: list.concat([bottom]) }] }]
    }))
  }
  const mapList = function () {
    return JSON.parse(fs.readFileSync(mapPath, 'utf8')).events[1].pages[0].list
  }
  const readText = function () { return fs.readFileSync(textPath, 'utf8') }
  const basePath = function () { return path.join(tmp, '.t2f-base', 'text', 'map001_event001_page1.txt') }
  const push = function () {
    return text2frame.applyTextFile({ textPath, mapPath, baseRoot: tmp, strategy: 'merge' })
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-wb-'))
    // 祖先(.t2f-base)の置き場所は cwd 基準。リポジトリを汚さないよう移しておく。
    cwd = process.cwd()
    process.chdir(tmp)
    dataDir = path.join(tmp, 'data')
    fs.mkdirSync(dataDir)
    mapPath = path.join(dataDir, 'Map001.json')
    textPath = path.join(tmp, 'text', 'map001_event001_page1.txt')
    fs.mkdirSync(path.dirname(textPath), { recursive: true })
    fs.mkdirSync(path.join(tmp, '.t2f-base', 'text'), { recursive: true })
  })
  afterEach(function () {
    process.chdir(cwd)
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  describe('applyCommandsToData', function () {
    it('writes a command list into the page of a map event, adding pages when short', function () {
      writeMap(msg('もとの版'))

      const r = text2frame.applyCommandsToData({
        kind: 'event', mapPath, eventId: '1', pageId: '2', commands: msg('書き戻した版')
      })

      expect(r.ok).to.equal(true)
      expect(r.dataPath).to.equal(mapPath)
      const pages = JSON.parse(fs.readFileSync(mapPath, 'utf8')).events[1].pages
      expect(pages).to.have.lengthOf(2)
      expect(texts(pages[1].list)).to.eql(['書き戻した版'])
      // 終端のコマンドは足される(ツクールのデータはこれで終わる)
      expect(pages[1].list[pages[1].list.length - 1].code).to.equal(0)
      // 元のページは触らない
      expect(texts(pages[0].list)).to.eql(['もとの版'])
    })

    it('writes a common event, and says what was wrong instead of throwing', function () {
      writeMap(msg('もとの版'))
      const cePath = path.join(dataDir, 'CommonEvents.json')
      fs.writeFileSync(cePath, JSON.stringify([null, { id: 1, list: [bottom] }]))

      expect(text2frame.applyCommandsToData({
        kind: 'common', commonEventPath: cePath, commonEventId: '1', commands: msg('コモンの版')
      }).ok).to.equal(true)
      expect(texts(JSON.parse(fs.readFileSync(cePath, 'utf8'))[1].list)).to.eql(['コモンの版'])

      expect(text2frame.applyCommandsToData({ kind: 'common', commonEventPath: cePath, commonEventId: '9', commands: [] }).error)
        .to.contain('コモンイベントが見つかりません')
      expect(text2frame.applyCommandsToData({ kind: 'event', mapPath, eventId: '9', commands: [] }).error)
        .to.contain('EventIDが見つかりません')
      expect(text2frame.applyCommandsToData({ kind: 'event', mapPath, eventId: '1' }).error)
        .to.contain('commands is required')
    })
  })

  // 三者が「Hello」で揃った状態を作り、テキストとゲームで同じ場所を別々に変える。
  const setUpConflict = function () {
    fs.writeFileSync(basePath(), header + '\nHello\n')
    writeMap(msg('ゲームの版'))
    fs.writeFileSync(textPath, header + '\nテキストの版\n')
  }

  it('puts the conflict in the text and keeps the game playable', function () {
    setUpConflict()

    const res = push()

    expect(res.ok).to.equal(true)
    expect(res.conflicts).to.equal(1)
    expect(res.writtenBack).to.equal(true)
    // ゲーム: 目印なし・自分の版だけ。ツクールで開いても壊れて見えない。
    expect(markers(mapList())).to.have.lengthOf(0)
    expect(texts(mapList())).to.eql(['ゲームの版'])
    // テキスト: 両方 + 目印
    const text = readText()
    expect(text).to.contain(MARKER)
    expect(text).to.contain('テキストの版')
    expect(text).to.contain('ゲームの版')
    // 祖先はゲームに書いたほう。目印を祖先に入れると次の 3-way が目印を再マージする。
    const base = fs.readFileSync(basePath(), 'utf8')
    expect(base).to.not.contain(MARKER)
    expect(base).to.contain('ゲームの版')
  })

  /* この機能の本体。テキストで決着 -> 統合のまま反映、の2手で終わること。
   * 従来はここで overwrite に逃げるしかなかった。 */
  it('resolving in the text and re-importing with plain merge settles it', function () {
    setUpConflict()
    push()

    // 衝突の目印とゲームの版を消し、テキストの版を残す
    fs.writeFileSync(textPath, header + '\nテキストの版\n')
    const res = push()

    expect(res.ok).to.equal(true)
    expect(res.conflicts).to.equal(0)
    expect(texts(mapList())).to.eql(['テキストの版'])
    expect(markers(mapList())).to.have.lengthOf(0)
    expect(readText()).to.not.contain(MARKER)
  })

  it('settles the same way when the game version is the one kept', function () {
    setUpConflict()
    push()

    fs.writeFileSync(textPath, header + '\nゲームの版\n')
    const res = push()

    expect(res.conflicts).to.equal(0)
    expect(texts(mapList())).to.eql(['ゲームの版'])
  })

  it('keeps editor-only structure through the round trip', function () {
    fs.writeFileSync(basePath(), header + '\nHello\n')
    // ツクールでしか作れない構造(スイッチの操作)をゲーム側に足す
    writeMap(msg('ゲームの版').concat([{ code: 121, indent: 0, parameters: [7, 7, 0] }]))
    fs.writeFileSync(textPath, header + '\nテキストの版\n')

    push()
    fs.writeFileSync(textPath, readText().replace(/^=== .*$\n/gm, '').replace('ゲームの版\n', ''))
    push()

    expect(texts(mapList())).to.eql(['テキストの版'])
    expect(mapList().some(function (c) { return c.code === 121 })).to.equal(true)
  })

  it('does not touch the text when the result is the same (no conflict)', function () {
    setUpConflict()
    push()
    fs.writeFileSync(textPath, header + '\nテキストの版\n')
    push()

    const before = fs.statSync(textPath)
    const res = push()

    expect(res.writtenBack).to.equal(false)
    expect(fs.statSync(textPath).mtimeMs).to.equal(before.mtimeMs)
    expect(readText()).to.equal(header + '\nテキストの版\n')
  })

  /* 衝突しないように、テキストとゲームで別の文を変える。ゲームの変更もテキストへ戻る。 */
  const setUpSeparateEdits = function () {
    fs.writeFileSync(basePath(), header + '\nHello\n\nWorld\n')
    writeMap(msg('Hello').concat(msg('ゲームのWorld')))
    const before = header + '\nテキストのHello\n\nWorld\n'
    fs.writeFileSync(textPath, before)
    return before
  }

  it('brings the game side edit into the text when nothing conflicted', function () {
    setUpSeparateEdits()

    const res = push()

    expect(res.conflicts).to.equal(0)
    expect(res.writtenBack).to.equal(true)
    expect(readText()).to.contain('テキストのHello')
    expect(readText()).to.contain('ゲームのWorld')
  })

  /* コメント行(%)は compile が落とすのでコマンド列に残らないが、書き戻しは元テキストを
   * 持っているので元の位置へ戻す。従来はこのファイルの書き戻しごと見送っていた。 */
  it('keeps comment lines instead of skipping the write-back', function () {
    fs.writeFileSync(basePath(), header + '\nHello\n')
    writeMap(msg('ゲームの版'))
    fs.writeFileSync(textPath, header + '\n% 一幕の書き出し\nテキストの版\n')

    const res = push()

    expect(res.writtenBack).to.equal(true)
    const text = readText()
    expect(text).to.contain('% 一幕の書き出し')
    // メモは元どおり「テキストの版」の手前に戻る。
    const lines = text.split('\n')
    expect(lines[lines.indexOf('% 一幕の書き出し') + 1]).to.equal('テキストの版')
    // 書き戻せたので目印はテキストだけ。ゲームは自分の版のまま遊べる。
    expect(text).to.contain(MARKER)
    expect(markers(mapList())).to.have.lengthOf(0)
    // コメント行はゲームには入らない(コマンドにならないため)。
    expect(JSON.stringify(mapList())).to.not.contain('一幕の書き出し')
  })

  it('keeps comment lines when nothing conflicts, too', function () {
    fs.writeFileSync(basePath(), header + '\nHello\n')
    writeMap(msg('Hello'))
    fs.writeFileSync(textPath, header + '\n% 一幕: 酒場\nテキストの版\n% おわり\n')

    const res = push()

    expect(res.ok).to.equal(true)
    expect(res.conflicts).to.equal(0)
    const text = readText()
    expect(text).to.contain('% 一幕: 酒場')
    expect(text).to.contain('% おわり')
    expect(texts(mapList())).to.eql(['テキストの版'])
  })

  /* 復元したうえで元と同じなら書かない。ここが崩れると、% のあるファイルだけ
   * 毎回 mtime が動き、監視が拾って回り続ける。 */
  it('does not rewrite an unchanged file that has comment lines', function () {
    fs.writeFileSync(basePath(), header + '\nHello\n')
    writeMap(msg('Hello'))
    fs.writeFileSync(textPath, header + '\n% 一幕: 酒場\nテキストの版\n')
    push()
    const settled = readText()
    const before = fs.statSync(textPath)

    const res = push()

    expect(res.writtenBack).to.equal(false)
    expect(fs.statSync(textPath).mtimeMs).to.equal(before.mtimeMs)
    expect(readText()).to.equal(settled)
  })

  /* ゲーム内(NW.js)では require が効かないので、Frame2Text が無ければ書き戻せない。
   * 古い版が入っていて buildPullText を持たない場合も同じ。resolveFrame2Text は
   * decompile を持つグローバルをそのまま返すので、それで古い版を模す。 */
  const withoutFrame2Text = function (fn) {
    const saved = globalThis.$LaurusFrame2Text
    globalThis.$LaurusFrame2Text = { decompile: function () { return '' } }
    try {
      return fn()
    } finally {
      globalThis.$LaurusFrame2Text = saved
    }
  }

  it('applies without writing back when Frame2Text cannot write back and nothing conflicted', function () {
    const before = setUpSeparateEdits()

    const res = withoutFrame2Text(function () { return push() })

    expect(res.ok).to.equal(true)
    expect(res.writtenBack).to.equal(false)
    expect(res.warnings.join('\n')).to.contain('Frame2Text')
    expect(readText()).to.equal(before)
    expect(texts(mapList())).to.eql(['テキストのHello', 'ゲームのWorld'])
  })

  // 目印をテキストに書けないなら、ゲームに逃がさず止める(テキスト側の版もゲームも失わない)。
  it('stops and writes nothing when a conflict cannot be written into the text', function () {
    setUpConflict()
    const beforeMap = fs.readFileSync(mapPath, 'utf8')

    const res = withoutFrame2Text(function () { return push() })

    expect(res.ok).to.equal(false)
    expect(res.error).to.contain('反映を中止')
    expect(res.warnings.join('\n')).to.contain('Frame2Text')
    expect(fs.readFileSync(mapPath, 'utf8')).to.equal(beforeMap)
    expect(readText()).to.equal(header + '\nテキストの版\n')
  })

  it('leaves the game untouched when the text cannot be written', function () {
    // root は読み取り専用のファイルにも書けるので、この検査は成り立たない。
    if (typeof process.getuid === 'function' && process.getuid() === 0) return this.skip()
    setUpConflict()
    const beforeMap = fs.readFileSync(mapPath, 'utf8')
    fs.chmodSync(textPath, 0o444)

    let res
    try {
      res = push()
    } finally {
      fs.chmodSync(textPath, 0o644)
    }

    expect(res.ok).to.equal(false)
    expect(res.error).to.contain('反映を中止')
    expect(fs.readFileSync(mapPath, 'utf8')).to.equal(beforeMap)
  })
})
