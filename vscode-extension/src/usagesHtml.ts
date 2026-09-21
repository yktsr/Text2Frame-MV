import * as crypto from 'crypto';

/**
 * 「使っている箇所」の一覧の HTML。VS Code に依存しない。grep のように、ファイルごとに
 * 使用箇所とその前後の行を並べる。行をクリックすると、拡張がその行を開く。
 *
 * 拡張から届く知らせ:
 *   { type: 'render', title, summary, files: [...], conditions: [{ label, note }] }
 *     conditions は「その番号が出現条件になっているページ」。押すと open で開く。
 *   n は 1 始まりの行番号。hits はその行で番号が書かれている範囲(使用箇所の行だけ)。
 * 拡張へ送る知らせ:
 *   { type: 'open', file: files の番号, line: 0 始まり, start?, end? }
 *   { type: 'openCondition', index: conditions の番号 }
 */

export function usagesHtml(): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  body { margin: 0; padding: 0 12px 12px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); }
  header { position: sticky; top: 0; z-index: 2; padding: 8px 0 6px; background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-panel-border); }
  h1 { font-size: 1.1em; margin: 0; }
  #summary { color: var(--vscode-descriptionForeground); margin-top: 2px; }
  details { margin-top: 10px; }
  summary { cursor: pointer; padding: 2px 0; }
  summary .label { font-weight: 600; }
  summary .detail { color: var(--vscode-descriptionForeground); margin-left: 8px; }
  .block { margin: 4px 0 0 0; font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); border-left: 2px solid var(--vscode-panel-border); }
  .block + .block { margin-top: 2px; }
  .gap { font-family: var(--vscode-editor-font-family); color: var(--vscode-descriptionForeground); padding-left: 1em; line-height: 1.2em; }
  .line { display: flex; white-space: pre; cursor: pointer; line-height: 1.5em; }
  .line:hover { background: var(--vscode-list-hoverBackground); }
  .n { flex: none; width: 4.5em; padding-right: 1em; text-align: right; color: var(--vscode-editorLineNumber-foreground, var(--vscode-descriptionForeground)); user-select: none; }
  .text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .line.hit { background: var(--vscode-editor-lineHighlightBackground, rgba(128, 128, 128, 0.15)); }
  .line.hit .n { color: var(--vscode-editorLineNumber-activeForeground, var(--vscode-foreground)); }
  mark { background: var(--vscode-editor-findMatchHighlightBackground, rgba(255, 200, 0, 0.4)); color: inherit; border-radius: 2px; }
  .empty { margin-top: 12px; color: var(--vscode-descriptionForeground); }
</style></head>
<body>
<header><h1 id="title"></h1><div id="summary"></div></header>
<main id="conditions"></main>
<main id="files"></main>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const filesEl = document.getElementById('files');
  const conditionsEl = document.getElementById('conditions');

  function lineEl(fileIndex, l) {
    const row = document.createElement('div');
    row.className = 'line' + (l.hits.length ? ' hit' : '');
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = String(l.n);
    const text = document.createElement('span');
    text.className = 'text';
    let at = 0;
    for (const [start, end] of l.hits) {
      if (start < at) continue;
      text.append(l.text.slice(at, start));
      const mark = document.createElement('mark');
      mark.textContent = l.text.slice(start, end);
      text.append(mark);
      at = end;
    }
    text.append(l.text.slice(at));
    row.append(n, text);
    const first = l.hits[0];
    row.addEventListener('click', () => vscode.postMessage({ type: 'open', file: fileIndex, line: l.n - 1, start: first ? first[0] : undefined, end: first ? first[1] : undefined }));
    return row;
  }

  window.addEventListener('message', (event) => {
    const m = event.data;
    if (!m || m.type !== 'render') return;
    document.getElementById('title').textContent = m.title;
    document.getElementById('summary').textContent = m.summary;
    document.title = m.title;
    conditionsEl.textContent = '';
    if (m.conditions && m.conditions.length) {
      const details = document.createElement('details');
      details.open = true;
      const summary = document.createElement('summary');
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = '出現条件になっているページ';
      summary.append(label);
      details.append(summary);
      m.conditions.forEach((c, index) => {
        const row = document.createElement('div');
        row.className = 'line hit';
        const text = document.createElement('span');
        text.className = 'text';
        text.textContent = c.label;
        const note = document.createElement('span');
        note.className = 'detail';
        note.textContent = c.note;
        row.append(text, note);
        row.addEventListener('click', () => vscode.postMessage({ type: 'openCondition', index }));
        details.append(row);
      });
      conditionsEl.append(details);
    }
    const frag = document.createDocumentFragment();
    m.files.forEach((f, fileIndex) => {
      const details = document.createElement('details');
      details.open = true;
      const summary = document.createElement('summary');
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = f.label;
      summary.append(label);
      if (f.detail) {
        const detail = document.createElement('span');
        detail.className = 'detail';
        detail.textContent = f.detail;
        summary.append(detail);
      }
      details.append(summary);
      f.blocks.forEach((b, i) => {
        if (i > 0) {
          const gap = document.createElement('div');
          gap.className = 'gap';
          gap.textContent = '⋮';
          details.append(gap);
        }
        const block = document.createElement('div');
        block.className = 'block';
        for (const l of b.lines) block.append(lineEl(fileIndex, l));
        details.append(block);
      });
      frag.append(details);
    });
    if (!m.files.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = '使っているテキストはありません。';
      frag.append(empty);
    }
    filesEl.textContent = '';
    filesEl.append(frag);
    window.scrollTo(0, 0);
  });
  vscode.postMessage({ type: 'ready' });
</script>
</body></html>`;
}
