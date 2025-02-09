# Text2Frame
Simple compiler to convert text to event.

![Node.js CI](https://github.com/yktsr/Text2Frame-MV/actions/workflows/nodejs.yml/badge.svg)
![CodeQL](https://github.com/yktsr/Text2Frame-MV/actions/workflows/github-code-scanning/codeql/badge.svg)

テキストファイル(.txtファイルなど)から「文章の表示」イベントコマンドに簡単に変換するための、RPGツクールMV・MZ用の開発支援プラグインです。

## 最新版プラグインのダウンロード
[![Download Text2Frame](https://img.shields.io/badge/Download-Text2Frame.js-blue)](https://github.com/yktsr/Text2Frame-MV/releases/download/2.2.4/Text2Frame.js)

[![Download Frame2Text](https://img.shields.io/badge/Download-Frame2Text.js-blue)](https://github.com/yktsr/Text2Frame-MV/releases/download/2.2.4/Frame2Text.js)

## 説明
![./introduce_Text2Frame_MV_MZ.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Text2Frame_MV_MZ.png)

会話などをツクールMV・MZ**以外**のエディタで編集して、あとでイベントコマンドとして組み込みたい人をサポートします。

プラグインコマンドを実行すると、テキストファイルを読み込み、ツクールMV・MZのマップイベントまたはコモンイベントにイベントコマンドとして取り込むことができます。

これによりツクール上でセリフ、ウインドウの表示方法（表示位置、背景）、BGMの編集などをする必要がなくなります。

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
1. [ここ](https://github.com/yktsr/Text2Frame-MV/releases)から Text2Frame.js をダウンロードします。
1. 導入したいプロジェクトのプラグインフォルダに入れます。
1. プラグインエディターからText2Frameのプラグインを有効にします。


## 顔・背景・位置・名前の設定
タグを使って、顔・背景・位置等のメッセージの設定を変更することができます。
これらのデフォルト値は、プラグインのオプションから変更することができます。

### 顔の指定 <顔: 顔の指定>
ウインドウに表示される顔を指定することができます。

![./introduce_Face.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Face.png)

### 背景の変更 <背景: 背景の指定>
ウインドウの背景を変更することができます。

![./introduce_Background.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Background.png)

### 位置の変更 <位置: 位置の指定>
ウインドウの位置を変更することができます。

![./introduce_WindowPosition.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_WindowPosition.png)

### 名前の設定(MZ用) <名前: ○○○○>
ウィンドウに表示される名前を指定することができます。

![./introduce_WindowPosition.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_namebox.png)


## イベントコマンドを組み込むタグ
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
|変数の操作(減算)| <Sub: 1, R\[50\]\[100\]>|変数1に最小値50最大値50の乱数を減算する。|
|変数の操作(乗算)| <Mul: 1-10, GD\[Item\]\[2\]>|変数1~10にID2のアイテムの所持数を乗算する。|
|変数の操作(除算)| <Div: 1, GD\[BattleCount\]\> |変数1に戦闘回数を除算する。|
|変数の操作(剰余)| <Mod: 1-10, SC\[$dataMap.width;\]>|変数1〜10に"$dataMap.width"の値の剰余を代入する。|
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
|BGSのフェードアウト|<FadeoutBGS: 20>|10秒かけてBGSをフェードアウトする。|
|MEの演奏|<PlayME: Curse1, 90, 100, 0>|Curse1をMEとして、音量90,ピッチ100, 位相0で演奏する。|
|SEの演奏|<PlaySE: Attack1, 90, 100, 0>|Attack1をSEとして、音量90,ピッチ100, 位相0で演奏する。|
|SEの停止|\<StopSE\>|SEの停止イベントを挿入する。|
|戦闘の処理|<BattleProcessing: 1>|敵グループ1と戦闘する。|
|戦闘の処理（負けイベント）|<BattleProcessing: 1><br>\<IfWin\><br>勝利した時の処理<br>\<IfLose\><br>敗北したときの処理<br>\<End\>|敵グループ1と敗北可能でエンカウント。|
|セーブ画面を開く|\<OpenSaveScreen\>|セーブ画面を開く。|
|スクリプト|<script><br>console.log("ぞい！");<br></script>|"console.log("ぞい！");"をスクリプトイベントとして組み込む。|
|プラグインコマンド|<PluginCommand: IMPORT_MESSAGE_TO_EVENT>|"IMPORT_MESSAGE_TO_EVENT"をプラグインコマンドとして組み込む。|

より具体的かつその他のイベントコマンドのサンプルは、[動作確認用テキスト文例ページ](https://github.com/yktsr/Text2Frame-MV/wiki/動作確認テキスト)を参照してください。


## その他の機能
### コメントアウト
取り込みたい文章の行の先頭に「%」を記載すると、それはコメントと見なされ、取り込まれません。
このコメントアウト記号はプラグインパラメータで変更することができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9)を参照してください。

### コモンイベントへの書き出し
マップ上のイベントへの書き出しだけでなく、コモンイベントへも書き出すことができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%82%B3%E3%83%A2%E3%83%B3%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E3%81%B8%E3%81%AE%E6%9B%B8%E3%81%8D%E5%87%BA%E3%81%97)を参照してください。

### プラグインコマンド引数を使ったデフォルト値の変更(MV用)
読み込みたいファイルが複数あるときやファイルごとに異なるオプションを適用したいときなどに、プラグインコマンド引数を使うことでより高度な制御が行えます。
この機能はツクールMV用です。ツクールMZではプラグインコマンドから直接設定できます。

詳細は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3)を参照してください。

## 逆変換プラグイン Frame2Text
RPGツクールMV/MZのイベントコマンドを、Text2Frameの記法に則ったテキストにエクスポートするプラグインである、Frame2Textも公開しています。

Frame2Textのダウンロードは[ここ](https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Frame2Text.js)からお願いします。

また、詳細な使い方は[Frame2Textの紹介ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E9%80%86%E5%A4%89%E6%8F%9B%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3Frame2Text)かプラグイン本体のヘルプドキュメントを参照してください。

## Author/連絡先
* [@kryptos_nv](https://twitter.com/kryptos_nv)

## Contributor
* [@Asyun3i9t](https://twitter.com/Asyun3i9t)
  * [大海工房](http://taikai-kobo.hatenablog.com/)
* inazumasoft:Shick
  * [いなずまそふと制作支援部](https://ci-en.net/creator/12715)

## Development
### Install dependencies
```
$ npm ci
$ npm run build --if-present
```

### Show help
```
Usage: Text2Frame [options]

Options:
  -V, --version                         output the version number
  -m, --mode <map|common|compile|test>  output mode
  -t, --text_path <name>                text file path
  -o, --output_path <name>              output file path
  -e, --event_id <name>                 event file id
  -p, --page_id <name>                  page id
  -c, --common_event_id <name>          common event id
  -w, --overwrite <true/false>          overwrite mode (default: "false")
  -v, --verbose                         debug mode (default: false)
  -h, --help                            display help for command

===== Manual =====
    NAME
       Text2Frame - Simple compiler to convert text to event command.
    SYNOPSIS
        node Text2Frame.js --verbose --mode map --text_path <text file path> --output_path <output file path> --event_id <event id> --page_id <page id> --overwrite <true|false>
        node Text2Frame.js --verbose --mode common --text_path <text file path> --common_event_id <common event id> --overwrite <true|false>
        node Text2Frame.js --mode compile
        node Text2Frame.js --verbose --mode test
    DESCRIPTION
        node Text2Frame.js --verbose --mode map --text_path <text file path> --output_path <output file path> --event_id <event id> --page_id <page id> --overwrite <true|false>
          マップへのイベント出力モードです。
          読み込むファイル、出力マップ、上書きの有無を引数で指定します。
          test/basic.txt を読み込み data/Map001.json に上書きするコマンド例は以下です。

          例1：$ node Text2Frame.js --mode map --text_path test/basic.txt --output_path data/Map001.json --event_id 1 --page_id 1 --overwrite true
          例2：$ node Text2Frame.js -m map -t test/basic.txt -o data/Map001.json -e 1 -p 1 -w true

        node Text2Frame.js --verbose --mode common --text_path <text file path> --common_event_id <common event id> --overwrite <true|false>
          コモンイベントへのイベント出力モードです。
          読み込むファイル、出力コモンイベント、上書きの有無を引数で指定します。
          test/basic.txt を読み込み data/CommonEvents.json に上書きするコマンド例は以下です。

          例1：$ node Text2Frame.js --mode common --text_path test/basic.txt --output_path data/CommonEvents.json --common_event_id 1 --overwrite true
          例2：$ node Text2Frame.js -m common -t test/basic.txt -o data/CommonEvents.json -c 1 -w true

        node Text2Frame.js --mode compile
          コンパイルモードです。
          変換したいテキストファイルをパイプで与えると、対応したイベントに変換されたJSONを、標準出力に出力します。
          このモードでは、Map.json / CommonEvent.jsonの形式へフォーマットされず、イベントに変換したJSONのみが出力されるため、
          Map.json/CommonEvent.json への組み込みは各自で行う必要があります。

          例1: $ cat test/basic.txt | node Text2Frame.js --mode compile

        node Text2Frame.js --mode test
          テストモードです。test/basic.txtを読み込み、data/Map001.jsonに出力します。
```

### Run Text2frame.js with command line
```
$ npm run debug -- --mode map --text_path test/basic.txt --output_path data/Map001.json --event_id 1 --overwrite true

> Text2Frame-MV@1.1.2 debug /home/yuki/github/Text2Frame-MV
> node Text2Frame.js "--mode" "map" "--text_path" "test/basic.txt" "--output_path" "data/Map001.json" "--event_id" "1" "--overwrite" "true"

Please restart RPG Maker MV(Editor) WITHOUT save.
**セーブせずに**プロジェクトファイルを開き直してください
```

### How to use the Text2Frame module as an ES Module and as a CommonJS module:
### npm install
```
$ npm install 'yktsr/Text2Frame-MV'
```

### Using as an ES Module
```
$ cat examples/commonjs.js
const TF = require("Text2Frame-MV/Text2Frame.cjs.js")

const date = new Date().toLocaleString()
const text = `<comment>
for common js module:
出力日時: ${date}
</comment>`

console.log(TF.compile(text))

$ node examples/commonjs.js
```

### Using as an ES Module
```
$ cat examples/esmodules.mjs
import TF from "Text2Frame-MV/Text2Frame.es.mjs"

const date = new Date().toLocaleString()
const text = `<comment>
for ES Module:
出力日時: ${date}
</comment>`

console.log(TF.compile(text))

$ node examples/esmodules.mjs
```

### Lint check
```
$ npm run lint
```

### Test
```
$ npm run test
```


## ライセンス
MIT LICENSE
