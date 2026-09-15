const { expect } = require('chai')
const { faceEdit, audioEdit, audioFolderOf, hasFaceTag } = require('../out/db/assetEdit')

describe('assetEdit', function () {
  it('replaces the face on the line, or adds a face line', function () {
    expect(faceEdit('<Face: Actor1(0)>', 'Actor2', 5)).to.eql({ kind: 'replace', text: '<Face: Actor2(5)>' })
    expect(faceEdit('  <顔: Actor1(0)>', 'People1', 2)).to.eql({ kind: 'replace', text: '  <顔: People1(2)>' })
    expect(faceEdit('こんにちは', 'Actor2', 5)).to.eql({ kind: 'insert', text: '<Face: Actor2(5)>' })
    expect(hasFaceTag('<FC: x(1)>')).to.equal(true)
  })

  it('replaces the audio name of the same kind, or adds a play line', function () {
    expect(audioEdit('<PlayBGM: Theme1, 90, 100, 0>', 'bgm', 'Battle1')).to.eql({ kind: 'replace', text: '<PlayBGM: Battle1, 90, 100, 0>' })
    expect(audioEdit('<SEの演奏: Door4 >', 'se', 'Cursor1')).to.eql({ kind: 'replace', text: '<SEの演奏: Cursor1 >' })
    expect(audioEdit('<PlayBGM: Theme1, 90, 100, 0>', 'se', 'Door4')).to.eql({ kind: 'insert', text: '<PlaySE: Door4, 90, 100, 0>' })
    expect(audioEdit('', 'me', 'Victory1')).to.eql({ kind: 'insert', text: '<PlayME: Victory1, 90, 100, 0>' })
    expect(audioFolderOf('<PlayBGS: River>')).to.equal('bgs')
    expect(audioFolderOf('セリフ')).to.equal(undefined)
  })
})
