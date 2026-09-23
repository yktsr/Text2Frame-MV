/*
 * Text2Frame-MV をライブラリとして使う例(CommonJS)。公開している関数をすべて使います。
 *
 *   npm install @yktsr/text2frame-mv
 *   node commonjs.js
 *
 * 前半はテキストとコマンド列だけで完結する関数、後半は小さなゲームのデータを
 * 一時フォルダに作り、ファイルを読み書きする関数を順に呼びます。実際のプロジェクトは触りません。
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const T2F = require('@yktsr/text2frame-mv') // テキスト -> イベント(反映)
const F2T = require('@yktsr/text2frame-mv/Frame2Text.js') // イベント -> テキスト(取り出し)

const show = function (title, value) {
  console.log('\n## ' + title)
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
}
const texts = function (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}

/* ---------- テキストとコマンド列だけで使う関数 ---------- */

// compile: テキストをイベントコマンドの配列にする
const commands = T2F.compile('<Name: リード>\nこんにちは\n')
show('compile', commands)

// compile({ lineMap: true }): コマンドがテキストの何行目から来たかも返す
const withLines = T2F.compile('% コメント行\nこんにちは\n\n今日は良い天気\n', { lineMap: true })
show('compile (lineMap)', withLines.lineMap)

// parseFrontMatter: 先頭の見出し(--- で囲んだ部分)と本文を分ける
show('parseFrontMatter', T2F.parseFrontMatter('---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nこんにちは\n'))

// resolveStrategy: 反映のしかたの名前を確かめる(知らない名前は null)
show('resolveStrategy', [T2F.resolveStrategy('merge'), T2F.resolveStrategy('overwrite'), T2F.resolveStrategy('unknown')])

// getMessageDefaults: メッセージの背景と位置の既定値
show('getMessageDefaults', T2F.getMessageDefaults())

// decompile: コマンドの配列をテキストに戻す。translationOnly は会話だけを残す
show('decompile', F2T.decompile(commands, true, { pretty: true }))
show('decompile (translationOnly)', F2T.decompile(T2F.compile('<Switch: 1, ON>\nこんにちは\n'), true, { translationOnly: true }))

// VERSION / renderFrontMatter: 書き出すテキストの見出しを作る
show('VERSION', F2T.VERSION)
show('renderFrontMatter', F2T.renderFrontMatter({ mapId: '1', eventId: '1', pageId: '1' }, 'event'))

// applyThreeWayMerge: 祖先・ゲーム・テキストの3つから統合する
const base = T2F.compile('一行目\n\n二行目\n')
const ours = T2F.compile('一行目(ゲームで直した)\n\n二行目\n') // ゲーム側
const theirs = T2F.compile('一行目\n\n二行目(テキストで直した)\n') // テキスト側
const merged = T2F.applyThreeWayMerge(base, ours, theirs)
show('applyThreeWayMerge', { conflicts: merged.conflicts, texts: texts(merged.commands) })

// commandsEqual: テキストにしたときに区別できない差しか無いか
show('commandsEqual', [T2F.commandsEqual(base, T2F.compile('一行目\n\n二行目\n')), T2F.commandsEqual(base, ours)])

// restoreAuthoredLines: 作り直した本文に、元のテキストのコメント行(%)や書き方を戻す
const original = '% 場面1\n一行目\n\n二行目\n'
const regenerated = F2T.decompile(T2F.compile(original), true, { pretty: true })
show('restoreAuthoredLines', T2F.restoreAuthoredLines(original, regenerated))

// applyMergePull: ゲームの変更をテキストへ取り込む(取り出しの統合)
const pulled = T2F.applyMergePull({ gameCommands: ours, textBody: '一行目\n\n二行目(テキストで直した)\n', baseBody: '一行目\n\n二行目\n' })
show('applyMergePull', { conflicts: pulled.conflicts, text: pulled.text })

// buildPullText: 取り出すテキストを見出しつきで組み立てる(ファイルは書かない)
const built = F2T.buildPullText({
  list: ours,
  strategy: 'merge',
  existingText: F2T.renderFrontMatter({ mapId: '1', eventId: '1', pageId: '1' }, 'event') + '一行目\n\n二行目(テキストで直した)\n',
  baseText: '一行目\n\n二行目\n'
})
show('buildPullText', { conflicts: built.conflicts, writesGame: !!built.writeBack, text: built.text })

