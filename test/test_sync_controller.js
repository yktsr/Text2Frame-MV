const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

const sync = require('../t2f-sync.js')

function texts (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}

describe('t2f-sync controller', function () {
  let tmp
  let opts

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2fsync-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        pages: [{ list: [
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          { code: 401, indent: 0, parameters: ['Hello'] },
          // dev-added switch。121(スイッチの操作)の引数は実データでは3つ。4つにすると
          // テキスト往復した祖先([7,7,0])とゲーム([7,7,0,0])が食い違い、偽の衝突になる。
          { code: 121, indent: 0, parameters: [7, 7, 0] },
          { code: 0, indent: 0, parameters: [] }
        ] }]
      }]
    }))
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([
      null,
      { id: 1, list: [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: ['CommonHello'] },
        { code: 0, indent: 0, parameters: [] }
      ] }
    ]))
    opts = { root: tmp, dataDir: 'data', textDir: 'text', locale: 'ja', strategy: 'merge' }
  })
  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  const evText = function () { return path.join(tmp, 'text', 'ja', 'map001_event001_page1.txt') }
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
    expect(fs.existsSync(path.join(tmp, '.t2f-base', 'ja', 'map001_event001_page1.txt'))).to.equal(true)
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
    expect(after).to.contain('こんにちは')  // translation survived
    expect(after).to.contain('NewDevLine')  // game change pulled in
  })

  // 取り出しの鏡写し: 反映が書き換えるのはゲームなので、祖先には書き換えなかった側=テキストが
  // 入る。衝突していても進める(テキストの変更は目印の中でゲームに入っている)。据え置くと、
  // ツクールで解決したあとの取り出しで同じ衝突がテキスト側に再発する。
  it('push with a conflict still advances .t2f-base to the text side', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts) // base := Hello
    const basePath = path.join(tmp, '.t2f-base', 'ja', 'map001_event001_page1.txt')
    // Diverge both sides on the same line → genuine 3-way conflict.
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'Bonjour')) // theirs (text)
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list[1].parameters[0] = 'ゲーム変更' // ours (game)
    fs.writeFileSync(mapPath, JSON.stringify(map))

    const res = sync.pushFile(evText(), opts)

    expect(res.ok).to.equal(true)
    expect(res.conflicts).to.be.greaterThan(0)
    const base = fs.readFileSync(basePath, 'utf8')
    expect(base).to.contain('Bonjour')
    expect(base).to.not.contain('ゲーム変更')
    expect(base).to.not.contain('=== どちらかを残し') // 祖先に目印は入れない
  })

  // 衝突しても祖先は進める。祖先が示すのは「ここまでのゲームの変更はテキストが見た」で
  // あって「一致した」ではなく、ゲームの変更は目印の中に入っているため。据え置くと、
  // テキストで解決したあとの push で同じ衝突がゲーム側に再発する(次のテスト)。
  it('pull with a conflict still advances .t2f-base to the game side', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    sync.pullDataFile(mapPath, opts) // base := Hello
    const basePath = path.join(tmp, '.t2f-base', 'ja', 'map001_event001_page1.txt')
    // Diverge both sides on the same line → conflict on pull.
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'Bonjour')) // theirs (text)
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list[1].parameters[0] = 'ゲーム変更' // ours (game)
    fs.writeFileSync(mapPath, JSON.stringify(map))

    const res = sync.pullDataFile(mapPath, opts)

    expect(res[0].conflicts).to.be.greaterThan(0)
    const base = fs.readFileSync(basePath, 'utf8')
    expect(base).to.contain('ゲーム変更')
    expect(base).to.not.contain('Bonjour')
    expect(base).to.not.contain('=== どちらかを残し') // 祖先に目印は入れない
  })

  // 取り出しで衝突 -> テキストで解決 -> 統合のまま反映すると、その決着がゲームに入る。
  // 祖先を据え置いていた頃は、ここで同じ衝突がゲーム側に再発していた。
  it('resolving a pull conflict in the text reaches the game with a plain merge push', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    sync.pullDataFile(mapPath, opts)
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'テキストの版'))
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    map.events[1].pages[0].list[1].parameters[0] = 'ゲームの版'
    fs.writeFileSync(mapPath, JSON.stringify(map))
    expect(sync.pullDataFile(mapPath, opts)[0].conflicts).to.be.greaterThan(0)

    // テキストエディタで目印3行を消し、テキスト側の版を残す
    const text = fs.readFileSync(evText(), 'utf8')
    const header = text.slice(0, text.indexOf('\n---\n') + 5)
    fs.writeFileSync(evText(), header + '\n<Face: (0)><Background: Window><WindowPosition: Bottom>\nテキストの版\n')

    const res = sync.pushFile(evText(), opts) // 統合のまま(上書き不要)

    expect(res.ok).to.equal(true)
    expect(res.conflicts || 0).to.equal(0)
    expect(mapList().some(function (c) { return c.code === 108 })).to.equal(false)
    expect(texts(mapList())).to.eql(['テキストの版'])
  })

  // 祖先(.t2f-base)は「テキストとゲームが実際に一致していた地点」でなければならない。
  // 取り出しが書き換えるのはテキストなので、祖先にはゲーム側が入る。ここを間違えて
  // マージ結果を祖先にすると、次の反映で 3-way が「ゲームが消した」と誤読して、
  // 取り出し前にテキストへ書いた分が衝突 0 件のまま黙って消える。
  it('pull records the game side as the ancestor, not the merged text', function () {
    const mapPath = path.join(tmp, 'data', 'Map001.json')
    sync.pullDataFile(mapPath, opts)

    const basePath = path.join(tmp, '.t2f-base', 'ja', 'map001_event001_page1.txt')
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
  // 「目印が入った方で決めて、反対側へ流す」。同じ向きのやり直しでは直らない。
  describe('escaping a push conflict', function () {
    const mapPath = function () { return path.join(tmp, 'data', 'Map001.json') }
    // ゲーム側で目印3行を消し、ゲームの版だけを残した状態にする。
    const resolveInGame = function () {
      const map = JSON.parse(fs.readFileSync(mapPath(), 'utf8'))
      map.events[1].pages[0].list = [
        { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 0, parameters: ['ゲームの版'] },
        { code: 0, indent: 0, parameters: [] }
      ]
      fs.writeFileSync(mapPath(), JSON.stringify(map))
    }
    beforeEach(function () {
      sync.pullDataFile(mapPath(), opts) // 祖先 := Hello
      // 同じ場所をテキストとゲームで別々に変える
      fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8').replace('Hello', 'テキストの版'))
      const map = JSON.parse(fs.readFileSync(mapPath(), 'utf8'))
      map.events[1].pages[0].list[1].parameters[0] = 'ゲームの版'
      fs.writeFileSync(mapPath(), JSON.stringify(map))
      sync.pushFile(evText(), opts) // 衝突 -> 目印がゲームに入る
      expect(mapList().some(function (c) { return c.code === 108 })).to.equal(true)
    })

    // 同じ向きにもう一度流しても壊れはしない(目印は消える)が、決着はテキストに伝わらない。
    // 反対側へ流す(取り出す)まではテキストが古いまま。
    it('re-pushing after resolving in the game clears the markers but leaves the text stale', function () {
      resolveInGame()

      const res = sync.pushFile(evText(), opts)

      expect(res.ok).to.equal(true)
      expect(res.conflicts || 0).to.equal(0)
      expect(mapList().some(function (c) { return c.code === 108 })).to.equal(false)
      expect(texts(mapList())).to.eql(['ゲームの版']) // ツクールでの決着が残る
      expect(fs.readFileSync(evText(), 'utf8')).to.contain('テキストの版') // テキストは未追従
    })

    it('pulling with overwrite carries the markers into the text, so it can be resolved there', function () {
      const res = sync.pullDataFile(mapPath(), Object.assign({}, opts, { strategy: 'overwrite' }))
      expect(res[0].markers).to.equal(true)

      const text = fs.readFileSync(evText(), 'utf8')
      expect(text).to.contain('=== どちらかを残し') // 目印ごと出ている
      expect(text).to.contain('テキストの版')
      expect(text).to.contain('ゲームの版')
      // 祖先に目印を取り込むと次回の 3-way が壊れるので進めない。
      expect(fs.readFileSync(path.join(tmp, '.t2f-base', 'ja', 'map001_event001_page1.txt'), 'utf8'))
        .to.not.contain('=== どちらかを残し')

      // テキストで目印3行と片方を消し、上書きで反映すれば三者が揃う。
      const header = text.slice(0, text.indexOf('\n---\n') + 5)
      fs.writeFileSync(evText(), header + '\n<Face: (0)><Background: Window><WindowPosition: Bottom>\nテキストの版\n')
      const push = sync.pushFile(evText(), Object.assign({}, opts, { strategy: 'overwrite' }))
      expect(push.ok).to.equal(true)
      expect(mapList().some(function (c) { return c.code === 108 })).to.equal(false)
      expect(texts(mapList())).to.eql(['テキストの版'])
      // 揃ったので、次の統合反映は衝突しない。
      expect(sync.pushFile(evText(), opts).conflicts || 0).to.equal(0)
    })

    // 反映で衝突 -> ツクールで解決 -> 統合のまま取り出す、で片が付く(上書きは要らない)。
    it('resolving in the game then pulling with a plain merge clears it', function () {
      resolveInGame()

      const res = sync.pullDataFile(mapPath(), opts) // 統合のまま

      expect(res[0].skipped).to.equal(undefined)
      expect(res[0].conflicts || 0).to.equal(0)
      const text = fs.readFileSync(evText(), 'utf8')
      expect(text).to.contain('ゲームの版')
      expect(text).to.not.contain('テキストの版')
      expect(text).to.not.contain('=== どちらかを残し')
      // 3つが揃ったので次の統合反映も衝突しない。
      expect(sync.pushFile(evText(), opts).conflicts || 0).to.equal(0)
      expect(mapList().some(function (c) { return c.code === 108 })).to.equal(false)
    })

    it('resolving in the game then pulling with overwrite clears it for good', function () {
      resolveInGame()
      sync.pullDataFile(mapPath(), Object.assign({}, opts, { strategy: 'overwrite' }))

      const text = fs.readFileSync(evText(), 'utf8')
      expect(text).to.contain('ゲームの版')
      expect(text).to.not.contain('=== どちらかを残し')
      // テキスト・ゲーム・祖先の3つが揃ったので、次の統合反映は衝突しない。
      const res = sync.pushFile(evText(), opts)
      expect(res.ok).to.equal(true)
      expect(res.conflicts || 0).to.equal(0)
      expect(mapList().some(function (c) { return c.code === 108 })).to.equal(false)
      expect(texts(mapList())).to.eql(['ゲームの版'])
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

  it('pull honours a per-file strategy from the front matter', function () {
    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts)
    // このファイルだけ overwrite 指定にして、テキスト側の編集を捨てさせる
    fs.writeFileSync(evText(), fs.readFileSync(evText(), 'utf8')
      .replace('kind: event', 'kind: event\nstrategy: overwrite')
      .replace('Hello', 'Bonjour'))

    sync.pullDataFile(path.join(tmp, 'data', 'Map001.json'), opts) // opts は merge

    const out = fs.readFileSync(evText(), 'utf8')
    expect(out).to.contain('Hello')
    expect(out).to.not.contain('Bonjour')
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
    expect(r.pulled.length).to.equal(2)  // Map001 event + common001
    expect(r.pushed.length).to.equal(2)
    expect(r.pulled.concat(r.pushed).every(function (x) { return x.ok })).to.equal(true)
  })

  it('echo guard suppresses the controller\'s own write, then re-arms', function () {
    const guard = sync.createEchoGuard()
    const f = path.join(tmp, 'probe.txt')

    fs.writeFileSync(f, 'written-by-us')
    guard.record(f, 'written-by-us')
    expect(guard.isEcho(f)).to.equal(true)   // our own write -> ignored
    expect(guard.isEcho(f)).to.equal(false)  // consumed; no longer suppressed

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
})
