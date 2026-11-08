const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')

const T2F = require('../Text2Frame.js')
const csv = T2F._csv

/* CSV はテキストの射影。畳むときに決めるのは「1行 = 読み手の単位」で、どこからどこまでが
 * 1つの文章の窓かは compile 自身(lineMap と blockSpans)に聞く ── ここで正規表現から
 * 決め直すと、コンパイラと食い違った瞬間に黙ってシナリオが壊れる。 */
describe('folding a text into CSV rows', function () {
  const tmp = []
  after(function () { tmp.forEach(function (d) { fs.rmSync(d, { recursive: true, force: true }) }) })

  const project = function (char) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-csv-'))
    tmp.push(root)
    fs.mkdirSync(path.join(root, 'js'))
    /* 3つそろって初めて組として使う(1つでも欠けたら出荷時の既定のまま)。
     * だから検体も3つ書く。背景と位置は出荷時と同じ値にして、効くのを文字だけにする。 */
    fs.writeFileSync(path.join(root, 'js', 'plugins.js'),
      'var $plugins =\n' + JSON.stringify([
        {
          name: 'Text2Frame',
          status: true,
          description: '',
          parameters: {
            'Default Background': 'ウインドウ',
            'Default Window Position': '下',
            'Comment Out Char': char
          }
        }
      ], null, 1) + ';\n')
    return root
  }

  const fold = function (text, opts) { return csv.foldToRows(text, 'map001_event001_page1', opts) }
  const shape = function (text, opts) {
    return fold(text, opts).map(function (r) { return [r.種別, r.見た目, r.本文] })
  }

  it('puts the lines of one window in one row', function () {
    expect(shape('こんにちは\n今日はいい天気')).to.eql([['セリフ', '', 'こんにちは\n今日はいい天気']])
  })

  it('starts a new row where the window breaks', function () {
    expect(shape('こんにちは\n\nさようなら')).to.eql([
      ['セリフ', '', 'こんにちは'],
      ['空行', '', ''],
      ['セリフ', '', 'さようなら']
    ])
  })

  it('folds the look-only tags into the window they belong to', function () {
    // <顔:> は自分のコマンドを持たない。101 は本文の行に記録されるので、窓の一部。
    expect(shape('<Face: suzu(0)>\nこんにちは')).to.eql([['セリフ', '<Face: suzu(0)>', 'こんにちは']])
  })

  it('keeps a run of look-only tags together, spelled as they were written', function () {
    expect(shape('  <Background: Dim>\n  <WindowPosition: Top>\nこんにちは')).to.eql([
      ['セリフ', '  <Background: Dim>\n  <WindowPosition: Top>', 'こんにちは']
    ])
  })

  it('leaves a look-only tag that no window follows as its own row', function () {
    expect(shape('<Face: suzu(0)>\n<Switch: 1, ON>')).to.eql([
      ['自動', '', '<Face: suzu(0)>'],
      ['自動', '', '<Switch: 1, ON>']
    ])
  })

  it('keeps a whole block in one row, contents and closing line included', function () {
    // ブロックの中身と閉じ行は開き行のコマンドに化ける。blockSpans が無いと取り違える。
    expect(shape('<comment>\nメモ1\nメモ2\n</comment>\nこんにちは')).to.eql([
      ['自動', '', '<comment>\nメモ1\nメモ2\n</comment>'],
      ['セリフ', '', 'こんにちは']
    ])
  })

  it('tells a choice from a plain tag line', function () {
    const kinds = fold('<ShowChoices: はい, いいえ>\n<When: はい>\n<Switch: 1, ON>\n<EndChoices>')
      .map(function (r) { return r.種別 })
    expect(kinds[0]).to.equal('自動')
    expect(kinds).to.include('選択肢')
  })

  it('gives every blank line a row of its own', function () {
    // かたまりで1行にすると本数が消える(窓の区切りの数が変わる)。
    expect(shape('こんにちは\n\n\n\nさようなら').filter(function (r) { return r[0] === '空行' }))
      .to.have.lengthOf(3)
  })

  it('keeps a decorative line of full-width spaces instead of calling it blank', function () {
    /* JavaScript の trim() は全角空白(U+3000)も食べる。空白で判断すると、全角空白で
     * レイアウトした看板の行が空行になって幅が消える(実物の kindworld で1件落ちた)。 */
    const wide = '　　　　　　　'
    const sign = '　　　　　　　←男湯'
    const rows = fold(wide + '\n' + sign)
    expect(rows.map(function (r) { return r.本文 }).join('\n')).to.contain(wide)
    expect(csv.rowsToLines(rows).join('\n')).to.equal(wide + '\n' + sign)
  })

  it('numbers the rows so a spreadsheet cannot turn them into numbers', function () {
    const rows = fold('あ\n\nい\n\nう')
    expect(rows.map(function (r) { return r.ID })).to.eql(['r001', 'r002', 'r003', 'r004', 'r005'])
  })

  it('stamps every row of one target with the same version', function () {
    const rows = fold('あ\n\nい')
    const stamps = rows.map(function (r) { return r.版 })
    expect(new Set(stamps).size).to.equal(1)
    expect(stamps[0]).to.match(/^[0-9a-f]{8}$/)
  })

  it('changes the stamp when the text changes, and not when only the newlines do', function () {
    const one = fold('あ\n\nい')[0].版
    expect(fold('あ\r\n\r\nい')[0].版).to.equal(one)
    expect(fold('あ\n\nう')[0].版).to.not.equal(one)
  })

  it('carries the target key on every row', function () {
    fold('あ\n\nい').forEach(function (r) { expect(r.宛先).to.equal('map001_event001_page1') })
  })

  it('does not drop a text it cannot compile, and says why', function () {
    const broken = '<GetLocationInfo: 1>\nこんにちは'
    const rows = fold(broken)
    expect(rows).to.have.lengthOf(2)
    // 文法の誤りと、それが何行目かを言う。
    expect(rows[0].エラー).to.contain('1行目')
    // 1行1行そのまま出すので、戻せば元のテキストに戻る。
    expect(csv.rowsToLines(rows).join('\n')).to.equal(broken)
  })

  describe('only the dialogue rows', function () {
    const text = '<Switch: 1, ON>\n<Face: suzu(0)>\nこんにちは\n\n<Wait: 60>\nさようなら'

    it('returns the dialogue and the choices, nothing else', function () {
      expect(csv.foldToRows(text, 'k', { rows: 'dialogue' }).map(function (r) { return r.種別 }))
        .to.eql(['セリフ', 'セリフ'])
    })

    it('keeps the ids of the whole fold, so the gaps show what was left out', function () {
      const all = csv.foldToRows(text, 'k')
      const some = csv.foldToRows(text, 'k', { rows: 'dialogue' })
      expect(some.map(function (r) { return r.ID })).to.eql(['r002', 'r005'])
      expect(all[1].ID).to.equal('r002')
    })

    it('keeps the look of a window it shows', function () {
      expect(csv.foldToRows(text, 'k', { rows: 'dialogue' })[0].見た目).to.equal('<Face: suzu(0)>')
    })
  })

  /* 畳む所は CommentOutChar を2回踏む(どの行がコメントかの判定と、メモの行の書き方)。
   * ゲームの設定で変えている人のところで出荷時の '%' のまま畳むと、行がずれて畳み方が
   * 丸ごと間違う ── issue 143 で直したのと同じ壊れ方なので、ここで固める。 */
  describe('with the game\'s own comment-out character', function () {
    before(function () {
      /* ここで見るのはライブラリとして動くときの道。同じプロセスに偽のツクール
       * (test/helpers の installEngine)が居ると、ゲームの設定を読む口は何もしない
       * ── あちらには生きた値があり、ディスクの plugins.js のほうが古いことがあるため。
       * npm test はファイルごとに別のプロセスで回すので普通は当たらない。当たったときは
       * 黙って飛ばさずに理由を言う(飛ばす検査は番人にならない)。 */
      expect(typeof PluginManager,
        'この検査はライブラリ側の道を見るので、同じプロセスに偽のツクールが居ると測れません')
        .to.equal('undefined')
    })

    // 1行目が '#' のコメント、2行目が '%' で始まる本文。どちらが落ちるかで判定が分かる。
    const text = '# これはメモ\n%% 本文のつもり\nこんにちは'

    it('treats the project\'s character as the comment, not the shipped one', function () {
      const rows = csv.foldToRows(text, 'k', { gameRoot: project('#') })
      // '#' の行はメモ、'%%' の行は本文としてセリフに入る。
      expect(rows).to.have.lengthOf(1)
      expect(rows[0].種別).to.equal('セリフ')
      expect(rows[0].メモ).to.equal('これはメモ')
      expect(rows[0].本文).to.equal('%% 本文のつもり\nこんにちは')
    })

    it('falls back to the shipped character when no root is given', function () {
      // 渡し忘れたらここが鳴る。'%%' の行がメモになり、'#' の行が本文になる。
      const rows = csv.foldToRows(text, 'k')
      expect(rows[0].種別).to.equal('セリフ')
      expect(rows[0].メモ).to.equal('')
      expect(rows[0].本文).to.equal('# これはメモ')
      expect(rows[1].メモ).to.equal('% 本文のつもり')
    })

    it('puts the settings back after it is done', function () {
      csv.foldToRows(text, 'k', { gameRoot: project('#') })
      expect(csv.foldToRows(text, 'k')[0].本文).to.equal('# これはメモ')
    })
  })

  /* メモの置き場所はコメントアウト行(既定は %)。compile が落とすのでゲームには入らず、
   * テキストには残るので、取り出し直しても消えない。しまう先を別に作らない。 */
  describe('the memo column', function () {
    it('lifts a comment line into the memo of the row it sits before', function () {
      const rows = fold('% イラスト担当さんへ: 笑顔で\n<Face: suzu(0)>\nこんにちは')
      expect(rows).to.have.lengthOf(1)
      expect(rows[0].メモ).to.equal('イラスト担当さんへ: 笑顔で')
      expect(rows[0].見た目).to.equal('<Face: suzu(0)>')
      expect(rows[0].本文).to.equal('こんにちは')
    })

    it('shows the memo without the comment character', function () {
      // 「メモ」という列で % を見せない。実データのコメント行は両方のゲームで0件なので、
      // 守るべき既存の綴りが無い。
      expect(fold('%メモ\nこんにちは')[0].メモ).to.equal('メモ')
      expect(fold('%\nこんにちは')[0].メモ).to.equal('')
    })

    it('keeps a run of comment lines together', function () {
      const rows = fold('% ひとつ\n% ふたつ\nこんにちは')
      expect(rows[0].メモ).to.equal('ひとつ\nふたつ')
    })

    it('gives a trailing comment line a row of its own', function () {
      const rows = fold('こんにちは\n% あとがき')
      expect(rows).to.have.lengthOf(2)
      expect(rows[1].種別).to.equal('メモ')
      expect(rows[1].メモ).to.equal('あとがき')
      expect(rows[1].本文).to.equal('')
    })

    it('writes the memo back as a comment line, in the same place', function () {
      const text = '% 笑顔で\n<Face: suzu(0)>\nこんにちは\n\n% 静かに\nさようなら\n% あとがき'
      expect(csv.rowsToLines(fold(text)).join('\n')).to.equal(text)
    })

    it('keeps the memo out of the game', function () {
      const text = '% イラスト担当さんへ\nこんにちは'
      const back = csv.rowsToLines(fold(text)).join('\n')
      expect(JSON.stringify(T2F.compile(back))).to.not.contain('イラスト担当')
      expect(T2F.compile(back)).to.eql(T2F.compile(text))
    })

    it('turns a memo someone typed in the sheet into a comment line', function () {
      const rows = fold('こんにちは')
      rows[0].メモ = 'シートで書いたメモ'
      const back = csv.rowsToLines(rows).join('\n')
      expect(back).to.equal('% シートで書いたメモ\nこんにちは')
      expect(T2F.compile(back)).to.eql(T2F.compile('こんにちは'))
    })

    it('does not add the comment character twice', function () {
      const rows = fold('こんにちは')
      rows[0].メモ = '% もう付けてある'
      expect(csv.rowsToLines(rows).join('\n')).to.equal('% もう付けてある\nこんにちは')
    })

    it('keeps the memo of a line the dialogue-only sheet shows', function () {
      const rows = csv.foldToRows('% 笑顔で\nこんにちは', 'k', { rows: 'dialogue' })
      expect(rows[0].メモ).to.equal('笑顔で')
    })

    it('uses the comment character the project set', function () {
      const root = project('#')
      expect(csv.foldToRows('# メモ\nこんにちは', 'k', { gameRoot: root })[0].メモ).to.equal('メモ')
      const rows = csv.foldToRows('こんにちは', 'k', { gameRoot: root })
      rows[0].メモ = 'シートで書いた'
      expect(csv.rowsToLines(rows, { gameRoot: root }).join('\n')).to.equal('# シートで書いた\nこんにちは')
    })
  })

  describe('every fixture', function () {
    it('round-trips through the rows without changing one command', function () {
      const cases = require('./test_cases.js')
      cases.forEach(function (c) {
        const text = fs.readFileSync(path.resolve(__dirname, '..', c.infile), 'utf8')
        const rows = csv.foldToRows(text, 'k')
        const back = csv.rowsToLines(rows).join('\n')
        /* 合格条件はコマンドの一致。行を分けてまた繋げばバイトは必ず一致するので、
         * バイトを見ても分割の規則が正しいかは何も分からない。 */
        expect(T2F.compile(back), c.title).to.eql(T2F.compile(text))
      })
    })

    it('round-trips through the CSV text as well', function () {
      const cases = require('./test_cases.js')
      cases.forEach(function (c) {
        const text = fs.readFileSync(path.resolve(__dirname, '..', c.infile), 'utf8')
        const rows = csv.parseCsv(csv.formatCsv(csv.foldToRows(text, 'k'))).rows
        expect(T2F.compile(csv.rowsToLines(rows).join('\n')), c.title).to.eql(T2F.compile(text))
      })
    })
  })
})

