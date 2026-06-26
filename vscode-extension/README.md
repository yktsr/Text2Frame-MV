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

> ⚠️ デプロイは稼働中の `data/` JSON を直接書き換えます。反映を確認するときは
> RPG ツクールのエディタを **保存せずに** 開き直してください。

### 設定

| 設定キー | 既定値 | 説明 |
| --- | --- | --- |
| `text2frame.strategy` | `diff` | `diff`＝最小マージ、`import`＝イベントを上書き |
| `text2frame.syncOnSave` | `false` | 保存時デプロイ後にデータからテキストへ書き戻して同期(正規化)。保存ファイルが書き換わりエディタが再読込されます |
| `text2frame.modulePath` | （空） | `Text2Frame.js` のパスを明示指定（空なら自動解決） |
| `text2frame.dataDir` | `data` | データフォルダ(ワークスペース相対) |

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
