const { expect } = require('chai')
const { messageMetrics, capacity, lineWidth, overflowAt, messageProblems, autoWrapPlugin } = require('../out/db/messageFit')

const MZ = messageMetrics({ uiAreaWidth: 816, fontSize: 26, faceSize: 144 })
const MV = messageMetrics({ faceSize: 144 })

describe('messageFit', function () {
  it('works out how many characters fit, with and without a face', function () {
    expect(Math.floor(capacity(MZ, false))).to.equal(30)
    expect(Math.floor(capacity(MZ, true))).to.equal(24)
    expect(Math.floor(capacity(MV, false))).to.equal(27)
    expect(Math.floor(capacity(MV, true))).to.equal(21)
    expect(capacity(MZ, false, 20)).to.equal(20)
    expect(Math.floor(capacity(MZ, true, 30))).to.equal(23)
  })

  it('counts full and half width, and escape codes as they look', function () {
    const lookups = { actorName: (id) => (id === 1 ? 'リード' : undefined), currencyUnit: 'G' }
    expect(lineWidth('あいう', MZ).width).to.equal(3)
    expect(lineWidth('abc', MZ).width).to.equal(1.5)
    expect(lineWidth('\\C[2]赤\\C[0]', MZ).width).to.equal(1)
    expect(lineWidth('\\N[1]さん', MZ, lookups)).to.eql({ width: 5, approximate: false })
    expect(lineWidth('\\V[3]個', MZ, lookups)).to.eql({ width: 2.5, approximate: true })
    expect(lineWidth('100\\G', MZ, lookups).width).to.equal(2)
    expect(lineWidth('\\I[5]', MZ).width).to.be.closeTo(36 / 26, 1e-9)
    expect(lineWidth('\\.\\|\\!', MZ).width).to.equal(0)
    expect(lineWidth('\\XYZ[3]あ', MZ)).to.eql({ width: 1, approximate: true })
  })

  it('finds where a line starts to overflow, without cutting an escape code', function () {
    expect(overflowAt('あいうえお', 3, MZ)).to.equal(3)
    expect(overflowAt('あいう', 3, MZ)).to.equal(-1)
    expect(overflowAt('あい\\C[2]うえ', 3, MZ)).to.equal(8)
  })

  it('reports lines that overflow the window, and messages longer than four lines', function () {
    const long = 'あ'.repeat(31)
    const faced = 'あ'.repeat(25)
    const lines = [
      long, // 0: 顔なしで31文字 → はみ出す
      '',
      '<Face: Actor1(0)>', // 2
      faced, // 3: 顔ありで25文字 → はみ出す
      '',
      '一', '二', '三', '四', '五', // 5-9: 5行目がページ送り
      '',
      '<comment>',
      long, // 注釈の中は数えない
      '</comment>'
    ]
    const problems = messageProblems(lines, MZ)
    expect(problems.map((p) => [p.line, p.kind, p.start])).to.eql([[0, 'width', 30], [3, 'width', 24], [9, 'lines', 0]])
    expect(problems[2].lines).to.equal(5)
    expect(messageProblems(lines, MZ, { checkWidth: false }).map((p) => p.kind)).to.eql(['lines'])
  })

  it('finds an enabled plugin that wraps lines by itself', function () {
    const js = 'var $plugins =\n[\n{"name":"YED_WordWrap","status":true,"description":"","parameters":{}},\n{"name":"Other","status":true}\n];\n'
    expect(autoWrapPlugin(js)).to.equal('YED_WordWrap')
    expect(autoWrapPlugin(js.replace('true,"description"', 'false,"description"'))).to.equal(undefined)
    expect(autoWrapPlugin('var $plugins = [{"name":"DarkPlasma_AutoLineBreak","status":true}];')).to.equal('DarkPlasma_AutoLineBreak')
    expect(autoWrapPlugin('broken')).to.equal(undefined)
  })
})
