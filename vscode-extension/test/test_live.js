const { expect } = require('chai')
const vm = require('vm')
const { monitorScript, injectMonitor, LIVE_STATE_PATH, LIVE_TOKEN_HEADER } = require('../out/liveMonitor')
const { parseLiveMessage, parseVariableInput, LiveState, liveLine, selfSwitchLine, formatLiveValue, LIVE_TIMEOUT } = require('../out/liveState')
const { commandMark } = require('../out/db/runLines')

const fakeGame = function () {
  const sent = []
  let tick
  let clock = 1000
  const window = {}
  const opened = {}
  const sandbox = {
    window,
    EventSource: function (url) { this.url = url; opened.source = this },
    encodeURIComponent,
    Number,
    Date: { now: function () { return clock } },
    setInterval: function (fn) { tick = fn },
    fetch: function (url, init) {
      sent.push({ url, headers: init.headers, body: JSON.parse(init.body) })
      return Promise.resolve()
    },
    JSON,
    Math,
    String
  }
  vm.runInNewContext(monitorScript('abc123'), sandbox)
  return {
    window,
    sent,
    source: function () { return opened.source },
    step: function (ms) { clock += ms || 100; tick() }
  }
}

describe('liveMonitor', function () {
  it('reports the values once the game is ready', function () {
    const g = fakeGame()
    g.step()
    expect(g.sent).to.eql([])
    g.window.$gameSwitches = { _data: [null, true, false, undefined, true] }
    g.window.$gameVariables = { _data: [null, 5, undefined, 'abc'] }
    g.step()
    expect(g.sent).to.have.length(1)
    expect(g.sent[0].url).to.equal(LIVE_STATE_PATH)
    expect(g.sent[0].headers[LIVE_TOKEN_HEADER]).to.equal('abc123')
    expect(g.sent[0].body).to.eql({
      reset: true,
      switches: { 1: true, 4: true },
      variables: { 1: 5, 3: 'abc' },
      map: 0
    })
  })

  it('reports only changes afterwards', function () {
    const g = fakeGame()
    g.window.$gameSwitches = { _data: [null, true] }
    g.window.$gameVariables = { _data: [null, 5] }
    g.step()
    g.window.$gameSwitches._data[1] = false
    g.window.$gameSwitches._data[7] = true
    g.window.$gameVariables._data[1] = 6
    g.step()
    expect(g.sent[1].body).to.eql({ switches: { 1: false, 7: true }, variables: { 1: 6 } })
    for (let i = 0; i < 10; i++) g.step()
    expect(g.sent).to.have.length(2)
    for (let i = 0; i < 10; i++) g.step()
    expect(g.sent).to.have.length(3)
    expect(g.sent[2].body).to.eql({})
  })

  it('reports again after a new game or a load', function () {
    const g = fakeGame()
    g.window.$gameSwitches = { _data: [null, true] }
    g.window.$gameVariables = { _data: [null, 5] }
    g.step()
    g.window.$gameSwitches = { _data: [null, false, true] }
    g.step()
    expect(g.sent[1].body).to.eql({ reset: true, switches: { 2: true }, variables: { 1: 5 }, map: 0 })
  })

  it('reports self switches and the current map', function () {
    const g = fakeGame()
    let mapId = 12
    g.window.$gameSwitches = { _data: [] }
    g.window.$gameVariables = { _data: [] }
    g.window.$gameSelfSwitches = { _data: { '12,5,A': true, '3,1,B': true, 'other': true } }
    g.window.$gameMap = { mapId: function () { return mapId } }
    g.step()
    expect(g.sent[0].body).to.eql({ reset: true, selfSwitches: { '12,5,A': true, '3,1,B': true }, map: 12 })
    delete g.window.$gameSelfSwitches._data['12,5,A']
    g.window.$gameSelfSwitches._data['12,5,C'] = true
    g.step()
    expect(g.sent[1].body).to.eql({ selfSwitches: { '12,5,C': true, '12,5,A': false } })
    mapId = 3
    g.step()
    expect(g.sent[2].body).to.eql({ map: 3 })
    g.window.$gameSelfSwitches = { _data: {} }
    g.step()
    expect(g.sent[3].body).to.eql({ reset: true, map: 3 })
  })

  it('writes self switches from the extension into the game', function () {
    const g = fakeGame()
    const calls = []
    g.window.$gameSwitches = { _data: [] }
    g.window.$gameVariables = { _data: [] }
    g.window.$gameSelfSwitches = {
      _data: {},
      setValue: function (key, v) { calls.push([key, v]); if (v) this._data[key.join(',')] = true; else delete this._data[key.join(',')] }
    }
    g.step()
    g.source().onmessage({ data: JSON.stringify({ selfSwitches: { '12,5,A': true, '12,5': true, 'x,1,A': true, '12,6,B': 'on' } }) })
    expect(calls).to.eql([[[12, 5, 'A'], true]])
    expect(g.sent[g.sent.length - 1].body).to.eql({ selfSwitches: { '12,5,A': true } })
  })

  it('reports arrays and objects as short text', function () {
    const g = fakeGame()
    g.window.$gameSwitches = { _data: [] }
    g.window.$gameVariables = { _data: [null, [1, 2], { a: 'x'.repeat(300) }] }
    g.step()
    expect(g.sent[0].body.variables[1]).to.equal('[1,2]')
    expect(g.sent[0].body.variables[2]).to.have.length(201)
  })

  it('writes values from the extension into the game', function () {
    const g = fakeGame()
    expect(g.source().url).to.equal('/__t2f/events?token=abc123')
    const calls = []
    const store = function (kind) {
      return { _data: [], setValue: function (id, v) { calls.push([kind, id, v]); this._data[id] = v } }
    }
    g.source().onmessage({ data: '{"switches":{"3":true}}' })
    expect(calls).to.eql([])
    g.window.$gameSwitches = store('switch')
    g.window.$gameVariables = store('variable')
    g.step()
    g.source().onmessage({ data: JSON.stringify({ switches: { 3: true, 4: 'yes', 0: true }, variables: { 5: 12, 6: 'abc', 7: {} } }) })
    expect(calls).to.eql([['switch', 3, true], ['variable', 5, 12], ['variable', 6, 'abc']])
    expect(g.sent[g.sent.length - 1].body).to.eql({ switches: { 3: true }, variables: { 5: 12, 6: 'abc' } })
    g.source().onmessage({ data: 'not json' })
    expect(calls).to.have.length(3)
  })

  describe('running events', function () {
    const page = function (codes) {
      return codes.map(function (code) { return { code, indent: 0, parameters: code === 101 ? ['', 0, 0, 2] : code === 401 ? ['やあ'] : [] } }).concat([{ code: 0, indent: 0, parameters: [] }])
    }
    const game = function () {
      const g = fakeGame()
      const map = {
        pages: [{ list: page([230]) }, { list: page([101, 401, 117, 121]) }],
        route: { list: [{ code: 205, indent: 0, parameters: [-1, { list: [{ code: 1, indent: null }], repeat: false, skippable: false, wait: true }] }, { code: 0, indent: 0, parameters: [] }] }
      }
      const common = { id: 7, list: page([230, 250]) }
      let mapId = 4
      g.window.$gameSwitches = { _data: [] }
      g.window.$gameVariables = { _data: [] }
      g.window.$dataMap = { events: [null, null, { pages: map.pages }] }
      g.window.$dataCommonEvents = [null, null, null, null, null, null, null, common]
      g.window.$gameMap = {
        mapId: function () { return mapId },
        event: function () { return { _pageIndex: 1 } },
        _interpreter: { _list: null, _index: 0, _mapId: 4, _eventId: 0, _childInterpreter: null }
      }
      return { g, map, common, moveTo: function (id) { mapId = id } }
    }

    it('reports the running event page and the command it started last', function () {
      const { g, map } = game()
      g.step()
      expect(g.sent[0].body.run).to.eql([])
      const i = g.window.$gameMap._interpreter
      Object.assign(i, { _list: map.pages[1].list, _index: 2, _eventId: 2 })
      g.step()
      expect(g.sent[1].body.run).to.eql([{ key: 'e:4:2:2', index: 1 }])
      expect(g.sent[1].body.lists).to.eql({ 'e:4:2:2': map.pages[1].list.map(commandMark) })
      g.step()
      expect(g.sent).to.have.length(2)
      i._index = 3
      g.step()
      expect(g.sent[2].body).to.eql({ run: [{ key: 'e:4:2:2', index: 2 }] })
    })

    it('adds the common event it called, and keeps the page after a transfer', function () {
      const { g, map, common, moveTo } = game()
      const i = g.window.$gameMap._interpreter
      Object.assign(i, { _list: map.pages[1].list, _index: 3, _eventId: 2 })
      g.step()
      i._childInterpreter = { _list: common.list, _index: 1, _eventId: 2, _mapId: 4 }
      g.step()
      expect(g.sent[1].body.run).to.eql([{ key: 'e:4:2:2', index: 2 }, { key: 'c:7', index: 0 }])
      expect(Object.keys(g.sent[1].body.lists)).to.eql(['c:7'])
      moveTo(9)
      g.window.$dataMap = { events: [] }
      i._childInterpreter._index = 2
      g.step()
      expect(g.sent[2].body).to.eql({ map: 9, run: [{ key: 'e:4:2:2', index: 2 }, { key: 'c:7', index: 1 }] })
      i._list = null
      i._childInterpreter = null
      g.step()
      expect(g.sent[3].body).to.eql({ run: [] })
    })

    it('skips lists it cannot tell, and falls back to the page the event is on', function () {
      const { g, map } = game()
      const i = g.window.$gameMap._interpreter
      Object.assign(i, { _list: page([230, 230]), _index: 1, _eventId: 0 })
      g.step()
      expect(g.sent[0].body.run).to.eql([])
      Object.assign(i, { _list: map.pages[1].list.slice(), _index: 1, _eventId: 2 })
      g.step()
      expect(g.sent[1].body.run).to.eql([{ key: 'e:4:2:2', index: 0 }])
    })

    it('sends the running event and its list again after a reset', function () {
      const { g, map } = game()
      Object.assign(g.window.$gameMap._interpreter, { _list: map.pages[1].list, _index: 2, _eventId: 2 })
      g.step()
      g.window.$gameSwitches = { _data: [] }
      g.step()
      expect(g.sent[1].body.reset).to.equal(true)
      expect(g.sent[1].body.run).to.eql([{ key: 'e:4:2:2', index: 1 }])
      expect(Object.keys(g.sent[1].body.lists)).to.eql(['e:4:2:2'])
    })

    it('marks commands the same way as the extension, whatever the key order', function () {
      const { g, map } = game()
      const route = map.route.list
      Object.assign(g.window.$gameMap._interpreter, { _list: route, _index: 1, _eventId: 0 })
      g.window.$dataCommonEvents[3] = { list: route }
      g.step()
      const sent = g.sent[0].body.lists['c:3']
      const reordered = { code: 205, indent: 0, parameters: [-1, { wait: true, skippable: false, repeat: false, list: [{ indent: null, code: 1 }] }] }
      expect(sent[0]).to.eql(commandMark(reordered))
      expect(sent).to.eql(route.map(commandMark))
    })
  })

  it('goes before </body>, or at the end', function () {
    const page = '<html><body><script src="js/main.js"></script></body></html>'
    const out = injectMonitor(page, 'abc123')
    expect(out.startsWith('<html><body><script src="js/main.js"></script><script>(function')).to.equal(true)
    expect(out.endsWith('</script>\n</body></html>')).to.equal(true)
    expect(injectMonitor('<p>x</p>', 't')).to.match(/^<p>x<\/p>\n<script>[\s\S]*<\/script>\n$/)
  })
})

