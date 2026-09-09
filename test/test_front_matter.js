const chai = require('chai')
const expect = chai.expect

const text2frame = require('../Text2Frame.js')

describe('Front matter compatibility Test', function () {
  it('compile ignores YAML front matter header', function () {
    const text = [
      '---',
      'kind: event',
      'mapId: 1',
      'eventId: 1',
      'pageId: 1',
      '---',
      '<Face: (0)><Background: Window><WindowPosition: Bottom>',
      'Hello'
    ].join('\n')

    const commands = text2frame.compile(text)
    const hasMessageLine = commands.some(function (c) {
      return c.code === 401 && c.parameters && c.parameters[0] === 'Hello'
    })
    expect(hasMessageLine).to.equal(true)
  })
})
