# Text2Frame
Simple compiler to convert text to event.

![Node.js CI](https://github.com/yktsr/Text2Frame-MV/actions/workflows/nodejs.yml/badge.svg)
![CodeQL](https://github.com/yktsr/Text2Frame-MV/actions/workflows/github-code-scanning/codeql/badge.svg)

[日本語](#japanese) | [English](#english)

---

<a name="japanese"></a>
## 日本語

テキストファイル(.txtファイルなど)から「文章の表示」イベントコマンドに簡単に変換するための、RPGツクールMV・MZ用の開発支援プラグインです。

## 最新版プラグインのダウンロード
[![Download Text2Frame](https://img.shields.io/badge/Download-Text2Frame.js-blue)](https://github.com/yktsr/Text2Frame-MV/releases/download/2.3.0/Text2Frame.js)

[![Download Frame2Text](https://img.shields.io/badge/Download-Frame2Text.js-blue)](https://github.com/yktsr/Text2Frame-MV/releases/download/2.3.0/Frame2Text.js)

[![Download VisualStudioCode Plugin](https://img.shields.io/badge/Download-VisualStudioCodePlugin-blue)](https://marketplace.visualstudio.com/items?itemName=yktsr.text2frame-language-support)

## 更新履歴
* Version 2.3.0：
  * テキストファイルの取り込み方法を強化し、従来の「追記」、「上書き」の他に、変更の「統合」が選べるようになりました。この統合モードは、RPGツクール上のUIを使ったゲーム編集を壊すことなく、テキストファイルで行った編集をゲームに反映することができるようになりました。
  * 一括反映コマンド、一括取り出しコマンドを追加しました。従来、一つのテキストを一つのイベントに書き込むには、一つのプラグインコマンドが必要でしたが、すべてのイベント・コモンイベントを一括で処理する機能を追加しました。これにより、コマンドを一つ実行するだけで、ゲームとテキストを同期できるようになりました。
  * テキストとゲームを**自動で双方向同期**できるようになりました。テキストやゲームデータの変更を監視し、相互に反映します。ターミナルからの `npx t2f-sync start` に加え、プラグインコマンド **`START_DATA_SYNC`** でも起動できるため、npm や Node.js の別途導入なしで使えます。詳細は「[テキストとゲームを同期する（SYNC）](#テキストとゲームを同期するsync)」を参照してください。
  * 取り出したテキストから、**既定値と同じ顔・背景・位置のタグを省く**ようにしました。3つとも既定ならタグ行ごと消え、セリフだけが並びます。取り込んだ結果は変わりません。
  * [Visual Studio Code](https://code.visualstudio.com)の[Plugin](https://marketplace.visualstudio.com/items?itemName=yktsr.text2frame-language-support)に対応しました。プラグインコマンドの実行をUI上から簡単に行えるようになりました。ボタンひとつでゲームとテキストを相互に同期できるようになり、従来難しかった、文法のミスもシンタックスハイライト機能により、視覚的にわかるようになりました。Watch & Deploy 機能により、テキストの変更を監視し、テキストファイルを保存すると自動的にゲームに反映できるようになりました。詳細な機能や使い方は[マーケットプレイス](https://marketplace.visualstudio.com/items?itemName=yktsr.text2frame-language-support)を参照してください。
  * 不具合を修正し、安定性を向上しました。
![./introduce_Text2Frame_plugin.png](./vscode.png)


## 機能概要
![./introduce_Text2Frame_MV_MZ.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Text2Frame_MV_MZ.png)

この RPGツクールMV/MZ のプラグインは、「会話イベント」などを、ツクール**以外**の、テキストエディタで編集し、作成したテキストファイルから一括でイベントコマンドとして取り込むことができます。

これにより、イベントの作成はRPGツクール上で、シナリオの取り込みはテキストファイルで、といった、自分の作成スタイルに最も合ったエディタで制作を進めることができます。

最も基本的な使い方は、以下のデモを見てください。
高度な使い方やプラグインパラメータの詳細は[wiki](https://github.com/yktsr/Text2Frame-MV/wiki)を参照してください。

***デモ/Quick Start***

1. シナリオファイルを作成します
1. text/message.txtとして保存します
1. プラグインコマンドを実行するイベントを作成します
1. プラグインコマンドを設定します
1. 書き出し先のイベントを作成します
1. プラグインコマンドをテストで実行します
1. プロジェクトをリロードするか、開き直します

より詳細な手順は[wiki](https://github.com/yktsr/Text2Frame-MV/wiki)を参照してください。

![./basic_sample.gif](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/basic_sample.gif)


## 導入方法

### ゲームのプラグインとして使う（基本）
1. [ここ](https://github.com/yktsr/Text2Frame-MV/releases)から Text2Frame.js をダウンロードします。
1. 導入したいプロジェクトのプラグインフォルダ(`js/plugins/`)に入れます。
1. プラグインエディターからText2Frameのプラグインを有効にします。

（取り出し機能を使うときは Frame2Text.js も同じ場所に入れてください）

### npm / CLI として使う（上級者向け）
ターミナルからの一括反映・取り出し・双方向同期や、ライブラリとしての利用はこちら。**ゲームのプラグイン導入とは別チャネル**です（npm パッケージ＝プラグインファイルではありません）。

```bash
npm install -D @yktsr/text2frame-mv

npx t2f-sync start                                # テキスト⇄ゲームを双方向に自動同期
npx text2frame --mode batch --text-dir text      # 反映(text -> game)
npx frame2text --mode batch --data-dir data       # 取り出し(game -> text)
```

ライブラリとして:
```js
const { compile, applyTextFile } = require('@yktsr/text2frame-mv')
```

（GitHub から直接入れることもできます: `npm install -D github:yktsr/Text2Frame-MV`。この場合も `npx text2frame`、`npx frame2text`、`npx t2f-sync` を使えます）


## テキストとゲームを同期する（SYNC）

テキストを書き換えたらゲームへ、ツクールで直したらテキストへ。**双方向を自動で追従**させる機能です。
どちらか一方だけが「正しい」わけではなく、**両側の編集を残したまま**突き合わせます（3-way マージ）。
同じ場所を両方で変えたときだけ、どちらも捨てずに[目印付きで両方残し](#競合したときの表示両方残す)ます。

反映・取り出しには **3つの入口**があります。共通の統合処理と祖先データ（`.t2f-base`）を使いますが、監視の起動方法や対象範囲は異なります。

| 入口 | 起動方法 | 必要なもの |
| --- | --- | --- |
| **プラグインコマンド** | `START_DATA_SYNC` | Text2Frame.js と Frame2Text.js |
| **VS Code 拡張** | 拡張の反映・取り出し・監視機能 | [VS Code 拡張](https://marketplace.visualstudio.com/items?itemName=yktsr.text2frame-language-support) |
| **ターミナル (CLI)** | `npx t2f-sync start` | Node.js / npm |

### プラグインコマンドで同期する（ターミナル不要）

いちばん手軽な方法です。npm も Node.js も要りません。プラグインを2つ入れて、プレイテストから実行します。

同期は Text2Frame の独立したコマンド **`START_DATA_SYNC`** で開始します。
`both` / `push` では既存テキストを一括反映してから監視を始めます。`pull` は監視だけを始めます。
開始時には取り出しを行わないため、テキストがまだ無い場合は先に Frame2Text の一括取り出しを実行してください。

```
BATCH_EXPORT_MESSAGES_TO_FOLDER text merge conversation
START_DATA_SYNC both text merge
STOP_DATA_SYNC
```

上の例は「会話があるイベントを取り出す」「双方向同期を始める」「同期を止める」の各コマンドです。必要なタイミングで個別に実行します。
テキスト→ゲームだけなら `START_DATA_SYNC push text merge`、ゲーム→テキストだけなら `START_DATA_SYNC pull text merge` を使います。

MV では上記をプラグインコマンドにそのまま書きます（日本語の別名 `テキストとゲームの同期を開始` / `テキストとゲームの同期を停止` も使えます）。
MZ では Text2Frame の「テキストとゲームの同期を開始」を選び、「同期の向き」「テキストのフォルダ名」「反映方法」を設定します。

MV の引数は次の順です。すべて省略できます。

- 同期開始: 向き（`both`/`push`/`pull`）・テキストフォルダ・反映方法（`merge`/`overwrite`）。既定は `both text merge`。
- 一括反映: テキストフォルダ・反映方法（`add`/`merge`/`overwrite`）。省略時はプラグインパラメータを使い、初期値は `text add`。
- 一括取り出し: テキストフォルダ・反映方法（`merge`/`overwrite`）・取り出す範囲（`all`/`nonempty`/`conversation`/`custom`）。省略時はプラグインパラメータを使い、初期値は `text overwrite conversation`。

一括反映・一括取り出しは一度だけ処理して終了します。同期では、繰り返すと内容が増える `add` は使えません。プラグインコマンドのゲームデータの場所は `data/` 固定です。

開始すると `text/` 直下と `data/` 直下を見張り、

- **テキストを保存した** → そのファイルをゲームへ反映（push）
- **`data/Map*.json` / `data/CommonEvents.json` が変わった** → 対応する見出し情報付きテキストがあるイベントを取り出し（pull）

を自動で行います。自分が書いたファイルは内容を覚えているので、text→game→text のピンポンは起きません。

覚えておくこと:

- 監視は**ゲームのプロセスで動く**ので、プレイテストを閉じると止まります。
- **実行中のゲームの画面は変わりません**（起動時に読んだデータを持ち続けるため）。確認は F5 でリロードしてください。
- 進行状況はコンソール（F8）に出ます。
- ツクールのエディタは**閉じて**使ってください。エディタの「プロジェクトの保存」は `data` を丸ごと書き戻すため、まとまった変更を見つけたときは保存とみなして自動取り出しを見送ります。
- 監視対象は `text/` 直下と `data/` 直下だけです（サブフォルダは見ません）。
- `chokidar` などの外部ライブラリは使わず、Node 組み込みの `fs.watch` で動くので、npm 導入なしで使えます。

### ターミナルから同期する（t2f-sync）

npm を使える環境なら、ゲームを起動しなくても同期できます。オプションの一覧は
「[4. 双方向同期（t2f-sync）](#4-双方向同期t2f-sync)」を参照してください。

```bash
npx t2f-sync start                                    # 双方向に自動同期
npx t2f-sync once --direction pull --text-dir text-en --scope conversation
# 一度だけ、会話があるイベントを英語版のフォルダへ取り出す
```


## プラグイン固有の文法
このプラグインでは、基本となるメッセージの取り込み以外にも、下記のような専用のタグを使うことで、より高度な取り込みを実現できます。

下記は代表的なものであり、詳細な文法は[wiki](https://github.com/yktsr/Text2Frame-MV/wiki)を参照してください。

### 顔・背景・位置・名前の設定
タグを使って、顔・背景・位置等のメッセージの設定を変更することができます。
これらのデフォルト値は、プラグインのオプションから変更することができます。

#### 顔の指定 <顔: 顔の指定>
ウインドウに表示される顔を指定することができます。

![./introduce_Face.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Face.png)

#### 背景の変更 <背景: 背景の指定>
ウインドウの背景を変更することができます。

![./introduce_Background.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Background.png)

#### 位置の変更 <位置: 位置の指定>
ウインドウの位置を変更することができます。

![./introduce_WindowPosition.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_WindowPosition.png)

#### 名前の設定(MZ用) <名前: ○○○○>
ウィンドウに表示される名前を指定することができます。

![./introduce_WindowPosition.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_namebox.png)

### イベントコマンドを組み込むタグ
「文章の表示」以外にも、他のすべてのイベントコマンドにも対応しています。
以下のタグをメッセージの間に挟むことで、そのタグがイベントコマンドに置き換わります。
例えば、
```
<Set: 1, 2>
<CommonEvent: 3>
今日も一日がんばるぞい！
```
とすることで、「今日も一日がんばるぞい！」というメッセージの前に、「変数の操作(変数1に定数2を代入する)」と「コモンイベント(ID3)」のイベントコマンドが組み込まれます。

全てのタグの詳細は[wikiの文法ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9)や
プラグイン本体のヘルプ文に記載しています。


### よく使われるイベントコマンドの早見表
以下に、よく使われるイベントコマンドに絞って早見表を記載しています。ここに記載しているもの以外にも、すべてのイベントコマンドに対応しています。

|イベントコマンド|タグ|詳細|
|:-|:-|:-|
|選択肢の表示|\<ShowChoices\><br><When: はい><br>選択肢1を選んだ時の処理<br><When: いいえ><br>選択肢2を選んだ時の処理<br>\<End\>|「はい」と「いいえ」の選択肢を表示する。|
|スイッチの操作(ON)| <Switch: 1, ON> | スイッチ1をONにする。|
|スイッチの操作(OFF)| <Switch: 1, OFF> | スイッチ1をOFFにする。|
|変数の操作(代入)| <Set: 1, 2> |変数1に定数2を代入する。|
|変数の操作(加算)| <Add: 1, V[20]>|変数1に変数20の値を加算する。|
|変数の操作(減算)| <Sub: 1, R\[50\]\[100\]>|変数1に最小値50最大値100の乱数を減算する。|
|変数の操作(乗算)| <Mul: 1-10, GD\[Item\]\[2\]>|変数1〜10にID2のアイテムの所持数を乗算する。|
|変数の操作(除算)| <Div: 1, GD\[BattleCount\]\> |変数1に戦闘回数を除算する。|
|変数の操作(剰余)| <Mod: 1-10, SC\[$dataMap.width\]>|変数1〜10に"$dataMap.width"の値で割った余りを代入する。|
|セルフスイッチの操作(ON)|<SelfSwitch: A, ON>|セルフスイッチAをONにする。|
|セルフスイッチの操作(OFF)|<SelfSwitch: A, OFF>|セルフスイッチAをOFFにする。|
|条件分岐|<If: Switch[1], ON><br>条件を満たしている時の処理<br>\<Else\><br>条件を満たしていない時の処理<br>\<End\>|「スイッチ1がONの場合」という条件で処理を分岐する。|
|ループ|\<Loop\><br>ループしたい処理<br>\<RepeatAbove\>|処理をループする。|
|ループの中断|\<BreakLoop\>|ループ処理を該当箇所で中断する。|
|コモンイベント|<CommonEvent: 1>|ID1のコモンイベントを挿入する。|
|ラベルを設定する|\<Label: サンプル\>|"サンプル"というラベルを設定する。|
|ラベルジャンプ|\<JumpToLabel: サンプル\>|"サンプル"というラベルへ処理をジャンプする。|
|注釈|\<comment\><br>今日も一日がんばるぞい！<br>\</comment\>|"今日も一日がんばるぞい！"という注釈を挿入する。|
|所持金の増減|<ChangeGold: Increase, 100>|所持金を100増やす。|
|アイテムの増減|<ChangeItems: 3, Increase, 4>|IDが3のアイテムを4つ増やす。|
|武器の増減|<ChangeWeapons: 1, Increase, 2>|IDが1の武器を2つ増やす。|
|防具の増減|<ChangeArmors: 1, Increase, 2>|IDが1の防具を2つ増やす。|
|場所移動|<TransferPlayer: Direct[1][10][20], Retain, Black>|向きがそのままで、フェードが黒で、IDが1のマップのX座標10,Y座標20に移動。|
|ピクチャの表示|<ShowPicture: 1, Castle, Scale[50][55]>|幅50%, 高さ55%でCastle.pngの番号1の画像を表示する。|
|ピクチャの移動|<MovePicture: 1, Position[Center][200][Variables[3]]>|原点は中央で、X座標は200,Y座標は変数3の位置に番号1の画像を移動する。|
|ピクチャの回転|<RotatePicture: 1, -30>|速度が-30で番号1のピクチャを回転する|
|ピクチャの色調変更|<TintPicture: 1, Duration[60], ColorTone[0][100][255][50]>|赤0, 緑100, 青255, グレイ50に、60フレーム(1秒)かけて番号1のピクチャの色調を変更する。|
|ピクチャの消去|<ErasePicture: 1>|番号1のピクチャを削除する。|
|ウェイト|<Wait: 60>|60フレーム(1秒)のウェイトを挿入する。|
|画面のフェードアウト|\<FadeOut\>|画面のフェードアウトを挿入する。|
|画面のフェードイン|\<FadeIn\>|画面のフェードインを挿入する。|
|画面の色調変更|<TintScreen: Duration[60], ColorTone[0][100][255][50]>|赤0, 緑100, 青255, グレイ50に、60フレーム(1秒)かけて画面の色調を変更する。|
|画面のフラッシュ|<FlashScreen: 50, 100, 150, 170, 60>|赤50, 緑100, 青150, 強さ170で60フレーム(1秒)かけてフラッシュする。|
|画面のシェイク|<ShakeScreen: 5, 8, 60>|強さ5、速さ8で60フレームかけて画面をシェイクする。|
|BGMの演奏|<PlayBGM: Battle1, 90, 100, 0>|BGMをBattle1に、音量90,ピッチ100, 位相0で変更する。|
|BGMのフェードアウト|<FadeoutBGM: 10>|10秒かけてBGMをフェードアウトする。|
|BGSの演奏|<PlayBGS: City, 90, 100, 0>|BGSをCityに、音量90,ピッチ100, 位相0で変更する。|
|BGSのフェードアウト|<FadeoutBGS: 20>|20秒かけてBGSをフェードアウトする。|
|MEの演奏|<PlayME: Curse1, 90, 100, 0>|Curse1をMEとして、音量90,ピッチ100, 位相0で演奏する。|
|SEの演奏|<PlaySE: Attack1, 90, 100, 0>|Attack1をSEとして、音量90,ピッチ100, 位相0で演奏する。|
|SEの停止|\<StopSE\>|SEの停止イベントを挿入する。|
|戦闘の処理|<BattleProcessing: 1>|敵グループ1と戦闘する。|
|戦闘の処理（負けイベント）|<BattleProcessing: 1><br>\<IfWin\><br>勝利した時の処理<br>\<IfLose\><br>敗北したときの処理<br>\<End\>|敵グループ1と敗北可能でエンカウント。|
|セーブ画面を開く|\<OpenSaveScreen\>|セーブ画面を開く。|
|スクリプト|<script><br>console.log("ぞい！");<br></script>|"console.log("ぞい！");"をスクリプトイベントとして組み込む。|
|プラグインコマンド|<PluginCommand: IMPORT_MESSAGE_TO_EVENT>|"IMPORT_MESSAGE_TO_EVENT"をプラグインコマンドとして組み込む。|

より具体的かつその他のイベントコマンドのサンプルは、[動作確認用テキスト文例ページ](https://github.com/yktsr/Text2Frame-MV/wiki/動作確認テキスト)を参照してください。

### コメントアウト
取り込みたい文章の行の先頭に「%」を記載すると、それはコメントと見なされ、取り込まれません。
このコメントアウト記号はプラグインパラメータで変更することができます。

**コメント行はテキストからは消えません。** ゲームに取り込まれない行なので、取り出し（統合・上書きとも）や反映結果の書き戻しでテキストを作り直しても、元のテキストを見て元の位置へ戻します。周りの内容がゲーム側で大きく書き換わったときだけ位置がずれることがあり、そのときはファイル名を挙げて知らせます（消えることはありません）。

### 書き手が入れた書き方も残ります
読みやすさのために入れた次のものも、コメント行と同じ理由で残ります。いずれもゲームには入らないものなので、残してもゲームの中身は変わりません。

- 余分な空行（場面の区切りに2行3行と空けたもの、本文の先頭・末尾の空行）
- タグ行の字下げ（`  <If: スイッチ, 1, ON>` など）
- タグ名の大文字小文字（`<script>` と `<Script>`）

残らないものもあります。`<script>` ブロックの中の空行の数（ブロックの中身はゲームに入るため）、ゲーム側で内容が変わってしまった行の字下げ、そして**空行が無いところに空行は増えません**（1つのメッセージが2つのウィンドウに割れてしまうため）。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9)を参照してください。

### コモンイベントへの書き出し
マップ上のイベントへの書き出しだけでなく、コモンイベントへも書き出すことができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%82%B3%E3%83%A2%E3%83%B3%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E3%81%B8%E3%81%AE%E6%9B%B8%E3%81%8D%E5%87%BA%E3%81%97)を参照してください。

### プラグインコマンド引数を使ったデフォルト値の変更(MV用)
読み込みたいファイルが複数あるときやファイルごとに異なるオプションを適用したいときなどに、プラグインコマンド引数を使うことでより高度な制御が行えます。
この機能はツクールMV用です。ツクールMZではプラグインコマンドから直接設定できます。

詳細は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3)を参照してください。


## 逆変換プラグイン Frame2Text
RPGツクールMV/MZのイベントコマンドを、Text2Frameの記法に則ったテキストにエクスポートするプラグインです。

Frame2Textのダウンロードは[ここ](https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Frame2Text.js)からお願いします。

また、詳細な使い方は[Frame2Textの紹介ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E9%80%86%E5%A4%89%E6%8F%9B%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3Frame2Text)かプラグイン本体のヘルプドキュメントを参照してください。


## Visual Studio Code Plugin
Visual Studio Codeの[Plugin](https://marketplace.visualstudio.com/items?itemName=yktsr.text2frame-language-support)に対応しました。

これにより、プラグインコマンドの実行をUI上から簡単に行えるようになりました。

ボタンひとつでゲームとテキストを相互に同期できるようになり、従来難しかった、文法のミスもシンタックスハイライト機能により、視覚的にわかるようになりました。

詳細な機能や使い方は[マーケットプレイス](https://marketplace.visualstudio.com/items?itemName=yktsr.text2frame-language-support)を参照してください。
![./introduce_Text2Frame_plugin.png](./vscode.png)


## フォルダ一括同期と英語化ワークフロー（CLI）

> この節は **ターミナル（コマンド）でまとめて処理したい人向け** です。ボタン操作だけで反映・取り出し・英語化をしたい方は、上記「[Visual Studio Code Plugin](#visual-studio-code-plugin)」をお使いください（専門用語もやさしく表示されます）。

Text2Frame/Frame2Text は、front matter 付きテキストのフォルダを丸ごと一括処理できます。以下では、**反映**＝テキストをゲームへ書き込む、**取り出し（pull）**＝ゲームの内容をテキストへ書き出す、**front matter**＝ファイル先頭の `---` で囲む設定欄、と呼びます。CLI の既定は **`merge`（祖先との差分を統合）** です。**`overwrite`（全部上書き）** も選べます。祖先のない初回反映では、`merge` でもテキストに書かれていないゲーム側のコマンドは削除されます。ゲーム側の編集を残して作業を始めるには、先に取り出して祖先を作ってください。

### 1. メタ情報付きテキスト

一括取り出し(--mode batch)で書き出すファイルは、先頭に YAML front matter を持ちます。

```yaml
---
kind: event
mapId: 1
eventId: 1
pageId: 1
key: map001_event001_page1
---

Hello
```

#### 既定と同じタグは書かれません

取り出したテキストには必要な顔・背景・位置のタグが付きますが、**既定値と同じものは省略**されます。3つとも既定ならタグ行ごと消え、セリフだけが並びます。

ゲームのプラグインとして使う場合、何を「既定」とするかは **Text2Frame のプラグインパラメータ**（`Default Window Position` / `Default Background`）です。タグが無いとき Text2Frame が補う値そのものなので、省略しても取り込み結果は変わりません。CLI では背景 `Window`・位置 `Bottom` を使います。顔にはパラメータが無く、空の顔は省略の対象です。

ウィンドウの区切りは**メッセージのあいだの空行**が担うので、タグ行が無くなっても分かれたままです。

従来どおり全部書き出すには、Frame2Text のプラグインパラメータ「既定と同じタグを省略する」を false にするか、CLI で `--omit-default-tags false` を渡します。

### 2. 取り出し（JSON -> text）

CLI・t2f-sync・VS Code の取り出しは既定で `merge` となり、**既存の翻訳を残したまま**ゲーム側の新規・変更だけを取り込みます（同一箇所を双方で変えたら両方残す）。白紙から取り直したいときは `--strategy overwrite` を指定します。Frame2Text のプラグインコマンドは、既存作品との互換性のため既定が `overwrite` です。統合したいときは `merge` を選んでください。

```bash
# 単発（既定 merge：翻訳を残す）
node Frame2Text.js --mode map --input_path data/Map001.json --output_path text-en/map001_event001_page1.txt --event_id 1 --page_id 1
# 全部取り直す（上書き）
node Frame2Text.js --mode map --strategy overwrite --input_path data/Map001.json --output_path text-en/map001_event001_page1.txt --event_id 1 --page_id 1
# 一括（既定では会話があるイベントを text-en/ 配下へ書き出し）
node Frame2Text.js --mode batch --data-dir data --text-dir text-en --english_tag true
```

一括取り出しの範囲は `--scope conversation`（会話があるもの、既定）・`all`（全部）・`nonempty`（中身があるもの）・`custom`（既存の見出し情報付きテキストが指すもの）で選べます。既存テキストは見出し情報で対応付けられ、ファイル名を変えていてもその場所を更新します。

3-way の祖先は `.t2f-base/<テキストの置き場所>/<key>.txt` に**自動保存/自動参照**されます（`--base` で明示も可・通常不要）。

### 3. 一括反映（text -> JSON、既定は merge）

**ルーティング情報は各テキスト先頭の front matter（YAML ヘッダ）だけで決まります。**

```bash
# text/ 配下の front matter 付き .txt を再帰走査して一括反映
node Text2Frame.js --mode batch --text-dir text

# フォルダを選んで反映（取り出しの --text-dir と対称。多言語プロジェクトではこちら）
node Text2Frame.js --mode batch --text-dir text-en
```

`--strategy` を省略すると `merge`（既定）です。全上書きしたいときだけ `--strategy overwrite` を付けます。

- **front matter で振り分け**: 各 `.txt` は自分の front matter（`kind`/`mapId`/`eventId`/`pageId`/`commonEventId`）に従って反映先が決まります。front matter を持たない `.txt` はスキップされます。
- **フォルダの選択（`--text-dir`）**: 同じイベントを指すテキストが複数あると、順に同じ宛先へ反映されます。結果は反映方法や祖先によって異なるため、多言語プロジェクトでは `--text-dir <dir>` で対象言語のフォルダを1つ選んでください。
- **方式・祖先の指定**: `--strategy` / `--base` を使います。front matter の `strategy` / `basePath` は反映方法や祖先の指定としては使われません。
- **監視**: `--watch` を付けると text ディレクトリを監視し、変更・追加された `.txt` を自動で再反映します。

### 4. 双方向同期（t2f-sync）

反映と取り出しを1コマンドで面倒みるコントローラです。`Text2Frame.js` / `Frame2Text.js` をライブラリとして呼び出し、**1プロセスが双方向を所有**します。

```bash
# 一度だけ同期（pull -> push）
npm run sync_once
# 監視して自動同期（text 変更 -> 反映 / data 変更 -> 取り出し）
npm run sync
# 方向やフォルダを指定
node t2f-sync.js start --direction both --text-dir text --strategy merge
```

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--direction <both\|push\|pull>` | `both` | 同期方向 |
| `-t, --text-dir <dir>` | `text` | テキストのベースディレクトリ |
| `-d, --data-dir <dir>` | `data` | ゲームデータディレクトリ |
| `--root <dir>` | カレントディレクトリ | テキスト・データ・祖先の基準となるプロジェクトの場所 |
| `-s, --strategy <merge\|overwrite>` | `merge` | 反映・取り出しの方式 |
| `--scope <all\|nonempty\|conversation\|custom>` | `custom` | 取り出す範囲。既定では既存の見出し情報付きテキストだけを更新 |
| `-w, --english_tag <true/false>` | `true` | 取り出すタグを英語表記にする |
| `--debounce <ms>` / `--poll` | `250` / 無効 | `start` の監視待機時間 / ポーリングを使う |

`start` は一度同期してから監視を続け、`once` は一度同期して終了します。`both` では取り出し→反映の順です。初回にテキストを作る場合は `--scope conversation` などを指定するか、先に Frame2Text で取り出してください。

- **無限ループしません**: 自分が書いたファイルは内容ハッシュで覚えており、その変更イベントは無視します（text→game→text のピンポンが起きない）。
- 取り出しは既定 `merge` なので**翻訳を残したまま**ゲーム側の変更だけを取り込みます。祖先（`.t2f-base`）も双方向で更新されます。
- ⚠️ **RPGツクールを開いたまま使う場合の注意**: ツクールはプロジェクト保存時に `data/*.json` を丸ごと書き戻すため、反映済みの内容が保存操作で失われることがあります。反映後はツクール側を**セーブせずに開き直して**ください。

> ターミナルも npm も使わずに同期したい場合は、プラグインコマンド `START_DATA_SYNC` を使います
> （「[テキストとゲームを同期する（SYNC）](#テキストとゲームを同期するsync)」を参照）。

### strategy 一覧（text→JSON の反映方式）

取り込みの方式は **3つ**です。CLI / ライブラリの既定は `merge`、Text2Frame のプラグインコマンドの初期値は `add` です。同期の既定は `merge` で、`add` は使えません。

| strategy | 挙動 | 使いどころ |
| --- | --- | --- |
| `add` | 既存のイベントの末尾にテキストを追記。繰り返すと同じ内容も追加される | 既存の内容を残して追加したいとき |
| `merge` | 祖先があれば 3-way マージで両側の変更を統合。同じ箇所の相反変更は両方残す。祖先が無い初回はテキストの内容で置き換える | 先に取り出して祖先を作り、ゲームとテキストの両方を編集するとき |
| `overwrite` | **テキストを完全な正として全上書き**（テキストに無い JSON 側コマンドは削除） | 初回取り込み・完全再生成・テキストが唯一の正のとき |

MZ の単体取り込み `IMPORT_MESSAGE_TO_EVENT` / `IMPORT_MESSAGE_TO_CE` は、表示名が「反映方法」、保存される引数名が従来どおり `IsOverwrite` です。`add` / `merge` / `overwrite` に加え、旧設定の `true`（上書き）/ `false`（追記）を受け付けます。一括取り込みと同期開始の引数名は `Strategy` です。MV の取り込みでは、反映方法を省略するとプラグインパラメータ `IsOverwrite` を使います。

**3-way の祖先（BASE）は `.t2f-base/<テキストの置き場所>/<key>.txt` に自動保存・自動参照**されます（VS Code / CLI / プラグインで共通・相互運用可、`.gitignore` 済）。CLI では `--base` で明示できます。プラグインコマンドは自動参照のみです。

#### 競合したときの表示（両方残す）
同じ箇所をテキストとゲームの**両方で変更**した 3-way マージでは、どちらも捨てずに次の目印付きで両方を残します。

```
=== テキストの変更 / from text ===
(テキスト側の内容)
=== ゲームの変更 / from game ===
(ゲーム側の内容)
=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ===
```

目印は**処理元の側**に入ります。反映ならテキスト、取り出しならゲームです。競合箇所について、処理先には処理先自身の版が残ります。`strategy` は `merge` のまま解消できます。

1. 目印が入った側（反映ならテキスト、取り出しならゲーム）で、残す方だけにして**目印3行を消す**
2. 同じ方向にもう一度処理する（テキストで決めたなら反映、ゲームで決めたなら取り出し）

衝突したときも祖先（BASE）は進めているため、2 であなたが決めた形がそのまま反対側に入ります。
目印を消さないまま実行すると、その側は対象から外れます（目印ごと再マージすると二重に増えるため）。

#### 3系統の機能パリティ
3-way マージは祖先があれば自動で行います。CLI・t2f-sync・VS Code の取り出しは既定で `merge`、取り込みプラグインコマンドの初期値は `add` です。Frame2Text のプラグインコマンドで統合する場合は、`merge` を明示的に選びます。

| 操作 | VS Code | CLI | プラグイン(MZ) |
| --- | --- | --- | --- |
| ゲームに反映(merge/overwrite) | パネル「ゲームに反映」 | `Text2Frame.js --mode map/common/batch [--strategy merge\|overwrite]` | `IMPORT_MESSAGE_TO_EVENT`/`_TO_CE`(反映のしかたで merge/overwrite/add)・`BATCH_IMPORT_MESSAGES_FROM_FOLDER` |
| ゲームから取り出し(merge/overwrite) | パネル「ゲームから取り出す」 | `Frame2Text.js --mode map/common/batch [--strategy merge\|overwrite]` | `EXPORT_EVENT_TO_MESSAGE` / `EXPORT_CE_TO_MESSAGE`・`BATCH_EXPORT_MESSAGES_TO_FOLDER` |
| 3-way 祖先 | 自動 `.t2f-base` | 自動 `.t2f-base`（`--base` 任意） | 自動 `.t2f-base` |
| 競合(両方残す) | あり | あり | あり |
| 統合のあと、もう一方にも結果を書く | 常に | 常に | 常に |

### 英語化の固定フロー（推奨）

1. `--mode batch --text-dir text-en` で英語版のフォルダへ出力
2. text-en 配下を翻訳
3. batch で JSON へ反映（既定 `merge`。UI 編集を残したまま会話だけ反映されます）
4. 失敗レコードは CLI の JSON レポートで確認

> 反映時の警告について: ブロックの**内容変更**は「`Block changed / ブロックが変更されます`」、
> テキストから消えて**削除されるブロックのみ**「`Block removed / ブロックが削除されます`」と報告されます
> (変更を削除と誤報告しません)。

> VS Code だけで英語化を完結させたい場合は、拡張機能の「ゲームから取り出す / ゲームに反映」
> コマンドを使うフローもあります（[vscode-extension/README.md](vscode-extension/README.md) 参照）。

## Author/連絡先
* [@kryptos_nv](https://twitter.com/kryptos_nv)

## Contributor
* [@Asyun3i9t](https://twitter.com/Asyun3i9t)
  * [大海工房](http://taikai-kobo.hatenablog.com/)
* inazumasoft:Shick
  * [いなずまそふと制作支援部](https://ci-en.net/creator/12715)

## CI Mode
### Install dependencies
```
npm install -D @yktsr/text2frame-mv

npx t2f-sync start                                      # 双方向同期
npx text2frame --mode batch --text-dir text  # 反映
npx frame2text --mode batch --data-dir data  # 取り出し
```

### Show help

```bash
npx text2frame --help
npx frame2text --help
npx t2f-sync start --help
npx t2f-sync once --help
```

Text2Frame CLI の主な指定は次のとおりです。

| オプション | 意味 |
| --- | --- |
| `-m, --mode <map\|common\|compile\|batch>` | 単体反映・コンパイル・一括反映を選択 |
| `-f, --text-file <path>` | 単体反映の入力テキスト。旧名 `--text_path` も使用可 |
| `-t, --text-dir <dir>` | 一括反映のテキストフォルダ（既定 `text`） |
| `-d, --data-dir <dir>` | ゲームデータのフォルダ（既定 `data`） |
| `--root <dir>` | プロジェクトの場所（既定はカレントディレクトリ） |
| `-o, --output_path <path>` | 単体反映先の JSON |
| `-e, --event_id <id>` / `-p, --page_id <id>` | マップイベント・ページの番号（ページは既定 `1`） |
| `-c, --common_event_id <id>` | コモンイベント番号 |
| `-s, --strategy <merge\|overwrite>` | 反映方法（既定 `merge`） |
| `-b, --base <path>` | 統合用の祖先テキスト（省略時は自動参照） |
| `--watch` / `--debounce <ms>` / `--poll` | 一括反映の監視・待機時間（既定 `250` ms）・ポーリング |
| `-v, --verbose` | デバッグ出力 |

単体反映では front matter の宛先を使えます。明示した CLI 引数が優先されます。
`--overwrite true`（上書き）/ `--overwrite false`（追記）は単体反映用の互換指定です。`--strategy` を明示するとそちらを優先します。`-w` は Text2Frame のオプションではありません。

### Run Text2Frame.js with command line

リポジトリから実行する例です。npm から導入した場合は `node Text2Frame.js` を `npx text2frame` に置き換えてください。

```bash
# front matter の宛先へ反映
node Text2Frame.js --mode map --text-file text/map001_event001_page1.txt

# 宛先を明示して上書き
node Text2Frame.js -m map -f test/basic.txt -o data/Map001.json -e 1 -p 1 --strategy overwrite
node Text2Frame.js -m common -f test/basic.txt -o data/CommonEvents.json -c 1 --strategy overwrite

# 一括反映
node Text2Frame.js --mode batch --text-dir text

# コマンド配列だけを標準出力へ出す
cat test/basic.txt | node Text2Frame.js --mode compile
```

反映後は、ツクールのプロジェクトをセーブせずに開き直してください。

### Node.jsプロジェクトでのText2Frameモジュールの使用方法

Text2FrameはNode.jsプロジェクトでライブラリとして使用することができます。
CommonJS形式とES Module形式の両方をサポートしているため、プロジェクトの環境に合わせて選択できます。

#### インストール方法

npm パッケージをインストールします：

```bash
$ npm install @yktsr/text2frame-mv
```

または、package.jsonに以下を追加してください：

```json
{
  "dependencies": {
    "@yktsr/text2frame-mv": "^2.3.0"
  }
}
```

#### CommonJSモジュールとして使用する場合

Node.js の `require` ではパッケージのエントリーポイントを読み込みます。

**examples/commonjs.js:**
```javascript
const TF = require("@yktsr/text2frame-mv")

// テキストからイベントコマンドのJSONを生成
const date = new Date().toLocaleString()
const text = `<comment>
CommonJSモジュールで使用
出力日時: ${date}
</comment>
<Wait: 60>
こんにちは、世界！`

// compile()メソッドでText2Frame記法をJSONに変換
const eventCommands = TF.compile(text)
console.log(JSON.stringify(eventCommands, null, 2))
```

**実行方法:**
```bash
$ node examples/commonjs.js
```

#### ES Moduleとして使用する場合

Node.js の `import` からも、CommonJS のエントリーポイントをデフォルトインポートできます。
`.mjs`拡張子のファイルか、package.jsonで`"type": "module"`を指定する必要があります。

**examples/esmodules.mjs:**
```javascript
import TF from "@yktsr/text2frame-mv"

// テキストからイベントコマンドのJSONを生成
const date = new Date().toLocaleString()
const text = `<comment>
ES Moduleで使用
出力日時: ${date}
</comment>
<PlayBGM: Theme1, 90, 100, 0>
今日も一日がんばるぞい！`

// compile()メソッドでText2Frame記法をJSONに変換
const eventCommands = TF.compile(text)
console.log(JSON.stringify(eventCommands, null, 2))
```

**実行方法:**
```bash
$ node examples/esmodules.mjs
```

#### 主要なAPI

Text2Frameモジュールは以下のメソッドを提供します：

- **`TF.compile(text)`**: Text2Frame記法のテキストをRPGツクールMV/MZのイベントコマンドJSON配列に変換します
- 戻り値: イベントコマンドのJSON配列。イベントの `list` に直接組み込む場合は、末尾に終端コマンド `{ code: 0, indent: 0, parameters: [] }` を追加します。

#### 実用的な使用例

```javascript
import TF from "@yktsr/text2frame-mv"
import fs from "fs"

// テキストファイルを読み込む
const scenarioText = fs.readFileSync("scenario/chapter1.txt", "utf-8")

// Text2Frame記法をイベントコマンドに変換
const eventCommands = TF.compile(scenarioText)

// 既存のマップJSONを読み込む
const mapData = JSON.parse(fs.readFileSync("data/Map001.json", "utf-8"))

// イベントコマンドを指定のイベントに組み込む
const eventId = 1
const pageId = 0
mapData.events[eventId].pages[pageId].list = eventCommands.concat([{ code: 0, indent: 0, parameters: [] }])

// マップJSONを保存
fs.writeFileSync("data/Map001.json", JSON.stringify(mapData, null, 2))

console.log("イベントコマンドの組み込みが完了しました！")
```

### Install dependencies
```
$ npm ci
$ npm run build --if-present
```

### Lint check
```
$ npm run lint
```

### Test
```
$ npm run test
```

### Round-trip check（実データ検証）
書き出し(Frame2Text)→取り込み(Text2Frame)の往復で、コマンドリストを比較します。既定では MV/MZ の無害な表現差を正規化し、`--strict=true` でその正規化を無効にします。このスクリプトは指定したゲームデータと出力テキストを書き換えるため、検証用コピーで実行してください。
```
$ npm run verify-roundtrip -- sample/data --text=roundtrip-text --en=true
```

## ライセンス
MIT LICENSE

---

<a name="english"></a>
## English

A development support plugin for RPG Maker MV/MZ that easily converts text files (.txt files, etc.) into "Show Text" event commands.

### Download Latest Plugin
[![Download Text2Frame](https://img.shields.io/badge/Download-Text2Frame.js-blue)](https://github.com/yktsr/Text2Frame-MV/releases/download/2.3.0/Text2Frame.js)

[![Download Frame2Text](https://img.shields.io/badge/Download-Frame2Text.js-blue)](https://github.com/yktsr/Text2Frame-MV/releases/download/2.3.0/Frame2Text.js)

### Description
![./introduce_Text2Frame_MV_MZ.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Text2Frame_MV_MZ.png)

This plugin supports developers who want to edit dialogues in text editors **other than** RPG Maker MV/MZ and later import them as event commands.

By executing a plugin command, you can load a text file and import it as event commands into RPG Maker MV/MZ map events or common events.

This eliminates the need to edit lines, window display settings (position, background), and BGM directly in RPG Maker.

For the most basic usage, see the demo below.
For advanced usage and detailed plugin parameters, refer to the [wiki](https://github.com/yktsr/Text2Frame-MV/wiki).

***Demo/Quick Start***

1. Create a scenario file
2. Save it as text/message.txt
3. Create an event to execute the plugin command
4. Configure the plugin command
5. Create the destination event
6. Execute the plugin command for testing
7. Reload or reopen the project

For more detailed instructions, refer to the [wiki](https://github.com/yktsr/Text2Frame-MV/wiki).

![./basic_sample.gif](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/basic_sample.gif)

### Installation
1. Download Text2Frame.js from [here](https://github.com/yktsr/Text2Frame-MV/releases).
2. Place it in the plugin folder of your project.
3. Enable the Text2Frame plugin from the plugin editor.

Install and enable Frame2Text.js as well for exporting and merge write-back.

### Import Strategies and Synchronization

The import plugin commands support `add` (append, the initial default), `merge` and `overwrite`. In MZ, `IMPORT_MESSAGE_TO_EVENT` and `IMPORT_MESSAGE_TO_CE` retain the argument key `IsOverwrite`, displayed as “反映方法”. Saved `true` / `false` values still mean overwrite / append. Batch import and synchronization use the `Strategy` argument.

MV command examples (run each separately when needed):

```
BATCH_EXPORT_MESSAGES_TO_FOLDER text merge conversation
BATCH_IMPORT_MESSAGES_FROM_FOLDER text merge
START_DATA_SYNC both text merge
STOP_DATA_SYNC
```

Synchronization arguments are direction (`both` / `push` / `pull`), text folder and strategy (`merge` / `overwrite`), defaulting to `both text merge`. Batch commands run once. `START_DATA_SYNC` imports existing texts before watching in `both` / `push` mode; `pull` starts watching without an initial export. Export first if you have no texts yet. Game-to-text synchronization updates events that already have a text with matching front matter. Plugin watchers monitor the top level of the text and data folders, and stop when playtesting closes.

For CLI use:

```bash
npm install -D @yktsr/text2frame-mv
npx frame2text --mode batch --text-dir text --scope conversation
npx t2f-sync start
# Or synchronize once and exit:
npx t2f-sync once
```

CLI synchronization defaults to `merge` and scope `custom` (existing texts with front matter). Unlike the plugin start command, CLI synchronization in `both` mode starts with pull, then push. Use `--scope conversation` to include events with dialogue that do not have texts yet. Keep the RPG Maker editor closed during automatic imports to avoid saving stale data over imported changes.

On a merge conflict, both versions and markers are written to the source side: **the text on import, the game on export**. Resolve the marked side and repeat the same operation. The destination keeps its own version at the conflicting location.

### Setting Face, Background, Position, and Name
You can use tags to change message settings such as face, background, and position.
These default values can be changed from the plugin options.

#### Face Specification <Face: Face Name>
You can specify the face to be displayed in the window.

![./introduce_Face.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Face.png)

#### Background Change <Background: Background Type>
You can change the window background.

![./introduce_Background.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Background.png)

#### Position Change <Position: Position Type>
You can change the window position.

![./introduce_WindowPosition.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_WindowPosition.png)

#### Name Setting (For MZ) <Name: ○○○○>
You can specify the name to be displayed in the window.

![./introduce_namebox.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_namebox.png)

#### Empty Line in a Message <br>
Use `<br>` to keep a blank line inside a message. A bare empty line in the text is
treated as a window separator (blank line + plain text = a new window), so write
`<br>` when you want a blank line within the same window. Export (Frame2Text) also
emits empty message lines as `<br>`, and import restores them to blank lines.

### Tags for Event Commands
In addition to "Show Text", all other event commands are also supported.
By inserting the following tags between messages, those tags will be replaced with event commands.
For example:
```
<Set: 1, 2>
<CommonEvent: 3>
Let's do our best today!
```
This will insert "Control Variables (assign constant 2 to variable 1)" and "Common Event (ID 3)" event commands before the message "Let's do our best today!".

For details on all tags, refer to the [wiki grammar page](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9) or the help documentation in the plugin itself.

### Quick Reference for Common Event Commands
Below is a quick reference table for commonly used event commands. All event commands are supported beyond what is listed here.

|Event Command|Tag|Details|
|:-|:-|:-|
|Show Choices|\<ShowChoices\><br><When: Yes><br>Process when choice 1 is selected<br><When: No><br>Process when choice 2 is selected<br>\<End\>|Display "Yes" and "No" choices.|
|Control Switches (ON)| <Switch: 1, ON> | Turn switch 1 ON.|
|Control Switches (OFF)| <Switch: 1, OFF> | Turn switch 1 OFF.|
|Control Variables (Assign)| <Set: 1, 2> |Assign constant 2 to variable 1.|
|Control Variables (Add)| <Add: 1, V[20]>|Add the value of variable 20 to variable 1.|
|Control Variables (Subtract)| <Sub: 1, R\[50\]\[100\]>|Subtract a random number (min 50, max 100) from variable 1.|
|Control Variables (Multiply)| <Mul: 1-10, GD\[Item\]\[2\]>|Multiply variables 1-10 by the number of items with ID 2.|
|Control Variables (Divide)| <Div: 1, GD\[BattleCount\]\> |Divide variable 1 by the battle count.|
|Control Variables (Modulo)| <Mod: 1-10, SC\[$dataMap.width\]>|Set variables 1-10 to their remainders after division by "$dataMap.width".|
|Control Self Switch (ON)|<SelfSwitch: A, ON>|Turn self switch A ON.|
|Control Self Switch (OFF)|<SelfSwitch: A, OFF>|Turn self switch A OFF.|
|Conditional Branch|<If: Switch[1], ON><br>Process when condition is met<br>\<Else\><br>Process when condition is not met<br>\<End\>|Branch process based on "if switch 1 is ON".|
|Loop|\<Loop\><br>Process to loop<br>\<RepeatAbove\>|Loop the process.|
|Break Loop|\<BreakLoop\>|Break the loop at this point.|
|Common Event|<CommonEvent: 1>|Insert common event with ID 1.|
|Label|\<Label: Sample\>|Set a label named "Sample".|
|Jump to Label|\<JumpToLabel: Sample\>|Jump to the label named "Sample".|
|Comment|\<comment\><br>Let's do our best today!<br>\</comment\>|Insert a comment "Let's do our best today!".|
|Change Gold|<ChangeGold: Increase, 100>|Increase gold by 100.|
|Change Items|<ChangeItems: 3, Increase, 4>|Increase item with ID 3 by 4.|
|Change Weapons|<ChangeWeapons: 1, Increase, 2>|Increase weapon with ID 1 by 2.|
|Change Armors|<ChangeArmors: 1, Increase, 2>|Increase armor with ID 1 by 2.|
|Transfer Player|<TransferPlayer: Direct[1][10][20], Retain, Black>|Transfer to map ID 1, X:10, Y:20 with retained direction and black fade.|
|Show Picture|<ShowPicture: 1, Castle, Scale[50][55]>|Display Castle.png as picture 1 with 50% width and 55% height.|
|Move Picture|<MovePicture: 1, Position[Center][200][Variables[3]]>|Move picture 1 to center origin, X:200, Y:variable 3.|
|Rotate Picture|<RotatePicture: 1, -30>|Rotate picture 1 at speed -30.|
|Tint Picture|<TintPicture: 1, Duration[60], ColorTone[0][100][255][50]>|Tint picture 1 to R:0, G:100, B:255, Gray:50 over 60 frames (1 second).|
|Erase Picture|<ErasePicture: 1>|Erase picture 1.|
|Wait|<Wait: 60>|Insert a wait of 60 frames (1 second).|
|Fadeout Screen|\<FadeOut\>|Fade out the screen.|
|Fadein Screen|\<FadeIn\>|Fade in the screen.|
|Tint Screen|<TintScreen: Duration[60], ColorTone[0][100][255][50]>|Tint the screen to R:0, G:100, B:255, Gray:50 over 60 frames (1 second).|
|Flash Screen|<FlashScreen: 50, 100, 150, 170, 60>|Flash the screen with R:50, G:100, B:150, intensity:170 over 60 frames (1 second).|
|Shake Screen|<ShakeScreen: 5, 8, 60>|Shake the screen with power:5, speed:8 over 60 frames.|
|Play BGM|<PlayBGM: Battle1, 90, 100, 0>|Play Battle1 as BGM with volume:90, pitch:100, pan:0.|
|Fadeout BGM|<FadeoutBGM: 10>|Fade out BGM over 10 seconds.|
|Play BGS|<PlayBGS: City, 90, 100, 0>|Play City as BGS with volume:90, pitch:100, pan:0.|
|Fadeout BGS|<FadeoutBGS: 20>|Fade out BGS over 20 seconds.|
|Play ME|<PlayME: Curse1, 90, 100, 0>|Play Curse1 as ME with volume:90, pitch:100, pan:0.|
|Play SE|<PlaySE: Attack1, 90, 100, 0>|Play Attack1 as SE with volume:90, pitch:100, pan:0.|
|Stop SE|\<StopSE\>|Stop SE.|
|Battle Processing|<BattleProcessing: 1>|Battle with enemy troop 1.|
|Battle Processing (Defeat Event)|<BattleProcessing: 1><br>\<IfWin\><br>Process on victory<br>\<IfLose\><br>Process on defeat<br>\<End\>|Battle with enemy troop 1 with defeat event.|
|Open Save Screen|\<OpenSaveScreen\>|Open the save screen.|
|Script|<script><br>console.log("Let's go!");<br></script>|Insert "console.log("Let's go!");" as a script event.|
|Plugin Command|<PluginCommand: IMPORT_MESSAGE_TO_EVENT>|Insert "IMPORT_MESSAGE_TO_EVENT" as a plugin command.|

For more specific examples and other event commands, refer to the [Test Text Examples page](https://github.com/yktsr/Text2Frame-MV/wiki/動作確認テキスト).

### Other Features

#### Comment Out
If you write "%" at the beginning of a line, it will be treated as a comment and will not be imported.
This comment-out symbol can be changed in the plugin parameters.
For examples, refer to the [corresponding wiki page](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9).

#### Export to Common Events
You can export not only to map events but also to common events.
For examples, refer to the [corresponding wiki page](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%82%B3%E3%83%A2%E3%83%B3%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E3%81%B8%E3%81%AE%E6%9B%B8%E3%81%8D%E5%87%BA%E3%81%97).

#### Changing Default Values with Plugin Command Arguments (For MV)
When you want to load multiple files or apply different options for each file, you can perform more advanced control using plugin command arguments.
This feature is for RPG Maker MV. In RPG Maker MZ, you can set directly from the plugin command.

For details, refer to the [corresponding wiki page](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3).

#### Skip <Skip> … <SkipEnd>
Supports RPG Maker MZ's "Skip" (event command 109). A block enclosed by `<Skip>`
and `<SkipEnd>` is kept in the data but skipped at runtime. It is preserved as-is
through the export/import round-trip.

### Reverse Conversion Plugin: Frame2Text
Frame2Text is also available - a plugin that exports RPG Maker MV/MZ event commands to text following Text2Frame notation.

Download Frame2Text from [here](https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Frame2Text.js).

For detailed usage, refer to the [Frame2Text introduction page](https://github.com/yktsr/Text2Frame-MV/wiki/%E9%80%86%E5%A4%89%E6%8F%9B%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3Frame2Text) or the help documentation in the plugin itself.

### Author/Contact
* [@kryptos_nv](https://twitter.com/kryptos_nv)

### Contributors
* [@Asyun3i9t](https://twitter.com/Asyun3i9t)
  * [Taikai Kobo](http://taikai-kobo.hatenablog.com/)
* inazumasoft:Shick
  * [Inazumasoft Production Support](https://ci-en.net/creator/12715)

### Development

#### Install dependencies
```
$ npm ci
$ npm run build --if-present
```

#### Show help

```bash
npx text2frame --help
npx frame2text --help
npx t2f-sync start --help
npx t2f-sync once --help
```

Text2Frame supports `--mode map|common|compile|batch`. Use `-f, --text-file` for a single input file (`--text_path` is also accepted), and `-t, --text-dir` for a batch folder. Use `--root` to set the project directory; relative data, text and base paths are resolved against it.

CLI imports default to `--strategy merge`; use `--strategy overwrite` to replace the target. Export first to establish a common ancestor before editing both sides: without an ancestor, the first merge import replaces the target with the text. Single-file imports also accept legacy `--overwrite true` (replace) and `--overwrite false` (append), unless an explicit `--strategy` takes precedence. Text2Frame has no `-w` option.

#### Run Text2Frame.js with command line

From a repository checkout:

```bash
node Text2Frame.js --mode map --text-file text/map001_event001_page1.txt
node Text2Frame.js -m map -f test/basic.txt -o data/Map001.json -e 1 -p 1 --strategy overwrite
node Text2Frame.js -m common -f test/basic.txt -o data/CommonEvents.json -c 1 --strategy overwrite
node Text2Frame.js --mode batch --text-dir text
cat test/basic.txt | node Text2Frame.js --mode compile
```

With the npm package, replace `node Text2Frame.js` with `npx text2frame`. Reopen the RPG Maker project without saving after importing.

#### Using Text2Frame Module in Node.js Projects

Text2Frame can be used as a library in Node.js projects.
It supports both CommonJS and ES Module formats, allowing you to choose based on your project environment.

##### Installation

Install the npm package:

```bash
$ npm install @yktsr/text2frame-mv
```

Or add the following to your package.json:

```json
{
  "dependencies": {
    "@yktsr/text2frame-mv": "^2.3.0"
  }
}
```

##### Using as a CommonJS Module

With Node.js `require`, load the package entry point.

**examples/commonjs.js:**
```javascript
const TF = require("@yktsr/text2frame-mv")

// Generate event command JSON from text
const date = new Date().toLocaleString()
const text = `<comment>
Using CommonJS module
Output date: ${date}
</comment>
<Wait: 60>
Hello, World!`

// Convert Text2Frame notation to JSON using compile() method
const eventCommands = TF.compile(text)
console.log(JSON.stringify(eventCommands, null, 2))
```

**How to run:**
```bash
$ node examples/commonjs.js
```

##### Using as an ES Module

Node.js ES modules can use a default import of the package's CommonJS entry point.
You need to either use `.mjs` file extension or specify `"type": "module"` in package.json.

**examples/esmodules.mjs:**
```javascript
import TF from "@yktsr/text2frame-mv"

// Generate event command JSON from text
const date = new Date().toLocaleString()
const text = `<comment>
Using ES Module
Output date: ${date}
</comment>
<PlayBGM: Theme1, 90, 100, 0>
Let's do our best today!`

// Convert Text2Frame notation to JSON using compile() method
const eventCommands = TF.compile(text)
console.log(JSON.stringify(eventCommands, null, 2))
```

**How to run:**
```bash
$ node examples/esmodules.mjs
```

##### Main API

The Text2Frame module provides the following methods:

- **`TF.compile(text)`**: Converts Text2Frame notation text into RPG Maker MV/MZ event command JSON array
- Return value: an array of event commands. When assigning it directly to an event's `list`, append the terminator `{ code: 0, indent: 0, parameters: [] }`.

##### Practical Usage Example

```javascript
import TF from "@yktsr/text2frame-mv"
import fs from "fs"

// Read text file
const scenarioText = fs.readFileSync("scenario/chapter1.txt", "utf-8")

// Convert Text2Frame notation to event commands
const eventCommands = TF.compile(scenarioText)

// Load existing map JSON
const mapData = JSON.parse(fs.readFileSync("data/Map001.json", "utf-8"))

// Incorporate event commands into specified event
const eventId = 1
const pageId = 0
mapData.events[eventId].pages[pageId].list = eventCommands.concat([{ code: 0, indent: 0, parameters: [] }])

// Save map JSON
fs.writeFileSync("data/Map001.json", JSON.stringify(mapData, null, 2))

console.log("Event commands have been successfully incorporated!")
```


#### Lint check
```
$ npm run lint
```

#### Test
```
$ npm run test
```

### License
MIT LICENSE
