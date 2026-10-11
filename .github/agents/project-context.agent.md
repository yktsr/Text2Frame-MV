---
description: "Text2Frame-MV プロジェクトの専門エージェント。コードの追加・修正・テスト・ビルドを支援する。RPGツクールMV/MZ プラグイン開発、テキスト⇄イベントコマンド変換、タグ文法の実装、VSCode拡張、テストケース追加時に使用。"
tools: [read, edit, search, execute]
---

## プロジェクト概要

**Text2Frame-MV** は RPG ツクール MV/MZ 向けの開発支援ツール群です。

- **`Text2Frame.js`** … テキスト(.txt) → ツクールのイベントコマンド JSON へ取り込む(コンパイル/デプロイ)。
- **`Frame2Text.js`** … 逆変換。イベント JSON → テキスト(エクスポート/書き出し)。
- **`vscode-extension/`** … 上記をUIだけで扱う VSCode 拡張(ハイライト・補完・保存時デプロイ・一括処理・TreeView・反映前の差分確認・編集履歴・テストプレイとデバッグ等)。

テキストとデータは**双方向**に変換でき、翻訳・シナリオ編集ワークフローを支援します。

## 開発環境(重要)

- **node 20 以上が必要**(tsc / rollup / vsce 3.x の要件)。古い node では動かない。
- Windows で WSL を使う場合は、node/npm を WSL 側で動かす(Windows のシステム node が古いと tsc/rollup が動かない)。
- VSCode 拡張は **VS Code 内蔵 Node(拡張ホスト)** 上でコンパイラを `require` するため、Windows ネイティブでも動く(WSL Remote 不要)。

## ファイル構成

| パス | 役割 |
|---|---|
| `Text2Frame.js` | テキスト→JSON コンパイラ本体。ツクールのプラグインとしても動作。`module.exports = { compile, applyThreeWayMerge, applyMergePull, applyTextFile, applyCommandsToData, commandsEqual, resolveStrategy, readBaseText, saveBaseText, deriveBaseId, baseIdForTarget, baseDirForTextDir, getMessageDefaults, restoreAuthoredLines, parseFrontMatter }` |
| `Frame2Text.js` | JSON→テキスト。`module.exports = { decompile, VERSION, baseDirForTextDir, enumerateTargets, indexTexts, outPathFor, defaultFileName, pullTargetToText, renderFrontMatter, buildPullText, writeBackToGame }`。取り出しは merge 既定(内部で `Text2Frame.applyMergePull` を lazy require) |
| `Text2Frame.{cjs.js,es.mjs,umd.js}` | `npm run build`(rollup)生成物。**直接編集しない**。`// developer mode` 以降(CLI部)は build で除去される |
| `t2f-sync.js` | 双方向同期コントローラ(CLI専用。ツクールのプラグインではない)。Text2Frame/Frame2Text を**公開APIとして**使い、1プロセスで push/pull を所有。自分の書き込みを内容ハッシュで無視してループを防ぐ。`module.exports = { pushFile, pullTarget, pullDataFile, syncOnce, createEchoGuard }` |
| `t2f-mcp.js` | MCP(Model Context Protocol)サーバ(CLI専用)。Text2Frame/Frame2Text を**公開APIとして**使う4つ目の前面。`handle(要求, 文脈)` は純粋な関数で、標準入出力を持つのは殻だけ(テストはプロセス内で叩く)。**標準出力は通信路なので、本物の `process.stdout.write` を退避し、以後 `process.stdout.write` は stderr へ流す**。`console.log` は eslint の override で禁止 |
| `t2f-help.js` | `Text2Frame.js` の `@help` を見出しごとに切り、タグ名→見出しの対応を作る。MCP の `t2f_syntax` と、拡張の `scripts/update-tag-help.js` の両方がここを呼ぶ(`files` に `tools/` が入らないのでルートに置いた) |
| `t2f-history.js` | 書き換える直前の中身を `.t2f-history` に控える**書き手**。形式は拡張の `src/db/history.ts` が持ち、読み・巻き戻しはあちらが権威。ずれは `vscode-extension/test/test_mcp_history.js` が拡張の読み手に通して見張る |
| `vscode-extension/` | VSCode 拡張(モノレポのサブディレクトリ)。下記「VSCode拡張」参照 |
| `data/` | リポジトリ同梱の最小サンプル JSON(`Map001.json` は空イベント、`CommonEvents.json` は2件) |
| `sample/` | フルのサンプルゲーム(未追跡、巨大)。`text/` はここ(`sample/data`)から生成されている |
| `text/*.txt` | 生成済みテキスト(未追跡)。置き場所は root 直下の1階層で、`text` / `text-en` のように分けられる(祖先もこの区分ごと)。名前は `<ツリー順>_<マップ名>_<イベント名>_page<N>_map###-event###.txt`(`MapInfos.json` が読めなければ `map###_event###_page#.txt` / `common###.txt`) |
| `.t2f-base/` | 3-way の共通祖先(未追跡)。下記「データフロー」参照 |
| `.t2f-history/` | 編集履歴(未追跡)。**書くのは拡張と MCP サーバ**、読み・巻き戻しは拡張だけ。`text2frame.history.keep` 件で打ち切り |
| `test/` | mocha テスト。`*.txt`=入力, `expected_*.json`=期待出力 |
| `.gitattributes` | テキストソースを LF に正規化 |

