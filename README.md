# Text2Frame-MV
Simple compiler to convert text to message show event.
English README is [here](en).

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

より詳細な手順は[wiki](https://github.com/yktsr/Text2Frame-MV/wiki/%E5%9F%BA%E6%9C%AC%E7%9A%84%E3%81%AA%E4%BD%BF%E3%81%84%E6%96%B9)を参照してください。

![./basic_sample.gif](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/basic_sample.gif)

### 機能の一例
#### 顔の指定 <顔: 顔の指定>
ウインドウに表示される顔を指定することができます。

![./introduce_Face.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Face.png)

#### 背景の変更 <背景: 背景の指定>
ウインドウの背景を変更することができます。

![./introduce_Background.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_Background.png)

#### 位置の変更 <位置: 位置の指定>
ウインドウの位置を変更することができます。

![./introduce_WindowPosition.png](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/introduce_WindowPosition.png)


## 特徴
タグの詳細は[wikiの文法ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E6%96%87%E6%B3%95)や
[wikiの動作確認サンプルページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E5%8B%95%E4%BD%9C%E7%A2%BA%E8%AA%8D%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB)を参照してください。

### 利用できるタグ一覧
|タグ|省略形|効果|
|:-|:-|:-|
|<顔: Actor1(0)>|&lt;FC: Actor1(0)>|ウインドウに表示される顔を変更する|
|<位置: 上>|&lt;WP: 上>|ウインドウの位置を変更する|
|<背景: 暗く>|&lt;BG: Dim>|ウインドウの背景を変更する|
|<プラグインコマンド: IMPORT_MESSAGE_TO_EVENT>|<PC: IMPORT_MESSAGE_TO_EVENT>|プラグインコマンドイベントを挿入する|
|<コモンイベント: 1>|&lt;CE: 1>|コモンイベントを挿入する|
|<フェードイン>|&lt;FI>|フェードインイベントを挿入する|
|<フェードアウト>|&lt;FO>|フェードアウトイベントを挿入する|
|<ウェイト: 60>|&lt;wait: 60>|waitイベントを挿入する|
|<script><br>console.log("ぞい！");<br></script>|&lt;SC><br>console.log("ぞい！")<br>&lt;/SC>|タグに挟まれた文字をSciriptイベントとして挿入する|
|<注釈><br>今日も一日がんばるぞい！<br></注釈>|&lt;CO><br>今日も一日がんばるぞい！<br>&lt;/CO>|タグに挟まれた文字を注釈イベントとして挿入する|
|&lt;BGMの演奏 : Battle2, 90, 100, 0>|&lt;PlayBGM : Battle2, 90, 100, 0>|BGMの再生イベントを挿入する。引数は順に、曲名、音量90、ピッチ100、位相0で組み込まれる。音量、ピッチ、位相は省略できる|
|&lt;BGMのフェードアウト : 20>|&lt;FadeoutBGM : 20>|BGMのフェードアウトイベントを挿入する。引数はフェードアウトする秒数である。引数は省略できる|
|&lt;BGMの保存>|&lt;SaveBGM>|BGMの保存イベントを挿入する|
|&lt;BGMの再開>|&lt;ReplayBGM>|BGMの再開イベントを挿入する|
|&lt;戦闘曲の変更>|&lt;ChangeBattleBGM>|戦闘曲を変更する|
|&lt;BGSの演奏 : Battle2, 90, 100, 0>|&lt;PlayBGS : City, 90, 100, 0>|BGSの再生イベントを挿入する。引数は順に、曲名、音量90、ピッチ100、位相0で組み込まれる。音量、ピッチ、位相は省略できる|
|&lt;BGSのフェードアウト : 20>|&lt;FadeoutBGS : 20>|BGSのフェードアウトイベントを挿入する。引数はフェードアウトする秒数である。引数は省略できる|

## その他の機能
### コメントアウト
取り込みたい文章の行の先頭に「%」を記載すると、それはコメントと見なされ、取り込まれません。
このコメントアウト記号はプラグインパラメータで変更することができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88%E3%82%A2%E3%82%A6%E3%83%88%E3%81%AE%E5%8B%95%E4%BD%9C%E4%BE%8B)を参照してください。

### コモンイベントへの書き出し
マップ上のイベントへの書き出しだけでなく、コモンイベントへも書き出すことができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%82%B3%E3%83%A2%E3%83%B3%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E6%9B%B8%E3%81%8D%E5%87%BA%E3%81%97%E3%81%AE%E5%8B%95%E4%BD%9C%E4%BE%8B)を参照してください。

### プラグインコマンド引数を使ったデフォルト値の変更
読み込みたいファイルが複数あるときやファイルごとに異なるオプションを適用したいときなどに、プラグインコマンド引数を使うことでより高度な制御が行えます。

詳細は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E3%82%B3%E3%83%9E%E3%83%B3%E3%83%89%E5%BC%95%E6%95%B0)を参照してください。

## 導入方法
1. [ここ](https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Text2Frame.js)からプラグイン本体をダウンロードします。
1. 導入したいプロジェクトのプラグインフォルダに入れます。
1. プラグインエディターからText2Frameのプラグインを有効にします。

## Author/連絡先
* [@kryptos_nv](https://twitter.com/kryptos_nv)

## Contributor
* [@Asyun3i9t](https://twitter.com/Asyun3i9t)
[http://taikai-kobo.hatenablog.com/]

## Contribution
1. Fork it
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Add some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create new Pull Request

## ライセンス
MIT LICENSE
