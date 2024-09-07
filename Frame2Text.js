//= ============================================================================
// Frame2Text.js
// ----------------------------------------------------------------------------
// (C)2023-2024 Shick
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.0.1 2024/09/07:
// ・#125 プラグインコマンドMZを変換する際、オブジェクト型を取り扱えない不具合の修正
// 1.0.0 2024/01/20 Initial Version
// 0.1.0 2023/09/25 新規作成
//= ============================================================================

/* eslint-disable spaced-comment */
/*:
 * @target MZ
 * @plugindesc イベントコマンドをテキストファイル(.txtファイルなど)に出力するための開発支援プラグインです。ツクールMV・MZの両方に対応しています。
 * @author inazumasoft:Shick
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
 * @help
 * 本プラグインはイベントコマンドをテキストファイル(.txtファイルなど)に
 * 出力するための開発支援プラグインです。
 *
 * Text2Frameの逆の処理を行うプラグインであり、
 * 既存のイベントをテキストに出力して管理したい場合や、
 * Text2Frameで一度取り込んだイベントをイベントエディターで編集した後に
 * 再度テキストに出力したい時に使用するプラグインです。
 *
 * Text2Frameについては、以下のページをご覧ください。
 * https://github.com/yktsr/Text2Frame-MV
 *
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
 * 1.0.1
 * build: 81bc070a76bcd0246713b2872df90650ffc7ce70
 */
/* eslint-enable spaced-comment */

