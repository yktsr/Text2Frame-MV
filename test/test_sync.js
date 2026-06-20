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
    'DisplayMsg': 'true',
    'DisplayWarning': 'true',
    'EnglishTag': 'true'
  }
}

const frame2text = require('../Frame2Text.js')
const applySyncDiff = frame2text.applySyncDiff

describe('Sync (applySyncDiff) Test', function () {
  it('No existing paragraphs: returns all new paragraphs', function () {
    const old_paragraphs = []
    const new_paragraphs = ['Hello', 'Goodbye']
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    expect(result.warnings).to.have.lengthOf(0)
    expect(result.paragraphs).to.eql(['Hello', 'Goodbye'])
  })

  it('No change: identical old and new paragraphs produce same output', function () {
    const old_paragraphs = ['Hello', 'Goodbye']
    const new_paragraphs = ['Hello', 'Goodbye']
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    expect(result.warnings).to.have.lengthOf(0)
    expect(result.paragraphs).to.eql(['Hello', 'Goodbye'])
  })

  it('Add paragraph: new paragraph is appended after existing', function () {
    const old_paragraphs = ['Hello']
    const new_paragraphs = ['Hello', 'Goodbye']
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    expect(result.warnings).to.have.lengthOf(0)
    expect(result.paragraphs).to.eql(['Hello', 'Goodbye'])
  })

  it('Add paragraph at start: new paragraph appears at the beginning', function () {
    const old_paragraphs = ['Goodbye']
    const new_paragraphs = ['Hello', 'Goodbye']
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    expect(result.warnings).to.have.lengthOf(0)
    expect(result.paragraphs).to.eql(['Hello', 'Goodbye'])
  })

  it('Remove paragraph: missing paragraph is removed with warning', function () {
    const old_paragraphs = ['Hello', 'Goodbye']
    const new_paragraphs = ['Goodbye']
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    expect(result.warnings).to.have.lengthOf(1)
    expect(result.warnings[0]).to.include('Block removed')
    expect(result.paragraphs).to.eql(['Goodbye'])
  })

  it('Modify paragraph: changed paragraph is replaced with new content', function () {
    const old_paragraphs = ['Hello', 'Goodbye']
    const new_paragraphs = ['Hi', 'Goodbye']
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    // 'Hello' is removed (warning), 'Hi' is added
    expect(result.warnings).to.have.lengthOf(1)
    expect(result.paragraphs).to.eql(['Hi', 'Goodbye'])
  })

  it('All removed: all existing paragraphs removed with warnings when new is empty', function () {
    const old_paragraphs = ['Hello', 'Goodbye']
    const new_paragraphs = []
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    expect(result.warnings).to.have.lengthOf(2)
    expect(result.paragraphs).to.have.lengthOf(0)
  })

  it('Preserves original paragraph text for unchanged blocks', function () {
    // The original paragraph has extra whitespace/formatting that round-tripping
    // through decompile would lose. The sync should keep the original text.
    const old_paragraphs = ['Hello', 'Middle', 'Goodbye']
    const new_paragraphs = ['Hello', 'Middle', 'Goodbye']
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    expect(result.warnings).to.have.lengthOf(0)
    // Should return the exact same paragraph objects (the originals)
    expect(result.paragraphs).to.eql(old_paragraphs)
  })

  it('Multiple additions: several new paragraphs added in correct positions', function () {
    const old_paragraphs = ['B']
    const new_paragraphs = ['A', 'B', 'C']
    const result = applySyncDiff(old_paragraphs, new_paragraphs)
    expect(result.warnings).to.have.lengthOf(0)
    expect(result.paragraphs).to.eql(['A', 'B', 'C'])
  })
})
