const chai = require('chai')
const expect = chai.expect

const text2frame = require('../Text2Frame.js')
const applyOverlay = text2frame.applyOverlay

const bottom = { code: 0, indent: 0, parameters: [] }
const find = function (cmds, code) { return cmds.find(function (c) { return c.code === code }) }
const all = function (cmds, code) { return cmds.filter(function (c) { return c.code === code }) }

describe('Overlay (applyOverlay) Test', function () {
  it('replaces message text but keeps non-conversation commands and face', function () {
    const existing = [
      { code: 101, indent: 0, parameters: ['face1', 2, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['こんにちは'] },
      { code: 121, indent: 0, parameters: [1, 1, 0, 0] }, // switch (non-conversation)
      { code: 205, indent: 0, parameters: [-1, { list: [{ code: 0 }], repeat: false, skippable: false, wait: false }] },
      bottom
    ]
    const text = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['Hello'] },
      bottom
    ]
    const res = applyOverlay(existing, text)
    expect(find(res.commands, 401).parameters[0]).to.equal('Hello') // translated
    expect(find(res.commands, 101).parameters[0]).to.equal('face1') // face preserved (structure)
    expect(find(res.commands, 121)).to.not.equal(undefined) // switch preserved
    expect(find(res.commands, 205)).to.not.equal(undefined) // movement route preserved
    expect(res.warnings).to.have.lengthOf(0)
  })

  it('overlays choice labels and rebuilds the ShowChoices(102) array', function () {
    const existing = [
      { code: 102, indent: 0, parameters: [['はい', 'いいえ'], 1, 0, 2, 0] },
      { code: 402, indent: 0, parameters: [0, 'はい'] },
      { code: 401, indent: 1, parameters: ['はい本文'] },
      { code: 402, indent: 0, parameters: [1, 'いいえ'] },
      { code: 401, indent: 1, parameters: ['いいえ本文'] },
      { code: 404, indent: 0, parameters: [] },
      bottom
    ]
    const text = [
      { code: 102, indent: 0, parameters: [['Yes', 'No'], 1, 0, 2, 0] },
      { code: 402, indent: 0, parameters: [0, 'Yes'] },
      { code: 401, indent: 1, parameters: ['Yes body'] },
      { code: 402, indent: 0, parameters: [1, 'No'] },
      { code: 401, indent: 1, parameters: ['No body'] },
      { code: 404, indent: 0, parameters: [] },
      bottom
    ]
    const res = applyOverlay(existing, text)
    expect(find(res.commands, 102).parameters[0]).to.eql(['Yes', 'No']) // display array rebuilt
    expect(all(res.commands, 402).map(function (c) { return c.parameters[1] })).to.eql(['Yes', 'No'])
    expect(all(res.commands, 401).map(function (c) { return c.parameters[0] })).to.eql(['Yes body', 'No body'])
    expect(res.warnings).to.have.lengthOf(0)
  })

  it('overlays the speaker name (101 param[4]) on MZ 5-param messages', function () {
    const existing = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, 'アリス'] },
      { code: 401, indent: 0, parameters: ['やあ'] },
      bottom
    ]
    const text = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, 'Alice'] },
      { code: 401, indent: 0, parameters: ['Hi'] },
      bottom
    ]
    const res = applyOverlay(existing, text)
    expect(find(res.commands, 101).parameters[4]).to.equal('Alice')
    expect(find(res.commands, 401).parameters[0]).to.equal('Hi')
  })

  it('does not add a name slot to MV 4-param messages (keeps arity)', function () {
    const existing = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2] }, // MV: no name slot
      { code: 401, indent: 0, parameters: ['やあ'] },
      bottom
    ]
    const text = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, 'Alice'] },
      { code: 401, indent: 0, parameters: ['Hi'] },
      bottom
    ]
    const res = applyOverlay(existing, text)
    expect(find(res.commands, 101).parameters).to.have.lengthOf(4) // still MV 4-param
    expect(find(res.commands, 401).parameters[0]).to.equal('Hi')
  })

  it('keeps original text and warns when the translation has fewer conversation units (LCS)', function () {
    const existing = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['一つ目'] },
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['二つ目'] },
      bottom
    ]
    const text = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['First'] },
      bottom
    ]
    const res = applyOverlay(existing, text)
    const texts = all(res.commands, 401).map(function (c) { return c.parameters[0] })
    // best-effort LCS: one slot gets the translation, the other keeps its original; warn on the unmatched.
    expect(texts).to.have.lengthOf(2)
    expect(texts).to.include('First')
    expect(texts.some(function (t) { return t === '一つ目' || t === '二つ目' })).to.equal(true)
    expect(res.warnings.length).to.be.greaterThan(0)
  })
})
