const { expect } = require('chai')
const vm = require('vm')
const { monitorScript } = require('../out/liveMonitor')
const { parseLiveMessage, LiveState } = require('../out/liveState')

/* ツクールのセーブを、動いているゲームの置き場所へ入れて再開するところ。
 *
 * **入れる名前は、置き場所を決められるものだけ。** MV では番号なしが設定(音量など)の鍵に
 * なるので、番号でも global でもない名前を通すと、ゲームの設定の上に書いてしまう。
 * 実物のゲームにプラグイン自身の `.rpgsave` が混ざっていて、それで気づいた。
 *
 * **読めなかったときは理由も言う。** 「読めませんでした」だけでは、セーブが壊れているのか、
 * プラグインを入れ替えて古いセーブが使えなくなったのかが分からない。
 *
 * 偽のゲームを vm に入れて、本物の入口から動かす(手本は test/test_liveInput.js)。 */
describe('bringing saves in and resuming from them', function () {
  const TOKEN = '0'.repeat(32)

  /* started を false にすると、ゲームが始まっていない状態(タイトル画面)になる。
   * ツクールは起動時に一度 setupNewGame するので普段は在るが、プラグインが
   * Scene_Boot を差し替えていると無いことがある。 */
  const fakeGame = function (extra, started) {
    const posted = []
    let source = null
    let ticker = null
    const win = {
      SceneManager: { _scene: { constructor: { name: 'Scene_Title' } }, goto: function (scene) { this.went = scene } },
      Scene_Map: function () {},
      $gameMessage: { isBusy: function () { return false }, isChoice: function () { return false } },
      location: { reload: function () {} },
      EventSource: function () { source = {}; return source },
      setInterval: function (fn) { ticker = fn; return 0 },
      fetch: function (url, init) {
        try { posted.push(JSON.parse(init.body)) } catch (e) { /* ignore */ }
        return { catch: function () {} }
      }
    }
    if (started !== false) {
      win.$gameSwitches = { _data: [] }
      win.$gameVariables = { _data: [] }
    }
    Object.keys(extra || {}).forEach(function (k) { win[k] = extra[k] })
    win.window = win
    vm.runInContext(monitorScript(TOKEN), vm.createContext(win))
    return {
      win,
      posted,
      send: function (command) { source.onmessage({ data: JSON.stringify(command) }) },
      tick: function () { ticker() },
      /** 最後に報せたうちの、その鍵を持つもの。 */
      last: function (key) {
        for (let i = posted.length - 1; i >= 0; i--) if (posted[i][key] !== undefined) return posted[i]
        return undefined
      }
    }
  }

  /** MV。localStorage に入れ、鍵はゲーム自身の webStorageKey が決める。 */
  const mvGame = function () {
    const store = {}
    return {
      store,
      game: fakeGame({
        localStorage: {
          setItem: function (key, value) { store[key] = value },
          getItem: function (key) { return store[key] === undefined ? null : store[key] }
        },
        StorageManager: {
          webStorageKey: function (id) {
            if (id < 0) return 'RPG Config'
            if (id === 0) return 'RPG Global'
            return 'RPG File' + id
          }
        }
      })
    }
  }

  /** MZ。localforage に入れ、鍵はゲーム自身の forageKey が決める。 */
  const mzGame = function () {
    const items = {}
    return {
      items,
      game: fakeGame({
        localforage: {
          setItem: function (key, value) { items[key] = value; return Promise.resolve() }
        },
        StorageManager: {
          forageKey: function (name) { return 'rmmzsave.1.' + name },
          updateForageKeys: function () { return Promise.resolve() }
        }
      })
    }
  }

  const ROWS = [
    { name: 'file1', data: 'いち' },
    { name: 'global', data: 'ぜんたい' }
  ]

  it('puts an MV save where that game keeps it', function () {
    const mv = mvGame()

    mv.game.send({ importSaves: ROWS })
    mv.game.tick()

    expect(mv.store).to.eql({ 'RPG File1': 'いち', 'RPG Global': 'ぜんたい' })
    expect(mv.game.last('imported').imported).to.eql({ done: 2, failed: 0 })
  })

  /* いちばん大事な1件。プラグインが自分のデータを同じ拡張子で隣に置いていることがある。
   * 番号でない名前を通すと、MV ではそれが**設定の鍵**になる。 */
  it('never writes a name it cannot place, so the settings survive', function () {
    const mv = mvGame()
    mv.store['RPG Config'] = 'おんりょうなど'

    mv.game.send({ importSaves: ROWS.concat([{ name: 'SoundTest', data: 'ぷらぐいんのもの' }]) })
    mv.game.tick()

    expect(mv.store['RPG Config'], '設定が上書きされています').to.equal('おんりょうなど')
    expect(mv.game.last('imported').imported).to.eql({ done: 2, failed: 1 })
  })

  it('puts an MZ save where that game keeps it', async function () {
    const mz = mzGame()

    mz.game.send({ importSaves: ROWS.concat([{ name: 'SoundTest', data: 'ぷらぐいんのもの' }]) })
    await new Promise(function (r) { setImmediate(r) })
    mz.game.tick()

    expect(Object.keys(mz.items).sort()).to.eql(['rmmzsave.1.file1', 'rmmzsave.1.global'])
    expect(mz.game.last('imported').imported).to.eql({ done: 2, failed: 1 })
  })

  it('says nothing was stored when it cannot reach either place', function () {
    const game = fakeGame({ StorageManager: {} })

    game.send({ importSaves: ROWS })
    game.tick()

    expect(game.last('imported').imported).to.eql({ done: 0, failed: 2 })
  })

  /* 本物の MV は loadGame と loadGameWithoutRescue の両方を持ち、MZ は前者だけ。
   * 注入するスクリプトは前者が在ることを確かめてから動くので、偽物にも置く。 */
  const loader = function (extra) {
    return Object.assign({
      maxSavefiles: function () { return 20 },
      isThisGameFile: function () { return true },
      loadGame: function () { return true }
    }, extra)
  }

  it('resumes from a save and goes to the map', function () {
    const game = fakeGame({ DataManager: loader({ loadGameWithoutRescue: function () { return true } }) })

    game.send({ load: 1 })
    game.tick()

    expect(game.last('load').load).to.equal('loaded')
    expect(game.win.SceneManager.went).to.equal(game.win.Scene_Map)
  })

  /* **読み込んだあとの後始末は、ゲーム自身にさせる。** 呼ばないと遊んだ時間が 0 に戻り、
   * セーブ時の BGM が鳴らず、ここに相乗りしているプラグインの分も元に戻らない。
   * ツクール本体は読み込みの画面を閉じるときに呼んでいる。 */
  it('lets the game put itself in order after reading the save', function () {
    const order = []
    const game = fakeGame({
      SceneManager: { _scene: { constructor: { name: 'Scene_Title' } }, goto: function () { order.push('goto') } },
      $gameSystem: { onAfterLoad: function () { order.push('onAfterLoad') } },
      DataManager: loader({ loadGameWithoutRescue: function () { return true } })
    })

    game.send({ load: 1 })
    game.tick()

    expect(game.last('load').load).to.equal('loaded')
    expect(order, '後始末を頼んでいません').to.eql(['goto', 'onAfterLoad'])
  })

  it('still resumes from a game that has no such tidying up', function () {
    const game = fakeGame({ $gameSystem: {}, DataManager: loader({ loadGameWithoutRescue: function () { return true } }) })

    game.send({ load: 1 })
    game.tick()

    expect(game.last('load').load).to.equal('loaded')
  })

  /* MV。loadGame は理由を自分で飲んでしまうので、投げる方を呼んで理由を拾う。 */
  it('says why an MV save could not be read', function () {
    const game = fakeGame({
      DataManager: loader({
        loadGameWithoutRescue: function () { throw new Error('クラス Window_Hoge がありません') },
        loadGame: function () { return false }
      })
    })

    game.send({ load: 3 })
    game.tick()

    const told = game.last('load')
    expect(told.load).to.equal('failed')
    expect(told.loadError).to.equal('クラス Window_Hoge がありません')
  })

  /* MZ は約束(Promise)で返すので、断られた方で理由を受ける。 */
  it('says why an MZ save could not be read', async function () {
    const game = fakeGame({
      DataManager: loader({ loadGame: function () { return Promise.reject(new Error('セーブが壊れています')) } })
    })

    game.send({ load: 2 })
    await new Promise(function (r) { setImmediate(r) })
    game.tick()

    const told = game.last('load')
    expect(told.load).to.equal('failed')
    expect(told.loadError).to.equal('セーブが壊れています')
  })

  it('says there is no save in that slot instead of a reason', function () {
    const game = fakeGame({ DataManager: loader({ isThisGameFile: function () { return false }, loadGame: function () { return true } }) })

    game.send({ load: 9 })
    game.tick()

    const told = game.last('load')
    expect(told.load).to.equal('noSave')
    expect(told.loadError).to.equal(undefined)
  })

  /* **返事はゲームが始まっていなくても返す。** 取り込みも再開も、頼むのはたいてい
   * タイトル画面(まだ何も始まっていない)。返事が返らないと、頼んだ側には
   * 「返事が来ませんでした」としか言えない。 */
  it('answers even before a game has started', function () {
    const store = {}
    const game = fakeGame({
      localStorage: { setItem: function (k, v) { store[k] = v }, getItem: function () { return null } },
      StorageManager: { webStorageKey: function (id) { return 'RPG File' + id } },
      DataManager: loader({ loadGameWithoutRescue: function () { return true } })
    }, false)

    game.send({ importSaves: ROWS })
    game.send({ saves: true })
    game.send({ load: 1 })
    game.tick()

    const told = game.last('load')
    expect(told, 'タイトル画面では返事が返っていません').to.not.equal(undefined)
    expect(told.load).to.equal('loaded')
    expect(told.imported).to.eql({ done: 2, failed: 0 })
    expect(told.saves).to.not.equal(undefined)
  })

  /* 理由は、受け取る側(parseLiveMessage)が通さないと画面まで届かない。 */
  it('carries the reason through to the state the extension reads', function () {
    const message = parseLiveMessage({ load: 'failed', loadError: 'セーブが壊れています' })
    const state = new LiveState()

    state.apply(message, Date.now())

    expect(state.lastLoad.result).to.equal('failed')
    expect(state.lastLoad.why).to.equal('セーブが壊れています')
  })

  it('drops a reason that is too long to be one', function () {
    expect(parseLiveMessage({ load: 'failed', loadError: 'あ'.repeat(201) })).to.equal(undefined)
  })
})
