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
  function tick() {
    var switches = window.$gameSwitches;
    var variables = window.$gameVariables;
    if (!switches || !variables || !switches._data || !variables._data) return;
    var selfSwitches = window.$gameSelfSwitches;
    var selfData = selfSwitches && selfSwitches._data && typeof selfSwitches._data === 'object' ? selfSwitches._data : null;
    var party = window.$gameParty;
    var message = {};
    if (!last || last.switches !== switches || last.variables !== variables || last.selfSwitches !== selfSwitches || last.party !== party) {
      last = { switches: switches, variables: variables, selfSwitches: selfSwitches, party: party, s: [], v: [], ss: {}, items: {}, map: -1, pages: '', run: null, sent: {} };
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
    if (map !== last.map) {
      message.map = map;
      last.map = map;
    }
    var pages = eventPages();
    var pagesText = pages ? JSON.stringify(pages) : '';
    if (pages && (pagesText !== last.pages || message.map !== undefined)) message.pages = pages;
    last.pages = pagesText;
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
    if (message.reset || s || v || ss || items || message.map !== undefined || message.pages || message.run || Date.now() - lastSent >= HEARTBEAT) send(message);
  }
  function write(command) {
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
