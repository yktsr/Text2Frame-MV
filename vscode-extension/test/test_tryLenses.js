const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

/* テキストのいちばん上に出す行。
 *
 * 行が長いと、どれを押せばよいか分からなくなる(報告でもそう言われた)。だから出すのは
 * いちばんよく使う2つだけで、**その数をここで固定する**。足したくなったら、ここが落ちる。
 *
 * 画面を作る側(tryEvent.ts)は vscode を読み込むので呼べないが、こちらは呼べる。 */
const { lensesFor } = require('../out/tryLenses')
const { setJapanese } = require('../out/db/lang')

const titles = function (meta) { return lensesFor(meta).map(function (one) { return one.title }) }

describe('the row above a text', function () {
    afterEach(function () { setJapanese(true) })

    it('offers the test play and running this page', function () {
        expect(titles({ mapId: '1', eventId: '2', pageId: '1' })).to.eql(['▶ このページをすぐ実行', '▶ テストプレイ'])
    })

    it('offers the test play and running it for a common event', function () {
        expect(titles({ kind: 'common', commonEventId: '3' })).to.eql(['▶ すぐ実行', '▶ テストプレイ'])
    })

    /* 行を増やすのはここの判断。黙って増えないように数を固定する。 */
    it('keeps the row to two', function () {
        expect(lensesFor({ mapId: '1', eventId: '2' })).to.have.lengthOf(2)
        expect(lensesFor({ kind: 'common', commonEventId: '3' })).to.have.lengthOf(2)
    })

    /* 「イベントの前に立つ」は「操作」パネルと一覧の右クリックに残してある。
     * ここに戻すなら、それは判断として行う(黙って戻らないように固定する)。 */
    it('does not offer standing in front of the event', function () {
        lensesFor({ mapId: '1', eventId: '2' }).forEach(function (one) {
            expect(one.mode).to.not.equal('stand')
        })
    })

    it('says nothing when the text does not say where it goes', function () {
        expect(lensesFor({})).to.eql([])
        expect(lensesFor({ mapId: '1' })).to.eql([])
        expect(lensesFor({ kind: 'common' })).to.eql([])
    })

    /* 試し方を渡すものと渡さないものがある。テストプレイは引数を取らない。 */
    it('passes a way to try only to the command that takes one', function () {
        const row = lensesFor({ mapId: '1', eventId: '2' })

        expect(row[0]).to.include({ command: 'text2frame.tryEvent', mode: 'run' })
        expect(row[1].command).to.equal('text2frame.testPlay')
        expect(row[1].mode).to.equal(undefined)
    })

    it('writes the row in English too', function () {
        setJapanese(false)

        expect(titles({ mapId: '1', eventId: '2' })).to.eql(['▶ Run this page now', '▶ Test play'])
    })

    /* 押す先のコマンドが実在すること。名前を間違えると、押しても何も起きない。 */
    it('points at commands the extension declares', function () {
        const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'))
        const declared = manifest.contributes.commands.map(function (one) { return one.command })
        const used = lensesFor({ mapId: '1', eventId: '2' }).concat(lensesFor({ kind: 'common', commonEventId: '1' }))

        used.forEach(function (one) {
            expect(declared, one.command + ' というコマンドはありません').to.include(one.command)
        })
    })
})