## 開発コマンド

```bash
npm test                       # test/test_*.js を全部(1ファイル1プロセスで並列。tools/run-tests.js)
npm test -- test/test_x.js     # 1本だけ / --serial で直列 / --jobs N で並列数
npm run test_text2frame        # Text2Frame テスト(test_json_eq.js)だけ
npm run test_frame2text        # 往復変換テスト(139件)だけ。npm test にも含まれる
npm run lint                   # ESLint(--max-warnings=0)
npm run update-snapshot        # 書き出しのスナップショット(test/snapshot/decompile-*.txt)を作り直す
npm run update-mcp-snapshot    # MCP のプロトコルの筆記録(test/snapshot/mcp-protocol.txt)を作り直す
npm run check-params           # @default と実装の食い違いを一覧(承知のうえの分は ACCEPTED に理由つき)
npm run build                  # rollup で dist/*.cjs.js / dist/*.es.mjs / dist/*.umd.js を生成
# ★実データ往復検証(2902件。sample/ が必要=未追跡なので CI では走らない):
cp -r sample/data /tmp/vd && node tools/verify-roundtrip.js /tmp/vd --en=true --max=0
npm run build:dist             # build + stamp(Version/build id バナー付与)
# VSCode 拡張(vscode-extension/ で):
npm run compile                # tsc → out/
npm run bundle-compiler        # 親の Text2Frame.js / Frame2Text.js を lib/ にコピー
T2F_GAME_DIR=/path/to/game npm test   # 実プロジェクトが要る2件も走らせる(未設定なら skip。実データはコピーに対して)
```

**CI(`.github/workflows/nodejs.yml`)**: push[master]/PR で 3 ジョブ。core = `npm ci → build → audit → lint → npm test`、extension = `npm ci → compile → lint → npm test`、package = 配布物3種を作って公開モードの読み込みまで見る。2902 往復は `sample/` が未追跡のため CI 対象外(自己完結の検体139件でガード)。全体は 32 suites / 578 件。

## データフロー

1. テキストの**先頭 YAML フロントマター**がデプロイ先を表す:
   ```
   ---
   kind: event        # または common
   mapId: 1
   eventId: 1
   pageId: 1
   commonEventId: 3   # kind: common のとき
   ---
   ```
   値は全部文字列として読む。`pageId` の既定は `1`。取り出しが書く `generator:`(版番号)は読み戻さないが消させない。
   知らないキーもそのまま持つ。**見出しが無いテキストは一括反映と同期から無視される**(宛先が決まらないため)。
