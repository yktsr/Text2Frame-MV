const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const sync = require('../t2f-sync.js')
const SYNC_CLI = path.resolve(__dirname, '..', 't2f-sync.js')

function texts (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}

describe('t2f-sync controller', function () {
  let tmp
  let opts
  let cwd

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2fsync-'))
    // 祖先(.t2f-base)の置き場所は cwd 基準。リポジトリを汚さないよう移しておく。
    cwd = process.cwd()
    process.chdir(tmp)
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        pages: [{
          list: [
            { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
            { code: 401, indent: 0, parameters: ['Hello'] },
            // dev-added switch。121(スイッチの操作)の引数は実データでは3つ。4つにすると
            // テキスト往復した祖先([7,7,0])とゲーム([7,7,0,0])が食い違い、偽の衝突になる。
            { code: 121, indent: 0, parameters: [7, 7, 0] },
            { code: 0, indent: 0, parameters: [] }
          ]
        }]
      }]
    }))
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([
      null,
      {
        id: 1,
        list: [
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          { code: 401, indent: 0, parameters: ['CommonHello'] },
          { code: 0, indent: 0, parameters: [] }
        ]
      }
    ]))
    opts = { root: tmp, dataDir: 'data', textDir: 'text', strategy: 'merge' }
  })
  afterEach(function () {
    process.chdir(cwd)
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  const evText = function () { return path.join(tmp, 'text', 'map001_event001_page1.txt') }
  const mapList = function () {
    return JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).events[1].pages[0].list
  }

  it('pull writes front-matter text and the .t2f-base ancestor', function () {
    const res = sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    expect(res).to.have.lengthOf(1)
    expect(res[0].ok).to.equal(true)

    const text = fs.readFileSync(evText(), 'utf8')
    expect(text.indexOf('---\n')).to.equal(0)
    expect(text).to.contain('kind: event')
    expect(text).to.contain('mapId: 1')
    expect(text).to.contain('Hello')
    expect(fs.existsSync(path.join(tmp, '.t2f-base', 'text', 'map001_event001_page1.txt'))).to.equal(true)
  })

  it('push applies the text to the game and keeps dev structure under merge', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'こんにちは'))

    const res = sync.pushFile(evText(), opts)
    expect(res.ok).to.equal(true)
    expect(texts(mapList())).to.eql(['こんにちは'])
    expect(mapList().some(function (c) { return c.code === 121 })).to.equal(true) // merge kept the switch
  })

  it('pull with merge keeps the translation and brings in the new game line', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'こんにちは'))
    sync.pushFile(evText(), opts)

    // dev adds a line in the editor
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list.push(
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['NewDevLine'] },
      { code: 0, indent: 0, parameters: [] }
    )
    fs.writeFileSync(mapPath, JSON.stringify(map))

    sync.pullDataFile(mapPath, opts)
    const after = fs.readFileSync(evText(), 'utf8')
    expect(after).to.contain('こんにちは') // translation survived
    expect(after).to.contain('NewDevLine') // game change pulled in
  })

  // 反映で衝突したら、目印はテキストにだけ入れ、ゲームには目印の無いゲームの版を書く。
  // 祖先はゲームに書いたほう(目印を祖先に入れると次の 3-way が目印を再マージする)。
  it('push with a conflict puts the markers in the text, and the game and .t2f-base keep the game side', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts) // base := Hello
    const basePath = path.join(tmp, '.t2f-base', 'text', 'map001_event001_page1.txt')
    // Diverge both sides on the same line → genuine 3-way conflict.
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'Bonjour')) // theirs (text)
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list[1].parameters[0] = 'ゲーム変更' // ours (game)
    fs.writeFileSync(mapPath, JSON.stringify(map))

    const res = sync.pushFile(evText(), opts)

    expect(res.ok).to.equal(true)
    expect(res.conflicts).to.be.greaterThan(0)
    const text = fs.readFileSync(evText(), 'utf8')
    expect(text).to.contain('=== どちらかを残し')
    expect(text).to.contain('Bonjour')
    expect(text).to.contain('ゲーム変更')
    expect(mapList().some(function (c) { return c.code === 108 })).to.equal(false)
    expect(texts(mapList())).to.eql(['ゲーム変更'])
    const base = fs.readFileSync(basePath, 'utf8')
    expect(base).to.contain('ゲーム変更')
    expect(base).to.not.contain('=== どちらかを残し') // 祖先に目印は入れない
  })

  /* 取り出しの処理元はゲーム。衝突した所は目印つきの両方をゲームへ書き、テキストには
   * テキスト側の版だけを残す。祖先は目印の無い側(テキストに書いた内容)。 */
  it('pull with a conflict writes the markers into the game and keeps the text clean', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    sync.pullDataFile(mapPath, opts) // base := Hello
    const basePath = path.join(tmp, '.t2f-base', 'text', 'map001_event001_page1.txt')
    // Diverge both sides on the same line → conflict on pull.
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'Bonjour')) // theirs (text)
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list[1].parameters[0] = 'ゲーム変更' // ours (game)
    fs.writeFileSync(mapPath, JSON.stringify(map))

    const res = sync.pullDataFile(mapPath, opts)

    expect(res[0].conflicts).to.be.greaterThan(0)
    const text = fs.readFileSync(evText(), 'utf8')
    expect(text).to.contain('Bonjour')
    expect(text).to.not.contain('=== どちらかを残し')
    // ゲーム: 両方の版と目印
    expect(texts(mapList())).to.include('ゲーム変更')
    expect(texts(mapList())).to.include('Bonjour')
    expect(mapList().some(function (c) { return c.code === 108 })).to.equal(true)
    const base = fs.readFileSync(basePath, 'utf8')
    expect(base).to.contain('Bonjour')
    expect(base).to.not.contain('=== どちらかを残し') // 祖先に目印は入れない
  })

  /* 取り出しがゲームを書き換えるようになったので、その書き込みを自分のものとして
   * 記録しないと、見張りが拾って 取り出し -> 反映 -> 取り出し と回り続ける。 */
  it('marks the data it wrote as its own, so the watcher does not bounce it back', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    const guard = sync.createEchoGuard()
    sync.pullDataFile(mapPath, Object.assign({}, opts, { guard }))
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'テキストの版'))

    sync.pullDataFile(mapPath, Object.assign({}, opts, { guard, writeBack: 'always' }))

    expect(texts(mapList())).to.eql(['テキストの版']) // ゲームにも入った
    expect(guard.isEcho(mapPath)).to.equal(true) // 自分の書き込みとして記録されている
  })

  // 取り出しで衝突 -> ツクールで解決 -> もう一度取り出すと片が付く(鏡写しの流れ)。
  it('resolving a pull conflict in the game settles on the next pull', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    const setGame = function (line) {
      const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
      map.events[1].pages[0].list = [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: [line] },
        { code: 0, indent: 0, parameters: [] }
      ]
      fs.writeFileSync(mapPath, JSON.stringify(map))
    }
    sync.pullDataFile(mapPath, opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'テキストの版'))
    setGame('ゲームの版')
    expect(sync.pullDataFile(mapPath, opts)[0].conflicts).to.be.greaterThan(0)

    // 目印が残っている間は、反映も取り出しも止まる
    expect(sync.pushFile(evText(), opts).ok).to.equal(false)
    expect(sync.pullDataFile(mapPath, opts)[0].skipped).to.equal('game')

    // ツクールで目印を消し、ゲーム側の版を残した
    setGame('ゲームの版')

    const res = sync.pullDataFile(mapPath, opts)

    expect(res[0].conflicts || 0).to.equal(0)
    expect(fs.readFileSync(evText(), 'utf8')).to.contain('ゲームの版')
    expect(mapList().some(function (c) { return c.code === 108 })).to.equal(false)
    // 三者が揃ったので、次の反映も衝突しない
    expect(sync.pushFile(evText(), opts).conflicts || 0).to.equal(0)
  })

  // 祖先(.t2f-base)は「テキストとゲームが実際に一致していた地点」でなければならない。
  // 取り出しが書き換えるのはテキストなので、祖先にはゲーム側が入る。ここを間違えて
  // マージ結果を祖先にすると、次の反映で 3-way が「ゲームが消した」と誤読して、
  // 取り出し前にテキストへ書いた分が衝突 0 件のまま黙って消える。
  it('pull records the game side as the ancestor, not the merged text', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    sync.pullDataFile(mapPath, opts)

    const basePath = path.join(tmp, '.t2f-base', 'text', 'map001_event001_page1.txt')
    const gameOnly = fs.readFileSync(basePath, 'utf8')
    // テキストにだけ注釈を足してから取り出す(ゲームには入っていない内容)。
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8') + '\n<comment>\nテキスト側のメモ\n</comment>\n')

    sync.pullDataFile(mapPath, opts)

    // 祖先はゲームのまま。マージ結果(メモ入り)になっていない。
    expect(fs.readFileSync(basePath, 'utf8')).to.equal(gameOnly)
    expect(fs.readFileSync(basePath, 'utf8')).to.not.contain('テキスト側のメモ')
    expect(fs.readFileSync(evText(), 'utf8')).to.contain('テキスト側のメモ') // テキストには残る
  })

  it('a text-only edit made before a pull still reaches the game on the next push', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    sync.pullDataFile(mapPath, opts)
    // 取り出しより前にテキストへ書く
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8') + '\n<comment>\nテキスト側のメモ\n</comment>\n')
    // 開発者がゲーム側を別の場所で変える -> 取り出し(merge)は正しくマージする
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list[1].parameters[0] = 'ゲーム側の変更'
    fs.writeFileSync(mapPath, JSON.stringify(map))
    sync.pullDataFile(mapPath, opts)
    expect(fs.readFileSync(evText(), 'utf8')).to.contain('テキスト側のメモ')
    expect(fs.readFileSync(evText(), 'utf8')).to.contain('ゲーム側の変更')

    const res = sync.pushFile(evText(), opts)

    expect(res.ok).to.equal(true)
    expect(res.conflicts || 0).to.equal(0)
    const list = mapList()
    // 取り出し前に書いた注釈がゲームへ入っている(ここが抜けていた)
    expect(list.some(function (c) {
      return (c.code === 108 || c.code === 408) && String(c.parameters[0]).indexOf('テキスト側のメモ') !== -1
    })).to.equal(true)
    // ツクール側で足した構造も残っている
    expect(list.some(function (c) { return c.code === 121 })).to.equal(true)
  })

  // 衝突後の脱出手順(ヘルプ・案内文が指示している 2 手)を固定する。
  // 反映で衝突したら、テキストで決めて統合のまま反映し直せば片が付く。
  describe('settling a push conflict', function () {
    const mapPath = function () { return path.join(tmp, 'data', 'Map001.json') }
    const header = function () {
      const text = fs.readFileSync(evText(), 'utf8')
      return text.slice(0, text.indexOf('\n---\n') + 5)
    }
    beforeEach(function () {
      sync.pullDataFile(mapPath(), opts) // 祖先 := Hello
      // 同じ場所をテキストとゲームで別々に変える
      fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'テキストの版'))
      const map = JSON.parse(fs.readFileSync(mapPath(), 'utf8'))
      map.events[1].pages[0].list[1].parameters[0] = 'ゲームの版'
      fs.writeFileSync(mapPath(), JSON.stringify(map))
      sync.pushFile(evText(), opts) // 衝突 -> 目印はテキストに入る
      expect(fs.readFileSync(evText(), 'utf8')).to.contain('=== どちらかを残し')
    })

    it('stops the next push until the markers are gone from the text', function () {
      const res = sync.pushFile(evText(), opts)
      expect(res.ok).to.equal(false)
      expect(texts(mapList())).to.eql(['ゲームの版'])
    })

    it('keeping the text version in the text, then pushing with merge, settles it', function () {
      fs.writeFileSync(evText(), header() + '\n<Face: (0)><Background: Window><WindowPosition: Bottom>\nテキストの版\n')

      const res = sync.pushFile(evText(), opts)

      expect(res.ok).to.equal(true)
      expect(res.conflicts || 0).to.equal(0)
      expect(texts(mapList())).to.eql(['テキストの版'])
      expect(sync.pushFile(evText(), opts).conflicts || 0).to.equal(0)
    })

    it('keeping the game version in the text, then pushing with merge, settles it', function () {
      fs.writeFileSync(evText(), header() + '\n<Face: (0)><Background: Window><WindowPosition: Bottom>\nゲームの版\n')

      const res = sync.pushFile(evText(), opts)

      expect(res.ok).to.equal(true)
      expect(res.conflicts || 0).to.equal(0)
      expect(texts(mapList())).to.eql(['ゲームの版'])
      const pull = sync.pullDataFile(mapPath(), opts)
      expect(pull[0].conflicts || 0).to.equal(0)
    })
  })

  it('pull skips a target whose game side still has conflict markers', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    sync.pullDataFile(mapPath, opts)
    const before = fs.readFileSync(evText(), 'utf8')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list.splice(2, 0,
      { code: 108, indent: 0, parameters: ['=== テキストの変更 / from text ==='] },
      { code: 108, indent: 0, parameters: ['=== ゲームの変更 / from game ==='] },
      { code: 108, indent: 0, parameters: ['=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ==='] })
    fs.writeFileSync(mapPath, JSON.stringify(map))

    const res = sync.pullDataFile(mapPath, opts)

    expect(res[0].skipped).to.equal('game')
    expect(fs.readFileSync(evText(), 'utf8')).to.equal(before) // 目印はテキストへ広がっていない
  })

  // 反映のしかたは引数だけで決まる。front matter の strategy: は読まない。
  it('pull ignores a strategy in the front matter', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    // overwrite と書いてあってもテキスト側の編集は捨てない
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8')
      .replace('kind: event', 'kind: event\nstrategy: overwrite')
      .replace('Hello', 'Bonjour'))

    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts) // opts は merge

    expect(fs.readFileSync(evText(), 'utf8')).to.contain('Bonjour')
  })

  it('pull with overwrite replaces the text wholesale', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'こんにちは'))

    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), Object.assign({}, opts, { strategy: 'overwrite' }))
    const after = fs.readFileSync(evText(), 'utf8')
    expect(after).to.contain('Hello')
    expect(after).to.not.contain('こんにちは')
  })

  it('syncOnce both directions reports pulled and pushed entries', function () {
    const r = sync.syncOnce(Object.assign({}, opts, { direction: 'both' }))
    expect(r.pulled.length).to.equal(2) // Map001 event + common001
    expect(r.pushed.length).to.equal(2)
    expect(r.pulled.concat(r.pushed).every(function (x) { return x.ok })).to.equal(true)
  })

  it('echo guard suppresses the controller\'s own write, then re-arms', function () {
    const guard = sync.createEchoGuard()
    const f = path.join(tmp, 'probe.txt')

    fs.writeFileSync(f, 'written-by-us')
    guard.record(f, 'written-by-us')
    expect(guard.isEcho(f)).to.equal(true) // our own write -> ignored
    expect(guard.isEcho(f)).to.equal(false) // consumed; no longer suppressed

    // a write by someone else must NOT be treated as an echo
    guard.record(f, 'written-by-us')
    fs.writeFileSync(f, 'changed-by-someone-else')
    expect(guard.isEcho(f)).to.equal(false)
  })

  it('push records the data file it caused, so the pull watcher ignores it', function () {
    const guard = sync.createEchoGuard()
    const o = Object.assign({}, opts, { guard })
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'Edited'))

    const res = sync.pushFile(evText(), o)
    expect(res.ok).to.equal(true)
    expect(guard.isEcho(res.dataPath)).to.equal(true) // the data write is recognised as ours
  })

  /* モジュール API は元から root を受け取るが、CLI 入口だけ cwd を直書きしていて
   * プロジェクトの外から流せなかった。Text2Frame.js の --root と同じ意味。 */
  it('--root puts the ancestor under the project, not the current directory', function () {
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 't2fsync-cwd-'))
    try {
      const r = cp.spawnSync('node', [SYNC_CLI, '--direction', 'pull', '--root', tmp],
        { cwd: elsewhere, encoding: 'utf8' })

      expect(r.status, r.stderr).to.equal(0)
      expect(fs.existsSync(path.join(tmp, '.t2f-base'))).to.equal(true)
      expect(fs.existsSync(path.join(elsewhere, '.t2f-base'))).to.equal(false)
    } finally {
      fs.rmSync(elsewhere, { recursive: true, force: true })
    }
  })
})
