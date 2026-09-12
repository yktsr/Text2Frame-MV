const { expect } = require('chai')
const path = require('path')
const { findColors, commandColor, toneSwatch, flashSwatch, cssColor } = require('../out/db/colors')

// 突き合わせの相手。リポジトリ直下のコンパイラそのもの。
const T2F = require(path.resolve(__dirname, '..', '..', 'Text2Frame.js'))

const compiledColors = function (line) {
  return T2F.compile(line).map(commandColor).filter(Boolean).map(function (c) { return [c.kind, c.values] })
}
const textColors = function (line) {
  return findColors(line).map(function (c) { return [c.kind, c.values] })
}

/* 見本の色をテキストから読む方法が、コンパイラの読み方とずれていないことを確かめる。 */
describe('findColors agrees with the compiler', function () {
  const cases = [
    '<TintScreen: Duration[1][Wait for Completion], ColorTone[-255][-255][-255][255]>',
    '<TintScreen: Duration[60][], ColorTone[68][-34][-34][0]>',
    '<TintScreen: ColorTone[Sepia], Duration[60][Wait for Completion]>',
    '<TintScreen: Duration[60][], ColorTone[Normal]>',
    '<画面の色調変更: 時間[60][], 色調[夜]>',
    '<TintScreen: CT[Dark]>',
    '<TintScreen: ColorTone[10][x][300]>', // 数でない値は 0、範囲外もそのまま
    '<TintPicture: 3, Duration[60][], ColorTone[-68][-68][0][68]>',
    '<ピクチャの色調変更: 1, 色調[セピア]>',
    '<TP: 2, ColorTone[Sunset], Duration[30][]>',
    '<FlashScreen: 255, 255, 255, 170, 60, Wait for Completion>',
    '<画面のフラッシュ: 255, 0, 0, 68, 30, OFF>',
    '<ChangeWindowColor: -255, 0, 68>',
    '<ウィンドウカラーの変更: 17, 34, 51>'
  ]
  cases.forEach(function (line) {
    it(line, function () {
      const fromText = textColors(line)
      expect(fromText, 'テキスト側で色を拾えていない').to.have.lengthOf(1)
      expect(fromText).to.eql(compiledColors(line))
    })
  })

  it('shows nothing when no colour is written', function () {
    expect(findColors('<TintScreen: Duration[60][]>')).to.eql([])
    expect(findColors('<TintPicture: 1, Duration[60][]>')).to.eql([])
    expect(findColors('<ShowPicture: 1, pic, Position[Upper Left][0][0]>')).to.eql([])
  })
})

describe('findColors positions', function () {
  const at = function (line, c) { return line.slice(c.start, c.end) }

  it('points at the colour option or the colour arguments', function () {
    const t = '    <TintScreen: Duration[1][Wait for Completion], ColorTone[-255][-255][-255][255]>'
    expect(at(t, findColors(t)[0])).to.equal('ColorTone[-255][-255][-255][255]')
    const f = '<FlashScreen: 255, 255, 255, 170, 60, Wait for Completion>'
    expect(at(f, findColors(f)[0])).to.equal('255, 255, 255, 170')
    const w = '<ChangeWindowColor: -255, 0, 68>'
    expect(at(w, findColors(w)[0])).to.equal('-255, 0, 68')
  })
})

describe('swatches', function () {
  it('puts a tone on mid grey', function () {
    expect(toneSwatch([-255, -255, -255, 255])).to.eql({ r: 0, g: 0, b: 0, a: 1 })
    expect(toneSwatch([0, 0, 0, 0])).to.eql({ r: 128, g: 128, b: 128, a: 1 })
    expect(toneSwatch([68, -34, -34, 0])).to.eql({ r: 196, g: 94, b: 94, a: 1 })
    expect(toneSwatch([255, 255, 255, 0])).to.eql({ r: 255, g: 255, b: 255, a: 1 })
  })

  it('uses the flash intensity as opacity', function () {
    expect(flashSwatch([255, 0, 0, 255])).to.eql({ r: 255, g: 0, b: 0, a: 1 })
    expect(cssColor(flashSwatch([255, 255, 255, 170]))).to.equal('rgba(255, 255, 255, 0.667)')
  })
})
