const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

/* 旗で言われたものが、そのゲームの設定より強いこと。言われていなければゲームに従うこと。
 *
 *   旗  >  ゲームの js/plugins.js  >  出荷時の既定
 *
 * 単体の検査は test/test_project_parameters.js が見ている。ここで見るのは**配線** ──
 * CLI は旗を4つの経路(map / common / batch / csv)へ渡す必要があり、1つ落としても
 * ほかが通るので気づけない。 */
describe('the command line and the game\'s own settings', function () {
  const bin = function (name) { return path.resolve(__dirname, '..', 'bin', name + '.js') }
  let root

  /* 透明(2) / 上(0) / % のゲーム。出荷時の既定はウィンドウ(0) / 下(2)。 */
  const GAME = { background: 2, position: 0 }
  const SHIPPED = { background: 0, position: 2 }

  const plugins = function (t2f, f2t) {
    const list = [{ name: 'Community_Basic', status: true, description: '', parameters: { cacheLimit: '10' } }]
    if (t2f) list.push({ name: 'Text2Frame', status: true, description: '', parameters: t2f })
    if (f2t) list.push({ name: 'Frame2Text', status: true, description: '', parameters: f2t })
    return 'var $plugins =\n' + JSON.stringify(list, null, 1) + ';\n'
  }

  beforeEach(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-cli-params-'))
    fs.mkdirSync(path.join(root, 'data'))
    fs.mkdirSync(path.join(root, 'js', 'plugins'), { recursive: true })
    fs.writeFileSync(path.join(root, 'js', 'plugins.js'), plugins({
      'Default Window Position': '上',
      'Default Background': '透明',
      'Comment Out Char': '%'
    }, { EnglishTag: 'false' }))
    // 項目だけでは効かない。ツクールが読む所にプラグインが実在することも要る。
    fs.writeFileSync(path.join(root, 'js', 'plugins', 'Text2Frame.js'), '// Text2Frame\n')
    fs.writeFileSync(path.join(root, 'js', 'plugins', 'Frame2Text.js'), '// Frame2Text\n')
    fs.writeFileSync(path.join(root, 'data', 'Map001.json'), JSON.stringify({
      events: [
        null,
        {
          id: 1,
          name: 'EV001',
          pages: [{
            conditions: {},
            list: [
              { code: 101, indent: 0, parameters: ['', 0, GAME.background, GAME.position, ''] },
              { code: 401, indent: 0, parameters: ['こんにちは'] },
              { code: 0, indent: 0, parameters: [] }
            ]
          }]
        }
      ]
    }))
    fs.writeFileSync(path.join(root, 'data', 'CommonEvents.json'), JSON.stringify([null]))
  })
  afterEach(function () { fs.rmSync(root, { recursive: true, force: true }) })

  const run = function (name, args) {
    const r = cp.spawnSync('node', [bin(name)].concat(args), { cwd: root, encoding: 'utf8' })
    expect(r.status, r.stderr).to.equal(0)
    return r
  }
  const pulledText = function () {
    const dir = path.join(root, 'text')
    const file = fs.readdirSync(dir).filter(function (n) { return /\.txt$/.test(n) })[0]
    return fs.readFileSync(path.join(dir, file), 'utf8')
  }
  const headOfGame = function () {
    const list = JSON.parse(fs.readFileSync(path.join(root, 'data', 'Map001.json'), 'utf8'))
      .events[1].pages[0].list
    return list.filter(function (c) { return c.code === 101 })[0].parameters
  }
  /** タグを1つも書かないテキストを置く。補う値だけで背景と位置が決まる。 */
  const writeTagless = function () {
    const dir = path.join(root, 'text')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'opening.txt'),
      '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nおはよう\n')
  }

  describe('pulling', function () {
    it('omits the tags the game itself would fill back in', function () {
      run('frame2text', ['--mode', 'batch', '--scope', 'all'])

      expect(pulledText()).to.not.contain('背景')
    })

    it('writes them once the caller assumes something else', function () {
      run('frame2text', ['--mode', 'batch', '--scope', 'all', '--background', 'ウインドウ'])

      expect(pulledText()).to.contain('背景')
    })

    it('takes the tag language from the game when -w is not given', function () {
      run('frame2text', ['--mode', 'batch', '--scope', 'all', '--background', 'ウインドウ'])

      // ゲームは EnglishTag: false なので日本語のタグ。
      expect(pulledText()).to.contain('背景')
      expect(pulledText()).to.not.contain('Background')
    })

    it('still lets -w say otherwise', function () {
      run('frame2text', ['--mode', 'batch', '--scope', 'all', '--background', 'ウインドウ', '-w', 'true'])

      expect(pulledText()).to.contain('Background')
    })
  })

  describe('applying', function () {
    it('fills in what the game itself would fill in', function () {
      writeTagless()

      run('text2frame', ['--mode', 'batch'])

      expect(headOfGame()[2], '背景').to.equal(GAME.background)
      expect(headOfGame()[3], '位置').to.equal(GAME.position)
    })

    it('fills in what the caller says instead', function () {
      writeTagless()

      run('text2frame', ['--mode', 'batch', '--background', 'ウインドウ', '--window-position', '下'])

      expect(headOfGame()[2], '背景').to.equal(SHIPPED.background)
      expect(headOfGame()[3], '位置').to.equal(SHIPPED.position)
    })

    /* コメント文字を言い直すと、落とす行が変わる。黙って本文になるのがいちばん困る。 */
    it('takes the comment character from the caller', function () {
      const dir = path.join(root, 'text')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'opening.txt'),
        '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\n%パーセントの行\n#シャープの行\n')

      run('text2frame', ['--mode', 'batch', '--comment-out-char', '#'])

      const said = JSON.parse(fs.readFileSync(path.join(root, 'data', 'Map001.json'), 'utf8'))
        .events[1].pages[0].list
        .filter(function (c) { return c.code === 401 })
        .map(function (c) { return c.parameters[0] })
      expect(said).to.eql(['%パーセントの行'])
    })

    it('refuses a value it cannot read instead of using another one', function () {
      writeTagless()

      const r = cp.spawnSync('node', [bin('text2frame'), '--mode', 'batch', '--background', 'ウィンドウ'],
        { cwd: root, encoding: 'utf8' })

      expect(r.status).to.not.equal(0)
      expect(r.stderr).to.contain('background')
    })
  })

  /* 何を補うかは3つの出どころから決まるので、どこから来たかを言えること。
   * stdout は機械の通路(JSON)なので、報告は stderr へ出す。 */
  describe('saying where the values came from', function () {
    it('says it with -v, on both commands', function () {
      const pull = run('frame2text', ['--mode', 'batch', '--scope', 'all', '-v'])
      writeTagless()
      const push = run('text2frame', ['--mode', 'batch', '-v'])

      expect(pull.stderr).to.contain('Text2Frame: background=透明(ゲーム)')
      expect(pull.stderr).to.contain('Frame2Text: englishTag=false(ゲーム)')
      expect(push.stderr).to.contain('background=透明(ゲーム)')
      /* 報告を stdout に出すと機械が読めなくなる。-v はもともとデバッグのログを
       * stdout に出すので、見るのは -v を付けないときの出力。 */
      const plain = run('text2frame', ['--mode', 'batch'])
      expect(function () { JSON.parse(plain.stdout) }).to.not.throw()
      expect(plain.stdout).to.not.contain('[params]')
    })

    it('says when the settings are there but the plugin is not, even without -v', function () {
      writeTagless()
      fs.rmSync(path.join(root, 'js', 'plugins', 'Text2Frame.js'))

      const r = run('text2frame', ['--mode', 'batch'])

      expect(r.stderr).to.contain('js/plugins/Text2Frame.js')
    })

    it('says when a flag disagrees with the game, even without -v', function () {
      const r = run('frame2text', ['--mode', 'batch', '--scope', 'all', '--background', 'ウインドウ'])

      expect(r.stderr).to.contain('取り出しと反映')
    })
  })

  /* CSV の経路にも同じ旗が届くこと(メモの列はコメント文字で往復する)。 */
  describe('the csv route', function () {
    it('takes the comment character from the caller on the way out', function () {
      run('frame2text', ['--mode', 'batch', '--scope', 'all'])
      const dir = path.join(root, 'text')
      const file = path.join(dir, fs.readdirSync(dir).filter(function (n) { return /\.txt$/.test(n) })[0])
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8') + '\n#これはメモ\n')

      run('frame2text', ['--mode', 'csv', '--scope', 'all', '--comment-out-char', '#'])

      const csvText = fs.readFileSync(path.join(root, 'scenario.csv'), 'utf8')
      expect(csvText).to.contain('これはメモ')
    })
  })
})
