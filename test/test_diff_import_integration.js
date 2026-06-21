const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')

const text2frame = require('../Text2Frame.js')

describe('DIFF_IMPORT Integration Test', function () {
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
  const readFileSyncStub = sinon.stub(fs, 'readFileSync')
  const consoleStub = sinon.stub(console, 'log')

  before(function () {
    globalThis.Game_Interpreter = globalThis.Game_Interpreter || {}
    Game_Interpreter.prototype = Game_Interpreter.prototype || {}
    globalThis.$gameMessage = globalThis.$gameMessage || { add: function () {} }
    globalThis.PluginManager = {
      parameters: function () {
        return {
          'Default Window Position': 'Bottom',
          'Default Background': 'Window',
          'Default Scenario Folder': 'text',
          'Default Scenario File': 'message.txt',
          'Default Common Event ID': '1',
          'Default MapID': '1',
          'Default EventID': '1',
          'Default PageID': '1',
          IsOverwrite: 'false',
          'Comment Out Char': '%',
          IsDebug: 'false',
          DisplayMsg: 'true',
          DisplayWarning: 'true'
        }
      },
      registerCommand: function () {}
    }
  })

  beforeEach(function () {
    writeFileSyncStub.resetHistory()
    writeFileSyncStub.resetBehavior()
    readFileSyncStub.resetHistory()
    readFileSyncStub.resetBehavior()
  })

  after(function () {
    sinon.restore()
  })

  it('DIFF_IMPORT_MESSAGE_TO_EVENT updates only changed blocks', function () {
    const text = 'Hi\n\nGoodbye'
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

    let resultData = ''
    writeFileSyncStub.callsFake(function (filePath, jsonData) {
      resultData = jsonData
      return filePath
    })
    readFileSyncStub.onCall(0).returns(text)
    readFileSyncStub.onCall(1).returns(JSON.stringify(mapData))

    Game_Interpreter.prototype.pluginCommandText2Frame('DIFF_IMPORT_MESSAGE_TO_EVENT', ['', '', '1', '1', '1', false])

    const actual = JSON.parse(resultData)
    const list = actual.events[1].pages[0].list
    expect(list).to.eql([
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Hi'] },
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Goodbye'] },
      { code: 0, indent: 0, parameters: [] }
    ])
  })

  it('DIFF_IMPORT_MESSAGE_TO_CE updates common event by diff', function () {
    const text = 'Hello\n\nGoodbye'
    const ceData = [
      null,
      {
        list: [
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          { code: 401, indent: 0, parameters: ['Hello'] },
          { code: 0, indent: 0, parameters: [] }
        ]
      }
    ]

    let resultData = ''
    writeFileSyncStub.callsFake(function (filePath, jsonData) {
      resultData = jsonData
      return filePath
    })
    readFileSyncStub.onCall(0).returns(text)
    readFileSyncStub.onCall(1).returns(JSON.stringify(ceData))

    Game_Interpreter.prototype.pluginCommandText2Frame('DIFF_IMPORT_MESSAGE_TO_CE', ['', '', '1', false])

    const actual = JSON.parse(resultData)
    expect(actual[1].list).to.eql([
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Hello'] },
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Goodbye'] },
      { code: 0, indent: 0, parameters: [] }
    ])
  })

  it('DIFF_IMPORT_MESSAGE_TO_EVENT throws when EventID is not found', function () {
    const text = 'Hello'
    const mapData = { events: [null] }

    readFileSyncStub.onCall(0).returns(text)
    readFileSyncStub.onCall(1).returns(JSON.stringify(mapData))

    expect(function () {
      Game_Interpreter.prototype.pluginCommandText2Frame('DIFF_IMPORT_MESSAGE_TO_EVENT', ['', '', '1', '99', '1', false])
    }).to.throw('EventID not found')
  })

  it('DIFF_IMPORT_MESSAGE_TO_CE throws when CommonEventID is not found', function () {
    const text = 'Hello'
    const ceData = [null]

    readFileSyncStub.onCall(0).returns(text)
    readFileSyncStub.onCall(1).returns(JSON.stringify(ceData))

    expect(function () {
      Game_Interpreter.prototype.pluginCommandText2Frame('DIFF_IMPORT_MESSAGE_TO_CE', ['', '', '99', false])
    }).to.throw('Common Event not found')
  })

  it('DIFF_IMPORT_MESSAGE_TO_EVENT auto-creates missing pages', function () {
    const text = 'Hello'
    const mapData = {
      events: [
        null,
        {
          pages: [
            {
              list: [
                { code: 0, indent: 0, parameters: [] }
              ]
            }
          ]
        }
      ]
    }

    let resultData = ''
    writeFileSyncStub.callsFake(function (filePath, jsonData) {
      resultData = jsonData
      return filePath
    })
    readFileSyncStub.onCall(0).returns(text)
    readFileSyncStub.onCall(1).returns(JSON.stringify(mapData))

    Game_Interpreter.prototype.pluginCommandText2Frame('DIFF_IMPORT_MESSAGE_TO_EVENT', ['', '', '1', '1', '3', false])

    const actual = JSON.parse(resultData)
    expect(actual.events[1].pages.length).to.equal(3)
    expect(actual.events[1].pages[2].list).to.eql([
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Hello'] },
      { code: 0, indent: 0, parameters: [] }
    ])
  })
})