/* global Game_Interpreter, $gameMessage, process, PluginManager */

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
    Laurus.Frame2Text.DisplayWarning = String(Laurus.Frame2Text.Parameters.DisplayWarning) === 'true'
    Laurus.Frame2Text.EnglishTag = String(Laurus.Frame2Text.Parameters.EnglishTag) === 'true'
    let PATH_SEP = '/'
    let BASE_PATH = '.'
    if (typeof require !== 'undefined') {
      const path = require('path')
      PATH_SEP = path.sep
      BASE_PATH = path.dirname(process.mainModule.filename)
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
      this.pluginCommand('EXPORT_EVENT_TO_MESSAGE', [file_folder, file_name, map_id, event_id, page_id])
    })
    PluginManager.registerCommand('Frame2Text', 'EXPORT_CE_TO_MESSAGE', function (args) {
      const file_folder = args.FileFolder
      const file_name = args.FileName
      const common_event_id = args.CommonEventID
      this.pluginCommand('EXPORT_CE_TO_MESSAGE', [file_folder, file_name, common_event_id])
    })
  }

  const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand
  Game_Interpreter.prototype.pluginCommand = function (command, args) {
    _Game_Interpreter_pluginCommand.apply(this, arguments)
    this.pluginCommandFrame2Text(command, args)
  }

  Game_Interpreter.prototype.pluginCommandFrame2Text = function (command, args) {
    const addMessage = function (text) {
      if (Laurus.Frame2Text.DisplayMsg) {
        $gameMessage.add(text)
      }
    }

    let PATH_SEP = '/'
    let BASE_PATH = '.'
    if (typeof require !== 'undefined') {
      const path = require('path')
      PATH_SEP = path.sep
      BASE_PATH = path.dirname(process.mainModule.filename)
    }

    Laurus.Frame2Text.ExecMode = command.toUpperCase()
    // 入力ファイル(MAPXXX.json)、出力ファイル(message.txt)の情報
    switch (Laurus.Frame2Text.ExecMode) {
      // for custom plugin command
      case 'EXPORT_EVENT_TO_MESSAGE':
      case 'イベントをメッセージにエクスポ－ト':
        if (args[0]) Laurus.Frame2Text.FileFolder = args[0]
        if (args[1]) Laurus.Frame2Text.FileName = args[1]
        if (args[2]) Laurus.Frame2Text.MapID = args[2]
        if (args[3]) Laurus.Frame2Text.EventID = args[3]
        if (args[4]) Laurus.Frame2Text.PageID = args[4]
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
        if (args.length === 3) {
          Laurus.Frame2Text.ExecMode = 'EXPORT_CE_TO_MESSAGE'
          Laurus.Frame2Text.FileFolder = args[0]
          Laurus.Frame2Text.FileName = args[1]
          Laurus.Frame2Text.CommonEventID = args[2]
          Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`
          Laurus.Frame2Text.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`
        }
        addMessage('=====> Common EventID: ' + Laurus.Frame2Text.CommonEventID)
        break
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
      const indent = ''
      return indent
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
    const decompile = function (map_events, EnglishTag) {
      // イベントコード毎にループ
      let text = ''
      map_events.forEach(function (event) {
        if (typeof event !== 'object') {
          return
        }
        // インデント
        const indent = getIndent(event.indent)
        // 改行とインデントを追加する関数
        const addNewLineIndent = (indent) => {
          // 最初のタグだけ改行を入れない
          text += text === '' ? indent : newLine + indent
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

          const faceTag = EnglishTag ? `<Face: ${face}(${faceId})>` : `<顔: ${face}(${faceId})>`
          const backgroundTag = EnglishTag ? `<Background: ${background}>` : `<背景: ${background}>`
          const windowPositionTag = EnglishTag ? `<WindowPosition: ${windowPosition}>` : `<位置: ${windowPosition}>`
          const nameTagStr = EnglishTag ? `<Name: ${name}>` : `<名前: ${name}>`
          const nameTag = name === '' || name === undefined ? '' : nameTagStr

          addNewLineIndent(indent)
          text += faceTag + backgroundTag + windowPositionTag + nameTag
        }
        if (event.code === 401) {
          const showText = event.parameters[0]
          addNewLineIndent(indent)
          text += showText
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
          addNewLineIndent(indent)
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
          const tag = EnglishTag ? '<Comment>' : '<注釈>'
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
          // const correctMoveIndent = event.indent + 1
          // const moveIndent = space.repeat(correctMoveIndent * baseIndent)
          const moveIndent = ''

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
      })
      return text
    }

    Laurus.Frame2Text.export = { decompile }
    if (Laurus.Frame2Text.ExecMode === 'LIBRARY_EXPORT') {
      return
    }
    const text = decompile(map_events, EnglishTag)

    /** ********************************************** */
    // txtファイルを出力
    /** ********************************************** */
    writeData(Laurus.Frame2Text.TextPath, text)

    /** ********************************************** */
    // 出力メッセージ
    /** ********************************************** */
    const EnglishMessage = `Exported to ${Laurus.Frame2Text.TextPath}`
    const JapaneseMessage = `${Laurus.Frame2Text.TextPath} にエクスポートしました`
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
  const program = new Command()
  program
    .version('1.0.0')
    .usage('[options]')
    .option('-m, --mode <map|common|decompile|test>', 'output mode', /^(map|common|decompile|test)$/i)
    .option('-i, --input_path <name>', 'input map data path')
    .option('-o, --output_path <name>', 'output file path')
    .option('-e, --event_id <name>', 'event file id')
    .option('-p, --page_id <name>', 'page id', '1')
    .option('-c, --common_event_id <name>', 'common event id')
    .option('-v, --verbose', 'debug mode', false)
    .option('-w, --english_tag <true/false>', 'english tag', 'true')
    .parse()

  const help_text = `
===== Manual =====
    NAME
       Frame2Text - Simple decompiler to convert event to text.
    SYNOPSIS
        node Frame2Text.js
        node Frame2Text.js --mode map --input_path <map json file path> --output_path <output file path> --event_id <event id> --page_id <page id>
        node Frame2Text.js --mode common --input_path <map json file path> --common_event_id <common event id> --output_path <output file path>
        node Frame2Text.js --mode test
    DESCRIPTION
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

  if (!['map', 'common', 'decompile', 'test'].includes(options.mode)) {
    program.help()
    process.exit(0)
  }

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
  }
}
