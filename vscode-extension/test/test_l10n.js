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
