const chai = require('chai')
const expect = chai.expect
const vm = require('vm')
const { monitorScript } = require('../out/liveMonitor')
const { parseLiveMessage } = require('../out/liveState')

/* 外から操るのに足した2つ - キーとタップを送れること、いま何が見えているかを
 * 言えること。偽のゲームを vm に入れて確かめる(手本は test/test_browser_load.js)。 */
describe('the injected script can press keys and say where it is', function () {
  const TOKEN = '0'.repeat(32)

  /** 偽のゲーム。必要な所だけ生やし、本物の入口からスクリプトを動かす。 */
  const fakeGame = function (extra) {
    const posted = []
    let source = null
    let ticker = null
    const win = {
      Input: { _currentState: {}, _latestButton: null, _pressedTime: 0 },
      TouchInput: { taps: [], _onTrigger: function (x, y) { this.taps.push([x, y]) } },
      SceneManager: { _scene: { constructor: { name: 'Scene_Map' } } },
      $gameMessage: { isBusy: function () { return true }, isChoice: function () { return false } },
      $gamePlayer: { x: 5, y: 7, direction: function () { return 2 } },
      location: { reload: function () {} },
      EventSource: function () { source = {}; return source },
      setInterval: function (fn) { ticker = fn; return 0 },
      fetch: function (url, init) {
        try { posted.push(JSON.parse(init.body)) } catch (e) { /* ignore */ }
        return { catch: function () {} }
      }
    }
    Object.keys(extra || {}).forEach(function (k) { win[k] = extra[k] })
    win.window = win
    const context = vm.createContext(win)
    vm.runInContext(monitorScript(TOKEN).replace(/^<script>|<\/script>$/g, ''), context)
    return {
      win,
      posted,
      send: function (command) { source.onmessage({ data: JSON.stringify(command) }) },
      tick: function (times) { for (let i = 0; i < (times || 1); i++) ticker() }
    }
  }

  it('bakes the token into the script', function () {
    expect(monitorScript(TOKEN)).to.contain(TOKEN)
  })

  it('presses a key the way the engine does', function () {
    const game = fakeGame()
    game.send({ input: { keys: ['ok'] } })

    expect(game.win.Input._currentState.ok, 'ok が押されていません').to.equal(true)
    expect(game.win.Input._latestButton).to.equal('ok')
  })

  it('lets go of the key after a few frames', function () {
    const game = fakeGame()
    game.send({ input: { keys: ['ok'], hold: 2 } })
    expect(game.win.Input._currentState.ok).to.equal(true)

    game.tick(3)
    expect(game.win.Input._currentState.ok, 'ずっと押しっぱなしです').to.equal(false)
  })

  it('takes several keys at once, and a bare key', function () {
    const game = fakeGame()
    game.send({ input: { keys: ['up', 'ok'] } })
    expect(game.win.Input._currentState.up).to.equal(true)
    expect(game.win.Input._currentState.ok).to.equal(true)

    game.send({ input: { key: 'cancel' } })
    expect(game.win.Input._currentState.cancel).to.equal(true)
  })

  it('ignores a name that is not a key', function () {
    const game = fakeGame()
    game.send({ input: { keys: ['__proto__', 'a b', 12, ''] } })

    expect(Object.keys(game.win.Input._currentState)).to.eql([])
  })

  it('sends a tap straight to TouchInput', function () {
    const game = fakeGame()
    game.send({ input: { tap: { x: 120, y: 240 } } })

    expect(game.win.TouchInput.taps).to.eql([[120, 240]])
  })

  it('still presses when the game has no save data yet', function () {
    const game = fakeGame({ $gameSwitches: undefined, $gameVariables: undefined })
    game.send({ input: { keys: ['ok'] } })

    expect(game.win.Input._currentState.ok, 'タイトル画面で押せていません').to.equal(true)
  })

  it('says what is on screen and where the player stands', function () {
    const game = fakeGame()
    game.tick(2)
    const reported = game.posted.filter(function (m) { return m.scene !== undefined })[0]

    expect(reported, '見え方を1度も報告していません').to.be.an('object')
    expect(reported.scene).to.equal('Scene_Map')
    expect(reported.message).to.eql({ busy: true, choice: false })
    expect(reported.player).to.eql({ x: 5, y: 7, direction: 2 })
  })

  it('says it is on the title screen, where there is no save data yet', function () {
    const game = fakeGame({
      $gameSwitches: undefined,
      $gameVariables: undefined,
      $gamePlayer: undefined,
      SceneManager: { _scene: { constructor: { name: 'Scene_Title' } } },
      $gameMessage: undefined
    })
    game.tick(2)
    const reported = game.posted.filter(function (m) { return m.scene !== undefined })[0]

    expect(reported, 'タイトル画面で何も報告していません').to.be.an('object')
    expect(reported.scene).to.equal('Scene_Title')
    expect(reported.message).to.eql({ busy: false, choice: false })
  })

  /* 変わらないうちは黙る。 */
  it('says it only when it changed', function () {
    const game = fakeGame()
    game.tick(4)

    expect(game.posted.filter(function (m) { return m.scene !== undefined })).to.have.lengthOf(1)
  })

  it('gets the new fields through the parser', function () {
    const parsed = parseLiveMessage({
      scene: 'Scene_Battle',
      message: { busy: false, choice: true },
      player: { x: 1, y: 2, direction: 8 }
    })

    expect(parsed.scene).to.equal('Scene_Battle')
    expect(parsed.message).to.eql({ busy: false, choice: true })
    expect(parsed.player).to.eql({ x: 1, y: 2, direction: 8 })
  })

  it('turns down a report that is the wrong shape', function () {
    expect(parseLiveMessage({ player: { x: -1, y: 0, direction: 0 } })).to.equal(undefined)
    expect(parseLiveMessage({ scene: 'a b c' })).to.equal(undefined)
    expect(parseLiveMessage({ message: { busy: 'yes' } })).to.equal(undefined)
  })
})