2. デプロイ(テキスト→データ): `compile(body)` でコマンド配列に変換 → 対象 JSON の `events[eventId].pages[pageId-1].list`(または `CommonEvents[id].list`)へ反映。**戦略は `merge`(既定)/ `overwrite` / `add` の3つ**(`resolveStrategy` で検証。未知値は null)。ただし走査で回る一括・取り出し・同期の入口は `merge`/`overwrite` だけ受ける(`add` は走査のたびに内容が二重になるため)。`merge` は祖先(BASE)があれば 3-way、無ければ現在のゲーム状態を祖先として記録した上でテキストを反映(TOFU。初回=全反映、以後 3-way)、空なら overwrite を自動選択。
3. 書き出し(データ→テキスト): `decompile(list, englishTag, {pretty, translationOnly})`。**取り出しも既定は merge**(翻訳を残しつつゲーム変更を取り込む。`Text2Frame.applyMergePull` 経由)。生の上書きは `overwrite`。
4. **祖先スナップショット(3-way 用)**: `<root>/.t2f-base/<key>.txt`(gitignore 済)。`key` は `<テキストの置き場所>/<宛先の鍵>` で、置き場所=root 直下の1階層(`text` / `text-en`。多言語で祖先を分けるため)、宛先の鍵=`map###_event###_page<N>` または `common###`(`baseIdForTarget`)。**front matter に `locale` キーは無い。** 宛先から決めるので、テキストの名前を変えても同じ置き場所の中で移しても同じ祖先を使う。反映/取り出しの成功時に自動保存され、次回から自動 3-way。`baseRoot` を渡さないと `process.cwd()` に落ちる。明示 `--base`/`BasePath` 指定時はそれを優先。VSCode 拡張・CLI・プラグインで同じ規約=相互運用可。同じ箇所を両方変更した競合は両方残し、平易マーカー(`=== テキストの変更 / from text ===` 等)で表示。マーカーが残っている間は祖先を進めず、統合は投げる(反映)か見送る(取り出し)。**上書きはマーカーを通す**(詰まった統合からの出口なので塞いでいない。`test/test_batch_import_warnings.js` が固定)。

## 公開 API

**Text2Frame.js**
- `compile(text, { lineMap })` → イベントコマンド配列(本文のみ。フロントマターは呼び出し側で除去。終端の `code:0` は付けない)。`lineMap: true` なら `{ commands, lineMap }` で、各コマンドが元テキストの何行目から来たかも返す
- `applyTextFile(opts)` → 単一テキストを単一データ JSON へデプロイ。`opts={ textPath, strategy, kind, mapId, eventId, pageId, mapPath, commonEventId, commonEventPath, baseRoot, basePath, isDebug }`(`overwrite` は**読まない**。`baseRoot` 未指定時は `process.cwd()`。cwd と別のプロジェクトを扱う組み込み側は必ず渡す)。戻り値 `{ ok, textPath, kind, target, dataPath, warnings, conflicts, writtenBack, writeBackPath, writeBackText, error, errorLine, errorLineText }`。throw せず結果を返す
- フォルダ一括反映は front matter 走査で行う: 各 `.txt` を `applyTextFile({ textPath, strategy })` で反映(CLI は `--mode batch --text-dir <dir>`、プラグインは `BATCH_IMPORT_MESSAGES_FROM_FOLDER`)
- `applyThreeWayMerge(base, ours, theirs, { keepOurs, keepTheirs })` → 3-way マージ(`{ commands, commandsOurs, commandsTheirs, conflicts, warnings }`)。`keepOurs`/`keepTheirs` を立てると、マーカーを入れない片側だけの結果も一緒に返る(反映はこれをゲームへ、テキストにはマーカー入りを書く)。祖先が無い場合は呼び出し側が現在のゲーム状態を祖先として渡す(TOFU)
- `applyMergePull({ gameCommands, textBody, baseBody, englishTag, omitDefaults })` → `{ text, gameCommands, conflicts, warnings }`。取り出し(ゲーム→テキスト)の 3-way 本体。push と対称(出力先がテキストなだけ)。内部で `Frame2Text.decompile` を lazy require
- `resolveStrategy(name)` → `{ strategy: 'add'|'merge'|'overwrite' }`(大小文字は無視。未指定は merge、未知値と空文字は null)。`統合`/`上書き`/`true`/`false` といった別名は**ここでは通らない**(プラグインコマンドと CLI の `--overwrite` の中だけの話)
- 祖先ヘルパ: `baseIdForTarget(textPath, root, target)`→`{ key }`(宛先から決める。こちらが主)、`deriveBaseId(textPath, root)`→`{ key }`(宛先が分からないときの代替)、`baseDirForTextDir(root, textDir)`、`readBaseText(root, key)`/`saveBaseText(root, key, text)`。置き場所を解く `baseSnapshotPathCore` は非公開

