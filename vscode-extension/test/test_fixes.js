const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const T2F = require('../../Text2Frame.js')
const { findConflicts, resolveConflict, tagLikeName, knownTagNames, similarTagNames, replaceTagName, snippetBody, snippetWord, readSnippetFile, slashAt, CONFLICT_MARKERS } = require('../out/db/fixes')

const becomesText = (line) => {
  try {
    const cmds = T2F.compile(line.trim())
    return cmds.some((c) => c.code === 401 && c.parameters[0] === line.trim()) &&
      cmds.every((c) => c.code === 101 || (c.code === 401 && c.parameters[0] === line.trim()))
  } catch (e) {
    return false
  }
}

describe('fixes', function () {
  describe('conflicts', function () {
    const marker = (i) => ['<comment>', CONFLICT_MARKERS[i], '</comment>']
    const lines = ['前のセリフ'].concat(marker(0), ['', 'テキストの文', ''], marker(1), ['', 'ゲームの文', ''], marker(2), ['後のセリフ'])

    it('finds the three markers with the comment around them', function () {
      const [c] = findConflicts(lines)
      expect(c.units).to.eql([{ start: 1, end: 3 }, { start: 7, end: 9 }, { start: 13, end: 15 }])
    })

    it('keeps one side, or both without the markers', function () {
      const [c] = findConflicts(lines)
      expect(resolveConflict(lines, c, 'text')).to.eql({ start: 1, end: 15, lines: ['', 'テキストの文', ''] })
      expect(resolveConflict(lines, c, 'game').lines).to.eql(['', 'ゲームの文', ''])
      expect(resolveConflict(lines, c, 'both').lines).to.eql(['', 'テキストの文', '', '', 'ゲームの文', ''])
    })

    it('ignores markers that are out of order or incomplete', function () {
      expect(findConflicts([CONFLICT_MARKERS[1], CONFLICT_MARKERS[0], CONFLICT_MARKERS[2]])).to.eql([])
      expect(findConflicts([CONFLICT_MARKERS[0], 'x', CONFLICT_MARKERS[1]])).to.eql([])
      expect(findConflicts([CONFLICT_MARKERS[0], 'a', CONFLICT_MARKERS[1], 'b', CONFLICT_MARKERS[2]])[0].units).to.eql([{ start: 0, end: 0 }, { start: 2, end: 2 }, { start: 4, end: 4 }])
    })
  })

  describe('unknown tags', function () {
    it('reads the tag name only from a line that is a single tag', function () {
      expect(tagLikeName('<Fase: Actor1(0)>')).to.equal('Fase')
      expect(tagLikeName('  <Wiat>  ')).to.equal('Wiat')
      expect(tagLikeName('<Face: Actor1(0)>こんにちは')).to.equal(undefined)
      expect(tagLikeName('こんにちは')).to.equal(undefined)
      expect(tagLikeName('</comment>')).to.equal(undefined)
    })

    it('knows the tag names from the help, and suggests close ones that compile', function () {
      const names = knownTagNames()
      expect(names).to.include.members(['Face', 'ShowChoices', 'PlayBGM', '顔'])
      expect(similarTagNames('Fase')).to.include('Face')
      expect(similarTagNames('Swich')).to.include('Switch')
      expect(similarTagNames('PlayBMG')).to.include('PlayBGM')
      expect(similarTagNames('Face')).not.to.include('Face')
      expect(becomesText('<Fase: Actor1(0)>')).to.equal(true)
      expect(becomesText(replaceTagName('<Fase: Actor1(0)>', 'Face'))).to.equal(false)
      expect(replaceTagName('  <Swich: 1, ON>', 'Switch')).to.equal('  <Switch: 1, ON>')
    })

    it('does not flag the tags the compiler knows', function () {
      for (const line of ['<Face: Actor1(0)>', '<Switch: 1, ON>', '<Wait: 60>', '<PlayBGM: Theme1, 90, 100, 0>', '<br>', '<顔: Actor1(0)>']) {
        expect(becomesText(line), line).to.equal(false)
      }
    })
  })

  describe('snippets', function () {
    it('escapes what a snippet would read as a placeholder', function () {
      expect(snippetBody('<Set: 1, 10>\r\n\\V[1] は $100}')).to.eql(['<Set: 1, 10>', '\\\\V[1] は \\$100\\}'])
    })

    it('reads the word, and the slash only at the start of a line', function () {
      expect(snippetWord(' /あいさつ ')).to.equal('あいさつ')
      expect(slashAt('/選')).to.eql({ start: 0, word: '選' })
      expect(slashAt('  /')).to.eql({ start: 2, word: '' })
      expect(slashAt('選択肢')).to.equal(undefined)
      expect(slashAt('今日は /選')).to.equal(undefined)
      expect(slashAt('<If: V[1], /, 2>')).to.equal(undefined)
    })

    it('reads a snippet file and skips what does not fit', function () {
      const defs = readSnippetFile({ a: { prefix: '/あ', body: ['x'], description: 'd' }, b: { body: 'y' }, c: { prefix: 'c' }, d: 3 }, true)
      expect(defs).to.eql([
        { name: 'a', words: ['あ'], body: ['x'], description: 'd', user: true },
        { name: 'b', words: ['b'], body: ['y'], description: '', user: true }
      ])
      expect(readSnippetFile([], false)).to.eql([])
    })

    it('ships snippets whose default text compiles', function () {
      const file = path.join(__dirname, '..', 'snippets', 'defaults.json')
      const snippets = JSON.parse(fs.readFileSync(file, 'utf8'))
      for (const [name, s] of Object.entries(snippets)) {
        expect(s.prefix.every((p) => !p.startsWith('/')), name).to.equal(true)
        const text = s.body.join('\n')
          .replace(/\$\{\d+\|([^,|]+)[^}]*\|\}/g, '$1')
          .replace(/\$\{\d+:([^}]*)\}/g, '$1')
          .replace(/\$\d+/g, '')
        expect(() => T2F.compile(text), name).not.to.throw()
        for (const line of text.split('\n').filter((l) => /^\s*</.test(l))) expect(becomesText(line), name + ': ' + line).to.equal(false)
      }
    })
  })
})
