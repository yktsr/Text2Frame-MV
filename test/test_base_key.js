const chai = require('chai')
const expect = chai.expect
const { bottom, msg, texts } = require('./helpers')
const fs = require('fs')
const os = require('os')
const path = require('path')

// PluginManager は定義しない(非プラグイン分岐)。
const text2frame = require('../Text2Frame.js')
const frame2text = require('../Frame2Text.js')

/* 祖先(.t2f-base)の場所は、テキストの名前ではなく front matter が指す宛先で決まる。
 * 名前を変えても別のフォルダへ移しても、反映と取り出しが同じ祖先を見る。 */
describe('ancestor key from the front matter', function () {
  let tmp
  let dataDir
  let mapPath
  let cwd

  const mapList = function () {
    return JSON.parse(fs.readFileSync(mapPath, 'utf8')).events[1].pages[0].list
  }
  const baseFiles = function () {
    const out = []
    const walk = function (dir, rel) {
      let entries = []
      try { entries = fs.readdirSync(dir) } catch (e) { return }
      entries.forEach(function (name) {
        const full = path.join(dir, name)
        if (fs.statSync(full).isDirectory()) walk(full, rel ? rel + '/' + name : name)
        else out.push(rel ? rel + '/' + name : name)
      })
    }
    walk(path.join(tmp, '.t2f-base'), '')
    return out.sort()
  }
  // ゲームから1件取り出して、テキストと祖先を作る。
  const pullOnce = function (textDir) {
    const target = frame2text.enumerateTargets(dataDir)[0]
    const outPath = path.join(textDir, target.key + '.txt')
    const r = frame2text.pullTargetToText({
      dataDir,
      target,
      outPath,
      baseDir: frame2text.baseDirForTextDir(tmp, textDir),
      englishTag: true,
      strategy: 'merge'
    })
    expect(r.ok, r.error).to.equal(true)
    return outPath
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-basekey-'))
    cwd = process.cwd()
    process.chdir(tmp)
    dataDir = path.join(tmp, 'data')
    fs.mkdirSync(dataDir)
    mapPath = path.join(dataDir, 'Map001.json')
    fs.writeFileSync(mapPath, JSON.stringify({
      events: [null, { id: 1, name: 'EV001', pages: [{ list: msg('ゲームの版').concat([bottom]) }] }]
    }))
    fs.writeFileSync(path.join(dataDir, 'CommonEvents.json'), JSON.stringify([null]))
  })

  afterEach(function () {
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('keeps the same ancestor when the text is renamed', function () {
    const textDir = path.join(tmp, 'text')
    fs.mkdirSync(textDir)
    const pulled = pullOnce(textDir)
    const renamed = path.join(textDir, 'オープニング.txt')
    fs.renameSync(pulled, renamed)
    fs.writeFileSync(renamed, fs.readFileSync(renamed, 'utf8').replace('ゲームの版', 'テキストの版'), 'utf8')

    const res = text2frame.applyTextFile({ textPath: renamed, mapPath, baseRoot: tmp, strategy: 'merge' })

    expect(res.ok, res.error).to.equal(true)
    // 祖先があるので 3-way になり、衝突も初回扱いの警告も出ない。
    expect(res.conflicts).to.equal(0)
    expect(res.warnings.join('\n')).to.not.contain('祖先が無いため')
    expect(texts(mapList())).to.eql(['テキストの版'])
    // 名前を変えても祖先は1つだけ(宛先の名前のまま)。
    expect(baseFiles()).to.eql(['text/map001_event001_page1.txt'])
  })

  it('keeps the same ancestor when the text moves into a subfolder', function () {
    const textDir = path.join(tmp, 'text')
    fs.mkdirSync(textDir)
    const pulled = pullOnce(textDir)
    const sub = path.join(textDir, '第1章')
    fs.mkdirSync(sub)
    const moved = path.join(sub, 'オープニング.txt')
    fs.renameSync(pulled, moved)

    const res = text2frame.applyTextFile({ textPath: moved, mapPath, baseRoot: tmp, strategy: 'merge' })

    expect(res.ok, res.error).to.equal(true)
    expect(res.warnings.join('\n')).to.not.contain('祖先が無いため')
    expect(baseFiles()).to.eql(['text/map001_event001_page1.txt'])
  })

  // 多言語運用: 同じ宛先でもテキストの置き場所が違えば祖先は別。
  it('keeps separate ancestors for separate text folders', function () {
    const ja = path.join(tmp, 'text')
    const en = path.join(tmp, 'text-en')
    fs.mkdirSync(ja)
    fs.mkdirSync(en)
    const jaText = pullOnce(ja)
    const enText = pullOnce(en)

    text2frame.applyTextFile({ textPath: jaText, mapPath, baseRoot: tmp, strategy: 'merge' })
    text2frame.applyTextFile({ textPath: enText, mapPath, baseRoot: tmp, strategy: 'merge' })

    expect(baseFiles()).to.eql(['text-en/map001_event001_page1.txt', 'text/map001_event001_page1.txt'])
  })

  it('names the ancestor after the target, not the file', function () {
    expect(text2frame.baseIdForTarget(path.join(tmp, 'text', 'なんでもよい.txt'), tmp,
      { kind: 'event', mapId: '2', eventId: '13', pageId: '3' }).key).to.equal('text/map002_event013_page3')
    expect(text2frame.baseIdForTarget(path.join(tmp, 'text', 'x.txt'), tmp,
      { kind: 'common', commonEventId: '7' }).key).to.equal('text/common007')
    // 宛先が分からないときは、これまでどおりパスから決める。
    expect(text2frame.baseIdForTarget(path.join(tmp, 'text', 'x.txt'), tmp, undefined).key).to.equal('text/x')
  })
})
