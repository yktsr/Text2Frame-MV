const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

/* 変換を呼ぶときは、どのゲームの話かを渡していること。
 *
 * タグを省いて書かれたテキストに何を補うかは、そのゲームの Text2Frame の設定が決める
 * (ツクール側で既定の背景を透明にしている人がいる)。渡さないと出荷時の既定で補われ、
 * **透明のウィンドウが黙ってウィンドウに倒れる**。渡し忘れても例外は出ず、結果だけが
 * 静かに変わるので、呼び出しを機械で数える。
 *
 * 渡す値は path.dirname(dataDir)。js/plugins.js は data/ の隣にあり、data のフォルダは
 * 設定 text2frame.dataDir で動かせるので、ワークスペースのフォルダとは一致しないことがある。 */
const srcDir = path.resolve(__dirname, '..', 'src')

/** 補う値が効く呼び出し。これを見つけたら gameRoot が要る。 */
const CALLS = [/\.compile\s*\(/, /\.decompile\s*\(/, /\.buildPullText\s*\(/]

/* 本体に渡す opts を**組んでいる**所。型の宣言や引数の名前は呼び出しではないので、
 * 「= {」で組み立てている行だけを見る。 */
const APPLY = /applyOpts[^=;]*=\s*\{/

/** 呼び出しは複数行に分かれるので、その行から数行を1つの塊として見る。 */
const WINDOW = 12

const files = function () {
    const out = []
    const walk = function (dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) walk(full)
            else if (entry.name.endsWith('.ts')) out.push(full)
        })
    }
    walk(srcDir)
    return out
}

/** gameRoot を渡していない呼び出し。見つけた場所を人が読める形で返す。 */
const missing = function (patterns) {
    const bad = []
    files().forEach(function (file) {
        const lines = fs.readFileSync(file, 'utf8').split('\n')
        lines.forEach(function (line, index) {
            if (!patterns.some(function (re) { return re.test(line) })) return
            // 宣言(interface の型)は呼び出しではない。
            if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
            if (/=>\s*(string|unknown|void)/.test(line)) return
            const block = lines.slice(index, index + WINDOW).join('\n')
            if (block.indexOf('gameRoot') === -1) {
                bad.push(path.relative(srcDir, file) + ':' + (index + 1) + '  ' + line.trim())
            }
        })
    })
    return bad
}

describe('telling the compiler which game it is', function () {
    it('passes the game folder on every compile, decompile and pull', function () {
        const bad = missing(CALLS)

        expect(bad, 'gameRoot を渡していません:\n  ' + bad.join('\n  ')).to.eql([])
    })

    it('passes the game folder with the options it hands to apply', function () {
        const bad = missing([APPLY])

        expect(bad, 'gameRoot を渡していません:\n  ' + bad.join('\n  ')).to.eql([])
    })

    /* 見つけ方が壊れていたら、何も見ずに緑になる。数えて確かめる。 */
    it('actually finds the calls it is looking for', function () {
        let found = 0
        files().forEach(function (file) {
            fs.readFileSync(file, 'utf8').split('\n').forEach(function (line) {
                if (CALLS.some(function (re) { return re.test(line) })) found++
            })
        })

        expect(found, '変換の呼び出しが見つかりません(探し方が壊れたかも)').to.be.greaterThan(4)
    })
})
