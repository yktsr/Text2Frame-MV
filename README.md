# Text2Frame-MV
Simple compiler to convert text to event.

![Node.js CI](https://github.com/yktsr/Text2Frame-MV/workflows/Node.js%20CI/badge.svg?branch=master)

テキストファイル(.txtファイルなど)から「文章の表示」イベントコマンドに簡単に変換するための、開発支援プラグイン

![./introduce_Text2Frame.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Text2Frame.png)

## 説明
会話などをツクールMV**以外**のエディタで編集して、あとでイベントコマンドとして組み込みたい人をサポートします。

プラグインコマンドを実行すると、テキストファイルを読み込み、ツクールMVのマップイベントまたはコモンイベントにイベントコマンドとして取り込むことができます。

これによりツクール上でセリフ、ウインドウの表示方法（表示位置、背景）、BGMの編集などをする必要がなくなります。

最も基本的な使い方は、以下のデモを見てください。
高度な使い方やプラグインパラメータの詳細は[wiki](https://github.com/yktsr/Text2Frame-MV/wiki)を参照してください。

***デモ/Quick Start***
1. シナリオファイルを作成します
1. text/message.txtとして保存します
1. イベントコマンド（メッセージをイベントへインポート）を作成します
1. 書き出し先のイベントを作成します
1. イベントのタイルを踏み、実行します
1. プロジェクトを開き直します

より詳細な手順は[wiki](https://github.com/yktsr/Text2Frame-MV/wiki)を参照してください。

![./basic_sample.gif](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/basic_sample.gif)


## 導入方法
1. [ここ](https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Text2Frame.js)からプラグイン本体をダウンロードします。
1. 導入したいプロジェクトのプラグインフォルダに入れます。
1. プラグインエディターからText2Frameのプラグインを有効にします。


## 顔・背景・位置の設定
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


## その他の機能
### コメントアウト
取り込みたい文章の行の先頭に「%」を記載すると、それはコメントと見なされ、取り込まれません。
このコメントアウト記号はプラグインパラメータで変更することができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9)を参照してください。

### コモンイベントへの書き出し
マップ上のイベントへの書き出しだけでなく、コモンイベントへも書き出すことができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%82%B3%E3%83%A2%E3%83%B3%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E3%81%B8%E3%81%AE%E6%9B%B8%E3%81%8D%E5%87%BA%E3%81%97)を参照してください。

### プラグインコマンド引数を使ったデフォルト値の変更
読み込みたいファイルが複数あるときやファイルごとに異なるオプションを適用したいときなどに、プラグインコマンド引数を使うことでより高度な制御が行えます。

詳細は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3)を参照してください。


## 追加機能のタグ
「文章の表示」以外にも、いくつかのイベントコマンドにも対応しています。
以下のタグをメッセージの間に挟むことで、そのタグがイベントコマンドに置き換わります。
例えば、
```
<=: 1, 2>
<CommonEvent: 3>
今日も一日がんばるぞい！
```
とすることで、「今日も一日がんばるぞい！」というメッセージの前に、「変数の操作(変数1に定数2を代入する)」と「コモンイベント(ID3)」のイベントコマンドが組み込まれます。


