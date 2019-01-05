//=============================================================================
// Text2Frame.js
// ----------------------------------------------------------------------------
// (C)2018-2019 Yuki Katsura
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.1.2 2019/01/03 PlayME, StopMEタグ追加
// 1.1.1 2019/01/02 StopBGM, StopBGSタグ追加
// 1.1.0 2018/10/15 script,wait,fadein,fadeout,comment,PluginCommand,CommonEventタグ追加
// 1.0.2 2018/09/10 translate REAMDE to eng(Partial)
// 1.0.1 2018/09/06 bug fix オプションパラメータ重複、CRLFコード対応
// 1.0.0 2018/09/02 Initial Version
// 0.5.5 2018/11/18 [draft] PlaySE、StopSEタグ対応
// 0.5.4 2018/10/28 [draft] ChangeBattleBGMタグ対応
// 0.5.3 2018/10/28 [draft] PlayBGS, FadeoutBGSタグ対応
// 0.5.2 2018/10/28 [draft] refactor pretext, text_frame, command_bottom
// 0.5.1 2018/10/28 [draft] PlayBGM, FadeoutBGM, SaveBGM, ReplayBGMタグ対応
// 0.4.2 2018/09/29 [draft] waitタグ対応、フェードイン、アウトタグ対応
// 0.4.1 2018/09/27 [draft] commentタグ対応
// 0.4.0 2018/09/24 [draft] scriptタグ対応、Plugin Command対応、Common Event対応
// 0.3.3 2018/08/28 コメントアウト記号の前、行頭に任意個の空白を認めるように変更
// 0.3.2 2018/08/28 MapIDをIntegerへ変更
// 0.3.1 2018/08/27 CE書き出し追加
// 0.3.0 2018/08/26 機能が増えた
// 0.2.0 2018/08/24 機能テスト版
// 0.1.0 2018/08/18 最小テスト版
// ----------------------------------------------------------------------------
// [Twitter]: https://twitter.com/kryptos_nv/
// [GitHub] : https://github.com/yktsr/
//=============================================================================