**Frame2Text.js**
- `decompile(list, englishTag, { pretty, translationOnly, omitDefaults })` → テキスト。`translationOnly` は会話系コード(101/401, 102/402/403/404, 105/405)のみ出力(不可逆。往復しない)。`omitDefaults` は既定値どおりの顔・背景・位置タグを省く
- `enumerateTargets(dataDir, { onlyFile, scope, index })` → data を走査し `{ kind, mapId/eventId/pageId | commonEventId, key, mapOrder, mapName, name }[]` を返す(一括取り出しの列挙)。`scope` は `all|nonempty|conversation|custom`(**省略時 `conversation`、未知値は例外**)。`custom` は `index` に載っている宛先だけを選ぶので `index` が必須
- `indexTexts(textDir)` → `{ paths, duplicates }`。各テキストの**先頭2048バイト**だけを読んで front matter で索引する(`*.translation.txt` / `*.conversation.txt` は除く)。同じ宛先を指すテキストが複数あると `duplicates` に入り、一括・同期はその宛先を**見送る**
- `outPathFor(textBase, index, target)` / `defaultFileName(target)` → 書き先の決定。既にテキストがあればその名前・その場所のまま。無ければ `defaultFileName`(`mapOrder` と階層つき `mapName` が要る。無ければ ID だけの名前に落ちる)
- `buildPullText(opts)` → `{ text, baseText, writeBack, conflicts, markers, skipped }`。**ファイルを書かずに**取り出すテキストを組み立てる1か所。プラグイン・CLI・同期・VSCode 拡張が全部ここを通るので4つの振る舞いが揃う
- `pullTargetToText(opts)` → 1件をテキストへ取り出す(テキストと祖先を書く)。`writeBackToGame(writeBack, target, paths)` は `buildPullText` の書き戻しをゲームへ当てる
- `renderFrontMatter(entry, kind)` → 書き出しテキスト先頭の front matter ブロック文字列
- `VERSION` → 書き出しフロントマターの `generator:` に埋める版番号

## CLI モード

```bash
# npm から入れた人が打つのは npx text2frame / npx frame2text / npx t2f-sync(bin は bin/*.js のラッパ)
# Text2Frame(取り込み/反映)。push は既定 merge
node Text2Frame.js -m map|common|compile|batch [-f <text>] [-t text] [-d data] [--root dir] [-s merge|overwrite] [-b <base>] [--watch] [--poll] [--debounce ms]
#   -s: 既定 merge(3-way 自動)。overwrite で全置換。legacy の --overwrite <true/false> だけが add に繋がる
#   -b <base>: 明示祖先(任意)。未指定なら .t2f-base を自動参照/保存   --watch でファイル監視→再デプロイ(chokidar)
# Frame2Text(書き出し/取り出し)。pull も既定 merge(翻訳を残す)
node Frame2Text.js -m map|common|decompile|batch [-t text] [-d data] [--root dir] [-s merge|overwrite] [-w <true/false>] [--scope all|nonempty|conversation|custom] [--omit-default-tags <true/false>] [-b <base>]
#   -s: 既定 merge(翻訳保持+ゲーム変更流入)。overwrite で生の全取り直し
#   --scope: 既定 conversation   -w: 英語タグ(既定 true)   翻訳用(会話のみ)は CLI には無く decompile の translationOnly / 拡張の exportConversationOnly
# 双方向同期コントローラ(npm run sync = start / sync_once = once)。引数なしは使い方を出すだけ
node t2f-sync.js start|once [--direction both|push|pull] [-t text] [-d data] [--root dir] [-s merge|overwrite] [-w <true/false>] [--scope ...] [--debounce ms] [--poll]
#   start = START_DATA_SYNC と同じ(一度そろえてから見張る)。once = 一度だけ   --scope の既定は custom(見出し情報付きテキストだけ)
#   1プロセスが両方向を持つのでループガードが確実。applyTextFile には baseRoot を渡して祖先を root 基準に揃える
# MCP サーバ。クライアント(Claude Code / VS Code)が起こし、標準入出力で話す。手で叩くものではない
node t2f-mcp.js [--root dir] [-t text] [-d data] [-s merge|overwrite] [--scope ...] [--read-only] [-v]
#   端末から起こしたときは使い方を出して終わる(パイプで繋がれたときだけサーバになる)
#   道具9つ: project_info / list / read / search / syntax / names / check / write_plan / write_apply
#   書き込みは二段。write_plan が写しに当てて差分と札(内容のハッシュ)を返し、write_apply が札で本当に書く
#   登録はゲームのフォルダ直下の .mcp.json(mcpServers)。Claude Code と VS Code の両方が読む
# 短縮形は3本で同じ意味にそろえる(-t テキスト / -d データ / -s 戦略 / -w 英語タグ / -f 単発テキスト / -v 詳細)。test/test_cli_usage.js が固定
```

