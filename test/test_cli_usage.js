const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

// npm から入れた人が打つのは npx text2frame / npx frame2text。使い方の例もその形で出す。
describe('command line usage', function () {
  const bin = function (name) { return path.resolve(__dirname, '..', 'bin', name + '.js') }
  let tmp
  beforeEach(function () { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-usage-')) })
  afterEach(function () { fs.rmSync(tmp, { recursive: true, force: true }) })

  ;[['text2frame', 'Text2Frame.js'], ['frame2text', 'Frame2Text.js']].forEach(function (pair) {
    const name = pair[0]
    it(name + ' shows npx examples and writes nothing when run without arguments', function () {
      const r = cp.spawnSync('node', [bin(name)], { cwd: tmp, encoding: 'utf8' })

      expect(r.status, r.stderr).to.equal(0)
      expect(r.stdout).to.contain('Usage: ' + name)
      expect(r.stdout).to.contain('npx ' + name + ' --mode batch')
      expect(r.stdout).to.not.contain('node ' + pair[1])
      // --mode test は開発用。使い方には載せない。
      expect(r.stdout).to.not.contain('--mode test')
      expect(r.stdout).to.not.match(/\|test\|/)
      expect(fs.readdirSync(tmp)).to.eql([])
    })
  })
})
