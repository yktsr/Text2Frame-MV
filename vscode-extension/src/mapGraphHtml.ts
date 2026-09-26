import * as crypto from 'crypto';
import { tr } from './db/lang';
import { html, scriptText } from './webviewText';

/**
 * マップのつながりの図(Webview)。丸がマップ、矢印が場所移動。
 * 図は拡張から届く点と矢印の並び(db/mapGraph.ts)から、この画面で SVG を組み立てる。
 */
export function mapGraphHtml(): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    const L = {
        noTransfers: tr('このマップに出入りする場所移動は見つかりませんでした。', 'No Transfer Player into or out of this map was found.'),
        places: tr('({0}か所)', ' ({0} places)'),
        clickEdge: tr('押すと、移動している行へ飛びます', 'Click to jump to the transfer line'),
        map: tr('マップ{0}', 'Map {0}'),
        hops: tr(' / {0}回', ' / {0} hops'),
        clickNode: tr('押すと、このマップを真ん中にします', 'Click to put this map in the middle'),
        center: tr('真ん中: {0}', 'Middle: {0}'),
        allMaps: tr('全部のマップ', 'All maps'),
        truncated: tr('多いので途中までにしています。', 'There are many, so only part is shown. '),
        count: tr('マップ {0}個 / 矢印 {1}本', '{0} maps / {1} arrows')
    };
    return `<!DOCTYPE html>
<html lang="${tr('ja', 'en')}"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  [hidden] { display: none !important; }
  body { margin: 0; padding: 0 12px 12px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); }
  #top { position: sticky; top: 0; z-index: 1; background: var(--vscode-editor-background); padding: 8px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; border-bottom: 1px solid var(--vscode-panel-border); }
  #top label { display: flex; align-items: center; gap: 4px; }
  button { font: inherit; padding: 1px 10px; cursor: pointer; border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); border-radius: 3px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  #note { color: var(--vscode-descriptionForeground); }
  #graph { overflow: auto; padding-top: 8px; }
  .node { cursor: pointer; }
  .node rect { fill: var(--vscode-editorWidget-background); stroke: var(--vscode-panel-border); rx: 6; }
  .node.center rect { stroke: var(--vscode-focusBorder); stroke-width: 2; }
  .node:hover rect { stroke: var(--vscode-focusBorder); }
  .node text { fill: var(--vscode-foreground); font-size: 12px; }
  .node text.id { fill: var(--vscode-descriptionForeground); font-size: 10px; }
  .edge { stroke: var(--vscode-editorLineNumber-foreground); fill: none; cursor: pointer; opacity: 0.75; }
  .edge.back { stroke-dasharray: none; opacity: 0.5; }
  .edge.vehicle { stroke-dasharray: 5 3; }
  .edge:hover { stroke: var(--vscode-focusBorder); stroke-width: 2; opacity: 1; }
  .hint { fill: var(--vscode-descriptionForeground); font-size: 11px; }
</style></head>
<body>
<div id="top">
  <span id="center"></span>
  <label>${html(tr('何段先まで', 'Hops'))} <select id="hops"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label>
  <label><input type="checkbox" id="vehicle"> ${html(tr('乗り物も出す', 'Show vehicles too'))}</label>
  <button id="all">${html(tr('全部のマップを出す', 'Show all maps'))}</button>
  <span id="note"></span>
</div>
<div id="graph"></div>
<script nonce="${nonce}">
  ${scriptText(L)}
  const vscode = acquireVsCodeApi();
  const SVG = 'http://www.w3.org/2000/svg';
  const COL = 230;
  const ROW = 72;
  const W = 150;
  const H = 34;
  let data = { nodes: [], edges: [], center: 0, names: {}, truncated: false };

  const el = (name, attrs, parent) => {
    const node = document.createElementNS(SVG, name);
    for (const key of Object.keys(attrs || {})) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  };

  function draw() {
    const box = document.getElementById('graph');
    box.textContent = '';
    if (!data.nodes.length) {
      const none = document.createElement('div');
      none.textContent = L.noTransfers;
      none.style.padding = '12px 0';
      box.appendChild(none);
      return;
    }
    const rows = {};
    for (const n of data.nodes) rows[n.column] = Math.max(rows[n.column] || 0, n.row + 1);
    const columns = Math.max.apply(null, data.nodes.map((n) => n.column)) + 1;
    const height = Math.max.apply(null, Object.keys(rows).map((c) => rows[c])) * ROW + 40;
    const svg = el('svg', { width: columns * COL + W, height: height, viewBox: '0 0 ' + (columns * COL + W) + ' ' + height }, box);
    const defs = el('defs', {}, svg);
    for (const name of ['end', 'start']) {
      const marker = el('marker', { id: 'arrow-' + name, viewBox: '0 0 10 10', refX: name === 'end' ? 9 : 1, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
      el('path', { d: name === 'end' ? 'M 0 0 L 10 5 L 0 10 z' : 'M 10 0 L 0 5 L 10 10 z', fill: 'currentColor' }, marker);
    }
    const at = {};
    const place = {};
    for (const n of data.nodes) {
      const middle = (height - rows[n.column] * ROW) / 2;
      at[n.id] = { x: n.column * COL + 20, y: middle + n.row * ROW + 10 };
      place[n.id] = n;
    }

    // 1つの丸から何本も出ると、線が同じ場所で重なる。出入り口を丸の高さに散らす。
    const ports = {};
    for (const n of data.nodes) ports[n.id] = { right: [], left: [] };
    const sideOf = (from, to) => (place[to] && place[from] && place[to].column > place[from].column ? 'right' : 'left');
    for (const e of data.edges) {
      if (!place[e.from] || !place[e.to]) continue;
      ports[e.from][sideOf(e.from, e.to)].push(e);
      ports[e.to][sideOf(e.to, e.from)].push(e);
    }
    const other = (e, id) => (e.from === id ? e.to : e.from);
    const portY = {};
    for (const n of data.nodes) {
      for (const side of ['right', 'left']) {
        const list = ports[n.id][side];
        list.sort((p, q) => {
          const a = place[other(p, n.id)];
          const b = place[other(q, n.id)];
          return (a ? a.row : 0) - (b ? b.row : 0) || (a ? a.column : 0) - (b ? b.column : 0);
        });
        list.forEach((e, i) => {
          portY[e.from + '>' + e.to + ':' + n.id + ':' + side] = at[n.id].y + (H * (i + 1)) / (list.length + 1);
        });
      }
    }
    const portOf = (e, id) => {
      const side = sideOf(id, other(e, id));
      const y = portY[e.from + '>' + e.to + ':' + id + ':' + side];
      return { x: at[id].x + (side === 'right' ? W : 0), y: y === undefined ? at[id].y + H / 2 : y, side };
    };

    for (const e of data.edges) {
      const a = place[e.from];
      const b = place[e.to];
      if (!a || !b) continue;
      const from = portOf(e, e.from);
      const to = portOf(e, e.to);
      let d;
      if (from.side === 'right') {
        // 右へ進む線。ゆるい曲線で結ぶ。
        d = 'M ' + from.x + ' ' + from.y + ' C ' + (from.x + 50) + ' ' + from.y + ' ' + (to.x - 50) + ' ' + to.y + ' ' + to.x + ' ' + to.y;
      } else {
        // 戻る線・同じ段の線。丸を横切らないように、左へ回り込ませる。
        const out = Math.min(from.x, to.x) - 60;
        d = 'M ' + from.x + ' ' + from.y + ' C ' + out + ' ' + from.y + ' ' + out + ' ' + to.y + ' ' + to.x + ' ' + to.y;
      }
      const path = el('path', {
        class: 'edge' + (e.vehicle ? ' vehicle' : '') + (from.side === 'left' ? ' back' : ''),
        d: d,
        'marker-end': 'url(#arrow-end)'
      }, svg);
      if (e.both) path.setAttribute('marker-start', 'url(#arrow-start)');
      const label = (data.names[e.from] || e.from) + (e.both ? ' ⇄ ' : ' → ') + (data.names[e.to] || e.to) + fmt(L.places, e.places.length);
      el('title', {}, path).textContent = label + ' — ' + L.clickEdge;
      path.addEventListener('click', () => vscode.postMessage({ type: 'open', at: e.places[0].at, index: e.places[0].index }));
    }
    for (const n of data.nodes) {
      const g = el('g', { class: 'node' + (n.id === data.center ? ' center' : ''), transform: 'translate(' + at[n.id].x + ',' + at[n.id].y + ')' }, svg);
      el('rect', { width: W, height: H }, g);
      const name = el('text', { x: 8, y: 15 }, g);
      name.textContent = (data.names[n.id] || fmt(L.map, n.id)).slice(0, 14);
      const id = el('text', { x: 8, y: 28, class: 'id' }, g);
      id.textContent = '#' + String(n.id).padStart(4, '0') + (n.hop ? fmt(L.hops, n.hop) : '');
      el('title', {}, g).textContent = L.clickNode;
      g.addEventListener('click', () => vscode.postMessage({ type: 'center', mapId: n.id }));
    }
  }

  document.getElementById('hops').addEventListener('change', (e) => vscode.postMessage({ type: 'hops', hops: Number(e.target.value) }));
  document.getElementById('vehicle').addEventListener('change', (e) => vscode.postMessage({ type: 'vehicle', vehicle: e.target.checked }));
  document.getElementById('all').addEventListener('click', () => vscode.postMessage({ type: 'all' }));

  window.addEventListener('message', (event) => {
    const m = event.data;
    if (m.type !== 'graph') return;
    data = m;
    document.getElementById('center').textContent = m.center ? fmt(L.center, m.names[m.center] || m.center) : L.allMaps;
    document.getElementById('hops').value = String(m.hops);
    document.getElementById('hops').disabled = !m.center;
    document.getElementById('vehicle').checked = !!m.vehicle;
    document.getElementById('note').textContent = (m.truncated ? L.truncated : '')
      + fmt(L.count, m.nodes.length, m.edges.length);
    draw();
  });
  vscode.postMessage({ type: 'ready' });
</script>
</body></html>`;
}
