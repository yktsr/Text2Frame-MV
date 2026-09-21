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
