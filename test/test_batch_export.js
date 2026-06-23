const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')

// Setup global environment first
Game_Interpreter = {}
Game_Interpreter.prototype = {
  pluginCommand: function () {}
}
$gameMessage = { _texts: [] }
$gameMessage.add = function(text) {
  this._texts.push(text)
}

PluginManager = {}
PluginManager.parameters = function (str) {
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
}
PluginManager.registerCommand = function () {}

// Now require Frame2Text
const frame2text = require('../Frame2Text.js')

describe('BATCH_EXPORT Plugin Command Test', function () {
  const readdirSyncStub = sinon.stub(fs, 'readdirSync')
  const readFileSyncStub = sinon.stub(fs, 'readFileSync')
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
  const existsSyncStub = sinon.stub(fs, 'existsSync')
  const mkdirSyncStub = sinon.stub(fs, 'mkdirSync')
  const consoleLogStub = sinon.stub(console, 'log')
  const consoleErrorStub = sinon.stub(console, 'error')

  beforeEach(function () {
    // Reset message stack before each test
    $gameMessage._texts = []
  })

  afterEach(function () {
    readdirSyncStub.resetHistory()
    readFileSyncStub.resetHistory()
    writeFileSyncStub.resetHistory()
    existsSyncStub.resetHistory()
    mkdirSyncStub.resetHistory()
    consoleLogStub.resetHistory()
    consoleErrorStub.resetHistory()
    $gameMessage._texts = []
  })

  after(function () {
    sinon.restore()
  })

  describe('Manifest auto-generation', function () {
    it('should auto-generate manifest when it does not exist', function () {
      // Mock file system
      existsSyncStub.withArgs(sinon.match(/auto-manifest\.json$/)).returns(false)
      existsSyncStub.withArgs(sinon.match(/data$/)).returns(true)
      existsSyncStub.withArgs(sinon.match(/Map001\.json$/)).returns(true)
      existsSyncStub.withArgs(sinon.match(/CommonEvents\.json$/)).returns(true)
      existsSyncStub.withArgs(sinon.match(/examples$/)).returns(true)

      readdirSyncStub.withArgs(sinon.match(/data$/)).returns(['Map001.json', 'Map002.json'])

      const mapData = {
        events: [
          null, // index 0 is unused
          {
            id: 1,
            pages: [
              {
                list: [
                  { code: 101, indent: 0, parameters: ['Test Event', 0, 0, 2] },
                  { code: 0 }
                ]
              }
            ]
          }
        ]
      }

      const commonData = [
        null,
        {
          id: 1,
          list: [
            { code: 101, indent: 0, parameters: ['Common Event', 0, 0, 2] },
            { code: 0 }
          ]
        }
      ]

      readFileSyncStub.withArgs(sinon.match(/Map001\.json$/), 'utf8').returns(JSON.stringify(mapData))
      readFileSyncStub.withArgs(sinon.match(/Map002\.json$/), 'utf8').returns(JSON.stringify(mapData))
      readFileSyncStub.withArgs(sinon.match(/CommonEvents\.json$/), 'utf8').returns(JSON.stringify(commonData))

      let manifestWritten = null
      writeFileSyncStub.withArgs(sinon.match(/auto-manifest\.json$/), sinon.match.any, 'utf8').callsFake(function (path, data) {
        manifestWritten = JSON.parse(data)
      })

      // Execute command
      Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT', [
        'examples/auto-manifest.json',
        'data',
        'ja',
        'ja',
        'text'
      ])

      // Verify manifest was generated
      expect(manifestWritten).to.exist
      expect(manifestWritten.version).to.equal(1)
      expect(manifestWritten.entries).to.be.an('array')
      expect(manifestWritten.entries.length).to.be.greaterThan(0)

      // Verify entries have required fields
      manifestWritten.entries.forEach(entry => {
        expect(entry.kind).to.be.oneOf(['event', 'common'])
        expect(entry.locale).to.equal('ja')
        expect(entry.sourceLocale).to.equal('ja')
        expect(entry.textPath).to.exist
      })

      console.log('Manifest auto-generation test passed')
    })

    it('should skip manifest generation if it already exists', function () {
      existsSyncStub.withArgs(sinon.match(/auto-manifest\.json$/)).returns(true)

      const existingManifest = {
        version: 1,
        entries: [
          {
            kind: 'event',
            mapId: '1',
            eventId: '1',
            pageId: '1',
            locale: 'ja',
            sourceLocale: 'ja',
            key: 'map001_event001_page1',
            textPath: 'text/ja/map001_event001_page1.txt'
          }
        ]
      }

      readFileSyncStub.withArgs(sinon.match(/auto-manifest\.json$/), 'utf8').returns(JSON.stringify(existingManifest))

      writeFileSyncStub.returns(undefined)

      // Execute command
      Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT', [
        'examples/auto-manifest.json',
        'data',
        'ja',
        'ja',
        'text'
      ])

      // Verify manifest file was NOT written (auto-generation was skipped)
      expect(writeFileSyncStub.getCalls().filter(call => call.args[0].includes('auto-manifest.json')).length).to.equal(0)

      console.log('Existing manifest skip test passed')
    })
  })

  describe('Batch export', function () {
    it('should export all manifest entries to text files', function () {
      // Setup manifest
      const manifest = {
        version: 1,
        entries: [
          {
            kind: 'event',
            mapId: '1',
            eventId: '1',
            pageId: '1',
            locale: 'ja',
            sourceLocale: 'ja',
            key: 'map001_event001_page1',
            textPath: 'text/ja/map001_event001_page1.txt'
          },
          {
            kind: 'common',
            commonEventId: '1',
            locale: 'ja',
            sourceLocale: 'ja',
            key: 'common001',
            textPath: 'text/ja/common001.txt'
          }
        ]
      }

      // Mock file system
      existsSyncStub.returns(true)

      let readCallCount = 0
      readFileSyncStub.callsFake(function (filePath, encoding) {
        readCallCount++
        if (filePath.includes('auto-manifest.json')) {
          return JSON.stringify(manifest)
        }
        if (filePath.includes('Map001.json')) {
          return JSON.stringify({
            events: [
              null,
              {
                id: 1,
                pages: [
                  {
                    list: [
                      { code: 101, indent: 0, parameters: ['Event 1', 0, 0, 2] },
                      { code: 0 }
                    ]
                  }
                ]
              }
            ]
          })
        }
        if (filePath.includes('CommonEvents.json')) {
          return JSON.stringify([
            null,
            {
              id: 1,
              list: [
                { code: 101, indent: 0, parameters: ['Common 1', 0, 0, 2] },
                { code: 0 }
              ]
            }
          ])
        }
        throw new Error('Unexpected read: ' + filePath)
      })

      let exportedCount = 0
      const exportedPaths = []
      writeFileSyncStub.callsFake(function (filePath, content) {
        exportedCount++
        exportedPaths.push(filePath)
        return filePath
      })

      // Execute command
      Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT', [
        'examples/auto-manifest.json',
        'data',
        'ja',
        'ja',
        'text',
        true
      ])

      // Debug output
      console.log('Read calls:', readCallCount)
      console.log('Exported count:', exportedCount)
      console.log('Exported paths:', exportedPaths)
      console.log('Messages:', $gameMessage._texts)

      // Verify files were written
      expect(exportedCount).to.be.greaterThanOrEqual(2, 'Expected at least 2 files to be written, got ' + exportedCount)

      console.log('Batch export test passed')
    })

    it('should handle errors gracefully during batch export', function () {
      // Setup manifest with invalid entry
      const manifest = {
        version: 1,
        entries: [
          {
            kind: 'event',
            mapId: '999', // Non-existent map
            eventId: '1',
            pageId: '1',
            locale: 'ja',
            sourceLocale: 'ja',
            key: 'map999_event001_page1',
            textPath: 'text/ja/map999_event001_page1.txt'
          }
        ]
      }

      existsSyncStub.returns(true)
      readFileSyncStub.callsFake(function (filePath, encoding) {
        if (filePath.includes('auto-manifest.json')) {
          return JSON.stringify(manifest)
        }
        if (filePath.includes('Map999.json')) {
          throw new Error('File not found')
        }
        throw new Error('Unexpected read: ' + filePath)
      })

      writeFileSyncStub.returns(undefined)

      // Execute command
      Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT', [
        'examples/auto-manifest.json',
        'data',
        'ja',
        'ja',
        'text'
      ])

      // Verify error was handled gracefully (should not throw, but add error message)
      const hasErrorMsg = $gameMessage._texts.some(m => m.includes('Error') || m.includes('error')) || 
                           consoleErrorStub.called
      expect(hasErrorMsg).to.be.true

      console.log('Error handling test passed')
    })
  })

  describe('Default parameters', function () {
    it('should use default values when parameters are not specified', function () {
      const manifest = {
        version: 1,
        entries: []
      }

      existsSyncStub.returns(true)
      readFileSyncStub.withArgs(sinon.match(/examples\/auto-manifest\.json$/), 'utf8').returns(JSON.stringify(manifest))

      writeFileSyncStub.returns(undefined)

      // Execute command with no optional parameters
      Game_Interpreter.prototype.pluginCommandFrame2Text('BATCH_EXPORT', [
        'examples/auto-manifest.json'
        // DataDir, Locale, SourceLocale, TextBase omitted - should use defaults
      ])

      // Verify command was executed (no error thrown)
      expect($gameMessage._texts.length).to.be.greaterThan(0)

      console.log('Default parameters test passed')
    })
  })
})