/* ---------- ゲームのデータとファイルを扱う関数 ---------- */

const root = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-example-'))
const dataDir = path.join(root, 'data')
const textDir = path.join(root, 'text')
const mapPath = path.join(dataDir, 'Map001.json')
const commonEventPath = path.join(dataDir, 'CommonEvents.json')
fs.mkdirSync(dataDir)
fs.writeFileSync(mapPath, JSON.stringify({
  events: [null, { id: 1, name: 'EV001', pages: [{ list: T2F.compile('<Name: テレーゼ>\nこんにちは\n').concat([{ code: 0, indent: 0, parameters: [] }]) }] }]
}))
fs.writeFileSync(commonEventPath, JSON.stringify([null, { id: 1, name: 'CE001', list: [{ code: 0, indent: 0, parameters: [] }] }]))
console.log('\n(一時フォルダ: ' + root + ')')

// enumerateTargets: データから、取り出せるイベントのページとコモンイベントを数える
const targets = F2T.enumerateTargets(dataDir)
show('enumerateTargets', targets)

// baseDirForTextDir: テキストのフォルダに対応する祖先(.t2f-base)の置き場所
const baseDir = F2T.baseDirForTextDir(root, textDir)
show('baseDirForTextDir', { Frame2Text: baseDir, Text2Frame: T2F.baseDirForTextDir(root, textDir) })

// pullTargetToText: 1件をテキストへ取り出す(テキストと祖先を書く)
const eventTarget = targets.find(function (t) { return t.kind === 'event' })
const textPath = path.join(textDir, eventTarget.key + '.txt')
const pull = F2T.pullTargetToText({ dataDir, target: eventTarget, outPath: textPath, baseDir, englishTag: true, strategy: 'merge' })
show('pullTargetToText', { ok: pull.ok, text: fs.readFileSync(textPath, 'utf8') })

// deriveBaseId / readBaseText: テキストに対応する祖先の鍵と中身
const baseId = T2F.deriveBaseId(textPath, root)
show('deriveBaseId', baseId)
show('readBaseText', T2F.readBaseText(root, baseId.key))

// baseIdForTarget: 祖先の鍵は front matter の宛先で決まる(名前を変えても同じ鍵)
show('baseIdForTarget', T2F.baseIdForTarget(path.join(textDir, 'すきな名前.txt'), root, eventTarget))

// applyTextFile: テキストを書き換えて、ゲームへ反映する(見出しから反映先を決める)
fs.appendFileSync(textPath, '\n<Name: リード>\nテキストで足した行\n')
const applied = T2F.applyTextFile({ textPath, mapPath, baseRoot: root, strategy: 'merge' })
show('applyTextFile', { ok: applied.ok, target: applied.target, conflicts: applied.conflicts, game: texts(JSON.parse(fs.readFileSync(mapPath, 'utf8')).events[1].pages[0].list) })

// saveBaseText: 祖先を自分で書く(ふつうは反映・取り出しが書く)
T2F.saveBaseText(root, baseId.key, fs.readFileSync(textPath, 'utf8'))
show('saveBaseText', T2F.readBaseText(root, baseId.key))

// applyCommandsToData: コマンドの配列を、そのままゲームのデータへ書く
const wrote = T2F.applyCommandsToData({ kind: 'common', commonEventId: 1, commonEventPath, commands: T2F.compile('コモンイベントの文\n') })
show('applyCommandsToData', { ok: wrote.ok, game: texts(JSON.parse(fs.readFileSync(commonEventPath, 'utf8'))[1].list) })

// writeBackToGame: buildPullText が返した writeBack をゲームへ書く
const commonTarget = targets.find(function (t) { return t.kind === 'common' })
const back = F2T.writeBackToGame({ commands: T2F.compile('書き戻した文\n') }, commonTarget, { commonEventPath })
show('writeBackToGame', { ok: back.ok, game: texts(JSON.parse(fs.readFileSync(commonEventPath, 'utf8'))[1].list) })

fs.rmSync(root, { recursive: true, force: true })
