# Text2Frame Language Support

RPG ツクール MV/MZ 用プラグイン **Text2Frame** のスクリプトを、VS Code で快適に編集するための拡張機能です。シンタックスハイライト・入力補完に加え、編集中のテキストをそのままゲームデータへ反映する **Watch & Deploy** を備えています。

---

## 主な機能

| 機能 | 内容 |
| --- | --- |
| 🎨 シンタックスハイライト | タグ（`<Face: >` など）・コメント（`%`, `<comment>…</comment>`）・`<script>` 内の JS・メッセージ本文を色分け |
| ✨ 入力補完 | `<` を入力すると 200 以上のタグ候補を表示（説明・スニペット付き） |
| 📖 ホバー説明 | タグにカーソルを合わせると使用例と説明を表示 |
| 🔍 診断 | 閉じ忘れの `<` `>`、空タグをリアルタイムに検出 |
| 🚀 Watch & Deploy | 編集中のテキストをゲームデータ JSON へ即反映（下記参照） |
| 📤 書き出し / 一括 | データ→テキストの書き出し、`text/` 一括デプロイ・一括書き出し |
| 🌐 翻訳ワークフロー | 翻訳セットの作成→編集→反映を VS Code だけで完結（下記参照） |

---

## 🚀 Watch & Deploy — テキスト→データ即反映

編集中のテキストファイルを、ターミナルを使わずに RPG ツクールのデータ JSON
（`data/Map###.json` / `data/CommonEvents.json`）へコンパイルして書き戻します。

### 使い方

1. デプロイ先を示す **フロントマター** を持つテキストファイルを開く（下記参照）。
2. コマンドパレットまたはエディタ右上のボタンから操作する。

| コマンド | 動作 |
| --- | --- |
| `Text2Frame: Deploy Current File` | 現在のファイルを今すぐデプロイ |
| `Text2Frame: Toggle Deploy on Save` | 保存時の自動デプロイを ON / OFF 切り替え |
| `Frame2Text: Export Current File from Data` | 現在のファイルをデータから書き出し（取り込み） |
| `Text2Frame: Export for Translation` | 現在のファイルの会話のみを `*.translation.txt` に書き出し |
| `Text2Frame: Deploy All` | `text/` 配下のフロントマター付き .txt をすべて反映 |
| `Text2Frame: Export All` | すべてのイベント/コモンを `text/<locale>/` へ書き出し |
| `Text2Frame: Create Translation Set` | 翻訳セットを `text/<targetLocale>/` に作成（後述） |
| `Text2Frame: Deploy Translation` | `text/<targetLocale>/` のみをデータへ反映（後述） |
| `Text2Frame: Merge Translation (overlay)` | 構造を保持し会話だけ反映（後述） |
| `Text2Frame: Merge Translation (3-way)` | 祖先基準で両者の編集を統合・衝突は両方残す（後述） |

ステータスバーに現在の状態と直近の結果が表示されます。

| 表示 | 意味 |
| --- | --- |
| `$(eye) T2F: watching` | 自動デプロイ ON |
| `$(circle-outline) T2F: off` | 自動デプロイ OFF |
| `$(check) T2F ok` | 直近のデプロイ成功（警告数も表示） |
| `$(error) T2F fail` | 直近のデプロイ失敗（詳細はツールチップ／通知） |

### デプロイ先はフロントマターで決まる

ファイル先頭の YAML フロントマター（`kind` / `mapId` / `eventId` / `pageId` /
`commonEventId`）から書き戻し先を判定します。ファイル単体で宛先が決まります。

```text2frame
---
kind: event
mapId: 1
eventId: 1
pageId: 1
---

<Face: Actor1(0)>
こんにちは
```

コモンイベントの場合：

```text2frame
---
kind: common
commonEventId: 3
---

セリフ…
```

### 安全のしくみ