describe('liveState', function () {
  it('reads only well formed messages', function () {
    const m = parseLiveMessage({ reset: true, switches: { 1: true }, variables: { 2: 5, 3: 'a' } })
    expect(m.reset).to.equal(true)
    expect(Array.from(m.switches)).to.eql([[1, true]])
    expect(Array.from(m.variables)).to.eql([[2, 5], [3, 'a']])
    expect(parseLiveMessage({})).to.eql({ reset: undefined, switches: undefined, variables: undefined, selfSwitches: undefined, map: undefined, run: undefined, lists: undefined })
    const self = parseLiveMessage({ selfSwitches: { '12,5,A': true, '1,2,B': false }, map: 12 })
    expect(Array.from(self.selfSwitches)).to.eql([['12,5,A', true], ['1,2,B', false]])
    expect(self.map).to.equal(12)
    expect(parseLiveMessage({ map: 0 }).map).to.equal(0)
    for (const bad of [null, [], 'x', { switches: [] }, { switches: { 1: 'ON' } }, { switches: { 0: true } },
      { switches: { abc: true } }, { variables: { 1: {} } }, { variables: { 1: null } }, { variables: { 1.5: 1 } },
      { selfSwitches: { '12,5': true } }, { selfSwitches: { '12,5,A': 1 } }, { selfSwitches: [] }, { map: -1 }, { map: 1.5 }, { map: '3' }]) {
      expect(parseLiveMessage(bad), JSON.stringify(bad)).to.equal(undefined)
    }
  })

  it('keeps the values, and remembers what changed while playing', function () {
    const s = new LiveState()
    const msg = (o) => parseLiveMessage(o)
    expect(s.apply(msg({ reset: true, switches: { 1: true }, variables: { 2: 5 } }), 1000).values).to.equal(true)
    expect(s.switchValue(1)).to.equal(true)
    expect(s.switchValue(9)).to.equal(false)
    expect(s.variableValue(2)).to.equal(5)
    expect(s.variableValue(9)).to.equal(0)
    expect(s.sinceChange('switch', 1, 1000)).to.equal(undefined)
    expect(s.apply(msg({ switches: { 1: false } }), 2000).values).to.equal(true)
    expect(s.sinceChange('switch', 1, 2500)).to.equal(500)
    expect(s.apply(msg({ switches: { 1: false } }), 3000).values).to.equal(false)
    expect(s.apply(msg({}), 3000).values).to.equal(false)
    s.apply(msg({ reset: true }), 4000)
    expect(s.switchValue(1)).to.equal(false)
    expect(s.variableValue(2)).to.equal(0)
    expect(s.sinceChange('switch', 1, 4000)).to.equal(undefined)
  })

  it('lists the values that are not OFF or 0, and what changed since a time', function () {
    const s = new LiveState()
    expect(s.received()).to.equal(false)
    s.apply(parseLiveMessage({ reset: true, switches: { 1: true, 2: false }, variables: { 3: 4, 5: 0 } }), 1000)
    expect(s.received()).to.equal(true)
    expect(s.snapshot()).to.eql({ switches: [[1, true]], variables: [[3, 4]], selfSwitches: [], mapId: 0 })
    s.apply(parseLiveMessage({ switches: { 2: true }, variables: { 3: 5 } }), 2000)
    s.apply(parseLiveMessage({ switches: { 9: true } }), 3000)
    expect(s.changedSince(1500)).to.eql({ switches: [2, 9], variables: [3], selfSwitches: [] })
    expect(s.changedSince(2000)).to.eql({ switches: [9], variables: [], selfSwitches: [] })
  })

  it('keeps self switches and the current map', function () {
    const s = new LiveState()
    s.apply(parseLiveMessage({ reset: true, selfSwitches: { '12,5,A': true, '12,5,B': false }, map: 12 }), 1000)
    expect(s.selfSwitchValue(12, 5, 'A')).to.equal(true)
    expect(s.selfSwitchValue(12, 5, 'B')).to.equal(false)
    expect(s.selfSwitchValue(3, 1, 'A')).to.equal(false)
    expect(s.snapshot()).to.eql({ switches: [], variables: [], selfSwitches: ['12,5,A'], mapId: 12 })
    expect(s.apply(parseLiveMessage({ map: 3 }), 2000).values).to.equal(true)
    expect(s.apply(parseLiveMessage({ selfSwitches: { '12,5,A': false, '3,1,D': true } }), 3000).values).to.equal(true)
    expect(s.changedSince(2500)).to.eql({ switches: [], variables: [], selfSwitches: ['12,5,A', '3,1,D'] })
    expect(s.snapshot()).to.eql({ switches: [], variables: [], selfSwitches: ['3,1,D'], mapId: 3 })
    expect(selfSwitchLine(s, 3, 1, 'D', 3000)).to.equal('テストプレイ中: セルフスイッチ D = ON')
    expect(selfSwitchLine(s, 12, 5, 'A', 3000 + LIVE_TIMEOUT)).to.equal('テストプレイの最後の値: セルフスイッチ A = OFF')
    s.apply(parseLiveMessage({ reset: true, map: 3 }), 4000)
    expect(s.selfSwitchValue(3, 1, 'D')).to.equal(false)
  })

  it('keeps the running events apart from the values', function () {
    const s = new LiveState()
    const marks = [[230, 0, 1], [0, 0, 2]]
    expect(s.apply(parseLiveMessage({ reset: true, run: [], map: 4 }), 1000)).to.eql({ values: true, run: false })
    expect(s.apply(parseLiveMessage({ run: [{ key: 'e:4:2:1', index: 0 }], lists: { 'e:4:2:1': marks } }), 1100)).to.eql({ values: false, run: true })
    expect(s.running()).to.eql([{ key: 'e:4:2:1', index: 0 }])
    expect(s.listMarks('e:4:2:1')).to.eql(marks)
    expect(s.apply(parseLiveMessage({ run: [{ key: 'e:4:2:1', index: 0 }] }), 1200)).to.eql({ values: false, run: false })
    expect(s.apply(parseLiveMessage({ switches: { 1: true } }), 1300)).to.eql({ values: true, run: false })
    expect(s.apply(parseLiveMessage({ reset: true }), 1400)).to.eql({ values: true, run: true })
    expect(s.running()).to.eql([])
    expect(s.listMarks('e:4:2:1')).to.equal(undefined)
    for (const bad of [{ run: {} }, { run: [{ key: 'x', index: 0 }] }, { run: [{ key: 'c:1', index: -1 }] }, { run: [{ key: 'c:1', index: 1.5 }] },
      { lists: [] }, { lists: { 'c:1': [[1, 0]] } }, { lists: { 'c:1': [[1, 0, -1]] } }, { lists: { bad: [] } }]) {
      expect(parseLiveMessage(bad), JSON.stringify(bad)).to.equal(undefined)
    }
  })

  it('reads what was typed for a variable', function () {
    expect(parseVariableInput(' 42 ')).to.eql({ value: 42 })
    expect(parseVariableInput('-3.5')).to.eql({ value: -3.5 })
    expect(parseVariableInput('1e3')).to.eql({ value: 1000 })
    expect(parseVariableInput('"abc"')).to.eql({ value: 'abc' })
    expect(parseVariableInput('""')).to.eql({ value: '' })
    for (const bad of ['', 'abc', '"abc', '12abc', 'NaN', 'Infinity', '"a"b"']) {
      expect(parseVariableInput(bad), bad).to.have.property('error')
    }
  })

  it('says whether the game is still sending', function () {
    const s = new LiveState()
    s.apply(parseLiveMessage({ reset: true, switches: { 3: true } }), 1000)
    expect(liveLine(s, 'switch', 3, undefined, 1000)).to.equal('テストプレイ中: ON')
    expect(liveLine(s, 'switch', 3, undefined, 1000 + LIVE_TIMEOUT)).to.equal('テストプレイの最後の値: ON')
    expect(liveLine(s, 'map', 3, undefined, 1000)).to.equal(undefined)
  })

  it('writes ranges and values the short way', function () {
    const s = new LiveState()
    s.apply(parseLiveMessage({ reset: true, switches: { 2: true, 5: true }, variables: { 1: 7, 2: 'x' } }), 0)
    expect(liveLine(s, 'switch', 1, 10, 0)).to.equal('テストプレイ中: ON 2件 / 10件 (0002, 0005)')
    expect(liveLine(s, 'switch', 11, 12, 0)).to.equal('テストプレイ中: ON 0件 / 2件')
    expect(liveLine(s, 'variable', 1, 3, 0)).to.equal('テストプレイ中: 0001 = 7, 0002 = "x", 0003 = 0')
    expect(liveLine(s, 'variable', 1, 20, 0)).to.match(/, 0010 = 0, …$/)
    expect(formatLiveValue('switch', false)).to.equal('OFF')
    expect(formatLiveValue('variable', -3)).to.equal('-3')
  })
})
