const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

// npm から入れた人が打つのは npx text2frame / npx frame2text。使い方の例もその形で出す。
describe('command line usage', function () {
  const bin = function (name) { return path.resolve(__dirname, '..', 'bin', name + '.js') }
  const SYNC_CLI = path.resolve(__dirname, '..', 't2f-sync.js')
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

  /* 3つのコマンドで同じ短縮形が別のものを指していると、打ち間違いが事故になる。
   * -t はテキストのフォルダ、-w は英語タグ、単発のテキストは -f にそろえる。 */
  describe('the same short flag means the same thing everywhere', function () {
    const help = function (name) {
      return cp.spawnSync('node', [bin(name), '--help'], { cwd: tmp, encoding: 'utf8' }).stdout
    }

    it('-t is the text folder in all three', function () {
      expect(help('text2frame')).to.contain('-t, --text-dir')
      expect(help('frame2text')).to.contain('-t, --text-dir')
      expect(cp.spawnSync('node', [SYNC_CLI, 'once', '--help'], { cwd: tmp, encoding: 'utf8' }).stdout)
        .to.contain('-t, --text-dir')
    })

    it('-w is the english tag, and text2frame does not use it for something else', function () {
      expect(help('frame2text')).to.contain('-w, --english_tag')
      expect(cp.spawnSync('node', [SYNC_CLI, 'once', '--help'], { cwd: tmp, encoding: 'utf8' }).stdout)
        .to.contain('-w, --english_tag')
      expect(help('text2frame')).to.not.contain('-w,')
    })

    it('text2frame reads a single text with -f', function () {
      fs.mkdirSync(path.join(tmp, 'data'))
      fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
        events: [null, { id: 1, pages: [{ list: [{ code: 0, indent: 0, parameters: [] }] }] }]
      }))
      const textPath = path.join(tmp, 'opening.txt')
      fs.writeFileSync(textPath, '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nこんにちは\n')

      const r = cp.spawnSync('node', [bin('text2frame'), '--mode', 'map', '-f', textPath], { cwd: tmp, encoding: 'utf8' })

      expect(r.status, r.stderr).to.equal(0)
      const list = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).events[1].pages[0].list
      expect(list.some(function (c) { return c.code === 401 && c.parameters[0] === 'こんにちは' })).to.equal(true)
    })

    it('frame2text works from outside the project with --root', function () {
      const project = path.join(tmp, 'game')
      fs.mkdirSync(path.join(project, 'data'), { recursive: true })
      fs.writeFileSync(path.join(project, 'data', 'Map001.json'), JSON.stringify({
        events: [null, { id: 1, pages: [{ list: [{ code: 401, indent: 0, parameters: ['やあ'] }, { code: 0, indent: 0, parameters: [] }] }] }]
      }))
      fs.writeFileSync(path.join(project, 'data', 'CommonEvents.json'), JSON.stringify([null]))

      const r = cp.spawnSync('node', [bin('frame2text'), '--mode', 'batch', '--root', project], { cwd: tmp, encoding: 'utf8' })

      expect(r.status, r.stderr).to.equal(0)
      expect(fs.existsSync(path.join(project, 'text'))).to.equal(true)
      expect(fs.existsSync(path.join(tmp, 'text'))).to.equal(false)
    })

    it('shows the strategy in the examples, not the old overwrite flag', function () {
      expect(help('text2frame')).to.not.contain('--overwrite true')
    })
  })
})
