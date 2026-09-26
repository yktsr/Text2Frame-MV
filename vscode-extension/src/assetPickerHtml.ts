import * as crypto from 'crypto';
import { tr } from './db/lang';
import { html, scriptText } from './webviewText';

/**
 * 素材を選ぶ画面(Webview)。顔画像は、見えた行から順に拡張へ頼んで読み込む。
 * 音声は ▶ で試しに鳴らせる(鳴らし方はプレビューと同じ)。
 */
export function assetPickerHtml(): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    const L = {
        clickToPut: tr('押すと入れます', 'Click to put it in'),
        characterNo: tr('{0} の {1} 番', '{0}, number {1}'),
        cannotPlay: tr('この形式の音声は再生できません(VS Code は .m4a を鳴らせないことがあります)', 'This audio format cannot be played (VS Code may not play .m4a)'),
        tryPlay: tr('試しに鳴らす(もう一度押すと止まる)', 'Listen (click again to stop)'),
        put: tr('入れる', 'Put in'),
        noFaces: tr('(img/faces に顔画像がありません)', '(No face images in img/faces)'),
        noCharacters: tr('(img/characters に画像がありません)', '(No images in img/characters)'),
        noPictures: tr('(img/pictures に画像がありません)', '(No images in img/pictures)'),
        noAudio: tr('(audio/{0} に音声がありません)', '(No audio in audio/{0})'),
        noMatch: tr('(当てはまるものはありません)', '(Nothing matches)'),
        target: tr('入れる所: {0}', 'Goes to: {0}')
    };
    return `<!DOCTYPE html>
<html lang="${tr('ja', 'en')}"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  [hidden] { display: none !important; }
  body { margin: 0; padding: 0 12px 12px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); }
  #top { position: sticky; top: 0; z-index: 1; background: var(--vscode-editor-background); padding: 8px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; border-bottom: 1px solid var(--vscode-panel-border); }
  .tab { font: inherit; padding: 2px 10px; cursor: pointer; border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); border-radius: 3px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  .tab.on { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  #filter { flex: 0 1 16em; min-width: 8em; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); padding: 2px 4px; font: inherit; }
  #target { color: var(--vscode-descriptionForeground); }
  #done { color: var(--vscode-testing-iconPassed, #3a3); }
  .sheet { padding: 8px 0; border-bottom: 1px solid var(--vscode-panel-border); }
  .sheet h4 { margin: 0 0 4px; font-weight: 600; font-size: inherit; }
  .faces { display: grid; grid-template-columns: repeat(auto-fill, 76px); gap: 6px; min-height: 76px; }
  .face { width: 72px; height: 72px; padding: 1px; border: 1px solid transparent; border-radius: 3px; cursor: pointer; background: var(--vscode-editorWidget-background); position: relative; }
  .face:hover { border-color: var(--vscode-focusBorder); }
  .face img { width: 72px; height: 72px; display: block; image-rendering: auto; }
  .face .no { position: absolute; left: 2px; top: 1px; font-size: 0.8em; color: var(--vscode-descriptionForeground); }
  .row { display: flex; align-items: center; gap: 8px; padding: 2px 2px; line-height: 1.8em; }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button.play, button.put { font: inherit; padding: 0 8px; cursor: pointer; border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); border-radius: 3px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  button.play.on { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .none { padding: 12px 0; color: var(--vscode-descriptionForeground); }
</style></head>
<body>
<div id="top">
  <button class="tab" data-tab="face">${html(tr('顔画像', 'Faces'))}</button>
  <button class="tab" data-tab="character">${html(tr('キャラ', 'Characters'))}</button>
  <button class="tab" data-tab="picture">${html(tr('ピクチャ', 'Pictures'))}</button>
  <button class="tab" data-tab="bgm">BGM</button>
  <button class="tab" data-tab="bgs">BGS</button>
  <button class="tab" data-tab="me">ME</button>
  <button class="tab" data-tab="se">SE</button>
  <input id="filter" type="search" placeholder="${html(tr('名前で絞り込み', 'Filter by name'))}">
  <span id="target"></span>
  <span id="done"></span>
</div>
<div id="list"></div>
<script nonce="${nonce}">
  ${scriptText(L)}
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  let data = { faces: [], owners: {}, characters: [], pictures: [], audio: { bgm: [], bgs: [], me: [], se: [] } };
  let tab = 'face';
  const loaded = new Map();

  // 見えてきたものから絵を頼む(全部いっぺんに読むと重い)。
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const name = e.target.dataset.name;
      const kind = e.target.dataset.kind;
      observer.unobserve(e.target);
      const key = kind + '\u0000' + name;
      if (!loaded.has(key)) vscode.postMessage({ type: kind === 'picture' ? 'picture' : kind === 'character' ? 'characters' : 'faces', name });
    }
  }, { rootMargin: '400px' });

  function faceSheet(name) {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.dataset.name = name;
    sheet.dataset.kind = 'face';
    const h = document.createElement('h4');
    h.textContent = name;
    const grid = document.createElement('div');
    grid.className = 'faces';
    sheet.append(h, grid);
    for (let i = 0; i < 8; i++) {
      const cell = document.createElement('div');
      cell.className = 'face';
      const owner = data.owners[name + '(' + i + ')'];
      cell.title = name + '(' + i + ')' + (owner ? ' — ' + owner : '') + '\\n' + L.clickToPut;
      const no = document.createElement('span');
      no.className = 'no';
      no.textContent = i;
      cell.appendChild(no);
      cell.addEventListener('click', () => vscode.postMessage({ type: 'pickFace', name, index: i }));
      grid.appendChild(cell);
    }
    if (loaded.has('face\u0000' + name)) fillSheet(sheet, loaded.get('face\u0000' + name));
    else observer.observe(sheet);
    return sheet;
  }

  /* キャラ画像。1枚に8体(名前が $ で始まるものは1体)。下を向いて止まった姿を出す。 */
  function characterSheet(name) {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.dataset.name = name;
    sheet.dataset.kind = 'character';
    const h = document.createElement('h4');
    h.textContent = name;
    const grid = document.createElement('div');
    grid.className = 'faces';
    sheet.append(h, grid);
    const count = /^[$]/.test(name) ? 1 : 8;
    for (let i = 0; i < count; i++) {
      const cell = document.createElement('div');
      cell.className = 'face';
      cell.title = fmt(L.characterNo, name, i) + '\\n' + L.clickToPut;
      const no = document.createElement('span');
      no.className = 'no';
      no.textContent = i;
      cell.appendChild(no);
      cell.addEventListener('click', () => vscode.postMessage({ type: 'pickCharacter', name, index: i }));
      grid.appendChild(cell);
    }
    const key = 'character\u0000' + name;
    if (loaded.has(key)) fillSheet(sheet, loaded.get(key));
    else observer.observe(sheet);
    return sheet;
  }

  /* ピクチャ。1枚まるごとを小さくして出す。 */
  function pictureCard(name) {
    const card = document.createElement('div');
    card.className = 'sheet';
    card.dataset.name = name;
    card.dataset.kind = 'picture';
    const h = document.createElement('h4');
    h.textContent = name;
    const cell = document.createElement('div');
    cell.className = 'face';
    cell.title = name + '\\n' + L.clickToPut;
    cell.addEventListener('click', () => vscode.postMessage({ type: 'pickPicture', name }));
    const grid = document.createElement('div');
    grid.className = 'faces';
    grid.appendChild(cell);
    card.append(h, grid);
    const key = 'picture\u0000' + name;
    if (loaded.has(key)) fillSheet(card, loaded.get(key));
    else observer.observe(card);
    return card;
  }

  function fillSheet(sheet, uris) {
    sheet.querySelectorAll('.face').forEach((cell, i) => {
      if (!uris[i] || cell.querySelector('img')) return;
      const img = document.createElement('img');
      img.src = uris[i];
      img.alt = '';
      cell.insertBefore(img, cell.firstChild);
    });
  }

  // --- 音声の試し聞き(プレビューと同じ) ---
  let audioContext = null;
  let playing = null;
  let waiting = null;
  let nextId = 1;
  const stopPlaying = () => {
    if (!playing) return;
    try { playing.source.stop(); } catch (e) { /* 止まっている */ }
    playing.button.textContent = '▶';
    playing.button.classList.remove('on');
    playing = null;
  };
  const requestPlay = (button, folder, name) => {
    if (playing && playing.button === button) { stopPlaying(); return; }
    stopPlaying();
    if (waiting) waiting.button.textContent = '▶';
    waiting = { id: nextId++, button, folder };
    button.textContent = '…';
    vscode.postMessage({ type: 'play', id: waiting.id, folder, name });
  };
  const startPlaying = (w, bytes) => {
    audioContext = audioContext || new AudioContext();
    audioContext.decodeAudioData(bytes.buffer).then((buffer) => {
      if (waiting !== w) return;
      waiting = null;
      stopPlaying();
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = w.folder === 'bgm' || w.folder === 'bgs';
      const gain = audioContext.createGain();
      gain.gain.value = 0.9;
      source.connect(gain).connect(audioContext.destination);
      source.onended = () => { if (playing && playing.source === source) stopPlaying(); };
      source.start();
      playing = { source, button: w.button };
      w.button.textContent = '■';
      w.button.classList.add('on');
    }).catch(() => {
      if (waiting === w) waiting = null;
      w.button.textContent = '▶';
      w.button.title = L.cannotPlay;
    });
  };

  function audioRow(folder, name) {
    const row = document.createElement('div');
    row.className = 'row';
    const play = document.createElement('button');
    play.className = 'play';
    play.textContent = '▶';
    play.title = L.tryPlay;
    play.addEventListener('click', () => requestPlay(play, folder, name));
    const label = document.createElement('span');
    label.className = 'name';
    label.textContent = name;
    const put = document.createElement('button');
    put.className = 'put';
    put.textContent = L.put;
    put.addEventListener('click', () => vscode.postMessage({ type: 'pickAudio', folder, name }));
    row.append(play, label, put);
    return row;
  }

  function render() {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const q = $('filter').value.trim().toLowerCase();
    const list = $('list');
    list.textContent = '';
    observer.disconnect();
    const all = tab === 'face' ? data.faces : tab === 'character' ? data.characters : tab === 'picture' ? data.pictures : data.audio[tab];
    const names = (all || []).filter((n) => !q || n.toLowerCase().includes(q));
    const frag = document.createDocumentFragment();
    for (const name of names) {
      frag.appendChild(tab === 'face' ? faceSheet(name)
        : tab === 'character' ? characterSheet(name)
          : tab === 'picture' ? pictureCard(name)
            : audioRow(tab, name));
    }
    if (!names.length) {
      const none = document.createElement('div');
      none.className = 'none';
      const empty = tab === 'face' ? L.noFaces
        : tab === 'character' ? L.noCharacters
          : tab === 'picture' ? L.noPictures
            : fmt(L.noAudio, tab);
      none.textContent = q ? L.noMatch : empty;
      frag.appendChild(none);
    }
    list.appendChild(frag);
    vscode.setState({ tab, filter: $('filter').value });
  }

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; stopPlaying(); render(); }));
  $('filter').addEventListener('input', render);
  const saved = vscode.getState() || {};
  $('filter').value = saved.filter || '';

  window.addEventListener('message', (event) => {
    const m = event.data;
    if (!m) return;
    if (m.type === 'init') {
      data = m;
      if (m.tab) tab = m.tab;
      $('target').textContent = m.target ? fmt(L.target, m.target) : '';
      $('done').textContent = '';
      render();
    } else if (m.type === 'faces' || m.type === 'characters' || m.type === 'picture') {
      const kind = m.type === 'faces' ? 'face' : m.type === 'characters' ? 'character' : 'picture';
      const uris = m.type === 'picture' ? [m.uri] : m.uris;
      loaded.set(kind + '\u0000' + m.name, uris);
      const sheet = Array.from(document.querySelectorAll('.sheet')).find((s) => s.dataset.name === m.name && s.dataset.kind === kind);
      if (sheet) fillSheet(sheet, uris);
    } else if (m.type === 'done') {
      $('done').textContent = m.text;
    } else if (m.type === 'audio' || m.type === 'audioError') {
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
    }
  });
  vscode.postMessage({ type: 'ready' });
</script>
</body></html>`;
}
