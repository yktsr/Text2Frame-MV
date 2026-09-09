//= ============================================================================
// Frame2Text.js
// ----------------------------------------------------------------------------
// (C)2023-2026 Shick, Yuki Katsura
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 2.3.0 2026/08/02:
// ・一括取り出しに取り出しのしかた(統合/上書き)を追加。統合はテキストに書いた内容を残したまま
//   ゲーム側の変更だけを取り込みます(既定は統合。CLI・t2f-sync・VSCodeと同じ)
// ・衝突しても共通の祖先を進めるよう修正。目印3行を消して決着をつければ、統合のまま
//   反対側へ流せます(従来は上書きでしか抜けられませんでした)
// ・未解決の衝突が残っているイベント/テキストは反映・取り出しの対象から外すよう改善
// ・NW.js(MV同梱)でtextや.t2f-baseのディレクトリ作成に失敗する不具合の修正
// ・一括取り出しの実行結果に出力先・内訳・上書き件数・失敗理由を表示するよう改善
// ・取り出したテキストで、文章の後に必ず1行空けて次のコマンドと切り離すよう改善
// ・統合の取り出しで、取り出し前にテキストへ書いた内容が次の反映で消える不具合の修正
//   (祖先(.t2f-base)にマージ結果を保存していたため、次の3-wayが「ゲームが消した」と誤読していました)
// ・衝突したときの直し方(目印を消して反対側へ「上書き」で押し出す)をヘルプと案内文に明記
// ・目印が残っていても「上書き」なら取り出せるよう改善。ツクールを開かずテキストだけで衝突を解決できます
//   (統合は従来どおり見送り。目印ごと取り出したときは祖先(.t2f-base)を進めません)
// ・一括取り出しの「取り出し方法」を1番目の引数へ移動(一番よく変える引数を先頭に。一括反映と同じ位置)
// ・テキストの置き場所から言語(locale)の概念を廃止。text/<言語>/ ではなく text/ 直下へ取り出します
//   複数の版を持つときは出力先フォルダを分けてください(CLI の --locale と見出しの locale: 行も廃止)
// ・一括取り出しの「取り出しのあとも見張る」を廃止。同期は Text2Frame の START_DATA_SYNC を使います
// 1.0.1 2024/09/07:
// ・#125 プラグインコマンドMZを変換する際、オブジェクト型を取り扱えない不具合の修正
// 1.0.0 2024/01/20 Initial Version
// 0.1.0 2023/09/25 新規作成
//= ============================================================================

/* eslint-disable spaced-comment */
/*:
 * @target MZ
 * @plugindesc イベントコマンドをテキストファイル(.txtファイルなど)に出力するための開発支援プラグインです。ツクールMV・MZの両方に対応しています。
 * @author inazumasoft:Shick, Yuki Katsura
 * @url https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Frame2Text.js
 *
 * @command EXPORT_EVENT_TO_MESSAGE
 * @text イベントをエクスポート
 * @desc テキストにイベントをエクスポートします。出力するマップ・イベント・ページIDや、出力先のファイルの情報を指定します。
 *
 * @arg FileFolder
 * @text 出力先フォルダ名
 * @desc テキストファイルを出力するフォルダ名を設定します。デフォルトはtextです。
 * @type string
 * @default text
 *
 * @arg FileName
 * @text 出力先ファイル名
 * @desc 出力するテキストファイルのファイル名を設定します。デフォルトはmessage.txtです。
 * @type string
 * @default message.txt
 *
 * @arg MapID
 * @text 出力するマップID
 * @desc 出力するマップのIDを設定します。デフォルト値は1です。
 * @type number
 * @default 1
 *
 * @arg EventID
 * @text 出力するイベントID
 * @desc 出力するイベントのIDを設定します。デフォルト値は2です。
 * @type number
 * @default 2
 *
 * @arg PageID
 * @text 出力するページID
 * @desc 出力するページのIDを設定します。デフォルト値は1です。
 * @type number
 * @default 1
 *
 * @arg Strategy
 * @text 取り出しのしかた
 * @desc merge(統合)はテキストに書いた内容を残したままゲームの変更を取り込みます。overwriteは全上書きです。既定はmergeです。
 * @type select
 * @option 統合 / merge
 * @value merge
 * @option 【取り扱い注意】全上書き / overwrite
 * @value overwrite
 * @default merge
 *
 * @command EXPORT_CE_TO_MESSAGE
 * @text コモンイベントをエクスポート
 * @desc テキストにコモンイベントをエクスポートします。出力するコモンイベントのIDや、出力先のファイルの情報を指定します。
 *
 * @arg FileFolder
 * @text 出力先フォルダ名
 * @desc テキストファイルを出力するフォルダ名を設定します。デフォルトはtextです。
 * @type string
 * @default text
 *
 * @arg FileName
 * @text 出力先ファイル名
 * @desc 出力するテキストファイルのファイル名を設定します。デフォルトはmessage.txtです。
 * @type string
 * @default message.txt
 *
 * @arg CommonEventID
 * @text 出力するコモンイベントID
 * @desc 出力するコモンイベントIDを設定します。デフォルト値は1です。
 * @type common_event
 * @default 1
 *
 * @arg Strategy
 * @text 取り出しのしかた
 * @desc merge(統合)はテキストに書いた内容を残したままゲームの変更を取り込みます。overwriteは全上書きです。既定はmergeです。
 * @type select
 * @option 統合 / merge
 * @value merge
 * @option 【取り扱い注意】全上書き / overwrite
 * @value overwrite
 * @default merge
 *
 * @command BATCH_EXPORT_MESSAGES_TO_FOLDER
 * @text フォルダへ一括取り出し
 * @desc dataフォルダ内の全イベント/コモンイベントを、見出し情報付きのテキストとしてフォルダへ一括で取り出します(既定は統合)。
 *
 * @arg Strategy
 * @text 取り出し方法
 * @desc merge(統合)はテキストに書いた内容を残し、ゲーム側の変更だけを取り込みます(Text2Frameプラグインが必要)。overwriteはゲームの内容で全上書きです。既定はmergeです。
 * @type select
 * @option 統合 / merge
 * @value merge
 * @option 【取り扱い注意】全上書き / overwrite
 * @value overwrite
 * @default merge
 *
 * @arg TextBase
 * @text 出力先フォルダ名
 * @desc 出力先のテキストベースディレクトリです。デフォルトはtextです。通常、設定する必要はありません。
 * @default text
 *
 * @arg DataFolder
 * @text ゲームデータのフォルダ名
 * @desc 走査対象のゲームデータのフォルダ名です。デフォルトはdataです。通常、設定する必要はありません。
 * @type string
 * @default data
 *
 * @param Default Scenario Folder
 * @text 出力フォルダ名
 * @desc シナリオファイルを出力するフォルダ名を設定します。デフォルトはtextです。(MZでは無視されます)
 * @default text
 * @require 1
 * @dir text
 * @type string
 *
 * @param Default Scenario File
 * @text 出力ファイル名
 * @desc 出力するシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。(MZでは無視されます)
 * @default message.txt
 * @require 1
 * @dir text
 * @type string
 *
 * @param Default Common Event ID
 * @text 出力するコモンイベントID
 * @desc 出力するコモンイベントのIDを設定します。デフォルト値は1です。(MZでは無視されます)
 * @default 1
 * @type common_event
 *
 * @param Default MapID
 * @text 出力するマップID
 * @desc 出力するマップのIDを設定します。デフォルト値は1です。(MZでは無視されます)
 * @default 1
 * @type number
 *
 * @param Default EventID
 * @text 出力するイベントID
 * @desc 出力するイベントのIDを設定します。デフォルト値は2です。(MZでは無視されます)
 * @default 2
 * @type number
 *
 * @param Default PageID
 * @text 出力するページID
 * @desc 出力するページのIDを設定します。デフォルト値は1です。(MZでは無視されます)
 * @default 1
 * @type number
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
 * @param EnglishTag
 * @text 英語タグ
 * @desc ファイル出力時のタグ、パラメータの言語。デフォルト値はtrue(英語)です。
 * @default true
 * @type boolean
 *
 * @param OmitDefaultTags
 * @text 既定と同じタグを省略する
 * @desc 顔・背景・位置が既定値と同じときタグを書きません。3つとも既定ならタグ行ごと消えて、テキストが読みやすくなります。デフォルト値はtrueです。
 * @default true
 * @type boolean
 *
 * @help
 * 本プラグインはツクールMV・MZのイベントコマンドを、テキストファイル(.txtファ
 * イルなど)に取り出すための開発支援プラグインです。テキストからゲームへ取り込む
 * Text2Frame の、逆方向を担当します。
 *
 * 所定のプラグインコマンド（後述）を実行することにより、マップイベントやコモン
 * イベントの内容を Text2Frame 記法のテキストとして書き出すことができます。既存
 * のイベントをテキストで管理したい場合や、Text2Frameで一度取り込んだイベントを
 * イベントエディターで編集した後に、その変更をテキストに戻したい場合に使います。
 *
 * テストプレイおよびイベントテスト（イベントエディタ上で右クリック→テスト）
 * から実行することを想定しています。
 *
 * ゲーム→テキストの「取り出し」は、テキスト→ゲームの「反映」（Text2Frame）と
 * 組み合わせることで、双方向の編集になります。テキストの編集とツクール上のUI編集
 * （移動・分岐・スイッチ等）の両方をできるだけ残します。プラグインコマンド操作が
 * 苦手な場合は、ボタン操作で使える Visual Studio Code 拡張もあります。
 *
 * なお、以下のヘルプ文の内容は本プラグインのWikiにも記載しています。
 *
 *     https://github.com/yktsr/Text2Frame-MV/wiki
 *
 * Wikiのほうが閲覧しやすいと思いますので、RPGツクールMV・MZ上では読みづらい
 * と感じた場合は、こちらをご覧ください。
 *
 * -------------------------------------
 * Version 2.3.0 以降の推奨手順
 * -------------------------------------
 * 0. dataフォルダのバックアップをとっておく。(重要)
 * 0. 反映プラグイン Text2Frame を導入しておく。(重要)
 *
 * 1. 任意のマップ・位置に空のイベントをひとつ作成します。
 *
 * 2. 以下のうちいずれかを記述したプラグインコマンドを作成する。
 *    BATCH_EXPORT_MESSAGES_TO_FOLDER
 *    フォルダへ一括取り出し
 *     これらは全く同じ機能なのでどちらを使ってもかまいません。
 *     既定の「統合」で取り出すには、Text2Frame を導入しておく必要があります。
 *
 * 3. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
 *     実行前に本プラグインと Text2Frame を管理画面からONにして
 *    「プロジェクトの保存」を実行しておきましょう。
 *
 * 4. text フォルダ以下にゲームの内容がText2Frame記法で書き出される。
 *     RPG ツクールのプロジェクトがあるディレクトリに、text という
 *    フォルダが作成され、その中に、すべてのイベントとコモンイベントが
 *    書き出されます。
 *
 * 5. text フォルダ以下のテキストを自由に編集する。
 *     記法については、Text2Frame の「テキストファイルの書き方」を
 *    参照してください。
 *
 * 6. Text2Frame の「BATCH_IMPORT_MESSAGES_FROM_FOLDER」を実行して、
 *    テキストの変更をゲームに反映する。
 *     あなたがテキストで編集した箇所だけがゲームに取り込まれます。
 *
 * 7. ツクールのUIで行った変更をテキストに戻すには、2と3の手順を再度実行する。
 *     テキストに書いた内容は残したまま、ツクール側で増えた・変わった箇所
 *    だけが取り込まれます。
 *     テキストの変更とゲームの変更が衝突した場合の解消手順は、
 *    「変更が衝突した場合の解消方法」を参照してください。
 *
 * --------------------------------------
 * 取り出しのしかた（統合 / 上書き）
 * --------------------------------------
 * ◆ 統合(merge)  ※既定。通常はこちらを使ってください
 *  テキストに書いた内容を残したまま、ツクール上で増えた・変わった箇所だけを
 *  取り込みます。共通の祖先があれば3方向で統合し、同じ場所を両方で変えたとき
 *  だけ両方を残します（「変更が衝突した場合の解消方法」を参照）。
 *  統合には Text2Frame プラグインも導入されている必要があります。
 *
 * ◆ 上書き(overwrite)
 *  ゲームの内容でテキストを全て置き換えます。テキスト側に書いてまだゲームに
 *  反映していない編集は失われます。ゲームを真として取り直したいときや、
 *  白紙から取り出したいときに使います。
 *
 * ◆ コメント行と書き方はどちらでも残ります
 *  次のものはゲームに取り込まれないので、ゲームの内容で置き換える対象がそもそも
 *  ありません。元のテキストを見て、元の位置・元の書き方へ戻しています。
 *   ・コメント行（％で始まる行）
 *   ・余分な空行（場面の区切りに2行3行と空けたもの、本文の先頭・末尾の空行）
 *   ・タグ行の字下げ、タグ名の大文字小文字
 *  その周りの内容がゲーム側で大きく書き換わったときは位置がずれることがあり、
 *  そのときはファイル名を挙げて知らせます（消えることはありません）。
 *  なお <script> ブロックの中の空行の数は、中身がゲームに入るので残りません。
 *
 * ◆ プラグインコマンドとの対応
 *  どちらも「取り出しのしかた」で統合と上書きを選べます（既定は統合）。
 *    BATCH_EXPORT_MESSAGES_TO_FOLDER
 *      全イベント・全コモンイベントが対象です。
 *    EXPORT_EVENT_TO_MESSAGE / EXPORT_CE_TO_MESSAGE
 *      1件ずつ取り出します。
 *
 *  ※ 旧 MERGE_EVENT_TO_MESSAGE / MERGE_CE_TO_MESSAGE は廃止しました。
 *    EXPORT_* の「取り出しのしかた」に統合(merge)を指定してください。
 *
 * --------------------------------------
 * 既定と同じタグを省略する
 * --------------------------------------
 *  取り出したテキストは、メッセージごとに次の行が付きます。
 *
 *    <顔: (0)><背景: ウインドウ><位置: 下>
 *    やめて！ラーの翼神竜の特殊能力で、
 *
 *  この3つが既定値と同じときは書きません。3つとも既定なら行ごと消えるので、
 *  セリフだけが並んだ読みやすいテキストになります。
 *
 *    やめて！ラーの翼神竜の特殊能力で、
 *
 *  顔だけ指定しているなら <顔: Actor1(2)> だけが残ります。
 *
 *  ◆ 何が「既定」か
 *   Text2Frame のプラグインパラメータ「位置のデフォルト値」「背景のデフォルト値」です。
 *   タグが無いとき Text2Frame がこの値を補うので、同じ値なら書いても書かなくても
 *   取り込み結果は変わりません。
 *   したがって、あなたがこれらのパラメータを変えていれば、その値が省略の基準になります。
 *   顔にはパラメータが無く、空の顔は常に省略できます。
 *
 *  ◆ 元に戻したいとき
 *   プラグインパラメータ「既定と同じタグを省略する」を false にして取り出し直すと、
 *   従来どおり全部書き出します。
 *
 *  ◆ 切り替えたときの差分について
 *   次の取り出しで、既存のテキストがすべて新しい形になります。差分は大きく出ますが、
 *   取り込んだ結果は変わりません。衝突も起きません。
 *
 *  ※ ウィンドウの区切りは、メッセージのあいだの空行が担っています。
 *    タグ行が無くなっても、空行を消さない限り別々のウィンドウのままです。
 *
 * --------------------------------------
 * 変更が衝突した場合の解消方法
 * --------------------------------------
 *  同じ場所をテキストとゲームの両方で変更したときは、次の目印3行が挿入された
 *  上で、両方の変更が残ります（どちらの変更も失われることはありません）。
 *  ゲームからテキストへの取り出しならテキストに、
 *  テキストからゲームへの反映ならゲームに入ります。
 *
 *    === テキストの変更 / from text ===
 *    （テキスト側の内容）
 *    === ゲームの変更 / from game ===
 *    （ゲーム側の内容）
 *    === どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ===
 *
 *  直し方は「目印を削除し意図通りに編集した後、逆の操作を行って解消を反映」
 *  です。
 *
 * ◆ テキストへの取り出しで衝突した（目印がテキストに入った）とき
 *     1. テキストエディタで目印3行を消し、意図通りに編集する。
 *     2. Text2Frame の「BATCH_IMPORT_MESSAGES_FROM_FOLDER」を実行する。
 *
 * ◆ ゲームへの反映で衝突した（目印がゲームに入った）とき
 *     1. ツクールをセーブせずに開き直し、目印のある周辺をUIで編集して
 *        目印3行を消し、意図通りに編集する。
 *     2. 「BATCH_EXPORT_MESSAGES_TO_FOLDER」を実行する。
 *
 *  どちらも「取り出しのしかた」「反映のしかた」は統合(merge)のままで構いません。
 *
 *  ※ 衝突を解消しないまま、同じプラグインコマンドは実行しないでください。
 *    同じ向きにもう一度実行しても衝突は直りません。
 *    また、目印が残っている間は、次の反映・取り出しの対象から外れます。
 *
 * ◆ ツクールを開かずに、テキストだけで解決したいとき
 *  反映で衝突して目印がゲームに入った場合でも、「取り出し」を上書き(overwrite)
 *  で実行すれば、目印ごとテキストへ書き出せます（目印は注釈として往復するので
 *  壊れません）。
 *     1. 「BATCH_EXPORT_MESSAGES_TO_FOLDER」を上書きで実行する。
 *        目印ごとテキストに出てきます。
 *     2. テキストエディタで目印3行を消し、意図通りに編集する。
 *     3. Text2Frame の「BATCH_IMPORT_MESSAGES_FROM_FOLDER」を上書きで実行する。
 *
 *  この道すじだけは共通の祖先を更新しません（祖先に目印が入ると次の統合が壊れる
 *  ため）。3 の上書き反映で祖先も揃います。
 *
 * ◆ 一括取り出し・反映時にプラグインコマンドが意図通りに動作しないとき
 *  ゲームかテキストのどちらかを真と決めて、強制的に上書きすることで解決でき
 *  ます。このとき、反対側にしかない内容は失われます。
 *     1. ゲームを真としてテキストを上書きしたいとき
 *        「BATCH_EXPORT_MESSAGES_TO_FOLDER」を上書き(overwrite)で実行する。
 *        BATCH_EXPORT_MESSAGES_TO_FOLDER overwrite
 *     2. テキストを真としてゲームを上書きしたいとき
 *        Text2Frame の「BATCH_IMPORT_MESSAGES_FROM_FOLDER」を上書き(overwrite)
 *        で実行する。
 *        BATCH_IMPORT_MESSAGES_FROM_FOLDER overwrite
 *
 * ◆ 差分反映に使う「共通の祖先」はプロジェクトの .t2f-base フォルダに自動で
 *  保存・参照されます。このフォルダを削除すると状態が初期化され必ず上書きさ
 *  れます。
 *
 * --------------------------------------
 * Visual Studio Code のプラグイン
 * --------------------------------------
 * プラグインコマンドではなく、Visual Studio Codeというエディタを使えば、
 * テキストを編集しながら、UIのボタンひとつで、一括反映、一括取り出しの
 * コマンドを実行できます。
 * また、文字列の補完や文法の説明表示が自動で行われます。
 * 下記からVisual Studio Code 拡張「Text2Frame Language Support」を利用
 * することができます。
 * https://marketplace.visualstudio.com/items?itemName=yktsr.text2frame-language-support
 *
 *
 * -------------------------------------
 * Version 2.2.4 までの手順
 * -------------------------------------
 *
 * -------------------------------------
 * ツクールMVでの実行方法
 * -------------------------------------
 * 1. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
 *
 * 2. テキストファイルに出力したいマップID, イベントID, ページID、コモンイベン
 *    トIDをメモしておきます。
 *  ・マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの左
 *    上に記載されています。
 *  ・イベントIDはイベントをダブルクリックして出るイベントエディターの左上に記
 *    載されています。
 *  ・ページIDはイベントエディターのイベントの名前の下に記載されています。
 *  ・コモンイベントIDはデータベースのコモンイベントのデータリストから確認でき
 *    ます。
 *
 * 3. プラグインの管理画面から本プラグインのパラメータを下記の通り編集します。
 *  ・「出力フォルダ名」に1.で作成したフォルダ名を入力。
 *      (デフォルトはtextです)
 *  ・「出力ファイル名」に出力したいテキストファイル名を入力。
 *      (デフォルトはmessage.txtです)
 *  ・「出力するコモンイベントID」に2.でメモしたコモンイベントIDを入力。
 *      (デフォルトで1です)
 *  ・「出力するマップID」に2.でメモしたマップIDを入力。
 *      (デフォルトは1です)
 *  ・「出力するイベントID」に2.でメモしたイベントIDを入力。
 *      (デフォルトは2です)
 *  ・「出力するページID」に2.でメモしたページIDを入力。
 *      (デフォルトで1です)
 *  ・「英語タグ」にテキストに出力される言語をtrueかfalseで入力。
 *      (デフォルトでtrue(英語)です)
 *       - trueの場合の名前タグの例 ："<Name: ハロルド>"
 *       - falseの場合の名前タグの例："<名前: ハロルド>"
 *
 * 4. 以下のうちいずれかを記述したプラグインコマンドを作成する。
 *  【マップのイベントを出力したい場合】
 *    EXPORT_EVENT_TO_MESSAGE
 *    イベントをメッセージにエクスポ－ト
 *     上記どちらかのプラグインコマンドを記載する
 *  【コモンイベントを出力したい場合】
 *    EXPORT_CE_TO_MESSAGE
 *    コモンイベントをメッセージにエクスポート
 *     上記どちらかのプラグインコマンドを記載する
 *
 *
 * 5. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
 *    【成功した場合】
 *      出力されたMapID、EventID、PageID、Common EventIDや
 *      フォルダ、ファイル名のメッセージが表示されます。
 *    【失敗した場合】
 *      「Save failed./ 保存に失敗しました ファイルが開いていないか確認してくだ
 *       さい」
 *      というメッセージが表示された場合は、指定したフォルダが作成されているか
 *      の確認と指定したファイルが開いていないかを確認してください。
 *
 *
 * --------------------------------------
 * ツクールMVでのプラグインコマンドの引数
 * --------------------------------------
 * ツクールMVでのプラグインコマンドに引数を設定することにより、
 * プラグインパラメータで指定したテキストファイルやマップIDとは違うパラメータで
 * 実行ができます。
 *
 * 例1:マップIDが1, イベントIDが2, ページIDが3をtext/message.txtに出力する
 *   EXPORT_EVENT_TO_MESSAGE text message.txt 1 2 3
 *   イベントをメッセージにエクスポ－ト text message.txt 1 2 3
 *
 * 例2:IDが3のコモンイベントをtext/message.txtに出力する
 *   EXPORT_CE_TO_MESSAGE text message.txt 3
 *   コモンイベントをメッセージにエクスポート text message.txt 3
 *
 * 例3:全イベント/コモンイベントをフォルダへ一括で取り出す。引数はよく変える順に
 *     並んでいます。
 *     第1: 取り出し方法(merge/overwrite)。省略すると統合で、テキストに
 *          書いた内容を残します。ゲームの内容で全て取り直すときだけ overwrite。
 *     第2: 出力先フォルダ名。省略すると text。
 *     第3: ゲームデータのフォルダ名。省略すると data。
 *   BATCH_EXPORT_MESSAGES_TO_FOLDER
 *   BATCH_EXPORT_MESSAGES_TO_FOLDER overwrite
 *   BATCH_EXPORT_MESSAGES_TO_FOLDER merge text-en
 *   BATCH_EXPORT_MESSAGES_TO_FOLDER merge text data
 *   フォルダへ一括取り出し overwrite
 *   一括取り出し merge
 *
 * --------------------------------------
 * 発展: テキストとゲームを自動で同期する
 * --------------------------------------
 *  取り出したあとも、ゲームとテキストを見張って変更を自動で追従させることが
 *  できます。Text2Frame の START_DATA_SYNC（テキストとゲームの同期を開始）を
 *  実行してください。まず一括で両方を揃えてから見張り始めます。
 *
 *     START_DATA_SYNC            双方向で同期する
 *     START_DATA_SYNC pull       ゲーム→テキストだけ同期する
 *
 *  ◆ 使う前に知っておくこと
 *   ・同期には Text2Frame プラグインが必要です（同期の実体はそちらにあります）。
 *   ・同期はゲームの実行中のみ動作します。プレイテストを閉じると止まります。
 *   ・止めるときは Text2Frame の「テキストとゲームの同期を停止」(STOP_DATA_SYNC)
 *     を実行します。
 *   ・進行状況はコンソール（F8）に出ます。ゲーム画面には出ません。
 *   ・エディタで「プロジェクトの保存」をすると data フォルダが丸ごと書き戻り、
 *     反映済みの内容が失われます。ツクールのエディタは閉じて使ってください。
 *
 * -------------------------------------
 * ツクールMZでの実行方法
 * -------------------------------------
 * 1. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
 *
 * 2. テキストファイルに出力したいマップID, イベントID, ページID、コモンイベン
 *    トIDをメモしておきます。
 *    ・マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの
 *      左上に記載されています。
 *    ・イベントIDはイベントをダブルクリックして出るイベントエディターの左上に
 *      記載されています。
 *    ・ページIDはイベントエディターのイベントの名前の下に記載されています。
 *    ・コモンイベントIDはデータベースのコモンイベントのデータリストから確認で
 *      きます。
 *
 * 3. プラグインの管理画面から本プラグインのパラメータを下記の通り編集します。
 *  ・「英語タグ」にテキストに出力される言語をtrueかfalseで入力。
 *      (デフォルトでtrue(英語)です)
 *        - trueの場合の名前タグの例 ："<Name: リード>"
 *        - falseの場合の名前タグの例："<名前: リード>"
 *
 * 4. 以下の手順でプラグインコマンドを作成する。
 *  【マップのイベントを出力したい場合】
 *   ・「イベントをエクスポート」を選択。
 *   ・「出力フォルダ名」に1.で作成したフォルダ名を入力。
 *       (デフォルトはtextです)
 *   ・「出力ファイル名」に出力したいテキストファイル名を入力。
 *       (デフォルトはmessage.txtです)
 *   ・「出力するマップID」に2.でメモしたマップIDを入力。
 *       (デフォルトは1です)
 *   ・「出力するイベントID」に2.でメモしたイベントIDを入力。
 *       (デフォルトは2です)
 *   ・「出力するページID」に2.でメモしたページIDを入力。
 *       (デフォルトで1です)
 *  【コモンイベントを出力したい場合】
 *   ・「コモンイベントをエクスポート」を選択。
 *   ・「出力フォルダ名」に1.で作成したフォルダ名を入力。
 *       (デフォルトはtextです)
 *   ・「出力ファイル名」に出力したいテキストファイル名を入力。
 *       (デフォルトはmessage.txtです)
 *   ・「出力するコモンイベントID」に2.でメモしたコモンイベントIDを入力。
 *       (デフォルトで1です)

 *
 * 5. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
 *    【成功した場合】
 *      出力されたMapID、EventID、PageID、Common EventIDや
 *      フォルダ、ファイル名のメッセージが表示されます。
 *    【失敗した場合】
 *      「Save failed./ 保存に失敗しました ファイルが開いていないか確認してくだ
 *       さい」
 *      というメッセージが表示された場合は、指定したフォルダが作成されているか
 *      の確認と指定したファイルが開いていないかを確認してください。
 *
 * --------------------------------------
 * 注意事項
 * --------------------------------------
 * プラグイン作者は、いかなる場合も破損したプロジェクトの復元には
 * 応じられませんのでご注意ください。
 * テキストファイルの文字コードはUTF-8にのみ対応しています。
 *
 * --------------------------------------
 * Version
 * --------------------------------------
 * 1.1.0
 */
