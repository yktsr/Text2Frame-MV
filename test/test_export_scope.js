const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const os = require('os')

// 偽のツクールは本体を読み込む前に置く(読み込み時にパラメータを読むため)。
const { bottom, installEngine } = require('./helpers')
const { shown } = installEngine()
const frame2text = require('../Frame2Text.js')

/* 取り出す範囲。数千イベントのプロジェクトでは、全部を書き出すと編集したいものを探せなくなる。
 * 既定は「会話があるもの」だけ。中身のあるものだけ・既にテキストがあるものだけも選べる。
 * customだけが、既にテキストがあるものを条件に更新する。 */
describe('export scope', function () {
  let tmp
  let cwd
  let mainModule
  const message = [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: ['やあ'] },
    bottom
  ]
  // 会話を含まないページ(場所移動)。宝箱や移動イベントの代わり。
  const move = [{ code: 201, indent: 0, parameters: [0, 2, 5, 5, 0, 0] }, bottom]
  const empty = [bottom]

  const run = function (scope) {
    shown.length = 0
    Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT_MESSAGES_TO_FOLDER', [path.join(tmp, 'text'), 'merge', scope])
  }
  const written = function () {
    try { return fs.readdirSync(path.join(tmp, 'text')).sort() } catch (e) { return [] }
  }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-scope-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, { id: 1, pages: [{ list: message }, { list: move }, { list: empty }] }]
    }), 'utf8')
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([null, { id: 1, list: empty }]), 'utf8')
    cwd = process.cwd()
    process.chdir(tmp)
    mainModule = process.mainModule
    process.mainModule = { filename: path.join(tmp, 'Text2Frame.js') }
  })

  afterEach(function () {
    process.mainModule = mainModule
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('writes only conversations by default', function () {
    run()

    expect(written()).to.eql(['map001_event001_page1.txt'])
  })

  it('writes everything when asked for all', function () {
    run('all')

    expect(written()).to.eql([
      'common001.txt', 'map001_event001_page1.txt', 'map001_event001_page2.txt', 'map001_event001_page3.txt'
    ])
  })

  it('writes only what holds a conversation when asked', function () {
    run('conversation')

    expect(written()).to.eql(['map001_event001_page1.txt'])
  })

  it('does not update an existing text without a conversation', function () {
    const kept = path.join(tmp, 'text', '移動イベント.txt')
    fs.mkdirSync(path.dirname(kept))
    fs.writeFileSync(kept,
      frame2text.renderFrontMatter({ mapId: '1', eventId: '1', pageId: '2' }, 'event') + 'この内容は残る',
      'utf8')

    run('conversation')

    expect(fs.readFileSync(kept, 'utf8')).to.contain('この内容は残る')
    expect(fs.readFileSync(kept, 'utf8')).not.to.contain('<Transfer')
  })

  it('writes nothing new for custom, but keeps the texts that exist up to date', function () {
    run('conversation')
    // 会話の無いページのテキストを、利用者が自分で用意した場合
    const kept = path.join(tmp, 'text', '移動イベント.txt')
    fs.writeFileSync(kept, frame2text.renderFrontMatter({ mapId: '1', eventId: '1', pageId: '2' }, 'event'), 'utf8')
    fs.rmSync(path.join(tmp, 'text', 'map001_event001_page1.txt'))

    run('custom')

    // 新しくは作らない。既にあるテキスト(名前は自由)は更新する。
    expect(written()).to.eql(['移動イベント.txt'])
    expect(fs.readFileSync(kept, 'utf8')).to.contain('<Transfer')
  })

  it('accepts the Japanese words for the scope', function () {
    run('会話があるものだけ')

    expect(written()).to.eql(['map001_event001_page1.txt'])
  })
})

/* 新しく作るときのファイル名。ツクールのマップ順・マップ階層・イベント名を添える。
 * 3つの OS のどれでも使えない文字は落とす。既にあるファイルの名前は変えない(索引で引くため)。 */
