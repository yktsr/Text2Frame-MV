const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')
const os = require('os')

require('../Text2Frame.js')

/* 反映を本物のファイルで通す。以前は readFileSync を「何番目の呼び出しか」で
 * 振り分けていたが、経路に読み込みが1つ増えるだけで以降の全件がずれ、添字が
 * スイート全体で累積するので1件だけ流すこともできなかった。何より、どのファイルを
 * 読み書きしたかを一切見ていなかった(行き先を取り違えても通ってしまう)。 */
describe('Text2Frame Test', function () {
  const tests = require('./test_cases.js')
  const ROOT = path.resolve(__dirname, '..')
  let tmp
  let cwd
  let mainModule

  before(function () {
    sinon.stub(console, 'log')
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-json-eq-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.mkdirSync(path.join(tmp, 'text'))
    // 反映元・反映先はここから組み立てられる(getDirParams が mainModule を見る)。
    mainModule = process.mainModule
    process.mainModule = { filename: path.join(tmp, 'game.js') }
    // 祖先(.t2f-base)の置き場所は cwd 基準。リポジトリを汚さないよう移しておく。
    cwd = process.cwd()
    process.chdir(tmp)
  })

  after(function () {
    sinon.restore()
    process.chdir(cwd)
    process.mainModule = mainModule
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  const textPath = function () { return path.join(tmp, 'text', 'message.txt') }
  const mapPath = function () { return path.join(tmp, 'data', 'Map001.json') }

  tests.forEach(function (test) {
    it(test.title, function () {
      // フィクスチャはリポジトリ側。cwd を移してあるので絶対パスで読む。
      fs.writeFileSync(textPath(), fs.readFileSync(path.resolve(ROOT, test.infile), 'utf8'), 'utf8')
      fs.writeFileSync(mapPath(), fs.readFileSync(path.resolve(ROOT, test.mapfile), 'utf8'), 'utf8')

      Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT',
        ['text', 'message.txt', '1', '1', '1', 'true'])

      const expected = JSON.parse(fs.readFileSync(path.resolve(ROOT, test.expfile), 'utf8'))
      expect(JSON.parse(fs.readFileSync(mapPath(), 'utf8'))).to.eql(expected)
    })
  })
})
