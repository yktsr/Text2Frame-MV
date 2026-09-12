import * as crypto from 'crypto';

/**
 * プレビューの HTML。VS Code に依存しない(描画は Webview の中のスクリプトが、
 * 拡張から送られてくる行を受け取って行う)。文字は textContent で入れ、HTML として解釈しない。
 * 画像は data URI だけを許す(CSP の img-src data:)。
 */

export const FACE_SIZE = 48;

export function previewHtml(): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  body { font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 8px 12px; }
  .banner { padding: 6px 10px; margin-bottom: 8px; border-radius: 3px; }
  .error { background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); }
  .notice { background: var(--vscode-inputValidation-infoBackground); border: 1px solid var(--vscode-inputValidation-infoBorder); }
  .row { display: flex; align-items: flex-start; min-height: 1.5em; line-height: 1.5em; white-space: pre-wrap; }
  .mark { color: var(--vscode-textLink-foreground); }
  .label { color: var(--vscode-textLink-foreground); }
  .cont { color: var(--vscode-foreground); }
  .cont .mark { color: var(--vscode-descriptionForeground); }
  .comment .text { color: var(--vscode-descriptionForeground); }
  .face { width: ${FACE_SIZE}px; height: ${FACE_SIZE}px; margin: 2px 6px 2px 0; border: 1px solid var(--vscode-panel-border); flex: none; }
  .empty { color: var(--vscode-descriptionForeground); }
  .row[data-line] { cursor: pointer; }
  .row.current { background: var(--vscode-editor-lineHighlightBackground, rgba(128,128,128,0.2)); outline: 1px solid var(--vscode-editor-lineHighlightBorder, transparent); }
</style></head>
<body>
<div id="banners"></div>
<div id="rows"></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const rowsEl = document.getElementById('rows');
  // 行をクリックしたら、その行を出したテキストの行へ戻る。
  rowsEl.addEventListener('click', (e) => {
    const row = e.target.closest('.row[data-line]');
    if (row) vscode.postMessage({ type: 'reveal', line: Number(row.dataset.line) });
  });
  const bannersEl = document.getElementById('banners');
  const banner = (cls, text) => { const d = document.createElement('div'); d.className = 'banner ' + cls; d.textContent = text; bannersEl.appendChild(d); };
  window.addEventListener('message', (event) => {
    const m = event.data;
    if (m && m.type === 'highlight') {
      rowsEl.querySelectorAll('.row.current').forEach((r) => r.classList.remove('current'));
      let first = null;
      for (const i of m.indices) {
        const r = rowsEl.querySelector('.row[data-index="' + i + '"]');
        if (r) { r.classList.add('current'); first = first || r; }
      }
      if (first) first.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (!m || m.type !== 'render') return;
    bannersEl.textContent = '';
    if (m.error) banner('error', m.error);
    if (m.notice) banner('notice', m.notice);
    const frag = document.createDocumentFragment();
    if (!m.rows.length) { const d = document.createElement('div'); d.className = 'empty'; d.textContent = '(コマンドはありません)'; frag.appendChild(d); }
    for (const r of m.rows) {
      const row = document.createElement('div');
      row.className = 'row ' + (r.head ? 'head' : 'cont') + (r.code === 108 || r.code === 408 ? ' comment' : '');
      row.dataset.index = String(r.index);
      if (m.lines && m.lines[r.index] !== undefined) row.dataset.line = String(m.lines[r.index]);
      row.style.paddingLeft = (r.indent * 1.5) + 'em';
      const mark = document.createElement('span');
      mark.className = 'mark';
      // 続きの行はツクールと同じく「：」を字下げして揃える。
      mark.textContent = r.head ? '◆' : '：\\u3000\\u3000\\u3000：';
      row.appendChild(mark);
      if (r.head && r.label) {
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = r.label + (r.text ? '：' : '');
        row.appendChild(label);
      }
      if (r.face) {
        const src = m.faces[r.face.name + '(' + r.face.index + ')'];
        if (src) { const img = document.createElement('img'); img.className = 'face'; img.src = src; img.alt = r.face.name; row.appendChild(img); }
      }
      const text = document.createElement('span');
      text.className = 'text';
      text.textContent = r.text;
      row.appendChild(text);
      frag.appendChild(row);
    }
    rowsEl.textContent = '';
    rowsEl.appendChild(frag);
  });
</script>
</body></html>`;
}
