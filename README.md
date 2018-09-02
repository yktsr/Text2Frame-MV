# Text2Frame-MV
Simple compiler to convert text to message show event.
English README is [here](en).

テキストファイル(.txtファイルなど)から「文章の表示」イベントコマンドに簡単に変換するための、開発支援プラグイン

## 説明
会話などをツクールMV**以外**のエディタで編集して、あとでイベントコマンドとして組み込みたい人をサポートします。

プラグインコマンドを実行することにより、テキストファイルを読み込み、ツクールMVのマップイベントまたはコモンイベントにイベントコマンドとして取り込むことができます。
これによりツクール上でセリフやウインドウの表示方法（表示位置、背景など）の編集をする必要がなくなります。

最も基本的な使い方は、以下のデモを見てください。
高度な使い方やプラグインパラメータの詳細は[wiki](https://github.com/yktsr/Text2Frame-MV/wiki)を参照してください。

***デモ/Quick Start***
1. シナリオファイルを作成します
1. text/message.txtとして保存します
1. イベントコマンド（メッセージをイベントへインポート）を作成します
1. 書き出し先のイベントを作成します
1. イベントのタイルを踏み、実行します
1. プロジェクトを開き直します

![./basic_sample.gif](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/basic_sample.gif)

## 特徴
### タグを使ったウインドウの変更
文章の先頭にメタタグを挿入すると、その文章の塊に限りウインドウの状態を変更することができます。
詳細は[wikiの文法ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E6%96%87%E6%B3%95)を参照してください。

#### 顔の指定 <顔: 顔の指定>
ウインドウに表示される顔を指定することができます。

![./face_sample.gif](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/face_sample.gif)

#### 背景の変更 <背景: 背景の指定>
ウインドウの背景を変更することができます。

![./background_sample.gif](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/background_sample.gif)

#### 位置の変更 <位置: 位置の指定>
ウインドウの位置を変更することができます。

![./position_sample.gif](https://raw.githubusercontent.com/wiki/yktsr/Text2Frame-MV/img/position_sample.gif)

### コメントアウト
文章の先頭に「%」を記載すると、それはコメントと見なされ、取り込まれません。
このコメントアウト記号はプラグインパラメータで変更することができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88%E3%82%A2%E3%82%A6%E3%83%88%E3%81%AE%E5%8B%95%E4%BD%9C%E4%BE%8B)を参照してください。

### コモンイベントへの書き出し
マップ上のイベントへの書き出しだけでなく、コモンイベントへも書き出すことができます。
動作例は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%82%B3%E3%83%A2%E3%83%B3%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E6%9B%B8%E3%81%8D%E5%87%BA%E3%81%97%E3%81%AE%E5%8B%95%E4%BD%9C%E4%BE%8B)を参照してください。

### プラグインコマンド引数を使ったデフォルト値の変更
読み込みたいファイルが複数あるときやファイルごとに異なるオプションを適用したいときなどに、プラグインコマンド引数を使うことでより高度な制御が行えます。

詳細は[wikiの該当ページ](https://github.com/yktsr/Text2Frame-MV/wiki/%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E3%82%B3%E3%83%9E%E3%83%B3%E3%83%89%E5%BC%95%E6%95%B0)を参照してください。


## 導入方法
1. [ここ](https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Laurus_Text2Frame.js)からプラグイン本体をダウンロードします。
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
