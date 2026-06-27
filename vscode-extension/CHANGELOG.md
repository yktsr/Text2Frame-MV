# Change Log

このファイルは Text2Frame Language Support 拡張機能の変更履歴です。
バージョンは [Semantic Versioning](https://semver.org/lang/ja/) に従います。
VS Code の慣例により、**奇数マイナー** (`0.1.x`) を pre-release、**偶数マイナー** (`0.2.x`) を安定版として扱います。

## [0.1.0] - 2026-06-27 (pre-release)

最初の pre-release。Watch & Deploy に加えて、VS Code だけで完結する翻訳ワークフローを追加。

### Added
- **翻訳ワークフロー（VS Code 完結）**
  - `Text2Frame: Create Translation Set` — データを走査し `text/<targetLocale>/` に翻訳セットを生成（原文と同じ本文＋`locale`/`sourceLocale` のフロントマター）。既存ファイルは上書きしない。
  - `Text2Frame: Deploy Translation` — `text/<targetLocale>/` のみをデータへ反映（原文ロケールを巻き込まない）。
  - 設定 `text2frame.sourceLocale`（既定 `ja`）/ `text2frame.targetLocale`（既定 `en`）。
- 拡張機能のアイコンを追加。

### Changed
- 同梱コンパイラ（`Text2Frame.js` / `Frame2Text.js`）を最新化。モジュール解決順を変更し、開発（F5）では生ファイル `../` を同梱 `lib/` より優先（再バンドル不要）。パッケージ版は従来どおり同梱 `lib/` を使用。

### Fixed（同梱コンパイラの往復変換）
- 実ゲームデータでの書き出し→取り込みの往復が完全一致（2902/2902）になるよう、以下を修正:
  - **Skip (109)** ブロックを `<Skip>` / `<SkipEnd>` として保持（従来は無言で欠落）。
  - **選択肢の `<End>`** が、分岐末尾に `<SetMovementRoute>` がある場合に条件分岐終了(412)へ誤変換されていた問題を修正（正しく選択肢終了 404）。
  - **空のメッセージ行** を `<br>` マーカーで往復保持（従来は欠落・ウィンドウ分割）。
  - **移動ルートの Script(45)** をそのまま保持（従来はカンマ分割＋小文字化で破損）。
  - **全角スペースのみの行** が消える問題を修正。
- **差分デプロイの警告**: 内容変更を「`Block changed / ブロックが変更されます`」、本当に削除されるブロックのみ「`Block removed / ブロックが削除されます`」と報告（変更を削除と誤報告しない）。
