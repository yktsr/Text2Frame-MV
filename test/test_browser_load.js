const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const cp = require('child_process')

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

  const run = function (s, file) {
    const code = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8')
    vm.runInContext(code, s.context, { filename: file })
    return s
  }

  const load = function (file, options) {
    return run(makeSandbox(options), file)
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
        const mine = s.registered.filter(function (n) { return n.indexOf(c.plugin + ':') === 0 })
        expect(mine.length, mine.join(',')).to.be.greaterThan(0)
      })

      it('shares its API even without globalThis', function () {
        const s = load(c.file, { noGlobalThis: true })
        expect(s.sandbox.Game_Interpreter.prototype[c.command]).to.be.a('function')
      })
    })
  })

  /* ツクールはプラグインを全部「同じグローバル」に読み込む。トップレベルで const や
   * function を宣言すると、他のプラグインが同じ名前を使っていたら読み込みごと失敗する
   * (SyntaxError: Identifier ... has already been declared)。
   * ここでは実際のゲームと同じ形(同じ入れ物に2つとも読む)と、同じものを2回読む形
   * (別プラグインが同名を宣言したときの代わり)で確かめる。 */
  describe('sharing one global with other plugins', function () {
    it('loads both plugins into the same place', function () {
      const s = makeSandbox()
      run(s, 'Text2Frame.js')
      run(s, 'Frame2Text.js')
      expect(s.sandbox.Game_Interpreter.prototype.pluginCommandText2Frame).to.be.a('function')
      expect(s.sandbox.Game_Interpreter.prototype.pluginCommandFrame2Text).to.be.a('function')
    })

    it('leaves nothing but the shared API on the global object', function () {
      const s = makeSandbox()
      const before = new Set(Object.keys(s.sandbox))
      run(s, 'Text2Frame.js')
      run(s, 'Frame2Text.js')
      const added = Object.keys(s.sandbox).filter(function (k) { return !before.has(k) })
      // 置いてよいのは、互いを見つけるための共有 API 2つだけ。
      expect(added.sort()).to.eql(['$LaurusFrame2Text', '$LaurusText2Frame'])
    })

    cases.forEach(function (c) {
      it('survives another plugin declaring the same names as ' + c.file, function () {
        const s = makeSandbox()
        run(s, c.file)
        // 2回目で落ちるなら、トップレベルに宣言が残っている。
        expect(function () { run(s, c.file) }).to.not.throw()
      })
    })

    // 配られるのは dist/ のほう(開発用の区画を削ってある)。同じ検査を当てる。
    it('does the same for the built plugins, once they have been built', function () {
      const built = cases.map(function (c) { return path.join('dist', path.basename(c.file)) })
      if (!built.every(function (b) { return fs.existsSync(path.resolve(__dirname, '..', b)) })) return this.skip()
      const s = makeSandbox()
      const before = new Set(Object.keys(s.sandbox))
      built.forEach(function (b) { run(s, b) })
      const added = Object.keys(s.sandbox).filter(function (k) { return !before.has(k) })
      expect(added.sort()).to.eql(['$LaurusFrame2Text', '$LaurusText2Frame'])
      expect(function () { run(s, built[0]) }).to.not.throw()
    })
  })

  /* 公開(web)用に書き出したゲームでは、ファイルの読み書きができない。そのまま進むと
   * 「ファイルが見つかりません」のような見当違いの案内になるので、入口で止めて理由を出す。
   * (この入れ物の Utils.isOptionValid は false = テストプレイではない = 公開モード) */
  describe('a game that was deployed for the web', function () {
    const runCommand = function (file, command) {
      const s = load(file)
      const interpreter = new s.sandbox.Game_Interpreter()
      interpreter.pluginCommand(command, ['text', 'message.txt', '1', '1', '1'])
      return s
    }

    it('tells the player why Text2Frame does nothing', function () {
      const s = runCommand('Text2Frame.js', 'IMPORT_MESSAGE_TO_EVENT')
      expect(s.said.join('\n')).to.contain('Text2Frameは開発専用プラグイン')
    })

    it('tells the player why Frame2Text does nothing', function () {
      const s = runCommand('Frame2Text.js', 'EXPORT_EVENT_TO_MESSAGE')
      expect(s.said.join('\n')).to.contain('Frame2Textは開発専用プラグイン')
    })

    // MV の pluginCommand は全プラグイン共通の入口。他のプラグインのコマンドで案内を出さない。
    cases.forEach(function (c) {
      it('says nothing when the command belongs to another plugin (' + c.file + ')', function () {
        const s = runCommand(c.file, 'TorigoyaMZ_SomeOtherPlugin_DoSomething')
        expect(s.said).to.eql([])
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

  /* ツクールの外(CLI / ライブラリ)では、ツクールが用意するものをプラグインが自分で作る。
   * そこで作り直してしまうと、先に読み込んだもう一方のプラグインのコマンドが消える。
   * 読み込む順で結果が変わらないことを、別のプロセスで両方の順に試す。 */
  describe('loading both as libraries', function () {
    const repo = path.resolve(__dirname, '..')
    const check = (first, second) => {
      const script = `require(${JSON.stringify(path.join(repo, first))});` +
        `require(${JSON.stringify(path.join(repo, second))});` +
        'console.log(typeof Game_Interpreter.prototype.pluginCommandText2Frame, typeof Game_Interpreter.prototype.pluginCommandFrame2Text)'
      const r = cp.spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' })
      return { status: r.status, out: (r.stdout || '').trim(), err: r.stderr }
    }

    it('keeps both plugin commands whichever is loaded first', function () {
      const a = check('Text2Frame.js', 'Frame2Text.js')
      expect(a.status, a.err).to.equal(0)
      expect(a.out, 'Text2Frame を先に読んだとき').to.equal('function function')
      const b = check('Frame2Text.js', 'Text2Frame.js')
      expect(b.status, b.err).to.equal(0)
      expect(b.out, 'Frame2Text を先に読んだとき').to.equal('function function')
    })
  })

  it('shares the Text2Frame API for Frame2Text to find', function () {
    const s = load('Text2Frame.js')
    expect(s.sandbox.$LaurusText2Frame).to.be.an('object')
    expect(s.sandbox.$LaurusText2Frame.compile).to.be.a('function')
  })
})
