---
description: "Text2Frame-MV プロジェクトの専門エージェント。コードの追加・修正・テスト・ビルドを支援する。RPGツクールMV/MZ プラグイン開発、テキスト⇄イベントコマンド変換、タグ文法の実装、VSCode拡張、テストケース追加時に使用。"
tools: [read, edit, search, execute]
---

## プロジェクト概要

**Text2Frame-MV** は RPG ツクール MV/MZ 向けの開発支援ツール群です。

- **`Text2Frame.js`** … テキスト(.txt) → ツクールのイベントコマンド JSON へ取り込む(コンパイル/デプロイ)。
- **`Frame2Text.js`** … 逆変換。イベント JSON → テキスト(エクスポート/書き出し)。
- **`vscode-extension/`** … 上記をUIだけで扱う VSCode 拡張(ハイライト・補完・保存時デプロイ・一括処理・TreeView 等)。

テキストとデータは**双方向**に変換でき、翻訳・シナリオ編集ワークフローを支援します。

## 開発環境(重要)

- リポジトリは WSL 上(`\\wsl.localhost\Ubuntu\home\yuki\workspace\Text2Frame-MV`)。
- **git-bash / Windows のシステム node は v12 で古く、tsc/vite が動かない。** node/npm は必ず WSL の nvm node v20 で実行する:
  ```bash
  wsl -d ubuntu -- bash -lc 'export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$PATH"; cd ~/workspace/Text2Frame-MV && <cmd>'
  ```
- VSCode 拡張は **VS Code 内蔵 Node(拡張ホスト)** 上でコンパイラを `require` するため、Windows ネイティブで動作する(WSL Remote 不要)。

## ファイル構成

| パス | 役割 |
|---|---|
| `Text2Frame.js` | テキスト→JSON コンパイラ本体。ツクールのプラグインとしても動作。`module.exports = { compile, applyDiff, applyTextFile, runBatch }` |
| `Frame2Text.js` | JSON→テキスト。`module.exports = { decompile, applySyncDiff }` |
| `Text2Frame.{cjs.js,es.mjs,umd.js}` | `npm run build`(vite)生成物。**直接編集しない**。`// developer mode` 以降(CLI部)は build で除去される |
| `vscode-extension/` | VSCode 拡張(モノレポのサブディレクトリ)。下記「VSCode拡張」参照 |
| `data/` | リポジトリ同梱の最小サンプル JSON(`Map001.json` は空イベント、`CommonEvents.json` は2件) |
| `sample/` | フルのサンプルゲーム(未追跡、巨大)。`text/` はここ(`sample/data`)から生成されている |
| `text/ja/*.txt` | 生成済みテキスト(未追跡)。`mapXXX_eventYYY_pageZ.txt` / `commonZZZ.txt` |
| `test/` | mocha テスト。`*.txt`=入力, `expected_*.json`=期待出力 |
| `.gitattributes` | テキストソースを LF に正規化 |

## 開発コマンド

```bash
npm test                       # 主要テスト一式(下記の test_frame2text は含まれない点に注意)
npm run test_text2frame        # Text2Frame テスト(test_json_eq.js)
npx mocha test/test_frame2text.js   # ★往復変換テスト(130件)。npm test に含まれないので個別実行
npm run lint                   # ESLint(--max-warnings=0)
npm run build                  # vite で *.cjs.js / *.es.mjs / *.umd.js を生成
# VSCode 拡張(vscode-extension/ で):
npm run compile                # tsc → out/
npm run bundle-compiler        # 親の Text2Frame.js / Frame2Text.js を lib/ にコピー
```

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
2. デプロイ(テキスト→データ): `compile(body)` でコマンド配列に変換 → 対象 JSON の `events[eventId].pages[pageId-1].list`(または `CommonEvents[id].list`)へ反映。戦略は `import`(上書き)/`diff`(LCSマージ)。
3. 書き出し(データ→テキスト): `decompile(list, englishTag, {pretty, translationOnly})`。

## 公開 API

**Text2Frame.js**
- `compile(text)` → イベントコマンド配列(本文のみ。フロントマターは呼び出し側で除去)
- `applyTextFile(opts)` → 単一テキストを単一データ JSON へデプロイ。`opts={ textPath, kind, mapId, eventId, pageId, commonEventId, mapPath, commonEventPath, strategy, overwrite, backup }`。戻り値 `{ ok, warnings, error, errorLine, errorLineText, dataPath, target }`。throw せず結果を返す
- `runBatch({ manifestPath, strategy })` → マニフェスト一括(サマリ返却)
- `applyDiff(existing, new)` → LCS マージ

**Frame2Text.js**
- `decompile(list, englishTag, { pretty, translationOnly })` → テキスト。`translationOnly` は会話系コード(101/401, 102/402/403/404, 105/405)のみ出力
- `applySyncDiff(oldParas, newParas)` → 段落単位の同期マージ

## CLI モード

```bash
# Text2Frame(取り込み)
node Text2Frame.js -m map|common|compile|test|batch [...] [--watch] [--poll] [--debounce ms]
#   batch: -f <manifest> -s import|diff|sync   --watch でファイル監視→再デプロイ(chokidar)
# Frame2Text(書き出し)
node Frame2Text.js -m map|common|decompile|batch-export [...] [-T]   # -T=翻訳用(会話のみ)
```

## VSCode 拡張(`vscode-extension/`)

- 元は別リポジトリ `Text2Frame-vscode`。**モノレポのサブディレクトリ**として取り込み済み。
- 構成: `src/extension.ts`(activate), `src/deploy.ts`(デプロイ/プレビュー/データ変更ガード), `src/exportText.ts`(書き出し), `src/batch.ts`(一括), `src/tree.ts`(TreeView), `src/compiler.ts`(共有: モジュール解決・フロントマター・ターゲット解決・mtimeガード)。
- **コンパイラの読込**: 生 `Text2Frame.js`/`Frame2Text.js` を `require`(ブラウザ向け `*.cjs.js` は Node builtin を解決できないため使わない)。解決順: 設定 `text2frame.modulePath` → 同梱 `lib/` → モノレポ兄弟 `../` → ワークスペース。フロントマターから解決した**絶対パス**を `applyTextFile` に渡す(拡張ホストでは `process.mainModule` が無いため、本体側も cwd フォールバック済み)。
- 主なコマンド: `deployCurrentFile` / `toggleDeployOnSave` / `exportCurrentFile` / `exportForTranslation` / `showCompiledJson` / `deployAll` / `exportAll` / `tree.*`。`contributes.menus` に出さないコマンドはコマンドパレットのみ。
- 設定: `strategy` / `normalizeAfterDeploy` / `modulePath` / `englishTag` / `locale` / `textBaseDir` / `dataDir`。
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

- **往復変換の維持は絶対**: 変更後は `npx mocha test/test_frame2text.js`(130件)と `npm test` と `npm run lint` が全緑であること。Frame2Text の本文系コード(101本文401/スクロール405/コメント408/スクリプト355,655/プラグインコマンド357,657)は**列0**のまま出力する(Text2Frame が行頭空白を本文として取り込むため)。
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