/*:
 * @plugindesc Simple compiler to convert text to event command.
 * @author Yuki Katsura, えーしゅん(仕様・ヘルプ文章)
 *
 * @param Default Window Position
 * @text Window Position
 * @desc Default setting of window position. Default is "Bottom". Command line mode can overwrite this option.
 * @type select
 * @option Top
 * @option Middle
 * @option Bottom
 * @default Bottom
 *
 * @param Default Background
 * @text Background
 * @desc Default setting of background. Default is "Window". Command line mode can overweite this option.
 * @type select
 * @option Window
 * @option Dim
 * @option Transparent
 * @default Window
 *
 * @param Default Scenario Folder
 * @text Scenario Folder Name
 * @desc Default setting of the folder name which the text file is stored. Default is "text".
 * @default text
 * @require 1
 * @dir text
 * @type string
 *
 * @param Default Scenario File
 * @text Scenario File Name
 * @desc Default setting of text file name. Default is "message.txt". 
 * @default message.txt
 * @require 1
 * @dir text
 * @type string
 *
 * @param Default Common Event ID
 * @text Common Event ID
 * @desc Default setting of the common event ID of the output destination. Default is "1". It means that it is taken in the common event 1.
 * @default 1
 * @type common_event
 *
 * @param Default MapID
 * @text MapID
 * @desc Default setting of the map ID of the output destination. Default is "1". It means that it is taken in the map ID 1.
 * @default 1
 * @type number
 *
 * @param Default EventID
 * @text EventID
 * @desc Default setting os the eventID of the output destination. Default is "2". It means that it is taken in the event ID 2.
 * @default 2
 * @type number
 *
 * @param IsOverwrite
 * @text IsOverwrite
 * @desc In the default case, text is added to the end of event, this param can change it to overwrite. Default is false.
 * @default false
 * @type boolean 
 * 
 * @param Comment Out Char
 * @text Comment Out Char
 * @desc If this charactor is placed at the beginning of a line, this line is not taken. Default is %.
 * @default %
 * @type string
 *
 * @param IsDebug
 * @text IsDebug
 * @desc Detail log is outputted to console log (F8). Default is false.
 * @default false
 * @type boolean 
 *
 * @help
 * Update Soon.
 * Please see wiki.
 * https://github.com/yktsr/Text2Frame-MV/wiki
 */

 /*:ja
 * @plugindesc テキストファイル(.txtファイルなど)から「文章の表示」イベントコマンドに簡単に変換するための、開発支援プラグインです。
 * @author Yuki Katsura, えーしゅん(仕様・ヘルプ文章)
 *
 * @param Default Window Position
 * @text 位置のデフォルト値
 * @desc テキストフレームの表示位置デフォルト値を設定します。デフォルトは下です。個別に指定した場合は上書きされます。
 * @type select
 * @option 上
 * @option 中
 * @option 下
 * @default 下
 *
 * @param Default Background
 * @text 背景のデフォルト値
 * @desc テキストフレームの背景デフォルト値を設定します。デフォルトはウインドウです。個別に指定した場合は上書きされます。
 * @type select
 * @option ウインドウ
 * @option 暗くする
 * @option 透明
 * @default ウインドウ
 *
 * @param Default Scenario Folder
 * @text 取り込み元フォルダ名
 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。
 * @default text
 * @require 1
 * @dir text
 * @type string
 *
 * @param Default Scenario File
 * @text 取り込み元ファイル名
 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。
 * @default message.txt
 * @require 1
 * @dir text
 * @type string
 *
 * @param Default Common Event ID
 * @text 取り込み先コモンイベントID
 * @desc 出力先のコモンイベントIDを設定します。デフォルト値は1です。
 * @default 1
 * @type common_event
 *
 * @param Default MapID
 * @text 取り込み先マップID
 * @desc 取り込み先となるマップのIDを設定します。デフォルト値は1です。
 * @default 1
 * @type number
 *
 * @param Default EventID
 * @text 取り込み先イベントID
 * @desc 取り込み先となるイベントのIDを設定します。デフォルト値は2です。
 * @default 2
 * @type number
 *
 * @param IsOverwrite
 * @text 【取り扱い注意】上書きする
 * @desc 通常イベントの末尾に追加しますが、上書きに変更できます。trueのとき上書きです。デフォルト値はfalseです。
 * @default false
 * @type boolean
 *
 * @param Comment Out Char
 * @text コメントアウト記号
 * @desc 行頭に置いた場合、その行をコメントとして処理する記号を定義します。デフォルト値は「％」（半角パーセント）です。
 * @default %
 * @type string
 *
 * @param IsDebug
 * @text デバッグモードを利用する
 * @desc F8のコンソールログにこのプラグインの詳細ログが出力されます。デフォルト値はfalseです。処理時間が伸びます。
 * @default false
 * @type boolean
 *
 * @help
 * 本プラグインはテキストファイル(.txtファイルなど)から「文章の表示」イベント
 * コマンドに簡単に変換するための、開発支援プラグインです。キャラクター同士の
 * 会話などをツクールMV**以外**のエディタで編集して、後でイベントコマンドとし
 * て組み込みたい人をサポートします。
 *
 * 所定のプラグインコマンド（後述）を実行することにより、テキストファイルを読
 * み込み、ツクールMVのマップイベントまたはコモンイベントにイベントコマンドと
 * して取り込むことができます。
 *
 * テストプレイおよびイベントテスト（イベントエディタ上で右クリック→テスト）
 * から実行することを想定しています。
 *
 * また、追加機能としてフェードインやBGM再生等のイベントコマンドも組み込むこ
 * とができます。追加機能の詳細はこのREADMEの下部に記載していますので、そちら
 * をご覧ください
 *
 * --------------------------------------
 * 実行方法
 * --------------------------------------
 * 1. dataフォルダのバックアップをとっておく。
 *
 * 2. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
 *
 * 3. 作成したフォルダに読み込みたいテキストファイルを保存する。
 *
 * 4. 任意のマップ・位置に空のイベントをひとつ作成します。
 *     この時マップIDとイベントIDをメモしておきましょう。
 *     マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの
 *    左上に記載されています。
 *     イベントIDはイベントをダブルクリックして出るイベントエディターの左上に
 *    記載されています。
 *
 * 5. プラグインの管理画面から本プラグインのパラメータを書きのとおり編集します。
 *  ・「取り込み元フォルダ名」に2.で作成したフォルダのフォルダ名を入力。
 *      (デフォルトはtextです)
 *  ・「取り込み元ファイル名」に3.で保存したテキストファイルのファイル名を入力。
 *      (デフォルトはmessage.txtです)
 *  ・「取り込み先マップID」に4.でメモしたマップIDを入力。
 *      (デフォルトは1です)
 *  ・「取り込み先イベントID」に4.でメモしたイベントIDを入力。
 *      (デフォルトは2です)
 *
 * 6. 以下のうちいずれかを記述したプラグインコマンドを作成する。
 *    IMPORT_MESSAGE_TO_EVENT
 *    メッセージをイベントにインポート
 *     これらは全く同じ機能なのでどちらを使ってもかまいません。
 *
 * 7. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
 *     実行前に本プラグインを管理画面からONにして「プロジェクトの保存」を
 *    実行しておきましょう。
 *
 * 8. **セーブせずに**プロジェクトを開き直します。
 *      成功していれば、7.で設定したマップのイベントの中に「文章の表示」
 *     イベントコマンドとして書きだされています。
 *      デフォルトの場合はtextフォルダのmessage.txtの内容をIDが1の
 *     マップのIDが2のイベントに書き出したことになります。
 *
 *
 * --------------------------------------
 * テキストファイルの書き方について
 * --------------------------------------
 * ◆ 基本となる書き方
 *  １つのメッセージを改行で区切るという書き方をします。
 *  例えば以下の通りです。
 *
 *  ↓↓↓↓↓ここから例文1↓↓↓↓↓
 *  やめて！ラーの翼神竜の特殊能力で、
 *  ギルフォード・ザ・ライトニングを焼き払われたら、
 *  闇のゲームでモンスターと繋がってる城之内の精神まで燃え尽きちゃう！
 *
 *  お願い、死なないで城之内！あんたが今ここで倒れたら、
 *  舞さんや遊戯との約束はどうなっちゃうの？
 *  ライフはまだ残ってる。
 *  ここを耐えれば、マリクに勝てるんだから！
 *
 *  次回、「城之内死す」。デュエルスタンバイ！
 *  ↑↑↑↑↑ここまで例文1↑↑↑↑↑
 *
 *  この場合は３つの「文章の表示」イベントコマンドに変換されて
 *  取り込まれます。改行は何行いれても同様の動作になります。
 *  以上の方法で実行した場合、
 *  メッセージウィンドウの「背景」「ウィンドウ位置」については
 *  プラグインパラメータの「位置のデフォルト値」「背景のデフォルト値」の
 *  値が反映されます。
 *
 * ◆ 顔・背景・ウィンドウ位置の設定について
 *  それぞれのメッセージの「顔」「背景」「ウィンドウ位置」については、
 *  メッセージの手前にタグを記述することで指定することができます。
 *  上述の例のように指定しない場合は、パラメータで設定したものが適用されます。
 *
 *  例えば以下の通りです。
 *
 *  ↓↓↓↓↓ここから例文2↓↓↓↓↓
 *  <Face: Actor1(0)><WindowPosition: Bottom><Background: Dim>
 *  やめて！ラーの翼神竜の特殊能力で、
 *  ギルフォード・ザ・ライトニングを焼き払われたら、
 *  闇のゲームでモンスターと繋がってる城之内の精神まで燃え尽きちゃう！
 *
 *  <WindowPosition: Top>
 *  お願い、死なないで城之内！あんたが今ここで倒れたら、
 *  舞さんや遊戯との約束はどうなっちゃうの？
 *  ライフはまだ残ってる。
 *  ここを耐えれば、マリクに勝てるんだから！
 *
 *  次回、「城之内死す」。デュエルスタンバイ！
 *  ↑↑↑↑↑ここまで例文2↑↑↑↑↑
 *
 * この例の場合では、
 *  1つ目のメッセージ(やめて！〜)ではActor1ファイルの場所が1の顔が表示(詳細は後
 *  述)され、位置は下、背景が暗いメッセージウィンドウになります。
 *
 *  2つ目のメッセージ(お願い、〜)は、位置が上とだけ指定されます。
 *  指定されなかった他の顔や背景はプラグインのパラメータで設定されているものが
 *  適用されます。
 *
 *  3つめのメッセージ(次回、〜)は、何も指定されていません。
 *  そのため、例文1と同様にプラグインのパラメータで設定されているものが適用され
 *  ます。
 *
 *  タグの詳細は下記をご覧ください。
 *
 *  ○顔の指定方法
 *   <Face: ファイル名(顔の指定番号)>
 *   <FC: ファイル名(顔の指定番号)>
 *   <顔: ファイル名(顔の指定番号)>
 *
 *   の３つのうちいずれかの記法で指定します。
 *   ファイル名はimg/facesのフォルダ内のものを参照します。
 *   顔の指定番号は、ファイルの中で参照する位置を指定します。
 *   番号の法則はツクールMVの仕様に準拠します。最も左上が0,右下が7です。
 *
 *  ○位置の指定方法
 *   <WindowPosition: 表示したい位置>
 *   <WP: 表示したい位置>
 *   <位置: 表示したい位置
 *
 *   の３つのうちいずれかの記法で指定します。
 *   表示したい位置に記述できるのは以下の3種類です。
 *   ・Top      # 上
 *   ・Middle   # 中
 *   ・Bottom   # 下
 *   Topは「上」、Middleは「中」、Bottomは「下」となります。
 *   それぞれ大文字小文字を区別しません。つまりTOP,top,toPなどはTopと同じです。
 *   また、英語ではな<WindowPosition: 上>のように日本語指定もできます。
 *
 *  ○背景の設定方法
 *   <Background: 背景の指定>
 *   <BG: 背景の指定>
 *   <背景: 背景の指定>
 *
 *   の３つのうちいずれかの記法で指定します。
 *   背景の指定に記述できるのは、以下の3種類です。
 *   ・Window        # ウィンドウ
 *   ・Dim           # 暗くする
 *   ・Transparent   # 透明
 *   Windowは「ウィンドウ」、Dimは「暗くする」、Transparentは「透明」となります。
 *   それぞれ大文字小文字を区別しません。
 *   また、英語ではなくて<Background: ウィンドウ>のように日本語指定もできます。
 *
 *
 * ◆ コメントアウトについて
 *  テキストファイルのうち、イベントコマンドとして取り込まないようにする、
 *  いわゆるコメントアウトをするための記法もあります。
 *  メモ書き等に利用することができます。
 *
 *  行頭に「%」（半角パーセント）を記述することで、実現できます。
 *
 *  ↓↓↓↓↓ここから例文3↓↓↓↓↓
 *  % かわいい感じで
 *  今日も一日がんばるぞい！
 *  ↑↑↑↑↑ここまで例文3↑↑↑↑↑
 *
 *  このように記載することで、実際に取り込まれるのは
 *  「今日も一日がんばるぞい！」のみとなります。
 *  「かわいい感じで」はメッセージとしては取り込まれません。
 *
 *
 * --------------------------------------
 * コモンイベントへの書き出しについて
 * --------------------------------------
 * マップのイベントではなくコモンイベントに取り込むことも可能です。
 * その場合は以下のプラグインコマンドのうちいずれかを使用してください。
 *
 * IMPORT_MESSAGE_TO_CE
 * メッセージをコモンイベントにインポート
 *
 * これらは全く同じ機能なのでどちらを使ってもかまいません。
 * 取り込む先のコモンイベントのIDはプラグインパラメータの
 * 「取り込み先コモンイベントID」で指定できます。
 *
 *
 * --------------------------------------
 * プラグインコマンドの引数について
 * --------------------------------------
 * プラグインコマンドに引数を設定することにより、プラグインパラメータで指定した
 * テキストファイルやマップIDとは違うパラメータで実行ができます。
 *
 * 例1:text/message.txtをマップID1, イベント番号2に上書きせずに取り込む。
 * IMPORT_MESSAGE_TO_EVENT text message.txt 1 2 false
 * メッセージをイベントにインポート text message.txt 1 2 false
 *
 * 例2:text/message.txtをIDが3のコモンイベントに上書きせずに取り込む。
 * IMPORT_MESSAGE_TO_CE text message.txt 3 false
 * メッセージをコモンイベントにインポート text message.txt 3 false
 *
 *
 * --------------------------------------
 * 追加機能について
 * --------------------------------------
 * メッセージだけでなく、指定の記法を用いることでいくつかのイベントコマンドを
 * 組み込むこともできます。
 * 現状対応しているコマンドは以下のとおりです。
 * - スクリプト
 * - プラグインコマンド
 * - 注釈
 * - ウェイト
 * - フェードアウト
 * - フェードイン
 * - BGMの演奏
 * - BGMのフェードアウト
 * - BGMの保存
 * - BGMの再開
 * - BGSの演奏
 * - BGSのフェードアウト
 * - MEの演奏
 * - SEの演奏
 * - SEの停止
 *
 * ○「スクリプト」の組み込み方法
 *  スクリプトのイベントコマンドは、以下のように<script>と</script>で挟み込む
 *  記法で指定します。
 *  <script>
 *   処理させたいスクリプト
 *  </script>
 *
 *  例えば以下のとおりです。
 *  <script>
 *  console.log("今日も一日がんばるぞい！(و ･ㅂ･)و");
 *  </script>
 *
 *  このようにテキストファイル中に記載することで、
 *  console.log("今日も一日がんばるぞい！(و ･ㅂ･)و"); という内容のスクリプト
 *  のイベントコマンドが組み込まれます。
 *  ツクールMVのエディタ上からは12行を超えるスクリプトは記述出来ませんが、
 *  本プラグインの機能では13行以上のスクリプトも組み込めます。
 *  ただし、ツクールMV上から一度開いて保存してしまうと、13行目以降はロストし
 *  てしまいます。
 *  また、別記法として<SC>か、<スクリプト>としても記述できます。
 *
 * ○「プラグインコマンド」の組み込み方法
 *  プラグインコマンドのイベントコマンドは、以下のいずれかの方法で指定します。
 *  <plugincommand: プラグインコマンドの内容>
 *  <PC: プラグインコマンドの内容>
 *  <プラグインコマンド: プラグインコマンドの内容>
 *
 *  例えば以下のように記述すると、ItemBook openと入ったプラグインコマンドが
 *  組み込まれます。
 *  <plugincommand: ItemBook open>
 *
 * ○ 注釈の組み込み方法
 *  注釈のイベントコマンドは、以下のように<comment>と</comment>で挟み込む
 *  記法で指定します。
 *  <comment>
 *   注釈の内容
 *  </comment>
 *
 *  例えば以下のとおりです。
 *  <comment>
 *  この辺からいい感じのBGMを再生する。
 *  選曲しないと・・・。
 *  </comment>
 *
 *  また、別記法として<CO>か、<注釈>としても記述できます。
 *
 * ○ ウェイトの組み込み方法
 *  ウェイトのイベントコマンドは、以下のいずれかの方法でしていします。
 *  <wait: フレーム数(1/60秒)>
 *  <ウェイト: フレーム数(1/60秒)>
 *
 *  例えば以下のように記述すると60フレーム(1秒)のウェイトが組み込まれます。
 *  <wait: 60>
 *
 * ○ フェードアウトの組み込み方法
 *  フェードアウトは以下のいずれかの方法で組み込めます。
 *  <fadeout>
 *  <FO>
 *  <フェードアウト>
 *
 * ○ フェードインの組み込み方法
 *  フェードインは以下のいずれかの方法で組み込めます。
 *  <fadein>
 *  <FI>
 *  <フェードイン>
 *
 * ○ BGMの演奏の組み込み方法
 *  BGMの演奏は、以下のいずれかの方法で指定します。
 *  <PlayBGM: ファイル名, 音量, ピッチ, 位相>
 *  <BGMの演奏: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Castle1をデフォルト設定で組み込む
 *   <PlayBGM: Castle1>
 *  例2: Castle2を音量50, ピッチ80, 位相30で組み込む
 *   <PlayBGM: Castle2, 50, 80, 30>
 *
 *  BGMを「なし」に設定したい場合は以下のいずれかの方法で指定してください。
 *  <PlayBGM: None>
 *  <PlayBGM: なし>
 *  <StopBGM>
 *
 *  本プラグインを使用する場合は、「None」「なし」というファイル名のBGMは
 *  ご利用できないことにご注意ください。
 *
 * ○ BGMのフェードアウトの組み込み方法
 *  BGMのフェードアウトは以下のいずれかの方法で組み込みます。
 *  <FadeoutBGM: 時間(秒)>
 *  <BGMのフェードアウト: 時間(秒)>
 *
 *  例えば、以下のように記述すると3秒でBGMがフェードアウトします。
 *  <FadeoutBGM: 3>
 *
 * ○ BGMの保存の組み込み方法
 *  BGMの保存は以下のいずれかの方法で組み込みます。
 *  <SaveBGM>
 *  <BGMの保存>
 *
 * ○ BGMの再開
 *  BGMの再開は以下のいずれかの方法で組み込みます。
 *  <ReplayBGM>
 *  <BGMの再開>
 *
 * ○ BGSの演奏の組み込み方法
 *  BGSの演奏は、以下のいずれかの方法で指定します。
 *  <PlayBGS: ファイル名, 音量, ピッチ, 位相>
 *  <BGSの演奏: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Cityをデフォルト設定で組み込む
 *   <PlayBGS: City>
 *  例2: Darknessを音量50, ピッチ80, 位相30で組み込む
 *   <PlayBGS: Darkness, 50, 80, 30>
 *
 *  BGSを「なし」に設定したい場合は以下のいずれかの方法で指定してください。
 *  <PlayBGS: None>
 *  <PlayBGS: なし>
 *  <StopBGS>
 *
 *  本プラグインを使用する場合は、「None」「なし」というファイル名のBGSは
 *  ご利用できないことにご注意ください。
 *
 * ○ BGSのフェードアウトの組み込み方法
 *  BGSのフェードアウトは以下のいずれかの方法で組み込みます。
 *  <FadeoutBGS: 時間(秒)>
 *  <BGSのフェードアウト: 時間(秒)>
 *
 *  例えば、以下のように記述すると3秒でBGSがフェードアウトします。
 *  <FadeoutBGS: 3>
 *
 * ○ MEの演奏の組み込み方法
 *  MEの演奏は、以下のいずれかの方法で指定します。
 *  <PlayME: ファイル名, 音量, ピッチ, 位相>
 *  <MEの演奏: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Innをデフォルト設定で組み込む
 *   <PlayME: Inn>
 *  例2: Mysteryを音量50, ピッチ80, 位相30で組み込む
 *   <PlayME: Mystery, 50, 80, 30>
 *
 *  MEを「なし」に設定したい場合は以下のいずれかの方法で指定してください。
 *  <PlayME: None>
 *  <PlayME: なし>
 *  <StopME>
 *
 *  本プラグインを使用する場合は、「None」「なし」というファイル名のMEは
 *  ご利用できないことにご注意ください。
 *
 * ○ SEの演奏の組み込み方法
 *  SEの演奏は、以下のいずれかの方法で指定します。
 *  <PlaySE: ファイル名, 音量, ピッチ, 位相>
 *  <SEの演奏: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Attack1をデフォルト設定で組み込む
 *   <PlaySE: Attack1>
 *  例2: Attack2を音量50, ピッチ80, 位相30で組み込む
 *   <PlaySE: Attack2, 50, 80, 30>
 *
 *  SEを「なし」に設定したい場合は以下のいずれかの方法で指定してください。
 *  <PlaySE: None>
 *  <PlaySE: なし>
 *
 *  本プラグインを使用する場合は、「None」「なし」というファイル名のSEは
 *  ご利用できないことにご注意ください。
 *
 * ○ SEの停止の組み込み方法
 *  SEの停止は以下のいずれかの方法で指定します。
 *  <StopSE>
 *  <SEの停止>
 *
 * ○ 戦闘BGMの変更の組み込み方法
 *  戦闘BGMの変更は、以下のいずれかの方法で指定します。
 *  <ChangeBattleBGM: ファイル名, 音量, ピッチ, 位相>
 *  <戦闘曲の変更: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Battle1をデフォルト設定で組み込む
 *   <ChangeBattleBGM: Battle1>
 *  例2: Battle2を音量50, ピッチ80, 位相30で組み込む
 *   <ChangeBattleBGM: Battle2, 50, 80, 30>
 *
 *  「なし」に設定したい場合は以下のいずれかの方法で指定してください。
 *  <ChangeBattleBGM: None>
 *  <ChangeBattleBGM: なし>
 *
 * --------------------------------------
 * 付録：動作確認テキスト
 * --------------------------------------
 * タグ指定やコメントアウトなどの一通り機能を確認できるテキストを記載しています。
 * コピペして使用してみてください。
 *
 * ↓↓↓↓↓ここから動作確認テキスト↓↓↓↓↓
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑
 *
 * <Face: Actor1(0)>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（顔）
 *
 * <WindowPosition: Top>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（上）
 *
 * <WindowPosition: Middle>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（中）
 *
 * <WindowPosition: Bottom>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（下）
 *
 * <Background: window>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（ウインドウ）
 *
 * <Background: Dim>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（暗く）
 *
 * <Background: Transparent>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（透明）
 *
 * <Face: Actor1(0)><WindowPosition: Top><Background: Dim>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（AC1、上、暗く）
 *
 * <Face: Actor1(1)><WindowPosition: Top><Background: Dim>青葉
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑(上,暗い)
 *
 * <Face: Actor1(1)>
 * <WindowPosition: Middle>
 * <Background: Dim>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑(中、暗く)
 *
 * <Face: Actor1(1)><WindowPosition: Bottom><Background: Dim>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑(下、暗く)
 *
 * <Face: Actor1(1)><WindowPosition: 中><Background: 暗くする>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑(中、暗く)
 *
 * <Face: Actor1(1)><WindowPosition: 中><Background: 暗く>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑(中、暗く)
 *
 * <顔: Actor1(1)><位置: 中><背景: 暗く>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑(中、暗く)
 *
 * <FC: Actor1(1)><WP: Bottom><BG: Dim>
 * 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑(下)
 *
 * % 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（コメントアウト）
 * % 今日も一日がんばるぞい！(و ･ㅂ･)و ̑̑（コメントアウト）
 * \N[1]
 * えと…憧れてた\N[2]さんの下でお手伝いができてこれ以上ないくらい充実した１年だったと思いますけど
 *
 * <Face: Actor1(0)><WindowPosition: Top><Background: Dim>
 * \N[1]
 * もう少し役に立てたらって。
 * 村人以外のキャラもたくさん作らせていただけたらと思います
 *
 * <script>
 * for(var i = 0; i < 10; i++) {
 *   console.log("今日も一日がんばるぞい！(و ･ㅂ･)و");
 * }
 * </script>
 *
 * <plugincommand: ItemBook open>
 *
 * <comment>
 * この辺からいい感じのBGMを再生する。
 * 選曲しないと・・・。
 * </comment>
 *
 * <fadeout>
 * <wait: 120>
 * <fadein>
 * <PlayBGM: Castle1>
 * <wait: 60>
 * <PlayBGM: Castle2, 50, 80, 30>
 * <SaveBGM>
 * <FadeoutBGM: 2>
 * <Wait: 60>
 * <PlayBGM: None>
 * <Wait: 60>
 * <ReplayBGM>
 * <Wait: 60>
 * <StopBGM>
 *
 * <PlayBGS: City>
 * <wait: 60>
 * <PlayBGS: Darkness, 50, 80, 30>
 * <FadeoutBGS: 2>
 * <Wait: 60>
 * <StopBGS>
 *
 * <PlayME: Inn>
 * <wait: 60>
 * <PlayME: Mystery, 50, 80, 30>
 * <wait: 30>
 * <PlayME: None>
 *
 * <PlaySE: Attack1>
 * <wait:60>
 * <PlaySE: Attack2, 50, 80, 30>
 * <wait:15>
 * <StopSE>
 *
 * <ChangeBattleBGM : Battle1, 80, 100, 0>
 * ↑↑↑↑↑ここまで動作確認テキスト↑↑↑↑↑
 *
 *
 * --------------------------------------
 * 注意事項
 * --------------------------------------
 * 当プラグインの機能を使用する前にプロジェクト以下の「data」フォルダの
 * バックアップを「必ず」取得してください。
 * プラグイン作者は、いかなる場合も破損したプロジェクトの復元には応じられませ
 * んのでご注意ください。
 * テキストファイルの文字コードはUTF-8にのみ対応しています。
 *
 * --------------------------------------
 * 連絡先
 * --------------------------------------
 * このプラグインに関し、バグ・疑問・追加要望を発見した場合は、
 * 以下の連絡先まで連絡してください。
 * [Twitter]: https://twitter.com/Asyun3i9t/
 * [GitHub] : https://github.com/yktsr/
 */


