const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const { setJapanese, isJapanese, tr, pick } = require('../out/db/lang')

const root = path.join(__dirname, '..')
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8') }
const JAPANESE = /[ぁ-んァ-ヶ一-龠]/

describe('lang', function () {
  afterEach(function () { setJapanese(true) })

  it('is Japanese until told otherwise', function () {
    expect(isJapanese()).to.equal(true)
    expect(tr('反映', 'Apply')).to.equal('反映')
    expect(pick(['反映', 'Apply'])).to.equal('反映')
  })

  it('switches to English', function () {
    setJapanese(false)
    expect(tr('反映', 'Apply')).to.equal('Apply')
    expect(pick(['反映', 'Apply'])).to.equal('Apply')
  })
})

describe('package.json strings', function () {
  const manifest = read('package.json')
  const en = JSON.parse(read('package.nls.json'))
  const ja = JSON.parse(read('package.nls.ja.json'))
  const used = new Set(Array.from(manifest.matchAll(/"%([^"%]+)%"/g), function (m) { return m[1] }))

  it('has every key in both languages, and no key left over', function () {
    expect(Object.keys(en).sort()).to.deep.equal(Array.from(used).sort())
    expect(Object.keys(ja).sort()).to.deep.equal(Array.from(used).sort())
  })

  it('writes each language alone, never both side by side', function () {
    for (const [key, value] of Object.entries(en)) expect(JAPANESE.test(value), key + ': ' + value).to.equal(false)
    for (const [key, value] of Object.entries(ja)) {
      expect(value, key).to.not.equal('')
      expect(/ \/ [A-Za-z]/.test(value.replace(/[\x20-\x7e]+ \/ [\x20-\x7e]+/g, '')), key + ': ' + value).to.equal(false)
    }
  })

  it('leaves no Japanese in the manifest itself', function () {
    const contributes = JSON.stringify(JSON.parse(manifest).contributes)
    expect(JAPANESE.test(contributes)).to.equal(false)
  })
})

describe('command names in the preview', function () {
  const { commandName } = require('../out/db/commandView')
  afterEach(function () { setJapanese(true) })

  it('has an English name for every command it names in Japanese', function () {
    for (let code = 0; code < 1000; code++) {
      setJapanese(true)
      const ja = commandName(code)
      setJapanese(false)
      const en = commandName(code)
      if (ja === undefined) { expect(en, String(code)).to.equal(undefined); continue }
      expect(en, String(code)).to.be.a('string').and.not.equal('')
      expect(JAPANESE.test(en), code + ': ' + en).to.equal(false)
    }
  })
})

describe('bundled snippets', function () {
  const ja = JSON.parse(read('snippets/defaults.json'))
  const en = JSON.parse(read('snippets/defaults.en.json'))

  it('has the same snippets, called by the same words, in both languages', function () {
    expect(Object.keys(en)).to.have.length(Object.keys(ja).length)
    const words = function (all) { return Object.values(all).map(function (s) { return s.prefix.slice().sort().join(' ') }) }
    expect(words(en)).to.deep.equal(words(ja))
  })

  it('writes the English snippets in English (the Japanese words to call them stay)', function () {
    for (const [name, s] of Object.entries(en)) {
      expect(JAPANESE.test(name + s.description + s.body.join('\n')), name).to.equal(false)
      expect(JAPANESE.test(s.prefix[0]), name + ' is listed by its English word').to.equal(false)
    }
  })
})

describe('Japanese without English', function () {
  const { scan, report } = require('../scripts/find-japanese')
  const texts = function (source) { return scan(source).map(function (f) { return f.text }) }

  it('finds a Japanese string with no English next to it', function () {
    expect(texts("show('反映しました')")).to.eql(['反映しました'])
    expect(texts('const a = `${n}件`')).to.eql(['件'])
  })

  it('accepts tr(), trList(), table(), [日本語, English] pairs, regular expressions and marked lines', function () {
    expect(texts("show(tr('反映しました', 'Applied'))")).to.eql([])
    expect(texts("tr(`${n}件`, `${n}`)")).to.eql([])
    expect(texts("trList(['上', '下'], ['Up', 'Down'])")).to.eql([])
    expect(texts("const T = table<number>({ 1: '下' }, { 1: 'Down' })")).to.eql([])
    expect(texts("const N = { 101: ['文章', 'Text'] }")).to.eql([])
    expect(texts('const R = /<(?:if|条件分岐)>/i')).to.eql([])
    expect(texts("const K = ['色調'] // lang: keep(書き方の別名)")).to.eql([])
    expect(texts("// 反映する\n/* 取り出す */ const a = 1")).to.eql([])
  })

  it('leaves none in the extension', function () {
    expect(report().map(function (f) { return f.file + ':' + f.line + ' ' + f.text })).to.eql([])
  })
})

describe('words put together in English', function () {
  const { pageDescription, commonDescription } = require('../out/db/mapTree')
  const { triggerLabel } = require('../out/db/eventPages')
  const { LiveState, liveLine } = require('../out/liveState')
  before(function () { setJapanese(false) })
  after(function () { setJapanese(true) })

  it('describes a page and a common event in the map list', function () {
    expect(pageDescription({ trigger: 3, switch1: 12, variable: [5, 3], selfSwitch: 'A' }, false))
      .to.equal('Autorun · S0012 is ON · V0005 ≥ 3 · Self switch A is ON')
    expect(pageDescription({ trigger: 0 }, true)).to.equal('empty · Action Button')
    expect(commonDescription(2, 7, false)).to.equal('Parallel · S0007 is ON')
    expect(triggerLabel(1)).to.equal('Player Touch')
  })

  it('writes test-play values in the hover', function () {
    const s = new LiveState()
    expect(liveLine(s, 'switch', 3, undefined, 0)).to.equal('Test playing: OFF')
  })
})
