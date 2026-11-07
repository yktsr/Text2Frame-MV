const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

/* 反映のしかた(strategy)の値は、Text2Frame の resolveStrategy だけが決めている。
 *
 * ここを突き合わせるのは、**在りもしない値と比べていても誰も気づかない**から。
 * 拡張には `strategy !== 'import'` という比較が3か所あったが、import という値は
 * どこにも無く、常に真だった(動きは正しいが「4つ目の方式がある」と読めてしまう)。
 *
 * 設定として出す値と、拡張のコードが名指しで比べる値の両方を見る。 */
const { resolveStrategy } = require('../../Text2Frame.js')
const root = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

const strategySetting = function () {
  const conf = manifest.contributes.configuration
  const parts = Array.isArray(conf) ? conf : [conf]
  let found
  parts.forEach(function (one) {
    const hit = (one.properties || {})['text2frame.strategy']
    if (hit) found = hit
  })
  return found
}

/** 拡張のコードが strategy と名指しで比べている値。 */
const compared = function () {
  const out = new Set()
  fs.readdirSync(path.join(root, 'src')).forEach(function (name) {
    if (!name.endsWith('.ts')) return
    const body = fs.readFileSync(path.join(root, 'src', name), 'utf8')
    const re = /strategy\s*[!=]==\s*'([^']*)'/g
    let m
    while ((m = re.exec(body)) !== null) out.add(m[1])
  })
  return Array.from(out)
}

describe('the values of the apply strategy', function () {
  it('offers only values the compiler accepts', function () {
    const setting = strategySetting()
    expect(setting, 'text2frame.strategy という設定がありません').to.be.an('object')
    expect(setting.enum).to.be.an('array').and.not.eql([])
    setting.enum.forEach(function (value) {
      expect(resolveStrategy(value), value + ' は Text2Frame が受け取らない値です').to.not.equal(null)
    })
  })

  /* 選べる値と説明の数がずれると、設定画面でどれがどの説明かが1つずつ食い違う。 */
  it('describes every value it offers', function () {
    const setting = strategySetting()
    expect(setting.enumDescriptions || []).to.have.lengthOf(setting.enum.length)
    expect(setting.enumItemLabels || []).to.have.lengthOf(setting.enum.length)
  })

  /* 在りもしない値と比べていたら、ここで鳴る。 */
  it('compares against values that can actually occur', function () {
    const seen = compared()
    expect(seen, 'strategy を名指しで比べている所が1つもありません(見つけ方が壊れたかも)').to.not.eql([])
    seen.forEach(function (value) {
      expect(resolveStrategy(value), value + ' という方式はありません(常に真/偽の比較です)').to.not.equal(null)
    })
  })
})
