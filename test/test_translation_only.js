const chai = require('chai')
const expect = chai.expect

Game_Interpreter = {}
Game_Interpreter.prototype = {}
$gameMessage = {}
$gameMessage.add = function () {}
PluginManager = {}
PluginManager.parameters = function () {
  return {
    'Default Scenario Folder': 'text',
    'Default Scenario File': 'message.txt',
    'Default Common Event ID': '1',
    'Default MapID': '1',
    'Default EventID': '1',
    'Default PageID': '1',
    'IsDebug': 'false',
    'DisplayMsg': 'false',
    'DisplayWarning': 'false',
    'EnglishTag': 'true'
  }
}

const frame2text = require('../Frame2Text.js')
const decompile = frame2text.decompile

// 会話 + 非会話イベントが混在するサンプル
const mixedEvents = [
  { code: 121, indent: 0, parameters: [1, 1, 0] }, // スイッチ操作(非会話)
  { code: 101, indent: 0, parameters: ['Actor1', 0, 0, 2, 'Alice'] }, // 文章の表示
  { code: 401, indent: 0, parameters: ['Hello there!'] },
  { code: 401, indent: 0, parameters: ['How are you?'] },
  { code: 122, indent: 0, parameters: [3, 3, 0, 0, 5] }, // 変数操作(非会話)
  { code: 102, indent: 0, parameters: [['Yes', 'No'], 1, 0, 2, 0] }, // 選択肢の表示
  { code: 402, indent: 1, parameters: [0, 'Yes'] },
  { code: 401, indent: 2, parameters: ['Great!'] },
  { code: 402, indent: 1, parameters: [1, 'No'] },
  { code: 403, indent: 1, parameters: [] },
  { code: 401, indent: 2, parameters: ['Too bad.'] },
  { code: 404, indent: 1, parameters: [] },
  { code: 250, indent: 0, parameters: [{ name: 'SE' }] }, // SE再生(非会話)
  { code: 105, indent: 0, parameters: [2, 0] }, // 文章のスクロール表示
  { code: 405, indent: 0, parameters: ['Scrolling line.'] }
]

describe('Frame2Text translationOnly Test', function () {
  it('drops non-conversation events (switch / variable / SE)', function () {
    const out = decompile(mixedEvents, true, { translationOnly: true })
    expect(out).to.not.contain('<Switch:')
    expect(out).to.not.contain('<Set:')
    expect(out).to.not.contain('<PlaySE:')
  })

  it('keeps message body text', function () {
    const out = decompile(mixedEvents, true, { translationOnly: true })
    expect(out).to.contain('Hello there!')
    expect(out).to.contain('How are you?')
  })

  it('keeps dialogue-related tags on Show Text (Face / WindowPosition / Name / Background)', function () {
    const out = decompile(mixedEvents, true, { translationOnly: true })
    expect(out).to.contain('<Face: Actor1(0)>')
    expect(out).to.contain('<WindowPosition: Bottom>')
    expect(out).to.contain('<Name: Alice>')
    expect(out).to.contain('<Background: Window>')
  })

  it('keeps choices (ShowChoices / When / WhenCancel / End) and their text', function () {
    const out = decompile(mixedEvents, true, { translationOnly: true })
    expect(out).to.contain('<ShowChoices:')
    expect(out).to.contain('<When: Yes>')
    expect(out).to.contain('<When: No>')
    expect(out).to.contain('<WhenCancel>')
    expect(out).to.contain('<End>')
    expect(out).to.contain('Great!')
    expect(out).to.contain('Too bad.')
  })

  it('keeps scrolling text', function () {
    const out = decompile(mixedEvents, true, { translationOnly: true })
    expect(out).to.contain('<ShowScrollingText:')
    expect(out).to.contain('Scrolling line.')
  })

  it('outputs Japanese tags when EnglishTag is false', function () {
    const out = decompile(mixedEvents, false, { translationOnly: true })
    expect(out).to.contain('<顔: Actor1(0)>')
    expect(out).to.contain('<位置: Bottom>')
    expect(out).to.contain('<名前: Alice>')
    expect(out).to.not.contain('<スイッチ:')
  })

  it('is a no-op relative to normal output when only conversation events exist', function () {
    const conversationOnly = [
      { code: 101, indent: 0, parameters: ['Actor1', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Just talking.'] }
    ]
    const normal = decompile(conversationOnly, true)
    const translation = decompile(conversationOnly, true, { translationOnly: true })
    expect(translation).to.equal(normal)
  })

  it('does not affect default decompile output (option off)', function () {
    const out = decompile(mixedEvents, true)
    expect(out).to.contain('<Switch:')
    expect(out).to.contain('<Set:')
    expect(out).to.contain('<PlaySE:')
  })
})
