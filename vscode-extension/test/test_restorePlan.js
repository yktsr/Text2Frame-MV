const { expect } = require('chai')
const { restoreOverview } = require('../out/db/restorePlan')

/* 巻き戻しの見立て。画面に出す文はここの数から作るので、数え方だけを固める。
 * 履歴の行は作らず、entry.json と同じ形の値を直に渡す。 */
describe('restoreOverview', function () {
  const at = 1700000000000
  const entry = (n, files, minutes = 0) => ({
    id: `20260924-000000-000-${String(n).padStart(3, '0')}`,
    time: at + minutes * 60000,
    started: at + minutes * 60000,
    op: 'apply',
    label: `操作 ${n}`,
    files
  })
  const data = (path, pages) => ({ path, kind: 'data', existed: true, pages })
  const text = (path) => ({ path, kind: 'text', existed: true })

  it('counts the pages of the game data, and no text, for an apply', function () {
    // 反映はテキストを書き換えないので、控えに入るのはデータと祖先だけ。
    const one = entry(1, [data('data/Map001.json', ['e:1:1:1', 'e:1:2:1']), { path: '.t2f-base/text/map001_event001_page1.txt', kind: 'base', existed: true }])

    const o = restoreOverview([one], one)

    expect(o.pages).to.eql(['e:1:1:1', 'e:1:2:1'])
    expect(o.data.map((f) => f.path)).to.eql(['data/Map001.json'])
    expect(o.texts).to.eql([])
    expect(o.laterOps).to.equal(0)
    // 祖先の控えは行には出さないが、テキストと一緒に戻すので files には入る。
    expect(o.files.map((f) => f.kind)).to.eql(['data', 'base'])
  })

  it('counts the texts, and no game data, for a pull', function () {
    const one = entry(1, [text('text/a.txt'), text('text/b.txt')])

    const o = restoreOverview([one], one)

    expect(o.texts.map((f) => f.path)).to.eql(['text/a.txt', 'text/b.txt'])
    expect(o.data).to.eql([])
    expect(o.pages).to.eql([])
  })

  it('says how many later operations are undone along with it', function () {
    const first = entry(1, [text('text/a.txt')], 0)
    const second = entry(2, [text('text/b.txt')], 1)
    const third = entry(3, [text('text/c.txt')], 2)
    const entries = [third, second, first] // 新しい順(listEntries と同じ)

    expect(restoreOverview(entries, first).laterOps).to.equal(2)
    expect(restoreOverview(entries, second).laterOps).to.equal(1)
    expect(restoreOverview(entries, third).laterOps).to.equal(0)
  })

  it('takes the same page only once when several operations touched it', function () {
    const first = entry(1, [data('data/Map001.json', ['e:1:1:1'])], 0)
    const second = entry(2, [data('data/Map001.json', ['e:1:1:1', 'e:1:3:1'])], 1)

    const o = restoreOverview([second, first], first)

    expect(o.pages).to.eql(['e:1:1:1'])
    expect(o.data).to.have.lengthOf(1)
  })

  it('lists the files made after that point, without the ancestor copies', function () {
    const first = entry(1, [text('text/a.txt')], 0)
    const second = entry(2, [
      { path: 'text/b.txt', kind: 'text', existed: false },
      { path: '.t2f-base/text/b.txt', kind: 'base', existed: false }
    ], 1)

    const o = restoreOverview([second, first], first)

    expect(o.created).to.eql(['text/b.txt'])
    expect(o.createdAll).to.eql(['text/b.txt', '.t2f-base/text/b.txt'])
  })
})