- **データ変更ガード**: デプロイ先 JSON が、拡張が最後に書き込んで以降に**外部で更新**(RPG ツクール等)されていると、上書き前に確認ダイアログを表示します。
  - **[上書きする]** … テキストで上書き(直前の JSON を `*.json.conflict.bak` に退避)
  - **[先に取り込む(pull)]** … デプロイせず、最新データをテキストへ書き出して取り込む
  - **[キャンセル]** … 何もしない
  - これにより「データを更新したのにテキストから書き出すのを忘れて保存 → 上書き消失」を防ぎます。
- 最初の書き込み前に、対象 JSON のオリジナルを `*.bak` として 1 度だけ退避します。
- 文法エラー時は書き込まずに中断し、エラーを通知します。
- 差分の警告・エラーは通知と **Text2Frame Deploy** 出力チャンネルに表示されます。
  - `diff` 方式では、ブロックの**内容変更**は「`Block changed / ブロックが変更されます`」、
    テキストから消えて**削除されるブロックのみ**「`Block removed / ブロックが削除されます`」と報告されます。

> ⚠️ デプロイは稼働中の `data/` JSON を直接書き換えます。反映を確認するときは
> RPG ツクールのエディタを **保存せずに** 開き直してください。

### 設定

| 設定キー | 既定値 | 説明 |
| --- | --- | --- |
| `text2frame.strategy` | `diff` | `diff`＝最小マージ、`import`＝イベントを上書き |
| `text2frame.normalizeAfterDeploy` | `false` | 保存時デプロイ後、データからテキストへ書き戻して正準形に整形。保存ファイルが書き換わりエディタが再読込されます(外部変更の取り込みではありません) |
| `text2frame.modulePath` | （空） | `Text2Frame.js` のパスを明示指定（空なら自動解決） |
| `text2frame.dataDir` | `data` | データフォルダ(ワークスペース相対) |
| `text2frame.textBaseDir` | `text` | テキストの基準フォルダ(ワークスペース相対) |
| `text2frame.locale` | `ja` | 「すべて書き出す」の出力先サブフォルダ |
| `text2frame.sourceLocale` | `ja` | 翻訳元(原文)の言語 |
| `text2frame.targetLocale` | `en` | 翻訳先の言語(翻訳セットの対象サブフォルダ) |

### 動作要件

本拡張は **VS Code に内蔵された Node ランタイム（拡張ホスト）** 上でコンパイラ
（`Text2Frame.js`）を読み込みます。そのため **Windows ネイティブの VS Code で
そのまま動作し**、Node.js を別途インストールする必要はありません。

コンパイラの解決順は次のとおりです。

1. 設定 `text2frame.modulePath`（明示指定がある場合）
2. 拡張に同梱した `lib\Text2Frame.js`（パッケージ版）
3. モノレポ兄弟 `..\Text2Frame.js`（開発時）
4. 開いているワークスペース内の `Text2Frame.js`（`js\plugins\Text2Frame.js` も探索）

---

## 🌐 翻訳ワークフロー（VS Code だけで完結）

原文(`sourceLocale`、既定 `ja`)を別言語(`targetLocale`、既定 `en`)へ翻訳し、
ゲームへ戻すまでをコマンド2つで行えます。

1. **翻訳セットを作成** — コマンドパレット →「Text2Frame: 翻訳セットを作成 / Create Translation Set」
   - `data` を走査し、`text/<targetLocale>/<key>.txt` を生成します。
   - 本文は**原文と同じ内容**、front matter に `locale` / `sourceLocale` が付きます（デプロイ先 `mapId`/`eventId`/`pageId` は原文と同一）。
   - **既存ファイルは上書きしません**（翻訳の途中で再実行しても安全）。
2. **翻訳する** — `text/<targetLocale>/` 配下の本文・選択肢ラベルを編集します。
   - front matter とタグ（`<Face..>` 等）、空行マーカー `<br>` は触らないでください。
3. **ゲームへ反映** — 用途に応じて次のいずれかを実行します。

