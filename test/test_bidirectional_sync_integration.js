const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')

require('../Text2Frame.js')

describe('SYNC_EVENT_BIDIRECTIONAL Integration Test', function () {
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
  const readFileSyncStub = sinon.stub(fs, 'readFileSync')

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
    delete Game_Interpreter.prototype.pluginCommandFrame2Text
  })

  after(function () {
    sinon.restore()
  })

  it('throws when Frame2Text plugin bridge is unavailable', function () {
    expect(function () {
      Game_Interpreter.prototype.pluginCommandText2Frame('SYNC_EVENT_BIDIRECTIONAL', ['', '', '1', '1', '1'])
    }).to.throw('Frame2Text plugin is required')
  })

  it('runs diff-import first, then syncs JSON back to text', function () {
    let resultData = ''
    const syncSpy = sinon.spy(function () {
      expect(resultData).to.not.equal('')
    })
    Game_Interpreter.prototype.pluginCommandFrame2Text = syncSpy

    const text = 'Hi'
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

    writeFileSyncStub.callsFake(function (filePath, jsonData) {
      resultData = jsonData
      return filePath
    })

    readFileSyncStub.onCall(0).returns(text)
    readFileSyncStub.onCall(1).returns(JSON.stringify(mapData))

    Game_Interpreter.prototype.pluginCommandText2Frame('SYNC_EVENT_BIDIRECTIONAL', ['text', 'message.txt', '1', '1', '1'])

    expect(syncSpy.calledOnce).to.equal(true)
    expect(syncSpy.firstCall.args[0]).to.equal('SYNC_EVENT_TO_MESSAGE')
    expect(syncSpy.firstCall.args[1]).to.eql(['text', 'message.txt', '1', '1', '1'])

    const actual = JSON.parse(resultData)
    expect(actual.events[1].pages[0].list).to.eql([
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Hi'] },
      { code: 0, indent: 0, parameters: [] }
    ])
  })
})
