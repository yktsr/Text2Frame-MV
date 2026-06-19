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
