const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const os = require('os')
const path = require('path')
const writer = require('../../t2f-history.js')
const reader = require('../out/db/history')

/* MCP サーバ(ルートの t2f-mcp.js)が書いた控えを、拡張の読み手が読めること。
 * 形式は src/db/history.ts が持っていて、ルートの t2f-history.js は**書くだけ**。
 * 同じ形を2か所に書いたので、ずれたらここで落ちる。片方だけで assert しても意味がない
 * ので、実際に listEntries / planRestoreTo / restoreTo に通す。 */
describe('history written by the MCP server', function () {
  let tmp

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-history-'))
    fs.mkdirSync(path.join(tmp, 'data'))
    fs.mkdirSync(path.join(tmp, 'text'))
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), 'もとのデータ')
    fs.writeFileSync(path.join(tmp, 'text', 'a.txt'), 'もとのテキスト')
  })
  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  /** 反映を1回ぶん記録する(t2f_write_apply と同じ順: 控える -> 書く -> 閉じる)。 */
  const recordOneApply = function () {
    const entry = writer.beginEntry(tmp, 'mcp-apply', 'MCP の反映 map001_event001_page1', { keep: 100 })
    entry.note(path.join(tmp, 'data', 'Map001.json'), 'data', ['e:1:1:1'])
    entry.note(path.join(tmp, 'text', 'a.txt'), 'text')
    entry.note(path.join(tmp, '.t2f-base', 'text', 'a.txt'), 'base')
    fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), 'あたらしいデータ')
    fs.writeFileSync(path.join(tmp, 'text', 'a.txt'), 'あたらしいテキスト')
    fs.mkdirSync(path.join(tmp, '.t2f-base', 'text'), { recursive: true })
    fs.writeFileSync(path.join(tmp, '.t2f-base', 'text', 'a.txt'), 'あたらしい祖先')
    return entry.finish()
  }

  it('is listed by the extension, with the kinds and the page key intact', function () {
    const written = recordOneApply();
    const entries = reader.listEntries(tmp)

    expect(entries).to.have.lengthOf(1)
    expect(entries[0].id).to.equal(written.id)
    expect(entries[0].op).to.equal('mcp-apply')
    expect(entries[0].files.map(function (f) { return f.kind })).to.have.members(['data', 'text', 'base'])
    const data = entries[0].files.filter(function (f) { return f.kind === 'data' })[0]
    expect(data.path).to.equal('data/Map001.json')
    expect(data.pages).to.eql(['e:1:1:1'])
  })

  it('gives the extension a restore plan it understands', function () {
    const written = recordOneApply()
    const plan = reader.planRestoreTo(reader.listEntries(tmp), { id: written.id, started: written.started })

    expect(plan.files.map(function (f) { return f.path })).to.include('data/Map001.json')
    // 操作の前に無かった祖先は、戻すときに消す側へ回る。
    expect(plan.removed).to.include('.t2f-base/text/a.txt')
  })

  /* 本番の取り消し。ここが通らなければ「エージェントの誤爆から戻せる」が成り立たない。 */
  it('can actually be undone by the extension', function () {
    const written = recordOneApply()
    reader.restoreTo(tmp, reader.listEntries(tmp), { id: written.id, started: written.started })

    expect(fs.readFileSync(path.join(tmp, 'data', 'Map001.json'), 'utf8')).to.equal('もとのデータ')
    expect(fs.readFileSync(path.join(tmp, 'text', 'a.txt'), 'utf8')).to.equal('もとのテキスト')
    expect(fs.existsSync(path.join(tmp, '.t2f-base', 'text', 'a.txt'))).to.equal(false)
  })

  /* 祖先しか変わらなかった操作は残さない(履歴の行に出ないので、残すと中身の無い行になる)。
   * 拡張の finish も同じ判断をするので、片方だけ変えると履歴の見え方がずれる。 */
  it('leaves out an entry where only the ancestor moved', function () {
    const entry = writer.beginEntry(tmp, 'mcp-apply', 'ancestor only', { keep: 100 })
    entry.note(path.join(tmp, '.t2f-base', 'text', 'a.txt'), 'base')
    fs.mkdirSync(path.join(tmp, '.t2f-base', 'text'), { recursive: true })
    fs.writeFileSync(path.join(tmp, '.t2f-base', 'text', 'a.txt'), 'あたらしい祖先')

    expect(entry.finish()).to.equal(undefined)
    expect(reader.listEntries(tmp)).to.eql([])
  })

  it('keeps its snapshots out of git', function () {
    recordOneApply()
    expect(fs.readFileSync(path.join(tmp, '.t2f-history', '.gitignore'), 'utf8')).to.equal('*\n')
  })

  it('drops the oldest entries past the keep count', function () {
    for (let i = 0; i < 4; i++) {
      const entry = writer.beginEntry(tmp, 'mcp-apply', 'repeat ' + i, { keep: 2 })
      entry.note(path.join(tmp, 'data', 'Map001.json'), 'data', ['e:1:1:1'])
      fs.writeFileSync(path.join(tmp, 'data', 'Map001.json'), 'データ ' + i)
      entry.finish()
    }
    expect(reader.listEntries(tmp)).to.have.lengthOf(2)
  })
})