/**
 * Text2Frame
 * @constructor
 */
function Text2Frame() {
  this.initialize.apply(this, arguments);
}

var Laurus = Laurus || {};
Laurus.Text2Frame = {};
Laurus.Text2Frame.Parameters = PluginManager.parameters('Text2Frame');

Laurus.Text2Frame.WindowPosition = String(Laurus.Text2Frame.Parameters["Default Window Position"]);
Laurus.Text2Frame.Background     = String(Laurus.Text2Frame.Parameters["Default Background"]);
Laurus.Text2Frame.FileFolder     = String(Laurus.Text2Frame.Parameters["Default Scenario Folder"]);
Laurus.Text2Frame.FileName       = String(Laurus.Text2Frame.Parameters["Default Scenario File"]);
Laurus.Text2Frame.CommonEventID  = String(Laurus.Text2Frame.Parameters["Default Common Event ID"]);
Laurus.Text2Frame.MapID          = String(Laurus.Text2Frame.Parameters["Default MapID"]);
Laurus.Text2Frame.EventID        = String(Laurus.Text2Frame.Parameters["Default EventID"]);
Laurus.Text2Frame.IsOverwrite    = (String(Laurus.Text2Frame.Parameters["IsOverwrite"]) == 'true') ? true : false;
Laurus.Text2Frame.CommentOutChar = String(Laurus.Text2Frame.Parameters["Comment Out Char"]);
Laurus.Text2Frame.IsDebug        = (String(Laurus.Text2Frame.Parameters["IsDebug"]) == 'true') ? true : false;


