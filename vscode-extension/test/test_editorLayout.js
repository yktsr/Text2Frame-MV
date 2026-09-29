const { expect } = require('chai')
const { isNextTo } = require('../out/editorLayout')

const HORIZONTAL = 0
const VERTICAL = 1

describe('editorLayout', function () {
  it('tells a group right below another', function () {
    const textOverPreview = { orientation: HORIZONTAL, groups: [{ groups: [{}, {}] }, {}] }
    expect(isNextTo(textOverPreview, 1, 2, 3, 'below')).to.equal(true)
    expect(isNextTo(textOverPreview, 2, 3, 3, 'below')).to.equal(false)
    expect(isNextTo(textOverPreview, 2, 1, 3, 'below')).to.equal(false)
    const gameThenStack = { orientation: HORIZONTAL, groups: [{}, { groups: [{}, {}] }] }
    expect(isNextTo(gameThenStack, 2, 3, 3, 'below')).to.equal(true)
    expect(isNextTo({ orientation: VERTICAL, groups: [{}, {}, {}] }, 2, 3, 3, 'below')).to.equal(true)
  })

  it('does not count a group under two side by side', function () {
    const underBoth = { orientation: VERTICAL, groups: [{ groups: [{}, {}] }, {}] }
    expect(isNextTo(underBoth, 1, 3, 3, 'below')).to.equal(false)
    expect(isNextTo(underBoth, 2, 3, 3, 'below')).to.equal(false)
    expect(isNextTo({ orientation: HORIZONTAL, groups: [{}, {}] }, 1, 2, 2, 'below')).to.equal(false)
  })

  it('tells a group right beside another', function () {
    expect(isNextTo({ orientation: HORIZONTAL, groups: [{}, {}, {}] }, 1, 2, 3, 'right')).to.equal(true)
    expect(isNextTo({ orientation: HORIZONTAL, groups: [{}, {}, {}] }, 1, 3, 3, 'right')).to.equal(false)
    expect(isNextTo({ orientation: VERTICAL, groups: [{}, {}] }, 1, 2, 2, 'right')).to.equal(false)
    const textOverPreview = { orientation: HORIZONTAL, groups: [{ groups: [{}, {}] }, {}] }
    expect(isNextTo(textOverPreview, 1, 3, 3, 'right')).to.equal(false)
    expect(isNextTo(textOverPreview, 1, 2, 3, 'right')).to.equal(false)
  })

  it('gives up when the layout does not match the groups', function () {
    expect(isNextTo(undefined, 1, 2, 2, 'below')).to.equal(undefined)
    expect(isNextTo({ orientation: VERTICAL, groups: [{}, {}] }, 1, 2, 3, 'below')).to.equal(undefined)
  })
})
