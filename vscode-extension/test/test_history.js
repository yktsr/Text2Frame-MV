const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  HistoryRecorder, withHistory, noteWrite, listEntries, restoreEntry, snapshotFile, isHistoryCopy, HISTORY_DIR
} = require('../out/db/history')

describe('history', function () {
  let root
  const file = (rel) => path.join(root, ...rel.split('/'))
  const write = (rel, text) => { fs.mkdirSync(path.dirname(file(rel)), { recursive: true }); fs.writeFileSync(file(rel), text) }
  const read = (rel) => fs.readFileSync(file(rel), 'utf8')

  beforeEach(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-history-'))
    write('data/Map001.json', '{"v":1}')
    write('text/map001_event001_page1.txt', 'こんにちは')
  })
  afterEach(function () { fs.rmSync(root, { recursive: true, force: true }) })

  it('keeps what a file held before it was written', function () {
    const entry = withHistory(root, 'apply', 'ゲームに反映 x', { keep: 10 }, () => {
      noteWrite(file('data/Map001.json'), 'data', ['e:1:1:1'])
      write('data/Map001.json', '{"v":2}')
      return listEntries(root)
    })
    expect(entry).to.eql([]) // 終わるまでは書き残さない
    const [saved] = listEntries(root)
    expect(saved.label).to.equal('ゲームに反映 x')
    expect(saved.files).to.eql([{ path: 'data/Map001.json', existed: true, kind: 'data', pages: ['e:1:1:1'] }])
    expect(fs.readFileSync(snapshotFile(root, saved.id, 'data/Map001.json'), 'utf8')).to.equal('{"v":1}')
    expect(read(`${HISTORY_DIR}/.gitignore`)).to.equal('*\n')
  })

  it('drops files that did not change, and the whole operation when nothing changed', function () {
    withHistory(root, 'apply', 'a', { keep: 10 }, () => {
      noteWrite(file('data/Map001.json'), 'data')
      noteWrite(file('text/map001_event001_page1.txt'), 'text')
      write('data/Map001.json', '{"v":2}')
    })
    expect(listEntries(root)[0].files.map((f) => f.path)).to.eql(['data/Map001.json'])
    withHistory(root, 'apply', 'b', { keep: 10 }, () => { noteWrite(file('data/Map001.json'), 'data') })
    expect(listEntries(root).length).to.equal(1)
  })

  it('writes nothing on disk at all when nothing changed', function () {
    withHistory(root, 'pullAll', 'すべて', { keep: 10 }, () => {
      for (let i = 0; i < 50; i++) noteWrite(file('text/map001_event001_page1.txt'), 'text')
      noteWrite(file('data/Map001.json'), 'data')
    })
    expect(fs.existsSync(path.join(root, HISTORY_DIR))).to.equal(false)
  })

  it('keeps only the first contents when a file is written twice in one operation', function () {
    withHistory(root, 'apply', 'a', { keep: 10 }, () => {
      noteWrite(file('data/Map001.json'), 'data')
      write('data/Map001.json', '{"v":2}')
      noteWrite(file('data/Map001.json'), 'data')
      write('data/Map001.json', '{"v":3}')
    })
    const [saved] = listEntries(root)
    expect(fs.readFileSync(snapshotFile(root, saved.id, 'data/Map001.json'), 'utf8')).to.equal('{"v":1}')
  })

  it('puts an inner operation into the outer one', function () {
    withHistory(root, 'pullAll', 'すべて', { keep: 10 }, (outer) => {
      withHistory(root, 'pull', '1つ', { keep: 10 }, () => {
        noteWrite(file('text/map001_event001_page1.txt'), 'text')
        write('text/map001_event001_page1.txt', 'こんばんは')
      })
      outer.setLabel('すべて 1件')
    })
    const all = listEntries(root)
    expect(all.map((e) => e.label)).to.eql(['すべて 1件'])
  })

  it('records a new file without a copy, and does not delete it when going back', function () {
    withHistory(root, 'pull', 'a', { keep: 10 }, () => {
      noteWrite(file('text/new.txt'), 'text')
      write('text/new.txt', '新しい')
    })
    const [saved] = listEntries(root)
    expect(saved.files).to.eql([{ path: 'text/new.txt', existed: false, kind: 'text' }])
    const result = restoreEntry(root, saved)
    expect(result).to.eql({ restored: [], created: ['text/new.txt'], missing: [] })
    expect(read('text/new.txt')).to.equal('新しい')
  })

  it('goes back, and going back is itself kept so it can be undone', function () {
    withHistory(root, 'apply', '反映', { keep: 10 }, () => {
      noteWrite(file('data/Map001.json'), 'data')
      noteWrite(file('text/map001_event001_page1.txt'), 'text')
      write('data/Map001.json', '{"v":2}')
      write('text/map001_event001_page1.txt', 'さようなら')
    })
    const [applied] = listEntries(root)
    withHistory(root, 'restore', '戻す: 反映', { keep: 10 }, () => restoreEntry(root, applied))
    expect(read('data/Map001.json')).to.equal('{"v":1}')
    expect(read('text/map001_event001_page1.txt')).to.equal('こんにちは')
    const [undo] = listEntries(root)
    expect(undo.label).to.equal('戻す: 反映')
    restoreEntry(root, undo)
    expect(read('data/Map001.json')).to.equal('{"v":2}')
    expect(read('text/map001_event001_page1.txt')).to.equal('さようなら')
  })

  it('goes back for one file only', function () {
    withHistory(root, 'apply', 'a', { keep: 10 }, () => {
      noteWrite(file('data/Map001.json'), 'data')
      noteWrite(file('text/map001_event001_page1.txt'), 'text')
      write('data/Map001.json', '{"v":2}')
      write('text/map001_event001_page1.txt', 'x')
    })
    restoreEntry(root, listEntries(root)[0], ['text/map001_event001_page1.txt'])
    expect(read('text/map001_event001_page1.txt')).to.equal('こんにちは')
    expect(read('data/Map001.json')).to.equal('{"v":2}')
  })

  it('removes the oldest operations beyond the number to keep', function () {
    for (let n = 2; n <= 5; n++) {
      withHistory(root, 'apply', '反映 ' + n, { keep: 3 }, () => {
        noteWrite(file('data/Map001.json'), 'data')
        write('data/Map001.json', '{"v":' + n + '}')
      })
    }
    expect(listEntries(root).map((e) => e.label)).to.eql(['反映 5', '反映 4', '反映 3'])
  })

  it('removes old operations when the copies get too big, but always keeps the newest', function () {
    for (let n = 2; n <= 4; n++) {
      withHistory(root, 'apply', '反映 ' + n, { keep: 10, maxBytes: 20 }, () => {
        noteWrite(file('data/Map001.json'), 'data')
        write('data/Map001.json', '{"v":' + n + ',"pad":"' + 'x'.repeat(10) + '"}')
      })
    }
    // 控えは1つ目が7バイト、2つ目からは約26バイト。20バイトを超えるので、いちばん新しいものだけが残る。
    expect(listEntries(root).map((e) => e.label)).to.eql(['反映 4'])
    expect(listEntries(root)[0].bytes).to.be.greaterThan(20)
  })

  it('does not record when the number to keep is 0', function () {
    withHistory(root, 'apply', 'a', { keep: 0 }, () => {
      noteWrite(file('data/Map001.json'), 'data')
      write('data/Map001.json', '{"v":2}')
    })
    expect(fs.existsSync(path.join(root, HISTORY_DIR))).to.equal(false)
  })

  it('merges saves of the same text within five minutes, keeping the very first contents', function () {
    let now = 1000000
    const save = (text) => withHistory(root, 'applyOnSave', '保存時の反映', { keep: 10, mergeKey: 'save:x', now: () => now }, () => {
      noteWrite(file('data/Map001.json'), 'data')
      write('data/Map001.json', text)
    })
    save('{"v":2}')
    now += 60 * 1000
    save('{"v":3}')
    now += 4 * 60 * 1000
    save('{"v":4}')
    expect(listEntries(root).length).to.equal(1)
    const [merged] = listEntries(root)
    expect(fs.readFileSync(snapshotFile(root, merged.id, 'data/Map001.json'), 'utf8')).to.equal('{"v":1}')
    now += 5 * 60 * 1000 + 1
    save('{"v":5}')
    expect(listEntries(root).length).to.equal(2)
  })

  it('finishes the operation after an async task', async function () {
    await withHistory(root, 'apply', 'async', { keep: 10 }, async () => {
      noteWrite(file('data/Map001.json'), 'data')
      await new Promise((r) => setTimeout(r, 5))
      write('data/Map001.json', '{"v":9}')
    })
    expect(listEntries(root).map((e) => e.label)).to.eql(['async'])
  })

  it('knows a copy inside the history folder', function () {
    expect(isHistoryCopy(path.join(root, HISTORY_DIR, 'x', 'files', 'text', 'a.txt'))).to.equal(true)
    expect(isHistoryCopy(file('text/a.txt'))).to.equal(false)
  })

  it('ignores files outside the game folder', function () {
    const outside = path.join(os.tmpdir(), 't2f-outside-' + process.pid + '.txt')
    fs.writeFileSync(outside, 'x')
    const recorder = new HistoryRecorder(root, 'apply', 'a', { keep: 10 })
    recorder.noteBeforeWrite(outside, 'text')
    fs.writeFileSync(outside, 'y')
    expect(recorder.finish()).to.equal(undefined)
    fs.rmSync(outside, { force: true })
  })
})