describe('default file name', function () {
  const name = frame2text.defaultFileName

  it('adds the map order, hierarchy, and event name', function () {
    expect(name({ kind: 'event', mapId: '3', mapOrder: '002', mapName: '世界-水族館4', eventId: '3', name: '12_ミズクラゲ', pageId: '1' }))
      .to.equal('002_世界-水族館4_12_ミズクラゲ_page1_map003-event003.txt')
    expect(name({ kind: 'common', commonEventId: '1', name: '回復' })).to.equal('common001-回復.txt')
  })

  it('uses the automatic event name and falls back without map metadata', function () {
    expect(name({ kind: 'event', mapId: '1', mapOrder: '1', mapName: '村', eventId: '7', name: 'EV007', pageId: '2' }))
      .to.equal('1_村_EV007_page2_map001-event007.txt')
    expect(name({ kind: 'event', mapId: '1', eventId: '7', name: 'EV007', pageId: '2' }))
      .to.equal('map001_event007_page2.txt')
    expect(name({ kind: 'common', commonEventId: '2', name: '' })).to.equal('common002.txt')
  })

  it('drops the characters a file name cannot hold', function () {
    // 実際のプロジェクトにあったマップ名(1/100)。Windows / macOS / Linux のどれでも使えない文字を落とす。
    expect(name({ kind: 'event', mapId: '2', mapOrder: '2', mapName: '世界-1/100', eventId: '1', name: 'a:b*c?d"e<f>g|h', pageId: '1' }))
      .to.equal('2_世界-1100_abcdefgh_page1_map002-event001.txt')
    expect(name({ kind: 'common', commonEventId: '3', name: ' 前後の空白と末尾の点.. ' })).to.equal('common003-前後の空白と末尾の点.txt')
  })

  it('gives up the name when it would make the file name too long', function () {
    expect(name({ kind: 'event', mapId: '1', mapOrder: '1', mapName: 'あ'.repeat(200), eventId: '3', pageId: '1' }))
      .to.equal('map001_event003_page1.txt')
  })

  it('derives the map order width and the root-first map hierarchy', function () {
    const mapTmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-map-names-'))
    fs.mkdirSync(path.join(mapTmp, 'data'))
    fs.writeFileSync(path.join(mapTmp, 'data', 'MapInfos.json'), JSON.stringify([
      null,
      { id: 1, name: '世界', parentId: 0, order: 1 },
      { id: 2, name: '村', parentId: 1, order: 2 },
      { id: 3, name: '宿屋', parentId: 2, order: 3 },
      { id: 4, name: '城', parentId: 1, order: 4 },
      { id: 5, name: '洞窟', parentId: 1, order: 5 },
      { id: 6, name: '港', parentId: 1, order: 6 },
      { id: 7, name: '島', parentId: 1, order: 7 },
      { id: 8, name: '塔', parentId: 1, order: 8 },
      { id: 9, name: '森', parentId: 1, order: 9 },
      { id: 10, name: '城下町', parentId: 1, order: 10 }
    ]), 'utf8')
    fs.writeFileSync(path.join(mapTmp, 'data', 'Map003.json'), JSON.stringify({
      events: [null, { id: 1, name: '店主', pages: [{ list: [bottom] }] }]
    }), 'utf8')

    const targets = frame2text.enumerateTargets(path.join(mapTmp, 'data'), { scope: 'all', index: { paths: {}, duplicates: {} } })
    const target = targets.find(function (entry) { return entry.key === 'map003_event001_page1' })

    expect(target.mapOrder).to.equal('03')
    expect(target.mapName).to.equal('世界-村-宿屋')
    expect(name(target)).to.equal('03_世界-村-宿屋_店主_page1_map003-event001.txt')
    fs.rmSync(mapTmp, { recursive: true, force: true })
  })
})