## VSCode 拡張(`vscode-extension/`)

- 元は別リポジトリ `Text2Frame-vscode`。**モノレポのサブディレクトリ**として取り込み済み。
- 構成: `src/extension.ts`(activate), `src/deploy.ts`(デプロイ/プレビュー/データ変更ガード), `src/exportText.ts`(書き出し。`planPull`/`commitPull`), `src/batch.ts`(一括), `src/tree.ts`(TreeView), `src/compiler.ts`(共有: モジュール解決・フロントマター・ターゲット解決・mtimeガード), `src/review.ts`+`src/reviewApply.ts`(反映前に差分を見せて確かめる), `src/dryRun.ts`(一時コピーに当てる下書き), `src/historyView.ts`(編集履歴)。
- **`src/db/*` は vscode に依存しない純粋な層**(ゲームDBの読み・マップツリー・タグ参照・コマンド表示・編集履歴 `history.ts`・巻き戻しの見積り `restorePlan.ts`・ja/en の `lang.ts` など)。テストは `out/db/*.js` を素の node で読んで回す。vscode の API を使う層とここを混ぜない。
- 反映・取り出しの流れは **読む → 下書き(`planPull` / `dryRun.tryApply`) → 確かめる(`review`) → 当てる(`commitPull` / `applyTextFile`)** で、全体が `withHistory` に包まれて `.t2f-history` に前像が残る。
- **コンパイラの読込**: 生 `Text2Frame.js`/`Frame2Text.js` を `require`(ブラウザ向け `*.cjs.js` は Node builtin を解決できないため使わない)。解決順: 設定 `text2frame.modulePath` → 同梱 `lib/` → モノレポ兄弟 `../` → ワークスペース。フロントマターから解決した**絶対パス**を `applyTextFile` に渡す(拡張ホストでは `process.mainModule` が無いため、本体側も cwd フォールバック済み)。
- コマンドは52個(`contributes.commands`。ラベルは `package.nls.json` / `package.nls.ja.json` で ja/en 両対応)。中心は方向×範囲: `deployCurrentFile`「ゲームに反映(このファイル)」/ `deployAll`「(すべて)」/ `exportCurrentFile`「ゲームから取り出す(このファイル)」/ `exportAll`「(すべて)」/ `repullOverwrite`「全部取り直す(上書き)」/ `exportConversationOnly`「会話のみ書き出し」/ `showCompiledJson` / `toggleDeployOnSave`。ほかに `history.*`(編集履歴の表示・差分・巻き戻し)、`testPlay`/`debug`/`showLiveValues`(テストプレイとデバッグ)、`db.*`(データベースの名前と使用箇所)、`tree.*`/`mapLinks.*`/`showMapGraph`(ツリーとマップのつながり)、`pick*`(素材選び)、`snippet.*`。反映・取り出しとも既定は merge(3-way 自動)。言語を選ぶ `seedLocale`/`locale` は**撤廃**(初回取り出し=空テキストへの全取り込みが seed を兼ね、言語はテキストの置き場所で分ける)。
- 設定(`text2frame.*`): `exportScope`(既定 `nonempty`) / `strategy`(既定 `merge`) / `reviewBeforeApply`(既定 true) / `englishTag` / `omitDefaultTags` / `history.keep`(既定 100) / `textBaseDir`(`text`) / `dataDir`(`data`) / `messageCheck` / `messageLineLength` / `showDatabaseNames` / `usageContextLines` / `testPlayPage` / `openRunningText` / `tryEvent.clearPlayerTransparency` / `modulePath`。`locale` / `sourceLocale` / `targetLocale` は**無い**。
- コンパイラは動的 `require`(拡張は TS、コアは JS。この境界のため `compiler.ts` の祖先ヘルパはコア `deriveBaseId` 等と同規約の別実装=意図的重複)。
- フロントマター付き `.txt` は開くと自動で `text2frame` 言語に切替(ハイライト/補完/診断が有効化)。

