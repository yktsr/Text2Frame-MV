import * as crypto from 'crypto';

export function liveViewHtml(): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  [hidden] { display: none !important; }
  html, body { height: 100%; }
  body { margin: 0; padding: 0 8px; display: flex; flex-direction: column; box-sizing: border-box; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); }
  #top { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 6px 0; flex: none; }
  #status.live::before { content: '●'; color: var(--vscode-testing-iconPassed, #3c3); margin-right: 4px; }
  #status.stale { color: var(--vscode-descriptionForeground); }
  #filter { flex: 0 1 16em; min-width: 8em; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); padding: 2px 4px; font: inherit; }
  #notice { color: var(--vscode-errorForeground); }
  #empty { padding: 8px 0; color: var(--vscode-descriptionForeground); }
  #cols { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 12px; padding-bottom: 4px; }
  @media (max-width: 900px) { #cols { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 540px) { #cols { grid-template-columns: minmax(0, 1fr); } }
  section { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  h3 { margin: 0 0 2px; font-size: inherit; font-weight: 600; flex: none; }
  h3 .count { font-weight: normal; color: var(--vscode-descriptionForeground); margin-left: 6px; }
  .list { flex: 1; min-height: 0; overflow: auto; border-top: 1px solid var(--vscode-panel-border); }
  .row { display: flex; align-items: center; gap: 6px; padding: 1px 2px; line-height: 1.6em; }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .id { flex: none; font-family: var(--vscode-editor-font-family); color: var(--vscode-descriptionForeground); }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .name.blank { color: var(--vscode-descriptionForeground); font-style: italic; }
  .sw { flex: none; width: 3.4em; padding: 0; font: inherit; line-height: 1.4em; cursor: pointer; border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); border-radius: 3px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  .sw.on { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .var { flex: none; width: 6em; text-align: right; font-family: var(--vscode-editor-font-family); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); padding: 0 3px; }
  .var.set { color: var(--vscode-textLink-foreground); }
  .var.count { width: 4.5em; }
  #gold { width: 8em; }
  #goldRow { flex: none; }
  .link { cursor: pointer; }
  .row .link:hover { color: var(--vscode-textLink-foreground); text-decoration: underline; }
  .page { flex: none; font-size: 0.9em; color: var(--vscode-descriptionForeground); }
  .ssw { flex: none; display: flex; gap: 2px; }
  .ss { width: 1.9em; padding: 0; font: inherit; line-height: 1.4em; cursor: pointer; border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); border-radius: 3px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  .ss.on { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .sub { margin: 6px 0 2px; color: var(--vscode-descriptionForeground); font-size: 0.95em; }
  .none { padding: 4px 2px; color: var(--vscode-descriptionForeground); }
  h3 label { font-weight: normal; color: var(--vscode-descriptionForeground); margin-left: 10px; font-size: 0.95em; }
  .ss.used { border-style: solid; font-weight: 600; }
  button:disabled, input:disabled { opacity: 0.5; cursor: default; }
  .row.flash { animation: flash 3s ease-out; }
  @keyframes flash { from { background: var(--vscode-editor-findMatchHighlightBackground, rgba(255, 200, 0, 0.4)); } to { background: transparent; } }
  #running { cursor: pointer; color: var(--vscode-textLink-foreground); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #running:hover { text-decoration: underline; }
  #running.approximate { color: var(--vscode-descriptionForeground); }
  #running.missing { cursor: default; color: var(--vscode-descriptionForeground); text-decoration: none; }
  .row.running .id::before { content: '▶ '; color: var(--vscode-debugIcon-continueForeground, var(--vscode-textLink-foreground)); }
  .row.running { background: var(--vscode-editor-stackFrameHighlightBackground, rgba(255, 255, 0, 0.12)); }
  #play { font: inherit; padding: 2px 10px; margin-left: 6px; cursor: pointer; border: none; background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
</style></head>
<body>
<div id="top">
  <span id="status"></span>
  <span id="running" hidden></span>
  <input id="filter" type="search" placeholder="番号・名前で絞り込み">
  <label><input id="hideDefault" type="checkbox"> OFF・0 を隠す</label>
  <label title="実行しているイベントのテキストを自動で開く(設定 text2frame.openRunningText)"><input id="openRunning" type="checkbox"> 実行中のテキストを開く</label>
  <span id="notice"></span>
</div>
<div id="empty">テストプレイ中だけ、ここにスイッチ・変数・セルフスイッチ・アイテム・所持金が出ます。<button id="play">▶ テストプレイ</button></div>
<div id="cols" hidden>
  <section><h3>スイッチ<span class="count" id="switchCount"></span></h3><div class="list" id="switches"></div></section>
  <section><h3>変数<span class="count" id="variableCount"></span></h3><div class="list" id="variables"></div></section>
  <section><h3>セルフスイッチ<span class="count" id="selfCount"></span><label title="セルフスイッチを使っていないイベントも並べる"><input id="allEvents" type="checkbox"> すべてのイベント</label></h3><div class="list"><div id="selfHere"></div><div id="selfUnused" class="none" hidden>(このマップにセルフスイッチを使うイベントはありません)</div><div id="selfOthers"></div></div></section>
  <section><h3>アイテム<span class="count" id="itemCount"></span><label title="持っていないものも並べる(個数を入れると増やせます)"><input id="allItems" type="checkbox"> すべて</label></h3><div class="row" id="goldRow"><span class="name">所持金</span><input class="var" id="gold"><span class="id" id="currency"></span></div><div class="list"><div id="items"></div><div id="itemNone" class="none" hidden></div></div></section>
</div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const lists = { switch: $('switches'), variable: $('variables') };
  const counts = { switch: $('switchCount'), variable: $('variableCount') };
  let rows = { switch: [], variable: [] };
  let values = { switch: new Map(), variable: new Map() };
  let status = 'none';
  const saved = vscode.getState() || {};
  $('filter').value = saved.filter || '';
  $('hideDefault').checked = !!saved.hideDefault;
  $('allEvents').checked = !!saved.allEvents;
  $('allItems').checked = !!saved.allItems;
  const ITEM_KINDS = [['i', 'アイテム'], ['w', '武器'], ['a', '防具']];
  let itemRows = new Map();
  let itemSubs = new Map();
  let itemCounts = new Map();
  let ownedSignature = '';
  let pagesHere = new Map();
  let gold = 0;

  const pad = (n) => String(n).padStart(4, '0');
  const blank = (kind) => (kind === 'switch' ? false : 0);
  const valueOf = (kind, id) => (values[kind].has(id) ? values[kind].get(id) : blank(kind));
  const text = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));
  const LETTERS = ['A', 'B', 'C', 'D'];
  const pad3 = (n) => 'EV' + String(n).padStart(3, '0');
  let mapInfo = { mapId: 0, mapName: '', events: [] };
  let selfOn = new Set();
  let selfLabels = {};
  let hereRows = new Map();
  let otherRows = new Map();
  let othersSignature = '';
  let runningEvent = null;

  function selfRow(mapId, eventId, label, used) {
    const row = document.createElement('div');
    row.className = 'row';
    const idEl = document.createElement('span');
    idEl.className = 'id';
    idEl.textContent = pad3(eventId);
    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = label;
    nameEl.title = label + '\\nテキストとプレビューを開く';
    const pageEl = document.createElement('span');
    pageEl.className = 'page';
    const box = document.createElement('span');
    box.className = 'ssw';
    for (const el of [idEl, nameEl]) {
      el.classList.add('link');
      el.addEventListener('click', () => vscode.postMessage({ type: 'openEvent', mapId, eventId }));
    }
    row.append(idEl, nameEl, pageEl, box);
    row.dataset.search = label.toLowerCase();
    const r = { row, box, pageEl, mapId, eventId, buttons: new Map(), used: used || [] };
    LETTERS.forEach((letter) => addLetter(r, letter));
    return r;
  }

  function addLetter(r, letter) {
    const button = document.createElement('button');
    button.className = 'ss' + (r.used.includes(letter) ? ' used' : '');
    button.textContent = letter;
    const key = r.mapId + ',' + r.eventId + ',' + letter;
    button.addEventListener('click', () => vscode.postMessage({ type: 'set', kind: 'selfSwitch', key, value: !selfOn.has(key) }));
    r.box.appendChild(button);
    r.buttons.set(letter, button);
  }

  function paintSelf(r) {
    const prefix = r.mapId + ',' + r.eventId + ',';
    for (const key of selfOn) {
      if (key.startsWith(prefix) && !r.buttons.has(key.slice(prefix.length))) addLetter(r, key.slice(prefix.length));
    }
    const disabled = status !== 'live';
    const page = r.mapId === mapInfo.mapId ? pagesHere.get(r.eventId) : undefined;
    r.pageEl.textContent = page ? 'P' + page : '';
    r.pageEl.title = page ? 'ゲームでは今 ' + page + 'ページ' : '';
    let any = false;
    r.buttons.forEach((button, letter) => {
      const on = selfOn.has(prefix + letter);
      any = any || on;
      button.classList.toggle('on', on);
      button.disabled = disabled;
      button.title = (disabled ? 'テストプレイ中だけ書き換えられます' : 'セルフスイッチ ' + letter + ' を切り替え') + (r.used.includes(letter) ? '(このイベントで使っている)' : '');
    });
    r.on = any;
  }

  function setEvents(m) {
    mapInfo = m;
    hereRows = new Map();
    const frag = document.createDocumentFragment();
    for (const [id, name, x, y, used] of m.events) {
      const r = selfRow(m.mapId, id, (name && name !== pad3(id) ? name + ' ' : '') + '(' + x + ',' + y + ')', used);
      hereRows.set(m.mapId + ',' + id, r);
      frag.appendChild(r.row);
    }
    if (!m.events.length) {
      const none = document.createElement('div');
      none.className = 'none';
      none.textContent = m.mapId ? '(このマップにイベントはありません)' : '(マップにいません)';
      frag.appendChild(none);
    }
    $('selfHere').textContent = '';
    $('selfHere').appendChild(frag);
    markRunning();
    othersSignature = '';
    renderOthers();
    hereRows.forEach(paintSelf);
    filter();
  }

  function renderOthers() {
    const groups = new Map();
    for (const key of selfOn) {
      const [m, e] = key.split(',');
      const group = m + ',' + e;
      if (!hereRows.has(group)) groups.set(group, [Number(m), Number(e)]);
    }
    const signature = Array.from(groups.keys()).sort().join(' ');
    if (signature === othersSignature) return false;
    othersSignature = signature;
    otherRows = new Map();
    const box = $('selfOthers');
    box.textContent = '';
    if (!groups.size) return true;
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = 'ほかのマップ(ON のもの)';
    box.appendChild(sub);
    Array.from(groups).sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1]).forEach(([group, [m, e]]) => {
      const r = selfRow(m, e, selfLabels[group] || ('マップ' + m));
      otherRows.set(group, r);
      box.appendChild(r.row);
    });
    return true;
  }

  function makeRow(kind, id, name) {
    const row = document.createElement('div');
    row.className = 'row';
    const idEl = document.createElement('span');
    idEl.className = 'id';
    idEl.textContent = pad(id);
    const nameEl = document.createElement('span');
    nameEl.className = 'name' + (name ? '' : ' blank');
    nameEl.textContent = name || '(名前なし)';
    nameEl.title = name;
    row.append(idEl, nameEl);
    let control;
    if (kind === 'switch') {
      control = document.createElement('button');
      control.className = 'sw';
      control.addEventListener('click', () => vscode.postMessage({ type: 'set', kind, id, value: !valueOf(kind, id) }));
    } else {
      control = document.createElement('input');
      control.className = 'var';
      control.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          vscode.postMessage({ type: 'set', kind, id, text: control.value });
          control.blur();
        } else if (e.key === 'Escape') {
          control.blur();
        }
      });
      control.addEventListener('blur', () => paint(kind, id));
    }
    row.appendChild(control);
    row.dataset.search = (name || '').toLowerCase();
    return { row, control };
  }

  function itemRow(key, id, name) {
    const row = document.createElement('div');
    row.className = 'row';
    const idEl = document.createElement('span');
    idEl.className = 'id';
    idEl.textContent = pad(id);
    const nameEl = document.createElement('span');
    nameEl.className = 'name' + (name ? '' : ' blank');
    nameEl.textContent = name || '(名前なし)';
    nameEl.title = name;
    const control = document.createElement('input');
    control.className = 'var count';
    control.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        vscode.postMessage({ type: 'set', kind: 'item', key, text: control.value });
        control.blur();
      } else if (e.key === 'Escape') {
        control.blur();
      }
    });
    control.addEventListener('blur', () => paintItem(key));
    row.append(idEl, nameEl, control);
    return { row, control, id, name, search: (name || '').toLowerCase() };
  }

  function paintItem(key) {
    const r = itemRows.get(key);
    if (!r) return;
    const count = itemCounts.get(key) || 0;
    const disabled = status !== 'live';
    r.control.disabled = disabled;
    r.control.title = disabled ? 'テストプレイ中だけ書き換えられます' : '個数を打って Enter で書き込み';
    if (document.activeElement !== r.control) {
      r.control.value = String(count);
      r.control.classList.toggle('set', count > 0);
    }
  }

  function paintGold() {
    const el = $('gold');
    const disabled = status !== 'live';
    el.disabled = disabled;
    el.title = disabled ? 'テストプレイ中だけ書き換えられます' : '金額を打って Enter で書き込み';
    if (document.activeElement !== el) {
      el.value = String(gold);
      el.classList.toggle('set', gold > 0);
    }
  }

  function setItems(names) {
    const box = $('items');
    const scroll = box.parentNode.scrollTop;
    const frag = document.createDocumentFragment();
    itemRows = new Map();
    itemSubs = new Map();
    for (const [kind, title] of ITEM_KINDS) {
      const list = names[kind] || [];
      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = title;
      itemSubs.set(kind, sub);
      frag.appendChild(sub);
      for (let id = 1; id < list.length; id++) {
        const key = kind + ':' + id;
        const r = itemRow(key, id, list[id]);
        r.kind = kind;
        itemRows.set(key, r);
        frag.appendChild(r.row);
      }
    }
    box.textContent = '';
    box.appendChild(frag);
    box.parentNode.scrollTop = scroll;
    itemRows.forEach((_r, key) => paintItem(key));
  }

  function filterItems(q, number, hide) {
    const all = $('allItems').checked;
    const shownIn = new Map();
    let shown = 0;
    let owned = 0;
    let total = 0;
    itemRows.forEach((r, key) => {
      const count = itemCounts.get(key) || 0;
      if (count > 0) owned++;
      if (r.name || count > 0) total++;
      const hit = !q || r.id === number || r.search.includes(q);
      const visible = hit && (count > 0 || (all && !hide && !!r.name));
      r.row.hidden = !visible;
      if (!visible) return;
      shown++;
      shownIn.set(r.kind, (shownIn.get(r.kind) || 0) + 1);
    });
    itemSubs.forEach((sub, kind) => { sub.hidden = !shownIn.get(kind); });
    $('itemNone').hidden = shown > 0;
    $('itemNone').textContent = q ? '(当てはまるものはありません)' : all && !hide ? '(アイテムがありません)' : '(何も持っていません)';
    $('itemCount').textContent = owned + '種類' + (all ? ' / 全' + total : '');
  }

  function paint(kind, id) {
    const r = rows[kind][id];
    if (!r) return;
    const v = valueOf(kind, id);
    const disabled = status !== 'live';
    r.control.disabled = disabled;
    r.control.title = disabled ? 'テストプレイ中だけ書き換えられます' : (kind === 'switch' ? 'クリックで切り替え' : '値を打って Enter で書き込み(文字は "…" で囲む)');
    if (kind === 'switch') {
      r.control.textContent = v ? 'ON' : 'OFF';
      r.control.classList.toggle('on', !!v);
    } else if (document.activeElement !== r.control) {
      r.control.value = text(v);
      r.control.classList.toggle('set', v !== 0);
    }
  }

  function filter() {
    const q = $('filter').value.trim().toLowerCase();
    const number = /^[0-9]+$/.test(q) ? Number(q) : NaN;
    const hide = $('hideDefault').checked;
    const all = $('allEvents').checked;
    vscode.setState({ filter: $('filter').value, hideDefault: hide, allEvents: all, allItems: $('allItems').checked });
    filterItems(q, number, hide);
    let shownHere = 0;
    let relevantHere = 0;
    for (const rowsOfSelf of [hereRows, otherRows]) {
      rowsOfSelf.forEach((r) => {
        const relevant = all || rowsOfSelf === otherRows || r.used.length > 0 || r.on || r.row.classList.contains('running');
        const hit = !q || r.eventId === number || r.row.dataset.search.includes(q);
        const visible = relevant && hit && (!hide || r.on);
        r.row.hidden = !visible;
        if (rowsOfSelf === hereRows && relevant) relevantHere++;
        if (visible && rowsOfSelf === hereRows) shownHere++;
      });
    }
    $('selfUnused').hidden = !(hereRows.size > 0 && relevantHere === 0);
    const where = mapInfo.mapName ? mapInfo.mapName + ' ' : '';
    const total = all ? hereRows.size : relevantHere;
    $('selfCount').textContent = where + (shownHere === total ? String(total) : shownHere + ' / ' + total) + (all ? '' : ' / 全' + hereRows.size);
    for (const kind of ['switch', 'variable']) {
      let shown = 0;
      rows[kind].forEach((r, id) => {
        if (!r) return;
        const hit = !q || id === number || r.row.dataset.search.includes(q);
        const visible = hit && (!hide || valueOf(kind, id) !== blank(kind));
        r.row.hidden = !visible;
        if (visible) shown++;
      });
      const total = rows[kind].filter(Boolean).length;
      counts[kind].textContent = shown === total ? String(total) : shown + ' / ' + total;
    }
  }

  function setNames(m) {
    for (const kind of ['switch', 'variable']) {
      const names = kind === 'switch' ? m.switches : m.variables;
      const frag = document.createDocumentFragment();
      const scroll = lists[kind].scrollTop;
      rows[kind] = [];
      for (let id = 1; id < names.length; id++) {
        const r = makeRow(kind, id, names[id]);
        rows[kind][id] = r;
        frag.appendChild(r.row);
      }
      lists[kind].textContent = '';
      lists[kind].appendChild(frag);
      lists[kind].scrollTop = scroll;
      rows[kind].forEach((_r, id) => paint(kind, id));
    }
    setItems(m.items || {});
    $('currency').textContent = m.currencyUnit || '';
    filter();
  }

  function setValues(m) {
    const project = m.project ? ' — ' + m.project : '';
    const repaintAll = status !== m.status;
    status = m.status;
    $('status').className = status;
    $('status').textContent = status === 'live' ? 'テストプレイ中' + project
      : status === 'stale' ? 'テストプレイの最後の値' + project + '(ゲームから知らせがありません)' : '';
    $('empty').hidden = status !== 'none';
    $('cols').hidden = status === 'none';
    const next = { switch: new Map(m.switches), variable: new Map(m.variables) };
    for (const kind of ['switch', 'variable']) {
      const touched = new Set([...values[kind].keys(), ...next[kind].keys()]);
      values[kind] = next[kind];
      if (repaintAll) rows[kind].forEach((_r, id) => paint(kind, id));
      else touched.forEach((id) => paint(kind, id));
      for (const id of (kind === 'switch' ? m.changed.switches : m.changed.variables)) {
        const r = rows[kind][id];
        if (!r) continue;
        r.row.classList.remove('flash');
        void r.row.offsetWidth;
        r.row.classList.add('flash');
      }
    }
    const nextItems = new Map(m.items || []);
    const touchedItems = new Set([...itemCounts.keys(), ...nextItems.keys()]);
    itemCounts = nextItems;
    if (repaintAll) itemRows.forEach((_r, key) => paintItem(key));
    else touchedItems.forEach(paintItem);
    for (const key of m.changed.items || []) {
      const r = itemRows.get(key);
      if (!r) continue;
      r.row.classList.remove('flash');
      void r.row.offsetWidth;
      r.row.classList.add('flash');
    }
    gold = m.gold || 0;
    paintGold();
    if (m.changed.gold) {
      $('goldRow').classList.remove('flash');
      void $('goldRow').offsetWidth;
      $('goldRow').classList.add('flash');
    }
    const owned = Array.from(itemCounts.keys()).sort().join(' ');
    const itemsChanged = owned !== ownedSignature;
    ownedSignature = owned;
    pagesHere = new Map(m.pages || []);
    selfOn = new Set(m.selfSwitches);
    selfLabels = m.selfLabels || {};
    const rebuilt = renderOthers();
    hereRows.forEach(paintSelf);
    otherRows.forEach(paintSelf);
    for (const key of m.changed.selfSwitches || []) {
      const group = key.split(',').slice(0, 2).join(',');
      const r = hereRows.get(group) || otherRows.get(group);
      if (!r) continue;
      r.row.classList.remove('flash');
      void r.row.offsetWidth;
      r.row.classList.add('flash');
    }
    const selfChanged = Array.from(hereRows.values()).some((r) => r.on !== r.wasOn);
    hereRows.forEach((r) => { r.wasOn = r.on; });
    if ($('hideDefault').checked || rebuilt || selfChanged || itemsChanged) filter();
  }

  function markRunning() {
    let changed = false;
    hereRows.forEach((r) => {
      const running = !!runningEvent && r.mapId === runningEvent[0] && r.eventId === runningEvent[1];
      if (r.row.classList.contains('running') !== running) changed = true;
      r.row.classList.toggle('running', running);
    });
    if (changed) filter();
  }

  function setRunning(m) {
    const el = $('running');
    const inner = m.frames[m.frames.length - 1];
    runningEvent = m.event;
    markRunning();
    if (!inner) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.className = !inner.found ? 'missing' : inner.line !== null && !inner.exact ? 'approximate' : '';
    el.textContent = '▶ ' + inner.label + (inner.line !== null ? ' ' + inner.line + '行目' : '') + (inner.line !== null && !inner.exact ? '(近い行)' : '');
    el.title = m.frames.slice().reverse().map((f) => f.label + (f.line !== null ? ' ' + f.line + '行目' : '') + (f.problem ? ' — ' + f.problem : '')).join('\\n')
      + (inner.found ? '\\n\\n押すとその行を開きます。' : '');
  }

  $('running').addEventListener('click', () => { if (!$('running').classList.contains('missing')) vscode.postMessage({ type: 'revealRunning' }); });
  $('filter').addEventListener('input', filter);
  $('hideDefault').addEventListener('change', filter);
  $('allEvents').addEventListener('change', filter);
  $('allItems').addEventListener('change', filter);
  $('gold').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      vscode.postMessage({ type: 'set', kind: 'gold', text: $('gold').value });
      $('gold').blur();
    } else if (e.key === 'Escape') {
      $('gold').blur();
    }
  });
  $('gold').addEventListener('blur', paintGold);
  $('openRunning').addEventListener('change', () => vscode.postMessage({ type: 'openRunning', value: $('openRunning').checked }));
  $('play').addEventListener('click', () => vscode.postMessage({ type: 'testPlay' }));
  let noticeTimer;
  window.addEventListener('message', (event) => {
    const m = event.data;
    if (!m) return;
    if (m.type === 'names') setNames(m);
    else if (m.type === 'events') setEvents(m);
    else if (m.type === 'values') setValues(m);
    else if (m.type === 'running') setRunning(m);
    else if (m.type === 'options') $('openRunning').checked = !!m.openRunning;
    else if (m.type === 'notice') {
      $('notice').textContent = m.text;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { $('notice').textContent = ''; }, 6000);
    }
  });
  vscode.postMessage({ type: 'ready' });
</script>
</body></html>`;
}