### 組み込めるイベントコマンドの早見表
|イベントコマンド|タグ(いずれか)|意味|
|:-|:-|:-|
|メッセージウィンドウの顔|<Face: Actor1(0)><br><FC: Actor1(0)><br><顔: Actor1(0)>|ウインドウに表示される顔をActor1.pngの位置0(一番左上)に変更する。|
|メッセージウィンドウの位置|<WindowPosition: Top><br><WP: Top><br><位置: 上>|ウインドウの位置を上に変更する。|
|メッセージウィンドウの背景|<Background: Dim><br><BG: Dim><br><背景:暗く>|ウインドウの背景を暗くする。|
|スイッチの操作(ON)| <Switch: 1, ON><br><SW: 1, true><br><スイッチ: 1, オン> | スイッチ1をONにする。|
|スイッチの操作(OFF)| <Switch: 1, OFF><br><SW: 1, false><br><スイッチ: 1, オフ> | スイッチ1をOFFにする。|
|変数の操作<br>(代入, 単一, 定数)| <Set: 1, 2><br><=: 1, 2><br><代入: 1, 2> |変数1に定数2を代入する。|
|変数の操作<br>(加算, 範囲, 変数)| <Add: 1, Variables[20]><br><+: 1, V[20]><br><加算: 1, 変数[20]>|変数1~10に変数20の値を加算する。|
|変数の操作<br>(減算, 単一, 乱数)| <Sub: 1, Random\[50\]\[100\]><br><-: 1, R\[50\]\[100\]><br><減算: 1, 乱数\[50\]\[100\]>|変数1に最小値50最大値50の乱数を減算する。|
|変数の操作<br>(乗算, 範囲, ゲームデータ)| <Mul: 1-10, GameData\[Item\]\[2\]><br><*: 1-10, GD\[Item\]\[2\]><br><乗算: 1-10, ゲームデータ\[アイテム\]\[2\]>|変数1~10にID2のアイテムの所持数を乗算する。|
|変数の操作<br>(除算, 単一, ゲームデータ)| <Div: 1, GameData\[BattleCount\]><br></: 1, GD\[BattleCount\]\><br><除算: 1, ゲームデータ\[戦闘回数\]> |変数1に戦闘回数を除算する。|
|変数の操作<br>(剰余, 範囲, スクリプト| <Mod: 1-10, Script\[$dataMap.width;\]><br><%: 1-10, SC\[$dataMap.width;\]><br><剰余: 1-10, スクリプト\[$dataMap.width;\]>|変数1〜10に"$dataMap.width"の値の剰余を代入する。|
|セルフスイッチの操作(ON)|<SelfSwitch: A, ON><br><SSW: A, ON><br><セルフスイッチ: A, ON>|セルフスイッチAをONにする。|
|セルフスイッチの操作(OFF)|<SelfSwitch: A, OFF><br><SSW: A, OFF><br><セルフスイッチ: A, OFF>|セルフスイッチAをOFFにする。|
|タイマーの操作<br>(開始)|<Timer: Start, 1, 10><br><タイマー: スタート, 1, 10>|タイマーを1分10秒で開始する。|
|タイマーの操作<br>(停止)|<Timer: Stop><br><タイマー: ストップ>|タイマーを停止する。|
|条件分岐|<If: Switch[1], ON><br>条件を満たしている時の処理<br>\<Else\><br>条件を満たしていない時の処理<br>\<End\>|「スイッチ1がONの場合」という条件で処理を分岐する。|
|ループ|\<Loop\><br>ループしたい処理<br>\<RepeatAbove\>|処理をループする。|
|ループの中断|\<BreakLoop\><br> <ループの中断><br>\<BL\>|ループ処理を該当箇所で中断する。|
|イベント処理の中断|\<ExitEventProcessing\><br>\<イベント処理の中断\><br>\<EEP\>|イベントを該当箇所で中断する。|
|コモンイベント|<CommonEvent: 1><br><CE: 1><br><コモンイベント: 1>|ID1のコモンイベントを挿入する。|
|ラベルを設定する|\<Label: サンプル\><br>\<ラベル: サンプル\>|"サンプル"というラベルを設定する。|
|ラベルジャンプ|\<JumpToLabel: サンプル\><br>\<ラベルジャンプ: サンプル\><br>\<JTL: サンプル\>|"サンプル"というラベルへ処理をジャンプする。|
|注釈|\<comment\><br>今日も一日がんばるぞい！<br>\</comment\>|"今日も一日がんばるぞい！"という注釈を挿入する。<br>(コメントアウト機能とは違ってイベントコマンドとして組み込まれる)|
|ピクチャの表示|<ShowPicture: 1, Castle, Scale[50][55]><br><ピクチャの表示: 1, Castle, 拡大率[50][55]><br><SP: 1, Castle, Scale[50][55]>|幅50%, 高さ55%でCastle.pngの番号1の画像を表示する。|
|ピクチャの移動|<MovePicture: 1, Position[Center][Variables[2]][Variables[3]]><br><ピクチャの移動: 1, 位置[中央][変数[2]][変数[3]]><br><MP: 1, Position[Center][V[2]][V[3]]>|原点は中央で、X座標は変数2,Y座標は変数3の位置に番号1の画像を移動する。|
|ピクチャの回転|<RotatePicture: 1, -30><br><ピクチャの回転: 1, -30><br><RP: 1, -30>|速度が-30で番号1のピクチャを回転する|
|ピクチャの色調変更|<TintPicture: 1, ColorTone[0][255][255][0]><br><ピクチャの色調変更: 1, 色調[0][255][255][0]><br><TP: 1, CT[0][255][255][0]>|赤0, 緑255, 青255, グレイ0に番号1のピクチャの色調を変更する。|
|ピクチャの消去|<ErasePicture: 1><br><ピクチャの消去: 1><br><EP: 1>|番号1のピクチャを削除する。|
|ウェイト|<Wait: 60><br><ウェイト: 60>|60フレーム(1秒)のウェイトを挿入する。|
|画面のフェードアウト|\<FadeOut\><br>\<FO\><br>\<フェードアウト\>|画面のフェードアウトを挿入する。|
|画面のフェードイン|\<FadeIn\><br>\<FI\><br>\<フェードイン\>|画面のフェードインを挿入する。|
|BGMの演奏|<PlayBGM: Battle1, 90, 100, 0><br><BGMの演奏: Battle1, 90, 100, 0>|BGMをBattle1に、音量90,ピッチ100, 位相0で変更する。|
|BGMのフェードアウト|<FadeoutBGM: 10><br><BGMのフェードアウト: 10>|10秒かけてBGMをフェードアウトする。|
|BGMの保存|\<SaveBGM\><br><BGMの保存>|BGMの保存イベントを挿入する。|
|BGMの再開|\<ReplayBGM\><br><BGMの再開>|BGMの再開イベントを挿入する。|
|BGSの演奏|<PlayBGS: City, 90, 100, 0><br><BGSの演奏: City, 90, 100, 0>|BGSをCityに、音量90,ピッチ100, 位相0で変更する。|
|BGSのフェードアウト|<FadeoutBGS: 20><br><BGSのフェードアウト>|10秒かけてBGSをフェードアウトする。|
|MEの演奏|<PlayME: Curse1, 90, 100, 0><br><MEの演奏: Curse1>|Curse1をMEとして、音量90,ピッチ100, 位相0で演奏する。|
|SEの演奏|<PlaySE: Attack1, 90, 100, 0><br><SEの演奏: Attack1, 90, 100, 0>|Attack1をSEとして、音量90,ピッチ100, 位相0で演奏する。|
|SEの停止|\<StopSE\><br><SEの停止>|SEの停止イベントを挿入する。|
|戦闘曲の変更|<ChangeBattleBGM: Battle2, 90, 100, 0><br><戦闘曲の変更: Battle2, 90, 100, 0>|戦闘BGMをBattle2に、音量90,ピッチ100, 位相0で変更する。|
|スクリプト|<script><br>console.log("ぞい！");<br></script>|&lt;SC><br>console.log("ぞい！")<br>&lt;/SC>|"console.log("ぞい！");"をスクリプトイベントとして組み込む。|
|プラグインコマンド|<PluginCommand: IMPORT_MESSAGE_TO_EVENT><br><プラグインコマンド: IMPORT_MESSAGE_TO_EVENT><br><PC: IMPORT_MESSAGE_TO_EVENT>|"IMPORT_MESSAGE_TO_EVENT"をプラグインコマンドとして組み込む。|

タグの詳細は[wikiの文法ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9)や
また、プラグイン本体のヘルプ文にも詳細を記しています。


## Author/連絡先
* [@kryptos_nv](https://twitter.com/kryptos_nv)

## Contributor
* [@Asyun3i9t](https://twitter.com/Asyun3i9t)
[http://taikai-kobo.hatenablog.com/]


## Development
### Install dependencies
```
$ npm ci
$ npm run build --if-present
```

### Show help
```
$ npm run debug
===== Manual =====

    NAME
       Text2Frame - Simple compiler to convert text to event command.
    SYNOPSIS
        node Text2Frame.js
        node Text2Frame.js --verbose --mode map --text_path <text file path> --output_path <output file path> --event_id <event id> --page_id <page id> --overwrite <true|false>
        node Text2Frame.js --verbose --mode common --text_path <text file path> --common_event_id <common event id> --overwrite <true|false>
        node Text2Frame.js --verbose --mode test
    DESCRIPTION
        node Text2Frame.js
          テストモードです。test/basic.txtを読み込み、data/Map001.jsonに出力します。
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
```

### Run Text2frame.js with command line
```
$ npm run debug -- --mode map --text_path test/basic.txt --output_path data/Map001.json --event_id 1 --overwrite true

> Text2Frame-MV@1.1.2 debug /home/yuki/github/Text2Frame-MV
> node Text2Frame.js "--mode" "map" "--text_path" "test/basic.txt" "--output_path" "data/Map001.json" "--event_id" "1" "--overwrite" "true"

Please restart RPG Maker MV(Editor) WITHOUT save.
**セーブせずに**プロジェクトファイルを開き直してください
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