## コンパイラ内部構造(`Text2Frame.compile`)— ★AST化の前提

`compile(text)` のパイプライン:
1. `uniformNewLineCode` で改行を LF 化
2. `eraseCommentOutLines` で `%` 行を除去
3. `getBlockStatement` で `script` / `comment` / `scrolling` ブロックを抽出しプレースホルダ化(複数行→1行に畳むため、後段の行番号は元テキストとズレる)
4. 1 行ずつ `getEvents(text, previous_text, window_frame, previous_frame, block_stack, block_map)` を呼び、コマンド配列を直接生成
5. `completeLackedBottomEvent` → `autoIndent` で仕上げ

**`block_stack` が要注意**。入れ子(Choice 102 / If 111 / Battle 301)と、親子付け(MovementRoute 205 に 505 をぶら下げる)を**同じスタックで兼任**している(`getEvents` で push されるのはこの 4 種)。ループの入れ子は別途インデント処理側で扱う。

- `<When>`(402) 処理時、スタック最上位を「現在の選択肢(102)」とみなし、選択肢文字列を `parameters[0]`(配列)に push する。
- `<End>` は **404(選択肢終了)/ 412(条件分岐終了)など複数コードに多重対応**し、`current_block` を見て判別する(文脈依存)。

## 既知の設計上の落とし穴

- **終端トークンの無い構造をネストスタックに積むな**: 205(SetMovementRoute)は終了タグが無く、505 以外のフレームが来たら明示的に pop する必要がある(過去に「選択肢直前に SetMovementRoute があると `<When>` が 205 を選択肢と誤認して落ちる」バグが発生・修正済み)。新しい「子を持つが終端の無いコマンド」を足すときは同じ轍を踏まないこと。
- **不変条件をガードで明示する**: `<When>` では「最上位が 102 かつ `parameters[0]` が配列」を確認してから push する(`Array.isArray(parameters)` だけでは常に真で無意味)。
- **`<End>` の曖昧さ**: 選択肢/分岐/ループ等で同じ `<End>` を使うため、判別ロジックが壊れやすい。選択肢・分岐まわりは小さく AST 化(node が子と範囲を持つ)して曖昧さを構造的に解消する方針。
- 方針は **A(現状維持＋ピンポイント堅牢化)を基本に、選択肢/分岐だけ B(浅い AST)** へ寄せる。フルリライトはしない。

## ハード制約

- **往復変換の維持は絶対**: 変更後は `npm test`(test/test_*.js を全部。往復139件を含む)と `npm run lint` が全緑であること。加えて Frame2Text の出力を変えたら**実データ往復 2902/2902** も確認する(`sample/data` を `/tmp` にコピーして `node tools/verify-roundtrip.js ... --max=0`。sample/ が未追跡のため CI では不可、ローカル必須)。Frame2Text の本文系コード(101本文401/スクロール405/コメント408/スクリプト355,655/プラグインコマンド357,657)は**列0**のまま出力する(Text2Frame が行頭空白を本文として取り込むため)。
- ビルド成果物は直接編集しない(`npm run build` で再生成)。
- ESLint 警告 0 件(`--max-warnings=0`)。
- テキストソースは LF(`.gitattributes` で強制)。

## タグ文法(抜粋)

`<タグ名: 引数>` でイベントコマンドを記述。`<顔: >` `<背景: >` `<位置: >` `<名前: >` `<Switch: >` `<Set: >` `<If: >…<Else>…<End>` `<Loop>…<RepeatAbove>` `<comment>…</comment>`(小文字、大文字も受理) `<script>…</script>`、`%` 行頭でコメントアウト。日本語別名(`<顔>` `<選択肢>` `<分岐終了>` 等)あり。

## テスト追加の指針

- 入力 `.txt` と期待 `expected_*.json` をセットで `test/` に追加し、`test/test_cases.js` に登録。
- 取り込み系の振る舞いは `test_json_eq.js`、往復は `test_frame2text.js`、`applyTextFile` 系は `test_apply_text_file.js`。
- 実データ起因のバグは、最小再現の `.txt` をテスト化して回帰ガードにする。

## 対応バージョン

RPG ツクール MV・MZ 両対応。MZ 専用: ネームボックス、ピクチャ移動(イージング)、変数操作(直前)、条件分岐(タッチ/マウス)、MZ プラグインコマンド。