describe('reading and writing the CSV itself', function () {
  it('writes the columns it promised, in order', function () {
    const out = csv.formatCsv([])
    expect(out.charCodeAt(0)).to.equal(0xfeff) // BOM が無いと Excel が化ける
    expect(out.replace(/^\uFEFF/, '')).to.equal(csv.COLUMNS.join(',') + '\r\n')
  })

  it('quotes what has to be quoted and nothing else', function () {
    const row = {}
    csv.COLUMNS.forEach(function (c) { row[c] = '' })
    row.本文 = 'あ,い\n"う"'
    const line = csv.formatCsv([row]).split('\r\n')[1]
    expect(line).to.contain('"あ,い\n""う"""')
    const back = csv.parseCsv(csv.formatCsv([row])).rows
    expect(back[0].本文).to.equal('あ,い\n"う"')
  })

  it('reads the columns by name, not by position', function () {
    const text = '\uFEFF本文,種別,ID\r\nこんにちは,セリフ,r001\r\n'
    const r = csv.parseCsv(text).rows[0]
    expect(r.種別).to.equal('セリフ')
    expect(r.本文).to.equal('こんにちは')
    expect(r.ID).to.equal('r001')
  })

  it('fills in the columns the sheet did not keep', function () {
    const r = csv.parseCsv('ID,本文\r\nr001,あ\r\n').rows[0]
    expect(r.見た目).to.equal(undefined)
    expect(r.本文).to.equal('あ')
  })

  it('reads a sheet saved with LF instead of CRLF', function () {
    expect(csv.parseCsv('ID,本文\nr001,あ\nr002,い\n').rows).to.have.lengthOf(2)
  })

  it('says which columns it found', function () {
    expect(csv.parseCsv(csv.formatCsv([])).columns).to.eql(csv.COLUMNS)
  })

  it('returns nothing for an empty file', function () {
    expect(csv.parseCsv('').rows).to.eql([])
  })
})
