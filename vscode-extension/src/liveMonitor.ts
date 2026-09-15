export const LIVE_STATE_PATH = '/__t2f/state';
export const LIVE_EVENTS_PATH = '/__t2f/events';
export const LIVE_TOKEN_HEADER = 'x-t2f-token';

export function monitorScript(token: string): string {
    return `(function () {
  'use strict';
  var TOKEN = ${JSON.stringify(token)};
  var INTERVAL = 100;
  var HEARTBEAT = 2000;
  var SELF_KEY = /^(\\d+),(\\d+),([A-Za-z0-9_]{1,16})$/;
  var ITEM_KEY = /^([iwa]):(\\d{1,6})$/;
  var ITEM_DATA = { i: '$dataItems', w: '$dataWeapons', a: '$dataArmors' };
  var last = null;
  var lastSent = 0;
  function switchValue(v) { return !!v; }
  function variableValue(v) {
    v = v || 0;
    if (typeof v === 'object') {
      try { v = JSON.stringify(v); } catch (e) { v = String(v); }
      return v.length > 200 ? v.slice(0, 200) + '…' : v;
    }
    return typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' ? v : String(v);
  }
  function diff(data, prev, read) {
    var out = null;
    var blank = read(undefined);
    var n = Math.max(data.length, prev.length);
    for (var i = 1; i < n; i++) {
      var v = read(data[i]);
      if (v !== (prev[i] === undefined ? blank : prev[i])) {
        (out = out || {})[i] = v;
        prev[i] = v;
      }
    }
    return out;
  }
  function diffSelf(data, prev) {
    var out = null;
    var key;
    for (key in data) {
      if (!SELF_KEY.test(key)) continue;
      var v = !!data[key];
      if (v !== !!prev[key]) {
        (out = out || {})[key] = v;
        prev[key] = v;
      }
    }
    for (key in prev) {
      if (prev[key] && !(key in data)) {
        (out = out || {})[key] = false;
        prev[key] = false;
      }
    }
    return out;
  }
  function diffItems(party, prev) {
    var out = null;
    var groups = { i: party._items, w: party._weapons, a: party._armors };
    var seen = {};
    var key;
    for (var kind in groups) {
      var data = groups[kind];
      if (!data || typeof data !== 'object') continue;
      for (var id in data) {
        key = kind + ':' + id;
        if (!ITEM_KEY.test(key)) continue;
        var n = Math.max(0, Math.floor(Number(data[id]) || 0));
        seen[key] = true;
        if (n !== (prev[key] || 0)) {
          (out = out || {})[key] = n;
          prev[key] = n;
        }
      }
    }
    for (key in prev) {
      if (prev[key] && !seen[key]) {
        (out = out || {})[key] = 0;
        prev[key] = 0;
      }
    }
    return out;
  }
  function eventPages() {
    var map = window.$gameMap;
    if (!map || typeof map.events !== 'function') return null;
    var out = {};
    map.events().forEach(function (e) {
      var id = e && typeof e.eventId === 'function' ? Number(e.eventId()) : 0;
      if (id > 0) out[id] = Math.max(0, (Number(e._pageIndex) || 0) + 1);
    });
    return out;
  }
  function parallels() {
    var map = window.$gameMap;
    if (!map || typeof map.events !== 'function') return null;
    var events = [];
    map.events().forEach(function (e) {
      var id = e && typeof e.eventId === 'function' ? Number(e.eventId()) : 0;
      if (id > 0 && e._trigger === 4 && e._interpreter && !e._erased && Number(e._pageIndex) >= 0) events.push(id);
    });
    var commons = [];
    (Array.isArray(map._commonEvents) ? map._commonEvents : []).forEach(function (c) {
      var id = c ? Number(c._commonEventId) || 0 : 0;
      if (id > 0 && typeof c.isActive === 'function' && c.isActive()) commons.push(id);
    });
    return { events: events, commons: commons };
  }
  function currentMap() {
    var map = window.$gameMap;
    return map && typeof map.mapId === 'function' ? Number(map.mapId()) || 0 : 0;
  }
  var keys = typeof WeakMap === 'function' ? new WeakMap() : null;
  var marks = typeof WeakMap === 'function' ? new WeakMap() : null;
  function stable(v) {
    if (v === undefined || v === null || typeof v === 'function') return 'null';
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (typeof v === 'object') {
      var names = Object.keys(v).filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; }).sort();
      return '{' + names.map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v);
  }
  function hash(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }
  function listMarks(list) {
    if (marks.has(list)) return marks.get(list);
    var out = list.map(function (c) {
      var code = c && Number(c.code) || 0;
      var indent = c && Number(c.indent) || 0;
      return [code, indent, hash(stable([code, indent, c && c.parameters || []]))];
    });
    marks.set(list, out);
    return out;
  }
  function listKey(interpreter) {
    var list = interpreter._list;
    if (keys.has(list)) return keys.get(list);
    var key = null;
    var mapId = Number(interpreter._mapId) || 0;
    var eventId = Number(interpreter._eventId) || 0;
    var dataMap = window.$dataMap;
    if (eventId > 0 && mapId === currentMap() && dataMap && dataMap.events) {
      var event = dataMap.events[eventId];
      var pages = event && event.pages || [];
      for (var p = 0; p < pages.length && !key; p++) {
        if (pages[p] && pages[p].list === list) key = 'e:' + mapId + ':' + eventId + ':' + (p + 1);
      }
      if (!key && window.$gameMap && typeof window.$gameMap.event === 'function') {
        var gameEvent = window.$gameMap.event(eventId);
        var pageIndex = gameEvent ? Number(gameEvent._pageIndex) : -1;
        if (pageIndex >= 0 && pages[pageIndex] && pages[pageIndex].list && pages[pageIndex].list.length === list.length) {
          key = 'e:' + mapId + ':' + eventId + ':' + (pageIndex + 1);
        }
      }
    }
    var commons = window.$dataCommonEvents || [];
    for (var c = 1; c < commons.length && !key; c++) {
      if (commons[c] && commons[c].list === list) key = 'c:' + c;
    }
    keys.set(list, key);
    return key;
  }
  function running() {
    var map = window.$gameMap;
    if (!keys || !map || !map._interpreter) return null;
    var frames = [];
    var lists = [];
    for (var i = map._interpreter, depth = 0; i && depth < 32; i = i._childInterpreter, depth++) {
      var list = i._list;
      if (!Array.isArray(list) || !list.length) break;
      var key = listKey(i);
      if (!key) continue;
      frames.push({ key: key, index: Math.max(0, Math.min(list.length - 1, (Number(i._index) || 0) - 1)) });
      lists.push(list);
    }
    return { frames: frames, lists: lists };
  }
  function send(message) {
    lastSent = Date.now();
    try {
      fetch(${JSON.stringify(LIVE_STATE_PATH)}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ${JSON.stringify(LIVE_TOKEN_HEADER)}: TOKEN },
        body: JSON.stringify(message)
      }).catch(function () {});
    } catch (e) {}
  }
  var breakpoints = {};
  var parents = typeof WeakMap === 'function' ? new WeakMap() : null;
  var paused = null;
  var pausedReport = null;
  var resumedReport = false;
  var stepping = null;
  var pauseWanted = false;
  var skipOnce = null;
  var hooked = false;
  var DEBUG_KEY = /^(?:e:\\d+:\\d+:\\d+|c:\\d+)$/;
  function parentOf(i) { return parents ? parents.get(i) : null; }
  function depthOf(i) {
    var d = 0;
    for (var p = parentOf(i); p && d < 64; p = parentOf(p)) d++;
    return d;
  }
  function chainTo(i) {
    var chain = [i];
    for (var p = parentOf(i); p && chain.length < 64; p = parentOf(p)) chain.unshift(p);
    return chain;
  }
  function pauseAt(interp, reason) {
    var chain = chainTo(interp);
    var frames = [];
    var lists = [];
    chain.forEach(function (it, n) {
      var list = it._list;
      if (!Array.isArray(list) || !list.length) return;
      var key = listKey(it);
      if (!key) return;
      var index = n === chain.length - 1 ? Number(it._index) || 0 : (Number(it._index) || 0) - 1;
      frames.push({ key: key, index: Math.max(0, Math.min(list.length - 1, index)) });
      lists.push([key, list]);
    });
    paused = { interp: interp, index: interp._index };
    pausedReport = { reason: reason, frames: frames, lists: lists };
    stepping = null;
    pauseWanted = false;
  }
  function shouldStop(interp) {
    if (paused) return true;
    if (visiting || !Array.isArray(interp._list)) return false;
    if (skipOnce && skipOnce.interp === interp && skipOnce.index === interp._index) {
      skipOnce = null;
      return false;
    }
    if (pauseWanted) {
      pauseAt(interp, 'pause');
      return true;
    }
    if (stepping && chainTo(interp)[0] === stepping.root) {
      var d = depthOf(interp);
      if (stepping.mode === 'stepIn' || (stepping.mode === 'next' && d <= stepping.depth) || (stepping.mode === 'stepOut' && d < stepping.depth)) {
        pauseAt(interp, 'step');
        return true;
      }
    }
    var any = false;
    for (var k in breakpoints) { any = true; break; }
    if (!any) return false;
    var key = listKey(interp);
    if (key && breakpoints[key] && breakpoints[key][interp._index]) {
      pauseAt(interp, 'breakpoint');
      return true;
    }
    return false;
  }
  function hook() {
    if (hooked || typeof window.Game_Interpreter !== 'function' || !window.SceneManager || typeof window.SceneManager.updateScene !== 'function') return;
    hooked = true;
    var proto = window.Game_Interpreter.prototype;
    var execute = proto.executeCommand;
    proto.executeCommand = function () {
      if (shouldStop(this)) return false;
      return execute.apply(this, arguments);
    };
    var setupChild = proto.setupChild;
    proto.setupChild = function () {
      var out = setupChild.apply(this, arguments);
      if (parents && this._childInterpreter) parents.set(this._childInterpreter, this);
      return out;
    };
    var updateScene = window.SceneManager.updateScene;
    window.SceneManager.updateScene = function () {
      if (paused) return;
      return updateScene.apply(this, arguments);
    };
  }
  function debug(mode) {
    if (mode === 'pause') {
      if (!paused) pauseWanted = true;
      return;
    }
    if (!paused) return;
    var interp = paused.interp;
    var chain = chainTo(interp);
    skipOnce = { interp: interp, index: paused.index };
    stepping = mode === 'next' || mode === 'stepIn' || mode === 'stepOut' ? { mode: mode, root: chain[0], depth: chain.length - 1 } : null;
    paused = null;
    resumedReport = true;
  }
  function setBreakpoints(table) {
    breakpoints = {};
    for (var key in table) {
      if (!DEBUG_KEY.test(key) || !Array.isArray(table[key])) continue;
      var at = {};
      table[key].forEach(function (i) { if (typeof i === 'number' && i >= 0) at[i] = true; });
      breakpoints[key] = at;
    }
  }
  var visiting = null;
  var visitResult = null;
  var AROUND = [[0, 1, 8], [0, -1, 2], [-1, 0, 6], [1, 0, 4]];
  function startVisit(v) {
    var mapId = Number(v.mapId) || 0;
    var common = Number(v.common) || 0;
    if (!mapId && !common) return;
    visiting = { mapId: mapId, eventId: Number(v.eventId) || 0, pageId: Number(v.pageId) || 1, x: Number(v.x) || 0, y: Number(v.y) || 0, run: !!v.run, common: common, stage: 'start', since: Date.now() };
    if (paused) {
      paused = null;
      resumedReport = true;
    }
    stepping = null;
    skipOnce = null;
    pauseWanted = false;
  }
  function finishVisit(result) {
    visitResult = result;
    visiting = null;
  }
  function clearRunning(map) {
    stepping = null;
    skipOnce = null;
    if (map._interpreter && typeof map._interpreter.clear === 'function') map._interpreter.clear();
    if (window.$gameMessage && typeof window.$gameMessage.clear === 'function') window.$gameMessage.clear();
  }
  function standingSpot(map, ev) {
    for (var i = 0; i < AROUND.length; i++) {
      var x = ev.x + AROUND[i][0];
      var y = ev.y + AROUND[i][1];
      if (!map.isValid(x, y) || map.eventsXyNt(x, y).length) continue;
      if (map.isPassable(x, y, 2) || map.isPassable(x, y, 4) || map.isPassable(x, y, 6) || map.isPassable(x, y, 8)) return [x, y, AROUND[i][2]];
    }
    return [ev.x, ev.y, 2];
  }
  function stepVisit() {
    var v = visiting;
    if (!v || paused) return;
    if (Date.now() - v.since > 30000) return finishVisit('timeout');
    var scenes = window.SceneManager;
    var scene = scenes && scenes._scene;
    var map = window.$gameMap;
    var player = window.$gamePlayer;
    if (!scene || !map || !player) return;
    var changing = typeof scenes.isSceneChanging === 'function' && scenes.isSceneChanging();
    var onMap = typeof window.Scene_Map === 'function' && scene instanceof window.Scene_Map && !changing;
    if (v.stage === 'start') {
      if (!onMap) {
        if (!changing && typeof window.Scene_Title === 'function' && scene instanceof window.Scene_Title) {
          window.DataManager.setupNewGame();
          scenes.goto(window.Scene_Map);
        }
        return;
      }
      if (player.isTransferring()) return;
      clearRunning(map);
      if (v.common) {
        if (!window.$gameTemp || typeof window.$gameTemp.reserveCommonEvent !== 'function') return finishVisit('failed');
        window.$gameTemp.reserveCommonEvent(v.common);
        return finishVisit('ran');
      }
      player.reserveTransfer(v.mapId, v.x, v.y, 2, 0);
      v.stage = 'arrive';
      return;
    }
    if (!onMap || player.isTransferring() || map.mapId() !== v.mapId) return;
    clearRunning(map);
    if (window.$gameScreen && typeof window.$gameScreen.clearFade === 'function') window.$gameScreen.clearFade();
    var ev = map.event(v.eventId);
    if (!ev) return finishVisit('noEvent');
    var spot = standingSpot(map, ev);
    player.locate(spot[0], spot[1]);
    player.setDirection(spot[2]);
    if (!v.run) return finishVisit('stood');
    var data = window.$dataMap && window.$dataMap.events && window.$dataMap.events[v.eventId];
    var page = data && data.pages && data.pages[v.pageId - 1];
    if (!page || !map._interpreter) return finishVisit('noPage');
    map._interpreter.setup(page.list, v.eventId);
    finishVisit('ran');
  }
  function tick() {
    hook();
    stepVisit();
    var switches = window.$gameSwitches;
    var variables = window.$gameVariables;
    if (!switches || !variables || !switches._data || !variables._data) return;
    var selfSwitches = window.$gameSelfSwitches;
    var selfData = selfSwitches && selfSwitches._data && typeof selfSwitches._data === 'object' ? selfSwitches._data : null;
    var party = window.$gameParty;
    var message = {};
    if (!last || last.switches !== switches || last.variables !== variables || last.selfSwitches !== selfSwitches || last.party !== party) {
      last = { switches: switches, variables: variables, selfSwitches: selfSwitches, party: party, s: [], v: [], ss: {}, items: {}, gold: null, actors: null, map: -1, pages: '', parallel: '', run: null, sent: {} };
      message.reset = true;
    }
    var s = diff(switches._data, last.s, switchValue);
    var v = diff(variables._data, last.v, variableValue);
    var ss = selfData ? diffSelf(selfData, last.ss) : null;
    var items = party && typeof party === 'object' ? diffItems(party, last.items) : null;
    var map = currentMap();
    if (s) message.switches = s;
    if (v) message.variables = v;
    if (ss) message.selfSwitches = ss;
    if (items) message.items = items;
    var actors = party && Array.isArray(party._actors) ? party._actors.map(function (a) { return Number(a) || 0; }).filter(function (a) { return a > 0; }) : null;
    var actorsText = actors ? actors.join(',') : null;
    if (actors && actorsText !== last.actors) message.actors = actors;
    last.actors = actorsText;
    var gold = party && typeof party._gold === 'number' && isFinite(party._gold) ? Math.max(0, Math.floor(party._gold)) : null;
    if (gold !== null && gold !== last.gold) {
      message.gold = gold;
      last.gold = gold;
    }
    if (map !== last.map) {
      message.map = map;
      last.map = map;
    }
    var pages = eventPages();
    var pagesText = pages ? JSON.stringify(pages) : '';
    if (pages && (pagesText !== last.pages || message.map !== undefined)) message.pages = pages;
    last.pages = pagesText;
    var parallel = parallels();
    var parallelText = parallel ? JSON.stringify(parallel) : '';
    if (parallel && parallelText !== last.parallel) message.parallel = parallel;
    last.parallel = parallelText;
    var run = running();
    if (run) {
      var runText = JSON.stringify(run.frames);
      if (runText !== last.run) {
        last.run = runText;
        message.run = run.frames;
        run.frames.forEach(function (frame, n) {
          if (last.sent[frame.key] === run.lists[n]) return;
          last.sent[frame.key] = run.lists[n];
          (message.lists = message.lists || {})[frame.key] = listMarks(run.lists[n]);
        });
      }
    }
    if (visitResult) {
      message.visit = visitResult;
      visitResult = null;
    }
    if (pausedReport) {
      message.paused = { reason: pausedReport.reason, frames: pausedReport.frames };
      pausedReport.lists.forEach(function (entry) {
        if (last.sent[entry[0]] === entry[1]) return;
        last.sent[entry[0]] = entry[1];
        (message.lists = message.lists || {})[entry[0]] = listMarks(entry[1]);
      });
      pausedReport = null;
    }
    if (resumedReport) {
      message.resumed = true;
      resumedReport = false;
    }
    if (message.reset || message.visit || message.paused || message.resumed || s || v || ss || items || message.gold !== undefined || message.actors || message.map !== undefined || message.pages || message.parallel || message.run || Date.now() - lastSent >= HEARTBEAT) send(message);
  }
  function write(command) {
    if (command.reload === true) {
      try { window.location.reload(); } catch (e) {}
      return;
    }
    if (command.visit && typeof command.visit === 'object') startVisit(command.visit);
    if (command.breakpoints && typeof command.breakpoints === 'object') setBreakpoints(command.breakpoints);
    if (typeof command.debug === 'string') debug(command.debug);
    var switches = window.$gameSwitches;
    var variables = window.$gameVariables;
    if (!switches || !variables) return;
    var key;
    for (key in command.switches || {}) {
      if (Number(key) > 0 && typeof command.switches[key] === 'boolean') switches.setValue(Number(key), command.switches[key]);
    }
    for (key in command.variables || {}) {
      var v = command.variables[key];
      if (Number(key) > 0 && (typeof v === 'number' || typeof v === 'string')) variables.setValue(Number(key), v);
    }
    var selfSwitches = window.$gameSelfSwitches;
    for (key in command.selfSwitches || {}) {
      var parts = SELF_KEY.exec(key);
      if (parts && selfSwitches && typeof command.selfSwitches[key] === 'boolean') {
        selfSwitches.setValue([Number(parts[1]), Number(parts[2]), parts[3]], command.selfSwitches[key]);
      }
    }
    var party = window.$gameParty;
    if (party && typeof party.gainGold === 'function' && typeof command.gold === 'number' && command.gold >= 0) {
      party.gainGold(Math.floor(command.gold) - party.gold());
    }
    for (key in command.items || {}) {
      var item = ITEM_KEY.exec(key);
      var count = command.items[key];
      if (!item || !party || typeof party.gainItem !== 'function' || typeof count !== 'number' || !(count >= 0)) continue;
      var data = window[ITEM_DATA[item[1]]];
      var target = data && data[Number(item[2])];
      if (target) party.gainItem(target, Math.floor(count) - party.numItems(target));
    }
    tick();
  }
  function listen() {
    if (typeof EventSource === 'undefined') return;
    var source = new EventSource(${JSON.stringify(LIVE_EVENTS_PATH)} + '?token=' + encodeURIComponent(TOKEN));
    source.onmessage = function (event) {
      try { write(JSON.parse(event.data)); } catch (e) {}
    };
  }
  setInterval(function () { try { tick(); } catch (e) {} }, INTERVAL);
  listen();
})();`;
}

export function injectMonitor(html: string, token: string): string {
    const tag = `<script>${monitorScript(token)}</script>\n`;
    for (const closer of [/<\/body\s*>/gi, /<\/html\s*>/gi]) {
        let at = -1;
        for (const m of html.matchAll(closer)) at = m.index ?? at;
        if (at >= 0) return html.slice(0, at) + tag + html.slice(at);
    }
    return html + '\n' + tag;
}