| コマンド | 挙動 | 使いどころ |
| --- | --- | --- |
| Deploy Translation | `text2frame.strategy`（`diff`/`import`）で反映。**テキストが正**（テキストに無い JSON 側コマンドは消える） | テキストが完全な正のとき |
| **Merge Translation (overlay)** | **JSON 構造を保持し会話文字列だけ差し替え** | ツクール UI で構造(移動/分岐/スイッチ)を編集済み。ライターはセリフのみ翻訳 |
| **Merge Translation (3-way)** | 祖先(`.t2f-base/`＝翻訳セット作成時に保存)を基準に**ライター編集と UI 編集を統合**。同じ箇所を双方が別々に変えた時だけ**両方残す**（`<<<<<<<` コメント＋警告）。祖先が無ければ overlay に自動フォールバック | ライターも構造を触る／確実に両者を残したい |

> **pull（データ→テキスト書き出し）との違い**: 「ゲームからテキストへ書き出し」や外部更新時の *pull* は JSON でテキストを**上書き**し、翻訳を失って祖先をリセットします。翻訳を保持したいときは *pull* ではなく **overlay / 3-way マージ**を使ってください。

> 個別ファイルを編集中に保存→即反映したい場合は、従来どおり「保存時に自動反映」を有効にすれば、front matter のルーティングでそのイベントへデプロイされます（方式は `text2frame.strategy`）。

---

## 編集例

`.t2f` または `.text2frame` 拡張子のファイルを作成して編集します。

```text2frame
<comment>
* オープニングシーン
</comment>

今日も一日がんばるぞい！

<Face: Actor1(0)>
今日も一日がんばるぞい！（顔付き）

<WindowPosition: Bottom>
<Background: Dim>
<Name: 涼風青葉>
今日も一日がんばるぞい！

% コメント行
<PlayBGM: Theme1>

<ShowChoices: Window, Right, 1, 2>
<When: はい>
そうですか！
<When: いいえ>
残念です。
<End>

<wait: 60>
```

---

## 対応タグ（抜粋）

**表示設定**

| タグ | 説明 |
| --- | --- |
| `<Face: >` | 顔グラフィック |
| `<WindowPosition: >` | ウィンドウ位置（Top / Middle / Bottom） |
| `<Background: >` | 背景（Window / Dim / Transparent） |
| `<Name: >` | 名前（MZ） |

**イベントコマンド**

| タグ | 説明 |
| --- | --- |
| `<ShowChoices: >` / `<When: >` / `<End>` | 選択肢と分岐 |
| `<Switch: >` / `<Set: >` / `<If: >` | スイッチ・変数・条件分岐 |
| `<PlayBGM: >` / `<PlaySE: >` | オーディオ |
| `<wait: >` | ウェイト |
| `<script>…</script>` | JavaScript の実行 |

…ほか 100 以上の RPG ツクールイベントコマンドに対応しています。

---

## 開発

```bash
npm install        # 依存をインストール
npm run compile    # TypeScript をビルド（out/）
npm run watch      # 変更を監視してビルド
npm run lint       # ESLint
```

`F5` で Extension Development Host を起動するとデバッグできます。

パッケージ（`.vsix`）化の前に、同梱コンパイラを生成します（`vscode:prepublish` で自動実行）。

```bash
npm run bundle-compiler   # 親リポジトリの Text2Frame.js を lib/ にコピー
```

---

## 情報

- **対象拡張子**: `.t2f`, `.text2frame`
- **`.txt` の自動認識**: Text2Frame のフロントマター(`---\nkind: ...`)を持つ `.txt` を開くと、自動的に text2frame 言語として扱い、ハイライト・補完・ホバー・診断が有効になります(リネーム不要)。フロントマターの無い通常の `.txt` は対象外です。
- **必要環境**: VS Code 1.85.0 以上
- **ライセンス**: MIT

## 関連リンク

- [Text2Frame-MV プラグイン](https://github.com/yktsr/Text2Frame-MV)
- [RPG Maker MV](https://www.rpgmakerweb.com/)
