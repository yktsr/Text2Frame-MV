---
description: "Text2Frame-MV プロジェクトの専門エージェント。コードの追加・修正・テスト・ビルドを支援する。RPGツクールMV/MZ プラグイン開発、テキスト→イベントコマンド変換、タグ文法の実装、テストケース追加時に使用。"
tools: [read, edit, search, execute]
---

## プロジェクト概要

**Text2Frame-MV** は RPG ツクール MV/MZ 向けの開発支援プラグインです。テキストファイル（.txt）を読み込み、ツクールのマップイベント・コモンイベントのイベントコマンド（JSON）として取り込みます。逆変換プラグイン `Frame2Text.js` も含みます。

## ファイル構成

| ファイル / ディレクトリ | 役割 |
|---|---|
| `Text2Frame.js` | メイン実装。テキスト → RPG ツクールイベント JSON へのコンパイラ。RPG ツクール MV/MZ のプラグインとしても動作し、`compile()` 関数を外部から呼び出すことも可能 |
| `Frame2Text.js` | 逆変換。RPG ツクールイベント JSON → テキスト |
| `Text2Frame.es.mjs` / `Text2Frame.cjs.js` / `Text2Frame.umd.js` | ビルド成果物（`npm run build` で生成）。直接編集しない |
| `esm.d.ts` | TypeScript 型定義 |
| `vite.config.js` | ビルド設定（ESM / CJS / UMD の 3 形式を出力） |
| `data/` | サンプル用の RPG ツクールイベント JSON（`Map001.json`, `CommonEvents.json`） |
| `test/` | mocha テストスイート |
| `test/test_json_eq.js` | Text2Frame のメインテスト |
| `test/test_frame2text.js` | Frame2Text のテスト |
| `test/test_cases.js` | テストケース定義 |
| `examples/` | サンプルテキストファイル |
| `en/` | 英語版ドキュメント |

## 開発コマンド

```bash
npm test                  # 全テスト実行 (mocha)
npm run test_text2frame   # Text2Frame のテストのみ
npm run test_frame2text   # Frame2Text のテストのみ
npm run lint              # ESLint（警告0件が基準）
npm run build             # vite でビルド（ESM/CJS/UMD 生成）
npm run debug             # Text2Frame.js を node で直接実行
```

## タグ文法（テキストファイルの書き方）

テキストファイル内で `<タグ名: 引数>` の形式でイベントコマンドを埋め込む。代表的なタグ：

- `<顔: ファイル名, インデックス>` — 顔グラフィック指定
- `<背景: ウィンドウ|暗くする|透明>` — 背景種別
- `<位置: 上|中|下>` — ウィンドウ位置
- `<名前: 名前>` — ネームボックス（MZ）
- `<Switch: 番号, ON|OFF>` — スイッチ操作
- `<Set: 変数番号, 値>` — 変数への代入
- `<If: 条件> ... <Else> ... <End>` — 条件分岐
- `<Loop> ... <RepeatAbove>` — ループ
- `<comment> ... </comment>` — 注釈
- `<script> ... </script>` — スクリプト
- `%` 行頭 — コメントアウト（取り込まれない）

## テスト追加の指針

- `test/` 内の `.txt` ファイルが入力、`expected_*.json` が期待出力
- 新しいタグや挙動を追加したら、対応する `.txt` と `expected_*.json` をセットで `test/` に追加する
- `test/test_cases.js` にテストケースを登録する

## 対応バージョン

- RPG ツクール MV・MZ 両対応
- MZ 専用機能: ネームボックス、ピクチャ移動（イージング）、変数操作（直前の情報）、条件分岐（タッチ/マウス）、MZ プラグインコマンド

## コーディング規約

- ESLint 設定: `.eslintrc.json`（`eslint-config-standard` ベース）
- 警告 0 件を維持すること（`--max-warnings=0`）
- ビルド成果物（`*.cjs.js`, `*.es.mjs`, `*.umd.js`）は直接編集しない

## 初動チェックリスト（最初の5分）

1. 変更対象が `Text2Frame.js` か `Frame2Text.js` か、またはテストのみかを確定する
2. 既存テストで近いカテゴリを `test/test_cases.js` から特定する
3. 仕様影響がある場合は、入力 `.txt` と期待値 `expected_*.json` の両方を更新対象に含める
4. 変更前に少なくとも `npm test` を一度実行し、ベースラインを把握する

## 変更完了条件（Definition of Done）

- 変更意図に対応するテストが `test/test_cases.js` に登録されている
- 既存テストを壊していない（`npm test` が成功）
- 静的検証が必要な変更では `npm run lint` が成功
- ビルド成果物に差分を出した場合、ソース由来であることを説明できる

## 変数置換機能の注意点

- `#vars ... #endvars` の `${name}` 置換は、タグ解析より前に全体へ適用される
- 未定義変数はエラーになる（`Undefined variable. / 未定義の変数です。: <name>`）
- `Actors[...]` や `Variables[...]` など ID を期待する箇所では、数値化できない値はフォールバック動作になるため、可読ラベルを直接入れない
- 可読性を上げる場合は「可読名 -> 数値/式」のマッピングを `#vars` 側で行う

## テスト配置ルール（運用）

- 変数置換関連は `test/variable-substitution/` に集約する
- 入力ファイルは `*-vars.txt` を基本とし、期待値は `expected_*.json` で対応させる
- 既存回帰との比較が必要な場合、同一カテゴリに「固定値版」と「変数版」を並べる
- 新規追加時は、必要に応じて期待値を `Text2Frame.js` の `compile()` 出力から生成し、差分確認後に登録する

## 変更パターン別の推奨手順

### 1) タグ仕様追加・変更

1. `Text2Frame.js` のパース処理を更新
2. 代表ケースの `.txt` / `expected_*.json` を追加
3. `test/test_cases.js` に登録
4. `npm test` と必要なら `npm run lint` を実行

### 2) テストのみ追加

1. 対象カテゴリの既存ケースを複製して最小差分で作成
2. 期待値 JSON を生成または整備
3. `test/test_cases.js` へ登録
4. `npm test` を実行

### 3) ドキュメント整備のみ

1. 仕様変更を伴わないことを確認
2. 実際のテスト配置と記述の整合性を確認
3. 手順・注意点が再現可能かをチェック
