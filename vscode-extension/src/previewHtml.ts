import * as crypto from 'crypto';

/**
 * プレビューの HTML。VS Code に依存しない(描画は Webview の中のスクリプトが、
 * 拡張から送られてくる行を受け取って行う)。文字は textContent で入れ、HTML として解釈しない。
 * 画像は data URI だけを許す(CSP の img-src data:)。
 *
 * BGM・SE などの行には ▶ を付け、押すと拡張から音声の中身を受け取って WebAudio で鳴らす
 * (音量・ピッチ・位相もコマンドのとおり。BGM・BGS は繰り返す)。もう一度押すか、別の ▶ で止まる。
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
  .play { flex: none; margin-right: 0.35em; padding: 0 0.3em; border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); border-radius: 3px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); font: inherit; line-height: 1.3em; cursor: pointer; }
  .play.on { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .swatch { display: inline-block; width: 0.9em; height: 0.9em; margin: 0.3em 0.35em 0 0; border: 1px solid var(--vscode-panel-border); flex: none; }
  .face { width: ${FACE_SIZE}px; height: ${FACE_SIZE}px; margin: 2px 6px 2px 0; border: 1px solid var(--vscode-panel-border); flex: none; }
  .empty { color: var(--vscode-descriptionForeground); }
  .row[data-line] { cursor: pointer; }
  .row.current { background: var(--vscode-editor-lineHighlightBackground, rgba(128,128,128,0.2)); outline: 1px solid var(--vscode-editor-lineHighlightBorder, transparent); }
  .row.running { background: var(--vscode-editor-stackFrameHighlightBackground, rgba(255, 255, 0, 0.2)); }
  .row.running.approximate { background: var(--vscode-editor-rangeHighlightBackground, rgba(255, 255, 255, 0.08)); }
  .row.caller { background: var(--vscode-editor-focusedStackFrameHighlightBackground, rgba(122, 189, 122, 0.3)); }
  .row.running.head > .mark::before { content: '▶'; color: var(--vscode-debugIcon-continueForeground, var(--vscode-textLink-foreground)); margin-right: 2px; }
</style></head>
<body>
<div id="banners"></div>
<div id="rows"></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const rowsEl = document.getElementById('rows');
  // 行をクリックしたら、その行を出したテキストの行へ戻る。
  rowsEl.addEventListener('click', (e) => {
    if (e.target.closest('.play')) return;
    const row = e.target.closest('.row[data-line]');
    if (row) vscode.postMessage({ type: 'reveal', line: Number(row.dataset.line) });
  });

  // --- 音声の試し聞き ---
  let audioContext = null;
  let playing = null; // { source, button }
  let waiting = null; // { id, button, audio } 拡張からの返事待ち(最後に押したものだけ)
  let nextId = 1;
  const stopPlaying = () => {
    if (!playing) return;
    try { playing.source.stop(); } catch (e) { /* 止まっている */ }
    playing.button.textContent = '▶';
    playing.button.classList.remove('on');
    playing = null;
  };
  const requestPlay = (button, audio) => {
    if (playing && playing.button === button) { stopPlaying(); return; }
    stopPlaying();
    if (waiting) waiting.button.textContent = '▶';
    waiting = { id: nextId++, button, audio };
    button.textContent = '…';
    button.title = '';
    vscode.postMessage({ type: 'play', id: waiting.id, folder: audio.folder, name: audio.name });
  };
  const startPlaying = (w, bytes) => {
    audioContext = audioContext || new AudioContext();
    audioContext.decodeAudioData(bytes.buffer).then((buffer) => {
      if (waiting !== w) return; // 待っている間に別の ▶ が押された
      waiting = null;
      stopPlaying();
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = w.audio.folder === 'bgm' || w.audio.folder === 'bgs';
      source.playbackRate.value = Math.max(0.1, w.audio.pitch / 100);
      const gain = audioContext.createGain();
      gain.gain.value = Math.max(0, w.audio.volume / 100);
      const pan = audioContext.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, w.audio.pan / 100));
      source.connect(gain).connect(pan).connect(audioContext.destination);
      source.onended = () => { if (playing && playing.source === source) stopPlaying(); };
      source.start();
      playing = { source, button: w.button };
      w.button.textContent = '■';
      w.button.classList.add('on');
    }).catch(() => {
      if (waiting === w) waiting = null;
      w.button.textContent = '▶';
      w.button.title = 'この形式の音声は再生できません(VS Code は .m4a を鳴らせないことがあります)';
    });
  };
  const bannersEl = document.getElementById('banners');
  const banner = (cls, text) => { const d = document.createElement('div'); d.className = 'banner ' + cls; d.textContent = text; bannersEl.appendChild(d); };
  window.addEventListener('message', (event) => {
    const m = event.data;
    if (m && (m.type === 'audio' || m.type === 'audioError')) {
      const w = waiting;
      if (!w || w.id !== m.id) return;
      if (m.type === 'audioError') {
        waiting = null;
        w.button.textContent = '▶';
        w.button.title = m.message;
        return;
      }
      const binary = atob(m.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      startPlaying(w, bytes);
      return;
    }
    if (m && m.type === 'running') {
      rowsEl.querySelectorAll('.row.running, .row.caller').forEach((r) => r.classList.remove('running', 'caller', 'approximate'));
      for (const i of m.callers) rowsEl.querySelector('.row[data-index="' + i + '"]')?.classList.add('caller');
      for (const i of m.current) {
        const r = rowsEl.querySelector('.row[data-index="' + i + '"]');
        if (!r) continue;
        r.classList.remove('caller');
        r.classList.add('running');
        r.classList.toggle('approximate', !m.exact);
      }
      return;
    }
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
      if (r.swatch) {
        const sw = document.createElement('span');
        sw.className = 'swatch';
        sw.style.backgroundColor = r.swatch.color;
        sw.title = r.swatch.title;
        row.appendChild(sw);
      }
      if (r.audio) {
        const button = document.createElement('button');
        button.className = 'play';
        button.textContent = '▶';
        button.title = 'audio/' + r.audio.folder + '/' + r.audio.name + ' を鳴らす';
        button.addEventListener('click', () => requestPlay(button, r.audio));
        row.appendChild(button);
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
