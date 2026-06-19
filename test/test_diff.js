const chai = require('chai')
const expect = chai.expect

const text2frame = require('../Text2Frame.js')
const compile = text2frame.compile
const applyDiff = text2frame.applyDiff

describe('Diff (applyDiff) Test', function () {
  // Helper: produce a standard Show Message block
  const msgBlock = function (text) {
    return [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: [text] }
    ]
  }
  const bottom = { code: 0, indent: 0, parameters: [] }

  it('No change: identical input and existing produces same output', function () {
    const text = 'Hello'
    const existing = msgBlock('Hello').concat([bottom])
    const new_commands = compile(text).concat([bottom])
    const result = applyDiff(existing, new_commands)
    expect(result.warnings).to.have.lengthOf(0)
    expect(result.commands.concat([bottom])).to.eql(existing)
  })

  it('Add block: new block in text is added after existing block', function () {
    const text = 'Hello\n\nGoodbye'
    const existing = msgBlock('Hello').concat([bottom])
    const new_commands = compile(text).concat([bottom])
    const result = applyDiff(existing, new_commands)
    expect(result.warnings).to.have.lengthOf(0)
    const expected = msgBlock('Hello').concat(msgBlock('Goodbye')).concat([bottom])
    expect(result.commands.concat([bottom])).to.eql(expected)
  })

  it('Modify block: changed block in text replaces the old block', function () {
    const text = 'Hi\n\nGoodbye'
    const existing = msgBlock('Hello').concat(msgBlock('Goodbye')).concat([bottom])
    const new_commands = compile(text).concat([bottom])
    const result = applyDiff(existing, new_commands)
    // "Hello" block removed → 1 warning; "Hi" block added
    expect(result.warnings).to.have.lengthOf(1)
    const expected = msgBlock('Hi').concat(msgBlock('Goodbye')).concat([bottom])
    expect(result.commands.concat([bottom])).to.eql(expected)
  })

  it('Remove block: block absent from text is removed with a warning', function () {
    const text = 'Goodbye'
    const existing = msgBlock('Hello').concat(msgBlock('Goodbye')).concat([bottom])
    const new_commands = compile(text).concat([bottom])
    const result = applyDiff(existing, new_commands)
    expect(result.warnings).to.have.lengthOf(1)
    expect(result.warnings[0]).to.include('Block removed')
    const expected = msgBlock('Goodbye').concat([bottom])
    expect(result.commands.concat([bottom])).to.eql(expected)
  })

  it('Empty existing: applying diff to empty event list adds all new blocks', function () {
    const text = 'Hello\n\nGoodbye'
    const existing = [bottom]
    const new_commands = compile(text).concat([bottom])
    const result = applyDiff(existing, new_commands)
    expect(result.warnings).to.have.lengthOf(0)
    const expected = msgBlock('Hello').concat(msgBlock('Goodbye')).concat([bottom])
    expect(result.commands.concat([bottom])).to.eql(expected)
  })

  it('Empty new text: all existing blocks are removed with warnings', function () {
    const text = ''
    const existing = msgBlock('Hello').concat(msgBlock('Goodbye')).concat([bottom])
    const new_commands = compile(text).concat([bottom])
    const result = applyDiff(existing, new_commands)
    expect(result.warnings).to.have.lengthOf(2)
    expect(result.commands).to.have.lengthOf(0)
  })

  it('Multiple adds: several new blocks are all added', function () {
    const text = 'A\n\nB\n\nC'
    const existing = msgBlock('B').concat([bottom])
    const new_commands = compile(text).concat([bottom])
    const result = applyDiff(existing, new_commands)
    expect(result.warnings).to.have.lengthOf(0)
    const expected = msgBlock('A').concat(msgBlock('B')).concat(msgBlock('C')).concat([bottom])
    expect(result.commands.concat([bottom])).to.eql(expected)
  })

  it('Preserves non-message commands: wait command in existing is removed if not in new', function () {
    const waitCmd = { code: 230, indent: 0, parameters: [60] }
    const text = 'Hello'
    const existing = msgBlock('Hello').concat([waitCmd, bottom])
    const new_commands = compile(text).concat([bottom])
    const result = applyDiff(existing, new_commands)
    // wait command not in new text → it's a removed block
    expect(result.warnings).to.have.lengthOf(1)
    const expected = msgBlock('Hello').concat([bottom])
    expect(result.commands.concat([bottom])).to.eql(expected)
  })
})
