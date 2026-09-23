const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

/* 公開(web)用に書き出したゲームでは、require も process も module も無い。
 * 読み込んだだけで例外が出ると、プラグインは丸ごと動かなくなる。
 * ここでは Node の外側を一切見せない入れ物で、実際に読み込んで確かめる。 */
describe('loading the plugins the way a deployed game does', function () {
  const parameters = {
    'Default Window Position': 'Bottom',
    'Default Background': 'Window',
    'Comment Out Char': '%',
    IsOverwrite: 'false',
    'Default Scenario Folder': 'text',
    'Default Scenario File': 'message.txt',
    'Default Common Event ID': '1',
    'Default MapID': '1',
    'Default EventID': '1',
    'Default PageID': '1',
    IsDebug: 'false',
    DisplayMsg: 'true',
    DisplayWarning: 'true',
    EnglishTag: 'true'
  }

  // ツクールが用意するものだけを置いた入れ物。require / process / module / __dirname は置かない。
  const makeSandbox = function (options) {
    const o = options || {}
    const registered = []
    const said = []
    const sandbox = {
      console: { log: function () {}, warn: function () {}, error: function () {} },
      $gameMessage: { add: function (t) { said.push(String(t)) } },
      Utils: { isOptionValid: function () { return false }, RPGMAKER_NAME: o.mz ? 'MZ' : 'MV' },
      PluginManager: { parameters: function () { return parameters } },
      Game_Interpreter: function () {}
    }
    if (o.mz) {
      sandbox.PluginManager.registerCommand = function (plugin, name) { registered.push(plugin + ':' + name) }
    } else {
      sandbox.Game_Interpreter.prototype.pluginCommand = function () {}
    }
    sandbox.window = sandbox
    const context = vm.createContext(sandbox)
    if (o.noGlobalThis) {
      // 古い NW.js(Chromium<71)には globalThis が無い。window に落ちること。
      vm.runInContext('Object.defineProperty(this, "globalThis", { value: undefined })', context)
    }
    return { sandbox, context, registered, said }
  }

  const load = function (file, options) {
    const s = makeSandbox(options)
    const code = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8')
    vm.runInContext(code, s.context, { filename: file })
    return s
  }

  const cases = [
    { file: 'Text2Frame.js', command: 'pluginCommandText2Frame', plugin: 'Text2Frame' },
    { file: 'Frame2Text.js', command: 'pluginCommandFrame2Text', plugin: 'Frame2Text' }
  ]

  cases.forEach(function (c) {
    describe(c.file, function () {
      it('loads in MV without touching Node', function () {
        const s = load(c.file)
        expect(s.sandbox.Game_Interpreter.prototype[c.command]).to.be.a('function')
      })

      it('loads in MZ and registers its plugin commands', function () {
        const s = load(c.file, { mz: true })
        expect(s.registered.filter(function (n) { return n.indexOf(c.plugin + ':') === 0 })).to.not.be.empty
      })

      it('shares its API even without globalThis', function () {
        const s = load(c.file, { noGlobalThis: true })
        expect(s.sandbox.Game_Interpreter.prototype[c.command]).to.be.a('function')
      })
    })
  })

  /* 公開されるのは rollup が開発用の区画を削った dist/ のほう。削った結果も読めることを見る。
   * まだ作っていなければ飛ばす(npm run build:dist で作る)。 */
  cases.forEach(function (c) {
    it('loads the built ' + c.file + ' too, once it has been built', function () {
      const built = path.join('dist', path.basename(c.file))
      if (!fs.existsSync(path.resolve(__dirname, '..', built))) return this.skip()
      const s = load(built)
      expect(s.sandbox.Game_Interpreter.prototype[c.command]).to.be.a('function')
    })
  })

  it('shares the Text2Frame API for Frame2Text to find', function () {
    const s = load('Text2Frame.js')
    expect(s.sandbox.$LaurusText2Frame).to.be.an('object')
    expect(s.sandbox.$LaurusText2Frame.compile).to.be.a('function')
  })
})
