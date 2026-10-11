const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')
const mcp = require('../t2f-mcp')

/* 道具の振る舞い。handler を**プロセス内で**叩く(子プロセスを起こさない)。
 * tools/run-tests.js には kill もタイムアウトも無いので、常駐させるテストは1つ漏らすと
 * 実行全体が止まる。殻(標準入出力)だけを test_mcp_stdio.js が spawnSync で見る。
 * プロトコルの形は test/snapshot/mcp-protocol.txt が固定しているので、ここでは中身を見る。 */
const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {}
}

const bottom = { code: 0, indent: 0, parameters: [] }
const msg = function (text) {
  return [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
    { code: 401, indent: 0, parameters: [text] }
  ]
}

describe('mcp tools', function () {
  let tmp
  let ctx

  const call = function (name, args) {
    const response = mcp.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args || {}, _meta: META }
    }, ctx)
    expect(response, 'tools/call が応答しませんでした').to.be.an('object')
    expect(response.error, JSON.stringify(response.error)).to.equal(undefined)
    return response.result
  }
  const textOf = function (result) { return result.content[0].text }

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.mkdirSync(path.join(tmp, 'text'))
    fs.mkdirSync(path.join(tmp, 'js'))
    // MV か MZ かはコアのファイル名で見分ける。
    fs.writeFileSync(path.join(tmp, 'js', 'rmmz_core.js'), '// MZ')
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), JSON.stringify({
      events: [null, {
        id: 1,
        name: 'EV001',
        pages: [{ list: [{ code: 121, indent: 0, parameters: [1, 1, 0] }].concat(msg('こんにちは'), [bottom]) }]
      }]
    }))
    fs.writeFileSync(path.join(tmp, 'data', 'CommonEvents.json'), JSON.stringify([
      null, { id: 1, name: 'CE001', list: msg('コモンの文').concat([bottom]) }
    ]))
    fs.writeFileSync(path.join(tmp, 'data', 'MapInfos.json'), JSON.stringify([
      null, { id: 1, name: 'はじまりの村', order: 1, parentId: 0 }
    ]))
    fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify({
      switches: ['', 'ドアを開けた', '橋がかかった'],
      variables: ['', '所持金']
    }))
    ctx = mcp.createContext({ root: tmp })
  })

  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  const writeText = function (name, body) {
    fs.writeFileSync(path.join(tmp, 'text', name), body)
  }
  const frontMatter = '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\n'

  describe('t2f_project_info', function () {
    it('tells MV from MZ and counts the routed texts', function () {
      writeText('a.txt', frontMatter + 'やあ\n')
      writeText('loose.txt', '見出しのないテキスト\n')
      const info = call('t2f_project_info').structuredContent

      expect(info.engine).to.equal('MZ')
      expect(info.textCount).to.equal(2)
      expect(info.routedCount).to.equal(1)
      expect(info.withoutFrontMatter).to.eql(['text/loose.txt'])
    })

    it('names the texts that fight over one target', function () {
      writeText('a.txt', frontMatter + 'やあ\n')
      writeText('b.txt', frontMatter + 'やあ\n')
      const info = call('t2f_project_info').structuredContent

      expect(Object.keys(info.duplicates)).to.eql(['map001_event001_page1'])
      expect(textOf(call('t2f_project_info'))).to.contain('見送られる宛先')
    })

    /* 目印が残っている間は統合が止まるので、書き込む前に気づけること。 */
    it('names the texts with unresolved conflict markers', function () {
      writeText('a.txt', frontMatter + '<comment>\n=== テキストの変更 / from text ===\n</comment>\nやあ\n')
      const info = call('t2f_project_info').structuredContent

      expect(info.withConflictMarkers).to.eql(['text/a.txt'])
      expect(textOf(call('t2f_project_info'))).to.contain('目印3行を消して')
    })

    it('warns about the editor and the sync watcher', function () {
      expect(textOf(call('t2f_project_info'))).to.contain('t2f-sync')
    })
  })

  describe('t2f_list', function () {
    it('shows where a text already is, and where a missing one would go', function () {
      writeText('mine.txt', frontMatter + 'やあ\n')
      const rows = call('t2f_list').structuredContent.targets

      const event = rows.filter(function (r) { return r.key === 'map001_event001_page1' })[0]
      expect(event.textPath).to.equal('text/mine.txt')
      expect(event.plannedTextPath).to.equal(null)
      expect(event.mapName).to.equal('はじまりの村')

      const common = rows.filter(function (r) { return r.kind === 'common' })[0]
      expect(common.textPath).to.equal(null)
      expect(common.plannedTextPath).to.contain('common001')
    })

    it('takes the scope, and custom needs an existing text', function () {
      expect(call('t2f_list', { scope: 'custom' }).structuredContent.targets).to.eql([])
      writeText('mine.txt', frontMatter + 'やあ\n')
      expect(call('t2f_list', { scope: 'custom' }).structuredContent.targets).to.have.lengthOf(1)
    })
  })

  describe('t2f_read', function () {
    it('returns the front matter and the body, and writes nothing', function () {
      const before = fs.readdirSync(path.join(tmp, 'text'))
      const text = textOf(call('t2f_read', { key: 'map001_event001_page1' }))

      expect(text).to.contain('kind: event')
      expect(text).to.contain('<Switch: 1, ON>')
      expect(text).to.contain('こんにちは')
      expect(fs.readdirSync(path.join(tmp, 'text'))).to.eql(before)
    })

    it('finds the target by ids as well as by key', function () {
      expect(textOf(call('t2f_read', { mapId: '1', eventId: '1', pageId: '1' })))
        .to.equal(textOf(call('t2f_read', { key: 'map001_event001_page1' })))
      expect(textOf(call('t2f_read', { commonEventId: '1' }))).to.contain('コモンの文')
    })

    /* 会話だけ抜いたものは往復しないので、書き戻す元には使えない。 */
    it('drops everything but the conversation when asked', function () {
      const text = textOf(call('t2f_read', { key: 'map001_event001_page1', translationOnly: true }))

      expect(text).to.contain('こんにちは')
      expect(text).to.not.contain('<Switch:')
    })

    it('says so when the target does not exist', function () {
      expect(call('t2f_read', { key: 'map999_event001_page1' }).isError).to.equal(true)
    })
  })

  describe('t2f_search', function () {
    it('resolves a hit back to its target', function () {
      writeText('a.txt', frontMatter + 'やあ\nこんにちは\n')
      const hits = call('t2f_search', { query: 'こんにちは' }).structuredContent.hits

      expect(hits).to.have.lengthOf(1)
      expect(hits[0].textPath).to.equal('text/a.txt')
      expect(hits[0].line).to.equal(9)
      expect(hits[0].target).to.contain('map 1')
    })

    it('marks a hit in a text that has no front matter', function () {
      writeText('loose.txt', 'こんにちは\n')
      expect(call('t2f_search', { query: 'こんにちは' }).structuredContent.hits[0].target).to.equal(null)
    })

    it('honours the limit', function () {
      writeText('a.txt', frontMatter + 'やあ\nやあ\nやあ\n')
      expect(call('t2f_search', { query: 'やあ', limit: 2 }).structuredContent.hits).to.have.lengthOf(2)
    })
  })

  describe('t2f_syntax', function () {
    it('lists the headings when asked for nothing', function () {
      const sections = call('t2f_syntax').structuredContent.sections
      expect(sections.length).to.be.greaterThan(100)
    })

    it('looks a tag up by any of its names, with or without the brackets', function () {
      const plain = textOf(call('t2f_syntax', { tag: 'switch' }))
      expect(plain).to.contain('スイッチの操作')
      expect(textOf(call('t2f_syntax', { tag: '<Switch: 1, ON>' }))).to.equal(plain)
      expect(textOf(call('t2f_syntax', { tag: 'スイッチ' }))).to.equal(plain)
    })

    it('suggests near names for a tag it does not know', function () {
      const result = call('t2f_syntax', { tag: 'swi' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('switch')
    })
  })

  describe('t2f_names', function () {
    it('gives the number for a named switch', function () {
      const names = call('t2f_names', { kind: 'switch' }).structuredContent.switch
      expect(names).to.eql([{ id: 1, name: 'ドアを開けた' }, { id: 2, name: '橋がかかった' }])
    })

    it('narrows by name across every kind', function () {
      const out = call('t2f_names', { query: '橋' }).structuredContent
      expect(out.switch).to.eql([{ id: 2, name: '橋がかかった' }])
      expect(out.variable).to.equal(undefined)
    })

    it('says when a project has no names yet', function () {
      fs.writeFileSync(path.join(tmp, 'data', 'System.json'), JSON.stringify({ switches: ['', ''], variables: [''] }))
      expect(textOf(call('t2f_names', { kind: 'switch' }))).to.contain('まだ名前が付いていません')
    })
  })

  describe('t2f_check', function () {
    it('counts the commands when the text is sound', function () {
      const result = call('t2f_check', { text: '<スイッチ: 1, オン>\nやあ\n' })
      expect(result.isError).to.equal(undefined)
      expect(result.structuredContent.commandCount).to.be.greaterThan(0)
    })

    /* コンパイラは寛容で、知らないタグはセリフになる。投げるのは値が選択肢から外れたとき。 */
    it('reports the mistake instead of throwing', function () {
      const result = call('t2f_check', { text: '<位置: よこ>\n' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('文法エラー')
    })

    it('treats an unknown tag as dialogue, not as a mistake', function () {
      expect(call('t2f_check', { text: '<Nope: 1>\n' }).isError).to.equal(undefined)
    })

    it('ignores the front matter', function () {
      expect(call('t2f_check', { text: frontMatter + 'やあ\n' }).isError).to.equal(undefined)
    })
  })

  describe('the root', function () {
    it('refuses a data folder outside it', function () {
      expect(function () { mcp.createContext({ root: tmp, dataDir: '../elsewhere' }) }).to.throw('--root の外')
    })

    it('refuses a text folder outside it', function () {
      expect(function () { mcp.createContext({ root: tmp, textDir: '/tmp/elsewhere' }) }).to.throw('--root の外')
    })

    it('refuses a strategy it cannot pass on', function () {
      // add は走査のたびに内容が二重になるので、この前面からは出さない。
      expect(function () { mcp.createContext({ root: tmp, strategy: 'add' }) }).to.throw('merge か overwrite')
    })
  })

  describe('t2f_write_plan', function () {
    const plan = function (args) {
      return call('t2f_write_plan', Object.assign({ key: 'map001_event001_page1' }, args))
    }

    /* 下書きは本物を1バイトも書かない。写しに当ててから捨てる。 */
    it('writes nothing at all', function () {
      const dataBefore = fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')
      const result = plan({ text: 'こんばんは\n' })

      expect(result.isError).to.equal(undefined)
      expect(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).to.equal(dataBefore)
      expect(fs.readdirSync(path.join(tmp, 'text'))).to.eql([])
    })

    it('shows the game as it is and as it would become', function () {
      const out = plan({ text: 'こんばんは\n' }).structuredContent

      expect(out.before).to.contain('こんにちは')
      expect(out.after).to.contain('こんばんは')
      expect(out.token).to.be.a('string').with.length.greaterThan(20)
      expect(out.textExists).to.equal(false)
      /* まだ無いテキストの名前は defaultFileName が決める。MapInfos があるので
       * ツリー順と階層つきマップ名が入る(読めないときだけ map001_event001_page1 の形)。 */
      expect(out.textPath).to.equal('text/001_はじまりの村_EV001_page1_map001-event001.txt')
    })

    /* 祖先が無い回はテキストが丸ごと勝つ。エージェントが気づけるよう、警告をそのまま載せる。 */
    it('passes the first-apply warning through', function () {
      expect(plan({ text: 'こんばんは\n' }).structuredContent.warnings.join('\n')).to.contain('初回反映')
    })

    /* 祖先があるときは初回扱いにしない。下書きが実物と食い違わないよう、本物の祖先を読む。 */
    it('reads the real ancestor, so an existing one is not reported as the first apply', function () {
      const token = plan({ text: 'こんばんは\n' }).structuredContent.token
      call('t2f_write_apply', { token })

      const again = plan({ text: 'こんばんは、また\n' }).structuredContent
      expect(again.warnings.join('\n')).to.not.contain('初回反映')
    })

    it('says the same token for the same plan', function () {
      expect(plan({ text: 'やあ\n' }).structuredContent.token).to.equal(plan({ text: 'やあ\n' }).structuredContent.token)
      expect(plan({ text: 'やあ\n' }).structuredContent.token).to.not.equal(plan({ text: 'ちがう\n' }).structuredContent.token)
    })

    it('refuses a strategy it cannot pass on', function () {
      expect(plan({ text: 'やあ\n', strategy: 'add' }).isError).to.equal(true)
    })

    it('reports a text it cannot compile instead of throwing', function () {
      const result = plan({ text: '<位置: よこ>\n' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('反映できません')
    })
  })

  describe('t2f_write_apply', function () {
    const planFor = function (text) {
      return call('t2f_write_plan', { key: 'map001_event001_page1', text }).structuredContent.token
    }
    const gameText = function () {
      const list = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).events[1].pages[0].list
      return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] }).join(',')
    }

    it('writes the game and the text, and records the pre-image', function () {
      const result = call('t2f_write_apply', { token: planFor('こんばんは\n') })

      expect(result.isError).to.equal(undefined)
      expect(gameText()).to.equal('こんばんは')
      expect(fs.existsSync(path.join(tmp, 'text', result.structuredContent.textPath.replace('text/', '')))).to.equal(true)
      expect(result.structuredContent.historyId).to.be.a('string')
      expect(fs.existsSync(path.join(tmp, '.t2f-history', result.structuredContent.historyId))).to.equal(true)
    })

    /* 控えのフォルダは、利用者のゲームが git 管理下でも入らないようにしておく。 */
    it('keeps its own snapshots out of git', function () {
      call('t2f_write_apply', { token: planFor('こんばんは\n') })
      expect(fs.readFileSync(path.join(tmp, '.t2f-history', '.gitignore'), 'utf8')).to.equal('*\n')
    })

    it('spends the token, so the same plan cannot be applied twice', function () {
      const token = planFor('こんばんは\n')
      expect(call('t2f_write_apply', { token }).isError).to.equal(undefined)
      expect(call('t2f_write_apply', { token }).isError).to.equal(true)
    })

    it('refuses a token it does not know', function () {
      const result = call('t2f_write_apply', { token: 'でたらめ' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('t2f_write_plan からやり直して')
    })

    /* 下書きのあとに人かツクールが触っていたら断る(拡張がレビュー後に指紋を見直すのと同じ)。 */
    it('refuses when the game changed after the plan', function () {
      const token = planFor('こんばんは\n')
      const dataPath = path.join(tmp, 'data', 'Map001.json')
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      data.events[1].pages[0].list[2].parameters[0] = 'ツクールで直した'
      fs.writeFileSync(dataPath, JSON.stringify(data))

      const result = call('t2f_write_apply', { token })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('ゲームのデータが変わりました')
      expect(gameText()).to.equal('ツクールで直した')
    })

    it('refuses when the text changed after the plan', function () {
      writeText('map001_event001_page1.txt', frontMatter + 'さいしょ\n')
      const token = planFor('こんばんは\n')
      writeText('map001_event001_page1.txt', frontMatter + 'あとで直した\n')

      const result = call('t2f_write_apply', { token })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('テキストが変わりました')
    })
  })

  /* 目印が残っている間は統合が止まる。上書きは詰まった統合からの出口なので通す。 */
  describe('conflict markers', function () {
    const marked = '<comment>\n=== テキストの変更 / from text ===\n</comment>\n\nやあ\n'

    it('stops a merge', function () {
      const result = call('t2f_write_plan', { key: 'map001_event001_page1', text: marked, strategy: 'merge' })
      expect(result.isError).to.equal(true)
      expect(textOf(result)).to.contain('目印')
    })

    it('lets an overwrite through, which is the way out', function () {
      const result = call('t2f_write_plan', { key: 'map001_event001_page1', text: marked, strategy: 'overwrite' })
      expect(result.isError).to.equal(undefined)
    })
  })

  describe('read-only', function () {
    it('offers only the reading tools', function () {
      const readOnly = mcp.createContext({ root: tmp, readOnly: true })
      const listed = mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } }, readOnly)

      expect(listed.result.tools.length).to.be.greaterThan(0)
      listed.result.tools.forEach(function (tool) {
        expect(tool.annotations.readOnlyHint, tool.name).to.equal(true)
      })
      const names = listed.result.tools.map(function (t) { return t.name })
      expect(names).to.not.include('t2f_write_apply')
      /* 下書きも隠す。本当に何も書かないので readOnlyHint は true のままだが、
       * 適用できない下書きを勧めても使えない。注釈とこの絞り込みは別の関心。 */
      expect(names).to.not.include('t2f_write_plan')
    })

    /* 一覧から消すだけでなく、名前で呼ばれても断る。 */
    it('refuses to call a write tool even by name', function () {
      const readOnly = mcp.createContext({ root: tmp, readOnly: true })
      const response = mcp.handle({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 't2f_write_apply', arguments: { token: 'x' }, _meta: META }
      }, readOnly)

      expect(response.error.code).to.equal(-32602)
    })
  })
})
