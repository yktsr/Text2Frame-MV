//=============================================================================
// Text2Frame.js
// ----------------------------------------------------------------------------
// (C)2018-2023 Yuki Katsura
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 2.1.0 2023/03/24: タグ追加
// ・数値入力の処理タグ追加
// ・アイテム選択の処理タグ追加
// ・文章のスクロール表示タグ追加
// ・選択肢の表示タグ追加
// 2.0.1 2023/02/01: 不具合修正
// ・#83 変数やスイッチ操作タグを使用する際、操作の対象が1つだけのときかつ
//   操作対象が2桁以上の番号の場合、意図しない範囲指定の操作に変換される不具合の修正
// 2.0.0 2020/12/06: ツクールMZに対応
// ・ツクールMZ仕様のプラグインコマンドの定義
// ・取り込み先にページ番号を設定する機能の追加
// ・実行時のメッセージ表示ON・OFFを切り替えるプラグインオプションの追加
// ・MZ用のネームボックス機能の追加
// ・MZ用のピクチャ移動(イージング)の追加
// ・MZ用の変数操作(直前の情報)の追加
// ・MZ用の条件分岐条件(タッチ・マウス操作)の追加
// ・MZ用プラグインコマンドタグの追加
// ・日本語表現に誤りがあったので、正しいものを追加(エネミー->敵キャラ, スタート->始動, ストップ->停止)
// 1.4.1 2020/08/16: 文法エラー時に行数を表示する機能を削除
// 1.4.0 2020/08/14:
// ・条件分岐タグ追加
// ・ループタグ追加
// ・ループの中断タグ追加
// ・イベント処理の中断タグ追加
// ・ラベルの設定タグ追加
// ・ラベルジャンプタグ追加
// 1.3.0 2020/08/09:
// ・ピクチャの表示タグ追加
// ・ピクチャの移動タグ追加
// ・ピクチャの回転タグ追加
// ・ピクチャの色調変更タグ追加
// ・ピクチャの消去タグ追加
// 1.2.0 2020/06/15:
// ・スイッチの操作タグ追加
// ・変数の操作タグ追加
// ・セルフスイッチの操作タグ追加
// ・タイマーの操作タグ追加
// ・バグの修正
// ・ヘルプ文のレイアウト修正
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
 *: @target MZ
 * @plugindesc Simple compiler to convert text to event command.
 * @author Yuki Katsura, えーしゅん
 *
 * @command IMPORT_MESSAGE_TO_EVENT
 * @text Import message to event
 * @desc Import a message to the event. Specify the source file information and the map, event, page ID, etc. to be imported.
 *
 * @arg FileFolder
 * @text Scenario Folder Name
 * @desc Setting of the folder name which the text file is stored. Default is "text".
 * @type string
 * @default text
 *
 * @arg FileName
 * @text Scenario File Name
 * @desc setting of text file name. Default is "message.txt". 
 * @type string
 * @default message.txt
 *
 * @arg MapID
 * @text MapID
 * @desc Map ID of the output destination. Default is "1". It means that it is taken in the map ID 1.
 * @type number
 * @default 1
 *
 * @arg EventID
 * @text EventID
 * @desc setting of the eventID of the output destination. Default is "2". It means that it is taken in the event ID 2.
 * @type number
 * @default 2
 *
 * @arg PageID
 * @text PageID
 * @desc page ID of the output destination. Default is "1". It means that it is taken in the page ID 1.
 * @type number
 * @default 1
 *
 * @arg IsOverwrite
 * @text !!!Is overwrite!!!
 * @desc text is added to the end of event, this param can change it to overwrite. Default is false.
 * @default false
 * @type select
 * @option true(!!!overwrite!!!)
 * @value true
 * @option false(don't overwrite)
 * @value false
 * @default false
 *
 * @command IMPORT_MESSAGE_TO_CE
 * @text Import message to a common event.
 * @desc Import a message to a common event. Specify the source file information, the common event ID of the destination, etc.
 *
 * @arg FileFolder
 * @text Scenario Folder Name
 * @desc Setting of the folder name which the text file is stored. Default is "text".
 * @type string
 * @default text
 *
 * @arg FileName
 * @text Scenario File Name
 * @desc setting of text file name. Default is "message.txt". 
 * @type string
 * @default message.txt
 *
 * @arg CommonEventID
 * @text Common Event ID
 * @desc setting of the common event ID of the output destination. Default is "1". It means that it is taken in the common event 1.
 * @type common_event
 * @default 1
 *
 * @arg IsOverwrite
 * @text !!!Is overwrite!!!
 * @desc text is added to the end of event, this param can change it to overwrite. Default is false.
 * @default false
 * @type select
 * @option true(!!!overwrite!!!)
 * @value true
 * @option false(don't overwrite)
 * @value false
 * @default false
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
 * @desc Default setting of the eventID of the output destination. Default is "1". It means that it is taken in the event ID 2.
 * @default 2
 * @type number
 *
 * @param Default PageID
 * @text PageID
 * @desc page ID of the output destination. Default is "1". It means that it is taken in the page ID 1.
 * @default 1
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
 * @param DisplayMsg
 * @text DisplayMsg
 * @desc Display messages when execution.
 * @default true
 * @type boolean
 *
 * @param DisplayWarning
 * @text DisplayWarning
 * @desc Display warnings when execution.
 * @default true
 * @type boolean
 *
 * @help
 * Update Soon.
 * Please see wiki.
 * https://github.com/yktsr/Text2Frame-MV/wiki
 */

 /*:ja
 * @target MZ
 * @plugindesc テキストファイル(.txtファイルなど)から「文章の表示」イベントコマンドに簡単に変換するための、開発支援プラグインです。ツクールMV・MZの両方に対応しています。
 * @author Yuki Katsura, えーしゅん
 *
 * @command IMPORT_MESSAGE_TO_EVENT
 * @text イベントにインポート
 * @desc イベントにメッセージをインポートします。取り込み元ファイルの情報や、取り込み先のマップ・イベント・ページID等を指定します。
 *
 * @arg FileFolder
 * @text 取り込み元フォルダ名
 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。
 * @type string
 * @default text
 *
 * @arg FileName
 * @text 取り込み元ファイル名
 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。
 * @type string
 * @default message.txt
 *
 * @arg MapID
 * @text 取り込み先マップID
 * @desc 取り込み先となるマップのIDを設定します。デフォルト値は1です。
 * @type number
 * @default 1
 *
 * @arg EventID
 * @text 取り込み先イベントID
 * @desc 取り込み先となるイベントのIDを設定します。デフォルト値は2です。
 * @type number
 * @default 2
 *
 * @arg PageID
 * @text 取り込み先ページID
 * @desc 取り込み先となるページのIDを設定します。デフォルト値は1です。
 * @type number
 * @default 1
 *
 * @arg IsOverwrite
 * @text 【取り扱い注意】上書きする
 * @desc 通常イベントの末尾に追加しますが、上書きに変更できます。trueのとき上書きです。デフォルト値はfalseです。
 * @type select
 * @option true(!!!上書きする!!!)
 * @value true
 * @option false(上書きしない)
 * @value false
 * @default false
 *
 * @command IMPORT_MESSAGE_TO_CE
 * @text コモンイベントにインポート
 * @desc コモンイベントにメッセージをインポートします。取り込み元ファイルの情報や、取り込み先のコモンイベントID等を指定します。
 *
 * @arg FileFolder
 * @text 取り込み元フォルダ名
 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。
 * @type string
 * @default text
 *
 * @arg FileName
 * @text 取り込み元ファイル名
 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。
 * @type string
 * @default message.txt
 *
 * @arg CommonEventID
 * @text 取り込み先コモンイベントID
 * @desc 出力先のコモンイベントIDを設定します。デフォルト値は1です。
 * @type common_event
 * @default 1
 *
 * @arg IsOverwrite
 * @text 【取り扱い注意】上書きする
 * @desc 通常イベントの末尾に追加しますが、上書きに変更できます。trueのとき上書きです。デフォルト値はfalseです。
 * @type select
 * @option true(!!!上書きする!!!)
 * @value true
 * @option false(上書きしない)
 * @value false
 * @default false
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
 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。(MZでは無視されます)
 * @default text
 * @require 1
 * @dir text
 * @type string
 *
 * @param Default Scenario File
 * @text 取り込み元ファイル名
 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。(MZでは無視されます)
 * @default message.txt
 * @require 1
 * @dir text
 * @type string
 *
 * @param Default Common Event ID
 * @text 取り込み先コモンイベントID
 * @desc 出力先のコモンイベントIDを設定します。デフォルト値は1です。(MZでは無視されます)
 * @default 1
 * @type common_event
 *
 * @param Default MapID
 * @text 取り込み先マップID
 * @desc 取り込み先となるマップのIDを設定します。デフォルト値は1です。(MZでは無視されます)
 * @default 1
 * @type number
 *
 * @param Default EventID
 * @text 取り込み先イベントID
 * @desc 取り込み先となるイベントのIDを設定します。デフォルト値は2です。(MZでは無視されます)
 * @default 2
 * @type number
 *
 * @param Default PageID
 * @text 取り込み先ページID
 * @desc 取り込み先となるページのIDを設定します。デフォルト値は1です。(MZでは無視されます)
 * @default 1
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
 * @param DisplayMsg
 * @text メッセージ表示
 * @desc 実行時に通常メッセージを表示します。OFFで警告以外のメッセージが表示されなくなります。デフォルト値はtrueです。
 * @default true
 * @type boolean
 *
 * @param DisplayWarning
 * @text 警告文表示
 * @desc 実行時に警告を表示します。OFFで警告が表示されなくなります。デフォルト値はtrueです。
 * @default true
 * @type boolean
 *
 * @help
 * 本プラグインはテキストファイル(.txtファイルなど)から「文章の表示」イベント
 * コマンドに簡単に変換するための、開発支援プラグインです。キャラクター同士の
 * 会話などをツクールMV・MZ**以外**のエディタで編集して、後でイベントコマンド
 * として組み込みたい人をサポートします。
 *
 * 所定のプラグインコマンド（後述）を実行することにより、テキストファイルを読
 * み込み、ツクールMV・MZのマップイベントまたはコモンイベントにイベントコマン
 * ドとして取り込むことができます。
 *
 * テストプレイおよびイベントテスト（イベントエディタ上で右クリック→テスト）
 * から実行することを想定しています。
 *
 * また、追加機能としてフェードインやBGM再生等のイベントコマンドも組み込むこ
 * とができます。追加機能の詳細はこのREADMEの下部に記載していますので、そちら
 * をご覧ください
 *
 * なお、以下のヘルプ文の内容は本プラグインのWikiにも記載しています。
 *
 *     https://github.com/yktsr/Text2Frame-MV/wiki
 *
 * Wikiのほうが閲覧しやすいと思いますので、RPGツクールMV・MZ上では読みづらい
 * と感じた場合は、こちらをご覧ください。
 *
 *
 * -------------------------------------
 * ツクールMVでの実行方法
 * --------------------------------------
 * 1. dataフォルダのバックアップをとっておく。(重要)
 *
 * 2. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
 *
 * 3. 作成したフォルダに読み込みたいテキストファイルを保存する。
 *
 * 4. 任意のマップ・位置に空のイベントをひとつ作成します。
 *     この時マップID, イベントID, ページIDをメモしておきましょう。
 *     マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの
 *    左上に記載されています。
 *     イベントIDはイベントをダブルクリックして出るイベントエディターの左上に
 *    記載されています。
 *     ページIDはイベントエディターのイベントの名前の下に記載されています。
 *
 * 5. プラグインの管理画面から本プラグインのパラメータを下記の通り編集します。
 *  ・「取り込み元フォルダ名」に2.で作成したフォルダのフォルダ名を入力。
 *      (デフォルトはtextです)
 *  ・「取り込み元ファイル名」に3.で保存したファイルのファイル名を入力。
 *      (デフォルトはmessage.txtです)
 *  ・「取り込み先マップID」に4.でメモしたマップIDを入力。
 *      (デフォルトは1です)
 *  ・「取り込み先イベントID」に4.でメモしたイベントIDを入力。
 *      (デフォルトは2です)
 *  ・「取り込み先ページID」に4.でメモしたページIDを入力。
 *      (デフォルトで1です)
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
 *      デフォルトの場合はtextフォルダのmessage.txtの内容を
 *     IDが1のマップの、IDが1のイベントの、IDが1のページに書き出したことに
 *     なります。
 *
 * -------------------------------------
 * ツクールMZでの実行方法
 * --------------------------------------
 * 1. dataフォルダのバックアップをとっておく。(重要)
 *
 * 2. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
 *
 * 3. 作成したフォルダに読み込みたいテキストファイルを保存する。
 *
 * 4. 任意のマップ・位置に空のイベントをひとつ作成します。
 *     この時マップID, イベントID, ページIDをメモしておきましょう。
 *     マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの
 *    左上に記載されています。
 *     イベントIDはイベントをダブルクリックして出るイベントエディターの左上に
 *    記載されています。
 *     ページIDはイベントエディターのイベントの名前の下に記載されています。
 *
 * 5. 以下の手順でプラグインコマンドを作成する。
 *  ・ プラグイン名「Text2Frame」のコマンド「イベントにインポート」を選択
 *  ・引数を下記のように設定する。
 *   -「取り込み元フォルダ名」に2.で作成したフォルダのフォルダ名を入力。
 *       (デフォルトはtextです)
 *   -「取り込み元ファイル名」に3.で保存したファイルのファイル名を入力。
 *       (デフォルトはmessage.txtです)
 *   -「取り込み先マップID」に4.でメモしたマップIDを入力。
 *       (デフォルトは1です)
 *   -「取り込み先イベントID」に4.でメモしたイベントIDを入力。
 *       (デフォルトは2です)
 *   -「取り込み先ページID」に4.でメモしたページIDを入力。
 *       (デフォルトで1です)
 *
 * 6. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
 *     実行前に本プラグインを管理画面からONにして「プロジェクトの保存」を
 *    実行しておきましょう。
 *
 * 7. **セーブせずに**リロードする、もしくはプロジェクトを開き直す。
 *     成功していれば、7.で設定したマップのイベントの中に「文章の表示」
 *    イベントコマンドとして書きだされています。
 *     デフォルトの場合はtextフォルダのmessage.txtの内容を
 *    IDが1のマップの、IDが1のイベントの、IDが1のページに書き出したことに
 *    なります。
 *
 *
 * --------------------------------------
 * テキストファイルの書き方
 * --------------------------------------
 * ◆ 基本となる書き方
 *  １つのメッセージを改行で区切るという書き方をします。
 *  例えば以下の通りです。
 *
 * ↓↓↓↓↓ここから例文1↓↓↓↓↓
 * やめて！ラーの翼神竜の特殊能力で、
 * ギルフォード・ザ・ライトニングを焼き払われたら、
 * 闇のゲームでモンスターと繋がってる城之内の精神まで燃え尽きちゃう！
 *
 * お願い、死なないで城之内！あんたが今ここで倒れたら、
 * 舞さんや遊戯との約束はどうなっちゃうの？
 * ライフはまだ残ってる。
 * ここを耐えれば、マリクに勝てるんだから！
 *
 * 次回、「城之内死す」。デュエルスタンバイ！
 * ↑↑↑↑↑ここまで例文1↑↑↑↑↑
 *
 *  この場合は３つの「文章の表示」イベントコマンドに変換されて
 *  取り込まれます。改行は何行いれても同様の動作になります。
 *  以上の方法で実行した場合、
 *  メッセージウィンドウの「背景」「ウィンドウ位置」については
 *  プラグインパラメータの「位置のデフォルト値」「背景のデフォルト値」の
 *  値が反映されます。
 *
 * ◆ タグについて
 *  Text2Frameは文章を単純に組み込むだけでなく、タグを挿入することでより柔軟な
 *  設定を可能としています。例えば、メッセージの顔・背景・ウィンドウの位置変更
 *  や名前の設定(MZ限定)、メッセージ以外のイベントコマンドを挿入することが可能
 *  です。各タグについては以降の説明をご覧ください。
 *
 *  タグについては以下の特徴があります。
 *  ・タグや値の大文字小文字は区別されません。(ファイル名の指定は除く)
 *     （例：FaceとFACEは同じ動作です）
 *  ・タグは同じ行に複数個配置することができます。
 *     （例：<顔: Actor1(0)><位置: 上><背景: 暗く>
 *  ・基本は英語で指定ですが、省略形や日本語で指定可能な場合もある。
 *
 * ◆ 顔・背景・ウィンドウ位置・名前の設定について
 *  それぞれのメッセージの「顔」「背景」「ウィンドウ位置」「名前」については、
 *  メッセージの手前にタグを記述することで指定することができます。
 *  上述の例のように指定しない場合は、パラメータで設定したものが適用されます。
 *
 *  例えば以下の通りです。
 *
 * ↓↓↓↓↓ここから例文2↓↓↓↓↓
 * <Face: Actor1(0)><WindowPosition: Bottom><Background: Dim><Name: 真崎杏子>
 * やめて！ラーの翼神竜の特殊能力で、
 * ギルフォード・ザ・ライトニングを焼き払われたら、
 * 闇のゲームでモンスターと繋がってる城之内の精神まで燃え尽きちゃう！
 *
 * <WindowPosition: Top><Name: 真崎杏子>
 * お願い、死なないで城之内！あんたが今ここで倒れたら、
 * 舞さんや遊戯との約束はどうなっちゃうの？
 * ライフはまだ残ってる。
 * ここを耐えれば、マリクに勝てるんだから！
 *
 * 次回、「城之内死す」。デュエルスタンバイ！
 * ↑↑↑↑↑ここまで例文2↑↑↑↑↑
 *
 *  この例の場合では、
 *  1つ目のメッセージ(やめて！〜)ではActor1ファイルの場所が1の顔が表示(詳細は後
 *  述)され、位置は下、背景が暗いメッセージウィンドウになります。名前は「真崎杏
 *  子」と表示されます。
 *
 *  2つ目のメッセージ(お願い、〜)は、位置が上であることと名前だけ指定されてい
 *  ます。指定されなかった他の顔や背景はプラグインのパラメータで設定されている
 *  ものが適用されます。ここでも名前は「真崎杏子」と表示されます。
 *
 *  3つめのメッセージ(次回、〜)は、何も指定されていません。
 *  そのため、例文1と同様にプラグインのパラメータで設定されているものが適用され
 *  ます。ここでは名前は表示されません。
 *
 *  タグの詳細は下記をご覧ください。
 *
 *  ○ 顔の指定方法
 *   <Face: ファイル名(顔の指定番号)>
 *   <FC: ファイル名(顔の指定番号)>
 *   <顔: ファイル名(顔の指定番号)>
 *
 *   の３つのうちいずれかの記法で指定します。
 *   ファイル名はimg/facesのフォルダ内のものを参照します。
 *   顔の指定番号は、ファイルの中で参照する位置を指定します。
 *   番号の法則はツクールMV・MZの仕様に準拠します。最も左上が0,右下が7です。
 *
 *  ○ 位置の指定方法
 *   <WindowPosition: 表示したい位置>
 *   <WP: 表示したい位置>
 *   <位置: 表示したい位置>
 *
 *   の３つのうちいずれかの記法で指定します。
 *   表示したい位置に記述できるのは以下の3種類です。
 *   ・Top      # 上
 *   ・Middle   # 中
 *   ・Bottom   # 下
 *   Topは「上」、Middleは「中」、Bottomは「下」となります。
 *   それぞれ大文字小文字を区別しません。つまりTOP,top,toPなどはTopと同じです。
 *   また、英語ではなく<WindowPosition: 上>のように日本語指定もできます。
 *
 *  ○ 背景の設定方法
 *   <Background: 背景の指定>
 *   <BG: 背景の指定>
 *   <背景: 背景の指定>
 *
 *   の３つのうちいずれかの記法で指定します。
 *   背景の指定に記述できるのは、以下の3種類です。
 *   ・Window        # ウィンドウ
 *   ・Dim           # 暗くする
 *   ・Transparent   # 透明
 *   Windowは「ウィンドウ」,Dimは「暗くする」,Transparentは「透明」となります。
 *   それぞれ大文字小文字を区別しません。
 *   また、英語ではなくて<Background: ウィンドウ>のように日本語指定もできます。
 *
 *  ○ 名前の設定方法【MZ用】
 *  メッセージウィンドウへの名前の設定は
 *   <Name: 設定する名前>
 *   <NM: 設定する名前>
 *   <名前: 設定する名前>
 *
 *   の３つのうちいずれかの記法で指定します。
 *   例えば、<Name: リード>と設定することで、名前欄に「リード」と設定できます。
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
 *  なお、コメントアウト記号はプラグインパラメータから自由に変更可能です。
 *  「%」はあくまでデフォルト値です。
 *
 *
 * --------------------------------------
 * コモンイベントへの書き出し
 * --------------------------------------
 * マップのイベントではなくコモンイベントに取り込むことも可能です。
 * ◆ ツクールMVの場合
 *  以下のプラグインコマンドのうちいずれかを使用してください。
 *    IMPORT_MESSAGE_TO_CE
 *    メッセージをコモンイベントにインポート
 *  これらは全く同じ機能なのでどちらを使ってもかまいません。
 *  取り込む先のコモンイベントのIDはプラグインパラメータの
 *  「取り込み先コモンイベントID」で指定できます。
 *
 * ◆ ツクールMZの場合
 *   プラグインコマンドからプラグイン名「Text2Frame」のコマンド
 *  「コモンイベントにインポート」を選択してください。
 *   フォルダ名・ファイル名・取り込み先のコモンイベントIDを引数から
 *  入力してください。
 *
 *
 * --------------------------------------
 * ツクールMVでのプラグインコマンドの引数
 * --------------------------------------
 * ツクールMVでのプラグインコマンドに引数を設定することにより、プラグインパラ
 * メータで指定したテキストファイルやマップIDとは違うパラメータで実行ができま
 * す。
 *
 * 例1:text/message.txtをマップIDが1, イベントIDが2, ページIDが3で上書きせず
 *     に取り込む。
 *   IMPORT_MESSAGE_TO_EVENT text message.txt 1 2 3 false
 *   メッセージをイベントにインポート text message.txt 1 2 3 false
 *
 * 例2:text/message.txtをIDが3のコモンイベントに上書きしてに取り込む。
 *   IMPORT_MESSAGE_TO_CE text message.txt 3 true
 *   メッセージをコモンイベントにインポート text message.txt 3 true
 *
 * ◆ 旧版のプラグインコマンドの引数(非推奨)
 *  最新版(ツクールMZ対応後,ver2.0.0)と旧版(ツクールMZ対応前,ver1.4.1)では、
 *  イベントへのインポートにおいて仕様が異なります。
 *  以下の旧仕様でも実行は可能ですが、非推奨となっております。
 *
 *  例:text/message.txtをマップIDが1, イベントIDが2, ページIDが3で上書きせず
 *     に取り込む(ページIDは1として)。
 *    IMPORT_MESSAGE_TO_EVENT text message.txt 1 2 false
 *    メッセージをイベントにインポート text message.txt 1 2 false
 *
 *  旧版ではページIDの指定ができず、必ず1となっていました。
 *
 *
 * --------------------------------------
 * 追加機能(その他イベントコマンドの組み込み)
 * --------------------------------------
 * メッセージだけでなく、指定の記法を用いることでいくつかのイベントコマンドを
 * 組み込むこともできます。
 * 例えば、
 *
 * ↓↓↓↓↓ここから例文4↓↓↓↓↓
 * <=: 1, 2>
 * <CommonEvent: 3>
 * 今日も一日がんばるぞい！
 * ↑↑↑↑↑ここまで例文4↑↑↑↑↑
 *
 * とすることで、「今日も一日がんばるぞい！」というメッセージの前に、
 * 「変数の操作(変数1に定数2を代入する)」と「コモンイベント(ID3)」のイベント
 * コマンドが組み込まれます。
 *
 * 現在対応しているコマンドは以下のとおりです。
 * - (1) 選択肢の表示
 * - (2) 数値入力の処理
 * - (3) アイテム選択の処理
 * - (4) 文章のスクロール表示
 * - (5) スイッチの操作
 * - (6) 変数の操作
 * - (7) セルフスイッチの操作
 * - (8) タイマーの操作
 * - (9) 条件分岐
 * - (10) ループ
 * - (11) ループの中断
 * - (12) イベント処理の中断
 * - (13) コモンイベント
 * - (14) ラベル
 * - (15) ラベルジャンプ
 * - (16) 注釈
 * - (17) ピクチャの表示
 * - (18) ピクチャの移動
 * - (19) ピクチャの回転
 * - (20) ピクチャの色調変更
 * - (21) ピクチャの消去
 * - (22) ウェイト
 * - (23) 画面のフェードアウト
 * - (24) 画面のフェードイン
 * - (25) BGMの演奏
 * - (26) BGMのフェードアウト
 * - (27) BGMの保存
 * - (28) BGMの再開
 * - (29) BGSの演奏
 * - (30) BGSのフェードアウト
 * - (31) MEの演奏
 * - (32) SEの演奏
 * - (33) SEの停止
 * - (34) 戦闘BGMの変更
 * - (35) スクリプト
 * - (36)-1 プラグインコマンド(ツクールMV)
 * - (36)-2 プラグインコマンド(ツクールMZ, 上級者向け)
 *
 * ○  (1) 選択肢の表示
 * 「選択肢の表示」は以下の記法で組み込むことができます。
 *  ---
 *  <ShowChoices: 背景, ウィンドウ位置, デフォルト, キャンセル>
 *  <When: 選択肢1の文>
 *  選択肢1を選んだ時の処理
 *  <When: 選択肢2の文>
 *  選択肢2を選んだ時の処理
 *  .
 *  .
 *  .
 *  <When: 選択肢6の文>
 *  選択肢6を選んだ時の処理
 *  <WhenCancel>
 *  選択肢をキャンセルした時の処理
 *  <End>
 *  ---
 *  必須の引数はありません。
 *  全ての引数はオプションとして設定でき、指定しない場合はデフォルト値が
 *  設定されます。
 *  引数を設定しない場合、"<ShowChoices>"か"<ShowChoices: >"でも記述できます。
 *  "<When>"が上から順に選択肢1, 選択肢2と対応しています。
 *
 *  "ShowChoices"は"選択肢の表示"か"SHC"で代替できます。
 *  また、"When"は"選択肢"で、"End"は"分岐終了"で、
 *  "WhenCancel"は"キャンセルのとき"で代替できます。
 *
 *  引数(オプション)の指定方法を述べる前に、いくつか具体例を示します。
 *  例1: 以下の設定で、選択肢を2つ表示する場合
 *   - 背景: ウィンドウ
 *   - ウィンドウ位置: 右
 *   - デフォルト: 選択肢 ＃1
 *   - キャンセル: 選択肢 ＃2
 *  ---
 * 長老に会って挨拶は済ませてきたかい？
 * <ShowChoices: Window, Right, 1, 2>
 * <When: はい>
 * そうか。それならよかった。
 * 早速長老の依頼のとおり、北に向かってくれないかい。
 * <When: いいえ>
 * それはいけない。
 * 長老は君のような若者を探しているんだ。
 * 挨拶に行って話を聞いてくれないかい。
 * <End>
 *  ---
 *
 *  また、例1の引数は全てデフォルト値なので、以下のようにも記述できます。
 *  2行目だけ異なります。
 *  ---
 * 長老に会って挨拶は済ませてきたかい？
 * <ShowChoices>
 * <When: はい>
 * そうか。それならよかった。
 * 早速長老の依頼のとおり、北に向かってくれないかい。
 * <When: いいえ>
 * それはいけない。
 * 長老は君のような若者を探しているんだ。
 * 挨拶に行って話を聞いてくれないかい。
 * <End>
 *  ---
 *
 *  例2: 以下の設定で、選択肢を3つ表示する場合
 *   - 背景: 透明
 *   - ウィンドウ位置: 真ん中
 *   - デフォルト: 選択肢 ＃1
 *   - キャンセル: 分岐
 *  ---
 * 他にも話したいことがあるんだ。
 * 何が聞きたい？
 * <ShowChoices: Transparent, Middle, 1, Branch>
 * <When: 勇者ノーゼンの伝説>
 * 勇者ノーゼンは〜〜（省略
 * <When: 魔王に挑む冒険者の現状>
 * 魔王に挑む冒険者は〜〜（省略
 * <When: 魔王について判明している点>
 * 魔王について判明している点は〜〜（省略
 * <WhenCancel>
 * ・・・え、僕の話、長すぎた？ごめんごめん。
 * <End>
 *  ---
 *
 *  それぞれの引数に設定できる項目は以下の通りです。
 *  ツクールの選択肢に対応しています。
 *  ・ 背景は以下のリストから指定します。
 *    - ウィンドウ: "Window" or "ウィンドウ"
 *    - 暗くする: "Dim" or "暗くする"
 *    - 透明: "Transparent" or "透明"
 *  ・ ウィンドウ位置は以下のリストから指定します。
 *    - 左: "Left" or "左"
 *    - 中: "Middle" or "中"
 *    - 右: "Right" or "右"
 *  ・ デフォルトは以下のリストから指定します。
 *    - なし: "None" or "なし"
 *    - 選択肢 ＃1: "1"
 *    - 選択肢 ＃2: "2"
 *    - ...
 *    - 選択肢 ＃6: "6"
 *  ・ キャンセルは以下のリストから指定します。
 *    - 分岐: "Branch" or "分岐"
 *    - 禁止: "Disallow" or "禁止"
 *    - 選択肢 ＃1: "1"
 *    - 選択肢 ＃2: "2"
 *    - ...
 *    - 選択肢 ＃6: "6"
 *
 *
 * ○  (2) 数値入力の処理
 *  「数値入力の処理」は以下のいずれかの記法で組み込むことができます。
 *   <InputNumber: 変数番号, 桁数>
 *   <INN: 変数番号, 桁数>
 *   <数値入力の処理: 変数番号, 桁数>
 *
 *  例えば、以下の通りです。
 *  ・例: 変数1に桁数2で数値入力する。
 *   <InputNumber: 1, 2>
 *   <INN: 1, 2>
 *   <数値入力の処理: 1, 2>
 *
 *
 * ○  (3) アイテム選択の処理
 * 「アイテム選択の処理」は以下のいずれかの記法で組み込むことができます。
 *   <SelectItem: 変数番号, アイテムタイプ>
 *   <SI: 変数番号, アイテムタイプ>
 *   <アイテム選択の処理: 変数番号, アイテムタイプ>
 *
 *  アイテムタイプを指定するための項目は以下の通りです。
 *   - 通常アイテム: "Regular Item", "通常アイテム"
 *   - 大事なもの: "Key Item", "大事なもの"
 *   - 隠しアイテムA: "Hidden Item A", "隠しアイテムA"
 *   - 隠しアイテムB: "Hidden Item B", "隠しアイテムB"
 *
 *  なお、アイテムタイプの大文字小文字は問いません。
 *  例えば、"Regular Item"は"regular item"と指定しても、
 *  "REGULAR ITEM"と指定しても大丈夫です。
 *
 *  アイテム選択の処理の具体例は、以下の通りです。
 *  例1: 通常アイテムの一覧を表示し、
 *       選択されたアイテムのIDを変数1に代入する。
 *   <SelectItem: 1, Regular Item>
 *   <SI: 1, REGULAR ITEM>
 *   <アイテム選択の処理: 1, 通常アイテム>
 *
 *  例2: 隠しアイテムAの一覧を表示し、
 *       選択されたアイテムのIDを変数20に代入する。
 *   <SelectItem: 20, Hidden Item A>
 *   <SI: 20, hidden item A>
 *   <アイテム選択の処理: 20, 隠しアイテムA>
 *
 *
 * ○  (4) 文章のスクロール表示
 * 「文章のスクロール表示」は、以下のように二つのタグで挟み込み指定します。
 *  ---
 *  <ShowScrollingText: 速度(整数), 早送りなしフラグ("ON" or "OFF")>
 *  スクロールさせたい文章
 *  </ShowScrollingText>
 *  ---
 *  "ShowScrollingText"は"SST"か"文章のスクロール表示"でも記述できます。
 *
 *  速度が"2"で早送りを許可する場合(早送りなしフラグが"OFF")の
 *  具体例は以下のとおりです。
 *  ---
 * <ShowScrollingText: 2, OFF>
 * 世界は魔王によって滅ぼされた。
 *
 * しかし、勇者は立ち上がった。
 * </ShowScrollingText>
 *  ---
 *
 *  速度と早送りなしフラグは、省略することが可能です。
 *  省略した場合、速度は"2"が、早送りなしフラグは"OFF"が設定されます。
 *  また、両方を省略したときに限り":"も省略可能です。
 *  例えば、以下のように記述できます。
 *  ---
 * <ShowScrollingText>
 * 世界は魔王によって滅ぼされた。
 *
 * しかし、勇者は立ち上がった。
 * </ShowScrollingText>
 *  ---
 * 早送りなしフラグだけを省略し(早送りを許可する)、速度を"5"に設定する場合は
 * 以下のようになります。
 *  ---
 * <ShowScrollingText: 5>
 * 世界は魔王によって滅ぼされた。
 *
 * しかし、勇者は立ち上がった。
 * </ShowScrollingText>
 *  ---
 *
 *  以下の対応関係で早送りなしフラグの"ON"と"OFF"は代替できます。
 *  - "ON": "オン", "true", "1", "No Fast Forward"
 *  - "OFF":"オフ", "false", "0"
 *
 *  あまりないかもしれませんが、
 *  ---
 *  <ShowScrollingText>世界は魔王によって滅ぼされた。</ShowScrollingText>
 *  ---
 *  というように1行で記述することもできます。
 *
 *
 * ○ (5) スイッチの操作
 * 「スイッチの操作」は以下の記法で組み込むことができます。
 *   <Switch: スイッチ番号, 代入値("ON" or "OFF")>
 *   "Switch"は"SW", "スイッチ"でも代替できます。
 *
 * 例えば、以下の通りです。
 * 例1: 番号1のスイッチをONにする。
 *   <Switch: 1, ON>
 *   <SW: 1, ON>
 *   <スイッチ: 1, ON>
 * 例2: 番号1-10のスイッチをすべてOFFにする。
 *   <Switch: 1-10, OFF>
 *   <SW: 1-10, OFF>
 *   <スイッチ: 1-10, OFF>
 *
 * スイッチ番号は単一か範囲で指定します。範囲の場合は"1-10"のようにハイフンで
 * 始端と終端をつなげます。
 * 代入値は基本的に"ON"か"OFF"で指定します。
 * "ON"は"オン", "true", "1"として、
 * "OFF"は"オフ", "false", "0"でも代替できます。
 *
 *
 * ○ (6) 変数の操作
 * 「変数の操作」は、代入・加算・減算・乗算・除算・除算・余剰をそれぞれ以下の
 * 記法で組み込みます。
 * ・代入
 *  <Set: 変数番号, オペランド>
 *  "Set"は"=" か"代入"でも代替できます。
 *
 * ・加算(足し算)
 *  <Add: 変数番号, オペランド>
 *  "Add"は"+" か"加算"でも代替できます。
 *
 * ・減算(引き算)
 *  <Sub: 変数番号, オペランド>
 *  "Sub"は"-" か"減算"でも代替できます。
 *
 * ・乗算(掛け算)
 *  <Mul: 変数番号, オペランド>
 *  "Mul"は"*" か"乗算"でも代替できます。
 *
 * ・除算(割り算)
 *  <Div: 変数番号, オペランド>
 *  "Div"は"/" か"除算"でも代替できます。
 *
 * ・剰余(割り算のあまり)
 *  <Mod: 変数番号, オペランド>
 *  "Mod"は"%" か"剰余"でも代替できます。
 *
 * 変数番号は単一か範囲で指定します。範囲の場合は"1-10"のようにハイフンで
 * 始端と終端をつなげます。
 * オペランドでは演算対象の値を定数・変数・乱数・ゲームデータ・スクリプトで
 * 指定します。指定方法の詳細を述べる前に、以下にいくつか具体例を記します。
 *
 * 例1: 変数1に定数2を代入する。
 *   <Set: 1, 2>
 *   <=: 1, 2>
 *   <代入: 1, 2>
 *
 * 例2: 1から10の変数すべてに変数2の値を加算する。
 *   <Add: 1-10, variables[2]>
 *   <+: 1-10, V[2]>
 *   <加算: 1-10, 変数[2]>
 *
 * 例3: 変数1に50から100の乱数を減算する。
 *   <Sub: 1, random[50][100]>
 *   <-: 1, r[50][100]>
 *   <減算: 1, 乱数[50][100]>
 *
 * 例4: 1から10の変数すべてににゲームデータのアクター2のレベルを乗算する。
 *   <Mul: 1-10, GameData[actor][2][level]>
 *   <*: 1-10, gd[actor][2][level]>
 *   <乗算: 1-10, ゲームデータ[アクター][2][レベル]>
 *
 * 例5: 変数1にゲームデータのパーティ人数を除算する。
 *   <Div: 1, GameData[PartyMembers]>
 *   </: 1, gd[PartyMembers]>
 *   <除算: 1, ゲームデータ[パーティ人数]>
 *
 * 例6: 変数1にスクリプト"$gameVariables.value(1)"の値との剰余を代入する。
 *   <Mod: 1, Script[$gameVariables.value(1)]>
 *   <%: 1, sc[$gameVariables.value(1)]>
 *   <剰余: 1, スクリプト[$gameVariables.value(1)]>
 *
 * オペランドに定数を指定する場合は、
 *   "1","2"のように数値をそのままお書きください。
 *
 * オペランドに変数を指定する場合は、
 *   Variables[変数番号]
 *  で指定します。Variablesは"V"か"変数"で代替できます。
 *  例えば、変数2の場合は"Variables[2]"とお書きください。
 *
 * オペランドに乱数を指定する場合は、
 *   Random[最小値][最大値]
 * で指定します。Randomは"R"か"乱数"で代替できます。
 * 例えば、最小値50, 最大値50の乱数の場合は"Random[50][100]"とお書きください。
 *
 * オペランドにスクリプトを指定する場合は、
 *  Script[スクリプト本文(Javascript)]
 * で指定します。Scriptは"SC"か"スクリプト"で代替できます。
 * 例えば、$gameVariables.value(1)の場合は、"Script[$gameVariables.value(1)]"
 * とお書きください。
 *
 * オペランドにゲームデータを指定する場合は、
 *   GameData[引数1][引数2][引数3]
 * で指定します。GameDataは"gd"か"ゲームデータ"で代替できます。
 * 引数1,2,3で使用するゲームデータの値を指定します。
 * 引数1には
 * アイテム・武器・防具・アクター・敵キャラ・キャラクター・パーティ・その他
 * のいずれかを指定します。どれを指定するかで引数2,3の扱いも変わるので、ケー
 * スにわけて説明します。
 * ・アイテム
 *  GameData[Item][アイテムID]
 *  例: 変数1にIDが5のアイテムの所持数を代入する。
 *  <Set: 1, GameData[Item][5]>
 *  引数1の"Item"は"アイテム"でも代替できます。引数3は使用しません。
 *
 * ・武器
 *  GameData[Weapon][武器ID]
 *  例: 変数1にIDが5の武器の所持数を代入する。
 *    <Set: 1, GameData[Weapon][5]>
 *  引数1の"Weapon"は"武器"でも代替できます。引数3は使用しません。
 *
 * ・防具
 *  GameData[Armor][防具ID]
 *  例: 変数1にIDが5の防具の所持数を代入する。
 *    <Set: 1, GameData[Armor][5]>
 *  引数1の"Armor"は"防具"でも代替できます。引数3は使用しません。
 *
 * ・アクター
 *  GameData[Actor][アクターID][パラメータ名]
 *  例: 変数1にIDが4のアクターのレベルを代入する。
 *    <Set: 1, GameData[actor][4][Level]>
 *  引数3のパラメータ名は以下のリストからご指定ください。
 *    - レベル: "Level", "レベル"
 *    - 経験値: "Exp", "経験値"
 *    - HP: "HP"
 *    - MP: "MP"
 *    - 最大HP: "MaxHp", "最大HP"
 *    - 最大MP: "MaxMP", "最大MP"
 *    - 攻撃力: "Attack", "攻撃力"
 *    - 防御力: "Defense", "防御力"
 *    - 魔法攻撃力: "M.Attack", "魔法攻撃力"
 *    - 魔法防御力: "M.Defense", "魔法防御力"
 *    - 敏捷性: "Agility", "敏捷性"
 *    - 運: "Luck", "運"
 *
 * ・敵キャラ
 *  GameData[Enemy][(戦闘中の)敵キャラID][パラメータ名]
 *  例: 変数1に戦闘中の2番目の敵キャラのHPを代入する。
 *    <Set: 1, GameData[Enemy][2][HP]>
 *  パラメータ名は、上述したゲームデータのアクターのパラメータ名のリストを
 *  参照してください。ただし、レベルと経験値は設定出来ません。
 *
 * ・キャラクター
 *  GameData[Character][イベントの指定][参照値]
 *  例1: 変数1にプレイヤーのマップX座標を代入する。
 *    <Set: 1, GameData[Character][Player][MapX]>
 *  例2: 変数1にこのイベントの方向を代入する。
 *    <Set: 1, GameData[Character][ThisEvent][Direction]>
 *  例3: 変数1にID2のイベントの画面Y座標を代入する。
 *    <Set: 1, GameData[Character][2][ScreenY]>
 *  引数2のイベントの指定は以下のリストからご指定ください。
 *    - プレイヤー: "Player", "プレイヤー", "-1"
 *    - このイベント: "ThisEvent", "このイベント", "0"
 *    - イベントID指定: "1", "2", ...
 *  引数3の参照値は以下のリストからご指定ください。
 *    - マップX座標: "MapX", "マップX"
 *    - マップY座標: "MapY", "マップY"
 *    - 方向: "Direction", "方向"
 *    - 画面X座標: "ScreenX", "画面X"
 *    - 画面Y座標: "ScreenY", "画面Y"
 *
 * ・パーティ
 *  GameData[party][並び順]
 *  例: パーティの先頭のアクターIDを変数1に代入する。
 *    <Set: 1, gamedata[party][1]>
 *  並び順は整数で指定します。
 *  引数1の"party"は"パーティ"でも代替できます。
 *
 * ・ 直前
 *  GameData[Last][項目]
 *
 *  例: 直前に使用したスキルのIDを変数1に代入する。
 *   <Set: 1, gamedata[Last][Last Used Skill ID]>
 *
 *  項目は以下のリストからご指定ください。
 *   - 直前に使用したスキルのID:
 *     - "Last Used Skill ID"
 *     - "直前に使用したスキルのID"
 *     - "Used Skill ID"
 *   - 直前に使用したアイテムのID:
 *     - "Last Used Item ID"
 *     - "直前に使用したアイテムのID"
 *     - "Used Item ID"
 *   - 直前に行動したアクターのID:
 *     - "Last Actor ID to Act"
 *     - "直前に行動したアクターのID"
 *     - "Actor ID to Act"
 *   - 直前に行動した敵キャラのインデックス:
 *     - "Last Enemy Index to Act"
 *     - "直前に行動した敵キャラのインデックス"
 *     - "Enemy Index to Act"
 *   - 直前に対象となったアクターのID:
 *     - "Last Target Actor ID"
 *     - "直前に対象となったアクターのID"
 *     - "Target Actor ID"
 *   - 直前に対象となった敵キャラのインデックス:
 *     - "Last Target Enemy Index"
 *     - "直前に対象となった敵キャラのインデックス"
 *     - "Target Enemy Index"
 *
 *  引数1の"Last"は"直前"でも代替できます。
 *
 *
 * ・その他
 *  その他では、引数1のみを使用します。以下のリストから指定してください。
 *   - パーティ人数: "PartyMembers", "パーティ人数"
 *   - 所持金: "gold", "所持金",
 *   - 歩数: "steps", "歩数"
 *   - プレイ時間: "PlayTime", "プレイ時間"
 *   - タイマー: "timer", "タイマー"
 *   - セーブ回数: "SaveCount", "セーブ回数"
 *   - 戦闘回数: "BattleCount", "戦闘回数"
 *   - 勝利回数: "WinCount", "勝利回数"
 *   - 逃走回数: "EscapeCount", "逃走回数"
 *
 *   例: パーティ人数を変数1に代入する。
 *    <Set: 1, gamedata[PartyMembers]>
 *
 *
 * ○ (7) セルフスイッチの操作
 * 「セルフスイッチの操作」は以下の記法で組み込むことができます。
 *   <SelfSwitch: セルフスイッチ記号, 代入値("ON" or "OFF")>
 *  "SelSwitch"は"SSW", "セルフスイッチ"でも代替できます。
 *
 * 例1: セルフスイッチAをONにする。
 *   <SelfSwitch: A, ON>
 *   <SSW: A, true>
 *   <セルフスイッチ: A, オフ>
 * 例2: セルフスイッチBをOFFにする。
 *   <SelfSwitch: B, OFF>
 *   <SSW: B, false>
 *   <セルフスイッチ: B, オフ>
 *
 * 代入値は基本的に"ON"か"OFF"で指定します。
 * "ON"は"オン", "true", "1"として、
 * "OFF"は"オフ", "false", "0"でも代替できます。
 *
 *
 * ○ (8) タイマーの操作
 * 「タイマーの操作」は以下のいずれか記法で組み込みます。
 *    <Timer: 操作, 分, 秒>
 *    <タイマー: 操作, 分, 秒>
 *
 *  操作ではスタートするかストップするかを以下の記法で指定する。
 *  - スタート: "Start", "始動", "スタート"
 *  - ストップ: "Stop", "停止", "ストップ"
 * スタートの場合は分と秒を数値で指定してください。
 * ストップでは分と秒は指定しないでください。
 *
 * 例1: 1分10秒のタイマーをスタートする
 *   <Timer: Start, 1, 10>
 *   <タイマー: 始動, 1, 10>
 *   <タイマー: スタート, 1, 10>
 * 例2: タイマーをストップする
 *   <Timer: Stop>
 *   <タイマー: 停止>
 *   <タイマー: ストップ>
 *
 * ○ (9) 条件分岐
 * 「条件分岐」は、以下の記法で組み込みます。
 *  ---
 *  <If: 条件の対象, 引数1, 引数2, 引数3>
 *  条件を満たしている時の処理
 *  <Else>
 *  条件を満たしていない時の処理
 *  ---
 *  詳細を述べる前に、いくつか具体例を記します。
 *  いずれの例も、条件が満たされているときは
 *   「私もずっと前から好きでした。」
 *  というメッセージを、条件を満たさないときは
 *   「ごめんなさい。お友達でいましょう。」
 *  とメッセージを表示します。
 *
 *  例1: スイッチ1がONのとき
 *   ---
 *   <If: Switches[1], ON>
 *   私もずっと前から好きでした。
 *   <Else>
 *   ごめんなさい。お友達でいましょう。
 *   <End>
 *   ---
 *
 *  例2: 変数1が定数2と等しいとき
 *   ---
 *   <If: Variables[1], ==, 2>
 *   私もずっと前から好きでした
 *   <Else>
 *   ごめんなさい。お友達でいましょう。
 *   <End>
 *   ---
 *
 *  例3: ID1のアクターがパーティにいるとき
 *   ---
 *   <If: Actors[1], in the party>
 *   私もずっと前から好きでした。
 *   <Else>
 *   ごめんなさい。お友達でいましょう。
 *   <End>
 *   ---
 *
 *  条件の対象毎に引数の記法が異なり、引数2,引数3を使わないものもあります。
 *  以降、条件の対象毎に記法を説明します。
 *
 * ・スイッチを条件に使うとき
 *  スイッチを条件に使うときは、以下のように条件を書きます。
 *  <If: Switches[スイッチID], 値("ON" or "OFF")>
 *
 *  "Switches"は"SW"や"スイッチ"で代替できます。
 *  また、代入値は基本的に"ON"か"OFF"で指定しますが、
 *  以下のような代替記号でも指定できます。
 *   - "ON": "オン", "true", "1"
 *   - "OFF": "オフ", "false", "0"
 *
 *  例えば、以下の通りです。
 *   例1: スイッチ1が"ON"のとき
 *    - "<If: Switches[1], ON>"
 *    - "<If: SW[1], true>"
 *    - "<If: スイッチ[1], オン>"
 *   例2: スイッチ1が"OFF"のとき
 *    - "<If: Switches[1], OFF>"
 *    - "<If: SW[1], false>"
 *    - "<If: スイッチ[1], オフ>"
 *
 * ・変数を条件に使うとき
 *  変数を条件に使うときは、以下のように条件を書きます。
 *  <If: Variables[変数ID], 条件式(記号), オペランド(定数 or 変数)>
 *
 *  "Variables"は"V"や"変数"でも代替できます。
 *  条件式に使える記号は以下の通りです。
 *   - 等しい: "==" , "＝"(全角のイコールです)
 *   - 以上: ">=", "≧"
 *   - 以下: "<=", "≦"
 *   - 大きい: ">", "＞"
 *   - 小さい: "<", "＜"
 *   - 等しくない: "!=", "≠"
 *
 *  オペランドの指定方法は以下の通りです。
 *   - 定数: "1", "2"など数値をそのまま記入
 *   - 変数: "Variables[変数ID]", "V[変数ID]", "変数[変数ID]"
 *
 *  例えば、以下の通りです。
 *   例1: 変数1が定数2と等しいとき
 *    - "<If: Variables[1], ==, 2>"
 *    - "<If: V[1], ==, 2>"
 *    - "<If: 変数[1], ＝, 2>"
 *   例2: 変数1が変数2の値以上のとき
 *    - "<If: Variables[1], >=, Variables[2]>"
 *    - "<If: V[1], >=, V[2]>"
 *    - "<If: 変数[1], >=, 変数[2]>"
 *
 * ・セルフスイッチを条件に使うとき
 *  セルフスイッチを条件に使うときは、以下のように条件を書きます。
 *  <If: SelfSwitches[セルフスイッチ記号(A,B,C, or D)], 代入値(ON or OFF)>
 *
 *  "SelfSwitches"は"SSW"や"セルフスイッチ"でも代替できます。
 *  また、代入値は基本的に"ON"か"OFF"で指定しますが、
 *  以下のような代替記号でも指定できます。
 *   - "ON": "オン", "true", "1"
 *   - "OFF": "オフ", "false", "0"
 *
 *  例えば、以下の通りです。
 *   例1: セルフスイッチAがONのとき
 *    - "<If: SelfSwitches[A], ON>"
 *    - "<If: SSW[A], true>"
 *    - "<If: セルフスイッチ[A], オフ>"
 *   例2: セルフスイッチBがOFFのとき
 *    - "<If: SelfSwitches[B], OFF>"
 *    - "<If: SSW[B], false>"
 *    - "<If: セルフスイッチ[B], オフ>"
 *
 * ・タイマーを条件に使うとき
 *  タイマーを条件に使うときは、以下のように条件を書きます。
 *   <If: Timer, 条件式(">=" or "<="), 分, 秒>
 *
 *  "Timer"は"タイマー"でも代替できます。
 *  また、条件式">="は"≧"で、"<="は"≦"で代替できます。
 *
 *  例えば、以下の通りです。
 *   例1: タイマーが1分10秒以上のとき
 *    - "<If: Timer, >=, 1, 10>"
 *    - "<If: タイマー, ≧, 1, 10>"
 *   例2: タイマーが1分10秒以下のとき
 *    - "<If: Timer, <=, 1, 10>"
 *    - "<If: タイマー, ≦, 1, 10>"
 *
 * ・アクターに関する情報を条件に使うとき
 *  アクターに関する情報を条件に使うときは、以下のように書きます。
 *   <If: Actors[アクターID], 条件1, 条件2>
 *
 *  "Actors"は"アクター"でも代替できます。
 *  条件1で対象を指定します。
 *   - パーティにいる
 *   - 名前
 *   - 職業
 *   - スキル
 *   - 武器
 *   - 防具
 *   - ステート
 *  を指定できます。
 *  条件2は条件1で指定した対象によって使い方が異なります。
 *  以下に、条件1での対象毎に説明します。
 *
 *  * アクターがパーティにいるかどうか
 *   アクターがパーティにいるかどうかを判定するときは以下のように指定します。
 *    <If: Actors[アクターID], in the party>
 *
 *    "in the party"は"パーティにいる"という文字列でも代替できます。
 *    条件2は使用しません。
 *
 *    例えば、ID1のアクターがパーティにいるかどうかを条件に使うときは以下の
 *   ように書きます。
 *    - "<If: Actors[1], in the party>"
 *    - "<If: アクター[1], パーティにいる>"
 *
 *  * アクターの名前
 *   アクターの名前を条件式に使うときは以下のように指定します。
 *    <If: Actors[アクターID], Name, 名前(自由記述)>
 *
 *    "Name"は"名前"でも代替できます。
 *
 *    例えば、ID1のアクターの名前が"ハロルド"かどうかは以下のように書きます。
 *    - "<If: Actors[アクターID], Name, ハロルド>"
 *    - "<If: アクター[アクターID], 名前, ハロルド>"
 *
 *  * 職業、スキル、武器、防具、ステート
 *   職業、スキル、武器、防具、ステートは以下のように指定します。
 *    <If: Actors[アクターID], テーブル名, テーブルID(1,2,...などの整数)>
 *
 *   テーブル名では、アクターに紐付いた情報のテーブル名を指定します。
 *   指定方法は以下のとおりです。
 *    - 職業: "Class", "職業"
 *    - スキル: "Skill", "スキル"
 *    - 武器: "Weapon", "武器"
 *    - 防具: "Armor", "防具"
 *    - ステート: "State", "ステート"
 *
 *   例えば、以下の通りです。
 *    例1: ID1のアクターの職業が、ID2の職業のとき
 *     - "<If: Actors[1], Class, 2>"
 *     - "<If: アクター[1], 職業, 2>"
 *    例2: ID1のアクターがID2のスキルを習得しているとき
 *     - "<If: Actors[1], Skill, 2>"
 *     - "<If: アクター[1], スキル, 2>"
 *    例3: ID1のアクターがID2の武器を装備しているとき
 *     - "<If: Actors[1], Weapon, 2>"
 *     - "<If: アクター[1], 武器, 2>"
 *    例4: ID1のアクターがID2の防具を装備しているとき
 *     - "<If: Actors[1], Armor, 2>"
 *     - "<If: アクター[1], 防具, 2>"
 *    例5: ID1のアクターがID2のステートを付与されているとき
 *     - "<If: Actors[1], State, 2>"
 *     - "<If: アクター[1], ステート, 2>"
 *
 *  * 敵キャラに関する情報を条件に使うとき
 *   敵キャラに関する情報を条件に使うときは、以下のように書きます。
 *    <If: Enemies[戦闘中の敵キャラの番号], 条件1, 条件2>
 *
 *   "Enemies"は"敵キャラ", "エネミー"でも代替できます。
 *
 *   条件1は以下いずれかで設定します。
 *   - 出現している: "Appeared" or "出現している"
 *   - ステート: "State" or "ステート"
 *
 *  また、ステートを指定した場合は、条件2でステートのIDを指定します。
 *
 *  例えば以下の通りです。
 *   例1: 1体目の敵キャラが出現しているとき
 *    - "<If: Enemies[1], Appeared>"
 *    - "<If: 敵キャラ[1], 出現している>"
 *    - "<If: エネミー[1], 出現している>"
 *   例2: 1体目の敵キャラがID2のステートにかかっているとき
 *    - "<If: Enemies[1], State, 2>"
 *    - "<If: 敵キャラ[1], ステート, 2>"
 *    - "<If: エネミー[1], ステート, 2>"
 *
 *  * キャラクターの向きを条件に使うとき
 *  キャラクターの向きを条件に使うときは、以下のように書きます。
 *   <If: Characters[イベントの指定], 向き(下, 左, 右, 上)>
 *
 *  "Characters"は"キャラクター"でも代替できます。
 *
 *  引数のイベントの指定は以下のリストからご指定ください。
 *   - プレイヤー: "Player", "プレイヤー", "-1"
 *   - このイベント: "ThisEvent", "このイベント", "0"
 *   - イベントID指定: "1", "2", ...
 *
 *  向きは以下のリストからご指定ください。
 *  - 下: "Down", "下", "2"
 *  - 左: "Left", "左", "4"
 *  - 右: "Right", "右", "6"
 *  - 上: "Up", "上", "8"
 *
 *  例えば、以下の通りです。
 *   例1: プレイヤーが下向きの時
 *    - "<If: Characters[Player], Down>"
 *    - "<If: キャラクター[プレイヤー], 下>"
 *    - "<If: Characters[-1], 2>"
 *   例2: このイベントが左向きのとき
 *    - "<If: Characters[ThisEvent], Left>"
 *    - "<If: キャラクター[このイベント], 左>"
 *    - "<If: Characters[0], 4>"
 *   例3: ID1のイベントが右向きのとき
 *    - "<If: Characters[1], Right>"
 *    - "<If: キャラクター[1], 右>"
 *    - "<If: Characters[1], 6>"
 *
 *  * 乗り物を条件に使うとき
 *   乗り物に乗っていることを条件に使うときは、以下のように書きます。
 *    <If: Vehicle, 乗り物の種類(小型船、大型船、飛行船)>
 *
 *  "Vehicle"は"乗り物"でも代替できます。
 *
 *  乗り物の種類は以下のリストからご指定ください。
 *   - 小型船: "Boat", "小型船"
 *   - 大型船: "Ship", "大型船"
 *   - 飛行船: "Airship", "飛行船"
 *
 *  例えば以下の通りです。
 *   例1: 小型船に乗っている時
 *    - "<If: Vehicle, Boat>"
 *    - "<If: 乗り物, 小型船>"
 *   例2: 大型船に乗っている時
 *    - "<If: Vehicle, Ship>"
 *    - "<If: 乗り物, 大型船>"
 *   例3: 飛行船に乗っている時
 *    - "<If: Vehicle, Airsip>"
 *    - "<If: 乗り物, 飛行船>"
 *
 *  * お金を条件に使うとき
 *   お金を条件に使うときは、いかのようにかきます
 *    <If: Gold, 条件式(≧, ≦, <), 数値(定数)
 *
 *   "Gold"は"お金"でも代替出来ます。
 *
 *   条件式に使える記号は以下の通りです。
 *    - 以上: ">=", "≧"
 *    - 以下: "<=", "≦"
 *    - 小さい: "<", "＜"
 *
 *   例えば以下の通りです。
 *    例1: お金を500以上所持しているとき
 *     - "<If: Gold, >=, 500>"
 *     - "<If: お金, ≧, 500>"
 *    例2: 500以下しかお金を所持していないとき
 *     - "<If: Gold, <=, 500>"
 *     - "<If: お金, ≦, 500>"
 *    例2: 500未満しかお金を所持していないとき
 *     - "<If: Gold, <, 500>"
 *     - "<If: お金, ＜, 500>"
 *
 *  * アイテムを条件に使うとき
 *   アイテムを条件に使うときは以下のように書きます。
 *    <If: Items[ID]>
 *
 *   "Items"は"アイテム"でも代替できます。
 *
 *   例えば、以下の通りです。
 *    例1: IDが1のアイテムを所持しているとき
 *     - "<If: Items[1]>"
 *     - "<If: アイテム[1]>"
 *
 *  * 武器を条件に使うとき
 *   武器を条件に使うときは以下のように書きます。
 *    <If: Weapons[ID], 装備品を含むか>
 *
 *   "Weapons"は"武器"でも代替できます。
 *   装備品を含む場合は、2つ目の引数の部分に"Include Equipment"もしくは
 *   "装備品を含む"と記載してください。含まない場合は、省略してください。
 *
 *   例えば、以下の通りです。
 *    例1: IDが1の武器を所持しているとき(装備品は含まない)
 *     - "<If: Weapons[1]>"
 *     - "<If: 武器[1]>"
 *    例2: IDが1の武器を所持しているとき(装備品は含む)
 *     - "<If: Weapons[1], Include Equipment>"
 *     - "<If: 武器[1], 装備品を含む>"
 *
 *  * 防具を条件に使うとき
 *   防具を条件に使うときは以下のように書きます。
 *    <If: Armors[ID], 装備品を含むか>
 *
 *   "Armors"は"防具"でも代替できます。
 *   装備品を含む場合は、2つ目の引数の部分に"Include Equipment"もしくは
 *   "装備品を含む"と記載してください。含まない場合は、省略してください。
 *
 *   例えば、以下の通りです。
 *    例1: IDが1の防具を所持しているとき(装備品は含まない)
 *     - "<If: Armors[1]>"
 *     - "<If: 防具[1]>"
 *    例2: IDが1の防具を所持しているとき(装備品は含む)
 *     - "<If: Armors[1], Include Equipment>"
 *     - "<If: 防具[1], 装備品を含む>"
 *
 *  * ボタンを条件に使うとき
 *   ボタンを条件に使うときは以下のように書きます。
 *    <If: Button, ボタンの種類, 押され方(省略可能)>
 *
 *   "Button"は"ボタン"でも代替できます。
 *   以下のリストからボタンの種類を指定してください。
 *    - 決定: "OK", "決定"
 *    - キャンセル: "Cancel", "キャンセル"
 *    - シフト: "Shift", "シフト"
 *    - 下: "Down", "下"
 *    - 左: "Left", "左"
 *    - 右: "Right", "右"
 *    - 上: "Up", "上"
 *    - ページアップ: "Pageup", "ページアップ"
 *    - ページダウン: "Pagedown", "ページダウン"
 *
 *   押され方は以下のリストから指定してください。
 *    - が押されている:
 *       "is being pressed", "が押されている", "pressed"
 *    - がトリガーされている:
 *       "is being triggered", "がトリガーされている", "triggered"
 *    - がリピートされている:
 *       "is being repeated", "がリピートされている", "repeated"
 *
 *    押され方は省略が可能です。その場合は`is being pressed`が設定されます。
 *
 *    例えば以下の通りです。
 *     例1: 決定ボタンが押されているとき
 *      - "<If: Button, OK, is being pressed>"
 *      - "<If: ボタン, 決定, が押されている>"
 *      - "<If: Button, OK>"
 *      - "<If: Button, OK, pressed>"
 *     例2: シフトボタンがトリガーされているとき
 *      - "<If: Button, Shift, is being triggered>"
 *      - "<If: ボタン, シフト, がトリガーされている>"
 *      - "<If: Button, Shift, triggered>"
 *     例3: 下ボタンがリピートされているとき
 *      - "<If: Button, Down,  is being repeated>"
 *      - "<If: ボタン, 下, がリピートされている>"
 *      - "<If: Button, Down, repeated>"
 *
 *  * スクリプトを条件に使う時
 *   スクリプトを条件に使うときは以下のように書きます。
 *    <If: Script, スクリプト本文(Javascript)>
 *
 *   "Script"は"スクリプト"か"SC"でも代替できます。
 *   例えば、"$gameParty._gold < $gameVariables.value(1)"を
 *   条件にするときは以下のように書けます。
 *    - "<If: Script, $gameParty._gold == $gameVariables.value(1)>"
 *    - "<If: スクリプト, $gameParty._gold == $gameVariables.value(1)>"
 *    - "<If: SC, $gameParty._gold == $gameVariables.value(1)>"
 *
 * ・その他の条件分岐の特徴
 *  別記法として、以下の対応関係で日本語表記もできます。
 *    - If: "条件分岐"
 *    - Else: "それ以外のとき"
 *    - End: "分岐修了"
 *  <Else>とその処理は省略することができます。
 *
 *  入れ子にすることができます。例えば以下のようにすることもできます。
 *  ---
 *  <If: Switch[1], ON>
 *    <If: Switch[2], ON>
 *    1つ目と2つ目の条件が満たされているときの処理
 *    <End>
 *  <Else>
 *  1つ目の条件が満たされていないときの処理
 *  <End>
 *  ---
 *
 *  条件分岐の中は「変数の操作」や「コモンイベント」など、その他の
 *  イベントコマンドも組み込むことができます。
 *  ---
 *  <If: Switch[1], ON>
 *    <Set: 1, 2>
 *    <CommonEvent: 3>
 *    私もずっと前から好きでした。
 *  <Else>
 *    <Set: 3, 4>
 *    <CommonEvent: 4>
 *    ごめんなさい。お友達でいましょう。
 *  <End>
 *  ---
 *
 *  "<End>"を書かなかった場合は、以降のメッセージやタグが全てIfもしくはElseの処
 *  理として組み込まれます。
 *  タグ(If, Else, END)の直後は可能な限り改行してください。改行せずに次のイベン
 *  トやメッセージを入力した場合の動作は保証されていません。
 *
 *
 *
 * ○ (10) ループ
 * 「ループ」は以下の記法で組み込みます
 *  ---
 *  <Loop>
 *  ループしたい処理
 *  <RepeatAbove>
 *  ---
 *
 *  "Loop"は"ループ"、"RepeatAbove"は"以上繰り返し"や"RA"で代替できます。
 *
 *  ループしたい処理は、メッセージの表示や他のタグを自由に組み込めます。
 *
 *  以下の具体例は、"今日も一日がんばるぞい！"というメッセージが
 *  無限ループします。
 *  ---
 *  <Loop>
 *  今日も一日がんばるぞい！
 *  <RepeatAbove>
 *  ---
 *
 *  以下の例では、他のタグと組み合わせることで、
 *  "今日も一日がんばるぞい！"を
 *  5回表示させる処理になります。
 *  """
 *  <Set: 1, 0>
 *  <Loop>
 *  <If: Variables[1], ==, 5>
 *    <BreakLoop>
 *  <End>
 *  今日も一日がんばるぞい！
 *  <Add: 1, 1>
 *  <RepeatAbove>
 *  """
 *  "Set"と"Add"は「変数の操作」を、"If"と"End"は「条件分岐」を、
 *  "BreakLoop"はループの
 *  中断の説明をご覧ください。
 *
 *
 * ○ (11) ループの中断
 *  「ループの中断」は以下のいずれかの記法で組み込みます。
 *   <BreakLoop>
 *   <ループの中断>
 *   <BL>
 *
 * ○ (12) イベント処理の中断
 * 「イベント処理の中断」は以下のいずれかの記法で組み込みます。
 *   <ExitEventProcessing>
 *   <イベント処理の中断>
 *   <EEP>
 *
 * ○ (13) コモンイベント
 * 「コモンイベント」は以下のいずれかの記法で組み込みます。
 *    <CommonEvent: コモンイベントID>
 *    <CE: コモンイベントID>
 *    <コモンイベント: コモンイベントID>
 *
 *  例えば以下のように記述すると、ID2のコモンイベントが組み込まれます。
 *    <CommonEvent: 2>
 *    <CE: 2>
 *    <コモンイベント: 2>
 *
 * ○ (14) ラベル
 * 「ラベル」は以下のいずれかの記法で指定します。
 *   <Label: ラベル名>
 *   <ラベル: ラベル名>
 *
 *  例えば以下のように記述すると"Start"というラベルが組み込まれます。
 *   <Label: Start>
 *   <ラベル: Start>
 *
 * ○ (15) ラベルジャンプ
 * 「ラベルジャンプ」は以下のいずれかの記法で指定します。
 *   <JumpToLabel: ジャンプ先のラベル名>
 *   <ラベルジャンプ: ジャンプ先のラベル名>
 *   <JTL: ジャンプ先のラベル名>
 *
 *  例えば以下のように記述すると"Start"と名付けられたラベルへのラベルジャンプが
 *  組み込まれます。
 *   <JumpToLabel: Start>"
 *   <ラベルジャンプ: Start>
 *   <JumpToLabel: Start>"
 *
 * ○ (16) 注釈
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
 *  別記法として<CO>か、<注釈>としても記述できます。
 * また、
 * <comment>この辺からいい感じのBGMを再生する。</comment>
 * というように1行で記述することもできます。
 *
 * ○ (17) ピクチャの表示
 *  ピクチャの表示は、以下の記法で指定します。
 *  <ShowPicture: ピクチャ番号,ファイル名,オプション1,オプション2,オプション3>
 *
 *  必須の引数はピクチャ番号(整数)とファイル名だけです。
 *  位置・拡大率・合成はオプションとして指定でき、指定しない場合はデフォルト値
 *  が設定されます。
 *  "ShowPicture"は"ピクチャの表示"か"SP"で代替できます。
 *
 *  オプションの指定方法を述べる前に、いくつか具体例を記します。
 *
 *  例1: 以下のデフォルト設定でピクチャを表示する。
 *    - ピクチャ番号: 1
 *    - 画像ファイル名: Castle.png
 *    - 位置: 原点は左上でX座標0, Y座標0(デフォルト設定)
 *    - 拡大率: 幅50%, 高さ55%
 *    - 合成: 不透明度は255, 合成方法は通常(デフォルト設定)
 *   <ShowPicture: 1, Castle, Scale[50][55],>
 *   <ピクチャの表示: 1, Castle, 拡大率[50][55]>
 *   <SP: 1, Castle, Scale[50][55]>
 *
 *  例2:  以下の設定(拡大率だけ指定)でピクチャを表示
 *    - ピクチャ番号: 2
 *    - 画像ファイル名: Castle.png
 *    - 位置: 原点は中央でX座標は変数2,Y座標は変数3
 *    - 拡大率: 幅100%, 高さ100%(デフォルト設定)
 *    - 合成: 不透明度は255, 合成方法は通常(デフォルト設定)
 *   <ShowPicture: 2, Castle,  Position[Center][Variables[2]][Variables[3]]>
 *   <ピクチャの表示: 2, Castle, 位置[中央][変数[2][変数[3]]>
 *   <SP: 2, Castle, Position[Center][V[2]][V[3]]>
 *
 *  例3: 以下の設定でピクチャを表示
 *    - ピクチャ番号: 3
 *    - 画像ファイル名: Castle.png
 *    - 位置: 原点は中央で、X座標は10,Y座標は20
 *    - 拡大率:幅100%, 高さ100%(デフォルト設定)
 *    - 合成: 不透明度は235, 合成方法はスクリーン
 *   <ShowPicture: 3, Castle, Position[Upper Left][10][20], Blend[235][Screen]>
 *   <ピクチャの表示: 3, Castle, 位置[左上][100][200], 合成[235][スクリーン]>
 *   <SP: 3, Castle, Position[Upper Left][10][20], Blend[235][Screen]>
 *
 *  オプションは順不同です。ピクチャ番号とファイル名は引数の位置は固定ですが、
 *  オプション1,2,3はどのような順番で指定しても大丈夫です。
 *
 *  ・位置
 *   ピクチャの位置は、以下の記法で指定します。
 *   Position[原点("Upper Left"か "Center")][X座標][Y座標]
 *
 *   "Position"は"位置"でも代替できます。
 *   X,Y座標は定数か変数で指定できます。
 *   定数は整数値をそのまま入力し、変数の場合は"Variables[変数ID]"というよう
 *   に指定します。
 *   "Variables"は"変数"か"V"でも代替できます。
 *
 *   例えば以下の通りです。
 *    - 例1: 原点は左上, X座標は100, Y座標は200,
 *      - "Position[Upper Left][100][200]"
 *      - "位置[左上][100][200]"
 *    - 例2: X座標は変数2の値, 変数3の値
 *      - "Position[Center][Variables[2]][Variables[3]]"
 *      - "位置[中央][変数[2]][変数[3]]"
 *      - "Position[Center][V[2]][V[3]]"
 *   位置を指定しなかった場合のデフォルト値は"Position[Upper Left][0][0]"
 *   となります。
 *
 *  ・拡大率
 *    ピクチャの拡大率は、以下の記法で指定します。
 *    Scale[幅(％)][高さ(％)]
 *
 *   "Scale"は"拡大率"でも代替できます。
 *
 *   例えば幅90%, 高さ95%は以下のように指定します。
 *   - "Scale[90][95]"
 *   - "拡大率[90][95]"
 *   拡大率を指定しなかった場合のデフォルト値は"Scale[100][100]"
 *   となります。
 *
 *  ・合成
 *   ピクチャの合成は、以下の記法で指定します。
 *   Blend[不透明度(0~255の整数)][合成方法(通常,加算,乗算,or スクリーン)]
 *   "Blend"は"合成"で代替できます。
 *
 *   不透明度は以下のリストから指定します。
 *   - 通常: "Normal", "通常"
 *   - 加算: "Additive", "加算"
 *   - 乗算: "Multiply", "乗算"
 *   - スクリーン: "Screen", "スクリーン"
 *
 *   例えば不透明度が200で、加算を指定する場合は以下のように指定します。
 *   - "Blend[200][Additive]"
 *   - "合成[200][加算]"
 *   合成を指定しなかった場合のデフォルト値は"Blend[255][Normal]"
 *   となります。
 *
 *
 * ○ (18) ピクチャの移動
 *  ピクチャの合成は、以下の記法で指定します。
 *  <MovePicture:ピクチャ番号,オプション1,オプション2,オプション3,オプション4>
 *
 *  必須の引数はピクチャ番号だけです。
 *  移動にかける時間と、位置・拡大率・合成はオプションとして指定でき、
 *  指定しない場合はデフォルト値が設定されます。
 *
 *  "MovePictures"は"ピクチャの移動"か"MP"で代替できます。
 *
 *  オプションの指定方法を述べる前に、いくつか具体例を記します。
 *  例1: 以下のデフォルト設定でピクチャを移動する。
 *    - ピクチャ番号: 1
 *    - 時間: 60フレーム, 完了までウェイト(デフォルト設定)
 *    - 位置: 原点は中央で、X座標は変数2,Y座標は変数3
 *    - 拡大率: 幅100%, 高さ100%(デフォルト設定)
 *    - 合成: 不透明度は255, 合成方法は通常(デフォルト設定)
 *   <MovePicture: 1, Position[Center][Variables[2]][Variables[3]]>
 *   <ピクチャの移動: 1, 位置[中央][変数[2]][変数[3]]>
 *   <MP: 1, Position[Center][V[2]][V[3]]>
 *
 *   例2: 以下の設定でピクチャを移動
 *    - ピクチャ番号: 2
 *    - 時間: 45フレーム, 完了までウェイトしない
 *    - 位置: 原点は左上でX座標0, Y座標0(デフォルト設定)
 *    - 拡大率:幅90%, 高さ95%
 *    - 合成: 不透明度は235, 合成方法はスクリーン
 *   <MovePicture: 2, Duration[45][], Blend[235][Screen], Scale[90][95]>
 *   <ピクチャの移動: 2, 時間[45], 合成[235][スクリーン], 拡大率[90][95]>
 *   <MP: 2, Duration[45], Blend[235][Screen], Scale[90][95]>
 *
 *  オプションは順不同です。ピクチャ番号の引数の位置は固定ですが、
 *  オプション1,2,3,4はどのような順番で指定しても大丈夫です。
 *  また、
 *   - 位置
 *   - 拡大率
 *   - 合成
 *  については、「ピクチャの表示」イベントタグのオプションの記法と
 *  同一なので、そちらをご覧ください。
 *
 *  ・時間
 *    ピクチャの移動時間は、以下の記法で指定します。
 *    Duration[フレーム数][ウェイトするか否か("Wait for Completion" or 省略)]
 *
 *    "Duration"は"時間"で、"Wait for Completion"は"完了までウェイト"か
 *    "Wait"で代替できます。
 *
 *    例えば、以下の通りです。
 *    例1: 45フレームで完了するまでウェイトする
 *      - "Duration[45][Wait for Completion]"
 *      - "時間[45][完了までウェイト]"
 *      - "時間[45][Wait]"
 *    例2: 60フレームで完了するまでウェイトしない
 *      - "Duration[60]"
 *      - "時間[60]"
 *      - "Duration[60][]"
 *
 *    時間を指定しなかった場合のデフォルト値は
 *    "Duration[60][Wait for Completion]"となります。
 *
 *  ・イージング
 *    イージングは以下の記法で指定します。
 *    Easing[モード]
 *      モードは以下の4つを選択できます。
 *       - "Constant speed"
 *       - "Slow start"
 *       - "Slow end"
 *       - "Slow start and end"
 *
 *   "Easing"は"イージング"でも代替できます。
 *   モードは以下の対応関係で代替できます。
 *     - "Constant speed": "一定速度", "Linear"
 *     - "Slow start": "ゆっくり始まる", "Ease-in"
 *     - "Slow end": "ゆっくり終わる", "Ease-out"
 *     - "Slow start and end": "ゆっくり始まってゆっくり終わる", "Ease-in-out"
 *
 *    例えば、以下の通りです。
 *    例1: 一定速度
 *     - "Easing[Constant speed]"
 *     - "イージング[一定速度]"
 *     - "Easing[Linear]"
 *    例2: ゆっくり始まってゆっくり終わる
 *     - "Easing[Slow start and end]"
 *     - "イージング[ゆっくり始まってゆっくり終わる]"
 *     - "Easing[Ease-in-out]"
 *
 *    イージングを指定しなかった場合のデフォルト値は
 *    "Easing[Constant speed]"となります。
 *
 *
 * ○ (19) ピクチャの回転
 *  ピクチャの回転は以下の記法で指定します。
 *  <RotatePicture: ピクチャ番号(整数), 回転速度(-90~90の整数)>
 *
 *  "RotatePicture"は"ピクチャの回転"か"RP"でも代替できます。
 *
 *  例えば、速度が-30で番号1のピクチャを回転するのは、以下の通りとなります。
 *   <RotatePicture: 1, -30>
 *   <ピクチャの回転: 1, -30>
 *   <RP: 1, -30>
 *
 * ○ (20) ピクチャの色調変更
 *  ピクチャの色調変更は以下の記法で指定します。
 *  <TintPicture: ピクチャ番号(整数), オプション1, オプション2>
 *
 *  必須の引数はピクチャ番号だけです。
 *  色調変更にかける時間と色調はオプションとして指定でき、
 *  指定しない場合はデフォルト値が設定されます。
 *
 *  "TintPicture"は"ピクチャの色調変更"か"TP"で代替できます。
 *
 *  オプションの指定方法を述べる前にいくつか具体例を記します。
 *  例1: 以下のデフォルト設定でピクチャの色調を変更する。
 *    - ピクチャ番号: 1
 *    - 時間: 60フレーム, 完了までウェイト(デフォルト設定)
 *    - 色調: 赤0, 緑0, 青0, グレイ0(デフォルト設定)
 *   <TintPicture: 1>
 *   <ピクチャの色調変更: 1>
 *   <TP: 1>
 *
 *  例2: 以下の設定でピクチャの色調を変更する。
 *    - ピクチャ番号: 2
 *    - 時間: 60フレーム, 完了までウェイト(デフォルト設定)
 *    - 色調: 赤0, 緑255, 青255, グレイ0
 *   <TintPicture: 2, ColorTone[0][255][255][0]>
 *   <ピクチャの色調変更: 2, 色調[0][255][255][0]>
 *   <TP: 2, CT[0][255][255][0]>
 *
 *  例3: 以下の設定でピクチャの色調を変更する。
 *    - ピクチャ番号: 3
 *    - 時間: 30フレーム, 完了までウェイト
 *    - 色調: ダーク(赤-68, 緑-68, 青-68, グレイ0)
 *   <TintPicture: 3, Duration[30][Wait for Completion], ColorTone[Dark]>
 *   <ピクチャの色調変更: 3, 時間[30][完了までウェイト], 色調[ダーク]>
 *   <TP: 3, Duration[30][Wait], CT[Dark]>
 *
 *  オプションは順不同です。ピクチャ番号は固定ですが、オプション1,2は
 *  どのような順番で指定しても大丈夫です。
 *
 *  また、時間については、「ピクチャの移動」イベントタグのオプションの記法と
 *  同一なので、そちらをご覧ください。
 *  ここでは、色調の指定方法について記します。
 *
 * ・色調の指定方法
 *   ピクチャの色調は、以下の記法で指定します。
 *   ColorTone[赤の強さ][緑の強さ][青の強さ][グレイの強さ]>
 *
 *   "ColorTone"は"色調"か"CT"で代替できます。
 *
 *   例えば、以下のように設定できます。
 *     - "ColorTone[-68][68][100][0]"
 *     - "色調[-68][68][100][0]"
 *     - "CT[-68][68][100][0]"
 *
 *   [赤の強さ]の部分に指定の文字列を入力することで、RPGツクールMV・MZの機能と
 *   同様に「通常」, 「ダーク」, 「セピア」, 「夕暮れ」,「夜」で設定することが
 *   できます。以下のように色調が対応しています。
 *     - "通常" or "Normal": "ColorTone[0][0][0][0]"
 *     - "ダーク" or "Dark": "ColorTone[-68][-68][-68][0]"
 *     - "セピア" or "Sepia": "ColorTone[34][-34][-68][170]"
 *     - "夕暮れ" or "Sunset": "ColorTone[68][-34][-34][0]"
 *     - "夜" or "Night": "ColorTone[-68][-68][0][68]"
 *
 *   例えば、番号4のピクチャを1秒でセピアに変更する場合は以下のように書けます。
 *   1秒(60フレーム)はデフォルト設定です。
 *     <TintPicture: 4, ColorTone[Sepia]>
 *     <ピクチャの色調変更: 4, ColorTone[セピア]>
 *     <TP: 4, CT[Sepia]>
 *
 *
 * ○ (21) ピクチャの消去
 *  ピクチャの消去は以下の記法で指定します。
 *  <ErasePicture: ピクチャ番号(整数)>
 *
 *  "ErasePicture"は"ピクチャの消去"か"EP"でも代替できます。
 *
 *  例えば、以下のように書くと番号1のピクチャを削除できます。
 *   <ErasePicture: 1>
 *   <ピクチャの消去: 1>
 *   <EP: 1>
 *
 * ○ (22) ウェイト
 *  ウェイトのイベントコマンドは、以下のいずれかの記法でしていします。
 *  <wait: フレーム数(1/60秒)>
 *  <ウェイト: フレーム数(1/60秒)>
 *
 *  例えば以下のように記述すると60フレーム(1秒)のウェイトが組み込まれます。
 *  <wait: 60>
 *
 * ○ (23) 画面のフェードアウト
 *  フェードアウトは以下のいずれかの記法で組み込めます。
 *  <fadeout>
 *  <FO>
 *  <フェードアウト>
 *
 * ○ (24) 画面のフェードイン
 *  フェードインは以下のいずれかの記法で組み込めます。
 *  <fadein>
 *  <FI>
 *  <フェードイン>
 *
 * ○ (25) BGMの演奏
 *  BGMの演奏は、以下のいずれかの記法で指定します。
 *  <PlayBGM: ファイル名, 音量, ピッチ, 位相>
 *  <BGMの演奏: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Castle1をデフォルト設定で演奏
 *   <PlayBGM: Castle1>
 *  例2: Castle2を音量50, ピッチ80, 位相30で演奏
 *   <PlayBGM: Castle2, 50, 80, 30>
 *
 *  BGMを「なし」に設定したい場合は以下のいずれかの記法で指定してください。
 *  <PlayBGM: None>
 *  <PlayBGM: なし>
 *  <StopBGM>
 *
 *  本プラグインを使用する場合は、「None」「なし」というファイル名のBGMは
 *  ご利用できないことにご注意ください。
 *
 *
 * ○ (26) BGMのフェードアウト
 *  BGMのフェードアウトは以下のいずれかの記法で組み込みます。
 *  <FadeoutBGM: 時間(秒)>
 *  <BGMのフェードアウト: 時間(秒)>
 *
 *  例えば、以下のように記述すると3秒でBGMがフェードアウトします。
 *  <FadeoutBGM: 3>
 *  <BGMのフェードアウト: 3>
 *
 * ○ (27) BGMの保存
 *  BGMの保存は以下のいずれかの記法で組み込みます。
 *  <SaveBGM>
 *  <BGMの保存>
 *
 * ○ (28) BGMの再開
 *  BGMの再開は以下のいずれかの記法で組み込みます。
 *  <ReplayBGM>
 *  <BGMの再開>
 *
 * ○ (29) BGSの演奏
 *  BGSの演奏は、以下のいずれかの記法で指定します。
 *  <PlayBGS: ファイル名, 音量, ピッチ, 位相>
 *  <BGSの演奏: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Cityをデフォルト設定で演奏
 *   <PlayBGS: City>
 *  例2: Darknessを音量50, ピッチ80, 位相30で演奏
 *   <PlayBGS: Darkness, 50, 80, 30>
 *
 *  BGSを「なし」に設定したい場合は以下のいずれかの記法で指定してください。
 *  <PlayBGS: None>
 *  <PlayBGS: なし>
 *  <StopBGS>
 *
 *  本プラグインを使用する場合は、「None」「なし」というファイル名のBGSは
 *  ご利用できないことにご注意ください。
 *
 *
 * ○ (30) BGSのフェードアウト
 *  BGSのフェードアウトは以下のいずれかの記法で組み込みます。
 *  <FadeoutBGS: 時間(秒)>
 *  <BGSのフェードアウト: 時間(秒)>
 *
 *  例えば、以下のように記述すると3秒でBGSがフェードアウトします。
 *  <FadeoutBGS: 3>
 *  <BGSのフェードアウト: 3>
 *
 * ○ (31) MEの演奏
 *  MEの演奏は、以下のいずれかの記法で指定します。
 *  <PlayME: ファイル名, 音量, ピッチ, 位相>
 *  <MEの演奏: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Innをデフォルト設定で演奏
 *   <PlayME: Inn>
 *  例2: Mysteryを音量50, ピッチ80, 位相30で演奏
 *   <PlayME: Mystery, 50, 80, 30>
 *
 *  MEを「なし」に設定したい場合は以下のいずれかの記法で指定してください。
 *  <PlayME: None>
 *  <PlayME: なし>
 *  <StopME>
 *
 *  本プラグインを使用する場合は、「None」「なし」というファイル名のMEは
 *  ご利用できないことにご注意ください。
 *
 *
 * ○ (32) SEの演奏
 *  SEの演奏は、以下のいずれかの記法で指定します。
 *  <PlaySE: ファイル名, 音量, ピッチ, 位相>
 *  <SEの演奏: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Attack1をデフォルト設定で演奏
 *   <PlaySE: Attack1>
 *  例2: Attack2を音量50, ピッチ80, 位相30で演奏
 *   <PlaySE: Attack2, 50, 80, 30>
 *
 *  SEを「なし」に設定したい場合は以下のいずれかの記法で指定してください。
 *  <PlaySE: None>
 *  <PlaySE: なし>
 *
 *  本プラグインを使用する場合は、「None」「なし」というファイル名のSEは
 *  ご利用できないことにご注意ください。
 *
 *
 * ○ (33) SEの停止
 *  SEの停止は以下のいずれかの記法で指定します。
 *  <StopSE>
 *  <SEの停止>
 *
 * ○ (34) 戦闘BGMの変更
 *  戦闘BGMの変更は、以下のいずれかの記法で指定します。
 *  <ChangeBattleBGM: ファイル名, 音量, ピッチ, 位相>
 *  <戦闘曲の変更: ファイル名, 音量, ピッチ, 位相>
 *
 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
 *
 *  例1: Battle1をデフォルト設定で演奏
 *   <ChangeBattleBGM: Battle1>
 *  例2: Battle2を音量50, ピッチ80, 位相30で演奏
 *   <ChangeBattleBGM: Battle2, 50, 80, 30>
 *
 *  「なし」に設定したい場合は以下のいずれかの方法で指定してください。
 *  <ChangeBattleBGM: None>
 *  <ChangeBattleBGM: なし>
 *
 *
 * ○ (35) スクリプト
 *  スクリプトのイベントコマンドは、以下のように<script>と</script>で挟み込む
 *  記法で指定します。
 *  <script>
 *   処理させたいスクリプト
 *  </script>
 *
 *  例えば以下のとおりです。
 *  <script>
 *  for(let i = 0; i < 10; i++) {
 *      console.log("今日も一日がんばるぞい！");
 *  }
 *  </script>
 *
 *  このようにテキストファイル中に記載することで、
 *   for(let i = 0; i < 10; i++) {
 *       console.log("今日も一日がんばるぞい！");
 *   }
 *  という内容のスクリプトのイベントコマンドが組み込まれます。
 *  ツクールMV・MZのエディタ上からは12行を超えるスクリプトは記述出来ませんが、
 *  本プラグインの機能では13行以上のスクリプトも組み込めます。
 *  ただし、ツクールMV・MZ上から一度開いて保存してしまうと、13行目以降はロス
 *  トしてしまいます。
 *  別記法として<SC>か、<スクリプト>としても記述できます。
 *  また、
 *  <script>console.log("今日も一日がんばるぞい！");</script>
 *  というように1行で記述することもできます。
 *
 *
 * ○ (36)-1 プラグインコマンド(ツクールMV)
 *  プラグインコマンドのイベントコマンドは、以下のいずれかの記法で指定します。
 *  <plugincommand: プラグインコマンドの内容>
 *  <PC: プラグインコマンドの内容>
 *  <プラグインコマンド: プラグインコマンドの内容>
 *
 *  例えば以下のように記述すると、ItemBook openと入ったプラグインコマンドが
 *  組み込まれます。
 *  <plugincommand: ItemBook open>
 *  <PC: ItemBook open>
 *  <プラグインコマンド: ItemBook open>
 *
 * ○ (36)-2 プラグインコマンド(ツクールMZ, 上級者向け)
 *  プラグインコマンドのイベントコマンドは、以下の記法で指定します。
 *  <PluginCommandMZ: プラグイン名, 関数名, コマンド, 引数[値][注釈],...>
 *
 *  プラグイン名はプラグインファイルの名前です。○○.jsの○○を記入して
 *  ください。Text2Frame.jsの場合は"Text2Frame"となります。
 *
 *  内部関数名はプラグイン内で設定されている関数名を指定してください。
 *  ただし、対応しているプラグイン本体であるJavascriptファイルかdataフォ
 *  ルダ内のJSONファイルから直接確認する必要がある可能性が高いです。
 *  そのため、このタグはある程度プラグインを開発する能力がある方向けと
 *  なります。
 *
 *  コマンドはプラグインコマンド設定ウィンドウで、呼び出すコマンドの
 *  名前を記述してください。
 *
 *  プラグインコマンドのパラメータは、コマンド名以降にカンマ区切りで
 *  "引数の名前[値]"として記述してください。数に制限はありません。
 *  例えば、引数の名前が"FileFolder", 値が"text"の場合は
 *  "FileFolder[text]"と記述してください。
 *  引数の名前は、「プラグインコマンド」ウィンドウの、指定したい引数の
 *  「パラメータ」ウィンドウから確認できます。薄い灰色文字で書かれた
 *  括弧書きされている文字が引数の名前です。
 *  注釈は、ツクールMZ上での表示を正式なものにするために使います。
 *  指定しない場合は、自動で補完します。実行上の違いはありませんが、
 *  ツクールMZ上から設定した場合の表記とは異なります。
 *
 *  "PluginCommandMZ"は"PCZ","プラグインコマンドMZ"でも代替できます。
 *
 *  例えば、TextPictureプラグインで"ほげ"という文字列を画像にする
 *  プラグインコマンドは以下のように設定します。
 *  <PCZ: TextPicture, set, テキストピクチャの設定, text[ほげ]>
 *
 *
 * --------------------------------------
 * 動作確認テキスト
 * --------------------------------------
 * https://github.com/yktsr/Text2Frame-MV/wiki/動作確認テキスト
 * に全機能を使ったテキストを記載しています。
 * 動作確認用にお使いください。
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
    Laurus.Text2Frame.PageID         = "1";
    Laurus.Text2Frame.IsOverwrite    = true;
    Laurus.Text2Frame.CommentOutChar = "%";
    Laurus.Text2Frame.IsDebug        = true;
    Laurus.Text2Frame.DisplayMsg     = true;
    Laurus.Text2Frame.DisplayWarning = true;
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
    Laurus.Text2Frame.PageID         = String(Laurus.Text2Frame.Parameters["Default PageID"]);
    Laurus.Text2Frame.IsOverwrite    = (String(Laurus.Text2Frame.Parameters["IsOverwrite"]) == 'true') ? true : false;
    Laurus.Text2Frame.CommentOutChar = String(Laurus.Text2Frame.Parameters["Comment Out Char"]);
    Laurus.Text2Frame.IsDebug        = (String(Laurus.Text2Frame.Parameters["IsDebug"]) == 'true') ? true : false;
    Laurus.Text2Frame.DisplayMsg     = (String(Laurus.Text2Frame.Parameters["DisplayMsg"]) == 'true') ? true : false;
    Laurus.Text2Frame.DisplayWarning = (String(Laurus.Text2Frame.Parameters["DisplayWarning"]) == 'true') ? true : false;
    Laurus.Text2Frame.TextPath        = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
    Laurus.Text2Frame.MapPath         = `${BASE_PATH}${path.sep}data${path.sep}Map${('000' + Laurus.Text2Frame.MapID).slice(-3)}.json`;
    Laurus.Text2Frame.CommonEventPath = `${BASE_PATH}${path.sep}data${path.sep}CommonEvents.json`;
  }

  const addMessage = function(text){
    if(Laurus.Text2Frame.DisplayMsg){
      $gameMessage.add(text);
    }
  };

  const addWarning = function(warning){
    if(Laurus.Text2Frame.DisplayWarning){
      $gameMessage.add(warning);
    }
  };

  const getDefaultPage = function(){
    return {
      "conditions":{
        "actorId":1,
        "actorValid":false,
        "itemId":1,
        "itemValid":false,
        "selfSwitchCh":"A",
        "selfSwitchValid":false,
        "switch1Id":1,
        "switch1Valid":false,
        "switch2Id":1,
        "switch2Valid":false,
        "variableId":1,
        "variableValid":false,
        "variableValue":0
      },
      "directionFix":false,
      "image": {"characterIndex":0,"characterName":"","direction":2,"pattern":0,"tileId":0},
      "list":[
        {"code":0,"indent":0,"parameters":[]}
      ],
      "moveFrequency":3,
      "moveRoute": {
        "list":[{"code":0,"parameters":[]}],
        "repeat":true,"skippable":false,"wait":false
      },
      "moveSpeed":3,
      "moveType":0,
      "priorityType":0,
      "stepAnime":false,
      "through":false,
      "trigger":0,
      "walkAnime":true
    }
  };

  //=============================================================================
  // Game_Interpreter
  //=============================================================================

  // for MZ plugin command
  if(typeof PluginManager != 'undefined' && PluginManager.registerCommand){
    PluginManager.registerCommand('Text2Frame', 'IMPORT_MESSAGE_TO_EVENT', function(args) {
      let file_folder = args.FileFolder;
      let file_name = args.FileName;
      let map_id = args.MapID;
      let event_id = args.EventID;
      let page_id = args.PageID;
      let is_overwrite = args.IsOverwrite;
      this.pluginCommand('IMPORT_MESSAGE_TO_EVENT',
                         [file_folder, file_name, map_id, event_id, page_id, is_overwrite]);
    });
    PluginManager.registerCommand('Text2Frame', 'IMPORT_MESSAGE_TO_CE', function(args) {
      let file_folder = args.FileFolder;
      let file_name = args.FileName;
      let common_event_id = args.CommonEventID;
      let is_overwrite = args.IsOverwrite;
      this.pluginCommand('IMPORT_MESSAGE_TO_CE',
                         [file_folder, file_name, common_event_id, is_overwrite]);
    });
  }

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
        addMessage('import message to event. \n/ メッセージをイベントにインポートします。');
        if(args[0]) Laurus.Text2Frame.FileFolder = args[0];
        if(args[1]) Laurus.Text2Frame.FileName = args[1];
        if(args[2]) Laurus.Text2Frame.MapID = args[2];
        if(args[3]) Laurus.Text2Frame.EventID = args[3];
        if(args[4] && (args[4].toLowerCase() === 'true' || args[4].toLowerCase() === 'false')) {
          Laurus.Text2Frame.IsOverwrite = args[4].toLowerCase() === 'true' ? true : false;
          addWarning('【警告】5番目の引数に上書き判定を設定することは非推奨に');
          addWarning('なりました。ページIDを設定してください。上書き判定は6番');
          addWarning('目に設定してください。(警告はオプションでOFFにできます)');
        } else if(args[4]) {
          Laurus.Text2Frame.PageID = args[4];
        }
        if(args[5] && args[5].toLowerCase() === 'true') Laurus.Text2Frame.IsOverwrite = true;
        if(args[0] || args[1]) {
          Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
          Laurus.Text2Frame.MapPath  = `${BASE_PATH}${path.sep}data${path.sep}Map${('000' + Laurus.Text2Frame.MapID).slice(-3)}.json`;
        }
        break;
      case 'IMPORT_MESSAGE_TO_CE' :
      case 'メッセージをコモンイベントにインポート' :
        if(args.length == 4){
          addMessage('import message to common event. \n/ メッセージをコモンイベントにインポートします。');
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

    /* 改行コードを統一する関数 */
    const uniformNewLineCode = function(text) {
      return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    };

    /* コメントアウト行を削除する関数 */
    const eraseCommentOutLines = function(scenario_text, commentOutChar) {
      // 一度改行毎にsplitして、要素毎にチェックして最後にひとつのテキストに結合する。
      let re = new RegExp("^ *" + commentOutChar);
      return scenario_text.split("\n").filter(x => ! x.match(re)).join('\n');
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

    const getChoiceWindowPosition = function(windowPosition){
      switch(windowPosition.toUpperCase()){
        case 'LEFT':
        case '左':
          return 0;
        case 'MIDDLE':
        case '中':
          return 1;
        case 'RIGHT':
        case '右':
          return 2;
        default:
          throw new Error('Syntax error. / 文法エラーです。');
      }
    };

    const getPretextEvent = function(){
      return {"code": 101, "indent": 0, "parameters": ["", 0, 
              getBackground(Laurus.Text2Frame.Background), 
              getWindowPosition(Laurus.Text2Frame.WindowPosition), ""]}
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

    const getPluginCommandEventMZ = function(
      plugin_name, plugin_command, disp_plugin_command, args){
      let plugin_args = {};
      let plugin_command_mz = {"code": 357, "indent": 0, "parameters": [
        plugin_name, plugin_command, disp_plugin_command, plugin_args
      ]};
      let arg_regexp = /([^[\]]+)(\[.+\])/i;
      for(let i=0; i < args.length; i++){
        let matched = args[i].match(arg_regexp);
        if(matched){
          let arg_name = matched[1] || '';
          let values = matched[2].slice(1, -1).split('][') || [];
          plugin_args[arg_name] = values[0] || '';
        }
      }
      return plugin_command_mz;
    };

    const getPluginCommandMzParamsComment = function(plugin_command_mz_arg){
      let arg_regexp = /([^[\]]+)(\[.+\])/i;
      let matched = plugin_command_mz_arg.match(arg_regexp);
      if(matched){
        let arg_name = matched[1] || '';
        let values = matched[2].slice(1, -1).split('][') || [];
         let value = values[0] || '';
         if(values[1]) {
           arg_name = values[1];
         }
        var parameters = [arg_name + " = " + value];
      }
      return {"code": 657, "indent": 0, "parameters": parameters};
    };
    const getCommonEventEvent = function(num){
      let common_event = {"code": 117, "indent": 0, "parameters": [""]};
      common_event["parameters"][0] = num;
      return common_event;
    };
    
    const getCommentOutHeadEvent = function(text){
      let comment_out = {"code": 108, "indent": 0, "parameters": [""]};
      comment_out["parameters"][0] = text;
      return comment_out;
    };
    const getCommentOutBodyEvent = function(text){
      let comment_out = {"code": 408, "indent": 0, "parameters": [""]};
      comment_out["parameters"][0] = text;
      return comment_out;
    };

    const getScrollingTextHeadEvent = function(scrolling_speed, enable_auto_scroll){
      let scrolling_text = {"code": 105, "indent": 0, "parameters": [2, false]};
      if(scrolling_speed){
        scrolling_text['parameters'][0] = scrolling_speed;
      }
      if(enable_auto_scroll){
        switch(enable_auto_scroll.toLowerCase()){
          case 'on':
          case 'オン':
          case 'true':
          case 'no fast forward':
          case '1':{
            scrolling_text['parameters'][1] = true;
            break;
          }
          case 'off':
          case 'オフ':
          case 'false':
          case '0':{
            scrolling_text['parameters'][1] = false;
            break;
          }
        }
      }
      return scrolling_text;
    };
    const getScrollingTextBodyEvent = function(text){
      return {"code": 405, "indent": 0, "parameters": [text]};
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

    const getControlSwitch = function(start_pointer, end_pointer, value){
      switch(value.toLowerCase()){
        case 'on':
        case 'オン':
        case '1':
        case 'true':{
          return {"code": 121, "indent": 0, "parameters": [parseInt(start_pointer), parseInt(end_pointer), 0]};
        }
        case 'off':
        case 'オフ':
        case '0':
        case 'false':{
          return {"code": 121, "indent": 0, "parameters": [parseInt(start_pointer), parseInt(end_pointer), 1]};
        }
      }
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
            case '敵キャラ':
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
              if(operand_arg1 == 'enemy' || operand_arg1 == '敵キャラ' || operand_arg1 == 'エネミー'){
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
            case 'last':
            case '直前':
              parameters.push(8);
              switch(operand_arg2.toLowerCase()){
                case 'last used skill id':
                case '直前に使用したスキルのid':
                case 'used skill id':{
                  parameters.push(0);
                  break;
                }
                case 'last used item id':
                case '直前に使用したアイテムのid':
                case 'used item id':{
                  parameters.push(1);
                  break;
                }
                case 'last actor id to act':
                case '直前に行動したアクターのid':
                case 'actor id to act':{
                  parameters.push(2);
                  break;
                }
                case 'last enemy index to act':
                case '直前に行動した敵キャラのインデックス':
                case 'enemy index to act':{
                  parameters.push(3);
                  break;
                }
                case 'last target actor id':
                case '直前に対象となったアクターのid':
                case 'target actor id':{
                  parameters.push(4);
                  break;
                }
                case 'last target enemy index':
                case '直前に対象となった敵キャラのインデックス':
                case 'target enemy index':{
                  parameters.push(5);
                  break;
                }
                default:{
                  parameters.push(0);
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

    const getControlSelfSwitch = function(target, value){
      switch(value.toLowerCase()){
        case 'on':
        case 'オン':
        case '1':
        case 'true':{
          return {"code": 123, "indent": 0, "parameters": [target.toUpperCase(), 0]};
        }
        case 'off':
        case 'オフ':
        case '0':
        case 'false':{
          return {"code": 123, "indent": 0, "parameters": [target.toUpperCase(), 1]};
        }
        default:
          return {"code": 123, "indent": 0, "parameters": [target.toUpperCase(), 1]};
      }
    };

    const getControlTimer = function(operation, sec){
      switch(operation.toLowerCase()){
        case 'start':
        case '始動':
        case 'スタート':{
          return {"code": 124, "indent": 0, "parameters": [0, parseInt(sec)]};
        }
        case 'stop':
        case '停止':
        case 'ストップ':{
          return {"code": 124, "indent": 0, "parameters": [1, parseInt(sec)]};
        }
        default:
          return {"code": 124, "indent": 0, "parameters": [1, parseInt(sec)]};
      }
    };
    /*************************************************************************************************************/
    const getBlockStatement = function(scenario_text, statement){
      let block_map = {};
      let block_count = 0;
      let re = null;
      let event_head_func = function(){};
      let event_body_func = function(){};

      switch(statement.toLowerCase()){
        case 'script':{
          re = /<script>([\s\S]*?)<\/script>|<sc>([\s\S]*?)<\/sc>|<スクリプト>([\s\S]*?)<\/スクリプト>/i;
          event_head_func = getScriptHeadEvent;
          event_body_func = getScriptBodyEvent;
          break;
        }
        case 'comment':{
          re = /<comment>([\s\S]*?)<\/comment>|<co>([\s\S]*?)<\/co>|<注釈>([\s\S]*?)<\/注釈>/i;
          event_head_func = getCommentOutHeadEvent;
          event_body_func = getCommentOutBodyEvent;
          break;
        }
        case 'scrolling':{
          let block = scenario_text.match(/<ShowScrollingText\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/ShowScrollingText>/i)
            || scenario_text.match(/<sst\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/sst>/i)
            || scenario_text.match(/<文章のスクロール表示\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/文章のスクロール表示>/i);
          while(block !== null){
            let match_block = block[0];
            let scrolling_speed = Number(block[1]);
            let enable_auto_scroll = block[2];
            let scrolling_text = block[3];
            let match_text_list = scrolling_text.replace(/^\n/,'').replace(/\n$/,'').split('\n');
            let event_list = [];

            event_list.push(getScrollingTextHeadEvent(scrolling_speed, enable_auto_scroll));
            event_list = event_list.concat(match_text_list.map(t => getScrollingTextBodyEvent(t)));
            block_map[`#${statement.toUpperCase()}_BLOCK${block_count}#`] = event_list;

            scenario_text = scenario_text.replace(match_block, `\n#${statement.toUpperCase()}_BLOCK${block_count}#\n`);
            block_count++;

            block = scenario_text.match(/<ShowScrollingText\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/ShowScrollingText>/i)
              || scenario_text.match(/<sst\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/sst>/i)
              || scenario_text.match(/<文章のスクロール表示\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/文章のスクロール表示>/i);
          }
          return {scenario_text, block_map};
        }
      }

      let block = scenario_text.match(re);
      while(block !== null){
        let match_block = block[0];
        let match_text = block[1] || block[2] || block[3];
        scenario_text = scenario_text.replace(match_block, `\n#${statement.toUpperCase()}_BLOCK${block_count}#\n`);
        let match_text_list = match_text.replace(/^\n/,'').replace(/\n$/,'').split('\n');
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

    const getDefaultPictureOptions = function() {
      return {
        "origin": 0, // 0: UpperLeft, 1:Center
        "variable": 0, // 0: Constant, 1: Variable
        // if variable is 0, x and y are  a constant values.
        // if variable is 1, x is a number of variables
        "x": 0, "y": 0,
        "width": 100, "height": 100, //%
        "opacity": 255, "blend_mode": 0, // 0:Normal, 1:Additive, 2:Multiply, 3:Screen
        "duration": 60, "wait": true,  // for a function that move a picture
        "red": 0, "green": 0, "blue": 0, "gray": 0,  // for a function that tints a picture.
        "easing": 0 // for MZ
      };
    };

    const getPictureOptions = function(option_str) {
      let out = {};
      let option_regexp = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])/i;
      let option = option_str.match(option_regexp);
      if(option){
        let key = option[1] || '';
        let values = option[2].slice(1, -1).split('][') || '';
        switch(key.toLowerCase()){
          case "position":
          case "位置":{
            let origin = values[0] || 'Upper Left';
            if(origin.toLowerCase() == 'center' || origin == '中央'){
              out["origin"] = 1;
            }
            let constant_regexp = /^[0-9]+$/;
            let variable_regexp = /(?:variables|v|変数)\[([0-9]+)\]/i;
            let x = values[1] || '0';
            if(x.match(constant_regexp)){
              out["variable"] = 0;
              out["x"] = Number(x);
            }else{
              let v = x.match(variable_regexp);
              if(v){
                out["variable"] = 1;
                out["x"] = Number(v[1])
              }
            }
            let y = values[2] || '0';
            if(y.match(constant_regexp)){
              out["variable"] = 0;
              out["y"] = Number(y);
            }else{
              let v = y.match(variable_regexp);
              if(v){
                out["variable"] = 1;
                out["y"] = Number(v[1]);
              }
            }
            break;
          }
          case "scale":
          case "拡大率":{
            out["width"] = Number(values[0]) || 100;
            out["height"] = Number(values[1]) || 100;
            break;
          }
          case "blend":
          case '合成':{
            out["opacity"] = Number(values[0]) || 255;
            out["blend_mode"] = ({
              "normal": 0, "通常": 0,
              "additive": 1, "加算": 1,
              "multiply": 2, "乗算": 2,
              "screen": 3, "スクリーン": 3
            })[values[1].toLowerCase()] || 0;
            break;
          }
          case "duration":
          case "時間":{
            out["duration"] = Number(values[0]) || 60;
            if(typeof(values[1]) == "undefined" || values[1] == ""){
              out["wait"] = false;
            }
            break;
          }
          case "colortone":
          case "色調":
          case "ct": {
            let firstValue = values[0].toLowerCase() || 0;
            switch(firstValue){
              case "normal":
              case "通常": {
                out["red"] = 0;
                out["green"] = 0;
                out["blue"] = 0;
                out["gray"] = 0;
                break;
              }
              case "dark":
              case "ダーク": {
                out["red"] = -68;
                out["green"] = -68;
                out["blue"] = -68;
                out["gray"] = 0;
                break;
              }
              case "sepia":
              case "セピア": {
                out["red"] = 34;
                out["green"] = -34;
                out["blue"] = -68;
                out["gray"] = 170;
                break;
              }
              case "sunset":
              case "夕暮れ": {
                out["red"] = 68;
                out["green"] = -34;
                out["blue"] = -34;
                out["gray"] = 0;
                break;
              }
              case "night":
              case "夜": {
                out["red"] = -68;
                out["green"] = -68;
                out["blue"] = 0;
                out["gray"] = 68;
                break;
              }
              default: {
                out["red"] = Number(values[0]) || 0;
                out["green"] = Number(values[1]) || 0;
                out["blue"] = Number(values[2]) || 0;
                out["gray"] = Number(values[3]) || 0;
                break;
              }
            }
            break;
          }
        case "easing":
        case "イージング": {
          let easingMode = values[0].toLowerCase() || "inear";
          out["easing"] = {
            "constant speed": 0, "一定速度": 0, "linear": 0,
            "slow start": 1, "ゆっくり始まる": 1, "ease-in": 1,
            "slow end": 2, "ゆっくり終わる": 2, "ease-out": 2,
            "slow start and end": 3, "ゆっくり始まってゆっくり終わる": 3,
            "ease-in-out": 3}[easingMode];
          break;
          }
        }
      }
      return out;
    };

    const getShowPicture = function(pic_no, name, options=[]) {
      let ps = getDefaultPictureOptions();
      options.map(x => Object.assign(ps, getPictureOptions(x)));
      return {"code": 231, "indent": 0,
              "parameters": [pic_no, name,
                             ps.origin, ps.variable,
                             ps.x, ps.y, ps.width, ps.height,
                             ps.opacity, ps.blend_mode]
             };
    };

    const getMovePicture = function(pic_no, options=[]) {
      let ps = getDefaultPictureOptions();
      options.map(x => Object.assign(ps, getPictureOptions(x)));
      return {"code": 232, "indent": 0,
              "parameters": [pic_no, 0,
                             ps.origin, ps.variable,
                             ps.x, ps.y, ps.width, ps.height,
                             ps.opacity, ps.blend_mode,
                             ps.duration, ps.wait, ps.easing]};
    };

    const getRotatePicture = function(pic_no, speed) {
      return {"code": 233,  "indent": 0, "parameters": [pic_no, speed]};
    };

    const getTintPicture = function(pic_no, options=[]) {
      let ps = getDefaultPictureOptions();
      options.map(x => Object.assign(ps, getPictureOptions(x)));
      return {"code": 234, "indent": 0,
              "parameters": [pic_no,
                             [ps.red, ps.green, ps.blue, ps.gray],
                             ps.duration, ps.wait]};
    };

    const getErasePicture = function(pic_no) {
      return {"code": 235, "indent": 0, "parameters": [pic_no]}
    };

    const getIfSwitchParameters = function(switchId, params){
      switchId = Math.max(Number(switchId) || 1, 1);
      if(typeof(params[0]) == "undefined"){
        return [0, switchId, 0];
      }
      const value = ({"on": 0, "オン": 0,
                      "true": 0, "1": 0,
                      "off": 1, "オフ": 1,
                      "false": 1, "0": 1})[params[0].toLowerCase()];
      if(switchId > 0 && (value == 1 || value == 0)){
        return [0, switchId, value];
      }
      return [0, switchId, 0];
    };

    const getIfVariableParameters = function(variableId, params){
      variableId = Math.max(Number(variableId) || 1, 1);
      const operator = {
        "==": 0, "＝": 0, ">=": 1, "≧": 1, "<=": 2, "≦": 2,
        ">": 3, "＞": 3, "<": 4, "＜": 4, "!=": 5, "≠": 5
      }[params[0]] || 0
      const constant_regexp = /^\d+$/;
      const variable_regexp = /(?:variables|v|変数)\[([0-9]+)\]/i;
      const operand = params[1] || "0";
      if(operand.match(constant_regexp)){
        return [1, variableId, 0, Number(operand), operator];
      }else if(operand.match(variable_regexp)){
        const value = Math.max(Number(operand.match(variable_regexp)[1]), 1);
        return [1, variableId, 1, value, operator];
      }
      return [1, variableId, 0, 0, 0];
    };

    const getIfSelfSwitchParameters = function(selfSwitchId, params){
      selfSwitchId = selfSwitchId.toUpperCase();
      switch(selfSwitchId){
        case "A":
        case "B":
        case "C":
        case "D": break;
        default: selfSwitchId = "A";
      }
      if(typeof(params[0]) == "undefined"){
        return [2, selfSwitchId, 0];
      }
      const value = ({"on": 0, "オン": 0,
                    "true": 0, "1": 0,
                    "off": 1, "オフ": 1,
                    "false": 1, "0": 1})[params[0].toLowerCase()];
      if(value == 0 || value == 1){
        return [2, selfSwitchId, value];
      }
      return [2, selfSwitchId, 0];
    };

    const getIfTimerParameters = function(params){
      const condition = {
        ">=": 0, "≧": 0,
        "<=": 1, "≦": 1
      }[params[0]] || 0;
      const minute = Number(params[1]) || 0;
      const second = Number(params[2]) || 0;
      return [3, 60 * minute + second, condition];
    };

    const getIfActorParameters = function(actorId, params){
      actorId = Math.max(Number(actorId) || 1, 1);
      const actor_mode = {
        "in the party": 0, "パーティにいる": 0,
        "name": 1, "名前": 1, "class": 2, "職業": 2,
        "skill": 3, "スキル": 3, "weapon": 4, "武器": 4,
        "armor": 5, "防具": 5, "state": 6, "ステート": 6
      }[params[0].toLowerCase()] || 0;
      if(actor_mode > 0){
        if(actor_mode == 1){
          return  [4, actorId, 1, params[1]];
        }
        else if(Number(params[1])){
          return [4, actorId, actor_mode, Math.max(Number(params[1]), 1)];
        }
      }
      return [4, actorId, 0];
    };

    const getIfEnemyParameters = function(enemyId, params){
      enemyId = Math.max(Number(enemyId) || 1, 1) - 1;
      const condition = (params[0] || "appeared").toLowerCase();
      const state_id = Math.max(Number(params[1]) || 1, 1);
      if(condition == "appeared" || condition == "出現している"){
        return [5, enemyId, 0];
      }else if(condition == "state" || condition == "ステート"){
        return [5, enemyId, 1, state_id];
      }else{
        return [5, enemyId, 0];
      }
    };

    const getIfCharacterParameters = function(character, params){
      let characterId = {
        "player": -1, "プレイヤー": -1,
        "thisevent": 0, "このイベント": 0,
      }[character.toLowerCase()];
      if(typeof(characterId) == "undefined"){
        characterId = Math.max(Number(character) || 0, -1);
      }
      const direction = {
        "down": 2, "下": 2, "2": 2,
        "left": 4, "左": 4, "4": 4,
        "right": 6, "右": 6, "6": 6,
        "up": 8, "上": 8, "8": 8
      }[(params[0] || "").toLowerCase()] || 2;
      return [6, characterId, direction];
    };

    const getIfVehicleParameters = function(params){
      const vehicle = {
        "boat": 0, "小型船": 0,
        "ship": 1, "大型船": 1,
        "airship": 2, "飛行船": 2
      }[(params[0] || "").toLowerCase()] || 0
      return [13, vehicle];
    };

    const getIfGoldParameters = function(params){
      const condition = {
        ">=": 0, "≧": 0,
        "<=": 1, "≦": 1,
        "<": 2, "＜": 2
      }[params[0]] || 0;
      const gold = Number(params[1]) || 0;
      return [7, gold, condition];
    };

    const getIfItemParameters = function(itemId){
      itemId = Math.max(Number(itemId) || 1, 1);
      return [8, itemId];
    };

    const getIfWeaponParameters = function(weaponId, params){
      weaponId = Math.max(Number(weaponId) || 1, 1);
      let include_equipment = false;
      if(params[0]) include_equipment = true;
      return [9, weaponId, include_equipment];
    };

    const getIfArmorParameters = function(armorId, params){
      armorId = Math.max(Number(armorId) || 1, 1);
      let include_equipment = false;
      if(params[0]) include_equipment = true;
      return [10, armorId, include_equipment];
    };

    const getIfButtonParameters = function(params){
      let button = {
        "ok": "ok", "決定": "ok",
        "cancel": "cancel",  "キャンセル": "cancel",
        "shift": "shift",  "シフト": "shift",
        "down": "down",  "下": "down",
        "left": "left", "左": "left",
        "right": "right", "右": "right",
        "up": "up", "上": "up",
        "pageup": "pageup", "ページアップ": "pageup",
        "pagedown": "pagedown", "ページダウン" : "pagedown"
      }[(params[0] || "").toLowerCase()] || "ok";
      let how = {
        "is being pressed": 0, "が押されている": 0, "pressed": 0,
        "is being triggered": 1, "がトリガーされている": 1, "triggered": 1,
        "is being repeated": 2, "がリピートされている": 2, "repeated": 2
      }[(params[1] || "").toLowerCase()] || 0;
      return [11, button, how];
    };

    const getIfScriptParameters = function(params){
      return [12, params.join(",").trim()];
    };

    const getConditionalBranch = function(target, params){
      let out = {"code": 111, "indent": 0, "parameters": [0, 1, 0]}; // default
      let target_regexp = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])*/i;
      target = target.match(target_regexp);
      let mode = target[1];
      let mode_value = (target[2] || "").replace(/[[\]]/g, "");
      switch(mode.toLowerCase()){
        case "script":
        case "スクリプト":
        case "sc":
          break;
        default:
          params = params.map(s => s.trim());
          break;
      }
      switch(mode.toLowerCase()){
        case "switches":
        case "スイッチ":
        case "sw":{
          out.parameters = getIfSwitchParameters(mode_value, params);
          break;
        }
        case "variables":
        case "変数":
        case "v":{
          out.parameters = getIfVariableParameters(mode_value, params);
          break;
        }
        case "selfswitches":
        case "セルフスイッチ":
        case "ssw":{
          out.parameters = getIfSelfSwitchParameters(mode_value, params);
          break;
        }
        case "timer":
        case "タイマー": {
          out.parameters = getIfTimerParameters(params);
          break;
        }
        case "actors":
        case "アクター": {
          out.parameters = getIfActorParameters(mode_value, params);
          break;
        }
        case "enemies":
        case "敵キャラ":
        case "エネミー": {
          out.parameters = getIfEnemyParameters(mode_value, params);
          break;
        }
        case "characters":
        case "キャラクター": {
          out.parameters = getIfCharacterParameters(mode_value, params);
          break;
        }
        case "vehicle":
        case "乗り物": {
          out.parameters = getIfVehicleParameters(params);
          break;
        }
        case "gold":
        case "お金": {
          out.parameters = getIfGoldParameters(params);
          break;
        }
        case "items":
        case "アイテム": {
          out.parameters = getIfItemParameters(mode_value);
          break;
        }
        case "weapons":
        case "武器": {
          out.parameters = getIfWeaponParameters(mode_value, params);
          break;
        }
        case "armors":
        case "防具": {
          out.parameters = getIfArmorParameters(mode_value, params);
          break;
        }
        case "button":
        case "ボタン": {
          out.parameters = getIfButtonParameters(params);
          break;
        }
        case "script":
        case "スクリプト":
        case "sc": {
          out.parameters = getIfScriptParameters(params);
          break;
        }
      }
      return out;
    };

    const getElse = function(){
      return {"code": 411, "indent": 0, "parameters": []};
    };

    const getEnd = function(){
      return {"code": 412, "indent": 0, "parameters": []};
    };

    const getLoop = function(){
      return {"code": 112, "indent": 0, "parameters": []};
    };

    const getRepeatAbove = function(){
      return {"code": 413, "indent": 0, "parameters": []};
    };

    const getBreakLoop = function(){
      return {"code": 113, "indent": 0, "parameters": []};
    };

    const getBlockEnd = function(){
      return {"code": 0, "indent": 0, "parameters": []};
    };

    const getExitEventProcessing = function(){
      return {"code": 115, "indent": 0, "parameters": []};
    };

    const getLabel = function(name){
      return {"code": 118, "indent": 0, "parameters": [name]};
    };

    const getJumpToLabel = function(name){
      return {"code": 119, "indent": 0, "parameters": [name]};
    };

    const getInputNumber = function(val_num, num_of_digits){
      return {"code": 103, "indent": 0, "parameters": [val_num, num_of_digits]};
    };

    const getSelectItem = function(val_num, item_type){
      let item_type_num = 1;
      switch(item_type.trim().toLowerCase()){
        case "Regular Item".toLowerCase():
        case "通常アイテム".toLowerCase():{
          item_type_num = 1;
          break;
        }
        case "Key Item".toLowerCase():
        case "大事なもの".toLowerCase():{
          item_type_num = 2;
          break;
        }
        case "Hidden Item A".toLowerCase():
        case "隠しアイテムA".toLowerCase():{
          item_type_num = 3;
          break;
        }
        case "Hidden Item B".toLowerCase():
        case "隠しアイテムB".toLowerCase():{
          item_type_num = 4;
          break;
        }
      }
      return {"code": 104, "indent": 0, "parameters": [val_num, item_type_num]};
    };

    const getShowChoices = function(window_type, window_position, default_choice, default_cancel){
      return {"code": 102, "indent": 0, "parameters": [[], default_cancel, default_choice, window_position, window_type]};
    };

    const getShowChoiceWhen = function(index, text){
      return {"code": 402, "indent": 0, "parameters": [index, text]};
    };

    const getShowChoiceWhenCancel = function(){
      return {"code": 403, "indent": 0, "parameters": [6, null]};
    };

    const getShowChoiceEnd = function(){
      return {"code": 404, "indent": 0, "parameters": []};
    };

    const completeLackedBottomEvent = function(events){
      const BOTTOM_CODE = 0;
      const IF_CODE = 111;
      const ELSE_CODE = 411;
      const LOOP_CODE = 112;

      const stack = events.reduce((s, e) => {
        const code = e.code;
        if(code == IF_CODE) s.push(IF_CODE);
        else if(code == ELSE_CODE) s.push(ELSE_CODE);
        else if(code == BOTTOM_CODE) s.pop();
        return s;
      }, []);

      const bottom = stack.reduce((b, code) => {
        b.push(getCommandBottomEvent());
        if(code == IF_CODE) b.push(getEnd());
        else if(code == ELSE_CODE) b.push(getEnd());
        else if(code == LOOP_CODE) b.push(getRepeatAbove());
        return b;
      }, []);

      return events.concat(bottom);
    };

    const _getEvents = function(text, frame_param, block_stack){
      let face = text.match(/<face *: *(.+?)>/i)
        || text.match(/<FC *: *(.+?)>/i)
        || text.match(/<顔 *: *(.+?)>/i);
      let window_position = text.match(/<windowposition *: *(.+?)>/i)
        || text.match(/<WP *: *(.+?)>/i)
        || text.match(/<位置 *: *(.+?)>/i);
      let background = text.match(/<background *: *(.+?)>/i)
        || text.match(/<BG *: *(.+?)>/i)
        || text.match(/<背景 *: *(.+?)>/i);
       let namebox = text.match(/<name *: ?(.+?)>/i)
        || text.match(/<NM *: ?(.+?)>/i)
        || text.match(/<名前 *: ?(.+?)>/i);
      let plugin_command = text.match(/<plugincommand *: *(.+?)>/i)
        || text.match(/<PC *: *(.+?)>/i)
        || text.match(/<プラグインコマンド *: *(.+?)>/i);
      let plugin_command_mz = text.match(/<plugincommandmz\s*:\s*([^\s].*)>/i)
        || text.match(/<PCZ\s*:\s*([^\s].*)>/i)
        || text.match(/<プラグインコマンドmz\s*:\s*([^\s].*)>/i);
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
      let show_picture = text.match(/<showpicture\s*:\s*([^\s].*)>/i)
        || text.match(/<ピクチャの表示\s*:\s*([^\s].+)>/i)
        || text.match(/<SP\s*:\s*([^\s].+)>/i);
      let move_picture = text.match(/<movepicture\s*:\s*([^\s].*)>/i)
        || text.match(/<ピクチャの移動\s*:\s*([^\s].*)>/i)
        || text.match(/<MP\s*:\s*([^\s].*)>/i);
      let rotate_picture = text.match(/<rotatepicture\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i)
        || text.match(/<ピクチャの回転\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i)
        || text.match(/<RP\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i);
      let tint_picture = text.match(/<tintpicture\s*:\s*([^\s].*)>/i)
        || text.match(/<ピクチャの色調変更\s*:\s*([^\s].*)>/i)
        || text.match(/<TP\s*:\s*([^\s].*)>/i);
      let erase_picture = text.match(/<erasepicture\s*:\s*(\d{1,2})\s*>/i)
        || text.match(/<ピクチャの消去\s*:\s*(\d{1,2})\s*>/i)
        || text.match(/<ep\s*:\s*(\d{1,2})\s*>/i);
      let conditional_branch_if = text.match(/\s*<if\s*:\s*([^\s].*)>/i)
        || text.match(/\s*<条件分岐\s*:\s*([^\s].*)>/i);
      let conditional_branch_else = text.match(/\s*<else>/i)
        || text.match(/\s*<それ以外のとき>/);
      let conditional_branch_end = text.match(/\s*<end>/i)
        || text.match(/\s*<分岐終了>/);
      let loop = text.match(/\s*<loop>/i)
        || text.match(/\s*<ループ>/);
      let repeat_above = text.match(/<repeatabove>/i)
        || text.match(/\s*<以上繰り返し>/)
        || text.match(/\s*<ra>/i);
      let break_loop = text.match(/<breakloop>/i)
        || text.match(/<ループの中断>/)
        || text.match(/<BL>/i);
      let exit_event_processing = text.match(/<ExitEventProcessing>/i)
        || text.match(/<イベント処理の中断>/)
        || text.match(/<EEP>/i);
      let label = text.match(/<label\s*:\s*(\S+)\s*>/i)
        || text.match(/<ラベル\s*:\s*(\S+)\s*>/i);
      let jump_to_label = text.match(/<jumptolabel\s*:\s*(\S+)\s*>/i)
        || text.match(/<ラベルジャンプ\s*:\s*(\S+)\s*>/)
        || text.match(/<jtl\s*:\s*(\S+)\s*>/i);
      let input_number = text.match(/<InputNumber\s*:\s*(\d+),\s*(\d+)>/i)
        || text.match(/<INN\s*:\s*(\d+),\s*(\d+)>/i)
        || text.match(/<数値入力の処理\s*:\s*(\d+),\s*(\d+)>/i);
      let select_item = text.match(/<SelectItem\s*:\s*(\d+),\s*([\s\S]+)\s*>/i)
        || text.match(/<SI\s*:\s*(\d+),\s*([\s\S]+)\s*>/i)
        || text.match(/<アイテム選択の処理\s*:\s*(\d+),\s*([\s\S]+)\s*>/i);
      let show_choices = text.match(/<ShowChoices\s*:*\s*([\s\S]*)>/i)
        || text.match(/<SHC\s*:*\s*([\s\S]*)>/i)
        || text.match(/<選択肢の表示\s*:*\s*([\s\S]*)>/i);
      let show_choice_when = text.match(/<When\s*:\s*([\s\S]+)>/i) || text.match(/<選択肢\s*:\s*([\s\S]+)>/i);
      let show_choice_when_cancel = text.match(/<WhenCancel>/i) || text.match(/<キャンセルのとき>/i);

      const script_block = text.match(/#SCRIPT_BLOCK[0-9]+#/i);
      const comment_block = text.match(/#COMMENT_BLOCK[0-9]+#/i);
      const scrolling_block = text.match(/#SCROLLING_BLOCK[0-9]+#/i);

      // Script Block
      if(script_block){
        const block_tag = script_block[0];
        return block_map[block_tag];
      }

      // Comment Block
      if(comment_block){
        const block_tag = comment_block[0];
        return block_map[block_tag];
      }

      // Scrolling Block
      if(scrolling_block){
        const block_tag = scrolling_block[0];
        return block_map[block_tag];
      }

      // Plugin Command
      if(plugin_command){
        return [getPluginCommandEvent(plugin_command[1])];
      }

      // Plugin Command MZ
      if(plugin_command_mz){
        let params = plugin_command_mz[1].split(',').map(s => s.trim());
        let event_command_list = [];
        if(params.length > 2){
          let arg_plugin_name = params[0];
          let arg_plugin_command = params[1];
          let arg_disp_plugin_command = params[2];
          let pcz_args = params.slice(3);
          let pcemz = getPluginCommandEventMZ(
            arg_plugin_name,
            arg_plugin_command,
            arg_disp_plugin_command,
            pcz_args
          );
          event_command_list.push(pcemz);
          pcz_args.map(arg => event_command_list.push(getPluginCommandMzParamsComment(arg)))
        }else{
          throw new Error('Syntax error. / 文法エラーです。'
                          + text.replace(/</g, '  ').replace(/>/g, '  '));
        }
        return event_command_list;
      }

      // Common Event
      if(common_event){
        let event_num = Number(common_event[1]);
        if(event_num){
          return [getCommonEventEvent(event_num)];
        }else{
          throw new Error('Syntax error. / 文法エラーです。'
            + common_event[1] + ' is not number. / '
            + common_event[1] + 'は整数ではありません');
        }
      }

      // Wait
      if(wait){
        let wait_num = Number(wait[1]);
        if(wait_num){
          return [getWaitEvent(wait_num)];
        }else{
          throw new Error('Syntax error. / 文法エラーです。'
            + common_event[1] + ' is not number. / '
            + common_event[1] + 'は整数ではありません');
        }
      }

      // Fadein
      if(fadein){
        return [getFadeinEvent()];
      }

      // Fadeout
      if(fadeout){
        return [getFadeoutEvent()];
      }

      // Stop BGM
      if(stop_bgm){
        return [getStopBgmEvent(90, 100, 0)];
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
            return [getPlayBgmEvent("", volume, pitch, pan)];
          }else{
            return [getPlayBgmEvent(name, volume, pitch, pan)];
          }
        }
      }

      // Fadeout BGM
      if(fadeout_bgm){
        if(fadeout_bgm[1]){
          let duration = 10;
          let d = fadeout_bgm[1].replace(/ /g, '');
          if(Number(d) || Number(d) == 0){
            duration = Number(d);
          }
          return [getFadeoutBgmEvent(duration)];
        }
      }

      // Save BGM
      if(save_bgm){
        return [getSaveBgmEvent()];
      }

      // Replay BGM
      if(replay_bgm){
        return [getReplayBgmEvent()];
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
            return [getChangeBattleBgmEvent("", volume, pitch, pan)];
          }else{
            return [getChangeBattleBgmEvent(name, volume, pitch, pan)];
          }
        }
      }

      // Stop BGS
      if(stop_bgs){
        return [getStopBgsEvent(90, 100, 0)];
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
            return [getPlayBgsEvent("", volume, pitch, pan)];
          }else{
            return [getPlayBgsEvent(name, volume, pitch, pan)];
          }
        }
      }

      // Fadeout BGS
      if(fadeout_bgs){
        if(fadeout_bgs[1]){
          let duration = 10;
          let d = fadeout_bgs[1].replace(/ /g, '');
          if(Number(d) || Number(d) == 0){
            duration = Number(d);
          }
          return [getFadeoutBgsEvent(duration)];
        }
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
            return [getPlaySeEvent("", volume, pitch, pan)];
          }else{
            return [getPlaySeEvent(name, volume, pitch, pan)];
          }
        }
      }

      // Stop SE
      if(stop_se){
        return [getStopSeEvent()];
      }

      // Stop ME
      if(stop_me){
        return [getStopMeEvent(90, 100, 0)];
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
            return [getPlayMeEvent("", volume, pitch, pan)];
          }else{
            return [getPlayMeEvent(name, volume, pitch, pan)];
          }
        }
      }

      /* eslint-disable no-useless-escape */
      const num_char_regex = '\\w\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf'
      //const control_variable_arg_regex = `[${num_char_regex}\\[\\]\\.\\-]+`;
      const control_variable_arg_regex = '.+';
      const set_operation_list = ['set', '代入', '='];
      const set_reg_list = set_operation_list.map(x => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`);
      const set = text.match(new RegExp(set_reg_list.join('|'), 'i'));

      const add_operation_list = ['add', '加算', '\\+'];
      const add_reg_list = add_operation_list.map(x => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`);
      const add = text.match(new RegExp(add_reg_list.join('|'), 'i'));

      const sub_operation_list = ['sub', '減算', '-'];
      const sub_reg_list = sub_operation_list.map(x => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`);
      const sub = text.match(new RegExp(sub_reg_list.join('|'), 'i'));

      const mul_operation_list = ['mul', '乗算', '\\*'];
      const mul_reg_list = mul_operation_list.map(x => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`);
      const mul = text.match(new RegExp(mul_reg_list.join('|'), 'i'));

      const div_operation_list = ['div', '除算', '\\/'];
      const div_reg_list = div_operation_list.map(x => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`);
      const div = text.match(new RegExp(div_reg_list.join('|'), 'i'));

      const mod_operation_list = ['mod', '剰余', '\\%'];
      const mod_reg_list = mod_operation_list.map(x => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`);
      const mod = text.match(new RegExp(mod_reg_list.join('|'), 'i'));

      const switch_operation_list = ['sw', 'switch', 'スイッチ'];
      const switch_reg_list = switch_operation_list.map(x => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`);
      const switch_tag = text.match(new RegExp(switch_reg_list.join('|'), 'i'));

      const self_switch_operation_list = ['ssw', 'selfswitch', 'セルフスイッチ'];
      const self_switch_reg_list = self_switch_operation_list.map(x => `<${x} *: *([abcd]) *, *(${control_variable_arg_regex}) *>`);
      const self_switch_tag = text.match(new RegExp(self_switch_reg_list.join('|'), 'i'));
      /* eslint-enable */

      const getControlTag = function(operator, operand1, operand2){
        if(operator == 'selfswitch'){
          const selfswitch_target = operand1.match(/[abcd]/i);
          const selfswitch_value = operand2.match(/on|オン|1|true|off|オフ|0|false/i);
          if(selfswitch_target && selfswitch_value){
            return getControlSelfSwitch(selfswitch_target[0], selfswitch_value[0]);
          }
        }

        let operand1_num = operand1.match(/\d+/i);
        let operand1_range = operand1.match(/(\d+)-(\d+)/i);
        let start_pointer = 0;
        let end_pointer = 0;
        if (operand1_range){
          start_pointer = parseInt(operand1_range[1]);
          end_pointer = parseInt(operand1_range[2]);
        }else if(operand1_num){
          let num = parseInt(operand1_num[0]);
          start_pointer = num;
          end_pointer = num;
        }else{
          throw new Error('Syntax error. / 文法エラーです。');
        }

        if(operator == 'switch'){
          const switch_tag = operand2.match(/on|オン|1|true|off|オフ|0|false/i);
          if(switch_tag){
            return getControlSwitch(start_pointer, end_pointer, switch_tag[0]);
          }
        }

        const variables = operand2.match(/v\[(\d+)\]|variables\[(\d+)\]|変数\[(\d+)\]/i);
        if(variables){
          const num = variables[1] || variables[2] || variables[3];
          return getControlValiable(operator, start_pointer, end_pointer, 'variables', parseInt(num));
        }
        /* eslint-disable no-useless-escape */
        const random = operand2.match(/r\[(\-?\d+)\]\[(\-?\d+)\]|random\[(\-?\d+)\]\[(\-?\d+)\]|乱数\[(\-?\d+)\]\[(\-?\d+)\]/i);
        /* eslint-enable */
        if(random){
          const random_range1 = random[1] || random[3] || random[5];
          const random_range2 = random[2] || random[4] || random[6];
          return getControlValiable(operator, start_pointer, end_pointer, 'random', parseInt(random_range1), parseInt(random_range2));
        }
        const gamedata_operation_list = ['gd', 'gamedata', 'ゲームデータ'];
        const gamedata_reg_list = gamedata_operation_list.map(x => `(${x})(${control_variable_arg_regex})`)
        const gamedata = operand2.match(new RegExp(gamedata_reg_list.join('|'), 'i'))
        if(gamedata){
          const func = gamedata[2] || gamedata[4] || gamedata[6];
          const gamedata_key_match = func.match(new RegExp(`\\[([${num_char_regex}]+)\\]`, 'i'));
          if(gamedata_key_match){
            const gamedata_key = gamedata_key_match[1];
            switch(gamedata_key.toLowerCase()){
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
                return getControlValiable(operator, start_pointer, end_pointer, 'gamedata', 'other', gamedata_key.toLowerCase(), 0);
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
                  return getControlValiable(operator, start_pointer, end_pointer, 'gamedata', gamedata_key.toLowerCase(), parseInt(arg1));
                }
                break;
              }
              case 'last':
              case '直前':{
                const args = func.match(new RegExp(`\\[[${num_char_regex}]+\\]\\[([${num_char_regex} ]+)\\]`, 'i'));
                if(args){
                  const arg1 = args[1];
                  return getControlValiable(operator, start_pointer, end_pointer, 'gamedata', gamedata_key.toLowerCase(), arg1);
                }
                break;
              }
              case 'actor':
              case 'アクター':
              case 'enemy':
              case '敵キャラ':
              case 'エネミー':
              case 'character':
              case 'キャラクター':{
                const args = func.match(new RegExp(`\\[[${num_char_regex}]+\\]\\[([${num_char_regex}\\-]+)\\]\\[([${num_char_regex}\\.]+)\\]`, 'i'));
                if(args){
                  const arg1 = args[1];
                  const arg2 = args[2];
                  return getControlValiable(operator, start_pointer, end_pointer, 'gamedata', gamedata_key.toLowerCase(), arg1, arg2);
                }
                break;
              }
            }
          }
        }
        const script = operand2.match(/sc\[(.+)\]|script\[(.+)\]|スクリプト\[(.+)\]/i);
        if(script){
          const script_body = script[1] || script[2] || script[3];
          return getControlValiable(operator, start_pointer, end_pointer, 'script', script_body);
        }
        let value_num = Number(operand2);
        return getControlValiable(operator, start_pointer, end_pointer, 'constant', value_num);
      }

      // set
      if(set){
        const operand1 = set[1] || set[3] || set[5];
        const operand2 = set[2] || set[4] || set[6];
        return [getControlTag('set', operand1, operand2)];
      }

      // add
      if(add){
        const operand1 = add[1] || add[3] || add[5];
        const operand2 = add[2] || add[4] || add[6];
        return [getControlTag('add', operand1, operand2)];
      }

      // sub
      if(sub){
        const operand1 = sub[1] || sub[3] || sub[5];
        const operand2 = sub[2] || sub[4] || sub[6];
        return [getControlTag('sub', operand1, operand2)];
      }

      // mul
      if(mul){
        const operand1 = mul[1] || mul[3] || mul[5];
        const operand2 = mul[2] || mul[4] || mul[6];
        return [getControlTag('mul', operand1, operand2)];
      }

      // div
      if(div){
        const operand1 = div[1] || div[3] || div[5];
        const operand2 = div[2] || div[4] || div[6];
        return [getControlTag('div', operand1, operand2)];
      }

      // mod
      if(mod){
        const operand1 = mod[1] || mod[3] || mod[5];
        const operand2 = mod[2] || mod[4] || mod[6];
        return [getControlTag('mod', operand1, operand2)];
      }

      // switch
      if(switch_tag){
        const operand1 = switch_tag[1] || switch_tag[3] || switch_tag[5];
        const operand2 = switch_tag[2] || switch_tag[4] || switch_tag[6];
        return [getControlTag('switch', operand1, operand2)];
      }

      // self switch
      if(self_switch_tag){
        const operand1 = self_switch_tag[1] || self_switch_tag[3] || self_switch_tag[5];
        const operand2 = self_switch_tag[2] || self_switch_tag[4] || self_switch_tag[6];
        return [getControlTag('selfswitch', operand1, operand2)];
      }

      /// timer control
      const timer_start_reg_list = ['timer', 'タイマー'].map(x => `<${x} *: *(.+) *, *(\\d+), *(\\d+) *>`);
      const timer_start = text.match(new RegExp(timer_start_reg_list.join('|'), 'i'));
      const timer_stop_reg_list = ['timer', 'タイマー'].map(x => `<${x} *: *(.+) *>`);
      const timer_stop = text.match(new RegExp(timer_stop_reg_list.join('|'), 'i'));

      if(timer_start){
        let operand1 = timer_start[1] || timer_start[4];
        let min = parseInt(timer_start[2] || timer_start[5]);
        let sec = parseInt(timer_start[3] || timer_start[6]);
        let setting_sec = 60 * min + sec;
        return [getControlTimer(operand1, setting_sec)];
      }
      if(timer_stop){
        let operand1 = timer_stop[1] || timer_stop[2];
        return [getControlTimer(operand1, 0)];
      }

      // Show Picture
      if(show_picture){
        let params = show_picture[1].split(',').map(s => s.trim());
        if(params.length > 1){
          let pic_no = Number(params[0]);
          let name = params[1];
          let options = params.slice(2);
          return [getShowPicture(pic_no, name, options)];
        }else{
          console.error(text);
          throw new Error('Syntax error. / 文法エラーです。'
                          + text.replace(/</g, '  ').replace(/>/g, '  '));
        }
      }

      // Move Picture
      if(move_picture){
        let params = move_picture[1].split(',').map(s => s.trim());
        if(params.length > 0){
          let pic_no = Number(params[0]);
          let options = params.slice(1);
          return [getMovePicture(pic_no, options)];
        }else{
          console.error(text);
          throw new Error('Syntax error. / 文法エラーです。'
                          + text.replace(/</g, '  ').replace(/>/g, '  '));
        }
      }

      // Rotate Picture
      if(rotate_picture){
        let pic_no = Number(rotate_picture[1]);
        let speed = Number(rotate_picture[2]);
        return [getRotatePicture(pic_no, speed)];
      }

      //Tint Picture
      if(tint_picture){
        let params = tint_picture[1].split(',').map(s => s.trim());
        if(params.length > 0){
          let pic_no = Number(params[0]);
          let options = params.slice(1);
          return [getTintPicture(pic_no, options)];
        }else{
          console.error(text);
          throw new Error('Syntax error. / 文法エラーです。'
                          + text.replace(/</g, '  ').replace(/>/g, '  '));
        }
      }

      // Erase Picture
      if(erase_picture){
        let pic_no = Number(erase_picture[1]);
        return [getErasePicture(pic_no)];
      }

      // Conditional Branch (If)
      if(conditional_branch_if){
        let args = conditional_branch_if[1].split(',');
        if(args.length > 0){
          let target = args[0].trim();
          let params = args.slice(1);
          return [getConditionalBranch(target, params)];
        }else{
          console.error(text);
          throw new Error('Syntax error. / 文法エラーです。'
                          + text.replace(/</g, '  ').replace(/>/g, '  '));
        }
      }

      // Conditional Branch (Else)
      if(conditional_branch_else){
        let event_command_list = [];
        event_command_list.push(getCommandBottomEvent());
        event_command_list.push(getElse());
        return event_command_list;
      }

      // Conditional Branch (End)
      if(conditional_branch_end){
        const current_block = block_stack.slice(-1)[0];
        const CHOICE_CODE = 102;

        if(Boolean(current_block) && current_block["code"] == CHOICE_CODE){
          return [getBlockEnd(), getShowChoiceEnd()];
        }else{
          return [getCommandBottomEvent(), getEnd()];
        }
      }

      // Loop
      if(loop){
        return [getLoop()];
      }

      // Repeat Above
      if(repeat_above){
        let event_command_list = [];
        event_command_list.push(getCommandBottomEvent());
        event_command_list.push(getRepeatAbove());
        return event_command_list;
      }

      // Break Loop
      if(break_loop){
        return [getBreakLoop()];
      }

      // Exit Event Processing
      if(exit_event_processing){
        return [getExitEventProcessing()];
      }

      // Label
      if(label){
        let label_name = label[1] || "";
        return [getLabel(label_name)];
      }

      // Jump to Label
      if(jump_to_label){
        let label_name = jump_to_label[1] || "";
        return [getJumpToLabel(label_name)];
      }

      // Input Number
      if(input_number){
        const val_num = Number(input_number[1]);
        const num_of_digits = Number(input_number[2]);
        return [getInputNumber(val_num, num_of_digits)];
      }

      // Select Item
      if(select_item){
        const val_num = Number(select_item[1]);
        const item_type = select_item[2];
        return [getSelectItem(val_num, item_type)];
      }

      // Show Choices
      if(show_choices){
        let params = show_choices[1].split(',').filter(s => s).map(s => s.trim());
        let window_type = 0;
        let window_position = 2;
        let default_choice = 0;
        let default_cancel = 1;
        let exist_default_choice = false;

        params.forEach((p) => {
          /* eslint-disable no-empty */
          try{
            window_type = getBackground(p);
            return;
          }catch(e){}
          try{
            window_position = getChoiceWindowPosition(p);
            return;
          }catch(e){}
          /* eslint-enable */
          switch(p.toLowerCase()){
            case "branch":
            case "分岐":
              default_cancel = -2;
              return;
            case "disallow":
            case "禁止":
              default_cancel = -1;
              return;
            case "none":
            case "なし":
              default_choice = -1;
              return;
          }
          if(!isNaN(Number(p))){
            if(exist_default_choice){
              default_cancel = Number(p) - 1;
            }else{
              default_choice = Number(p) - 1;
              exist_default_choice = true;
            }
          }
        });

        return [getShowChoices(window_type, window_position, default_choice, default_cancel)];
      }

      // Show Choice When
      if(show_choice_when){
        const index = 0;
        const text = show_choice_when[1];
        return [getShowChoiceWhen(index, text)];
      }

      // Show Choice When Cancel
      if(show_choice_when_cancel){
        return [getShowChoiceWhenCancel()];
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
            + text.replace(/</g, '  ').replace(/>/g, '  '));
        }
        text = text.replace(window_position[0], '');
      }

      //name box
      if(namebox){
        if(!frame_param){
          frame_param = getPretextEvent();
        }
        frame_param.parameters[4] = namebox[1];
        text = text.replace(namebox[0], '');
      }

      let event_command_list = [];

      if(face || background || window_position || namebox){
        if(frame_param){
          logger.log("push: ", frame_param.parameters);
          event_command_list.push(frame_param);
        }
      }

      if(text.match(/\S/g)){
        logger.log("push: ", text);
        event_command_list.push(getTextFrameEvent(text));
      }
      return event_command_list;
    };

    const getEvents = function(text, previous_text, window_frame, previous_frame, block_stack){
      let event_command_list = [];
      let events = _getEvents(text, window_frame, block_stack);
      const PRE_CODE = 101;
      const CHOICE_CODE = 102;
      const TEXT_CODE = 401;
      const WHEN_CODE = 402;
      const WHEN_CANCEL_CODE = 403;
      const IF_CODE = 111;
      const IF_END_CODE = getEnd().code;
      const CHOICE_END_CODE = getShowChoiceEnd().code;

      events.forEach((current_frame) => {
        if(current_frame.code == IF_END_CODE || current_frame.code == CHOICE_END_CODE){
          block_stack.pop();
        }
      });

      if(Array.isArray(events) && events.length > 0){
        if(events.length > 1){
          // 一行に複数書かれている
          event_command_list = event_command_list.concat(events);
          return {window_frame: null, event_command_list, block_stack};
        }
        const current_frame = events[0];
        if(current_frame.code == PRE_CODE){
          // 401になるまで遅延する
          window_frame = current_frame;
          return {window_frame, event_command_list, block_stack};
        }

        if(current_frame.code == TEXT_CODE){
          if(previous_frame){
            if(previous_frame.code == TEXT_CODE){
              // 空行でwindow frameを初期化
              if(previous_text === ''){
                event_command_list.push(getPretextEvent());
              }
            }else if(previous_frame.code == PRE_CODE){
              // stackに積んだframeを挿入する
              event_command_list.push(window_frame);
            }else{
              // window frameを初期化
              event_command_list.push(getPretextEvent());
            }
          }else{
            event_command_list.push(getPretextEvent());
          }
        }else if(current_frame.code == WHEN_CODE){
          const current_index = block_stack.slice(-1)[0]["index"];
          let current_choice = block_stack.slice(-1)[0]["event"];
          if(current_index != 0){
            event_command_list.push(getBlockEnd());
          }
          current_frame.parameters[0] = current_index;
          block_stack.slice(-1)[0]["index"] += 1;
          if(current_choice){
            // if block の中で when を書いている
            if(Array.isArray(current_choice.parameters)){
              current_choice.parameters[0].push(current_frame.parameters[1]);
            }
          }
        }else if(current_frame.code == WHEN_CANCEL_CODE){
          const current_index = block_stack.slice(-1)[0]["index"];
          if(current_index != 0){
            event_command_list.push(getBlockEnd());
          }
          block_stack.slice(-1)[0]["index"] += 1;
        }else if(current_frame.code == CHOICE_CODE){
          block_stack.push({"code": current_frame.code, "event": current_frame, "indent": block_stack.length, "index": 0});
        }else if(current_frame.code == IF_CODE){
          block_stack.push({"code": current_frame.code, "event": current_frame, "indent": block_stack.length, "index": 0});
        }

        event_command_list = event_command_list.concat(events);
      }
      return {window_frame: null, event_command_list, block_stack};
    }


    const autoIndent = function(events){
      const BOTTOM_CODE = 0;
      const IF_CODE = 111;
      const ELSE_CODE = 411;
      const LOOP_CODE = 112;
      const WHEN_CODE = 402;
      const WHEN_CANCEL_CODE = 403;

      const out_events = events.reduce((o, e) => {
        const parameters = JSON.parse(JSON.stringify(e.parameters));
        let now_indent = 0;

        const last = o.slice(-1)[0]
        if(last !== undefined){
          now_indent = last.indent;
          switch(last.code){
            case IF_CODE:
            case ELSE_CODE:
            case LOOP_CODE:
            case WHEN_CODE:
            case WHEN_CANCEL_CODE:{
              now_indent += 1;
              break;
            }
            case BOTTOM_CODE:
              now_indent -= 1;
              break;
          }
        }
        o.push({"code": e.code, "indent": now_indent, "parameters": parameters});
        return o;
      }, []);

      return out_events;
    };

    let scenario_text = readText(Laurus.Text2Frame.TextPath);
    scenario_text = uniformNewLineCode(scenario_text);
    scenario_text = eraseCommentOutLines(scenario_text, Laurus.Text2Frame.CommentOutChar)
    let block_map = {};

    ["script", "comment", "scrolling"].forEach(function(block_name){
      const t = getBlockStatement(scenario_text, block_name);
      scenario_text = t.scenario_text;
      block_map = Object.assign(block_map, t.block_map);
    });

    let text_lines = scenario_text.split('\n');
    let event_command_list = [];
    let previous_text = '';
    let window_frame = null;
    let block_stack = [];
    for(let i=0; i < text_lines.length; i++){
      const text = text_lines[i];

      if(text){
        let previous_frame = window_frame;
        if(previous_frame === null){
          previous_frame = event_command_list.slice(-1)[0];
        }
        const return_obj = getEvents(text, previous_text, window_frame, previous_frame, block_stack);
        window_frame = return_obj["window_frame"]
        const new_event_command_list = return_obj["event_command_list"]
        block_stack = return_obj["block_stack"]
        event_command_list = event_command_list.concat(new_event_command_list);
      }
      logger.log(i, text);
      previous_text = text;
    }

    event_command_list = completeLackedBottomEvent(event_command_list);
    event_command_list = autoIndent(event_command_list);
    event_command_list.push(getCommandBottomEvent());

    switch (Laurus.Text2Frame.ExecMode) {
      case 'IMPORT_MESSAGE_TO_EVENT' :
      case 'メッセージをイベントにインポート' : {
        let map_data = readJsonData(Laurus.Text2Frame.MapPath);
        if(! map_data.events[Laurus.Text2Frame.EventID]){
          throw new Error('EventID not found. / EventIDが見つかりません。\n' 
            + "Event ID: " + Laurus.Text2Frame.EventID);
        }

        let pageID = Number(Laurus.Text2Frame.PageID) - 1;
        while (! map_data.events[Laurus.Text2Frame.EventID].pages[pageID]){
          map_data.events[Laurus.Text2Frame.EventID].pages.push(getDefaultPage());
        }

        let map_events = map_data.events[Laurus.Text2Frame.EventID].pages[pageID].list;
        if(Laurus.Text2Frame.IsOverwrite){
          map_events = [];
        }
        map_events.pop();
        map_events = map_events.concat(event_command_list);
        map_data.events[Laurus.Text2Frame.EventID].pages[pageID].list = map_events;
        writeData(Laurus.Text2Frame.MapPath, map_data);
        addMessage('Success / 書き出し成功！\n' 
                   + "======> MapID: " + Laurus.Text2Frame.MapID
                   + " -> EventID: " + Laurus.Text2Frame.EventID
                   + " -> PageID: " + Laurus.Text2Frame.PageID);
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
        addMessage('Success / 書き出し成功！\n' 
          + "=====> Common EventID :" + Laurus.Text2Frame.CommonEventID);
        break;
      }
    }
    addMessage('\n');
    addMessage('Please restart RPG Maker MV(Editor) WITHOUT save. \n' + 
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
    .option('-p, --page_id <name>', 'page id')
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
    Laurus.Text2Frame.PageID   = program.page_id ? program.page_id : '1';
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
    const page_id     = '1';
    const overwrite   = 'true';
    Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT',
      [folder_name, file_name, map_id, event_id, page_id, overwrite]);
  }else{
    console.log('===== Manual =====');
    console.log(`
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
    `);
  }
}
