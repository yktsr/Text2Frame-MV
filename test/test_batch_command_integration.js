const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')

require('../Text2Frame.js')

describe('APPLY_MESSAGES_BY_MANIFEST command Integration Test', function () {
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

  it('APPLY_MESSAGES_BY_MANIFEST applies manifest entries with diff strategy', function () {
    const manifestPath = '/tmp/manifest.json'
    const manifestJson = JSON.stringify({
      entries: [
        {
          kind: 'event',
          mapId: '1',
          eventId: '1',
          pageId: '1',
          textPath: 'text/scene.txt'
        }
      ]
    })

    const mapData = {
      events: [
        null,
        {
          pages: [
            {
              list: [
                { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
                { code: 401, indent: 0, parameters: ['Old'] },
                { code: 0, indent: 0, parameters: [] }
              ]
            }
          ]
        }
      ]
    }

    let resultData = ''
    writeFileSyncStub.callsFake(function (filePath, jsonData) {
      if (String(filePath).indexOf('/tmp/data/Map001.json') >= 0) {
        resultData = jsonData
      }
      return filePath
    })

    readFileSyncStub.callsFake(function (filePath) {
      const normalized = String(filePath).replace(/\\/g, '/')
      if (normalized.indexOf('/tmp/manifest.json') >= 0) {
        return manifestJson
      }
      if (normalized.indexOf('/tmp/text/scene.txt') >= 0) {
        return 'Hi'
      }
      if (normalized.indexOf('/tmp/data/Map001.json') >= 0) {
        return JSON.stringify(mapData)
      }
      throw new Error('Unexpected read path: ' + filePath)
    })

    Game_Interpreter.prototype.pluginCommandText2Frame('APPLY_MESSAGES_BY_MANIFEST', [manifestPath, 'diff'])

    const actual = JSON.parse(resultData)
    expect(actual.events[1].pages[0].list).to.eql([
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Hi'] },
      { code: 0, indent: 0, parameters: [] }
    ])
  })

  it('APPLY_MESSAGES_BY_MANIFEST sync strategy throws when Frame2Text bridge is unavailable', function () {
    const manifestPath = '/tmp/manifest.json'
    expect(function () {
      Game_Interpreter.prototype.pluginCommandText2Frame('APPLY_MESSAGES_BY_MANIFEST', [manifestPath, 'sync'])
    }).to.throw('Frame2Text plugin is required for sync strategy in BATCH command')
  })
})
