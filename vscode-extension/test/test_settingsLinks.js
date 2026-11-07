const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

/* 「操作」の画面から設定へ飛ぶリンク。
 *
 * 設定は VS Code の設定画面にあって辿り着きにくいので、画面から一息で開けるようにした。
 * **拡張の名前を1文字間違えると、押しても何も出ない設定画面が開くだけ**で、黙って役に
 * 立たなくなる。だから名前と、そこに出すものが在ることをここで突き合わせる。
 *
 * 合い言葉は vscode に依存しない層が持っているので、ここから直接呼べる
 * (画面を作る commandsView は vscode を読み込むので呼べない。mcpRoots と同じ分け方)。 */
const { allSettingsQuery, EXTENSION_ID } = require('../out/settingsLinks')
const root = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

const declared = function () {
  const conf = manifest.contributes.configuration
  const parts = Array.isArray(conf) ? conf : [conf]
  const out = []
  parts.forEach(function (one) { Object.keys(one.properties || {}).forEach(function (key) { out.push(key) }) })
  return out
}

describe('the link from the panel to the settings', function () {
  /* 名乗りを間違えると、空の設定画面が開く。 */
  it('names this extension as the marketplace does', function () {
    expect(EXTENSION_ID).to.equal(manifest.publisher + '.' + manifest.name)
  })

  /* 合い言葉の形。@ext: でないと、拡張で絞られず検索語として扱われる。 */
  it('asks for every setting of this extension', function () {
    expect(allSettingsQuery()).to.equal('@ext:' + manifest.publisher + '.' + manifest.name)
  })

  /* 絞った先に1つも無ければ、開いても空に見える。 */
  it('has settings to show there', function () {
    expect(declared()).to.not.eql([])
    declared().forEach(function (key) {
      expect(key, key + ' は text2frame. の設定ではありません').to.match(/^text2frame\./)
    })
  })
})
