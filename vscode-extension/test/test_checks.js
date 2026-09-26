const { expect } = require('chai')
const { basicProblems, audioRefs, audioBaseName } = require('../out/db/checks')

describe('checks', function () {
  it('reports unclosed and empty tags', function () {
    expect(basicProblems(['<Switch: 1, ON', 'ok', '<>', '<Wait: 60>']).map((p) => [p.line, p.code, p.severity])).to.eql([
      [0, 'unclosed', 'error'],
      [2, 'empty-tag', 'warning']
    ])
  })

  it('reads the audio names of play tags, and skips none', function () {
    expect(audioRefs('<PlayBGM: Theme1, 90, 100, 0>')).to.eql([{ folder: 'bgm', name: 'Theme1', start: 10, end: 16 }])
    expect(audioRefs('<SEの演奏: Door4>')[0]).to.include({ folder: 'se', name: 'Door4' })
    expect(audioRefs('<PlayME: Victory1, 90>')[0].folder).to.equal('me')
    expect(audioRefs('<PlayBGS:  River >')[0]).to.include({ name: 'River', start: 11 })
    expect(audioRefs('<PlayBGM: None>')).to.eql([])
    expect(audioRefs('<PlayBGM: なし>')).to.eql([])
    expect(audioRefs('<StopBGM>')).to.eql([])
  })

  it('strips audio extensions, also the encrypted ones', function () {
    expect(audioBaseName('Theme1.ogg')).to.equal('Theme1')
    expect(audioBaseName('Theme1.ogg_')).to.equal('Theme1')
    expect(audioBaseName('Door.rpgmvo')).to.equal('Door')
    expect(audioBaseName('notes.txt')).to.equal(undefined)
  })
})
