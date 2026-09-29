const { expect } = require('chai')
const { setJapanese } = require('../out/db/lang')

/* 画面の HTML の中のスクリプトが、どちらの言語でも読めること(読めないと画面がまるごと動かない)。 */
const SCREENS = [
  ['liveViewHtml', 'liveViewHtml'],
  ['assetPickerHtml', 'assetPickerHtml'],
  ['previewHtml', 'previewHtml'],
  ['mapGraphHtml', 'mapGraphHtml'],
  ['usagesHtml', 'usagesHtml']
]
const JAPANESE = /[ぁ-んァ-ヶ一-龠]/

describe('webview screens', function () {
  afterEach(function () { setJapanese(true) })

  for (const [file, fn] of SCREENS) {
    it(file + ': the script parses, in Japanese and in English', function () {
      for (const ja of [true, false]) {
        setJapanese(ja)
        const page = require('../out/' + file)[fn]()
        const scripts = Array.from(page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g), function (m) { return m[1] })
        expect(scripts.length, file).to.be.greaterThan(0)
        for (const s of scripts) expect(function () { return new Function(s) }, file + (ja ? ' (ja)' : ' (en)')).to.not.throw() // eslint-disable-line no-new-func
      }
    })

    it(file + ': shows no Japanese of its own in English', function () {
      setJapanese(false)
      const page = require('../out/' + file)[fn]()
      const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1')
      expect(code.match(new RegExp(JAPANESE.source + '.{0,20}', 'g')), file).to.equal(null)
    })
  }
})
