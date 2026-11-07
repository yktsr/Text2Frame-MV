const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

/* セーブの一覧に出す文字と、再開したときの答えの言い換え。
 *
 * **答えの名前を取り違えると、利用者には生の英単語がそのまま出る。** 言い換えの表は人が書くので、
 * ゲーム側が返しうる名前と機械で突き合わせる。注入するスクリプトに4つめの答えを足したら、
 * ここが落ちて気づける。
 *
 * 画面を作る側(saveFiles.ts)は vscode を読み込むのでテストから呼べないが、こちらは呼べる
 * (settingsLinks / mcpRoots と同じ分け方)。 */
const { LOAD_RESULTS, loadWording, loadMessage, slotLine } = require('../out/saveWording')
const { setJapanese } = require('../out/db/lang')

/** ゲームが答えとして入れうる名前。注入するスクリプトから拾う。 */
const answersInGame = function () {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'liveMonitor.ts'), 'utf8')
    const out = new Set()
    const re = /loadResult\s*=\s*'([^']+)'/g
    let m
    while ((m = re.exec(source)) !== null) out.add(m[1])
    return Array.from(out)
}

describe('what the save list and the answers say', function () {
    afterEach(function () { setJapanese(true) })

    it('has wording for every answer the game can give', function () {
        const found = answersInGame()

        expect(found, '答えを入れている所が見つかりません(探し方が壊れたかも)').to.not.eql([])
        found.forEach(function (name) {
            expect(LOAD_RESULTS, name + ' の言い換えがありません').to.include(name)
        })
    })

    /* 逆も見る。使われない言い換えが残っていると、直したつもりが直っていない。 */
    it('has no wording for an answer that cannot happen', function () {
        const found = answersInGame()

        LOAD_RESULTS.forEach(function (name) {
            expect(found, name + 'という答えはゲームから来ません').to.include(name)
        })
    })

    it('says of every answer whether it worked', function () {
        const told = loadWording()

        LOAD_RESULTS.forEach(function (name) {
            expect(told[name], name).to.be.an('object')
            expect(told[name].ok, name).to.be.a('boolean')
            expect(told[name].text, name).to.be.a('string').and.not.equal('')
        })
        expect(told.loaded.ok).to.equal(true)
        expect(told.noSave.ok).to.equal(false)
    })

    it('writes the answers in English too', function () {
        setJapanese(false)

        expect(loadWording().loaded.text).to.equal('Resumed from the save.')
    })

    /* **読めなかった理由は、ゲームしか知らない。** 添えないと「読めませんでした」だけが
     * 残り、セーブが壊れているのか、プラグインを入れ替えて古いセーブが使えなくなったのかが
     * 分からない。 */
    describe('what it says when a save will not load', function () {
        it('adds the reason the game gave', function () {
            const told = loadMessage('failed', 'クラス Window_Hoge がありません')

            expect(told.ok).to.equal(false)
            expect(told.text).to.contain('セーブを読めませんでした。')
            expect(told.text).to.contain('クラス Window_Hoge がありません')
        })

        it('says only the answer when the game gave no reason', function () {
            expect(loadMessage('failed').text).to.equal('セーブを読めませんでした。')
        })

        /* うまくいったときに理由を添えると、読んだ人は失敗したと思う。 */
        it('never adds a reason to an answer that worked', function () {
            const told = loadMessage('loaded', 'なにか')

            expect(told.ok).to.equal(true)
            expect(told.text).to.equal('セーブから再開しました。')
        })

        /* 知らない答えは、黙って捨てずにそのまま見せる(次に足した答えが消えない)。 */
        it('shows an answer it does not know as it came', function () {
            expect(loadMessage('somethingNew').text).to.equal('somethingNew')
        })

        /* ブラウザには無い機能が理由なら、動かす場所が違うだけなので、そう言って
         * 選び方を案内する。**どのプラグインとは言わない** ── プラグインは悪くない。 */
        it('points at the chooser when a browser cannot run what the game used', function () {
            const told = loadMessage('failed', 'require is not defined')

            expect(told.ok).to.equal(false)
            expect(told.text).to.contain('ツクール本体の中でだけ動くプラグイン')
            expect(told.text, '選び方を案内してください').to.contain('テストプレイで切るプラグインを選ぶ')
        })

        /* 別の理由のときに「ブラウザでは動きません」と言うと嘘になる。 */
        it('says nothing about plugins when the reason is something else', function () {
            const told = loadMessage('failed', 'セーブが壊れています')

            expect(told.text).to.contain('セーブが壊れています')
            expect(told.text).to.not.contain('プラグイン')
        })

        it('adds the reason in English too', function () {
            setJapanese(false)

            expect(loadMessage('failed', 'broken').text).to.equal('Could not read the save. The game said: broken')
        })
    })

    describe('a line of the list', function () {
        const when = function () { return '2026-11-02 01:00' }

        it('shows the slot, the playtime and when it was saved', function () {
            const line = slotLine({ slot: 2, playtime: '01:23:45', at: 1762000000000 }, when)

            expect(line.slot).to.equal(2)
            expect(line.label).to.equal('2 番')
            expect(line.description).to.equal('01:23:45・2026-11-02 01:00')
        })

        /* 遊んだ時間も日時も無いセーブはありうる(古いセーブ、別の作りのゲーム)。 */
        it('leaves the second line empty when the game said nothing about it', function () {
            const line = slotLine({ slot: 1 }, when)

            expect(line.description).to.equal('')
            expect(line.detail).to.equal(undefined)
        })

        it('joins the two with a space in English', function () {
            setJapanese(false)

            const line = slotLine({ slot: 3, playtime: '00:10:00', at: 1762000000000 }, when)

            expect(line.label).to.equal('Slot 3')
            expect(line.description).to.equal('00:10:00 · 2026-11-02 01:00')
        })
    })
})
