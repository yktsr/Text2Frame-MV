const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const { findings, unexpected, checkSource, declaredBooleans, unwrap, FILES, ACCEPTED, HONOURED, ACCEPTED_DIVERGENCE, pluginKeys, honouredInCode, unsortedKeys } = require('../tools/check-params')

/* 宣言(@default)と、それを読むコードの食い違いを見張る。
 * この種類は実際に2回事故になった(英語タグの値だけが英語で出る件、Text2Frame だけ
 * DisplayWarning が厳しい述語で取り残されていた件)。食い違いそのものは成立しうるので、
 * 「そうしておくと決めたもの」は理由つきで tools/check-params.js の ACCEPTED に置き、
 * それ以外が出たらここで落ちる。 */
describe('plugin parameters', function () {
  it('have no unexplained gap between @default and the code (run `npm run check-params` to see them)', function () {
    expect(unexpected().map(function (f) {
      return f.file + (f.line ? ':' + f.line : '') + ' ' + f.param + ' — ' + f.detail
    })).to.eql([])
  })

  /* 解析が空振りしていたら、食い違いが0件でも検査が通ってしまう。拾えていることを見る。 */
  it('actually finds the boolean parameters', function () {
    FILES.forEach(function (file) {
      const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
      expect(declaredBooleans(source).length, file).to.be.greaterThan(2)
    })
  })

  /* 承知のうえの食い違いは、理由を空にして並べられないこと。 */
  it('gives a reason for every accepted gap', function () {
    Object.keys(ACCEPTED).forEach(function (file) {
      Object.keys(ACCEPTED[file]).forEach(function (param) {
        expect(ACCEPTED[file][param], file + ' / ' + param).to.have.length.greaterThan(10)
      })
    })
    findings().filter(function (f) { return f.accepted }).forEach(function (f) {
      expect(f.accepted, f.file + ' / ' + f.param).to.be.a('string')
    })
  })

  /* 番人が実際に鳴ることを見る。鳴らない番人は無いのと同じなので、合成した中身で確かめる。 */
  describe('fires on a real gap', function () {
    const sourceWith = function (predicate) {
      return [
        ' * @param Something',
        ' * @text なにか',
        ' * @default true',
        ' * @type boolean',
        ' *',
        '    Laurus.Fake.Something = ' + predicate
      ].join('\n')
    }

    it('flags @default true read with === \'true\'', function () {
      const found = checkSource('Fake.js', sourceWith("String(Laurus.Fake.Parameters.Something) === 'true'"))
      expect(found).to.have.lengthOf(1)
      expect(found[0].kind).to.equal('default-mismatch')
      expect(found[0].accepted).to.equal(null)
    })

    it('says nothing when the two agree', function () {
      expect(checkSource('Fake.js', sourceWith("String(Laurus.Fake.Parameters.Something) !== 'false'"))).to.eql([])
      expect(checkSource('Fake.js', sourceWith('toFlag(Laurus.Fake.Parameters.Something, true)'))).to.eql([])
    })

    it('flags a predicate it cannot read', function () {
      const found = checkSource('Fake.js', sourceWith('!!Laurus.Fake.Parameters.Something'))
      expect(found).to.have.lengthOf(1)
      expect(found[0].kind).to.equal('rule-unknown')
    })

    it('flags a parameter nothing reads', function () {
      const found = checkSource('Fake.js', [' * @param Lonely', ' * @default true', ' * @type boolean'].join('\n'))
      expect(found).to.have.lengthOf(1)
      expect(found[0].kind).to.equal('reader-missing')
    })
  })

  /* 式を括っている丸括弧だけを外すこと。末尾を無条件に剥がすと toFlag(x, true) が壊れる。 */
  /* ツクールの設定を読まないまま出荷時の既定で補っていた件(背景が透明からウィンドウに
   * 倒れた)は、鍵の数を比べても鳴らなかった。数は合っていて、**値の意味**が
   * 「検体」と「プロジェクトの設定」に分かれていたのが正体。だから意味で仕分ける。 */
  describe('sorting every parameter into a named box', function () {
    it('leaves no parameter unsorted', function () {
      const out = FILES.reduce(function (all, file) {
        const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
        return all.concat(unsortedKeys(file, source))
      }, [])

      expect(out.map(function (f) { return f.file + ' ' + f.param + ' — ' + f.detail })).to.eql([])
    })

    /* 仕分けの一覧が、読み口(PROJECT_FIELDS)と同じ鍵であること。
     * 一覧だけ直して読み口を直し忘れたら、設定を読んだつもりで読んでいない。 */
    it('honours exactly what the reader reads', function () {
      const source = fs.readFileSync(path.join(__dirname, '..', 'Text2Frame.js'), 'utf8')

      expect(honouredInCode(source).slice().sort()).to.eql(HONOURED['Text2Frame.js'].slice().sort())
    })

    it('gives a reason for every parameter left as a fixture value', function () {
      Object.keys(ACCEPTED_DIVERGENCE).forEach(function (file) {
        Object.keys(ACCEPTED_DIVERGENCE[file]).forEach(function (param) {
          expect(ACCEPTED_DIVERGENCE[file][param], file + ' ' + param).to.be.a('string').and.not.equal('')
        })
      })
    })

    /* 探し方が空振りしていたら、仕分け漏れが0件でも通ってしまう。 */
    it('actually finds the parameters the plugin branch reads', function () {
      FILES.forEach(function (file) {
        const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
        expect(pluginKeys(source).length, file).to.be.greaterThan(8)
      })
    })

    it('fires when a parameter is in neither box', function () {
      // プラグイン側の代入だけを別の名前にする(新しいパラメータを足した状態を模す)。
      const source = fs.readFileSync(path.join(__dirname, '..', 'Text2Frame.js'), 'utf8')
        .replace('Laurus.Text2Frame.IsDebug = (String(Laurus.Text2Frame.Parameters.IsDebug)',
          'Laurus.Text2Frame.BrandNewKnob = (String(Laurus.Text2Frame.Parameters.IsDebug)')

      const out = unsortedKeys('Text2Frame.js', source)

      expect(out.map(function (f) { return f.param })).to.include('BrandNewKnob')
    })
  })

  it('unwraps only the parentheses that wrap the whole expression', function () {
    expect(unwrap("(String(x) === 'true')")).to.equal("String(x) === 'true'")
    expect(unwrap('toFlag(x, true)')).to.equal('toFlag(x, true)')
    expect(unwrap('((a))')).to.equal('a')
    expect(unwrap('(a) && (b)')).to.equal('(a) && (b)')
  })
})