(function() {
  'use strict';
  const fs   = require('fs');
  const path = require('path');
  const base = path.dirname(process.mainModule.filename);

  //=============================================================================
  // Game_Interpreter
  //=============================================================================
  const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.apply(this, arguments);
    this.pluginCommandText2Frame(command, args);
  };

  Game_Interpreter.prototype.pluginCommandText2Frame = function(command, args) {
    var command_text = command.toUpperCase();

    switch (command.toUpperCase()) {
      case 'IMPORT_MESSAGE_TO_EVENT' :
      case 'メッセージをイベントにインポート' :
        if(args.length == 5){
          $gameMessage.add('Command arguments mode. / コマンド引数モードです');
          Laurus.Text2Frame.FileFolder     = args[0];
          Laurus.Text2Frame.FileName       = args[1];
          Laurus.Text2Frame.MapID          = args[2];
          Laurus.Text2Frame.EventID        = args[3];
          Laurus.Text2Frame.IsOverwrite    = (args[4] == 'true') ? true : false;
        }
        break;
      case 'IMPORT_MESSAGE_TO_CE' :
      case 'メッセージをコモンイベントにインポート' :
        if(args.length == 4){
          $gameMessage.add('Command arguments mode. / コマンド引数モードです');
          Laurus.Text2Frame.FileFolder     = args[0];
          Laurus.Text2Frame.FileName       = args[1];
          Laurus.Text2Frame.CommonEventID  = args[2];
          Laurus.Text2Frame.IsOverwrite    = (args[3] == 'true') ? true : false;
        }
        break;
      default:
        return;
    }

    const printLog = function(){
      if(Laurus.Text2Frame.IsDebug){
        console.log(Array.prototype.join.call(arguments));
      }
    }
    const throwError = function(message){
      throw new Error(message);
      console.error(message);
    }

    const readText = function(folderName, fileName){
      var input_path = base + "/" + folderName + "/" + fileName;
      try{
        return fs.readFileSync(input_path, 'utf8');
      }catch(e){
        throw new Error('File not found. / ファイルが見つかりません。\n' + input_path);
      }
    };

    const readMapData = function(mapid){
      try{
        return JSON.parse(fs.readFileSync(base + '/data/Map' + mapid + ".json", {encoding: 'utf8'}));
      }catch(e){
        throw new Error('Map not found. / マップが見つかりません。\n' + "MAP " + mapid);
      }
    };

    const readCommonEventData = function(){
      try{
        return JSON.parse(fs.readFileSync(base + "/data/CommonEvents.json", 'utf8'));
      }catch(e){
        throw new Error('File not found. / ファイルが見つかりません。\n' + "data/CommonEvents.json");
        console.error(e);
      }
    };

    const writeData = function(filepath, jsonData){
      try{
        fs.writeFileSync(filepath, JSON.stringify(jsonData), {encoding: 'utf8'});
      }catch(e){
        throw new Error('Fail to save / 保存に失敗しました。\n' 
          + 'ファイルが開いていないか確認してください。\n' + filepath);
        console.error(e);
      }
    }

    const getBackground = function(background) {
      switch(background.toUpperCase()){
        case 'WINDOW':
        case 'ウインドウ':
          return 0;
        case 'DIM':
        case '暗くする':
        case '暗く':
          return 1;
        case 'TRANSPARENT':
        case '透明':
         return 2;
        default:
          throw new Error('Syntax error. / 文法エラーです。');
      }
    };

    const getWindowPosition = function(windowPosition){
      switch(windowPosition.toUpperCase()){
        case 'TOP':
        case '上':
          return 0;
        case 'MIDDLE':
        case '中':
          return 1;
        case 'BOTTOM':
        case '下':
          return 2;
        default:
          throw new Error('Syntax error. / 文法エラーです。');
      }
    };

    const getPretextEvent = function(){
      return {"code": 101, "indent": 0, "parameters": ["", 0, 
              getBackground(Laurus.Text2Frame.Background), 
              getWindowPosition(Laurus.Text2Frame.WindowPosition)]}
    }

    const getTextFrameEvent = function(text){
      return {"code": 401, "indent": 0, "parameters": [text]}
    }

    const getCommandBottomEvent = function(){
      return {"code":0,"indent":0,"parameters":[]};
    }

    const getScriptHeadEvent = function(text){
      var script_head = {"code": 355, "indent": 0, "parameters": [""]}
      script_head["parameters"][0] = text;
      return script_head;
    }
    const getScriptBodyEvent = function(text){
      var script_body = {"code": 655, "indent": 0, "parameters": [""]}
      script_body["parameters"][0] = text;
      return script_body;
    }
    
    const getPluginCommandEvent = function(text){
      var plugin_command = {"code": 356, "indent": 0, "parameters": [""]}
      plugin_command["parameters"][0] = text;
      return plugin_command;
    }
    
    const getCommonEventEvent = function(num){
      var common_event= {"code": 117, "indent": 0, "parameters": [""]}
      common_event["parameters"][0] = num;
      return common_event;
    }
    
    const getCommentOutHeadEvent = function(text){
      var comment_out= {"code": 108, "indent": 0, "parameters": [""]}
      comment_out["parameters"][0] = text;
      return comment_out;
    }
    const getCommentOutBodyEvent = function(text){
      var comment_out= {"code": 408, "indent": 0, "parameters": [""]}
      comment_out["parameters"][0] = text;
      return comment_out;
    }
    
    const getWaitEvent = function(num){
      var wait = {"code": 230, "indent": 0, "parameters": [""]}
      wait["parameters"][0] = num;
      return wait;
    }

    const getFadeinEvent = function(){
      return {"code": 222, "indent": 0, "parameters": [""]};
    }
    const getFadeoutEvent = function(){
      return {"code": 221, "indent": 0, "parameters": [""]};
    }

    const getPlayBgmEvent = function(name, volume, pitch, pan){
      var param_volume = 90;
      var param_pitch = 100;
      var param_pan = 0;

      if(typeof(volume) == "number"){
        param_volume = volume;
      }

      if(typeof(pitch) == "number"){
        param_pitch = pitch;
      }

      if(typeof(pan) == "number"){
        param_pan = pan;
      }

      return {"code": 241, "indent": 0, "parameters": [{"name": name,"volume": param_volume,"pitch": param_pitch,"pan": param_pan}]};
    }

    const getStopBgmEvent = function(volume, pitch, pan){
      return getPlayBgmEvent("", volume, pitch, pan);
    }

    const getFadeoutBgmEvent = function(duration){
      var param_duration = 10;
      if(typeof(duration) == "number"){
        param_duration = duration;
      }
      return {"code": 242, "indent": 0, "parameters": [param_duration]};
    }

    const getSaveBgmEvent = function(){
      return {"code": 243, "indent": 0, "parameters": []};
    }

    const getReplayBgmEvent = function(){
      return {"code": 244, "indent": 0, "parameters": []};
    }

    const getChangeBattleBgmEvent = function(name, volume, pitch, pan){
      var param_volume = 90;
      var param_pitch = 100;
      var param_pan = 0;

      if(typeof(volume) == "number"){
        param_volume = volume;
      }

      if(typeof(pitch) == "number"){
        param_pitch = pitch;
      }

      if(typeof(pan) == "number"){
        param_pan = pan;
      }

      return {"code": 132, "indent": 0, "parameters": [{"name": name,"volume": param_volume,"pitch": param_pitch,"pan": param_pan}]};
    }

    const getPlayBgsEvent = function(name, volume, pitch, pan){
      var param_volume = 90;
      var param_pitch = 100;
      var param_pan = 0;

      if(typeof(volume) == "number"){
        param_volume = volume;
      }

      if(typeof(pitch) == "number"){
        param_pitch = pitch;
      }

      if(typeof(pan) == "number"){
        param_pan = pan;
      }

      return {"code": 245, "indent": 0, "parameters": [{"name": name,"volume": param_volume,"pitch": param_pitch,"pan": param_pan}]};
    }

    const getStopBgsEvent = function(volume, pitch, pan){
      return getPlayBgsEvent("", volume, pitch, pan);
    }

    const getFadeoutBgsEvent = function(duration){
      var param_duration = 10;
      if(typeof(duration) == "number"){
        param_duration = duration;
      }
      return {"code": 246, "indent": 0, "parameters": [param_duration]};
    }

    const getPlaySeEvent = function(name, volume, pitch, pan){
      var param_volume = 90;
      var param_pitch = 100;
      var param_pan = 0;

      if(typeof(volume) == "number"){
        param_volume = volume;
      }

      if(typeof(pitch) == "number"){
        param_pitch = pitch;
      }

      if(typeof(pan) == "number"){
        param_pan = pan;
      }

      return {"code": 250, "indent": 0, "parameters": [{"name": name,"volume": param_volume,"pitch": param_pitch,"pan": param_pan}]};
    }
    const getStopSeEvent = function(){
      return {"code": 251, "indent": 0, "parameters": [""]};
    }

    const getPlayMeEvent = function(name, volume, pitch, pan){
      var param_volume = 90;
      var param_pitch = 100;
      var param_pan = 0;

      if(typeof(volume) == "number"){
        param_volume = volume;
      }

      if(typeof(pitch) == "number"){
        param_pitch = pitch;
      }

      if(typeof(pan) == "number"){
        param_pan = pan;
      }

      return {"code": 249, "indent": 0, "parameters": [{"name": name, "volume": param_volume, "pitch": param_pitch, "pan": param_pan}]};
    }

    const getStopMeEvent = function(volume, pitch, pan){
      return getPlayMeEvent("", volume, pitch, pan);
    }

    var event_command_list = [];
    var scenario_text = readText(Laurus.Text2Frame.FileFolder,Laurus.Text2Frame.FileName);
    var text_lines = scenario_text.replace(/\r/g,'').split('\n');
    var frame_param = getPretextEvent();
    var script_mode = {"mode": false, "body": false};
    var comment_mode = {"mode": false, "body": false};
    printLog("Default", frame_param.parameters);
    for(var i=0; i < text_lines.length; i++){
      var text = text_lines[i];

      printLog(i, text);

      // Comment out
      if(Laurus.Text2Frame.CommentOutChar && text.match('^ *' + Laurus.Text2Frame.CommentOutChar)){
        continue;
      }

      // Script
      var script_start = text.match(/<script>/i)
        || text.match(/<SC>/i)
        || text.match(/<スクリプト>/i)
      var script_end = text.match(/<\/script>/i)
        || text.match(/<\/SC>/i)
        || text.match(/<\/スクリプト>/i)

      if(script_start){
        script_mode["mode"] = true;
        printLog("script_mode = true;");
        continue;
      }
      if(script_end){
        script_mode["mode"] = false;
        script_mode["body"] = false;
        printLog("script_mode = false;");
        continue;
      }

      if(script_mode["mode"]){
        if(script_mode["body"]){
          event_command_list.push(getScriptBodyEvent(text));
        }else{
          event_command_list.push(getScriptHeadEvent(text));
          script_mode["body"] = true;
        }
        continue;
      }

      // Comment out Event
      var comment_start = text.match(/<comment>/i)
        || text.match(/<CO>/i)
        || text.match(/<注釈>/i);
      var comment_end = text.match(/<\/comment>/i)
        || text.match(/<\/CO>/i)
        || text.match(/<\/注釈>/i);

      if(comment_start){
        comment_mode["mode"] = true;
        printLog("comment_mode = true;");
        continue;
      }
      if(comment_end){
        comment_mode["mode"] = false;
        comment_mode["body"] = false;
        printLog("comment_mode = false;");
        continue;
      }

      if(comment_mode["mode"]){
        if(comment_mode["body"]){
          event_command_list.push(getCommentOutBodyEvent(text));
        }else{
          event_command_list.push(getCommentOutHeadEvent(text));
          comment_mode["body"] = true;
        }
        continue;
      }


      if(text){
        var face = text.match(/<face *: *(.+?)>/i) 
          || text.match(/<FC *: *(.+?)>/i)
          || text.match(/<顔 *: *(.+?)>/i);
        var window_position = text.match(/<windowposition *: *(.+?)>/i) 
          || text.match(/<WP *: *(.+?)>/i)
          || text.match(/<位置 *: *(.+?)>/i);
        var background = text.match(/<background *: *(.+?)>/i)
          || text.match(/<BG *: *(.+?)>/i)
          || text.match(/<背景 *: *(.+?)>/i);
        var plugin_command = text.match(/<plugincommand *: *(.+?)>/i)
          || text.match(/<PC *: *(.+?)>/i)
          || text.match(/<プラグインコマンド *: *(.+?)>/i);
        var common_event = text.match(/<commonevent *: *(.+?)>/i)
          || text.match(/<CE *: *(.+?)>/i)
          || text.match(/<コモンイベント *: *(.+?)>/i);
        var wait = text.match(/<wait *: *(.+?)>/i)
          || text.match(/<ウェイト *: *(.+?)>/i);
        var fadein = text.match(/<fadein>/i)
          || text.match(/<FI>/i)
          || text.match(/<フェードイン>/i);
        var fadeout = text.match(/<fadeout>/i)
          || text.match(/<FO>/i)
          || text.match(/<フェードアウト>/i);
        var play_bgm = text.match(/<playbgm *: *([^ ].+)>/i)
          || text.match(/<BGMの演奏 *: *([^ ].+)>/);
        var stop_bgm = text.match(/<stopbgm>/i)
          || text.match(/<playbgm *: *none>/i)
          || text.match(/<playbgm *: *なし>/i)
          || text.match(/<BGMの停止>/);
        var fadeout_bgm = text.match(/<fadeoutbgm *: *(.+?)>/i)
          || text.match(/<BGMのフェードアウト *: *(.+?)>/);
        var save_bgm = text.match(/<savebgm>/i)
          || text.match(/<BGMの保存>/);
        var replay_bgm = text.match(/<replaybgm>/i)
          || text.match(/<BGMの再開>/);
        var change_battle_bgm = text.match(/<changebattlebgm *: *([^ ].+)>/i)
          || text.match(/<戦闘曲の変更 *: *([^ ].+)>/);
        var play_bgs = text.match(/<playbgs *: *([^ ].+)>/i)
          || text.match(/<BGSの演奏 *: *([^ ].+)>/);
        var stop_bgs = text.match(/<stopbgs>/i)
          || text.match(/<playbgs *: *none>/i)
          || text.match(/<playbgs *: *なし>/i)
          || text.match(/<BGSの停止>/);
        var fadeout_bgs = text.match(/<fadeoutbgs *: *(.+?)>/i)
          || text.match(/<BGSのフェードアウト *: *(.+?)>/);
        var play_se = text.match(/<playse *: *([^ ].+)>/i)
          || text.match(/<SEの演奏 *: *([^ ].+)>/);
        var stop_se = text.match(/<stopse>/i)
          || text.match(/<SEの停止>/);
        var play_me = text.match(/<playme *: *([^ ].+)>/i)
          || text.match(/<MEの演奏 *: *([^ ].+)>/);
        var stop_me = text.match(/<stopme>/i)
          || text.match(/<playme *: *none>/i)
          || text.match(/<playme *: *なし>/i)
          || text.match(/<MEの停止>/);

        if(frame_param){
          printLog("  ", frame_param.parameters);
        }else{
          printLog("  ", 'nil');
        }

        // Plugin Command
        if(plugin_command){
          event_command_list.push(getPluginCommandEvent(plugin_command[1]));
          continue;
        }

        // Common Event
        if(common_event){
          var event_num = Number(common_event[1]);
          if(event_num){
            event_command_list.push(getCommonEventEvent(event_num));
          }else{
            throw new Error('Syntax error. / 文法エラーです。'
              + common_event[1] + ' is not number. / '
              + common_event[1] + 'は整数ではありません');
          }
          continue;
        }

        // Wait
        if(wait){
          var wait_num = Number(wait[1]);
          if(wait_num){
            event_command_list.push(getWaitEvent(wait_num));
          }else{
            throw new Error('Syntax error. / 文法エラーです。'
              + common_event[1] + ' is not number. / '
              + common_event[1] + 'は整数ではありません');
          }
          continue;
        }

        // Fadein
        if(fadein){
          event_command_list.push(getFadeinEvent());
          continue;
        }

        // Fadeout
        if(fadeout){
          event_command_list.push(getFadeoutEvent());
          continue;
        }

        // Stop BGM
        if(stop_bgm){
          event_command_list.push(getStopBgmEvent(90, 100, 0));
          continue;
        }

        // Play BGM
        if(play_bgm){
          if(play_bgm[1]){
            var params = play_bgm[1].replace(/ /g, '').split(',');
            var name = "Battle1";
            var volume = 90;
            var pitch = 100;
            var pan = 0;
            if(params[0]){
              name = params[0];
            }
            if(Number(params[1]) || Number(params[1]) == 0){
              volume = Number(params[1]);
            }
            if(Number(params[2]) || Number(params[2]) == 0){
              pitch = Number(params[2]);
            }
            if(Number(params[3]) || Number(params[3]) == 0){
              pan = Number(params[3]);
            }
            if(name.toUpperCase() === "NONE" || name === "なし"){
              event_command_list.push(getPlayBgmEvent("", volume, pitch, pan));
            }else{
              event_command_list.push(getPlayBgmEvent(name, volume, pitch, pan));
            }
          }
          continue;
        }

        // Fadeout BGM
        if(fadeout_bgm){
          if(fadeout_bgm[1]){
            var duration = 10;
            var d = fadeout_bgm[1].replace(/ /g, '');
            if(Number(d) || Number(d) == 0){
              duration = Number(d);
            }
            event_command_list.push(getFadeoutBgmEvent(duration));
          }
          continue;
        }

        // Save BGM
        if(save_bgm){
          event_command_list.push(getSaveBgmEvent());
          continue;
        }

        // Replay BGM
        if(replay_bgm){
          event_command_list.push(getReplayBgmEvent());
          continue;
        }

        // Change Battle BGM
        if(change_battle_bgm){
          if(change_battle_bgm[1]){
            var params = change_battle_bgm[1].replace(/ /g, '').split(',');
            var name = "Battle1";
            var volume = 90;
            var pitch = 100;
            var pan = 0;
            if(params[0]){
              name = params[0];
            }
            if(Number(params[1]) || Number(params[1]) == 0){
              volume = Number(params[1]);
            }
            if(Number(params[2]) || Number(params[2]) == 0){
              pitch = Number(params[2]);
            }
            if(Number(params[3]) || Number(params[3]) == 0){
              pan = Number(params[3]);
            }
            if(name.toUpperCase() === "NONE" || name === "なし"){
              event_command_list.push(getChangeBattleBgmEvent("", volume, pitch, pan));
            }else{
              event_command_list.push(getChangeBattleBgmEvent(name, volume, pitch, pan));
            }
          }
          continue;
        }

        // Stop BGS
        if(stop_bgs){
          event_command_list.push(getStopBgsEvent(90, 100, 0));
          continue;
        }

        // Play BGS
        if(play_bgs){
          if(play_bgs[1]){
            var params = play_bgs[1].replace(/ /g, '').split(',');
            var name = "City";
            var volume = 90;
            var pitch = 100;
            var pan = 0;
            if(params[0]){
              name = params[0];
            }
            if(Number(params[1]) || Number(params[1]) == 0){
              volume = Number(params[1]);
            }
            if(Number(params[2]) || Number(params[2]) == 0){
              pitch = Number(params[2]);
            }
            if(Number(params[3]) || Number(params[3]) == 0){
              pan = Number(params[3]);
            }
            if(name.toUpperCase() === "NONE" || name === "なし"){
              event_command_list.push(getPlayBgsEvent("", volume, pitch, pan));
            }else{
              event_command_list.push(getPlayBgsEvent(name, volume, pitch, pan));
            }
          }
          continue;
        }

        // Fadeout BGS
        if(fadeout_bgs){
          if(fadeout_bgs[1]){
            var duration = 10;
            var d = fadeout_bgs[1].replace(/ /g, '');
            if(Number(d) || Number(d) == 0){
              duration = Number(d);
            }
            event_command_list.push(getFadeoutBgsEvent(duration));
          }
          continue;
        }

        // Play SE
        if(play_se){
          if(play_se[1]){
            var params = play_se[1].replace(/ /g, '').split(',');
            var name = "Attack1";
            var volume = 90;
            var pitch = 100;
            var pan = 0;
            if(params[0]){
              name = params[0];
            }
            if(Number(params[1]) || Number(params[1]) == 0){
              volume = Number(params[1]);
            }
            if(Number(params[2]) || Number(params[2]) == 0){
              pitch = Number(params[2]);
            }
            if(Number(params[3]) || Number(params[3]) == 0){
              pan = Number(params[3]);
            }
            if(name.toUpperCase() === "NONE" || name === "なし"){
              event_command_list.push(getPlaySeEvent("", volume, pitch, pan));
            }else{
              event_command_list.push(getPlaySeEvent(name, volume, pitch, pan));
            }
          }
          continue;
        }

        // Stop SE
        if(stop_se){
          event_command_list.push(getStopSeEvent());
          continue;
        }

        // Stop ME
        if(stop_me){
          event_command_list.push(getStopMeEvent(90, 100, 0));
          continue;
        }

        // Play ME
        if(play_me){
          if(play_me[1]){
            var params = play_me[1].replace(/ /g, '').split(',');
            var name = "Curse1";
            var volume = 90;
            var pitch = 100;
            var pan = 0;
            if(params[0]){
              name = params[0];
            }
            if(Number(params[1]) || Number(params[1]) == 0){
              volume = Number(params[1]);
            }
            if(Number(params[2]) || Number(params[2]) == 0){
              pitch = Number(params[2]);
            }
            if(Number(params[3]) || Number(params[3]) == 0){
              pan = Number(params[3]);
            }
            if(name.toUpperCase() === "NONE" || name === "なし"){
              event_command_list.push(getPlayMeEvent("", volume, pitch, pan));
            }else{
              event_command_list.push(getPlayMeEvent(name, volume, pitch, pan));
            }
          }
          continue;
        }

        // Face
        if(face){
          if(!frame_param){
            var frame_param = getPretextEvent();
          }
          var actor_number = face[1].match(/(actor\d+)/i);
          var face_number = face[1].match(/actor\d\((.+?)\)/i);

          if(actor_number && face_number){
            frame_param.parameters[0] = actor_number[1];
            frame_param.parameters[1] = face_number[1];
            text = text.replace(face[0], '');
            printLog("  face set: " + frame_param.parameters[0] 
              + " : " + frame_param.parameters[1]);
            printLog("  [*]" + text);
          }else{
            console.error(text);
            throw new Error('Syntax error. / 文法エラーです。'
              + 'Please check line ' + (i+1) + '. / '
              + (i+1) + '行目付近を確認してください / '
              + text.replace(/</g, '  ').replace(/>/g, '  '));
          }
        }

        // window backgound
        if(background){
          if(!frame_param){
            var frame_param = getPretextEvent();
          }
          try{
            frame_param.parameters[2] = getBackground(background[1]);
          }catch(e){
            console.error(text);
            throw new Error('Syntax error. / 文法エラーです。'
              + 'Please check line ' + (i+1) + '. / '
              + (i+1) + '行目付近を確認してください / '
              + text.replace(/</g, '  ').replace(/>/g, '  '));
          }
          text = text.replace(background[0], '');
          printLog("  background set: " + frame_param.parameters[2]);
          printLog("  [*]" + text);
        }

        // window position
        if(window_position){
          if(!frame_param){
            var frame_param = getPretextEvent();
          }
          try{
            frame_param.parameters[3] = getWindowPosition(window_position[1]);
          }catch(e){
            console.error(text);
            throw new Error('Syntax error. / 文法エラーです。'
              + 'Please check line ' + (i+1) + '. / '
              + (i+1) + '行目付近を確認してください / '
              + text.replace(/</g, '  ').replace(/>/g, '  '));
          }
          text = text.replace(window_position[0], '');
          printLog("  window_position set: " + frame_param.parameters[3]);
          printLog("  [*]" + text);
        }

        if(Laurus.Text2Frame.IsDebug){
          printLog("  [!]" + text);
        }

        if(text){
          if(frame_param){
            event_command_list.push(frame_param);
            frame_param = null;
          }
          event_command_list.push(getTextFrameEvent(text));
        }
      }else{
        var frame_param = getPretextEvent();
      }
    }

    event_command_list.push(getCommandBottomEvent());

    switch (command.toUpperCase()) {
      case 'IMPORT_MESSAGE_TO_EVENT' :
      case 'メッセージをイベントにインポート' :
        var map_data = readMapData(('000' + Laurus.Text2Frame.MapID).slice(-3));
        if(! map_data.events[Laurus.Text2Frame.EventID]){
          throw new Error('EventID not found. / EventIDが見つかりません。\n' 
            + "Event ID: " + Laurus.Text2Frame.EventID);
        }

        var map_events = map_data.events[Laurus.Text2Frame.EventID].pages[0].list;
        if(Laurus.Text2Frame.IsOverwrite){
          map_events = [];
        }
        map_events.pop();
        map_events = map_events.concat(event_command_list);
        var filepath = base + '/data/Map' + ('000' + Laurus.Text2Frame.MapID).slice(-3) + ".json";
        map_data.events[Laurus.Text2Frame.EventID].pages[0].list = map_events;
        writeData(filepath, map_data);
        $gameMessage.add('Success / 書き出し成功！\n' 
          + "======> MapID: " + Laurus.Text2Frame.MapID + " -> EventID: " + Laurus.Text2Frame.EventID);
        break;
      case 'IMPORT_MESSAGE_TO_CE' :
      case 'メッセージをコモンイベントにインポート' :
        var ce_data = readCommonEventData();
        if(ce_data.length -1 < Laurus.Text2Frame.CommonEventID){
          throw new Error("Common Event not found. / コモンイベントが見つかりません。: " 
            + Laurus.Text2Frame.CommonEventID);
        }

        var ce_events = ce_data[Laurus.Text2Frame.CommonEventID].list;
        if(Laurus.Text2Frame.IsOverwrite){
          ce_events = [];
        }
        ce_events.pop();
        ce_data[Laurus.Text2Frame.CommonEventID].list = ce_events.concat(event_command_list);
        var filepath = base + '/data/CommonEvents.json';
        writeData(filepath, ce_data);
        $gameMessage.add('Success / 書き出し成功！\n' 
          + "=====> Common EventID :" + Laurus.Text2Frame.CommonEventID);
        break;
    }
    $gameMessage.add('\n');
    $gameMessage.add('Please restart RPG Maker MV(Editor) WITHOUT save. \n' + 
        '**セーブせずに**プロジェクトファイルを開き直してください');
    console.log('Please restart RPG Maker MV(Editor) WITHOUT save. \n' + 
        '**セーブせずに**プロジェクトファイルを開き直してください');
  };
})();

