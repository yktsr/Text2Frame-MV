const { expect } = require('chai')
const { faceEdit, audioEdit, audioFolderOf, hasFaceTag, characterEdit, pictureEdit, hasCharacterTag, hasPictureTag } = require('../out/db/assetEdit')

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

describe('assetEdit: キャラ画像とピクチャ', function () {
  it('replaces the image and the number of a move-route image change', function () {
    expect(characterEdit('<ChangeImage: Actor1, 2>', 'People1', 5))
      .to.eql({ kind: 'replace', text: '<ChangeImage: People1, 5>' })
    expect(characterEdit('<画像の変更: Actor1, 2>', 'People1', 0))
      .to.eql({ kind: 'replace', text: '<画像の変更: People1, 0>' })
  })

  it('adds the tag when the line has none', function () {
    expect(characterEdit('こんにちは', 'People1', 3)).to.eql({ kind: 'insert', text: '<ChangeImage: People1, 3>' })
    expect(hasCharacterTag('<ChangeImage: Actor1, 2>')).to.equal(true)
    expect(hasCharacterTag('こんにちは')).to.equal(false)
  })

  it('replaces only the name of a picture, keeping the number and the options', function () {
    expect(pictureEdit('<ShowPicture: 3, Castle, Scale[50][55]>', 'Sea'))
      .to.eql({ kind: 'replace', text: '<ShowPicture: 3, Sea, Scale[50][55]>' })
    expect(pictureEdit('<SP: 2, Castle>', 'Sea')).to.eql({ kind: 'replace', text: '<SP: 2, Sea>' })
    expect(pictureEdit('<ピクチャの表示: 1, Castle, 位置[中央][10][20]>', '海'))
      .to.eql({ kind: 'replace', text: '<ピクチャの表示: 1, 海, 位置[中央][10][20]>' })
  })

  it('adds a picture tag with number 1 when the line has none', function () {
    expect(pictureEdit('こんにちは', 'Sea')).to.eql({ kind: 'insert', text: '<ShowPicture: 1, Sea>' })
    expect(hasPictureTag('<ShowPicture: 3, Castle>')).to.equal(true)
    expect(hasPictureTag('<PlayBGM: Theme1>')).to.equal(false)
  })
})