/* eslint-enable spaced-comment */

/* global Game_Interpreter, $gameMessage, process, PluginManager, globalThis, __dirname */

// Text2Frame の共有 API を解決する。ゲーム内(NW.js)は require('./Text2Frame.js') が
// 解決できないため、まず Text2Frame がグローバル公開した API を使い、無ければ Node の
// require(兄弟ファイル / __dirname 基準)にフォールバックする。
function resolveText2Frame () {
  try {
    // 古い NW.js(Chromium<71)には globalThis が無い。ゲーム内の共有グローバルは window なので
    // window / global にもフォールバックしないと $LaurusText2Frame を見つけられず取り出しが失敗する。
    const glob = (typeof globalThis !== 'undefined')
      ? globalThis
      : (typeof window !== 'undefined')
          ? window
          : (typeof global !== 'undefined') ? global : null
    if (glob && glob.$LaurusText2Frame && glob.$LaurusText2Frame.saveBaseText) {
      return glob.$LaurusText2Frame
    }
  } catch (e) { /* noop */ }
  if (typeof require !== 'undefined') {
    try { return require('./Text2Frame.js') } catch (e) { /* try next */ }
    try { return require(require('path').join(__dirname, 'Text2Frame.js')) } catch (e) { /* give up */ }
  }
  return null
}

