const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { eachSlowly, mapSlowly } = require('../out/db/slowly')
const { tryApply, tryApplySlowly } = require('../out/dryRun')

describe('slowly', function () {
  // 1つ処理するたびに時計を 30 進める。50 ごとに手を離すので、2つごとに休む。
  const clock = () => { let t = 0; return { now: () => t, tick: () => { t += 30 } } }

  it('does everything, and lets go now and then with the progress', async function () {
    const c = clock()
    const seen = []
    const progress = []
    const done = await eachSlowly([1, 2, 3, 4, 5], (n) => { seen.push(n); c.tick() }, { now: c.now, onProgress: (d, t) => progress.push(d + '/' + t) })
    expect(done).to.equal(true)
    expect(seen).to.eql([1, 2, 3, 4, 5])
    expect(progress).to.eql(['2/5', '4/5', '5/5'])
  })

  it('stops when asked, at the next time it lets go', async function () {
    const c = clock()
    const seen = []
    const done = await eachSlowly([1, 2, 3, 4, 5], (n) => { seen.push(n); c.tick() }, { now: c.now, cancelled: () => seen.length >= 2 })
    expect(done).to.equal(false)
    expect(seen).to.eql([1, 2])
  })

  it('really gives the event loop a turn', async function () {
    let ran = false
    setTimeout(() => { ran = true }, 0)
    let t = 0
    await eachSlowly([1, 2], () => { t += 100 }, { now: () => t })
    expect(ran).to.equal(true)
  })

  it('makes a list, or nothing when stopped', async function () {
    expect(await mapSlowly([1, 2, 3], (n) => n * 2)).to.eql([2, 4, 6])
    let t = 0
    expect(await mapSlowly([1, 2, 3], (n) => { t += 100; return n }, { now: () => t, cancelled: () => true })).to.equal(undefined)
  })

  it('never writes to the real text while trying', function () {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-trial-text-'))
    try {
      const data = path.join(dir, 'Map001.json')
      const text = path.join(dir, 'page.txt')
      fs.writeFileSync(data, JSON.stringify({ events: [null, { pages: [{ list: [] }] }] }))
      fs.writeFileSync(text, 'もとのテキスト')
      // 衝突したときのように、テキストへ書き戻す偽の反映。
      const mod = {
        applyTextFile: (opts) => {
          fs.writeFileSync(opts.textPath, '目印つき')
          return { ok: true, warnings: [] }
        }
      }
      tryApply(mod, [{ applyOpts: { textPath: text }, dataPath: data, ref: { kind: 'event', mapId: '1', eventId: '1', pageId: '1' } }])
      expect(fs.readFileSync(text, 'utf8')).to.equal('もとのテキスト')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('tries the pages of one data file together, the same as all at once', async function () {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-slowly-'))
    try {
      const a = path.join(dir, 'MapA.json')
      const b = path.join(dir, 'MapB.json')
      fs.writeFileSync(a, JSON.stringify({ n: 0 }))
      fs.writeFileSync(b, JSON.stringify({ n: 0 }))
      // 写しに1ずつ足していく偽の反映。同じファイルのページは重ねて足される。
      const mod = {
        applyTextFile: (opts) => {
          const file = opts.mapPath
          const json = JSON.parse(fs.readFileSync(file, 'utf8'))
          json.n += 1
          json.events = [null, { pages: [{ list: [{ n: json.n }] }] }]
          fs.writeFileSync(file, JSON.stringify(json))
          return { ok: true, warnings: [] }
        }
      }
      const step = (dataPath) => ({ applyOpts: {}, dataPath, ref: { kind: 'event', mapId: '1', eventId: '1', pageId: '1' } })
      const steps = [step(a), step(b), step(a)]
      const once = tryApply(mod, steps).map((t) => t.after)
      let t = 0
      const slowly = await tryApplySlowly(mod, steps, { now: () => (t += 100) })
      expect(slowly.map((x) => x.after)).to.eql(once)
      expect(once).to.eql([[{ n: 2 }], [{ n: 1 }], [{ n: 2 }]])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
