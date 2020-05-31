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
 * for(let i = 0; i < 10; i++) {
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

/* global Game_Interpreter, $gameMessage, process, PluginManager */

var Laurus = Laurus || {};
Laurus.Text2Frame = {};

if(typeof PluginManager === 'undefined'){
  // for test
  /* eslint-disable no-global-assign */
  Game_Interpreter = {};
  Game_Interpreter.prototype = {};
  $gameMessage = {};
  $gameMessage.add = function(){};
  /* eslint-enable */
}

(function() {
  'use strict';
  const fs   = require('fs');
  const path = require('path');
  const PATH_SEP = path.sep;
  const BASE_PATH = path.dirname(process.mainModule.filename);

  if(typeof PluginManager === 'undefined'){
    Laurus.Text2Frame.WindowPosition = "Bottom";
    Laurus.Text2Frame.Background     = "Window";
    Laurus.Text2Frame.FileFolder     = "test";
    Laurus.Text2Frame.FileName       = "basic.txt";
    Laurus.Text2Frame.CommonEventID  = "1";
    Laurus.Text2Frame.MapID          = "1";
    Laurus.Text2Frame.EventID        = "1";
    Laurus.Text2Frame.IsOverwrite    = true;
    Laurus.Text2Frame.CommentOutChar = "%";
    Laurus.Text2Frame.IsDebug        = true;
  }else{
    // for default plugin command
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
    Laurus.Text2Frame.TextPath        = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
    Laurus.Text2Frame.MapPath         = `${BASE_PATH}${path.sep}data${path.sep}Map${('000' + Laurus.Text2Frame.MapID).slice(-3)}.json`;
    Laurus.Text2Frame.CommonEventPath = `${BASE_PATH}${path.sep}data${path.sep}CommonEvents.json`;
  }

  //=============================================================================
  // Game_Interpreter
  //=============================================================================
  const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.apply(this, arguments);
    this.pluginCommandText2Frame(command, args);
  };

  Game_Interpreter.prototype.pluginCommandText2Frame = function(command, args) {
    Laurus.Text2Frame.ExecMode = command.toUpperCase();
    switch (Laurus.Text2Frame.ExecMode) {
      // for custom plugin command
      case 'IMPORT_MESSAGE_TO_EVENT' :
      case 'メッセージをイベントにインポート' :
        if(args.length == 5){
          $gameMessage.add('import message to event. \n/ メッセージをイベントにインポートします。');
          Laurus.Text2Frame.ExecMode        = 'IMPORT_MESSAGE_TO_EVENT';
          Laurus.Text2Frame.FileFolder      = args[0];
          Laurus.Text2Frame.FileName        = args[1];
          Laurus.Text2Frame.MapID           = args[2];
          Laurus.Text2Frame.EventID         = args[3];
          Laurus.Text2Frame.IsOverwrite     = (args[4] == 'true') ? true : false;
          Laurus.Text2Frame.TextPath        = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
          Laurus.Text2Frame.MapPath         = `${BASE_PATH}${path.sep}data${path.sep}Map${('000' + Laurus.Text2Frame.MapID).slice(-3)}.json`;
        }
        break;
      case 'IMPORT_MESSAGE_TO_CE' :
      case 'メッセージをコモンイベントにインポート' :
        if(args.length == 4){
          $gameMessage.add('import message to common event. \n/ メッセージをコモンイベントにインポートします。');
          Laurus.Text2Frame.ExecMode        = 'IMPORT_MESSAGE_TO_CE';
          Laurus.Text2Frame.FileFolder      = args[0];
          Laurus.Text2Frame.FileName        = args[1];
          Laurus.Text2Frame.CommonEventID   = args[2];
          Laurus.Text2Frame.IsOverwrite     = (args[3] == 'true') ? true : false;
          Laurus.Text2Frame.TextPath        = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
          Laurus.Text2Frame.CommonEventPath = `${BASE_PATH}${path.sep}data${path.sep}CommonEvents.json`;
        }
        break;
      case 'COMMAND_LINE' :
        Laurus.Text2Frame.ExecMode = args[0];
        break;
      default:
        return;
    }

    const logger = {};
    logger.log = function(){
      if(Laurus.Text2Frame.IsDebug){
        console.debug.apply(console, arguments);
      }
    };

    logger.error = function(){
      console.error(Array.prototype.join.call(arguments));
    };

    const readText = function(filepath){
      try{
        return fs.readFileSync(filepath, {encoding: 'utf8'});
      }catch(e){
        throw new Error('File not found. / ファイルが見つかりません。\n' + filepath);
      }
    };

    const readJsonData = function(filepath){
      try{
        let jsondata = JSON.parse(readText(filepath));
        if(typeof(jsondata) == 'object'){
          return jsondata;
        }else{
          throw new Error('Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n' + filepath);
        }
      }catch(e){
        throw new Error('Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n' + filepath);
      }
    };

    const writeData = function(filepath, jsonData){
      try{
        fs.writeFileSync(filepath, JSON.stringify(jsonData, null, "  "), {encoding: 'utf8'});
      }catch(e){
        throw new Error('Save failed. / 保存に失敗しました。\n'
          + 'ファイルが開いていないか確認してください。\n' + filepath);
      }
    };


    /*************************************************************************************************************/
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
    };

    const getTextFrameEvent = function(text){
      return {"code": 401, "indent": 0, "parameters": [text]}
    };

    const getCommandBottomEvent = function(){
      return {"code":0,"indent":0,"parameters":[]};
    };

    const getScriptHeadEvent = function(text){
      let script_head = {"code": 355, "indent": 0, "parameters": [""]}
      script_head["parameters"][0] = text;
      return script_head;
    };
    const getScriptBodyEvent = function(text){
      let script_body = {"code": 655, "indent": 0, "parameters": [""]}
      script_body["parameters"][0] = text;
      return script_body;
    };
    
    const getPluginCommandEvent = function(text){
      let plugin_command = {"code": 356, "indent": 0, "parameters": [""]}
      plugin_command["parameters"][0] = text;
      return plugin_command;
    };
    
    const getCommonEventEvent = function(num){
      let common_event= {"code": 117, "indent": 0, "parameters": [""]}
      common_event["parameters"][0] = num;
      return common_event;
    };
    
    const getCommentOutHeadEvent = function(text){
      let comment_out= {"code": 108, "indent": 0, "parameters": [""]}
      comment_out["parameters"][0] = text;
      return comment_out;
    };
    const getCommentOutBodyEvent = function(text){
      let comment_out= {"code": 408, "indent": 0, "parameters": [""]}
      comment_out["parameters"][0] = text;
      return comment_out;
    };
    
    const getWaitEvent = function(num){
      let wait = {"code": 230, "indent": 0, "parameters": [""]}
      wait["parameters"][0] = num;
      return wait;
    };

    const getFadeinEvent = function(){
      return {"code": 222, "indent": 0, "parameters": []};
    };
    const getFadeoutEvent = function(){
      return {"code": 221, "indent": 0, "parameters": []};
    };

    const getPlayBgmEvent = function(name, volume, pitch, pan){
      let param_volume = 90;
      let param_pitch = 100;
      let param_pan = 0;

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
    };

    const getStopBgmEvent = function(volume, pitch, pan){
      return getPlayBgmEvent("", volume, pitch, pan);
    };

    const getFadeoutBgmEvent = function(duration){
      let param_duration = 10;
      if(typeof(duration) == "number"){
        param_duration = duration;
      }
      return {"code": 242, "indent": 0, "parameters": [param_duration]};
    };

    const getSaveBgmEvent = function(){
      return {"code": 243, "indent": 0, "parameters": []};
    };

    const getReplayBgmEvent = function(){
      return {"code": 244, "indent": 0, "parameters": []};
    };

    const getChangeBattleBgmEvent = function(name, volume, pitch, pan){
      let param_volume = 90;
      let param_pitch = 100;
      let param_pan = 0;

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
    };

    const getPlayBgsEvent = function(name, volume, pitch, pan){
      let param_volume = 90;
      let param_pitch = 100;
      let param_pan = 0;

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
    };

    const getStopBgsEvent = function(volume, pitch, pan){
      return getPlayBgsEvent("", volume, pitch, pan);
    };

    const getFadeoutBgsEvent = function(duration){
      let param_duration = 10;
      if(typeof(duration) == "number"){
        param_duration = duration;
      }
      return {"code": 246, "indent": 0, "parameters": [param_duration]};
    };

    const getPlaySeEvent = function(name, volume, pitch, pan){
      let param_volume = 90;
      let param_pitch = 100;
      let param_pan = 0;

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
    };
    const getStopSeEvent = function(){
      return {"code": 251, "indent": 0, "parameters": []};
    };

    const getPlayMeEvent = function(name, volume, pitch, pan){
      let param_volume = 90;
      let param_pitch = 100;
      let param_pan = 0;

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
    };

    const getStopMeEvent = function(volume, pitch, pan){
      return getPlayMeEvent("", volume, pitch, pan);
    };

    const getControlValiable = function(operation, start_pointer, end_pointer, operand, operand_arg1 = 0, operand_arg2 = 0, operand_arg3 = 0){
      let parameters = [start_pointer, end_pointer];
      switch(operation.toLowerCase()){
        case 'set':
          parameters.push(0);
          break;
        case 'add':
          parameters.push(1);
          break;
        case 'sub':
          parameters.push(2);
          break;
        case 'mul':
          parameters.push(3);
          break;
        case 'div':
          parameters.push(4);
          break;
        case 'mod':
          parameters.push(5);
          break;
        default:
          parameters.push(0);
          break;
      }
      switch(operand.toLowerCase()){
        case 'constant':
          parameters.push(0);
          parameters.push(operand_arg1);
          break;
        case 'variables':
          parameters.push(1);
          parameters.push(operand_arg1);
          break;
        case 'random':
          // operator, start_pointer, end_pointer, 'random', random_range1, random_range2
          parameters.push(2);
          parameters.push(parseInt(operand_arg1));
          parameters.push(parseInt(operand_arg2));
          break;
        case 'gamedata':{
          // operator, start_pointer, end_pointer, 'gamedata', 'item', arg1, arg2, arg3
          parameters.push(3);
          operand_arg1 = operand_arg1.toLowerCase();
          switch(operand_arg1){
            case 'item':
            case 'アイテム':
              parameters.push(0);
              parameters.push(parseInt(operand_arg2));
              parameters.push(0);
              break;
            case 'weapon':
            case '武器':
              parameters.push(1);
              parameters.push(parseInt(operand_arg2));
              parameters.push(0);
              break;
            case 'armor':
            case '防具':
              parameters.push(2);
              parameters.push(parseInt(operand_arg2));
              parameters.push(0);
              break;
            case 'actor':
            case 'アクター':
            case 'enemy':
            case 'エネミー':{
              if(operand_arg1 == 'actor' || operand_arg1 == 'アクター'){
                parameters.push(3);
              }else{
                parameters.push(4);
              }
              parameters.push(parseInt(operand_arg2));
              switch(operand_arg3.toLowerCase()){
                case 'level':
                case 'レベル':{
                  parameters.push(0);
                  break;
                }
                case 'exp':
                case '経験値':{
                  parameters.push(1);
                  break;
                }
                case 'hp':{
                  parameters.push(2);
                  break;
                }
                case 'mp':{
                  parameters.push(3);
                  break;
                }
                case 'maxhp':
                case '最大hp':{
                  parameters.push(4);
                  break;
                }
                case 'maxmp':
                case '最大mp':{
                  parameters.push(5);
                  break;
                }
                case 'attack':
                case '攻撃力':{
                  parameters.push(6);
                  break;
                }
                case 'defense':
                case '防御力':{
                  parameters.push(7);
                  break;
                }
                case 'm.attack':
                case '魔法攻撃力':{
                  parameters.push(8);
                  break;
                }
                case 'm.defense':
                case '魔法防御力':{
                  parameters.push(9);
                  break;
                }
                case 'agility':
                case '敏捷性':{
                  parameters.push(10);
                  break;
                }
                case 'luck':
                case '運':{
                  parameters.push(11);
                  break;
                }
                default:{
                  parameters.push(0);
                  break;
                }
              }
              if(operand_arg1 == 'enemy' || operand_arg1 == 'エネミー'){
                let value = parameters.pop();
                let key = parameters.pop();
                value = value - 2;
                key = key - 1;
                parameters.push(key);
                parameters.push(value);
              }
              break;
            }
            case 'character':
            case 'キャラクター':
              parameters.push(5);
              switch(operand_arg2.toLowerCase()){
                case 'player':
                case 'プレイヤー':
                case '-1':{
                  parameters.push(-1);
                  break;
                }
                case 'thisevent':
                case 'このイベント':
                case '0':{
                  parameters.push(0);
                  break;
                }
                default:{
                  parameters.push(parseInt(operand_arg2));
                  break;
                }
              }
              switch(operand_arg3.toLowerCase()){
                case 'mapx':
                case 'マップx':{
                  parameters.push(0);
                  break;
                }
                case 'mapy':
                case 'マップy':{
                  parameters.push(1);
                  break;
                }
                case 'direction':
                case '方向':{
                  parameters.push(2);
                  break;
                }
                case 'screenx':
                case '画面x':{
                  parameters.push(3);
                  break;
                }
                case 'screeny':
                case '画面y':{
                  parameters.push(4);
                  break;
                }
                default:{
                  parameters.push(0);
                  break;
                }
              }
              break;
            case 'party':
            case 'パーティ':
              parameters.push(6);
              parameters.push(parseInt(operand_arg2)-1);
              parameters.push(0);
              break;
            case 'other':
              parameters.push(7);
              switch(operand_arg2.toLowerCase()){
                case 'mapid':
                case 'マップid':{
                  parameters.push(0);
                  break;
                }
                case 'partymembers':
                case 'パーティ人数':{
                  parameters.push(1);
                  break;
                }
                case 'gold':
                case '所持金':{
                  parameters.push(2);
                  break;
                }
                case 'steps':
                case '歩数':{
                  parameters.push(3);
                  break;
                }
                case 'playtime':
                case 'プレイ時間':{
                  parameters.push(4);
                  break;
                }
                case 'timer':
                case 'タイマー':{
                  parameters.push(5);
                  break;
                }
                case 'savecount':
                case 'セーブ回数':{
                  parameters.push(6);
                  break;
                }
                case 'battlecount':
                case '戦闘回数':{
                  parameters.push(7);
                  break;
                }
                case 'wincount':
                case '勝利回数':{
                  parameters.push(8);
                  break;
                }
                case 'escapecount':
                case '逃走回数':{
                  parameters.push(9);
                  break;
                }
                default:{
                  parameters.push(parseInt(operand_arg2));
                  break;
                }
              }
              parameters.push(0);
              break;
          }
          break;
        }
        case 'script':{
          parameters.push(4);
          parameters.push(operand_arg1);
          break;
        }
        default:
          parameters.push(0);
          parameters.push(operand_arg1);
          parameters.push(operand_arg2);
          parameters.push(operand_arg3);
          break;
      }
      return {"code": 122, "indent": 0, "parameters": parameters};
    };

    /*************************************************************************************************************/
    let getBlockStatement = function(scenario_text, statement){
      let block_map = {};
      let block_count = 0;
      let re = null;
      let event_head_func = function(){};
      let event_body_func = function(){};
      if(statement == 'script'){
        re = /<script>([\s\S]*?)<\/script>|<sc>([\s\S]*?)<\/sc>|<スクリプト>([\s\S]*?)<\/スクリプト>/i;
        event_head_func = getScriptHeadEvent;
        event_body_func = getScriptBodyEvent;
      }else if(statement == 'comment'){
        re = /<comment>([\s\S]*?)<\/comment>|<co>([\s\S]*?)<\/co>|<注釈>([\s\S]*?)<\/注釈>/i;
        event_head_func = getCommentOutHeadEvent;
        event_body_func = getCommentOutBodyEvent;
      }

      let block = scenario_text.match(re);
      while(block !== null){
        let match_block = block[0];
        let match_text = block[1] || block[2] || block[3];
        scenario_text = scenario_text.replace(match_block, `\n#${statement.toUpperCase()}_BLOCK${block_count}#\n`);
        let match_text_list = match_text.replace(/\r/g,'').replace(/^\n/,'').replace(/\n$/,'').split('\n');
        let event_list = [];
        for(let i=0; i<match_text_list.length; i++){
          let text = match_text_list[i];
          if(i == 0){
            event_list.push(event_head_func(text));
          }else{
            event_list.push(event_body_func(text));
          }
        }
        block_map[`#${statement.toUpperCase()}_BLOCK${block_count}#`] = event_list;
        block = scenario_text.match(re);
        block_count++;
      }
      return {scenario_text, block_map};
    };

    let scenario_text = readText(Laurus.Text2Frame.TextPath);
    let block_map = {};
    {
      const t = getBlockStatement(scenario_text, 'script');
      scenario_text = t.scenario_text;
      block_map = Object.assign(block_map, t.block_map);
    }
    {
      const t = getBlockStatement(scenario_text, 'comment');
      scenario_text = t.scenario_text;
      block_map = Object.assign(block_map, t.block_map);
    }

    let text_lines = scenario_text.replace(/\r/g,'').split('\n');
    let event_command_list = [];
    let frame_param = getPretextEvent();
    logger.log("Default", frame_param.parameters);
    for(let i=0; i < text_lines.length; i++){
      let text = text_lines[i];

      logger.log(i, text);

      // Comment out
      if(Laurus.Text2Frame.CommentOutChar && text.match('^ *' + Laurus.Text2Frame.CommentOutChar)){
        continue;
      }


      if(text){
        let face = text.match(/<face *: *(.+?)>/i)
          || text.match(/<FC *: *(.+?)>/i)
          || text.match(/<顔 *: *(.+?)>/i);
        let window_position = text.match(/<windowposition *: *(.+?)>/i)
          || text.match(/<WP *: *(.+?)>/i)
          || text.match(/<位置 *: *(.+?)>/i);
        let background = text.match(/<background *: *(.+?)>/i)
          || text.match(/<BG *: *(.+?)>/i)
          || text.match(/<背景 *: *(.+?)>/i);
        let plugin_command = text.match(/<plugincommand *: *(.+?)>/i)
          || text.match(/<PC *: *(.+?)>/i)
          || text.match(/<プラグインコマンド *: *(.+?)>/i);
        let common_event = text.match(/<commonevent *: *(.+?)>/i)
          || text.match(/<CE *: *(.+?)>/i)
          || text.match(/<コモンイベント *: *(.+?)>/i);
        let wait = text.match(/<wait *: *(.+?)>/i)
          || text.match(/<ウェイト *: *(.+?)>/i);
        let fadein = text.match(/<fadein>/i)
          || text.match(/<FI>/i)
          || text.match(/<フェードイン>/i);
        let fadeout = text.match(/<fadeout>/i)
          || text.match(/<FO>/i)
          || text.match(/<フェードアウト>/i);
        let play_bgm = text.match(/<playbgm *: *([^ ].+)>/i)
          || text.match(/<BGMの演奏 *: *([^ ].+)>/);
        let stop_bgm = text.match(/<stopbgm>/i)
          || text.match(/<playbgm *: *none>/i)
          || text.match(/<playbgm *: *なし>/i)
          || text.match(/<BGMの停止>/);
        let fadeout_bgm = text.match(/<fadeoutbgm *: *(.+?)>/i)
          || text.match(/<BGMのフェードアウト *: *(.+?)>/);
        let save_bgm = text.match(/<savebgm>/i)
          || text.match(/<BGMの保存>/);
        let replay_bgm = text.match(/<replaybgm>/i)
          || text.match(/<BGMの再開>/);
        let change_battle_bgm = text.match(/<changebattlebgm *: *([^ ].+)>/i)
          || text.match(/<戦闘曲の変更 *: *([^ ].+)>/);
        let play_bgs = text.match(/<playbgs *: *([^ ].+)>/i)
          || text.match(/<BGSの演奏 *: *([^ ].+)>/);
        let stop_bgs = text.match(/<stopbgs>/i)
          || text.match(/<playbgs *: *none>/i)
          || text.match(/<playbgs *: *なし>/i)
          || text.match(/<BGSの停止>/);
        let fadeout_bgs = text.match(/<fadeoutbgs *: *(.+?)>/i)
          || text.match(/<BGSのフェードアウト *: *(.+?)>/);
        let play_se = text.match(/<playse *: *([^ ].+)>/i)
          || text.match(/<SEの演奏 *: *([^ ].+)>/);
        let stop_se = text.match(/<stopse>/i)
          || text.match(/<SEの停止>/);
        let play_me = text.match(/<playme *: *([^ ].+)>/i)
          || text.match(/<MEの演奏 *: *([^ ].+)>/);
        let stop_me = text.match(/<stopme>/i)
          || text.match(/<playme *: *none>/i)
          || text.match(/<playme *: *なし>/i)
          || text.match(/<MEの停止>/);

        const script_block = text.match(/#SCRIPT_BLOCK[0-9]+#/i);
        const comment_block = text.match(/#COMMENT_BLOCK[0-9]+#/i);

        // Script Block
        if(script_block){
          const block_tag = script_block[0];
          event_command_list = event_command_list.concat(block_map[block_tag]);
          continue;
        }

        // Comment Block
        if(comment_block){
          const block_tag = comment_block[0];
          event_command_list = event_command_list.concat(block_map[block_tag]);
          continue;
        }

        // Plugin Command
        if(plugin_command){
          event_command_list.push(getPluginCommandEvent(plugin_command[1]));
          continue;
        }

        // Common Event
        if(common_event){
          let event_num = Number(common_event[1]);
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
          let wait_num = Number(wait[1]);
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
            let params = play_bgm[1].replace(/ /g, '').split(',');
            let name = "Battle1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
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
            let duration = 10;
            let d = fadeout_bgm[1].replace(/ /g, '');
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
            let params = change_battle_bgm[1].replace(/ /g, '').split(',');
            let name = "Battle1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
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
            let params = play_bgs[1].replace(/ /g, '').split(',');
            let name = "City";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
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
            let duration = 10;
            let d = fadeout_bgs[1].replace(/ /g, '');
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
            let params = play_se[1].replace(/ /g, '').split(',');
            let name = "Attack1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
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
            let params = play_me[1].replace(/ /g, '').split(',');
            let name = "Curse1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
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

        /* eslint-disable no-useless-escape */
        const num_char_regex = '\\w\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf'
        //const control_variable_arg_regex = `[${num_char_regex}\\[\\]\\.\\-]+`;
        const control_variable_arg_regex = '.+';
        const set_operation_list = ['set', '代入', '='];
        const set_reg_list = set_operation_list.map(x => `<${x} *: *(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const set_range_reg_list = set_operation_list.map(x => `<${x} *: *(\\d+)\-(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const set = text.match(new RegExp(set_reg_list.join('|'), 'i'));
        const set_range = text.match(new RegExp(set_range_reg_list.join('|'), 'i'));

        const add_operation_list = ['add', '加算', '\\+'];
        const add_reg_list = add_operation_list.map(x => `<${x} *: *(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const add_range_reg_list = add_operation_list.map(x => `<${x} *: *(\\d+)\-(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const add = text.match(new RegExp(add_reg_list.join('|'), 'i'));
        const add_range = text.match(new RegExp(add_range_reg_list.join('|'), 'i'));

        const sub_operation_list = ['sub', '減算', '-'];
        const sub_reg_list = sub_operation_list.map(x => `<${x} *: *(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const sub_range_reg_list = sub_operation_list.map(x => `<${x} *: *(\\d+)\-(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const sub = text.match(new RegExp(sub_reg_list.join('|'), 'i'));
        const sub_range = text.match(new RegExp(sub_range_reg_list.join('|'), 'i'));

        const mul_operation_list = ['mul', '乗算', '\\*'];
        const mul_reg_list = mul_operation_list.map(x => `<${x} *: *(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const mul_range_reg_list = mul_operation_list.map(x => `<${x} *: *(\\d+)\-(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const mul = text.match(new RegExp(mul_reg_list.join('|'), 'i'));
        const mul_range = text.match(new RegExp(mul_range_reg_list.join('|'), 'i'));

        const div_operation_list = ['div', '除算', '\\/'];
        const div_reg_list = div_operation_list.map(x => `<${x} *: *(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const div_range_reg_list = div_operation_list.map(x => `<${x} *: *(\\d+)\-(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const div = text.match(new RegExp(div_reg_list.join('|'), 'i'));
        const div_range = text.match(new RegExp(div_range_reg_list.join('|'), 'i'));

        const mod_operation_list = ['mod', '剰余', '\\%'];
        const mod_reg_list = mod_operation_list.map(x => `<${x} *: *(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const mod_range_reg_list = mod_operation_list.map(x => `<${x} *: *(\\d+)\-(\\d+) *, *(${control_variable_arg_regex}) *>`)
        const mod = text.match(new RegExp(mod_reg_list.join('|'), 'i'));
        const mod_range = text.match(new RegExp(mod_range_reg_list.join('|'), 'i'));
        /* eslint-enable */

        const _wrapperGetControlValiable = function(operator, text_match, start_pointer, end_pointer, value){
          let value_num = Number(value);
          if(isNaN(value_num)){
            const variables = value.match(/v\[(\d+)\]|variables\[(\d+)\]|変数\[(\d+)\]/i);
            if(variables){
              const num = variables[1] || variables[2] || variables[3];
              return getControlValiable(operator, start_pointer, end_pointer, 'variables', parseInt(num));
            }
            const random = value.match(/r\[(\-?\d+)\]\[(\-?\d+)\]|random\[(\-?\d+)\]\[(\-?\d+)\]|乱数\[(\-?\d+)\]\[(\-?\d+)\]/i);
            if(random){
              const random_range1 = random[1] || random[3] || random[5];
              const random_range2 = random[2] || random[4] || random[6];
              return getControlValiable(operator, start_pointer, end_pointer, 'random', parseInt(random_range1), parseInt(random_range2));
            }
            const gamedata_operation_list = ['gd', 'gamedata', 'ゲームデータ'];
            const gamedata_reg_list = gamedata_operation_list.map(x => `(${x})(${control_variable_arg_regex})`)
            const gamedata = value.match(new RegExp(gamedata_reg_list.join('|'), 'i'))
            if(gamedata){
              const func = gamedata[2] || gamedata[4] || gamedata[6];
              const operand_match = func.match(new RegExp(`\\[([${num_char_regex}]+)\\]`, 'i'));
              if(operand_match){
                const operand = operand_match[1];
                switch(operand.toLowerCase()){
                  case 'mapid':
                  case 'マップid':
                  case 'partymembers':
                  case 'パーティ人数':
                  case 'gold':
                  case '所持金':
                  case 'steps':
                  case '歩数':
                  case 'playtime':
                  case 'プレイ時間':
                  case 'timer':
                  case 'タイマー':
                  case 'savecount':
                  case 'セーブ回数':
                  case 'battlecount':
                  case '戦闘回数':
                  case 'wincount':
                  case '勝利回数':
                  case 'escapecount':
                  case '逃走回数':{
                    return getControlValiable(operator, start_pointer, end_pointer, 'gamedata', 'other', operand.toLowerCase(), 0);
                  }

                  case 'item':
                  case 'アイテム':
                  case 'weapon':
                  case '武器':
                  case 'armor':
                  case '防具':
                  case 'party':
                  case 'パーティ':{
                    const args = func.match(new RegExp(`\\[[${num_char_regex}]+\\]\\[([${num_char_regex}]+)\\]`, 'i'));
                    if(args){
                      const arg1 = args[1];
                      return getControlValiable(operator, start_pointer, end_pointer, 'gamedata', operand.toLowerCase(), parseInt(arg1));
                    }
                    break;
                  }
                  case 'actor':
                  case 'アクター':
                  case 'enemy':
                  case 'エネミー':
                  case 'character':
                  case 'キャラクター':{
                    const args = func.match(new RegExp(`\\[[${num_char_regex}]+\\]\\[([${num_char_regex}\\-]+)\\]\\[([${num_char_regex}\\.]+)\\]`, 'i'));
                    if(args){
                      const arg1 = args[1];
                      const arg2 = args[2];
                      return getControlValiable(operator, start_pointer, end_pointer, 'gamedata', operand.toLowerCase(), arg1, arg2);
                    }
                    break;
                  }
                }
              }
            }
            const script = value.match(/sc\[(.+)\]|script\[(.+)\]|スクリプト\[(.+)\]/i);
            if(script){
              const script_body = script[1] || script[2] || script[3];
              return getControlValiable(operator, start_pointer, end_pointer, 'script', script_body);
            }
          }else{
            return getControlValiable(operator, start_pointer, end_pointer, 'constant', value_num);
          }
        }
        const wrapperGetControlValiable = function(operator, text_match){
          let pointer = text_match[1] || text_match[3] || text_match[5];
          let value = text_match[2] || text_match[4] || text_match[6];
          pointer = parseInt(pointer);
          return _wrapperGetControlValiable(operator, text_match, pointer, pointer, value);
        }
        const wrapperGetControlValiableRange = function(operator, text_match){
          let start_pointer = text_match[1] || text_match[4] || text_match[7];
          let end_pointer = text_match[2] || text_match[5] || text_match[8];
          let value = text_match[3] || text_match[6] || text_match[9];

          start_pointer = parseInt(start_pointer);
          end_pointer = parseInt(end_pointer);
          return _wrapperGetControlValiable(operator, text_match, start_pointer, end_pointer, value);
        }

        // set
        if(set){
          event_command_list.push(wrapperGetControlValiable('set', set));
          continue;
        }
        // set_range
        if(set_range){
          event_command_list.push(wrapperGetControlValiableRange('set', set_range));
          continue;
        }

        // add
        if(add){
          event_command_list.push(wrapperGetControlValiable('add', add));
          continue;
        }
        // add_range
        if(add_range){
          event_command_list.push(wrapperGetControlValiableRange('add', add_range));
          continue;
        }

        // sub
        if(sub){
          event_command_list.push(wrapperGetControlValiable('sub', sub));
          continue;
        }
        // sub_range
        if(sub_range){
          event_command_list.push(wrapperGetControlValiableRange('sub', sub_range));
          continue;
        }

        // mul
        if(mul){
          event_command_list.push(wrapperGetControlValiable('mul', mul));
          continue;
        }
        // mul_range
        if(mul_range){
          event_command_list.push(wrapperGetControlValiableRange('mul', mul_range));
          continue;
        }

        // div
        if(div){
          event_command_list.push(wrapperGetControlValiable('div', div));
          continue;
        }
        // div_range
        if(div_range){
          event_command_list.push(wrapperGetControlValiableRange('div', div_range));
          continue;
        }

        // mod
        if(mod){
          event_command_list.push(wrapperGetControlValiable('mod', mod));
          continue;
        }
        // mod_range
        if(mod_range){
          event_command_list.push(wrapperGetControlValiableRange('mod', mod_range));
          continue;
        }

        // Face
        if(face){
          if(!frame_param){
            frame_param = getPretextEvent();
          }
          let face_number = face[1].match(/.*\((.+?)\)/i);

          if(face_number){
            frame_param.parameters[0] = face[1].replace(/\(\d\)/,'');
            frame_param.parameters[1] = parseInt(face_number[1]);
            text = text.replace(face[0], '');
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
            frame_param = getPretextEvent();
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
        }

        // window position
        if(window_position){
          if(!frame_param){
            frame_param = getPretextEvent();
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
        }


        if(text){
          if(frame_param){
            logger.log("push: ", frame_param.parameters);
            event_command_list.push(frame_param);
            frame_param = null;
          }
          logger.log("push: ", text);
          event_command_list.push(getTextFrameEvent(text));
        }
      }else{
        frame_param = getPretextEvent();
      }
    }

    event_command_list.push(getCommandBottomEvent());

    switch (Laurus.Text2Frame.ExecMode) {
      case 'IMPORT_MESSAGE_TO_EVENT' :
      case 'メッセージをイベントにインポート' : {
        let map_data = readJsonData(Laurus.Text2Frame.MapPath);
        if(! map_data.events[Laurus.Text2Frame.EventID]){
          throw new Error('EventID not found. / EventIDが見つかりません。\n' 
            + "Event ID: " + Laurus.Text2Frame.EventID);
        }

        let map_events = map_data.events[Laurus.Text2Frame.EventID].pages[0].list;
        if(Laurus.Text2Frame.IsOverwrite){
          map_events = [];
        }
        map_events.pop();
        map_events = map_events.concat(event_command_list);
        map_data.events[Laurus.Text2Frame.EventID].pages[0].list = map_events;
        writeData(Laurus.Text2Frame.MapPath, map_data);
        $gameMessage.add('Success / 書き出し成功！\n' 
          + "======> MapID: " + Laurus.Text2Frame.MapID + " -> EventID: " + Laurus.Text2Frame.EventID);
        break;
      }
      case 'IMPORT_MESSAGE_TO_CE' :
      case 'メッセージをコモンイベントにインポート' : {
        const ce_data = readJsonData(Laurus.Text2Frame.CommonEventPath);
        if(ce_data.length -1 < Laurus.Text2Frame.CommonEventID){
          throw new Error("Common Event not found. / コモンイベントが見つかりません。: " 
            + Laurus.Text2Frame.CommonEventID);
        }

        let ce_events = ce_data[Laurus.Text2Frame.CommonEventID].list;
        if(Laurus.Text2Frame.IsOverwrite){
          ce_events = [];
        }
        ce_events.pop();
        ce_data[Laurus.Text2Frame.CommonEventID].list = ce_events.concat(event_command_list);
        writeData(Laurus.Text2Frame.CommonEventPath, ce_data);
        $gameMessage.add('Success / 書き出し成功！\n' 
          + "=====> Common EventID :" + Laurus.Text2Frame.CommonEventID);
        break;
      }
    }
    $gameMessage.add('\n');
    $gameMessage.add('Please restart RPG Maker MV(Editor) WITHOUT save. \n' + 
        '**セーブせずに**プロジェクトファイルを開き直してください');
    console.log('Please restart RPG Maker MV(Editor) WITHOUT save. \n' + 
        '**セーブせずに**プロジェクトファイルを開き直してください');
  };
})();


// developer mode
//
// $ node Text2Frame.js
if(typeof require.main !== 'undefined' && require.main === module) {
  let program = require('commander');
  program
    .version('0.0.1')
    .usage('[options]')
    .option('-m, --mode <map|common|test>', 'output mode', /^(map|common|test)$/i)
    .option('-t, --text_path <name>', 'text file path')
    .option('-o, --output_path <name>', 'output file path')
    .option('-e, --event_id <name>', 'event file id')
    .option('-c, --common_event_id <name>', 'common event id')
    .option('-w, --overwrite <true/false>', 'overwrite mode', 'false')
    .option('-v, --verbose', 'debug mode', false)
    .parse(process.argv);

  Laurus.Text2Frame.IsDebug  = program.verbose;
  Laurus.Text2Frame.TextPath = program.text_path;
  Laurus.Text2Frame.IsOverwrite = (program.overwrite == 'true') ? true : false;

  if (program.mode === 'map'){
    Laurus.Text2Frame.MapPath  = program.output_path;
    Laurus.Text2Frame.EventID  = program.event_id;
    Game_Interpreter.prototype.pluginCommandText2Frame('COMMAND_LINE', ['IMPORT_MESSAGE_TO_EVENT']);
  }else if (program.mode === 'common'){
    Laurus.Text2Frame.CommonEventPath = program.output_path;
    Laurus.Text2Frame.CommonEventID   = program.common_event_id;
    Game_Interpreter.prototype.pluginCommandText2Frame('COMMAND_LINE', ['IMPORT_MESSAGE_TO_CE']);
  }else if (program.mode === 'test'){
    const folder_name = 'test';
    const file_name   = 'basic.txt';
    const map_id      = '1';
    const event_id    = '1';
    const overwrite   = 'true';
    Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT',
      [folder_name, file_name, map_id, event_id, overwrite]);
  }else{
    console.log('===== Manual =====');
    console.log(`
    NAME
       Text2Frame - Simple compiler to convert text to event command.
    SYNOPSIS
        node Text2Frame.js
        node Text2Frame.js --verbose --mode map --text_path <text file path> --output_path <output file path> --event_id <event id> --overwrite <true|false>
        node Text2Frame.js --verbose --mode common --text_path <text file path> --common_event_id <common event id> --overwrite <true|false>
        node Text2Frame.js --verbose --mode test
    DESCRIPTION
        node Text2Frame.js
          テストモードです。test/basic.txtを読み込み、data/Map001.jsonに出力します。
        node Text2Frame.js --verbose --mode map --text_path <text file path> --output_path <output file path> --event_id <event id> --overwrite <true|false>
          マップへのイベント出力モードです。
          読み込むファイル、出力マップ、上書きの有無を引数で指定します。
          test/basic.txt を読み込み data/Map001.json に上書きするコマンド例は以下です。

          例1：$ node Text2Frame.js --mode map --text_path test/basic.txt --output_path data/Map001.json --event_id 1 --overwrite true
          例2：$ node Text2Frame.js -m map -t test/basic.txt -o data/Map001.json -e 1 -w true

        node Text2Frame.js --verbose --mode common --text_path <text file path> --common_event_id <common event id> --overwrite <true|false>
          コモンイベントへのイベント出力モードです。
          読み込むファイル、出力コモンイベント、上書きの有無を引数で指定します。
          test/basic.txt を読み込み data/CommonEvents.json に上書きするコマンド例は以下です。

          例1：$ node Text2Frame.js --mode common --text_path test/basic.txt --output_path data/CommonEvents.json --common_event_id 1 --overwrite true
          例2：$ node Text2Frame.js -m common -t test/basic.txt -o data/CommonEvents.json -c 1 -w true
    `);
  }
}