(function () {
  'use strict'

  var Laurus = Laurus || {} // eslint-disable-line no-var, no-use-before-define
  Laurus.Frame2Text = {}

  if (typeof PluginManager === 'undefined') {
    Laurus.Frame2Text.FileFolder = 'test'
    Laurus.Frame2Text.FileName = 'basic.txt'
    Laurus.Frame2Text.CommonEventID = '1'
    Laurus.Frame2Text.MapID = '1'
    Laurus.Frame2Text.EventID = '1'
    Laurus.Frame2Text.PageID = '1'
    Laurus.Frame2Text.IsDebug = true
    Laurus.Frame2Text.DisplayMsg = true
    Laurus.Frame2Text.DisplayWarning = true
    Laurus.Frame2Text.EnglishTag = true
    Laurus.Frame2Text.OmitDefaultTags = true
    // 単発取り出しのしかた。COMMAND_LINE(CLI)が毎回上書きする。
    Laurus.Frame2Text.Strategy = 'merge'

    globalThis.Game_Interpreter = {}
    Game_Interpreter.prototype = {}
    globalThis.$gameMessage = {}
    $gameMessage.add = function () {}
  } else {
    // for default plugin command
    Laurus.Frame2Text.Parameters = PluginManager.parameters('Frame2Text')
    Laurus.Frame2Text.FileFolder = String(Laurus.Frame2Text.Parameters['Default Scenario Folder'])
    Laurus.Frame2Text.FileName = String(Laurus.Frame2Text.Parameters['Default Scenario File'])
    Laurus.Frame2Text.CommonEventID = String(Laurus.Frame2Text.Parameters['Default Common Event ID'])
    Laurus.Frame2Text.MapID = String(Laurus.Frame2Text.Parameters['Default MapID'])
    Laurus.Frame2Text.EventID = String(Laurus.Frame2Text.Parameters['Default EventID'])
    Laurus.Frame2Text.PageID = String(Laurus.Frame2Text.Parameters['Default PageID'])
    Laurus.Frame2Text.IsDebug = String(Laurus.Frame2Text.Parameters.IsDebug) === 'true'
    Laurus.Frame2Text.DisplayMsg = String(Laurus.Frame2Text.Parameters.DisplayMsg) === 'true'
    // 未設定(この設定が無かった頃のまま)なら出す。既定を true にしているため。
    Laurus.Frame2Text.DisplayWarning = String(Laurus.Frame2Text.Parameters.DisplayWarning) !== 'false'
    Laurus.Frame2Text.EnglishTag = String(Laurus.Frame2Text.Parameters.EnglishTag) === 'true'
    // 未設定(古いプラグイン設定のまま)なら省略する。既定を true にしているため。
    Laurus.Frame2Text.OmitDefaultTags = String(Laurus.Frame2Text.Parameters.OmitDefaultTags) !== 'false'
    // 単発取り出しのしかた。コマンドの引数解決で毎回決め直す。
    Laurus.Frame2Text.Strategy = 'merge'
    let PATH_SEP = '/'
    let BASE_PATH = '.'
    if (typeof require !== 'undefined') {
      const path = require('path')
      PATH_SEP = path.sep
      const mainFile = process.mainModule && process.mainModule.filename
      BASE_PATH = mainFile ? path.dirname(mainFile) : process.cwd()
    }
    Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`
    Laurus.Frame2Text.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${('000' + Laurus.Frame2Text.MapID).slice(
      -3
    )}.json`
    Laurus.Frame2Text.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`
  }

  //= ============================================================================
  // Game_Interpreter
  //= ============================================================================

  // for MZ plugin command
  if (typeof PluginManager !== 'undefined' && PluginManager.registerCommand) {
    PluginManager.registerCommand('Frame2Text', 'EXPORT_EVENT_TO_MESSAGE', function (args) {
      const file_folder = args.FileFolder
      const file_name = args.FileName
      const map_id = args.MapID
      const event_id = args.EventID
      const page_id = args.PageID
      this.pluginCommand('EXPORT_EVENT_TO_MESSAGE',
        [file_folder, file_name, map_id, event_id, page_id, args.Strategy])
    })
    PluginManager.registerCommand('Frame2Text', 'EXPORT_CE_TO_MESSAGE', function (args) {
      const file_folder = args.FileFolder
      const file_name = args.FileName
      const common_event_id = args.CommonEventID
      this.pluginCommand('EXPORT_CE_TO_MESSAGE',
        [file_folder, file_name, common_event_id, args.Strategy])
    })
    PluginManager.registerCommand('Frame2Text', 'BATCH_EXPORT_MESSAGES_TO_FOLDER', function (args) {
      // 引数順は @arg の並びと合わせる。よく変えるものから順に
      // 取り出し方法 -> 出力先 -> データフォルダ。
      this.pluginCommand('BATCH_EXPORT_MESSAGES_TO_FOLDER',
        [args.Strategy, args.TextBase, args.DataFolder])
    })
  }

  const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand
  Game_Interpreter.prototype.pluginCommand = function (command, args) {
    _Game_Interpreter_pluginCommand.apply(this, arguments)
    this.pluginCommandFrame2Text(command, args)
  }

  Game_Interpreter.prototype.pluginCommandFrame2Text = function (command, args) {
    /* $gameMessage の1行に収まる幅(半角換算)。ツクールMVの既定
     * (ウィンドウ 816px - 余白 18px×2 = 780px、半角1文字 14px)で 55 文字ぶん。
     * MZ の既定は約 60 なので、狭いMVに合わせておけば両方で収まる。
     * これを超えた文章は画面の外に出て読めなくなるため、出す前に折り返す。
     * 取り出しは Text2Frame が無くても動く必要があるため、依存を作らずここに持つ
     * (Text2Frame 側の同名の実装と対になっている。直すときは両方)。 */
    const MESSAGE_LINE_WIDTH = 55
    // これより手前の切りどころは無視して幅いっぱいまで詰める。
    const MIN_BREAK_WIDTH = 33
    // 最終行がこれより短いと泣き別れに見えるので、直前の行と分け直す。
    const MIN_TAIL_WIDTH = 10
    // 全角(和文・全角記号)は2、それ以外は1として数える。
    // U+3000(全角空白)や句読点も U+2E80-U+A4CF に入る。半角カナ(U+FF61-)は幅1のまま。
    const charWidth = function (ch) { return /[\u2E80-\uA4CF\uFF00-\uFF60\uFFE0-\uFFE6]/.test(ch) ? 2 : 1 }
    const displayWidth = function (s) {
      let w = 0
      for (const ch of String(s)) w += charWidth(ch)
      return w
    }
    // ここで切れると読みやすい文字。句読点や閉じ括弧の「後ろ」、空白の位置で折る。
    // 裏を返せばこれらは行頭に来てはいけない文字(禁則)でもある。
    const BREAK_AFTER = /[、。！？」』）\]｝}：；,.!?)]/
    // 禁則で1〜2文字はみ出すぶんには、ウィンドウの余白(左右18px)に収まるので許す。
    // 句点だけが次の行に取り残されるより読みやすい。
    const KINSOKU_SLACK = 2
    /* 1行に収まらない文章を折り返して行の配列にする。元からある改行はそのまま行の区切りにする。
     * 切りどころが無ければ幅で切る(長いパスなどは途中で切れるが、画面外に消えるよりはよい)。 */
    const wrapMessageText = function (text) {
      const out = []
      String(text).split('\n').forEach(function (line) {
        if (displayWidth(line) <= MESSAGE_LINE_WIDTH) {
          out.push(line)
          return
        }
        let cur = ''
        let w = 0
        let breakAt = -1
        let lastCutWasHard = false
        for (const ch of line) {
          const cw = charWidth(ch)
          // 句読点や閉じ括弧が行頭に落ちそうなときは、はみ出させてでも前の行に残す。
          if (w + cw > MESSAGE_LINE_WIDTH && BREAK_AFTER.test(ch) &&
              w + cw <= MESSAGE_LINE_WIDTH + KINSOKU_SLACK) {
            cur += ch
            w += cw
            breakAt = cur.length
            continue
          }
          if (w + cw > MESSAGE_LINE_WIDTH) {
            // 切りどころが行頭に寄りすぎているときは使わない(短い行が量産されるため)。
            const useBreak = breakAt > 0 && breakAt <= cur.length &&
              displayWidth(cur.slice(0, breakAt)) >= MIN_BREAK_WIDTH
            const cut = useBreak ? breakAt : cur.length
            lastCutWasHard = !useBreak
            out.push(cur.slice(0, cut))
            cur = cur.slice(cut).replace(/^ +/, '')
            w = displayWidth(cur)
            breakAt = -1
          }
          cur += ch
          w += cw
          if (ch === ' ' || BREAK_AFTER.test(ch)) breakAt = cur.length
        }
        if (cur !== '') out.push(cur)
        // 語の途中で切った結果1〜2文字だけ泣き別れたときは、直前の行と2等分し直す。
        // 句読点や空白で切れているならそれが自然な区切りなので触らない。
        const n = out.length
        if (lastCutWasHard && n >= 2 && displayWidth(out[n - 1]) < MIN_TAIL_WIDTH) {
          const joined = out[n - 2] + out[n - 1]
          const half = Math.ceil(displayWidth(joined) / 2)
          let acc = 0
          let at = 0
          for (const ch of joined) {
            if (acc >= half) break
            acc += charWidth(ch)
            at += ch.length
          }
          out[n - 2] = joined.slice(0, at)
          out[n - 1] = joined.slice(at)
        }
      })
      return out
    }

    const addMessage = function (text) {
      if (Laurus.Frame2Text.DisplayMsg) {
        // allText() は _texts を改行で繋ぐので、行ごとに add しても見た目は変わらない。
        wrapMessageText(text).forEach(function (l) { $gameMessage.add(l) })
      }
    }

    // 警告は「警告文表示」で切る。「メッセージ表示」を切っても残るのはそのため。
    const addWarning = function (warning) {
      if (Laurus.Frame2Text.DisplayWarning) {
        wrapMessageText(warning).forEach(function (l) { $gameMessage.add(l) })
      }
    }

    let PATH_SEP = '/'
    let BASE_PATH = '.'
    if (typeof require !== 'undefined') {
      const path = require('path')
      PATH_SEP = path.sep
      // process.mainModule は環境によって undefined のことがある(VSCode 拡張ホスト等)。
      const mainFile = process.mainModule && process.mainModule.filename
      BASE_PATH = mainFile ? path.dirname(mainFile) : process.cwd()
    }

    Laurus.Frame2Text.ExecMode = command.toUpperCase()
    // 入力ファイル(MAPXXX.json)、出力ファイル(message.txt)の情報
    /* 単発の取り出しコマンドの「取り出しのしかた」。反映側の add に当たるものは無い。
     * 省略時は統合: 一括取り出し・CLI・t2f-sync・VS Code と揃え、テキストに書いた内容を
     * 黙って消さない。 */
    const resolveExportStrategy = function (explicit) {
      const s = String(explicit == null ? '' : explicit).toLowerCase()
      if (s === 'merge' || s === 'overwrite') return s
      if (s !== '' && s !== 'undefined') {
        throw new Error('Unknown strategy: ' + explicit +
          ' / 取り出しのしかたは merge か overwrite を指定してください。')
      }
      return 'merge'
    }

    switch (Laurus.Frame2Text.ExecMode) {
      // for custom plugin command
      case 'EXPORT_EVENT_TO_MESSAGE':
      case 'イベントをメッセージにエクスポ－ト':
        Laurus.Frame2Text.ExecMode = 'EXPORT_EVENT_TO_MESSAGE'
        if (args[0]) Laurus.Frame2Text.FileFolder = args[0]
        if (args[1]) Laurus.Frame2Text.FileName = args[1]
        if (args[2]) Laurus.Frame2Text.MapID = args[2]
        if (args[3]) Laurus.Frame2Text.EventID = args[3]
        if (args[4]) Laurus.Frame2Text.PageID = args[4]
        Laurus.Frame2Text.Strategy = resolveExportStrategy(args[5])
        if (args[0] || args[1]) {
          Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`
          Laurus.Frame2Text.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${(
            '000' + Laurus.Frame2Text.MapID
          ).slice(-3)}.json`
        }
        addMessage(
          '======> MapID: ' +
            Laurus.Frame2Text.MapID +
            ' -> EventID: ' +
            Laurus.Frame2Text.EventID +
            ' -> PageID: ' +
            Laurus.Frame2Text.PageID
        )
        break
      case 'EXPORT_CE_TO_MESSAGE':
      case 'コモンイベントをメッセージにエクスポート':
        Laurus.Frame2Text.ExecMode = 'EXPORT_CE_TO_MESSAGE'
        if (args[0]) Laurus.Frame2Text.FileFolder = args[0]
        if (args[1]) Laurus.Frame2Text.FileName = args[1]
        if (args[2]) Laurus.Frame2Text.CommonEventID = args[2]
        Laurus.Frame2Text.Strategy = resolveExportStrategy(args[3])
        if (args[0] || args[1]) {
          Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`
          Laurus.Frame2Text.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`
        }
        addMessage('=====> Common EventID: ' + Laurus.Frame2Text.CommonEventID)
        break

      case 'BATCH_EXPORT_MESSAGES_TO_FOLDER':
      case 'フォルダへ一括取り出し':
      case '一括取り出し': {
        // よく変えるものから順に: 取り出し方法 -> 出力先 -> データフォルダ。
        // @arg の並び・registerCommand の渡し順と揃えること。
        // 既定は merge。CLI・t2f-sync・VSCode と揃え、テキストに書いた内容を黙って
        // 消さないようにする。初回(既存テキスト無し)は merge も overwrite も同じ結果。
        const batchStrategy = String(args[0] || 'merge').toLowerCase()
        if (batchStrategy !== 'merge' && batchStrategy !== 'overwrite') {
          throw new Error('Unknown strategy: ' + args[0] + ' / 取り出し方法は merge か overwrite を指定してください。')
        }
        Laurus.Frame2Text.TextBase = args[1] || 'text'
        Laurus.Frame2Text.DataFolder = args[2] || 'data'
        Laurus.Frame2Text.BatchStrategy = batchStrategy
        Laurus.Frame2Text.ExecMode = 'BATCH_EXPORT_MESSAGES_TO_FOLDER'
        break
      }
      case 'COMMAND_LINE':
        Laurus.Frame2Text = Object.assign(Laurus.Frame2Text, args[0])
        break
      case 'LIBRARY_EXPORT':
        break
      default:
        return
    }

    const logger = {}
    logger.log = function () {
      if (Laurus.Frame2Text.IsDebug) {
        console.debug.apply(console, arguments)
      }
    }

    logger.error = function () {
      console.error(Array.prototype.join.call(arguments))
    }

    const readText = function (filepath) {
      try {
        const fs = require('fs')
        return fs.readFileSync(filepath, { encoding: 'utf8' })
      } catch (e) {
        throw new Error('File not found. / ファイルが見つかりません。\n' + filepath)
      }
    }

    const readJsonData = function (filepath) {
      try {
        const jsondata = JSON.parse(readText(filepath))
        if (typeof jsondata === 'object') {
          return jsondata
        } else {
          throw new Error(
            'Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n' + filepath
          )
        }
      } catch (e) {
        throw new Error(
          'Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n' + filepath
        )
      }
    }

    const writeData = function (filepath, textData) {
      try {
        const fs = require('fs')
        fs.writeFileSync(filepath, textData, { encoding: 'utf8' })
      } catch (e) {
        throw new Error(
          'Save failed. / 保存に失敗しました。\n' + 'ファイルが開いていないか確認してください。\n' + filepath
        )
      }
    }

    let map_events
    // プラグインコマンド(MZ)用の変数
    let mzCount
    switch (Laurus.Frame2Text.ExecMode) {
      // 入力ファイル(MAPXXX.json)の内容を読み込む
      case 'EXPORT_EVENT_TO_MESSAGE':
      case 'イベントをメッセージにエクスポ－ト': {
        const map_data = readJsonData(Laurus.Frame2Text.MapPath)
        if (!map_data.events[Laurus.Frame2Text.EventID]) {
          throw new Error(
            'EventID not found. / EventIDが見つかりません。\n' + 'Event ID: ' + Laurus.Frame2Text.EventID
          )
        }
        const pageID = Number(Laurus.Frame2Text.PageID) - 1
        if (!map_data.events[Laurus.Frame2Text.EventID].pages[pageID]) {
          throw new Error('PageID not found. / PageIDが見つかりません。\n' + 'Page ID: ' + Laurus.Frame2Text.PageID)
        }
        map_events = map_data.events[Laurus.Frame2Text.EventID].pages[pageID].list
        break
      }
      // 入力ファイル(CommonEvents.json)の内容を読み込む
      case 'EXPORT_CE_TO_MESSAGE':
      case 'コモンイベントをメッセージにエクスポート': {
        const ce_data = readJsonData(Laurus.Frame2Text.CommonEventPath)
        if (ce_data.length - 1 < Laurus.Frame2Text.CommonEventID) {
          throw new Error(
            'Common Event not found. / コモンイベントが見つかりません。: ' + Laurus.Frame2Text.CommonEventID
          )
        }

        const ce_events = ce_data[Laurus.Frame2Text.CommonEventID].list
        map_events = ce_events
        break
      }
    }

    //* ********************************* */
    // 出力ファイル(message.txt)の内容を作成
    //* ********************************* */
    // 改行コード
    const newLine = '\n'
    // カンマ
    const comma = ', '
    // インデント(半角空白)
    // const space = ' '
    // const baseIndent = 4
    const EnglishTag = Laurus.Frame2Text.EnglishTag
    // 関数
    const getOnOffRadioButtonValue = (checkBoxValue) => {
      if (checkBoxValue === 0) return EnglishTag ? 'ON' : 'オン'
      else if (checkBoxValue === 1) return EnglishTag ? 'OFF' : 'オフ'
      else return EnglishTag ? 'ON' : 'オン'
    }
    const getIncreaseOrDecrease = (operationValue) => {
      if (operationValue === 0) return EnglishTag ? 'Increase' : '増やす'
      else if (operationValue === 1) return EnglishTag ? 'Decrease' : '減らす'
      else return EnglishTag ? 'Increase' : '増やす'
    }
    const getConstantOrVariable = (operandType, operandValue) => {
      const variablesText = EnglishTag ? 'Variables[' + operandValue + ']' : '変数[' + operandValue + ']'
      if (operandType === 0) return Number(operandValue)
      else if (operandType === 1) return variablesText
      else return Number(operandValue)
    }
    const getEnemyOrActor = (subjectType, subjectValue) => {
      const actorsText = EnglishTag ? 'Actors[' + subjectValue + ']' : 'アクター[' + subjectValue + ']'
      if (subjectType === 0) return Number(subjectValue) + 1
      else if (subjectType === 1) return actorsText
      else return Number(subjectValue)
    }
    const getFixedOrVariable = (operandType, operandValue) => {
      const variablesText = EnglishTag ? 'Variables[' + operandValue + ']' : '変数[' + operandValue + ']'
      if (operandType === 0) return Number(operandValue)
      else if (operandType === 1) return variablesText
      else if (operandType === 2) return EnglishTag ? 'Random' : 'ランダム'
      else return Number(operandValue)
    }
    const getCheckBoxOnOffValue = (checkBoxValue) => {
      if (checkBoxValue === 0) return EnglishTag ? 'OFF' : 'オフ'
      else if (checkBoxValue === 1) return EnglishTag ? 'ON' : 'オン'
      else if (checkBoxValue === false) return EnglishTag ? 'OFF' : 'オフ'
      else if (checkBoxValue === true) return EnglishTag ? 'ON' : 'オン'
      else return EnglishTag ? 'OFF' : 'オフ'
    }
    const getCheckBoxMessage = (checkBoxValue, message1, message2) => {
      return checkBoxValue ? (EnglishTag ? message1 : message2) : (EnglishTag ? 'OFF' : 'オフ')
    }
    const getCheckBoxIncludeEquipmentValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Include Equipment', '装備品を含む')
    }
    const getCheckBoxInitializeValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Initialize', '初期化')
    }
    const getCheckBoxAllowKnockoutValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Allow Knockout', '戦闘不能を許可')
    }
    const getCheckBoxShowLevelUpValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Show Level Up', 'レベルアップを表示')
    }
    const getCheckBoxSaveEXPValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Save EXP', '経験値の保存')
    }
    const getCheckBoxWaitforCompletionValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Wait for Completion', '完了までウェイト')
    }
    const getCheckBoxRepeatMovementsValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Repeat Movements', '動作を繰り返す')
    }
    const getCheckBoxSkipValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Skip If Cannot Move', '移動できない場合は飛ばす')
    }
    const getCheckBoxPurchaseOnlyValue = (checkBoxValue) => {
      return getCheckBoxMessage(checkBoxValue, 'Purchase Only', '購入のみ')
    }
    const getAddOrRemove = (operationType) => {
      if (operationType === 0) return EnglishTag ? 'Add' : '加える'
      else if (operationType === 1) return EnglishTag ? 'Remove' : '外す'
      else return EnglishTag ? 'Add' : '加える'
    }
    const getDisableEnable = (radioButton) => {
      if (radioButton === 0) return EnglishTag ? 'Disable' : '禁止'
      else if (radioButton === 1) return EnglishTag ? 'Enable' : '許可'
      else return EnglishTag ? 'Disable' : '禁止'
    }
    const getActorParameterValue = (actorParameter) => {
      if (actorParameter === 0) return EnglishTag ? 'MaxHP' : '最大HP'
      else if (actorParameter === 1) return EnglishTag ? 'MaxMP' : '最大MP'
      else if (actorParameter === 2) return EnglishTag ? 'Attack' : '攻撃力'
      else if (actorParameter === 3) return EnglishTag ? 'Defense' : '防御力'
      else if (actorParameter === 4) return EnglishTag ? 'M.Attack' : '魔法力'
      else if (actorParameter === 5) return EnglishTag ? 'M.Defense' : '魔法防御'
      else if (actorParameter === 6) return EnglishTag ? 'Agility' : '敏捷性'
      else if (actorParameter === 7) return EnglishTag ? 'Luck' : '運'
      else return EnglishTag ? 'MaxHP' : '最大HP'
    }
    const getLearnOrForgot = (operationType) => {
      if (operationType === 0) return EnglishTag ? 'Learn' : '覚える'
      else if (operationType === 1) return EnglishTag ? 'Forget' : '忘れる'
      else return EnglishTag ? 'Learn' : '覚える'
    }
    const getDirectOrVariablesValue = (location) => {
      if (location === 0) return EnglishTag ? 'Direct' : '直接指定'
      else if (location === 1) return EnglishTag ? 'WithVariables' : '変数で指定'
      else if (location === 2) return EnglishTag ? 'Exchange' : '交換'
      else return EnglishTag ? 'Direct' : '直接指定'
    }
    const getDirectOrVariablesOrCharacterValue = (location) => {
      if (location === 0) return EnglishTag ? 'Direct' : '直接指定'
      else if (location === 1) return EnglishTag ? 'WithVariables' : '変数で指定'
      else if (location === 2) return EnglishTag ? 'Character' : 'キャラクター'
      else return EnglishTag ? 'Direct' : '直接指定'
    }
    const getItemOrWeaponOrArmorValue = (location) => {
      if (location === 0) return EnglishTag ? 'Item' : 'アイテム'
      else if (location === 1) return EnglishTag ? 'Weapon' : '武器'
      else if (location === 2) return EnglishTag ? 'Armor' : '防具'
      else return EnglishTag ? 'Item' : 'アイテム'
    }
    const getStandardOrSpecifyValue = (price, priceValue) => {
      if (price === 0) return EnglishTag ? 'Standard' : '標準'
      else if (price === 1) return priceValue
      else return EnglishTag ? 'Standard' : '標準'
    }
    const getDirectionValue = (direction) => {
      if (direction === 0) return EnglishTag ? 'Retain' : 'そのまま'
      else if (direction === 2) return EnglishTag ? 'Down' : '下'
      else if (direction === 4) return EnglishTag ? 'Left' : '左'
      else if (direction === 6) return EnglishTag ? 'Right' : '右'
      else if (direction === 8) return EnglishTag ? 'Up' : '上'
      else return EnglishTag ? 'Retain' : 'そのまま'
    }
    const getFadeValue = (fade) => {
      if (fade === 0) return EnglishTag ? 'Black' : '黒'
      else if (fade === 1) return EnglishTag ? 'White' : '白'
      else if (fade === 2) return EnglishTag ? 'None' : 'なし'
      else return EnglishTag ? 'Black' : '黒'
    }
    const getVehicleValue = (vehicle) => {
      if (vehicle === 0) return EnglishTag ? 'Boat' : '小型船'
      else if (vehicle === 1) return EnglishTag ? 'Ship' : '大型船'
      else if (vehicle === 2) return EnglishTag ? 'Airship' : '飛行船'
      else return EnglishTag ? 'Boat' : '小型船'
    }
    const getEventValue = (event) => {
      if (event === -1) return EnglishTag ? 'Player' : 'プレイヤー'
      if (event === 0) return EnglishTag ? 'This Event' : 'このイベント'
      else return event
    }
    const getEventValue2 = (event) => {
      if (event === -1) return EnglishTag ? 'Player' : 'プレイヤー'
      if (event === 0) return EnglishTag ? 'ThisEvent' : 'このイベント'
      else return event
    }
    const getSpeedValue = (speed) => {
      if (speed === 1) return EnglishTag ? 'x8 slower' : '1/8倍速'
      else if (speed === 2) return EnglishTag ? 'x4 slower' : '1/4倍速'
      else if (speed === 3) return EnglishTag ? 'x2 slower' : '1/2倍速'
      else if (speed === 4) return EnglishTag ? 'Normal' : '標準速'
      else if (speed === 5) return EnglishTag ? 'x2 faster' : '2倍速'
      else if (speed === 6) return EnglishTag ? 'x4 faster' : '4倍速'
      else return EnglishTag ? 'x8 slower' : '1/8倍速'
    }
    const getFrequencyValue = (frequency) => {
      if (frequency === 1) return EnglishTag ? 'Lowest' : '最低'
      else if (frequency === 2) return EnglishTag ? 'Lower' : '低'
      else if (frequency === 3) return EnglishTag ? 'Normal' : '標準'
      else if (frequency === 4) return EnglishTag ? 'Higher' : '高'
      else if (frequency === 5) return EnglishTag ? 'Highest' : '最高'
      else return EnglishTag ? 'Lowest' : '最低'
    }
    const getBalloonIconValue = (balloonIcon) => {
      if (balloonIcon === 1) return EnglishTag ? 'Exclamation' : 'びっくり'
      else if (balloonIcon === 2) return EnglishTag ? 'Question' : 'はてな'
      else if (balloonIcon === 3) return EnglishTag ? 'Music note' : '音符'
      else if (balloonIcon === 4) return EnglishTag ? 'Heart' : 'ハート'
      else if (balloonIcon === 5) return EnglishTag ? 'Anger' : '怒り'
      else if (balloonIcon === 6) return EnglishTag ? 'Sweat' : '汗'
      else if (balloonIcon === 7) return EnglishTag ? 'Flustration' : 'くしゃくしゃ'
      else if (balloonIcon === 8) return EnglishTag ? 'Silence' : '沈黙'
      else if (balloonIcon === 9) return EnglishTag ? 'Light bulb' : '電球'
      else if (balloonIcon === 10) return EnglishTag ? 'zzz' : 'zzz'
      else if (balloonIcon === 11) return EnglishTag ? 'User-defined1' : 'ユーザー定義1'
      else if (balloonIcon === 12) return EnglishTag ? 'User-defined2' : 'ユーザー定義2'
      else if (balloonIcon === 13) return EnglishTag ? 'User-defined3' : 'ユーザー定義3'
      else if (balloonIcon === 14) return EnglishTag ? 'User-defined4' : 'ユーザー定義4'
      else if (balloonIcon === 15) return EnglishTag ? 'User-defined5' : 'ユーザー定義5'
      else return EnglishTag ? 'Exclamation' : 'びっくり'
    }
    const getPositionValue = (position, direct, x, y) => {
      const originUpperLeft = EnglishTag ? 'Upper Left' : '左上'
      const originCenter = EnglishTag ? 'Center' : '中央'
      const originString = position === 0 ? originUpperLeft : originCenter
      const variablesString = EnglishTag ? 'Variables' : '変数'
      const positionString = EnglishTag ? 'Position' : '位置'
      if (direct === 0) return `${positionString}[${originString}][${x}][${y}]`
      else if (direct === 1) return `${positionString}[${originString}][${variablesString}[${x}]][${variablesString}[${y}]]`
    }
    const getScaleValue = (width, Height) => {
      const scaleStr = EnglishTag ? 'Scale' : '拡大率'
      return `${scaleStr}[${width}][${Height}]`
    }
    const getBlendModeValue = (blendMode) => {
      if (blendMode === 0) return EnglishTag ? 'Normal' : '通常'
      else if (blendMode === 1) return EnglishTag ? 'Additive' : '加算'
      else if (blendMode === 2) return EnglishTag ? 'Multiply' : '乗算'
      else if (blendMode === 3) return EnglishTag ? 'Screen' : 'スクリーン'
      else return EnglishTag ? 'Normal' : '通常'
    }
    const getBlendValue = (opcity, blendMode) => {
      const blendStr = EnglishTag ? 'Blend' : '合成'
      const blendModeValue = getBlendModeValue(blendMode)
      return `${blendStr}[${opcity}][${blendModeValue}]`
    }
    const getColorToneValue = (red, green, blue, gray) => {
      const colorToneStr = EnglishTag ? 'ColorTone' : '色調'
      if (red === 0 && green === 0 && blue === 0 && gray === 0) return EnglishTag ? 'ColorTone[Normal]' : '色調[通常]'
      else if (red === -68 && green === -68 && blue === -68 && gray === 0) { return EnglishTag ? 'ColorTone[Dark]' : '色調[ダーク]' } else if (red === 34 && green === -34 && blue === -68 && gray === 170) { return EnglishTag ? 'ColorTone[Sepia]' : '色調[セピア]' } else if (red === 68 && green === -34 && blue === -34 && gray === 0) { return EnglishTag ? 'ColorTone[Sunset]' : '色調[夕暮れ]' } else if (red === -68 && green === -68 && blue === 0 && gray === 68) { return EnglishTag ? 'ColorTone[Night]' : '色調[夜]' } else return `${colorToneStr}[${red}][${green}][${blue}][${gray}]`
    }
    const getDurationValue = (duration, waitForCompletion) => {
      const waitStr = EnglishTag ? 'Wait for Completion' : '完了までウェイト'
      const durationStr = EnglishTag ? 'Duration' : '時間'
      const wait = waitForCompletion ? waitStr : ''
      if (duration === 60 && waitForCompletion === true) return `${durationStr}[${duration}][${wait}]`
      else return `${durationStr}[${duration}][${wait}]`
    }
    const getEasingValue = (easing) => {
      const easingStr = EnglishTag ? 'Easing' : 'イージング'
      if (easing === 0) return EnglishTag ? `${easingStr}[Constant speed]` : `${easingStr}[一定速度]`
      else if (easing === 1) return EnglishTag ? `${easingStr}[Slow start]` : `${easingStr}[ゆっくり始まる]`
      else if (easing === 2) return EnglishTag ? `${easingStr}[Slow end]` : `${easingStr}[ゆっくり終わる]`
      else if (easing === 3) return EnglishTag ? `${easingStr}[Slow start and end]` : `${easingStr}[ゆっくり始まってゆっくり終わる]`
      else return EnglishTag ? `${easingStr}[Constant speed]` : `${easingStr}[一定速度]`
    }
    const getBackgroundValue = (background) => {
      if (background === 0) return EnglishTag ? 'Window' : 'ウインドウ'
      else if (background === 1) return EnglishTag ? 'Dim' : '暗くする'
      else if (background === 2) return EnglishTag ? 'Transparent' : '透明'
      else return EnglishTag ? 'Window' : 'ウインドウ'
    }
    const getWindowPositionValue = (windowPosition) => {
      if (windowPosition === 0) return EnglishTag ? 'Top' : '上'
      else if (windowPosition === 1) return EnglishTag ? 'Middle' : '中'
      else if (windowPosition === 2) return EnglishTag ? 'Bottom' : '下'
      else return EnglishTag ? 'Top' : '上'
    }
    const getChoiceWindowPositionValue = (windowPosition) => {
      if (windowPosition === 0) return EnglishTag ? 'Left' : '左'
      else if (windowPosition === 1) return EnglishTag ? 'Middle' : '中'
      else if (windowPosition === 2) return EnglishTag ? 'Right' : '右'
      else return EnglishTag ? 'Right' : '右'
    }
    const getDefaultChoiceValue = (defaultChoice) => {
      if (defaultChoice === -1) return EnglishTag ? 'None' : 'なし'
      else return defaultChoice + 1
    }
    const getCancelChoiceValue = (cancelChoice) => {
      if (cancelChoice === -2) return EnglishTag ? 'Branch' : '分岐'
      else if (cancelChoice === -1) return EnglishTag ? 'Disallow' : '禁止'
      else return cancelChoice + 1
    }
    const getLocationInfoTypeValue = (infoType) => {
      if (infoType === 0) return EnglishTag ? 'Terrain tag' : '地形タグ'
      else if (infoType === 1) return EnglishTag ? 'Event Id' : 'イベントid'
      else if (infoType === 2) return EnglishTag ? 'Layer 1' : 'レイヤー１'
      else if (infoType === 3) return EnglishTag ? 'Layer 2' : 'レイヤー２'
      else if (infoType === 4) return EnglishTag ? 'Layer 3' : 'レイヤー３'
      else if (infoType === 5) return EnglishTag ? 'Layer 4' : 'レイヤー４'
      else if (infoType === 6) return EnglishTag ? 'Region Id' : 'リージョンid'
      else return EnglishTag ? 'Terrain tag' : '地形タグ'
    }
    const getActionTarget = (target) => {
      if (target === -2) return EnglishTag ? 'Last Target' : 'ラストターゲット'
      else if (target === -1) return EnglishTag ? 'Random' : 'ランダム'
      else if (target === 0) return EnglishTag ? 'Index 1' : 'インデックス１'
      else if (target === 1) return EnglishTag ? 'Index 2' : 'インデックス２'
      else if (target === 2) return EnglishTag ? 'Index 3' : 'インデックス３'
      else if (target === 3) return EnglishTag ? 'Index 4' : 'インデックス４'
      else if (target === 4) return EnglishTag ? 'Index 5' : 'インデックス５'
      else if (target === 5) return EnglishTag ? 'Index 6' : 'インデックス６'
      else if (target === 6) return EnglishTag ? 'Index 7' : 'インデックス７'
      else if (target === 7) return EnglishTag ? 'Index 8' : 'インデックス８'
      else return EnglishTag ? 'Last Target' : 'ラストターゲット'
    }
    const getTimerValue = (timer) => {
      if (timer === 0) return EnglishTag ? 'Start' : '始動'
      else if (timer === 1) return EnglishTag ? 'Stop' : '停止'
      else return EnglishTag ? 'Start' : '始動'
    }
    const getIndent = (indentValue) => {
      const depth = typeof indentValue === 'number' && indentValue > 0 ? indentValue : 0
      return '    '.repeat(depth)
    }
    const getWeatherTypeValue = (weather) => {
      if (weather === 'none') return EnglishTag ? 'None' : 'なし'
      else if (weather === 'rain') return EnglishTag ? 'Rain' : '雨'
      else if (weather === 'storm') return EnglishTag ? 'Storm' : '嵐'
      else if (weather === 'snow') return EnglishTag ? 'Snow' : '雪'
      else return EnglishTag ? 'None' : 'なし'
    }
    const getControlVariablesTag = (operation) => {
      if (operation === 0) return EnglishTag ? '<Set: ' : '<代入: '
      else if (operation === 1) return EnglishTag ? '<Add: ' : '<加算: '
      else if (operation === 2) return EnglishTag ? '<Sub: ' : '<減算: '
      else if (operation === 3) return EnglishTag ? '<Mul: ' : '<乗算: '
      else if (operation === 4) return EnglishTag ? '<Div: ' : '<除算: '
      else if (operation === 5) return EnglishTag ? '<Mod: ' : '<剰余: '
      else return EnglishTag ? '<Set: ' : '<代入: '
    }
    const getGameData = (gameData) => {
      if (gameData === 0) return EnglishTag ? 'Item' : 'アイテム'
      else if (gameData === 1) return EnglishTag ? 'Weapon' : '武器'
      else if (gameData === 2) return EnglishTag ? 'Armor' : '防具'
      else if (gameData === 3) return EnglishTag ? 'Actor' : 'アクター'
      else if (gameData === 4) return EnglishTag ? 'Enemy' : '敵キャラ'
      else if (gameData === 5) return EnglishTag ? 'Character' : 'キャラクター'
      else if (gameData === 6) return EnglishTag ? 'Party' : 'パーティ'
      else if (gameData === 7) return EnglishTag ? 'その他' : 'その他'
      else if (gameData === 8) return EnglishTag ? 'Last' : '直前'
      else return EnglishTag ? 'Item' : 'アイテム'
    }
    const getGameDataActorParameter = (actorParameter) => {
      if (actorParameter === 0) return EnglishTag ? 'Level' : 'レベル'
      else if (actorParameter === 1) return EnglishTag ? 'Exp' : '経験値'
      else if (actorParameter === 2) return EnglishTag ? 'HP' : 'HP'
      else if (actorParameter === 3) return EnglishTag ? 'MP' : 'MP'
      else if (actorParameter === 4) return EnglishTag ? 'MaxHp' : '最大HP'
      else if (actorParameter === 5) return EnglishTag ? 'MaxMP' : '最大MP'
      else if (actorParameter === 6) return EnglishTag ? 'Attack' : '攻撃力'
      else if (actorParameter === 7) return EnglishTag ? 'Defense' : '防御力'
      else if (actorParameter === 8) return EnglishTag ? 'M.Attack' : '魔法攻撃力'
      else if (actorParameter === 9) return EnglishTag ? 'M.Defense' : '魔法防御力'
      else if (actorParameter === 10) return EnglishTag ? 'Agility' : '敏捷性'
      else if (actorParameter === 11) return EnglishTag ? 'Luck' : '運'
      else return EnglishTag ? 'Level' : 'レベル'
    }
    const getGameDataEnemyParameter = (actorParameter) => {
      if (actorParameter === 0) return EnglishTag ? 'HP' : 'HP'
      else if (actorParameter === 1) return EnglishTag ? 'MP' : 'MP'
      else if (actorParameter === 2) return EnglishTag ? 'MaxHp' : '最大HP'
      else if (actorParameter === 3) return EnglishTag ? 'MaxMP' : '最大MP'
      else if (actorParameter === 4) return EnglishTag ? 'Attack' : '攻撃力'
      else if (actorParameter === 5) return EnglishTag ? 'Defense' : '防御力'
      else if (actorParameter === 6) return EnglishTag ? 'M.Attack' : '魔法攻撃力'
      else if (actorParameter === 7) return EnglishTag ? 'M.Defense' : '魔法防御力'
      else if (actorParameter === 8) return EnglishTag ? 'Agility' : '敏捷性'
      else if (actorParameter === 9) return EnglishTag ? 'Luck' : '運'
      else return EnglishTag ? 'HP' : 'HP'
    }
    const getGameDataReference = (reference) => {
      if (reference === 0) return EnglishTag ? 'MapX' : 'マップX'
      else if (reference === 1) return EnglishTag ? 'MapY' : 'マップY'
      else if (reference === 2) return EnglishTag ? 'Direction' : '方向'
      else if (reference === 3) return EnglishTag ? 'ScreenX' : '画面X'
      else if (reference === 4) return EnglishTag ? 'ScreenY' : '画面Y'
      else return EnglishTag ? 'MapX' : 'マップX'
    }
    const getGameDataLast = (last) => {
      if (last === 0) return EnglishTag ? 'Last Used Skill ID' : '直前に使用したスキルのID'
      else if (last === 1) return EnglishTag ? 'Last Used Item ID' : '直前に使用したアイテムのID'
      else if (last === 2) return EnglishTag ? 'Last Actor ID to Act' : '直前に行動したアクターのID'
      else if (last === 3) return EnglishTag ? 'Last Enemy Index to Act' : '直前に行動した敵キャラのインデックス'
      else if (last === 4) return EnglishTag ? 'Last Target Actor ID' : '直前に対象となったアクターのID'
      else if (last === 5) return EnglishTag ? 'Last Target Enemy Index' : '直前に対象となった敵キャラのインデックス'
      else return EnglishTag ? 'Last Used Skill ID' : '直前に使用したスキルのID'
    }
    const getGameDataOther = (other) => {
      if (other === 0) return EnglishTag ? 'MapId' : 'マップid'
      else if (other === 1) return EnglishTag ? 'PartyMembers' : 'パーティ人数'
      else if (other === 2) return EnglishTag ? 'gold' : '所持金'
      else if (other === 3) return EnglishTag ? 'steps' : '歩数'
      else if (other === 4) return EnglishTag ? 'PlayTime' : 'プレイ時間'
      else if (other === 5) return EnglishTag ? 'timer' : 'タイマー'
      else if (other === 6) return EnglishTag ? 'SaveCount' : 'セーブ回数'
      else if (other === 7) return EnglishTag ? 'BattleCount' : '戦闘回数'
      else if (other === 8) return EnglishTag ? 'WinCount' : '勝利回数'
      else if (other === 9) return EnglishTag ? 'EscapeCount' : '逃走回数'
      else return EnglishTag ? 'PartyMembers' : 'パーティ人数'
    }
    const getEnemyTarget = (enemy) => {
      if (enemy === -1) return EnglishTag ? 'Entire Troop' : '敵グループ全体'
      else return Number(enemy) + 1
    }
    const getEnemyTarget2 = (enemy, targetAll) => {
      if (enemy === -1 || targetAll) return EnglishTag ? 'Entire Troop' : '敵グループ全体'
      else return Number(enemy) + 1
    }
    const getNone = (name) => {
      if (name === '') return EnglishTag ? 'None' : 'なし'
      else return name
    }

    // MZのプラグインパラメータをパースする補助関数
    const parseMzArg = function (args_string) {
      const args = []
      let buffer = ''
      let braceLevel = 0

      for (const char of args_string) {
        if (char === ',' && braceLevel === 0) {
          args.push(buffer.trim())
          buffer = ''
        } else {
          buffer += char
          if (char === '[' || char === '{') {
            braceLevel++
          } else if (char === ']' || char === '}') {
            braceLevel--
          }
        }
      }

      if (buffer) {
        args.push(buffer.trim())
      }

      return args
    }

    // 出力するテキスト変数
    // Laurus.Frame2Text.EnglishTagの値を別変数に代入
    // 整形(pretty)時にインデントを付与しないコード。
    // 複数行の本文を持つもの(メッセージ本文/スクロール文/注釈/スクリプト)は
    // 行頭の空白がそのまま本文として取り込まれ往復変換が壊れるため列0のままにする。
    // 357/657(プラグインコマンドMZ)は657側で直前に出力した357タグを
    // text.lastIndexOf('\n<') で探して引数注釈を差し込む。インデントを付けると
    // '\n    <' となりこの探索が直前の別行を誤って掴み往復変換が壊れるため列0のままにする。
    const RAW_CONTENT_CODES = [105, 108, 355, 357, 401, 405, 408, 655, 657]
    // 翻訳抽出モード(translationOnly)で残す会話系イベントコード。
    // 101/401: 文章の表示(顔・名前・位置・背景タグを含む), 102/402/403/404: 選択肢,
    // 105/405: 文章のスクロール表示。これ以外(スイッチ・変数・移動等)は出力しない。
    const CONVERSATION_CODES = [101, 401, 102, 402, 403, 404, 105, 405]
    const decompile = function (map_events, EnglishTag, options) {
      // イベントコード毎にループ
      const pretty = !!(options && options.pretty)
      const translationOnly = !!(options && options.translationOnly)
      /* 既定と同じ顔・背景・位置のタグを書かない。3つとも既定ならタグ行ごと消える。
       * 実プロジェクトでは「文章の表示」の 43.8% がこれに当たり、タグ行が雑音になっている。 */
      const omitDefaults = (options && options.omitDefaults !== undefined)
        ? !!options.omitDefaults
        : String(Laurus.Frame2Text.OmitDefaultTags) !== 'false'
      /* 省略してよいのは「タグが無いとき compile が補う値」と同じときだけ。出荷時の既定
       * (ウインドウ/下)を基準にすると、プラグインパラメータを変えているプロジェクトで壊れる。
       * Text2Frame が居ないと何を補われるか分からないので、そのときは背景・位置を省略しない。 */
      let msgDefaults = null
      if (omitDefaults) {
        const T2F = resolveText2Frame()
        if (T2F && T2F.getMessageDefaults) {
          try { msgDefaults = T2F.getMessageDefaults() } catch (e) { msgDefaults = null }
        }
      }
      let text = ''
      // 直前に出力したのがメッセージ本文(401)か。本文と次のコマンドの間に空行を入れるのに使う。
      let afterMessageText = false
      // タグ行をまるごと省いたとき、続く本文(401)にウィンドウの区切り(空行)を任せる。
      let blockStartPending = false
      map_events.forEach(function (event) {
        if (typeof event !== 'object') {
          return
        }
        // 翻訳抽出モード: 会話系以外のイベントはスキップ(タグを削除)
        if (translationOnly && CONVERSATION_CODES.indexOf(event.code) === -1) {
          return
        }
        const textBefore = text
        // インデント(整形時のみ。本文系コードは列0のまま)
        const indent = pretty && RAW_CONTENT_CODES.indexOf(event.code) === -1 ? getIndent(event.indent) : ''
        // メッセージ本文の後は必ず1行空けて、続くコマンドと視覚的に切り離す。
        // 続きの本文(401)と、自前で空行を入れる 101/105 は対象外(空行が二重になる)。
        // compile は空行を読み飛ばす(平文が続くときだけウィンドウ区切りになる)ので往復は変わらない。
        const blankAfterText = pretty && afterMessageText &&
          event.code !== 401 && event.code !== 101 && event.code !== 105
        // 改行とインデントを追加する関数
        const addNewLineIndent = (indent) => {
          // 最初のタグだけ改行を入れない
          text += text === '' ? indent : newLine + (blankAfterText ? newLine : '') + indent
        }
        // メッセージウィンドウの先頭に空行を入れて会話の区切りを見やすくする
        const addMessageBlockStart = () => {
          if (pretty && text !== '') {
            text += newLine + newLine + indent
          } else {
            addNewLineIndent(indent)
          }
        }
        /** ********************************************** */
        // メッセージ
        /** ********************************************** */
        if (event.code === 101) {
          const face = event.parameters[0]
          const faceId = event.parameters[1]
          const background = getBackgroundValue(event.parameters[2])
          const windowPosition = getWindowPositionValue(event.parameters[3])
          const name = event.parameters[4]

          // 顔にはプラグインパラメータが無く、compile は必ず ''/0 を補う。
          // なので空の顔は Text2Frame が居なくても省ける。
          const omitFace = omitDefaults && face === '' && Number(faceId) === 0
          // 背景・位置は文字列に直してから比べる。生の数値で比べると、未定義など
          // 想定外の値を getXValue が既定へ寄せる分がずれる。
          const omitBackground = omitDefaults && msgDefaults !== null &&
            background === getBackgroundValue(msgDefaults.background)
          const omitWindowPosition = omitDefaults && msgDefaults !== null &&
            windowPosition === getWindowPositionValue(msgDefaults.windowPosition)

          const faceTag = EnglishTag ? `<Face: ${face}(${faceId})>` : `<顔: ${face}(${faceId})>`
          const backgroundTag = EnglishTag ? `<Background: ${background}>` : `<背景: ${background}>`
          const windowPositionTag = EnglishTag ? `<WindowPosition: ${windowPosition}>` : `<位置: ${windowPosition}>`
          const nameTagStr = EnglishTag ? `<Name: ${name}>` : `<名前: ${name}>`
          const nameTag = name === '' || name === undefined ? '' : nameTagStr

          const tags = (omitFace ? '' : faceTag) + (omitBackground ? '' : backgroundTag) +
            (omitWindowPosition ? '' : windowPositionTag) + nameTag
          if (tags === '') {
            // タグ行が空になったので行ごと出さない。ウィンドウの区切り(空行)は続く本文に任せる。
            // ここで空行だけ出すと、本文の改行と重なって空行が二重になる。
            blockStartPending = true
          } else {
            addMessageBlockStart()
            text += tags
          }
        }
        if (event.code === 401) {
          const showText = event.parameters[0]
          if (blockStartPending) {
            addMessageBlockStart()
            blockStartPending = false
          } else {
            addNewLineIndent(indent)
          }
          // 空のメッセージ行は <br> マーカーにする。素の空行は「ウィンドウ区切り」と
          // 解釈されるため(空行+平文=新ウィンドウ)、空401をそのまま空行で出すと
          // 往復で失われたりウィンドウが分割される。<br> は compile が空401へ戻す。
          text += (showText === '') ? '<br>' : showText
        }
        if (event.code === 102) {
          const background = getBackgroundValue(event.parameters[4]) + comma
          const windowPosition = getChoiceWindowPositionValue(event.parameters[3]) + comma
          const defaultChoice = getDefaultChoiceValue(event.parameters[2]) + comma
          const cancelChoice = getCancelChoiceValue(event.parameters[1])
          const tag = EnglishTag ? '<ShowChoices: ' : '<選択肢の表示: '
          addNewLineIndent(indent)
          text += tag + background + windowPosition + defaultChoice + cancelChoice + '>'
        }
        if (event.code === 402) {
          const choice = event.parameters[1]
          const tag = EnglishTag ? '<When: ' : '<選択肢: '
          addNewLineIndent(indent)
          text += tag + choice + '>'
        }
        if (event.code === 403) {
          const tag = EnglishTag ? '<WhenCancel>' : '<キャンセルのとき>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 404) {
          const tag = EnglishTag ? '<End>' : '<分岐終了>'
          addNewLineIndent(indent)
          text += tag
        }
        // Skip(109)/その終端マーカー(409)。本体は通常コマンドとして字下げ出力される。
        if (event.code === 109) {
          const tag = EnglishTag ? '<Skip>' : '<スキップ>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 409) {
          const tag = EnglishTag ? '<SkipEnd>' : '<スキップ終了>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 103) {
          const variableId = event.parameters[0]
          const digits = event.parameters[1]
          const tag = EnglishTag ? '<InputNumber: ' : '<数値入力の処理: '
          addNewLineIndent(indent)
          text += tag + variableId + ', ' + digits + '>'
        }
        if (event.code === 104) {
          const variableId = event.parameters[0]
          const itemTypeValue = event.parameters[1]
          let itemType
          if (itemTypeValue === 1) {
            itemType = EnglishTag ? 'Regular Item' : '通常アイテム'
          } else if (itemTypeValue === 2) {
            itemType = EnglishTag ? 'Key Item' : '大事なもの'
          } else if (itemTypeValue === 3) {
            itemType = EnglishTag ? 'Hidden Item A' : '隠しアイテムA'
          } else if (itemTypeValue === 4) {
            itemType = EnglishTag ? 'Hidden Item B' : '隠しアイテムB'
          } else {
            itemType = EnglishTag ? 'Key Item' : '大事なもの'
          }
          const tag = EnglishTag ? '<SelectItem: ' : '<アイテム選択の処理: '
          addNewLineIndent(indent)
          text += tag + variableId + ', ' + itemType + '>'
        }
        if (event.code === 105) {
          const speed = event.parameters[0] + comma
          const noFastForward = getCheckBoxOnOffValue(event.parameters[1])
          const tag = EnglishTag ? '<ShowScrollingText: ' : '<文章のスクロール表示: '
          const tagEnd = EnglishTag ? '</ShowScrollingText>' : '</文章のスクロール表示>'
          addMessageBlockStart()
          text += tag + speed + noFastForward + '>' + newLine + tagEnd
        }
        if (event.code === 405) {
          const scrollingText = event.parameters[0]
          const tagEnd = EnglishTag ? '</ShowScrollingText>' : '</文章のスクロール表示>'
          if (text.endsWith(tagEnd)) {
            const tagEndDeleteText = text.slice(0, -1 * (tagEnd.length + 1))
            const tmpText = tagEndDeleteText + newLine + scrollingText + newLine + tagEnd
            text = tmpText
          }
        }

        /** ********************************************** */
        // ゲーム進行
        /** ********************************************** */
        if (event.code === 121) {
          const switchId1 = event.parameters[0]
          const switchId2 = event.parameters[1]
          const operation = getOnOffRadioButtonValue(event.parameters[2])
          const tag = EnglishTag ? '<Switch: ' : '<スイッチ: '
          addNewLineIndent(indent)
          if (switchId1 === switchId2) {
            text += tag + switchId1 + comma + operation + '>'
          } else {
            text += tag + switchId1 + '-' + switchId2 + comma + operation + '>'
          }
        }
        if (event.code === 122) {
          const param1 = event.parameters[0]
          const param2 = event.parameters[1]
          const param3 = event.parameters[2]
          const param4 = event.parameters[3]
          const param5 = event.parameters[4]
          const param6 = event.parameters[5]
          const param7 = event.parameters[6]
          const variableId1 = param1
          const variableId2 = param2
          const tag = getControlVariablesTag(param3)
          addNewLineIndent(indent)
          // 変数・単独/範囲
          if (event.parameters.length === 5 && param4 !== 4) {
            const operandValue = getFixedOrVariable(param4, param5)
            if (variableId1 === variableId2) {
              text += tag + variableId1 + comma + operandValue + '>'
            } else {
              text += tag + variableId1 + '-' + variableId2 + comma + operandValue + '>'
            }
          }
          // スクリプト
          if (event.parameters.length === 5 && param4 === 4) {
            const scriptStr = EnglishTag ? 'Script' : 'スクリプト'
            const script = `${scriptStr}[${param5}]`
            if (variableId1 === variableId2) {
              text += tag + variableId1 + comma + script + '>'
            } else {
              text += tag + variableId1 + '-' + variableId2 + comma + script + '>'
            }
          }
          // 変数・乱数
          if (event.parameters.length === 6) {
            const randomStr = EnglishTag ? 'random' : '乱数'
            const random1 = `[${param5}]`
            const random2 = `[${param6}]`
            if (variableId1 === variableId2) {
              text += tag + variableId1 + comma + randomStr + random1 + random2 + '>'
            } else {
              text += tag + variableId1 + '-' + variableId2 + comma + randomStr + random1 + random2 + '>'
            }
          }
          // ゲームデータ
          if (event.parameters.length === 7) {
            const gameDataStr = EnglishTag ? 'GameData' : 'ゲームデータ'
            const gameDataParam1Str = getGameData(param5)
            const gameDataParam1 = `[${gameDataParam1Str}]`
            // ゲームデータ・アイテム・武器・防具
            if (param5 === 0 || param5 === 1 || param5 === 2) {
              const gameDataParam2 = `[${param6}]`
              const gameData = gameDataStr + gameDataParam1 + gameDataParam2
              if (variableId1 === variableId2) {
                text += tag + variableId1 + comma + gameData + '>'
              } else {
                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>'
              }
            }
            // ゲームデータ・アクター
            if (param5 === 3) {
              const gameDataParam2 = `[${param6}]`
              const gameDataParam3Str = getGameDataActorParameter(param7)
              const gameDataParam3 = `[${gameDataParam3Str}]`
              const gameData = gameDataStr + gameDataParam1 + gameDataParam2 + gameDataParam3
              if (variableId1 === variableId2) {
                text += tag + variableId1 + comma + gameData + '>'
              } else {
                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>'
              }
            }
            // ゲームデータ・敵キャラ
            if (param5 === 4) {
              const gameDataParam2Value = Number(param6) + 1
              const gameDataParam2 = `[${gameDataParam2Value}]`
              const gameDataParam3Str = getGameDataEnemyParameter(param7)
              const gameDataParam3 = `[${gameDataParam3Str}]`
              const gameData = gameDataStr + gameDataParam1 + gameDataParam2 + gameDataParam3
              if (variableId1 === variableId2) {
                text += tag + variableId1 + comma + gameData + '>'
              } else {
                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>'
              }
            }
            // ゲームデータ・キャラクター
            if (param5 === 5) {
              const gameDataParam2Value = getEventValue2(param6)
              const gameDataParam2 = `[${gameDataParam2Value}]`
              const gameDataParam3Str = getGameDataReference(param7)
              const gameDataParam3 = `[${gameDataParam3Str}]`
              const gameData = gameDataStr + gameDataParam1 + gameDataParam2 + gameDataParam3
              if (variableId1 === variableId2) {
                text += tag + variableId1 + comma + gameData + '>'
              } else {
                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>'
              }
            }
            // ゲームデータ・パーティ
            if (param5 === 6) {
              const gameDataParam2Value = Number(param6) + 1
              const gameDataParam2 = `[${gameDataParam2Value}]`
              const gameData = gameDataStr + gameDataParam1 + gameDataParam2
              if (variableId1 === variableId2) {
                text += tag + variableId1 + comma + gameData + '>'
              } else {
                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>'
              }
            }
            // ゲームデータ・その他
            if (param5 === 7) {
              const gameDataParam1Str = getGameDataOther(param6)
              const gameDataParam1 = `[${gameDataParam1Str}]`
              const gameData = gameDataStr + gameDataParam1
              if (variableId1 === variableId2) {
                text += tag + variableId1 + comma + gameData + '>'
              } else {
                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>'
              }
            }
            // ゲームデータ・直前
            if (param5 === 8) {
              const gameDataParam2Value = getGameDataLast(param6)
              const gameDataParam2 = `[${gameDataParam2Value}]`
              const gameData = gameDataStr + gameDataParam1 + gameDataParam2
              if (variableId1 === variableId2) {
                text += tag + variableId1 + comma + gameData + '>'
              } else {
                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>'
              }
            }
          }
        }
        if (event.code === 123) {
          const selfSwitchValue = event.parameters[0] + comma
          const operationValue = event.parameters[1]
          const operation = getOnOffRadioButtonValue(operationValue)
          const tag = EnglishTag ? '<SelfSwitch: ' : '<セルフスイッチ: '
          addNewLineIndent(indent)
          text += tag + selfSwitchValue + operation + '>'
        }
        if (event.code === 124) {
          const operation = getTimerValue(event.parameters[0])
          const time = event.parameters[1]
          const minutes = Math.floor(time / 60)
          const seconds = time % 60

          const tag = EnglishTag ? '<Timer: ' : '<タイマー: '
          addNewLineIndent(indent)
          if (event.parameters[0] === 0) {
            // スタート
            text += tag + operation + comma + minutes + comma + seconds + '>'
          } else {
            // ストップ
            text += tag + operation + '>'
          }
        }

        /** ********************************************** */
        // フロー制御
        /** ********************************************** */
        if (event.code === 108) {
          const comment = event.parameters[0]
          // 開きタグは閉じ </comment> と大文字小文字を揃える(文法ハイライト/正準形に一致)。
          const tag = EnglishTag ? '<comment>' : '<注釈>'
          const tagEnd = EnglishTag ? '</comment>' : '</注釈>'
          addNewLineIndent(indent)
          text += tag + newLine + comment + newLine + tagEnd
        }
        if (event.code === 408) {
          const comment = event.parameters[0]
          const tagEnd = EnglishTag ? '</comment>' : '</注釈>'
          const tagEndLength = tagEnd.length
          const textSlice = text.slice(-tagEndLength)
          if (textSlice === tagEnd) {
            const tmpText = text.slice(0, -tagEndLength)
            text = tmpText + comment + newLine + tagEnd
          }
        }
        if (event.code === 111) {
          const param1 = event.parameters[0]
          const param2 = event.parameters[1]
          const param3 = event.parameters[2]
          const param4 = event.parameters[3]
          const param5 = event.parameters[4]
          const tag = EnglishTag ? '<If: ' : '<条件分岐: '
          addNewLineIndent(indent)
          // 0.スイッチ
          if (param1 === 0) {
            const switchId = EnglishTag ? `Switches[${param2}]` + comma : `スイッチ[${param2}]` + comma
            const isSwitch = getOnOffRadioButtonValue(param3)
            text += tag + switchId + isSwitch + '>'
          }
          // 1.変数
          if (param1 === 1) {
            const variableId = EnglishTag ? `Variables[${param2}]` + comma : `変数[${param2}]` + comma

            // 定数or変数
            let constant
            if (param3 === 0) constant = param4
            else if (param3 === 1) constant = EnglishTag ? `Variables[${param4}]` : `変数[${param4}]`
            else constant = param4

            // 比較演算子
            let condition
            if (param5 === 0) condition = EnglishTag ? '==' : '＝'
            else if (param5 === 1) condition = EnglishTag ? '>=' : '≧'
            else if (param5 === 2) condition = EnglishTag ? '<=' : '≦'
            else if (param5 === 3) condition = EnglishTag ? '>' : '＞'
            else if (param5 === 4) condition = EnglishTag ? '<' : '＜'
            else if (param5 === 5) condition = EnglishTag ? '!=' : '≠'
            else condition = EnglishTag ? '==' : '＝'
            condition += comma
            text += tag + variableId + condition + constant + '>'
          }
          // 2.セルフスイッチ
          if (param1 === 2) {
            const selfSwitches = EnglishTag ? `SelfSwitches[${param2}]` + comma : `セルフスイッチ[${param2}]` + comma
            const isSwitch = getOnOffRadioButtonValue(param3)
            text += tag + selfSwitches + isSwitch + '>'
          }
          // 3.タイマー
          if (param1 === 3) {
            const timer = EnglishTag ? 'Timer' + comma : 'タイマー' + comma
            // 比較演算子
            let condition
            if (param3 === 0) condition = EnglishTag ? '>=' : '≧'
            else if (param3 === 1) condition = EnglishTag ? '<=' : '≦'
            else condition = EnglishTag ? '>=' : '≧'
            condition += comma
            // 分
            const minutes = Math.floor(param2 / 60) + comma
            // 秒
            const seconds = param2 % 60
            text += tag + timer + condition + minutes + seconds + '>'
          }
          // 4.アクター
          if (param1 === 4) {
            const actorId = EnglishTag ? `Actors[${param2}]` + comma : `アクター[${param2}]` + comma
            switch (param3) {
              // パーティにいる
              case 0: {
                const inTheParty = EnglishTag ? 'in the party' : 'パーティにいる'
                text += tag + actorId + inTheParty + '>'
                break
              }
              // 名前
              case 1: {
                const nameStr = EnglishTag ? 'Name' + comma : '名前' + comma
                const nameValue = param4
                text += tag + actorId + nameStr + nameValue + '>'
                break
              }
              // 職業
              case 2: {
                const classStr = EnglishTag ? 'Class' + comma : '職業' + comma
                const classId = param4
                text += tag + actorId + classStr + classId + '>'
                break
              }
              // スキル
              case 3: {
                const skillStr = EnglishTag ? 'Skill' + comma : 'スキル' + comma
                const skillId = param4
                text += tag + actorId + skillStr + skillId + '>'
                break
              }
              // 武器
              case 4: {
                const weaponStr = EnglishTag ? 'Weapon' + comma : '武器' + comma
                const weaponId = param4
                text += tag + actorId + weaponStr + weaponId + '>'
                break
              }
              // 防具
              case 5: {
                const armorStr = EnglishTag ? 'Armor' + comma : '防具' + comma
                const armorId = param4
                text += tag + actorId + armorStr + armorId + '>'
                break
              }
              // ステート
              case 6: {
                const stateStr = EnglishTag ? 'State' + comma : 'ステート' + comma
                const stateId = param4
                text += tag + actorId + stateStr + stateId + '>'
                break
              }
              default: {
                const defaultInTheParty = EnglishTag ? 'in the party' : 'パーティにいる'
                text += tag + actorId + defaultInTheParty + '>'
              }
            }
          }
          // 5.敵キャラ
          if (param1 === 5) {
            const enemyNumber = Number(param2) + 1
            const actorId = EnglishTag ? `Enemies[${enemyNumber}]` + comma : `敵キャラ[${enemyNumber}]` + comma
            switch (param3) {
              // 出現
              case 0: {
                const appeared = EnglishTag ? 'Appeared' : '出現している'
                text += tag + actorId + appeared + '>'
                break
              }
              // ステート
              case 1: {
                const stateStr = EnglishTag ? 'State' + comma : 'ステート' + comma
                const stateId = param4
                text += tag + actorId + stateStr + stateId + '>'
                break
              }
              default: {
                const breakAppeared = EnglishTag ? 'Appeared' + comma : '出現している' + comma
                text += tag + actorId + breakAppeared + '>'
              }
            }
          }
          // 6.キャラクター
          if (param1 === 6) {
            const character = getEventValue(param2)
            const charactersStr = EnglishTag ? `Characters[${character}]` + comma : `キャラクター[${character}]` + comma
            const facing = getDirectionValue(param3)
            text += tag + charactersStr + facing + '>'
          }
          // 13.乗り物
          if (param1 === 13) {
            const vehicleStr = EnglishTag ? 'Vehicle' + comma : '乗り物' + comma
            const vehicle = getVehicleValue(param2)
            text += tag + vehicleStr + vehicle + '>'
          }
          // 7.お金
          if (param1 === 7) {
            const goldStr = EnglishTag ? 'Gold' + comma : 'お金' + comma
            // 比較演算子
            let condition
            if (param3 === 0) condition = EnglishTag ? '>=' : '≧'
            else if (param3 === 1) condition = EnglishTag ? '<=' : '≦'
            else if (param3 === 2) condition = EnglishTag ? '<' : '＜'
            else condition = EnglishTag ? '>=' : '≧'
            condition += comma
            const gold = param2

            text += tag + goldStr + condition + gold + '>'
          }
          // 8.アイテム
          if (param1 === 8) {
            const itemStr = EnglishTag ? `Items[${param2}]` : `アイテム[${param2}]`
            text += tag + itemStr + '>'
          }
          // 9.武器
          if (param1 === 9) {
            const weaponStr = EnglishTag ? `Weapons[${param2}]` : `武器[${param2}]`
            let includeEquipment
            if (param3) includeEquipment = EnglishTag ? comma + 'Include Equipment' : comma + '装備品を含む'
            else includeEquipment = ''
            text += tag + weaponStr + includeEquipment + '>'
          }
          // 10.防具
          if (param1 === 10) {
            const armorStr = EnglishTag ? `Armors[${param2}]` : `防具[${param2}]`
            let includeEquipment
            if (param3) includeEquipment = EnglishTag ? comma + 'Include Equipment' : comma + '装備品を含む'
            else includeEquipment = ''
            text += tag + armorStr + includeEquipment + '>'
          }
          // 11.ボタン
          if (param1 === 11) {
            const buttonStr = EnglishTag ? 'Button' + comma : 'ボタン' + comma
            const button = ((param2) => {
              if (param2 === 'ok') return EnglishTag ? 'OK' : '決定'
              else if (param2 === 'cancel') return EnglishTag ? 'Cancel' : 'キャンセル'
              else if (param2 === 'shift') return EnglishTag ? 'Shift' : 'シフト'
              else if (param2 === 'down') return EnglishTag ? 'Down' : '下'
              else if (param2 === 'left') return EnglishTag ? 'Left' : '左'
              else if (param2 === 'right') return EnglishTag ? 'Right' : '右'
              else if (param2 === 'up') return EnglishTag ? 'Up' : '上'
              else if (param2 === 'pageup') return EnglishTag ? 'Pageup' : 'ページアップ'
              else if (param2 === 'pagedown') return EnglishTag ? 'Pagedown' : 'ページダウン'
              else return EnglishTag ? 'OK' : '決定'
            })(param2)
            if (param3) {
              // MZ(ボタンの押し方を省略しない)
              const buttonState = ((param3) => {
                if (param3 === 0) return EnglishTag ? 'is being pressed' : 'が押されている'
                else if (param3 === 1) return EnglishTag ? 'is being triggered' : 'がトリガーされている'
                else if (param3 === 2) return EnglishTag ? 'is being repeated' : 'がリピートされている'
                else return EnglishTag ? 'is being pressed' : 'が押されている'
              })(param3)
              text += tag + buttonStr + button + comma + buttonState + '>'
            } else {
              // MV(ボタンの押し方を省略)
              text += tag + buttonStr + button + '>'
            }
          }
          // 12.スクリプト
          if (param1 === 12) {
            const scriptStr = EnglishTag ? 'Script' + comma : 'スクリプト' + comma
            const script = param2
            text += tag + scriptStr + script + '>'
          }
        }
        if (event.code === 411) {
          const tag = EnglishTag ? '<Else>' : '<それ以外のとき>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 412) {
          const tag = EnglishTag ? '<End>' : '<分岐終了>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 112) {
          const tag = EnglishTag ? '<Loop>' : '<ループ>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 413) {
          const tag = EnglishTag ? '<RepeatAbove>' : '<以上繰り返し>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 113) {
          const tag = EnglishTag ? '<BreakLoop>' : '<ループの中断>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 115) {
          const tag = EnglishTag ? '<ExitEventProcessing>' : '<イベント処理の中断>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 117) {
          const CommonEventId = event.parameters[0]
          const tag = EnglishTag ? '<CommonEvent: ' : '<コモンイベント: '
          addNewLineIndent(indent)
          text += tag + CommonEventId + '>'
        }
        if (event.code === 118) {
          const label = event.parameters[0]
          const tag = EnglishTag ? '<Label: ' : '<ラベル: '
          addNewLineIndent(indent)
          text += tag + label + '>'
        }
        if (event.code === 119) {
          const label = event.parameters[0]
          const tag = EnglishTag ? '<JumpToLabel: ' : '<ラベルジャンプ: '
          addNewLineIndent(indent)
          text += tag + label + '>'
        }

        /** ********************************************** */
        // パーティ
        /** ********************************************** */
        if (event.code === 125) {
          const operation = getIncreaseOrDecrease(event.parameters[0]) + comma
          const operandValue = getConstantOrVariable(event.parameters[1], event.parameters[2])
          const tag = EnglishTag ? '<ChangeGold: ' : '<所持金の増減: '
          addNewLineIndent(indent)
          text += tag + operation + operandValue + '>'
        }
        if (event.code === 126) {
          const itemId = event.parameters[0] + comma
          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3])
          const tag = EnglishTag ? '<ChangeItems: ' : '<アイテムの増減: '
          addNewLineIndent(indent)
          text += tag + itemId + operation + operandValue + '>'
        }
        if (event.code === 127) {
          const weaponId = event.parameters[0] + comma
          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma
          const includeEquipment = getCheckBoxIncludeEquipmentValue(event.parameters[4])
          const tag = EnglishTag ? '<ChangeWeapons: ' : '<武器の増減: '
          addNewLineIndent(indent)
          text += tag + weaponId + operation + operandValue + includeEquipment + '>'
        }
        if (event.code === 128) {
          const armorId = event.parameters[0] + comma
          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma
          const includeEquipment = getCheckBoxIncludeEquipmentValue(event.parameters[4])
          const tag = EnglishTag ? '<ChangeArmors: ' : '<防具の増減: '
          addNewLineIndent(indent)
          text += tag + armorId + operation + operandValue + includeEquipment + '>'
        }
        if (event.code === 129) {
          const actorId = event.parameters[0] + comma
          const operation = getAddOrRemove(event.parameters[1]) + comma
          const initialize = getCheckBoxInitializeValue(event.parameters[2])
          const tag = EnglishTag ? '<ChangePartyMember: ' : '<メンバーの入れ替え: '
          addNewLineIndent(indent)
          text += tag + actorId + operation + initialize + '>'
        }

        /** ********************************************** */
        // アクター
        /** ********************************************** */
        if (event.code === 311) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma
          const allowKnockout = getCheckBoxAllowKnockoutValue(event.parameters[5])
          const tag = EnglishTag ? '<ChangeHp: ' : '<HPの増減: '
          addNewLineIndent(indent)
          text += tag + actorValue + operation + operandValue + allowKnockout + '>'
        }
        if (event.code === 312) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4])
          const tag = EnglishTag ? '<ChangeMp: ' : '<MPの増減: '
          addNewLineIndent(indent)
          text += tag + actorValue + operation + operandValue + '>'
        }
        if (event.code === 326) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4])
          const tag = EnglishTag ? '<ChangeTp: ' : '<TPの増減: '
          addNewLineIndent(indent)
          text += tag + actorValue + operation + operandValue + '>'
        }
        if (event.code === 313) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
          const operation = getAddOrRemove(event.parameters[2]) + comma
          const stateId = event.parameters[3]
          const tag = EnglishTag ? '<ChangeState: ' : '<ステートの変更: '
          addNewLineIndent(indent)
          text += tag + actorValue + operation + stateId + '>'
        }
        if (event.code === 314) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1])
          const tag = EnglishTag ? '<RecoverAll: ' : '<全回復: '
          addNewLineIndent(indent)
          text += tag + actorValue + '>'
        }
        if (event.code === 315) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma
          const showLevelUp = getCheckBoxShowLevelUpValue(event.parameters[5])
          const tag = EnglishTag ? '<ChangeExp: ' : '<経験値の増減: '
          addNewLineIndent(indent)
          text += tag + actorValue + operation + operandValue + showLevelUp + '>'
        }
        if (event.code === 316) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma
          const showLevelUp = getCheckBoxShowLevelUpValue(event.parameters[5])
          const tag = EnglishTag ? '<ChangeLevel: ' : '<レベルの増減: '
          addNewLineIndent(indent)
          text += tag + actorValue + operation + operandValue + showLevelUp + '>'
        }
        if (event.code === 317) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
          const parameter = getActorParameterValue(event.parameters[2]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[3]) + comma
          const operandValue = getConstantOrVariable(event.parameters[4], event.parameters[5])
          const tag = EnglishTag ? '<ChangeParameter: ' : '<能力値の増減: '
          addNewLineIndent(indent)
          text += tag + actorValue + parameter + operation + operandValue + '>'
        }
        if (event.code === 318) {
          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
          const operation = getLearnOrForgot(event.parameters[2]) + comma
          const skillId = event.parameters[3]
          const tag = EnglishTag ? '<ChangeSkill: ' : '<スキルの増減: '
          addNewLineIndent(indent)
          text += tag + actorValue + operation + skillId + '>'
        }
        if (event.code === 319) {
          const actorId = event.parameters[0] + comma
          const equipmentTypeId = event.parameters[1] + comma
          const equipmentItemId = event.parameters[2]
          const tag = EnglishTag ? '<ChangeEquipment: ' : '<装備の変更: '
          addNewLineIndent(indent)
          text += tag + actorId + equipmentTypeId + equipmentItemId + '>'
        }
        if (event.code === 320) {
          const actorId = event.parameters[0] + comma
          const name = event.parameters[1]
          const tag = EnglishTag ? '<ChangeName: ' : '<名前の変更: '
          addNewLineIndent(indent)
          text += tag + actorId + name + '>'
        }
        if (event.code === 321) {
          const actorId = event.parameters[0] + comma
          const classId = event.parameters[1] + comma
          const saveExp = getCheckBoxSaveEXPValue(event.parameters[2])
          const tag = EnglishTag ? '<ChangeClass: ' : '<職業の変更: '
          addNewLineIndent(indent)
          text += tag + actorId + classId + saveExp + '>'
        }
        if (event.code === 324) {
          const actorId = event.parameters[0]
          const nickname = event.parameters[1]
          const tag = EnglishTag ? '<ChangeNickname: ' : '<二つ名の変更: '
          addNewLineIndent(indent)
          if (nickname === '') {
            text += tag + actorId + '>'
          } else {
            text += tag + actorId + comma + nickname + '>'
          }
        }
        if (event.code === 325) {
          const actorId = event.parameters[0]
          const profile = event.parameters[1]
          const splitProfile = profile.split('\n')
          const profile1line = splitProfile[0] === undefined ? '' : splitProfile[0]
          const profile2line = splitProfile[1] === undefined ? '' : splitProfile[1]
          const tag = EnglishTag ? '<ChangeProfile: ' : '<プロフィールの変更: '
          addNewLineIndent(indent)
          if (profile1line === '' && profile2line === '') {
            text += tag + actorId + '>'
          } else if (profile2line === '') {
            text += tag + actorId + comma + profile1line + '>'
          } else {
            text += tag + actorId + comma + profile1line + comma + profile2line + '>'
          }
        }

        /** ********************************************** */
        // 移動
        /** ********************************************** */
        if (event.code === 201) {
          const location = getDirectOrVariablesValue(event.parameters[0])
          const mapId = event.parameters[1]
          const mapX = event.parameters[2]
          const mapY = event.parameters[3]
          const locationStr = `${location}[${mapId}][${mapX}][${mapY}]` + comma
          const direction = getDirectionValue(event.parameters[4]) + comma
          const fade = getFadeValue(event.parameters[5])
          const tag = EnglishTag ? '<TransferPlayer: ' : '<場所移動: '
          addNewLineIndent(indent)
          text += tag + locationStr + direction + fade + '>'
        }
        if (event.code === 202) {
          const vehicle = getVehicleValue(event.parameters[0]) + comma
          const location = getDirectOrVariablesValue(event.parameters[1])
          const mapId = event.parameters[2]
          const mapX = event.parameters[3]
          const mapY = event.parameters[4]
          const locationStr = `${location}[${mapId}][${mapX}][${mapY}]`
          const tag = EnglishTag ? '<SetVehicleLocation: ' : '<乗り物の位置設定: '
          addNewLineIndent(indent)
          text += tag + vehicle + locationStr + '>'
        }
        if (event.code === 203) {
          const eventValue = getEventValue(event.parameters[0]) + comma
          const location = getDirectOrVariablesValue(event.parameters[1])
          const mapY = event.parameters[3]
          let locationStr = ''
          if (event.parameters[1] === 2) {
            const eventId = getEventValue(event.parameters[2])
            locationStr = `${location}[${eventId}]` + comma
          } else {
            const mapX = event.parameters[2]
            locationStr = `${location}[${mapX}][${mapY}]` + comma
          }
          const direction = getDirectionValue(event.parameters[4])
          addNewLineIndent(indent)
          const tag = EnglishTag ? '<SetEventLocation: ' : '<イベントの位置設定: '
          text += tag + eventValue + locationStr + direction + '>'
        }
        if (event.code === 204) {
          const direction = getDirectionValue(event.parameters[0]) + comma
          const distance = event.parameters[1] + comma
          const speed = getSpeedValue(event.parameters[2]) + comma
          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[3])
          const tag = EnglishTag ? '<ScrollMap: ' : '<マップのスクロール: '
          addNewLineIndent(indent)
          text += tag + direction + distance + speed + waitForCompletion + '>'
        }
        // 移動ルートの設定
        if (event.code === 205) {
          const target = getEventValue(event.parameters[0]) + comma
          const repeat = getCheckBoxRepeatMovementsValue(event.parameters[1].repeat) + comma
          const skippable = getCheckBoxSkipValue(event.parameters[1].skippable) + comma
          const wait = getCheckBoxWaitforCompletionValue(event.parameters[1].wait)
          const tag = EnglishTag ? '<SetMovementRoute: ' : '<移動ルートの設定: '
          addNewLineIndent(indent)
          text += tag + target + repeat + skippable + wait + '>'
        }
        // 移動ルートの設定(移動コマンド)
        if (event.code === 505) {
          const movement = event.parameters[0]
          // 整形時は移動コマンドを親の移動ルート設定と同じ深さに揃える(非整形時は列0)
          const moveIndent = indent

          const code1tag = EnglishTag ? '<MoveDown>' : '<下に移動>'
          const code2tag = EnglishTag ? '<MoveLeft>' : '<左に移動>'
          const code3tag = EnglishTag ? '<MoveRight>' : '<右に移動>'
          const code4tag = EnglishTag ? '<MoveUp>' : '<上に移動>'
          const code5tag = EnglishTag ? '<MoveLowerLeft>' : '<左下に移動>'
          const code6tag = EnglishTag ? '<MoveLowerRight>' : '<右下に移動>'
          const code7tag = EnglishTag ? '<MoveUpperLeft>' : '<左上に移動>'
          const code8tag = EnglishTag ? '<MoveUpperRight>' : '<右上に移動>'
          const code9tag = EnglishTag ? '<MoveAtRandom>' : '<ランダムに移動>'
          const code10tag = EnglishTag ? '<MoveTowardPlayer>' : '<プレイヤーに近づく>'
          const code11tag = EnglishTag ? '<MoveAwayFromPlayer>' : '<プレイヤーから遠ざかる>'
          const code12tag = EnglishTag ? '<OneStepForward>' : '<一歩前進>'
          const code13tag = EnglishTag ? '<OneStepBackward>' : '<一歩後退>'
          const code14tag = EnglishTag ? '<Jump: ' : '<ジャンプ: '
          const code15tag = EnglishTag ? '<McWait: ' : '<移動コマンドウェイト: '
          const code16tag = EnglishTag ? '<TurnDown>' : '<下を向く>'
          const code17tag = EnglishTag ? '<TurnLeft>' : '<左を向く>'
          const code18tag = EnglishTag ? '<TurnRight>' : '<右を向く>'
          const code19tag = EnglishTag ? '<TurnUp>' : '<上を向く>'
          const code20tag = EnglishTag ? '<Turn90Right>' : '<右に90度回転>'
          const code21tag = EnglishTag ? '<Turn90Left>' : '<左に90度回転>'
          const code22tag = EnglishTag ? '<Turn180>' : '<180度回転>'
          const code23tag = EnglishTag ? '<Turn90RightorLeft>' : '<右か左に90度回転>'
          const code24tag = EnglishTag ? '<TurnAtRandom>' : '<ランダムに方向転換>'
          const code25tag = EnglishTag ? '<TurnTowardPlayer>' : '<プレイヤーの方を向く>'
          const code26tag = EnglishTag ? '<TurnAwayFromPlayer>' : '<プレイヤーの逆を向く>'
          const code27tag = EnglishTag ? '<SwitchOn: ' : '<スイッチON: '
          const code28tag = EnglishTag ? '<SwitchOff: ' : '<スイッチOFF: '
          const code29tag = EnglishTag ? '<ChangeSpeed: ' : '<移動速度の変更: '
          const code30tag = EnglishTag ? '<ChangeFrequency: ' : '<移動頻度の変更: '
          const code31tag = EnglishTag ? '<WalkingAnimationOn>' : '<歩行アニメON>'
          const code32tag = EnglishTag ? '<WalkingAnimationOff>' : '<歩行アニメOFF>'
          const code33tag = EnglishTag ? '<SteppingAnimationOn>' : '<足踏みアニメON>'
          const code34tag = EnglishTag ? '<SteppingAnimationOff>' : '<足踏みアニメOFF>'
          const code35tag = EnglishTag ? '<DirectionFixOn>' : '<向き固定ON>'
          const code36tag = EnglishTag ? '<DirectionFixOff>' : '<向き固定OFF>'
          const code37tag = EnglishTag ? '<ThroughOn>' : '<すり抜けON>'
          const code38tag = EnglishTag ? '<ThroughOff>' : '<すり抜けOFF>'
          const code39tag = EnglishTag ? '<TransparentOn>' : '<透明化ON>'
          const code40tag = EnglishTag ? '<TransparentOff>' : '<透明化OFF>'
          const code41tag = EnglishTag ? '<ChangeImage: ' : '<画像の変更: '
          const code42tag = EnglishTag ? '<ChangeOpacity: ' : '<不透明度の変更: '
          const code43tag = EnglishTag ? '<ChangeBlendMode: ' : '<合成方法の変更: '
          const code44tag = EnglishTag ? '<McPlaySe: ' : '<移動コマンドSEの演奏: '
          const code45tag = EnglishTag ? '<McScript: ' : '<移動コマンドスクリプト: '

          addNewLineIndent(moveIndent)
          if (movement.code === 1) text += code1tag
          else if (movement.code === 2) text += code2tag
          else if (movement.code === 3) text += code3tag
          else if (movement.code === 4) text += code4tag
          else if (movement.code === 5) text += code5tag
          else if (movement.code === 6) text += code6tag
          else if (movement.code === 7) text += code7tag
          else if (movement.code === 8) text += code8tag
          else if (movement.code === 9) text += code9tag
          else if (movement.code === 10) text += code10tag
          else if (movement.code === 11) text += code11tag
          else if (movement.code === 12) text += code12tag
          else if (movement.code === 13) text += code13tag
          else if (movement.code === 14) {
            const x = movement.parameters[0] + comma
            const y = movement.parameters[1]
            text += code14tag + x + y + '>'
          } else if (movement.code === 15) {
            const wait = movement.parameters[0]
            text += code15tag + wait + '>'
          } else if (movement.code === 16) text += code16tag
          else if (movement.code === 17) text += code17tag
          else if (movement.code === 18) text += code18tag
          else if (movement.code === 19) text += code19tag
          else if (movement.code === 20) text += code20tag
          else if (movement.code === 21) text += code21tag
          else if (movement.code === 22) text += code22tag
          else if (movement.code === 23) text += code23tag
          else if (movement.code === 24) text += code24tag
          else if (movement.code === 25) text += code25tag
          else if (movement.code === 26) text += code26tag
          else if (movement.code === 27) {
            const switchId = movement.parameters[0]
            text += code27tag + switchId + '>'
          } else if (movement.code === 28) {
            const switchId = movement.parameters[0]
            text += code28tag + switchId + '>'
          } else if (movement.code === 29) {
            const speed = getSpeedValue(movement.parameters[0])
            text += code29tag + speed + '>'
          } else if (movement.code === 30) {
            const frequency = getFrequencyValue(movement.parameters[0])
            text += code30tag + frequency + '>'
          } else if (movement.code === 31) text += code31tag
          else if (movement.code === 32) text += code32tag
          else if (movement.code === 33) text += code33tag
          else if (movement.code === 34) text += code34tag
          else if (movement.code === 35) text += code35tag
          else if (movement.code === 36) text += code36tag
          else if (movement.code === 37) text += code37tag
          else if (movement.code === 38) text += code38tag
          else if (movement.code === 39) text += code39tag
          else if (movement.code === 40) text += code40tag
          else if (movement.code === 41) {
            const image = getNone(movement.parameters[0]) + comma
            const imageId = movement.parameters[1]
            text += code41tag + image + imageId + '>'
          } else if (movement.code === 42) {
            const opacity = movement.parameters[0]
            text += code42tag + opacity + '>'
          } else if (movement.code === 43) {
            const blendMode = getBlendModeValue(movement.parameters[0])
            text += code43tag + blendMode + '>'
          } else if (movement.code === 44) {
            const image = getNone(movement.parameters[0].name) + comma
            const volume = movement.parameters[0].volume + comma
            const pitch = movement.parameters[0].pitch + comma
            const pan = movement.parameters[0].pan
            text += code44tag + image + volume + pitch + pan + '>'
          } else if (movement.code === 45) {
            const script = movement.parameters[0]
            text += code45tag + script + '>'
          }
        }
        if (event.code === 206) {
          const tag = EnglishTag ? '<GetOnOffVehicle>' : '<乗り物の乗降>'
          addNewLineIndent(indent)
          text += tag
        }

        /** ********************************************** */
        // キャラクター
        /** ********************************************** */
        if (event.code === 211) {
          const transparencyValue = event.parameters[0]
          const transparency = getOnOffRadioButtonValue(transparencyValue)
          const tag = EnglishTag ? '<ChangeTransparency: ' : '<透明状態の変更: '
          addNewLineIndent(indent)
          text += tag + transparency + '>'
        }
        if (event.code === 216) {
          const playerFollowersValue = event.parameters[0]
          const playerFollowers = getOnOffRadioButtonValue(playerFollowersValue)
          const tag = EnglishTag ? '<ChangePlayerFollowers: ' : '<隊列歩行の変更: '
          addNewLineIndent(indent)
          text += tag + playerFollowers + '>'
        }
        if (event.code === 217) {
          const tag = EnglishTag ? '<GatherFollowers>' : '<隊列メンバーの集合>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 212) {
          const character = getEventValue(event.parameters[0]) + comma
          const animationId = event.parameters[1] + comma
          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[2])
          const tag = EnglishTag ? '<ShowAnimation: ' : '<アニメーションの表示: '
          addNewLineIndent(indent)
          text += tag + character + animationId + waitForCompletion + '>'
        }
        if (event.code === 213) {
          const character = getEventValue(event.parameters[0]) + comma
          const balloonIcon = getBalloonIconValue(event.parameters[1]) + comma
          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[2])
          const tag = EnglishTag ? '<ShowBalloonIcon: ' : '<フキダシアイコンの表示: '
          addNewLineIndent(indent)
          text += tag + character + balloonIcon + waitForCompletion + '>'
        }
        if (event.code === 214) {
          const tag = EnglishTag ? '<EraseEvent>' : '<イベントの一時消去>'
          addNewLineIndent(indent)
          text += tag
        }

        /** ********************************************** */
        // 画面
        /** ********************************************** */
        if (event.code === 221) {
          const tag = EnglishTag ? '<Fadeout>' : '<フェードアウト>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 222) {
          const tag = EnglishTag ? '<Fadein>' : '<フェードイン>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 230) {
          const duration = event.parameters[0]
          const tag = EnglishTag ? '<Wait: ' : '<ウェイト: '
          addNewLineIndent(indent)
          text += tag + duration + '>'
        }
        if (event.code === 223) {
          const tmpColorTone = getColorToneValue(
            event.parameters[0][0],
            event.parameters[0][1],
            event.parameters[0][2],
            event.parameters[0][3]
          )
          const colorTone = tmpColorTone === '' ? '' : comma + tmpColorTone
          const tmpDuration = getDurationValue(event.parameters[1], event.parameters[2])
          const duration = tmpDuration === '' ? '' : tmpDuration
          const tag = EnglishTag ? '<TintScreen: ' : '<画面の色調変更: '
          addNewLineIndent(indent)
          text += tag + duration + colorTone + '>'
        }
        if (event.code === 224) {
          const red = event.parameters[0][0] + comma
          const green = event.parameters[0][1] + comma
          const blue = event.parameters[0][2] + comma
          const gray = event.parameters[0][3] + comma
          const duration = event.parameters[1] + comma
          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[2])
          const tag = EnglishTag ? '<FlashScreen: ' : '<画面のフラッシュ: '
          addNewLineIndent(indent)
          text += tag + red + green + blue + gray + duration + waitForCompletion + '>'
        }
        if (event.code === 225) {
          const power = event.parameters[0] + comma
          const speed = event.parameters[1] + comma
          const duration = event.parameters[2] + comma
          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[3])
          const tag = EnglishTag ? '<ShakeScreen: ' : '<画面のシェイク: '
          addNewLineIndent(indent)
          text += tag + power + speed + duration + waitForCompletion + '>'
        }
        if (event.code === 236) {
          const type = getWeatherTypeValue(event.parameters[0]) + comma
          const power = event.parameters[1] + comma
          const duration = event.parameters[2] + comma
          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[3])
          const tag = EnglishTag ? '<SetWeatherEffect: ' : '<天候の設定: '
          addNewLineIndent(indent)
          text += tag + type + power + duration + waitForCompletion + '>'
        }

        /** ********************************************** */
        // ピクチャ
        /** ********************************************** */
        if (event.code === 231) {
          const pictureNumber = event.parameters[0] + comma
          const image = event.parameters[1] + comma
          const position = getPositionValue(
            event.parameters[2],
            event.parameters[3],
            event.parameters[4],
            event.parameters[5]
          ) + comma
          const scale = getScaleValue(event.parameters[6], event.parameters[7]) + comma
          const blend = getBlendValue(event.parameters[8], event.parameters[9])
          const tag = EnglishTag ? '<ShowPicture: ' : '<ピクチャの表示: '
          addNewLineIndent(indent)
          text += tag + pictureNumber + image + position + scale + blend + '>'
        }
        if (event.code === 232) {
          const pictureNumber = event.parameters[0] + comma
          const position = getPositionValue(
            event.parameters[2],
            event.parameters[3],
            event.parameters[4],
            event.parameters[5]
          ) + comma
          const scale = getScaleValue(event.parameters[6], event.parameters[7]) + comma
          const blend = getBlendValue(event.parameters[8], event.parameters[9]) + comma
          const duration = getDurationValue(event.parameters[10], event.parameters[11]) + comma
          const easing = getEasingValue(event.parameters[12])
          const tag = EnglishTag ? '<MovePicture: ' : '<ピクチャの移動: '
          addNewLineIndent(indent)
          text += tag + pictureNumber + duration + position + scale + blend + easing + '>'
        }
        if (event.code === 233) {
          const pictureNumber = event.parameters[0] + comma
          const rotationSpeed = event.parameters[1]
          const tag = EnglishTag ? '<RotatePicture: ' : '<ピクチャの回転: '
          addNewLineIndent(indent)
          text += tag + pictureNumber + rotationSpeed + '>'
        }
        if (event.code === 234) {
          const pictureNumber = event.parameters[0] + comma
          const colorTone = getColorToneValue(
            event.parameters[1][0],
            event.parameters[1][1],
            event.parameters[1][2],
            event.parameters[1][3]
          )
          const duration = getDurationValue(event.parameters[2], event.parameters[3]) + comma
          const tag = EnglishTag ? '<TintPicture: ' : '<ピクチャの色調変更: '
          addNewLineIndent(indent)
          text += tag + pictureNumber + duration + colorTone + '>'
        }

        if (event.code === 235) {
          const pictureNumber = event.parameters[0]
          const tag = EnglishTag ? '<ErasePicture: ' : '<ピクチャの消去: '
          addNewLineIndent(indent)
          text += tag + pictureNumber + '>'
        }

        /** ********************************************** */
        // オーディオ・ビデオ
        /** ********************************************** */
        if (event.code === 241) {
          const image = getNone(event.parameters[0].name)
          const volume = event.parameters[0].volume + comma
          const pitch = event.parameters[0].pitch + comma
          const pan = event.parameters[0].pan
          const tag = EnglishTag ? '<PlayBGM: ' : '<BGMの演奏: '
          addNewLineIndent(indent)
          text += tag + image + comma + volume + pitch + pan + '>'
        }
        if (event.code === 242) {
          const duration = event.parameters[0]
          const tag = EnglishTag ? '<FadeoutBGM: ' : '<BGMのフェードアウト: '
          addNewLineIndent(indent)
          text += tag + duration + '>'
        }
        if (event.code === 243) {
          const tag = EnglishTag ? '<SaveBGM>' : '<BGMの保存>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 244) {
          const tag = EnglishTag ? '<ReplayBGM>' : '<BGMの再開>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 245) {
          const image = getNone(event.parameters[0].name)
          const volume = event.parameters[0].volume + comma
          const pitch = event.parameters[0].pitch + comma
          const pan = event.parameters[0].pan
          const tag = EnglishTag ? '<PlayBGS: ' : '<BGSの演奏: '
          addNewLineIndent(indent)
          text += tag + image + comma + volume + pitch + pan + '>'
        }
        if (event.code === 249) {
          const image = getNone(event.parameters[0].name)
          const volume = event.parameters[0].volume + comma
          const pitch = event.parameters[0].pitch + comma
          const pan = event.parameters[0].pan
          const tag = EnglishTag ? '<PlayME: ' : '<MEの演奏: '
          addNewLineIndent(indent)
          text += tag + image + comma + volume + pitch + pan + '>'
        }
        if (event.code === 250) {
          const image = getNone(event.parameters[0].name)
          const volume = event.parameters[0].volume + comma
          const pitch = event.parameters[0].pitch + comma
          const pan = event.parameters[0].pan
          const tag = EnglishTag ? '<PlaySE: ' : '<SEの演奏: '
          addNewLineIndent(indent)
          text += tag + image + comma + volume + pitch + pan + '>'
        }

        if (event.code === 246) {
          const duration = event.parameters[0]
          const tag = EnglishTag ? '<FadeoutBGS: ' : '<BGSのフェードアウト: '
          addNewLineIndent(indent)
          text += tag + duration + '>'
        }
        if (event.code === 251) {
          const tag = EnglishTag ? '<StopSE>' : '<SEの停止>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 261) {
          const movie = getNone(event.parameters[0])
          const tag = EnglishTag ? '<PlayMovie: ' : '<ムービーの再生: '
          addNewLineIndent(indent)
          text += tag + movie + '>'
        }

        /** ********************************************** */
        // システム設定
        /** ********************************************** */
        if (event.code === 132) {
          const name = getNone(event.parameters[0].name) + comma
          const volume = event.parameters[0].volume + comma
          const pitch = event.parameters[0].pitch + comma
          const pan = event.parameters[0].pan
          const tag = EnglishTag ? '<ChangeBattleBGM: ' : '<戦闘曲の変更: '
          addNewLineIndent(indent)
          text += tag + name + volume + pitch + pan + '>'
        }
        if (event.code === 133) {
          const name = getNone(event.parameters[0].name) + comma
          const volume = event.parameters[0].volume + comma
          const pitch = event.parameters[0].pitch + comma
          const pan = event.parameters[0].pan
          const tag = EnglishTag ? '<ChangeVictoryMe: ' : '<勝利MEの変更: '
          addNewLineIndent(indent)
          text += tag + name + volume + pitch + pan + '>'
        }
        if (event.code === 139) {
          const name = getNone(event.parameters[0].name) + comma
          const volume = event.parameters[0].volume + comma
          const pitch = event.parameters[0].pitch + comma
          const pan = event.parameters[0].pan
          const tag = EnglishTag ? '<ChangeDefeatMe: ' : '<敗北MEの変更: '
          addNewLineIndent(indent)
          text += tag + name + volume + pitch + pan + '>'
        }
        if (event.code === 140) {
          const vehicle = getVehicleValue(event.parameters[0]) + comma
          const name = getNone(event.parameters[1].name) + comma
          const volume = event.parameters[1].volume + comma
          const pitch = event.parameters[1].pitch + comma
          const pan = event.parameters[1].pan
          const tag = EnglishTag ? '<ChangeVehicleBgm: ' : '<乗り物BGMの変更: '
          addNewLineIndent(indent)
          text += tag + vehicle + name + volume + pitch + pan + '>'
        }
        if (event.code === 134) {
          const save = getDisableEnable(event.parameters[0])
          const tag = EnglishTag ? '<ChangeSaveAccess: ' : '<セーブ禁止の変更: '
          addNewLineIndent(indent)
          text += tag + save + '>'
        }
        if (event.code === 135) {
          const menu = getDisableEnable(event.parameters[0])
          const tag = EnglishTag ? '<ChangeMenuAccess: ' : '<メニュー禁止の変更: '
          addNewLineIndent(indent)
          text += tag + menu + '>'
        }
        if (event.code === 136) {
          const encounter = getDisableEnable(event.parameters[0])
          const tag = EnglishTag ? '<ChangeEncounter: ' : '<エンカウント禁止の変更: '
          addNewLineIndent(indent)
          text += tag + encounter + '>'
        }
        if (event.code === 137) {
          const formation = getDisableEnable(event.parameters[0])
          const tag = EnglishTag ? '<ChangeFormationAccess: ' : '<並び変え禁止の変更: '
          addNewLineIndent(indent)
          text += tag + formation + '>'
        }
        if (event.code === 138) {
          const red = event.parameters[0][0] + comma
          const green = event.parameters[0][1] + comma
          const blue = event.parameters[0][2]
          const tag = EnglishTag ? '<ChangeWindowColor: ' : '<ウィンドウカラーの変更: '
          addNewLineIndent(indent)
          text += tag + red + green + blue + '>'
        }
        if (event.code === 322) {
          const faceId = event.parameters[0] + comma
          const face = getNone(event.parameters[1]) + comma
          const characterId = event.parameters[2] + comma
          const character = getNone(event.parameters[3]) + comma
          const battlerId = event.parameters[4] + comma
          const battler = getNone(event.parameters[5])
          const tag = EnglishTag ? '<ChangeActorImages: ' : '<アクターの画像変更: '
          addNewLineIndent(indent)
          text += tag + faceId + face + characterId + character + battlerId + battler + '>'
        }
        if (event.code === 323) {
          const vehicle = getVehicleValue(event.parameters[0]) + comma
          const image = getNone(event.parameters[1]) + comma
          const imageId = event.parameters[2]
          const tag = EnglishTag ? '<ChangeVehicleImage: ' : '<乗り物の画像変更: '
          addNewLineIndent(indent)
          text += tag + vehicle + image + imageId + '>'
        }

        /** ********************************************** */
        // マップ
        /** ********************************************** */
        if (event.code === 281) {
          const mapNameDisplayValue = event.parameters[0]
          const mapNameDisplay = getOnOffRadioButtonValue(mapNameDisplayValue)
          const tag = EnglishTag ? '<ChangeMapNameDisplay: ' : '<マップ名表示の変更: '
          addNewLineIndent(indent)
          text += tag + mapNameDisplay + '>'
        }
        if (event.code === 282) {
          const tilesetId = event.parameters[0]
          const tag = EnglishTag ? '<ChangeTileset: ' : '<タイルセットの変更: '
          addNewLineIndent(indent)
          text += tag + tilesetId + '>'
        }
        if (event.code === 283) {
          const battleBackGround1 = getNone(event.parameters[0]) + comma
          const battleBackGround2 = getNone(event.parameters[1])
          const tag = EnglishTag ? '<ChangeBattleBackGround: ' : '<戦闘背景の変更: '
          addNewLineIndent(indent)
          text += tag + battleBackGround1 + battleBackGround2 + '>'
        }
        if (event.code === 284) {
          const image = getNone(event.parameters[0])
          const loopHorizontallyStr = EnglishTag ? 'LoopHorizontally' : '横方向にループする'
          const loopVerticallyStr = EnglishTag ? 'LoopVertically' : '縦方向にループする'
          const loopHorizontallyScrollTmp = `${loopHorizontallyStr}[${event.parameters[3]}]`
          const loopVerticallyScrollTmp = `${loopVerticallyStr}[${event.parameters[4]}]`
          const loopHorizontalyScroll = event.parameters[1] === true ? comma + loopHorizontallyScrollTmp : ''
          const loopVerticallyScroll = event.parameters[2] === true ? comma + loopVerticallyScrollTmp : ''
          const tag = EnglishTag ? '<ChangeParallax: ' : '<遠景の変更: '
          addNewLineIndent(indent)
          text += tag + image + loopHorizontalyScroll + loopVerticallyScroll + '>'
        }
        if (event.code === 285) {
          const variableId = event.parameters[0] + comma
          const infoType = getLocationInfoTypeValue(event.parameters[1]) + comma
          const location = getDirectOrVariablesOrCharacterValue(event.parameters[2])
          const mapX = event.parameters[3]
          const mapY = event.parameters[4]
          let locationValue = ''
          if (event.parameters[2] === 0 || event.parameters[2] === 1) {
            locationValue = `${location}[${mapX}][${mapY}]`
          } else {
            locationValue = `${location}[${mapX}]`
          }
          const tag = EnglishTag ? '<GetLocationInfo: ' : '<指定位置の情報取得: '
          addNewLineIndent(indent)
          text += tag + variableId + infoType + locationValue + '>'
        }

        /** ********************************************** */
        // シーン制御
        /** ********************************************** */
        if (event.code === 301) {
          const troop = getFixedOrVariable(event.parameters[0], event.parameters[1])
          const tag = EnglishTag ? '<BattleProcessing: ' : '<戦闘の処理: '
          addNewLineIndent(indent)
          text += tag + troop + '>'
        }
        if (event.code === 601) {
          addNewLineIndent(indent)
          text += EnglishTag ? '<IfWin>' + newLine : '<勝ったとき>'
        }
        if (event.code === 602) {
          addNewLineIndent(indent)
          text += EnglishTag ? '<IfEscape>' + newLine : '<逃げたとき>'
        }
        if (event.code === 603) {
          addNewLineIndent(indent)
          text += EnglishTag ? '<IfLose>' + newLine : '<負けたとき>'
        }
        if (event.code === 604) {
          addNewLineIndent(indent)
          text += EnglishTag ? '<End>' + newLine : '<分岐終了>'
        }
        if (event.code === 302) {
          const merchandise = getItemOrWeaponOrArmorValue(event.parameters[0]) + comma
          const merchandiseId = event.parameters[1] + comma
          const priceValue = getStandardOrSpecifyValue(event.parameters[2], event.parameters[3])
          const purchaseOnly = getCheckBoxPurchaseOnlyValue(event.parameters[4])
          const tag = EnglishTag ? '<ShopProcessing: ' : '<ショップの処理: '
          addNewLineIndent(indent)
          text += tag + purchaseOnly + '>'
          // 一つ目の商品
          const tag2 = EnglishTag ? '<Merchandise: ' : '<商品: '
          addNewLineIndent(indent)
          text += tag2 + merchandise + merchandiseId + priceValue + '>'
        }
        if (event.code === 605) {
          const merchandise = getItemOrWeaponOrArmorValue(event.parameters[0]) + comma
          const merchandiseId = event.parameters[1] + comma
          const priceValue = getStandardOrSpecifyValue(event.parameters[2], event.parameters[3])
          // 二つ目以降の商品
          const tag = EnglishTag ? '<Merchandise: ' : '<商品: '
          addNewLineIndent(indent)
          text += tag + merchandise + merchandiseId + priceValue + '>'
        }
        if (event.code === 303) {
          const actorId = event.parameters[0] + comma
          const maxCharacter = event.parameters[1]
          const tag = EnglishTag ? '<NameInputProcessing: ' : '<名前入力の処理: '
          addNewLineIndent(indent)
          text += tag + actorId + maxCharacter + '>'
        }
        if (event.code === 351) {
          const tag = EnglishTag ? '<OpenMenuScreen>' : '<メニュー画面を開く>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 352) {
          const tag = EnglishTag ? '<OpenSaveScreen>' : '<セーブ画面を開く>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 353) {
          const tag = EnglishTag ? '<GameOver>' : '<ゲームオーバー>'
          addNewLineIndent(indent)
          text += tag
        }
        if (event.code === 354) {
          const tag = EnglishTag ? '<ReturnToTitleScreen>' : '<タイトル画面に戻す>'
          addNewLineIndent(indent)
          text += tag
        }

        /** ********************************************** */
        // バトル
        /** ********************************************** */
        if (event.code === 331) {
          const enemy = getEnemyTarget(event.parameters[0]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma
          const allowKnockout = getCheckBoxAllowKnockoutValue(event.parameters[4])
          const tag = EnglishTag ? '<ChangeEnemyHp: ' : '<敵キャラのHP増減: '
          addNewLineIndent(indent)
          text += tag + enemy + operation + operandValue + allowKnockout + '>'
        }
        if (event.code === 332) {
          const enemy = getEnemyTarget(event.parameters[0]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3])
          const tag = EnglishTag ? '<ChangeEnemyMp: ' : '<敵キャラのMP増減: '
          addNewLineIndent(indent)
          text += tag + enemy + operation + operandValue + '>'
        }
        if (event.code === 342) {
          const enemy = getEnemyTarget(event.parameters[0]) + comma
          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3])
          const tag = EnglishTag ? '<ChangeEnemyTp: ' : '<敵キャラのTP増減: '
          addNewLineIndent(indent)
          text += tag + enemy + operation + operandValue + '>'
        }
        if (event.code === 333) {
          const enemy = getEnemyTarget(event.parameters[0]) + comma
          const operation = getAddOrRemove(event.parameters[1]) + comma
          const stateId = event.parameters[2]
          const tag = EnglishTag ? '<ChangeEnemyState: ' : '<敵キャラのステート変更: '
          addNewLineIndent(indent)
          text += tag + enemy + operation + stateId + '>'
        }
        if (event.code === 334) {
          const enemy = getEnemyTarget(event.parameters[0])
          const tag = EnglishTag ? '<EnemyRecoverAll: ' : '<敵キャラの全回復: '
          addNewLineIndent(indent)
          text += tag + enemy + '>'
        }
        if (event.code === 335) {
          const enemy = getEnemyTarget(event.parameters[0])
          const tag = EnglishTag ? '<EnemyAppear: ' : '<敵キャラの出現: '
          addNewLineIndent(indent)
          text += tag + enemy + '>'
        }
        if (event.code === 336) {
          const enemy = getEnemyTarget(event.parameters[0]) + comma
          const enemyId = event.parameters[1]
          const tag = EnglishTag ? '<EnemyTransform: ' : '<敵キャラの変身: '
          addNewLineIndent(indent)
          text += tag + enemy + enemyId + '>'
        }
        if (event.code === 337) {
          const enemy = getEnemyTarget2(event.parameters[0], event.parameters[2]) + comma
          const animationId = event.parameters[1]
          const tag = EnglishTag ? '<ShowBattleAnimation: ' : '<戦闘アニメーションの表示: '
          addNewLineIndent(indent)
          text += tag + enemy + animationId + '>'
        }
        if (event.code === 339) {
          const subjectValue = getEnemyOrActor(event.parameters[0], event.parameters[1]) + comma
          const skillId = event.parameters[2] + comma
          const target = getActionTarget(event.parameters[3])
          const tag = EnglishTag ? '<ForceAction: ' : '<戦闘行動の強制: '
          addNewLineIndent(indent)
          text += tag + subjectValue + skillId + target + '>'
        }
        if (event.code === 340) {
          const tag = EnglishTag ? '<AbortBattle>' : '<バトルの中断>'
          addNewLineIndent(indent)
          text += tag
        }

        /** ********************************************** */
        // 上級
        /** ********************************************** */
        // スクリプトタグはindentを入れない(取り込み時におかしくなる)
        if (event.code === 355) {
          const scriptText = event.parameters[0] + newLine
          const tag = EnglishTag ? '<Script>' + newLine : '<スクリプト>' + newLine
          const tagEnd = EnglishTag ? '</Script>' + newLine : '</スクリプト>' + newLine
          addNewLineIndent(indent)
          text += tag + scriptText + tagEnd
        }
        if (event.code === 655) {
          const scriptText = event.parameters[0] + newLine
          const tagEnd = EnglishTag ? '</Script>' + newLine : '</スクリプト>' + newLine
          if (text.endsWith(tagEnd)) {
            const tagEndDeleteText = text.slice(0, -1 * (tagEnd.length + 1)) + newLine
            const tmpText = tagEndDeleteText + scriptText + tagEnd
            addNewLineIndent(indent)
            text = tmpText
          }
        }
        // プラグインコマンド(MV)
        if (event.code === 356) {
          const pluginText = event.parameters[0]
          const tag = EnglishTag ? '<PluginCommand: ' : '<プラグインコマンド: '
          addNewLineIndent(indent)
          text += tag + pluginText + '>'
        }
        // プラグインコマンド(MZ)
        if (event.code === 357) {
          const pluginName = event.parameters[0] + comma
          const functionName = event.parameters[1] + comma
          const commandName = event.parameters[2]
          let nameValueList = ''
          for (const name in event.parameters[3]) {
            const value = `[${event.parameters[3][name]}]`
            nameValueList += comma + `${name}${value}`
          }
          nameValueList = nameValueList === undefined ? '' : nameValueList
          const tag = EnglishTag ? '<PluginCommandMZ: ' : '<プラグインコマンドMZ: '
          addNewLineIndent(indent)
          text += tag + pluginName + functionName + commandName + nameValueList + '>'
        }

        // プラグインコマンド(MZ)注釈
        if (event.code === 657) {
          const parameters = event.parameters[0]
          const splitParameters = parameters.split(' ')
          const outParameters = `[${splitParameters[0]}]`
          const lastIndex = text.lastIndexOf('\n<')
          const extractedText = text.substring(lastIndex + 1)
          text = text.substring(0, lastIndex)

          // 各引数に対して注釈を付け加える
          mzCount++
          const parametersNum = 2 + mzCount
          // 357で出力したタグを,区切りで取得
          const splitVal = parseMzArg(extractedText)
          if (splitVal[parametersNum].endsWith('>')) {
            // 最後の引数の場合は>が含まれている為、削除してから付け足す
            splitVal[parametersNum] = splitVal[parametersNum].slice(0, -1) + outParameters + '>'
          } else {
            splitVal[parametersNum] = splitVal[parametersNum] + outParameters
          }
          splitVal[parametersNum] = splitVal[parametersNum].replace(/\n/g, '\\n')
          addNewLineIndent(indent)
          text += splitVal
        } else {
          // プラグインコマンドMZのイベントが終わったらカウントを0にする
          mzCount = 0
        }
        // 何も書き出さなかったコード(未対応など)は「直前」の扱いを変えない。
        if (text !== textBefore) {
          afterMessageText = event.code === 401
        }
        // 101 の直後は必ず 401 が来るが、来なかったときに区切りを持ち越さない。
        if (event.code !== 101 && event.code !== 401) blockStartPending = false
      })
      return text
    }

    // 書き出し主体のバージョン(リリース時に package.json と揃えて更新する)。
    // 書き出したテキストのフロントマターに generator: text2frame-mv@<VERSION> として埋める。
    const VERSION = '2.3.0'

    // ディレクトリを親から順に掘る(mkdir -p 相当)。
    // MV 同梱の NW.js は Node 9 系のため fs.mkdirSync の recursive オプションを無視し、
    // 葉だけを作ろうとして親が無いと ENOENT、既存 dir には EEXIST を投げる。
    // recursive に頼らず 1 段ずつ掘り、競合で出る EEXIST だけ握り潰す。
    const mkdirpSync = function (dirPath) {
      const _fs = require('fs')
      const _path = require('path')
      const abs = _path.resolve(dirPath)
      if (_fs.existsSync(abs)) return
      const parent = _path.dirname(abs)
      // ルート('/' や 'C:\')では dirname が自分自身を返すので、そこで再帰を止める。
      if (parent !== abs) mkdirpSync(parent)
      try {
        _fs.mkdirSync(abs)
      } catch (e) {
        if (!e || e.code !== 'EEXIST') throw e
      }
    }

    /* テキストのフォルダに対応する祖先の置き場所。Text2Frame の同名の実装と対になっている
     * (取り出しは Text2Frame が無くても動く必要があるため、依存を作らずここに持つ。
     * 規約を変えるときは両方直すこと)。 */
    const baseDirForTextDir = function (root, textDir) {
      const _path = require('path')
      const abs = _path.resolve(String(textDir))
      const rel = _path.relative(_path.resolve(String(root)), abs)
      const sub = (rel && !_path.isAbsolute(rel) && rel.split(_path.sep)[0] !== '..') ? rel : _path.basename(abs)
      return _path.join(String(root), '.t2f-base', sub)
    }

    // 書き出したテキストに載せる front matter(YAMLヘッダ)を生成する。
    const renderFrontMatter = function (entry, kind) {
      const lines = ['---']
      // 値が無いキーは書かない("mapId: undefined" のような行を出さない)。
      const put = function (k, v) { if (v !== undefined && v !== null && String(v) !== '') lines.push(k + ': ' + String(v)) }
      lines.push('generator: text2frame-mv@' + VERSION)
      lines.push('kind: ' + kind)
      if (kind === 'event') {
        put('mapId', entry.mapId)
        put('eventId', entry.eventId)
        lines.push('pageId: ' + String(entry.pageId || '1'))
      } else {
        put('commonEventId', entry.commonEventId)
      }
      lines.push('---\n\n')
      return lines.join('\n')
    }

    // 未解決の衝突の目印(Text2Frame の CONFLICT_MARKERS と同じ文字列)。取り出しは Text2Frame が
    // 無くても動く必要があるため、依存を作らずここに持つ。文言を変えるときは両方直すこと。
    const CONFLICT_MARKERS = [
      '=== テキストの変更 / from text ===',
      '=== ゲームの変更 / from game ===',
      '=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ==='
    ]
    const hasConflictMarker = function (commands) {
      return (commands || []).some(function (c) {
        if (!c || (c.code !== 108 && c.code !== 408)) return false
        const p = c.parameters && c.parameters[0]
        return typeof p === 'string' && CONFLICT_MARKERS.some(function (m) { return p.indexOf(m) !== -1 })
      })
    }
    // テキスト側は compile せず素の文字列で見る(目印は注釈としてそのまま行に現れる)。
    const hasConflictMarkerInText = function (text) {
      const s = String(text || '')
      return CONFLICT_MARKERS.some(function (m) { return s.indexOf(m) !== -1 })
    }

    // front matter(先頭の --- ブロック)の取り外し/取り出し。取り出し系で共有する。
    const stripFrontMatter = function (t) {
      const n = String(t).replace(/\r\n/g, '\n')
      if (n.indexOf('---\n') !== 0) return t
      const e = n.indexOf('\n---\n', 4)
      return e < 0 ? t : n.slice(e + 5)
    }
    const frontMatterHeader = function (t) {
      const n = String(t).replace(/\r\n/g, '\n')
      if (n.indexOf('---\n') !== 0) return null
      const e = n.indexOf('\n---\n', 4)
      return e < 0 ? null : n.slice(0, e + 5)
    }
    // 見出しの末尾を「---\n」+空行1つに揃える(renderFrontMatter は空行込み、既存ファイルの
    // 見出しは空行なしで返るため、ここで吸収して本文との間隔を一定にする)。
    const normalizeHeader = function (h) {
      const s = String(h || '')
      return s ? s.replace(/\n+$/, '\n') + '\n' : ''
    }

    // 取り出し(ゲーム→テキスト)の本文を作る。merge のときだけ既存テキスト・祖先と 3-way する。
    // fs には触らない(ゲーム内は BASE_PATH、CLI は cwd と基準が違うため入出力は呼び出し側)。
    // 戻り値: { text, baseText, conflicts, markers, approximate, warnings }
    // 見送ったときは { skipped: 'game'|'text' }。
    // markers は「書き出した本文に未解決の目印が入っている」印。呼び出し側は祖先を進めないこと。
    //
    // baseText は .t2f-base へ保存する内容で、text とは別物。祖先は「テキストとゲームが
    // 実際に一致していた地点」でなければならず、取り出しで書き換えるのはテキストのほうなので、
    // 祖先には書き換えなかった側=ゲームを入れる(反映が祖先にテキストを入れるのと対称)。
    // ここに merge 結果を入れると、ゲームが一度も到達していない状態が祖先になり、次の反映で
    // 3-way が「ゲームが消した」と誤読して、取り出し前にテキストへ書いた分が黙って消える。
    const buildPullText = function (opts) {
      opts = opts || {}
      const list = opts.list || []
      const englishTag = opts.englishTag !== false
      const existingText = opts.existingText || ''
      const merge = String(opts.strategy || 'overwrite').toLowerCase() === 'merge'
      // 目印入りのゲームを統合すると、目印ごと再マージされて二重・三重に増える。統合だけ見送る。
      // 上書きは通す(テキスト側で解決したい人の入口。目印は注釈として往復するので壊れない)。
      const gameMarkers = hasConflictMarker(list)
      if (merge && gameMarkers) return { skipped: 'game', conflicts: 0 }
      // 目印入りのテキストにマージしても同じく二重化する。
      if (merge && hasConflictMarkerInText(existingText)) return { skipped: 'text', conflicts: 0 }
      const header = normalizeHeader((existingText && frontMatterHeader(existingText)) || opts.fallbackHeader || '')
      const gameText = header + decompile(list, englishTag, { pretty: true, omitDefaults: opts.omitDefaults }) + '\n'

      /* コメント行(既定は %)・空行の幅・タグ行の綴り(字下げと大文字小文字)は、
       * コマンドにならないのでコマンド列から作り直した本文には残らない。前のテキストが
       * 分かるときは、そこから元の位置・元の書き方へ戻す(規則は Text2Frame の
       * restoreAuthoredLines を参照)。
       * 全上書きでも戻す: どれもゲームに入らないため「ゲームの内容で全部置き換える」という
       * 約束の対象外(置き換える相手が存在しない)。
       * previousText を existingText と分けているのは、単発の全上書き取り出しが見出しの
       * 引き継ぎを避けるため existingText を意図して渡さないから。 */
      const previousText = opts.previousText || existingText
      const restoreComments = function (fullText) {
        if (!previousText) return { text: fullText, approximate: 0 }
        const t2f = resolveText2Frame()
        if (!t2f || !t2f.restoreAuthoredLines || !t2f.parseFrontMatter) return { text: fullText, approximate: 0 }
        // 見出しは frontMatterHeader がそのまま引き継いでおり、その中の % は既に残っている。
        // 一緒に扱うと二重になるので、本文だけを通す。
        const parsed = t2f.parseFrontMatter(fullText)
        const head = parsed.header || ''
        const r = t2f.restoreAuthoredLines(t2f.parseFrontMatter(previousText).body, parsed.body)
        return { text: head + r.text, approximate: r.approximate || 0 }
      }

      // 既存テキストが無ければ突き合わせる相手がいないので、merge でも素の取り出しと同じ。
      if (!merge || !existingText) {
        const restored = restoreComments(gameText)
        return {
          text: restored.text,
          // 祖先はゲームが持っているものなので、コメントは戻さない(読むときは compile が落とす)。
          baseText: gameText,
          conflicts: 0,
          approximate: restored.approximate,
          warnings: [],
          // 目印を含んだまま書き出した。祖先に取り込むと次回の 3-way が目印込みになるので進めない。
          markers: gameMarkers
        }
      }
      const T2F = resolveText2Frame()
      if (!T2F || !T2F.applyMergePull) {
        throw new Error('取り出し(merge)には Text2Frame プラグインが必要です。同じプロジェクトに導入してください。 / MERGE pull requires the Text2Frame plugin to be loaded.')
      }
      const r = T2F.applyMergePull({
        gameCommands: list,
        textBody: stripFrontMatter(existingText),
        baseBody: opts.baseText ? stripFrontMatter(opts.baseText) : '',
        englishTag,
        omitDefaults: opts.omitDefaults
      })
      const restored = restoreComments(header + r.text + '\n')
      return {
        text: restored.text,
        baseText: gameText,
        conflicts: r.conflicts || 0,
        approximate: restored.approximate,
        // applyMergePull の警告はこれまで捨てられていた(祖先が無いときの上書き警告など)。
        warnings: r.warnings || []
      }
    }

    // data ディレクトリを走査し、出力対象(イベント/コモンイベント)の routing メタだけを返す。
    // textPath は付けない(呼び出し側が textBase/key.txt を組み立てる)。
    /* onlyFile を渡すと、そのデータファイル1つぶんの対象だけを返す。
     * 同期は変わったファイルの分だけ処理したいので、全 Map を読み直さずに済ませる。 */
    const enumerateTargets = function (dataDir, onlyFile) {
      const _fs = require('fs')
      const _path = require('path')
      const targets = []
      const wanted = onlyFile ? _path.basename(onlyFile) : null
      const keep = function (f) { return !wanted || f.toLowerCase() === wanted.toLowerCase() }
      _fs.readdirSync(dataDir).filter(function (f) { return /^Map\d+\.json$/.test(f) && keep(f) }).sort().forEach(function (fileName) {
        const m = fileName.match(/^Map(\d+)\.json$/)
        if (!m) return
        const mapId = String(parseInt(m[1], 10))
        const mapData = JSON.parse(_fs.readFileSync(_path.join(dataDir, fileName), 'utf8'))
        if (!mapData.events || !Array.isArray(mapData.events)) return
        mapData.events.forEach(function (event, eventIndex) {
          if (!event || !event.pages || !Array.isArray(event.pages)) return
          event.pages.forEach(function (page, pageIndex) {
            const pageId = String(pageIndex + 1)
            const key = 'map' + mapId.padStart(3, '0') + '_event' + String(eventIndex).padStart(3, '0') + '_page' + pageId
            targets.push({ kind: 'event', mapId, eventId: String(eventIndex), pageId, key })
          })
        })
      })
      const commonPath = _path.join(dataDir, 'CommonEvents.json')
      if (keep('CommonEvents.json') && _fs.existsSync(commonPath)) {
        const commonData = JSON.parse(_fs.readFileSync(commonPath, 'utf8'))
        if (Array.isArray(commonData)) {
          commonData.forEach(function (ce, index) {
            if (!ce) return
            targets.push({ kind: 'common', commonEventId: String(index), key: 'common' + String(index).padStart(3, '0') })
          })
        }
      }
      return targets
    }

    /* ターゲット1件をテキストへ取り出す。一括取り出しと同期の両方から呼ぶ。
     * 一括取り出しはこれを全ターゲットに回すだけ、同期は変わったファイルの分だけ回す。
     * (全件を回す一括コマンドを変更のたびに呼ぶと、実プロジェクト規模ではゲームが数秒止まる)
     *
     * opts: { dataDir, target, outPath, baseDir, englishTag, strategy }
     * 戻り値: { ok, skipped, conflicts, markers, overwritten, approximate, warnings, baseSaveError, error }
     * 投げずに戻り値で返す。呼び出し側が件数をまとめて報告するため。 */
    const pullTargetToText = function (opts) {
      const _fs = require('fs')
      const _path = require('path')
      const t = opts.target
      try {
        let list = []
        if (t.kind === 'event') {
          const mapData = JSON.parse(_fs.readFileSync(_path.join(opts.dataDir, 'Map' + ('000' + String(t.mapId)).slice(-3) + '.json'), 'utf8'))
          list = mapData.events[Number(t.eventId)].pages[Number(t.pageId) - 1].list || []
        } else {
          const ceData = JSON.parse(_fs.readFileSync(_path.join(opts.dataDir, 'CommonEvents.json'), 'utf8'))
          list = ceData[Number(t.commonEventId)].list || []
        }
        let existingText = ''
        try { existingText = _fs.readFileSync(opts.outPath, 'utf8') } catch (e) { existingText = '' }
        const entryStrategy = String(opts.strategy).toLowerCase() === 'merge' ? 'merge' : 'overwrite'
        let baseText = ''
        if (entryStrategy === 'merge') {
          try { baseText = _fs.readFileSync(_path.join(opts.baseDir, t.key + '.txt'), 'utf8') } catch (e) { baseText = '' }
        }
        const built = buildPullText({
          list,
          englishTag: opts.englishTag,
          omitDefaults: opts.omitDefaults,
          strategy: entryStrategy,
          existingText,
          baseText,
          fallbackHeader: renderFrontMatter(t, t.kind)
        })
        // 未解決の目印が残っているものは書かずに見送る(このファイルだけ飛ばす)。
        if (built.skipped) return { ok: true, skipped: built.skipped }
        _fs.writeFileSync(opts.outPath, built.text, 'utf8')
        let baseSaveError = null
        // 目印ごと取り出したときだけ祖先を進めない(理由は単発取り出しの同じ箇所)。
        if (!built.markers) {
          // 祖先はゲーム側(built.baseText)。マージ結果を入れるとゲームが到達していない
          // 状態が祖先になり、次の反映でテキストの内容が消える。
          try { _fs.writeFileSync(_path.join(opts.baseDir, t.key + '.txt'), built.baseText, 'utf8') } catch (e) { baseSaveError = e }
        }
        return {
          ok: true,
          text: built.text,
          conflicts: built.conflicts || 0,
          markers: !!built.markers,
          // 全上書きで既存を潰したときだけ true(merge は上書きではない)。
          overwritten: entryStrategy !== 'merge' && !!existingText,
          // 周りが大きく変わって、コメント行(%)の位置があやしくなった件数。
          approximate: built.approximate || 0,
          warnings: built.warnings || [],
          baseSaveError
        }
      } catch (e) {
        return { ok: false, error: (e && e.message) || String(e) }
      }
    }

    Laurus.Frame2Text.export = { decompile, VERSION, baseDirForTextDir, enumerateTargets, pullTargetToText, renderFrontMatter, buildPullText }
    // ゲーム内(NW.js)では require('./Frame2Text.js') が解決できないため、Text2Frame の pull-merge が
    // decompile を参照できるよう共有 API をグローバルにも公開する。古い NW.js には globalThis が無いので
    // window / global にもフォールバックする(Text2Frame 側の $LaurusText2Frame と対称)。
    try {
      const glob = (typeof globalThis !== 'undefined')
        ? globalThis
        : (typeof window !== 'undefined')
            ? window
            : (typeof global !== 'undefined') ? global : null
      if (glob) glob.$LaurusFrame2Text = Laurus.Frame2Text.export
    } catch (e) { /* noop */ }
    if (Laurus.Frame2Text.ExecMode === 'LIBRARY_EXPORT') {
      return
    }

    // BATCH_EXPORT_MESSAGES_TO_FOLDER: data ディレクトリを走査し front matter 付きで一括出力する。
    if (Laurus.Frame2Text.ExecMode === 'BATCH_EXPORT_MESSAGES_TO_FOLDER') {
      if (typeof require === 'undefined') {
        addWarning('[batch] Node.js environment not available')
        return
      }
      const _path = require('path')
      const dataDir = _path.isAbsolute(Laurus.Frame2Text.DataFolder) ? Laurus.Frame2Text.DataFolder : _path.resolve(BASE_PATH, Laurus.Frame2Text.DataFolder)
      const textBase = Laurus.Frame2Text.TextBase
      const englishTag = String(Laurus.Frame2Text.EnglishTag) !== 'false'
      const batchStrategy = Laurus.Frame2Text.BatchStrategy || 'merge'
      let okCount = 0
      let errCount = 0
      let eventCount = 0
      let commonCount = 0
      let overwrittenCount = 0
      // 失敗は件数だけだと原因が分からないので、キーと理由を控えてまとめて出す。
      const failures = []
      // 未解決の衝突が残っていて取り出しを見送ったもの(統合のみ)。
      const conflictSkipped = []
      // merge で衝突を両方残したもの(祖先は進めない)。
      const conflicted = []
      // 上書きで、目印が残ったままテキストへ書き出したもの(祖先は進めない)。
      const markerCarried = []
      // 周りが大きく変わって、コメント行(%)の位置があやしくなったもの。
      const approxComments = []
      // 取り出し直後は text==game。その内容を次回反映の 3-way 祖先として保存する。
      let _baseSaveError = null
      const _baseRoot = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : BASE_PATH

      // 統合には Text2Frame の 3-way が要る。無いままだと全ファイルが同じ理由で失敗して
      // 原因が埋もれるので、走査に入る前に 1 回だけ理由と逃げ道を出して止める。
      // ここで overwrite に落とすことはしない(テキストに書いた内容を黙って消すため)。
      if (batchStrategy === 'merge') {
        const _t2f = resolveText2Frame()
        if (!_t2f || !_t2f.applyMergePull) {
          addWarning('[batch] 統合(merge)での取り出しには Text2Frame プラグインが必要です。')
          addWarning('[batch] 同じプロジェクトに導入するか、「取り出しのしかた」に overwrite を指定してください')
          addWarning('[batch] (overwrite はテキストに書いた内容を残しません)。')
          console.error('[batch] MERGE pull requires the Text2Frame plugin; install it or pull with overwrite')
          return
        }
      }

      const outDir = _path.resolve(BASE_PATH, textBase)
      // 出力先が掘れないと 1 件も書けないので、ここだけは中断してユーザに理由を見せる。
      try {
        mkdirpSync(outDir)
      } catch (e) {
        addWarning('[batch] 出力先ディレクトリを作成できませんでした / failed to create output directory: ' + outDir + ' (' + (e.message || e) + ')')
        console.error('[batch] failed to create output directory: ' + outDir + ' (' + (e.message || e) + ')')
        return
      }
      // 祖先はテキストの置き場所ごとに分ける(Text2Frame の deriveBaseId と同じ規約)。
      const _baseDir = baseDirForTextDir(_baseRoot, outDir)
      try { mkdirpSync(_baseDir) } catch (e) { _baseSaveError = _baseSaveError || e }

      // データフォルダが無いと readdirSync が投げる。生の例外ではなくパスを見せて止める。
      let targets = []
      try {
        targets = enumerateTargets(dataDir)
      } catch (e) {
        addWarning('[batch] データフォルダを読めませんでした / cannot read data folder: ' + dataDir + ' (' + (e.message || e) + ')')
        console.error('[batch] cannot read data folder: ' + dataDir + ' (' + (e.message || e) + ')')
        return
      }
      if (targets.length === 0) {
        addWarning('[batch] 取り出し対象が見つかりませんでした。データフォルダを確認してください / no targets found: ' + dataDir)
        console.warn('[batch] no targets found under ' + dataDir)
        return
      }

      targets.forEach(function (t) {
        // 1件ぶんの取り出しは同期と共通(pullTargetToText)。ここは件数の集計だけ行う。
        const r = pullTargetToText({
          dataDir,
          target: t,
          outPath: _path.resolve(BASE_PATH, textBase, t.key + '.txt'),
          baseDir: _baseDir,
          englishTag,
          strategy: batchStrategy
        })
        if (!r.ok) {
          errCount++
          failures.push(t.key + ': ' + r.error)
          console.error('[batch] ' + t.key + ': ' + r.error)
          return
        }
        if (r.skipped) {
          conflictSkipped.push(t.key)
          return
        }
        if (r.overwritten) overwrittenCount++
        if (r.conflicts) conflicted.push(t.key)
        if (r.markers) markerCarried.push(t.key)
        if (r.approximate) approxComments.push(t.key)
        const pullWarnings = r.warnings || []
        pullWarnings.forEach(function (w) { console.warn('[batch] ' + t.key + ': ' + w) })
        if (r.baseSaveError) _baseSaveError = _baseSaveError || r.baseSaveError
        if (t.kind === 'event') eventCount++
        else commonCount++
        okCount++
      })
      if (_baseSaveError) {
        addWarning('[batch] 警告: .t2f-base の祖先を保存できませんでした (' + (_baseSaveError.message || _baseSaveError) + ')。次回反映は祖先無し扱いとなり、テキストを全反映します(3-wayになりません)。')
        console.warn('[batch] WARNING: .t2f-base ancestor NOT saved (' + (_baseSaveError.message || _baseSaveError) + '); next import applies text whole (no 3-way).')
      }
      addMessage('[batch] 取り出し完了(' + batchStrategy + '): 成功 ' + okCount + '件 (イベント ' + eventCount + ' / コモン ' + commonCount + ')、失敗 ' + errCount + '件' +
        (conflictSkipped.length > 0 ? '、衝突未解決で除外 ' + conflictSkipped.length + '件' : '') +
        (markerCarried.length > 0 ? '、目印ごと取り出し ' + markerCarried.length + '件' : ''))
      addMessage('[batch] 出力先: ' + outDir)
      if (overwrittenCount > 0) {
        // 「取り出しはマージしません」と書いていた名残があったが、一括取り出しは統合を選べる。
        // この行は上書きしたファイルだけを数えているので、統合との違いを言って対処に繋げる。
        addWarning('[batch] 既存テキスト ' + overwrittenCount + '件を上書きしました(テキストに書いた内容は残っていません)。')
        addWarning('[batch] 残したいときは「取り出しのしかた」に merge を指定してください。')
      }
      // $gameMessage は行数が限られるため、失敗の詳細は先頭数件だけ出して残りはコンソールへ回す。
      const FAILURE_LINES = 5
      if (conflictSkipped.length > 0) {
        addWarning('[batch] 衝突未解決で取り出さなかったファイル: ' + conflictSkipped.slice(0, FAILURE_LINES).join(', ') +
          (conflictSkipped.length > FAILURE_LINES ? ' ほか' : ''))
        addWarning('[batch] 統合はできません。ツクールで目印3行を消すか、上書きで取り出してテキスト側で解決してください。')
        console.warn('[batch] skipped (unresolved conflict markers): ' + conflictSkipped.join(', '))
      }
      if (markerCarried.length > 0) {
        addWarning('[batch] 目印ごと取り出したファイル ' + markerCarried.length + '件: ' + markerCarried.slice(0, FAILURE_LINES).join(', ') +
          (markerCarried.length > FAILURE_LINES ? ' ほか' : ''))
        addWarning('[batch] 祖先(.t2f-base)は更新していません。テキストの目印3行を消して残す方を決めたあと、')
        addWarning('[batch] Text2Frameの一括反映を上書きで実行してください(目印がゲーム側にもあるため)。')
        console.warn('[batch] exported with unresolved markers (ancestor not advanced): ' + markerCarried.join(', '))
      }
      if (conflicted.length > 0) {
        addWarning('[batch] 衝突あり(両方残し) ' + conflicted.length + '件: ' + conflicted.slice(0, FAILURE_LINES).join(', ') +
          (conflicted.length > FAILURE_LINES ? ' ほか' : ''))
        addWarning('[batch] テキストの目印3行を消して残す方を決めたあと、Text2Frameの一括反映(merge)を実行してください。')
        console.warn('[batch] conflicts kept both: ' + conflicted.join(', '))
      }
      if (approxComments.length > 0) {
        addWarning('[batch] コメント行の位置があやしいファイル ' + approxComments.length + '件: ' +
          approxComments.slice(0, FAILURE_LINES).join(', ') + (approxComments.length > FAILURE_LINES ? ' ほか' : ''))
        addWarning('[batch] 周りが大きく変わったため、目で確かめてください(消えてはいません)。')
        console.warn('[batch] comment lines may have moved: ' + approxComments.join(', '))
      }
      failures.slice(0, FAILURE_LINES).forEach(function (f) { addWarning('[batch] 失敗: ' + f) })
      if (failures.length > FAILURE_LINES) {
        addWarning('[batch] 他 ' + (failures.length - FAILURE_LINES) + '件の失敗はコンソール(F8)を参照してください。')
      }
      console.log('[batch] Completed (' + batchStrategy + '): ' + okCount + ' success (event ' + eventCount + ' / common ' + commonCount + '), ' +
        errCount + ' errors, ' + conflicted.length + ' with conflicts, ' + markerCarried.length + ' with unresolved markers -> ' + outDir +
        (overwrittenCount > 0 ? ' (overwrote ' + overwrittenCount + ' existing text file(s))' : ''))
      // 取り出したあと自動で追従させたいときは Text2Frame の START_DATA_SYNC を使う
      // (単独のコマンドにしてある理由はそちらの実行部を参照)。
      return
    }

    /** ******************************* */
    // 取り出し(単発)。merge は既存テキストを残して 3-way、overwrite は全上書き。
    // 一括取り出し・CLI・t2f-sync・VS Code と同じ buildPullText を通す。
    /** ******************************* */
    const isCEExport = Laurus.Frame2Text.ExecMode === 'EXPORT_CE_TO_MESSAGE' ||
      Laurus.Frame2Text.ExecMode === 'コモンイベントをメッセージにエクスポート'
    const exportKind = isCEExport ? 'common' : 'event'
    // CLI は --input_path で map ファイルを直接指定するため MapID が無い。パス名から補う。
    const exportMapId = Laurus.Frame2Text.MapID || (function () {
      const m = String(Laurus.Frame2Text.MapPath || '').match(/Map(\d+)\.json$/i)
      return m ? String(parseInt(m[1], 10)) : undefined
    })()
    const exportEntry = isCEExport
      ? { commonEventId: Laurus.Frame2Text.CommonEventID }
      : { mapId: exportMapId, eventId: Laurus.Frame2Text.EventID, pageId: Laurus.Frame2Text.PageID }
    const outPath = Laurus.Frame2Text.TextPath
    const exportStrategy = Laurus.Frame2Text.Strategy === 'merge' ? 'merge' : 'overwrite'
    const _T2Fx = resolveText2Frame()
    if (exportStrategy === 'merge' && (!_T2Fx || !_T2Fx.applyMergePull)) {
      throw new Error('取り出し(merge)には Text2Frame プラグインが必要です。同じプロジェクトに導入してください。 / MERGE pull requires the Text2Frame plugin to be loaded.')
    }
    const _exportRoot = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : BASE_PATH
    const _exportId = (_T2Fx && _T2Fx.deriveBaseId) ? _T2Fx.deriveBaseId(outPath, _exportRoot) : null
    // 全上書きでは既存テキストを読まない。読むと buildPullText が既存の見出しを引き継ぎ、
    // 引数で指定した宛先と食い違う。統合のときだけ突き合わせる相手として要る。
    let existingText = ''
    let baseText = ''
    if (exportStrategy === 'merge') {
      try { existingText = readText(outPath) } catch (e) { existingText = '' }
      if (Laurus.Frame2Text.BasePath) {
        try { baseText = readText(Laurus.Frame2Text.BasePath) } catch (e) { baseText = '' }
      } else if (_exportId && _T2Fx.readBaseText) {
        baseText = _T2Fx.readBaseText(_exportRoot, _exportId.key) || ''
      }
    }
    /* コメント行を戻す元は existingText とは別に渡す。全上書きでも % は残すが、
     * existingText を渡すと見出しまで引き継いでしまうため(すぐ上の理由)。 */
    let previousText = existingText
    if (!previousText) {
      try { previousText = readText(outPath) } catch (e) { previousText = '' }
    }
    const built = buildPullText({
      list: map_events,
      englishTag: EnglishTag,
      strategy: exportStrategy,
      existingText,
      previousText,
      baseText,
      fallbackHeader: renderFrontMatter(exportEntry, exportKind)
    })
    // 単発コマンドは対象が1つしかないので、見送りは黙って成功にせず理由を出して止める。
    if (built.skipped === 'game') {
      throw new Error('未解決の衝突がゲーム側に残っています。ツクールで目印3行を消して残す方を決めたあと、もう一度取り出してください。テキスト側で解決したいときは上書きで取り出すと目印ごと出てきます。' +
        ' / unresolved conflict markers in the game data; resolve in the editor and pull again, or pull with overwrite to resolve in the text')
    }
    if (built.skipped) {
      throw new Error('未解決の衝突がテキストに残っています。目印3行を消して残す方を決めたあと、Text2Frameの「反映」を実行してください。' +
        ' / unresolved conflict markers in the text; resolve them, then import')
    }
    const outputText = built.text

    /** ********************************************** */
    // txtファイルを出力
    /** ********************************************** */
    try { mkdirpSync(require('path').dirname(outPath)) } catch (e) { /* best effort */ }
    writeData(outPath, outputText)
    if (built.conflicts) {
      logger.error('[merge-pull] ' + built.conflicts + ' conflict(s) kept both / 衝突を両方残しました: ' + outPath)
      logger.error('[merge-pull] テキストの目印3行を消して残す方を決めたあと、反映(merge)を実行してください。 / resolve the text, then import with merge')
    }
    if (built.approximate) {
      addWarning('コメント行 ' + built.approximate + '件は周りが大きく変わったため、位置がずれているかもしれません(消えてはいません)。')
    }
    const exportWarnings = built.warnings || []
    exportWarnings.forEach(function (w) { addWarning(w) })
    /* 目印ごと取り出した場合は祖先を進めない。祖先に目印が入ると次回の 3-way が
     * その目印ごと再マージし、目印が二重・三重に増えるため。
     * 衝突しただけ(目印はテキストだけ)なら進める。据え置くと、テキストで解決したあとの
     * 反映で同じ衝突が再発する。取り出しの3経路で同じ規則。 */
    if (built.markers) {
      addWarning('未解決の衝突の目印ごと取り出したため、祖先(.t2f-base)は更新していません。テキストの目印3行を消して残す方を決めたあと、反映を上書きで実行してください。')
    }
    // 祖先はゲーム側(built.baseText)。マージ結果を入れると次の反映でテキストの内容が消える。
    try {
      if (!built.markers && _exportId && _T2Fx && _T2Fx.saveBaseText) {
        _T2Fx.saveBaseText(_exportRoot, _exportId.key, built.baseText)
      }
    } catch (e) { /* best effort */ }

    /** ********************************************** */
    // 出力メッセージ
    /** ********************************************** */
    const actionWord = 'Exported to'
    const actionWordJa = 'にエクスポートしました'
    const EnglishMessage = `${actionWord} ${Laurus.Frame2Text.TextPath}`
    const JapaneseMessage = `${Laurus.Frame2Text.TextPath} ${actionWordJa}`
    addMessage(EnglishMessage + '\n' + JapaneseMessage)
    console.log(EnglishMessage + '\n' + JapaneseMessage)
  }

  // export convert func.
  Game_Interpreter.prototype.pluginCommandFrame2Text('LIBRARY_EXPORT', [0])
  if (typeof module !== 'undefined') {
    module.exports = Laurus.Frame2Text.export
  }
})()

// developer mode
if (typeof require !== 'undefined' && typeof require.main !== 'undefined' && require.main === module) {
  const { Command } = require('commander')
  const fs = require('fs')
  const path = require('path')

  const program = new Command()
  program
    .version('2.3.0')
    .usage('[options]')
    .option('-m, --mode <map|common|decompile|test|batch>', 'output mode', /^(map|common|decompile|test|batch)$/i)
    .option('-i, --input_path <name>', 'input map data path')
    .option('-o, --output_path <name>', 'output file path')
    .option('-e, --event_id <name>', 'event file id')
    .option('-p, --page_id <name>', 'page id', '1')
    .option('-c, --common_event_id <name>', 'common event id')
    .option('-d, --data-dir <dir>', 'game data directory', 'data')
    .option('-t, --text-dir <dir>', 'text base directory (batch)', 'text')
    .option('-v, --verbose', 'debug mode', false)
    .option('-w, --english_tag <true/false>', 'english tag', 'true')
    .option('--omit-default-tags <true/false>', 'omit face/background/position tags that match the defaults', 'true')
    .option('-s, --strategy <merge|overwrite>', 'pull strategy (default merge: keep translations; overwrite: replace)', /^(merge|overwrite)$/i, 'merge')
    .option('-b, --base <path>', 'ancestor text path for merge (optional; auto .t2f-base when omitted)')
    .parse()

  const help_text = `
===== Manual =====
    NAME
       Frame2Text - Simple decompiler to convert event to text.
    SYNOPSIS
        node Frame2Text.js
        node Frame2Text.js --mode batch
        node Frame2Text.js --mode map --input_path <map json file path> --output_path <output file path> --event_id <event id> --page_id <page id>
        node Frame2Text.js --mode common --input_path <map json file path> --common_event_id <common event id> --output_path <output file path>
        node Frame2Text.js --mode test
    DESCRIPTION
        node Frame2Text.js --mode batch
          イベントの一括変換モードです。
          PRGツクールのdataディレクトリを読み込み、 すべてのイベントを text フォルダに書き出します。
          例1：$ node Frame2Text.js --mode batch
          例2：$ node Frame2Text.js -m batch

          テキストの場所は --text-dir、データの場所は --data-dir で変更できます。（既定は text / data ）
          例3: $ node Frame2Text.js --mode batch --text-dir text --data-dir data

          -s / --strategy で取り出しのしかたを選べます。（既定は merge ）
            merge     … 「統合」。テキストに書いた内容を残したまま、ゲーム側の変更だけを
                        取り込みます。同じ場所を両方で変えたときは目印付きで両方残します。
            overwrite … 「上書き」。ゲームの内容でテキストを全て置き換えます。
                        テキスト側に書いてまだ反映していない編集は失われます。
          例3-2: $ node Frame2Text.js --mode batch -s overwrite

          --watch を付与すると、テキストの変更を監視し、自動でゲームに反映することができます。
          例4: $ node Text2Frame.js --mode batch --watch

          --text-dir でテキストのフォルダを分けておけば、複数の版を並行して持てます。
          典型的な利用方法として、言語ごとのテキストの管理が挙げられます。
          例えば、Frame2Textを利用しゲームの内容をtext-enフォルダへ書き出し、テキストを英語で書き直した後、
          下記のコマンドでその内容をゲームに反映できます。
          例5: $ node Frame2Text.js --mode batch --text-dir text-en
               $ node Text2Frame.js --mode batch --text-dir text-en

        node Frame2Text.js --mode map --input_path <map json file path> --output_path <output file path> --event_id <event id> --page_id <page id>
          マップイベントのテキスト出力モードです。
          読み込むマップファイル、出力テキストファイル、イベントID、ページIDを指定します。
          test/expected_basic.json を読み込み、 test/tmp.txt に書き出すコマンド例は以下です。

          例1：$ node Frame2Text.js --mode map --input_path test/expected_basic.json --output_path test/tmp.txt --event_id 1 --page_id 1
          例2：$ node Frame2Text.js -m map -i test/expected_basic.json -o test/tmp.txt -e 1 -p 1

        node Frame2Text.js --mode common --input_path <map json file path> --common_event_id <common event id> --output_path <output file path>
          コモンイベントへのテキスト出力モードです。
          読み込むコモンイベントファイル、出力テキストイベント、コモンイベントIDを引数で指定します。
          data/CommonEvents.json を読み込み、 test/tmp.txt に上書きするコマンド例は以下です。

          例1：$ node Frame2Text.js --mode common --input_path data/CommonEvents.json --common_event_id 1 --output_path test/tmp.txt
          例2：$ node Frame2Text.js -m common -i data/CommonEvents.json -c 1 -o test/tmp.txt

        node Frame2Text.js --mode decompile
           デコンパイルモードです。
           変換したいイベントをパイプで与えると、対応したテキストファイルに変換し、標準出力に出力します。
           このモードでは、Map.json / CommonEvent.json 単位で変換され、イベントやページ番号は無視されます。
           例1: $ cat data/Map001.json | node Frame2Text.js --mode decompile
`

  program.addHelpText('after', help_text)
  const options = program.opts()

  if (!['map', 'common', 'decompile', 'test', 'batch'].includes(options.mode)) {
    program.help()
    process.exit(0)
  }

  const _pullOverwrite = String(options.strategy).toLowerCase() === 'overwrite'
  if (options.mode === 'map') {
    const Frame2Text = {
      MapID: options.map_id,
      EventID: options.event_id,
      PageID: options.page_id,
      TextPath: options.output_path,
      FileName: options.output_path,
      MapPath: options.input_path,
      CommonEventPath: options.input_path,
      CommonEventID: options.common_event_id,
      EnglishTag: options.english_tag,
      OmitDefaultTags: options.omitDefaultTags,
      BasePath: options.base,
      Strategy: _pullOverwrite ? 'overwrite' : 'merge',
      ExecMode: 'EXPORT_EVENT_TO_MESSAGE'
    }
    Game_Interpreter.prototype.pluginCommandFrame2Text('COMMAND_LINE', [Frame2Text])
  } else if (options.mode === 'common') {
    const Frame2Text = {
      MapID: options.map_id,
      EventID: options.event_id,
      PageID: options.page_id,
      TextPath: options.output_path,
      FileName: options.output_path,
      MapPath: options.input_path,
      CommonEventPath: options.input_path,
      CommonEventID: options.common_event_id,
      EnglishTag: options.english_tag,
      OmitDefaultTags: options.omitDefaultTags,
      BasePath: options.base,
      Strategy: _pullOverwrite ? 'overwrite' : 'merge',
      ExecMode: 'EXPORT_CE_TO_MESSAGE'
    }
    Game_Interpreter.prototype.pluginCommandFrame2Text('COMMAND_LINE', [Frame2Text])
  } else if (options.mode === 'decompile') {
    process.stdin.setEncoding('utf8')
    let data = ''
    process.stdin.on('readable', () => {
      let chunk
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk
      }
    })
    process.stdin.on('end', () => {
      JSON.parse(data).events.filter(event => event !== null).forEach(function (event) {
        event.pages.forEach(function (p) {
          console.log(module.exports.decompile(p.list))
        })
      })
    })
  } else if (options.mode === 'test') {
    const folder_name = 'test'
    const file_name = 'frame2text.txt'
    const map_id = '1'
    const event_id = '1'
    const page_id = '1'
    Game_Interpreter.prototype.pluginCommandFrame2Text('EXPORT_EVENT_TO_MESSAGE', [
      folder_name,
      file_name,
      map_id,
      event_id,
      page_id
    ])
  } else if (options.mode === 'batch') {
    const dataDir = path.resolve(options.dataDir)
    if (!fs.existsSync(dataDir)) {
      throw new Error('Data directory not found: ' + dataDir)
    }
    const textDir = options.textDir
    const englishTag = String(options.english_tag) === 'true'
    // 既定と同じタグの省略。プラグインパラメータと同じ既定(省略する)。
    const omitDefaults = String(options.omitDefaultTags) !== 'false'
    // map/common モードと同じく -s を尊重する(既定 merge)。既存テキストが無ければ結果は全上書きと同じ。
    const batchStrategy = _pullOverwrite ? 'overwrite' : 'merge'
    // 取り出し直後は text==game。その内容を次回反映の 3-way 祖先として保存する(既存 dir は existsSync でガード)。
    let baseSaveError = null
    const baseRoot = process.cwd()
    // 祖先はテキストの置き場所ごとに分ける(Text2Frame の deriveBaseId と同じ規約)。
    const baseDir = module.exports.baseDirForTextDir(baseRoot, path.resolve(textDir))
    try { if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true }) } catch (e) { baseSaveError = baseSaveError || e }
    const results = []
    module.exports.enumerateTargets(dataDir).forEach(function (t) {
      try {
        let list = []
        if (t.kind === 'event') {
          const mapData = JSON.parse(fs.readFileSync(path.join(dataDir, 'Map' + ('000' + String(t.mapId)).slice(-3) + '.json'), 'utf8'))
          list = mapData.events[Number(t.eventId)].pages[Number(t.pageId) - 1].list || []
        } else {
          const ceData = JSON.parse(fs.readFileSync(path.join(dataDir, 'CommonEvents.json'), 'utf8'))
          list = ceData[Number(t.commonEventId)].list || []
        }
        const textPath = path.resolve(textDir, t.key + '.txt')
        let existingText = ''
        try { existingText = fs.readFileSync(textPath, 'utf8') } catch (e) { existingText = '' }
        const entryStrategy = String(batchStrategy).toLowerCase() === 'merge' ? 'merge' : 'overwrite'
        let baseText = ''
        if (entryStrategy === 'merge') {
          try { baseText = fs.readFileSync(path.join(baseDir, t.key + '.txt'), 'utf8') } catch (e) { baseText = '' }
        }
        const built = module.exports.buildPullText({
          list,
          englishTag,
          omitDefaults,
          strategy: entryStrategy,
          existingText,
          baseText,
          fallbackHeader: module.exports.renderFrontMatter(t, t.kind)
        })
        // 統合できないものは書かずに見送る(上書きなら目印ごと取り出せる)。
        if (built.skipped) {
          results.push({ ok: true, textPath, skipped: built.skipped })
          return
        }
        fs.mkdirSync(path.dirname(textPath), { recursive: true })
        fs.writeFileSync(textPath, built.text, 'utf8')
        // 目印ごと取り出したときだけ祖先を進めない(理由は単発取り出しの同じ箇所)。
        if (!built.markers) {
          // 祖先はゲーム側(built.baseText)。理由は in-engine 側の同じ箇所を参照。
          try { fs.writeFileSync(path.join(baseDir, t.key + '.txt'), built.baseText, 'utf8') } catch (e) { baseSaveError = baseSaveError || e }
        }
        results.push({ ok: true, textPath, conflicts: built.conflicts, markers: built.markers, approximate: built.approximate })
      } catch (error) {
        results.push({ ok: false, key: t.key, error: error.message })
      }
    })
    const failures = results.filter(function (r) { return !r.ok })
    const conflicted = results.filter(function (r) { return r.ok && r.conflicts })
    const skipped = results.filter(function (r) { return r.skipped })
    const carried = results.filter(function (r) { return r.ok && r.markers })
    const approx = results.filter(function (r) { return r.ok && r.approximate })
    console.log(JSON.stringify({ total: results.length, failed: failures.length, conflicts: conflicted.length, skipped: skipped.length, carried: carried.length, approximate: approx.length, strategy: batchStrategy, results }, null, 2))
    if (approx.length > 0) {
      console.warn('[batch] ' + approx.length + ' file(s) may have moved comment lines (nothing was lost; the surrounding text changed): ' +
        approx.map(function (r) { return r.textPath }).join(', '))
    }
    if (skipped.length > 0) {
      console.warn('[batch] ' + skipped.length + ' file(s) skipped: cannot merge across unresolved conflict markers ' +
        '(resolve them, or pull with --strategy overwrite and resolve in the text): ' +
        skipped.map(function (r) { return r.textPath }).join(', '))
    }
    if (carried.length > 0) {
      console.warn('[batch] ' + carried.length + ' file(s) exported with unresolved markers; .t2f-base not advanced ' +
        '(resolve the markers in the text, then import with --strategy overwrite): ' +
        carried.map(function (r) { return r.textPath }).join(', '))
    }
    if (conflicted.length > 0) {
      // 衝突は失敗ではない(両方残して書き出してある)。祖先はゲーム側へ進めてあるので、
      // テキストで決めたあとは merge のまま反映すれば、その決着がそのままゲームに入る。
      console.warn('[batch] ' + conflicted.length + ' file(s) kept both sides ' +
        '(resolve the markers in the text, then import): ' +
        conflicted.map(function (r) { return r.textPath }).join(', '))
    }
    if (baseSaveError) {
      console.warn('[batch] WARNING: .t2f-base の祖先を保存できませんでした (' + (baseSaveError.message || baseSaveError) +
        ')。テキストは書き出せていますが、次回 --mode batch は祖先無し扱いとなりテキストを全反映します（3-wayになりません）。/ ' +
        'ancestor NOT saved; next import applies text whole (no 3-way).')
    }
    if (failures.length > 0) {
      process.exitCode = 1
    }
  }
}
