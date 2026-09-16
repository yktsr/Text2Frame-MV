import * as crypto from 'crypto';

/**
 * マップのつながりの図(Webview)。丸がマップ、矢印が場所移動。
 * 図は拡張から届く点と矢印の並び(db/mapGraph.ts)から、この画面で SVG を組み立てる。
 */
export function mapGraphHtml(): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
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
  .edge { stroke: var(--vscode-editorLineNumber-foreground); fill: none; cursor: pointer; }
  .edge.vehicle { stroke-dasharray: 5 3; }
  .edge:hover { stroke: var(--vscode-focusBorder); stroke-width: 2; }
  .hint { fill: var(--vscode-descriptionForeground); font-size: 11px; }
</style></head>
<body>
<div id="top">
  <span id="center"></span>
  <label>何段先まで <select id="hops"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label>
  <label><input type="checkbox" id="vehicle"> 乗り物も出す</label>
  <button id="all">全部のマップを出す</button>
  <span id="note"></span>
</div>
<div id="graph"></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const SVG = 'http://www.w3.org/2000/svg';
  const COL = 220;
  const ROW = 64;
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
      none.textContent = 'このマップに出入りする場所移動は見つかりませんでした。';
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
    for (const n of data.nodes) {
      const middle = (height - rows[n.column] * ROW) / 2;
      at[n.id] = { x: n.column * COL + 20, y: middle + n.row * ROW + 10 };
    }
    for (const e of data.edges) {
      const a = at[e.from];
      const b = at[e.to];
      if (!a || !b) continue;
      const x1 = a.x + W;
      const y1 = a.y + H / 2;
      const x2 = b.x;
      const y2 = b.y + H / 2;
      const path = el('path', {
        class: 'edge' + (e.vehicle ? ' vehicle' : ''),
        d: 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + 40) + ' ' + y1 + ' ' + (x2 - 40) + ' ' + y2 + ' ' + x2 + ' ' + y2,
        'marker-end': 'url(#arrow-end)'
      }, svg);
      if (e.both) path.setAttribute('marker-start', 'url(#arrow-start)');
      const label = (data.names[e.from] || e.from) + (e.both ? ' ⇄ ' : ' → ') + (data.names[e.to] || e.to) + '(' + e.places.length + 'か所)';
      el('title', {}, path).textContent = label + ' — 押すと、移動している行へ飛びます';
      path.addEventListener('click', () => vscode.postMessage({ type: 'open', at: e.places[0].at, index: e.places[0].index }));
    }
    for (const n of data.nodes) {
      const g = el('g', { class: 'node' + (n.id === data.center ? ' center' : ''), transform: 'translate(' + at[n.id].x + ',' + at[n.id].y + ')' }, svg);
      el('rect', { width: W, height: H }, g);
      const name = el('text', { x: 8, y: 15 }, g);
      name.textContent = (data.names[n.id] || ('マップ' + n.id)).slice(0, 14);
      const id = el('text', { x: 8, y: 28, class: 'id' }, g);
      id.textContent = '#' + String(n.id).padStart(4, '0') + (n.hop ? ' / ' + n.hop + '回' : '');
      el('title', {}, g).textContent = '押すと、このマップを真ん中にします';
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
    document.getElementById('center').textContent = m.center ? '真ん中: ' + (m.names[m.center] || m.center) : '全部のマップ';
    document.getElementById('hops').value = String(m.hops);
    document.getElementById('hops').disabled = !m.center;
    document.getElementById('vehicle').checked = !!m.vehicle;
    document.getElementById('note').textContent = (m.truncated ? '多いので途中までにしています。' : '')
      + 'マップ ' + m.nodes.length + '個 / 矢印 ' + m.edges.length + '本';
    draw();
  });
  vscode.postMessage({ type: 'ready' });
</script>
</body></html>`;
}
