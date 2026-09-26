const { expect } = require('chai')
const fs = require('fs')
const { tagHelpText, tagHelpSection } = require('../out/tagHelp')
const { buildTagHelp, render, aliasGroups, COMPILER, OUT } = require('../scripts/update-tag-help')

const source = fs.readFileSync(COMPILER, 'utf8')
const title = function (tag) { const s = tagHelpSection(tag); return s && s.title }

/* タグの説明は Text2Frame.js のヘルプの該当する見出し。名前全体で引き、先頭が同じ別のタグの説明を出さない。 */
describe('tag help', function () {
  it('is up to date with the help in Text2Frame.js (run `npm run update-tag-help` if this fails)', function () {
    expect(render(buildTagHelp(source)) === fs.readFileSync(OUT, 'utf8')).to.equal(true)
  })

  it('shows the section of the tag itself, not of a tag it starts with', function () {
    expect(title('<SetMovementRoute: 1, OFF, OFF, Wait for Completion>')).to.equal('(40) 移動ルートの設定')
    expect(title('<Set: 1, 100>')).to.equal('(6) 変数の操作')
    expect(title('<SwitchOn: 128>')).to.equal('(40) 移動ルートの設定 ・スイッチON/OFF')
    expect(title('<Switch: 1, ON>')).to.equal('(5) スイッチの操作')
    expect(title('<IfWin>')).to.equal('(70) 戦闘の処理')
    expect(title('<If: Switches[1], ON>')).to.equal('(9) 条件分岐')
    expect(title('<NameInputProcessing: 1, 8>')).to.equal('(72) 名前入力の処理')
    expect(title('<Name: ハロルド>')).to.equal('名前の設定方法【MZ用】')
  })

  it('gives every alias of a command the same section, in any case', function () {
    expect(title('<ShowChoices>')).to.equal('(1) 選択肢の表示')
    expect(title('<選択肢の表示>')).to.equal('(1) 選択肢の表示')
    expect(title('<SHC>')).to.equal('(1) 選択肢の表示')
    expect(title('<fadeout>')).to.equal('(54) 画面のフェードアウト')
    expect(title('<End>')).to.equal('(9) 条件分岐')
    expect(title('</comment>')).to.equal('(16) 注釈')
    expect(title('<GatherFollowers>')).to.equal('(44) 隊列メンバーの集合')
  })

  it('quotes the help as it is, under the section title', function () {
    const text = tagHelpText('<ChangeItems: 1, Increase, 1>')
    expect(text.split('\n')[0]).to.equal('**(18) アイテムの増減**')
    expect(text).to.contain('\n  <ChangeItems: アイテムID, 操作, オペランド>\n') // ヘルプの字下げのまま
    expect(tagHelpText('<NoSuchTag>')).to.equal(undefined)
  })

  it('shows a move command its own part of the move route section, after how the route is written', function () {
    expect(title('<TurnDown>')).to.equal('(40) 移動ルートの設定 ・引数無しの移動コマンド')
    expect(tagHelpSection('<下を向く>').body).to.match(/<SetMovementRoute: 対象, リピート, スキップ, 完了までウェイト>[\s\S]*\n<TurnDown> +<下を向く>$/)
    expect(tagHelpSection('<TurnDown>').body).to.not.contain('<MoveDown>') // 一覧のほかの行は出さない
    expect(title('<ChangeImage: object/$hand, 1>')).to.equal('(40) 移動ルートの設定 ・画像の変更')
    expect(title('<McWait: 60>')).to.equal('(40) 移動ルートの設定 ・ウェイト')
    expect(title('<スイッチOFF: 5>')).to.equal('(40) 移動ルートの設定 ・スイッチON/OFF')
    expect(title('<McPlaySe: Door4, 55, 100, 0>')).to.equal('(40) 移動ルートの設定 ・SEの演奏')
    expect(tagHelpSection('<ChangeSpeed: x2 faster>').body).to.contain('移動速度リスト')
    expect(tagHelpSection('<ChangeSpeed: x2 faster>').body).to.not.contain('移動頻度リスト')
    expect(title('<SetMovementRoute: Player, OFF, OFF, OFF>')).to.equal('(40) 移動ルートの設定') // 設定そのものは全体
  })

  it('leaves out only the tags the help does not describe', function () {
    const { tags } = buildTagHelp(source)
    const missing = []
    for (const names of aliasGroups(source).values()) for (const n of names) if (!(n in tags)) missing.push(n)
    // Skip / SkipEnd / br はヘルプに記載が無い。
    expect(missing.sort()).to.eql(['br', 'skip', 'skipend', 'スキップ', 'スキップ終了'].sort())
  })
})
