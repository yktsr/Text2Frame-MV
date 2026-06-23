const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')

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
    IsDebug: 'false',
    DisplayMsg: 'true',
    DisplayWarning: 'true',
    EnglishTag: 'true'
  }
}

const frame2textPath = require.resolve('../Frame2Text.js')
delete require.cache[frame2textPath]
require('../Frame2Text.js')

describe('SYNC format preservation Integration Test', function () {
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
  const readFileSyncStub = sinon.stub(fs, 'readFileSync')
  const consoleStub = sinon.stub(console, 'log')

  beforeEach(function () {
    writeFileSyncStub.resetHistory()
    writeFileSyncStub.resetBehavior()
    readFileSyncStub.resetHistory()
    readFileSyncStub.resetBehavior()
    consoleStub.resetHistory()
  })

  after(function () {
    sinon.restore()
  })

  it('preserves comment paragraph and triple-blank separator for unchanged content', function () {
    const mapData = {
      events: [
        null,
        {
          pages: [
            {
              list: [
                { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
                { code: 401, indent: 0, parameters: ['Hello'] },
                { code: 0, indent: 0, parameters: [] }
              ]
            }
          ]
        }
      ]
    }
    const helloParagraph = '<Face: (0)><Background: Window><WindowPosition: Bottom>\nHello'
    const existingText = '% NOTE: keep me\n\n\n' + helloParagraph

    let writtenText = ''
    writeFileSyncStub.callsFake(function (_filepath, textData) {
      writtenText = textData
    })

    readFileSyncStub.onCall(0).returns(JSON.stringify(mapData))
    readFileSyncStub.onCall(1).returns(existingText)

    Game_Interpreter.prototype.pluginCommandFrame2Text('SYNC_EVENT_TO_MESSAGE', ['text', 'message.txt', '1', '1', '1'])

    expect(writtenText).to.equal(existingText)
  })

  it('keeps existing separator before unchanged paragraph and adds new block with default separator', function () {
    const mapData = {
      events: [
        null,
        {
          pages: [
            {
              list: [
                { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
                { code: 401, indent: 0, parameters: ['Hello'] },
                { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
                { code: 401, indent: 0, parameters: ['Goodbye'] },
                { code: 0, indent: 0, parameters: [] }
              ]
            }
          ]
        }
      ]
    }
    const helloParagraph = '<Face: (0)><Background: Window><WindowPosition: Bottom>\nHello'
    const goodbyeParagraph = '<Face: (0)><Background: Window><WindowPosition: Bottom>\nGoodbye'
    const existingText = '% NOTE: keep me\n\n\n' + helloParagraph

    let writtenText = ''
    writeFileSyncStub.callsFake(function (_filepath, textData) {
      writtenText = textData
    })

    readFileSyncStub.onCall(0).returns(JSON.stringify(mapData))
    readFileSyncStub.onCall(1).returns(existingText)

    Game_Interpreter.prototype.pluginCommandFrame2Text('SYNC_EVENT_TO_MESSAGE', ['text', 'message.txt', '1', '1', '1'])

    expect(writtenText).to.equal('% NOTE: keep me\n\n\n' + helloParagraph + '\n\n' + goodbyeParagraph)
  })
})
