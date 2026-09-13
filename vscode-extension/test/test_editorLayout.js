const { expect } = require('chai')
const { isDirectlyBelow } = require('../out/editorLayout')

const HORIZONTAL = 0
const VERTICAL = 1

describe('editorLayout', function () {
  it('tells a group right below another', function () {
    const textOverPreview = { orientation: HORIZONTAL, groups: [{ groups: [{}, {}] }, {}] }
    expect(isDirectlyBelow(textOverPreview, 1, 2, 3)).to.equal(true)
    expect(isDirectlyBelow(textOverPreview, 2, 3, 3)).to.equal(false)
    expect(isDirectlyBelow(textOverPreview, 2, 1, 3)).to.equal(false)
    const gameThenStack = { orientation: HORIZONTAL, groups: [{}, { groups: [{}, {}] }] }
    expect(isDirectlyBelow(gameThenStack, 2, 3, 3)).to.equal(true)
    expect(isDirectlyBelow({ orientation: VERTICAL, groups: [{}, {}, {}] }, 2, 3, 3)).to.equal(true)
  })

  it('does not count a group under two side by side', function () {
    const underBoth = { orientation: VERTICAL, groups: [{ groups: [{}, {}] }, {}] }
    expect(isDirectlyBelow(underBoth, 1, 3, 3)).to.equal(false)
    expect(isDirectlyBelow(underBoth, 2, 3, 3)).to.equal(false)
    expect(isDirectlyBelow({ orientation: HORIZONTAL, groups: [{}, {}] }, 1, 2, 2)).to.equal(false)
  })

  it('gives up when the layout does not match the groups', function () {
    expect(isDirectlyBelow(undefined, 1, 2, 2)).to.equal(undefined)
    expect(isDirectlyBelow({ orientation: VERTICAL, groups: [{}, {}] }, 1, 2, 3)).to.equal(undefined)
  })
})
