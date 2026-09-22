const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

/* examples/ は、npm から入れた人が写して動かす形のまま置いている(パッケージ名で読み込む)。
 * 一時フォルダの node_modules にこのリポジトリを @yktsr/text2frame-mv として置いて走らせる。 */
describe('examples', function () {
  this.timeout(20000)
  const repo = path.resolve(__dirname, '..')
  // 公開している関数。example はこれをすべて使う。
  const api = [
    'compile', 'parseFrontMatter', 'resolveStrategy', 'getMessageDefaults', 'applyThreeWayMerge', 'commandsEqual',
    'restoreAuthoredLines', 'applyMergePull', 'applyTextFile', 'applyCommandsToData', 'deriveBaseId',
    'baseDirForTextDir', 'readBaseText', 'saveBaseText',
    'decompile', 'VERSION', 'renderFrontMatter', 'buildPullText', 'enumerateTargets', 'pullTargetToText', 'writeBackToGame'
  ]
  let tmp
  before(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-examples-'))
    fs.mkdirSync(path.join(tmp, 'node_modules', '@yktsr'), { recursive: true })
    fs.symlinkSync(repo, path.join(tmp, 'node_modules', '@yktsr', 'text2frame-mv'), 'junction')
  })
  after(function () { fs.rmSync(tmp, { recursive: true, force: true }) })

  it('the exports are the ones the examples cover', function () {
    const T2F = require('../Text2Frame.js')
    const F2T = require('../Frame2Text.js')
    const covered = Object.keys(T2F).concat(Object.keys(F2T)).filter(function (k, i, all) { return all.indexOf(k) === i })
    expect(covered.sort()).to.eql(api.slice().sort())
  })

  ;['commonjs.js', 'esmodules.mjs'].forEach(function (name) {
    it(name + ' runs and uses every exported function', function () {
      const file = path.join(tmp, name)
      fs.copyFileSync(path.join(repo, 'examples', name), file)
      const r = cp.spawnSync('node', [file], { cwd: tmp, encoding: 'utf8' })

      expect(r.status, r.stderr).to.equal(0)
      api.forEach(function (fn) {
        expect(r.stdout, fn).to.match(new RegExp('^## ' + fn + '\\b', 'm'))
      })
      // 取り出しが祖先を書いている(フォルダが無くても作る)
      expect(r.stdout).to.not.match(/## readBaseText\nnull/)
      const source = fs.readFileSync(file, 'utf8')
      api.forEach(function (fn) { expect(source, fn).to.contain('.' + fn) })
    })
  })
})
