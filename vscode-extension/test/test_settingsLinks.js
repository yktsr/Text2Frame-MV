const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

/* 「操作」の画面から設定へ飛ぶリンク。
 *
 * 設定は VS Code の設定画面にあって辿り着きにくいので、画面から名指しで開けるようにした。
 * **名前を1文字間違えると、押しても何も出ない設定画面が開くだけ**で、黙って役に立たなく
 * なる。だから実在することをここで突き合わせる。
 *
 * どれを出すかは vscode に依存しない層が持っているので、ここから直接呼べる
 * (画面を作る commandsView は vscode を読み込むので呼べない。mcpRoots と同じ分け方)。 */
const { settingLinks, settingQuery, allSettingsQuery } = require('../out/settingsLinks')
const root = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

const declared = function () {
  const conf = manifest.contributes.configuration
  const parts = Array.isArray(conf) ? conf : [conf]
  const out = []
  parts.forEach(function (one) { Object.keys(one.properties || {}).forEach(function (key) { out.push(key) }) })
  return out
}

describe('the links from the panel to the settings', function () {
  const linked = settingLinks().map(function (one) { return 'text2frame.' + one.key })

  it('points at settings that exist', function () {
    const known = declared()
    expect(linked.length, 'リンクが1つもありません').to.be.greaterThan(0)
    linked.forEach(function (key) {
      expect(known, key + ' という設定はありません').to.include(key)
    })
  })

  /* 設定を足したときにリンクを忘れると、その設定だけ辿り着けないままになる。 */
  it('leaves no setting without a link', function () {
    const missing = declared().filter(function (key) { return linked.indexOf(key) === -1 })

    expect(missing, 'この設定へのリンクがありません: ' + missing.join(', ')).to.eql([])
  })

  it('does not offer the same setting twice', function () {
    expect(linked.length).to.equal(new Set(linked).size)
  })

  /* 分類は package.json の見出しと同じ言葉にする(別の言葉だと、設定画面に移った
   * ときにどこを見ればよいか分からなくなる)。 */
  it('uses the headings the settings themselves use', function () {
    const nls = JSON.parse(fs.readFileSync(path.join(root, 'package.nls.ja.json'), 'utf8'))
    const headings = ['apply', 'write', 'testplay', 'advanced'].map(function (one) {
      return nls['config.category.' + one]
    })
    const used = Array.from(new Set(settingLinks().map(function (one) { return one.note })))

    used.forEach(function (one) { expect(headings, one + ' は設定の見出しにありません').to.include(one) })
  })

  /* まとめて開くリンクは、この拡張そのものを指すこと。 */
  it('opens this extension when asked for all of them', function () {
    expect(allSettingsQuery()).to.equal('@ext:' + manifest.publisher + '.' + manifest.name)
  })

  /* 合い言葉の形。@id: でないと、その項目だけに絞られず検索語として扱われる。 */
  it('asks for one setting by its name', function () {
    expect(settingQuery('dataDir')).to.equal('@id:text2frame.dataDir')
  })

  /* 名前と分類は、どれも空でないこと(薄く出す分類が空だと列がずれて見える)。 */
  it('gives every link a name and a heading', function () {
    settingLinks().forEach(function (one) {
      expect(one.label, one.key + ' に名前がありません').to.be.a('string').and.not.equal('')
      expect(one.note, one.key + ' に分類がありません').to.be.a('string').and.not.equal('')
    })
  })
})
