const chai = require('chai')
const expect = chai.expect
const vm = require('vm')
const { monitorScript } = require('../out/liveMonitor')
const { parseLiveMessage, LiveState } = require('../out/liveState')

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

  it('says nothing while the scene has no name yet, then says it once it has one', function () {
    const game = fakeGame({ SceneManager: { _scene: null } })
    game.tick(2)
    expect(game.posted.filter(function (m) { return m.scene !== undefined }), '名乗れないのに報告しています').to.have.lengthOf(0)

    game.win.SceneManager._scene = { constructor: { name: 'Scene_Title' } }
    game.tick(1)
    const reported = game.posted.filter(function (m) { return m.scene !== undefined })

    expect(reported, '画面が決まったのに報告していません').to.have.lengthOf(1)
    expect(reported[0].scene).to.equal('Scene_Title')
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

  it('keeps the view that came in the same message as a reset', function () {
    const state = new LiveState()
    state.apply(parseLiveMessage({ reset: true, scene: 'Scene_Title', message: { busy: false, choice: false } }), 1000)

    expect(state.scene, 'reset と一緒に来た見え方が消えています').to.equal('Scene_Title')
    expect(state.message).to.eql({ busy: false, choice: false })
  })

  it('forgets the view on a reset that carries none', function () {
    const state = new LiveState()
    state.apply(parseLiveMessage({ scene: 'Scene_Map', player: { x: 1, y: 2, direction: 4 } }), 1000)
    state.apply(parseLiveMessage({ reset: true }), 2000)

    expect(state.scene).to.equal(undefined)
    expect(state.player).to.equal(undefined)
  })

  /* 画面に出ている文面そのものを言う。開いているかどうかだけでは、自分が出したかった
   * 台詞が出たのかを確かめられない。 */
  it('reports the text the message is showing, and the choices', function () {
    const game = fakeGame({
      $gameMessage: {
        isBusy: function () { return true },
        isChoice: function () { return true },
        _texts: ['【スーズ】', 'ねぇ…君になら'],
        _choices: ['逃げる', '見る']
      }
    })
    game.tick(2)
    const reported = game.posted.filter(function (m) { return m.scene !== undefined })[0]

    expect(reported.message.lines).to.eql(['【スーズ】', 'ねぇ…君になら'])
    expect(reported.message.choices).to.eql(['逃げる', '見る'])
  })

  /* 開いていないときに前の文面を残さない(古い台詞を今のものと読み違える)。 */
  it('says no text while no message is open', function () {
    const game = fakeGame()
    game.win.$gameMessage = { isBusy: function () { return false }, isChoice: function () { return false }, _texts: ['のこり'] }
    game.tick(2)
    const reported = game.posted.filter(function (m) { return m.scene !== undefined })[0]

    expect(reported.message.lines).to.equal(undefined)
  })

  it('gets the shown text through the parser, and turns down what is too much', function () {
    const parsed = parseLiveMessage({ message: { busy: true, choice: false, lines: ['あ'] } })
    expect(parsed.message.lines).to.eql(['あ'])

    const many = []
    for (let i = 0; i < 9; i++) many.push('x')
    expect(parseLiveMessage({ message: { busy: true, choice: false, lines: many } })).to.equal(undefined)
    expect(parseLiveMessage({ message: { busy: true, choice: false, lines: ['x'.repeat(401)] } })).to.equal(undefined)
    expect(parseLiveMessage({ message: { busy: true, choice: false, lines: [1] } })).to.equal(undefined)
  })

  it('turns down a report that is the wrong shape', function () {
    expect(parseLiveMessage({ player: { x: -1, y: 0, direction: 0 } })).to.equal(undefined)
    expect(parseLiveMessage({ scene: 'a b c' })).to.equal(undefined)
    expect(parseLiveMessage({ message: { busy: 'yes' } })).to.equal(undefined)
  })
})
