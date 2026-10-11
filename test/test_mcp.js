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

  describe('read-only', function () {
    it('offers only the reading tools', function () {
      const readOnly = mcp.createContext({ root: tmp, readOnly: true })
      const listed = mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } }, readOnly)

      expect(listed.result.tools.length).to.be.greaterThan(0)
      listed.result.tools.forEach(function (tool) {
        expect(tool.annotations.readOnlyHint, tool.name).to.equal(true)
      })
    })
  })
})
