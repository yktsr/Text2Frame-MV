const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const T2F = require('../Text2Frame.js')
const csv = T2F._csv

/* 選択肢の行だけは、ほかの行と性質が違う ── セルの中身が**タグ＝構造**で、しかも
 * 分岐の中身(シートに出していない 自動 の行)はテキストに残る。だから <When> の行だけ
 * 消すと、中身が分岐の外に出て、選択肢ウィンドウを出した直後に走る。compile は通るので
 * 往復検査も検査も気づかない ── **だから断る所を検査で固める。** */
describe('the choice rows of a sheet', function () {
  const KEY = 'map001_event001_page1'
  const TEXT = [
    '質問です', //                           r001  セリフ
    '<ShowChoices: Window, Right, 1, 2>', // r002  自動(枠。取り消し先は2番目)
    '<When: はい>', //                       r003  選択肢
    '<Switch: 1, ON>', //                    r004  自動(はい枝の中身)
    'はいと答えた', //                        r005  セリフ
    '<When: いいえ>', //                     r006  選択肢
    'いいえと答えた', //                      r007  セリフ
    '<End>' //                              r008  自動
  ].join('\n')

  const fold = function (opts) { return csv.foldToRows(TEXT, KEY, opts) }
  // シートを一度通す(文字列になって戻ってくることまで含めて測る)。
  const through = function (rows) { return csv.parseCsv(csv.formatCsv(rows)).rows }
  const apply = function (rows, opts) {
    return csv.mergeRows(TEXT, through(rows), Object.assign({ key: KEY }, opts || {}))
  }
  const without = function (rows, id) {
    return rows.filter(function (r) { return r.ID !== id })
  }
  const detail = function (r) {
    return r.problems.map(function (p) { return p.detail }).join('\n')
  }

  it('shows both branches of a choice, and hides the frame and the branch bodies', function () {
    expect(fold({ rows: 'dialogue' }).map(function (r) { return [r.種別, r.ID] })).to.eql([
      ['セリフ', 'r001'], ['選択肢', 'r003'], ['セリフ', 'r005'],
      ['選択肢', 'r006'], ['セリフ', 'r007']
    ])
  })

  describe('a choice row the sheet no longer has', function () {
    it('is refused even when deleting was asked for', function () {
      const r = apply(without(fold({ rows: 'dialogue' }), 'r006'), { allowDelete: true })
      expect(r.ok).to.equal(false)
      // 断ったら、途中まで当てた形を作らない。
      expect(r.text).to.equal(TEXT)
    })

    it('names the row, quotes the line, and says what would happen', function () {
      const r = apply(without(fold({ rows: 'dialogue' }), 'r003'), { allowDelete: true })
      expect(detail(r)).to.contain('r003')
      expect(detail(r)).to.contain('<When: はい>')
      expect(detail(r)).to.contain('分岐の外に出ます')
      // 代わりにどうすればいいかを言う。
      expect(detail(r)).to.contain('<ShowChoices> の行')
    })

    it('is refused from the full sheet too, not just the narrowed one', function () {
      const r = apply(without(fold(), 'r003'), { allowDelete: true })
      expect(r.ok).to.equal(false)
      expect(r.text).to.equal(TEXT)
    })

    it('still lets a plain dialogue row be deleted', function () {
      const r = apply(without(fold({ rows: 'dialogue' }), 'r007'), { allowDelete: true })
      expect(r.ok).to.equal(true)
      // いいえ枝の中身だけが消える(枠はそのまま)。
      const lines = TEXT.split('\n')
      expect(r.text).to.equal(lines.slice(0, 6).concat(lines.slice(7)).join('\n'))
    })

    it('does nothing when deleting was not asked for', function () {
      // 消すのは頼まれたときだけ。断るのもそのときだけ(そこまでは「残す」で足りる)。
      const r = apply(without(fold({ rows: 'dialogue' }), 'r003'))
      expect(r.ok).to.equal(true)
      expect(r.text).to.equal(TEXT)
      expect(r.missing.filter(function (m) { return m.消せない })
        .map(function (m) { return m.ID })).to.eql(['r003'])
    })
  })

  /* シートを書く人は「はい」「いいえ」という**文字**を直しに来る。タグの中を触らせるのは
   * この表の目的に反するので、文言だけ書かれたら元の綴りで付け直す ── ただし
   * 「タグを書こうとして失敗した形」は通さない(選択肢の文言が <When: …> になってしまう)。 */
  describe('a choice row someone rewrote', function () {
    const sheet = function (id, body, look) {
      return fold({ rows: 'dialogue' }).map(function (r) {
        if (r.ID !== id) return r
        return Object.assign({}, r, look === undefined ? { 本文: body } : { 本文: body, 見た目: look })
      })
    }
    const labels = function (text) {
      return T2F.compile(text).filter(function (c) { return c.code === 102 })[0].parameters[0]
    }
    // 選択肢の文言だけを隠した形。ここが一致すれば、ほかは1つも動いていない。
    const skeleton = function (text) {
      return T2F.compile(text).map(function (c) {
        return c.indent + ':' + c.code + ':' + (c.code === 102 ? JSON.stringify(c.parameters.slice(1)) : '')
      }).join(' ')
    }

    it('puts the tag back, keeping the spelling of the line it came from', function () {
      const r = apply(sheet('r006', 'やめる'))
      expect(r.ok).to.equal(true)
      expect(r.text.split('\n')[5]).to.equal('<When: やめる>')
    })

    it('changes that one choice and nothing else', function () {
      const r = apply(sheet('r006', 'やめる'))
      expect(labels(r.text)).to.eql(['はい', 'やめる'])
      // 枝の字下げも、窓の取り消し先も動かない。
      expect(skeleton(r.text)).to.equal(skeleton(TEXT))
    })

    it('tells the writer on their own row that the tag was put back', function () {
      const r = apply(sheet('r006', 'やめる'))
      const said = r.verdicts.filter(function (v) { return v.エラー })
      expect(said).to.have.lengthOf(1)
      expect(said[0].判定).to.equal('直した')
      expect(said[0].エラー).to.contain('<When: やめる>')
    })

    it('leaves a row alone that was edited inside the tag', function () {
      const r = apply(sheet('r006', '<When: やめる>'))
      expect(labels(r.text)).to.eql(['はい', 'やめる'])
      // 付け直していないので、知らせることも無い。
      expect(r.verdicts.filter(function (v) { return v.エラー })).to.have.lengthOf(0)
    })

    it('keeps a full-width space after the words, which trim() would have eaten', function () {
      const r = apply(sheet('r006', 'やめる　'))
      expect(r.ok, detail(r)).to.equal(true)
      expect(labels(r.text)).to.eql(['はい', 'やめる　'])
    })

    it('refuses a space before the words instead of dropping it quietly', function () {
      /* `<When:` の後ろの空白は区切りなので、全角空白も食べられる ── 通すと
       * 書いた人の空白が黙って消える。何になるかを言って断る。 */
      const r = apply(sheet('r006', '　やめる'))
      expect(r.ok).to.equal(false)
      expect(detail(r)).to.contain('文言の前にある空白')
      expect(detail(r)).to.contain('「やめる」')
      expect(r.text).to.equal(TEXT)
    })

    const refused = {
      'an emptied cell': ['', '本文が空です'],
      'a cell with a line break in it': ['はい\nいいえ', '改行が入っています'],
      'a tag that was never closed': ['<When: やめる', '読めません'],
      'some other tag': ['<Face: suzu(0)>', '読めません'],
      'words with an angle bracket in them': ['やめる>', '読めません']
    }
    Object.keys(refused).forEach(function (name) {
      it('refuses ' + name, function () {
        const r = apply(sheet('r006', refused[name][0]))
        expect(r.ok).to.equal(false)
        expect(detail(r)).to.contain('r006')
        expect(detail(r)).to.contain(refused[name][1])
        expect(r.text).to.equal(TEXT)
      })
    })

    it('refuses a look of its own, which would land before the choice', function () {
      const r = apply(sheet('r006', '<When: いいえ>', '<Face: suzu(0)>'))
      expect(r.ok).to.equal(false)
      expect(detail(r)).to.contain('見た目の列は使えません')
    })

    describe('a nested choice, where the line is indented', function () {
      const NESTED = [
        '覗きますか？', //              r001
        '<ShowChoices>', //            r002
        '<When: はい>', //             r003
        '    <ShowChoices>', //        r004
        '    <When: はい>', //         r005
        '    やった', //               r006
        '    <When: いいえ>', //       r007
        '    <End>', //               r008
        '<When: いいえ>', //           r009
        '<End>' //                    r010
      ].join('\n')

      it('keeps the indentation of the line it rewrote', function () {
        const rows = csv.foldToRows(NESTED, KEY, { rows: 'dialogue' }).map(function (r) {
          return r.ID === 'r007' ? Object.assign({}, r, { 本文: 'やめる' }) : r
        })
        const r = csv.mergeRows(NESTED, through(rows), { key: KEY })
        expect(r.ok).to.equal(true)
        expect(r.text.split('\n')[6]).to.equal('    <When: やめる>')
      })
    })

    describe('a choice written with the Japanese alias', function () {
      const ALIAS = ['<選択肢の表示>', '<選択肢: はい>', '<選択肢: いいえ>', '<分岐終了>'].join('\n')

      it('keeps the alias the line was written with', function () {
        const rows = csv.foldToRows(ALIAS, KEY, { rows: 'dialogue' }).map(function (r) {
          return r.ID === 'r003' ? Object.assign({}, r, { 本文: 'やめる' }) : r
        })
        const r = csv.mergeRows(ALIAS, through(rows), { key: KEY })
        expect(r.ok, detail(r)).to.equal(true)
        expect(r.text.split('\n')[2]).to.equal('<選択肢: やめる>')
      })
    })
  })

  /* 入口が2つあるので、断る理由が1か所から出ていることを本物のコマンドで確かめる。
   * ツクール側は test/test_csv_plugin_command.js が同じ文面を見ている。 */
  describe('through the command line', function () {
    const t2f = path.resolve(__dirname, '..', 'Text2Frame.js')
    const f2t = path.resolve(__dirname, '..', 'Frame2Text.js')
    let root
    let csvPath
    let textPath

    const branch = function (word) {
      return [
        { code: 101, indent: 1, parameters: ['', 0, 0, 2, ''] },
        { code: 401, indent: 1, parameters: [word] },
        { code: 0, indent: 1, parameters: [] }
      ]
    }

    beforeEach(function () {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-choice-'))
      fs.mkdirSync(path.join(root, 'data'))
      fs.writeFileSync(path.join(root, 'data', 'Map001.json'), JSON.stringify({
        events: [null, {
          id: 1,
          name: 'EV001',
          pages: [{
            conditions: {},
            list: [
              { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
              { code: 401, indent: 0, parameters: ['質問です'] },
              // 取り消し先は2番目。1つ消えると、ここが居ない選択肢を指す。
              { code: 102, indent: 0, parameters: [['はい', 'いいえ'], 1, 0, 2, 0] },
              { code: 402, indent: 0, parameters: [0, 'はい'] }
            ]
              .concat([{ code: 121, indent: 1, parameters: [1, 1, 0] }])
              .concat(branch('はいと答えた'))
              .concat([{ code: 402, indent: 0, parameters: [1, 'いいえ'] }])
              .concat(branch('いいえと答えた'))
              .concat([
                { code: 404, indent: 0, parameters: [] },
                { code: 0, indent: 0, parameters: [] }
              ])
          }]
        }]
      }))
      fs.writeFileSync(path.join(root, 'data', 'CommonEvents.json'), JSON.stringify([null]))
      csvPath = path.join(root, 'scenario.csv')
      expect(cp.spawnSync('node', [f2t, '--mode', 'batch', '--root', root], { encoding: 'utf8' }).status).to.equal(0)
      expect(cp.spawnSync('node', [f2t, '--mode', 'csv', '--root', root, '--rows', 'dialogue'],
        { encoding: 'utf8' }).status).to.equal(0)
      textPath = path.join(root, 'text', fs.readdirSync(path.join(root, 'text'))[0])
    })
    afterEach(function () { fs.rmSync(root, { recursive: true, force: true }) })

    const run = function (args) {
      return cp.spawnSync('node', [t2f, '--mode', 'csv', '--root', root].concat(args || []),
        { encoding: 'utf8' })
    }
    const dropChoice = function () {
      const rows = csv.parseCsv(fs.readFileSync(csvPath, 'utf8')).rows
      const kept = rows.filter(function (r) { return String(r.本文).indexOf('<When: いいえ>') < 0 })
      expect(kept.length).to.equal(rows.length - 1)
      fs.writeFileSync(csvPath, csv.formatCsv(kept))
    }

    it('refuses the delete and leaves the text alone', function () {
      const before = fs.readFileSync(textPath, 'utf8')
      dropChoice()
      const r = run(['--allow-delete'])
      expect(r.status, r.stdout).to.equal(1)
      expect(r.stderr).to.contain('選択肢')
      expect(r.stderr).to.contain('分岐の外に出ます')
      expect(fs.readFileSync(textPath, 'utf8')).to.equal(before)
    })

    it('refuses it with --force as well', function () {
      dropChoice()
      expect(run(['--allow-delete', '--force']).status).to.equal(1)
    })

    it('says so before telling anyone to pass --allow-delete', function () {
      // 「--allow-delete を付けて」と案内した先で断られると、案内が嘘になる。
      dropChoice()
      const r = run([])
      expect(r.status).to.equal(1)
      expect(r.stderr).to.contain('--allow-delete を付けてください')
      expect(r.stderr).to.contain('も通りません')
    })

    it('keeps the choice window intact when the sheet is sent back untouched', function () {
      const before = fs.readFileSync(textPath, 'utf8')
      expect(run([]).status, run([]).stderr).to.equal(0)
      expect(fs.readFileSync(textPath, 'utf8')).to.equal(before)
    })
  })
})
