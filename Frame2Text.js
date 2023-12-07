//= ============================================================================
// Frame2Text.js
// ----------------------------------------------------------------------------
// (C)2023
// This software is released under the MIT License.
// http://
// ----------------------------------------------------------------------------
// Version
// 0.1.0 2023/09/25 新規作成
//= ============================================================================

/*:
 *: @target MZ
 * @plugindesc This is a development support plugin for converting event commands to text files.
 * @author InazumaSoft
 *
 * @command EXPORT_EVENT_TO_MESSAGE
 * @text Export event to message
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
 * @command EXPORT_CE_TO_MESSAGE
 * @text Export common event to message.
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
 * @param EnglishTag
 * @text EnglishTag
 * @desc Language of tags and parameters when outputting files. The default value is true (English).
 * @default true
 * @type boolean
 *
 * @help
 *
 *
 */

/* eslint-disable spaced-comment */
/*:ja
 * @target MZ
 * @plugindesc イベントコマンドからテキストファイル(.txtファイルなど)に変換するための開発支援プラグインです。ツクールMV・MZの両方に対応しています。※Text2Frameの逆の処理
 * @author InazumaSoft
 *
 * @command EXPORT_EVENT_TO_MESSAGE
 * @text イベントをメッセージにエクスポート
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
 * @command EXPORT_CE_TO_MESSAGE
 * @text コモンイベントをメッセージにエクスポート
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
 * @param EnglishTag
 * @text 英語タグ
 * @desc ファイル出力時のタグ、パラメータの言語。デフォルト値はtrue(英語)です。
 * @default true
 * @type boolean
 *
 * @help
 *
 *
 *
 * --------------------------------------
 * 注意事項
 * --------------------------------------
 * プラグイン作者は、いかなる場合も破損したプロジェクトの復元には
 * 応じられませんのでご注意ください。
 * テキストファイルの文字コードはUTF-8にのみ対応しています。
 *
 */
/* eslint-enable spaced-comment */

/* global Game_Interpreter, $gameMessage, process, PluginManager */

var Laurus = Laurus || {} // eslint-disable-line no-var, no-use-before-define
Laurus.Frame2Text = {}

if (typeof PluginManager === 'undefined') {
  // for test
  /* eslint-disable no-global-assign */
  Game_Interpreter = {}
  Game_Interpreter.prototype = {}
  $gameMessage = {}
  $gameMessage.add = function () {}
  /* eslint-enable */
}

(function () {
  'use strict'
  const fs = require('fs')
  const path = require('path')
  const PATH_SEP = path.sep
  const BASE_PATH = path.dirname(process.mainModule.filename)

  if (typeof PluginManager === 'undefined') {
    Laurus.Frame2Text.WindowPosition = 'Bottom'
    Laurus.Frame2Text.Background = 'Window'
    Laurus.Frame2Text.FileFolder = 'test'
    Laurus.Frame2Text.FileName = 'basic.txt'
    Laurus.Frame2Text.CommonEventID = '1'
    Laurus.Frame2Text.MapID = '1'
    Laurus.Frame2Text.EventID = '1'
    Laurus.Frame2Text.PageID = '1'
    Laurus.Frame2Text.CommentOutChar = '%'
    Laurus.Frame2Text.IsDebug = true
    Laurus.Frame2Text.DisplayMsg = true
    Laurus.Frame2Text.DisplayWarning = true
    Laurus.Frame2Text.EnglishTag = true
  } else {
    // for default plugin command
    Laurus.Frame2Text.Parameters = PluginManager.parameters('Frame2Text')
    Laurus.Frame2Text.WindowPosition = String(Laurus.Frame2Text.Parameters['Default Window Position'])
    Laurus.Frame2Text.Background = String(Laurus.Frame2Text.Parameters['Default Background'])
    Laurus.Frame2Text.FileFolder = String(Laurus.Frame2Text.Parameters['Default Scenario Folder'])
    Laurus.Frame2Text.FileName = String(Laurus.Frame2Text.Parameters['Default Scenario File'])
    Laurus.Frame2Text.CommonEventID = String(Laurus.Frame2Text.Parameters['Default Common Event ID'])
    Laurus.Frame2Text.MapID = String(Laurus.Frame2Text.Parameters['Default MapID'])
    Laurus.Frame2Text.EventID = String(Laurus.Frame2Text.Parameters['Default EventID'])
    Laurus.Frame2Text.PageID = String(Laurus.Frame2Text.Parameters['Default PageID'])
    Laurus.Frame2Text.CommentOutChar = String(Laurus.Frame2Text.Parameters['Comment Out Char'])
    Laurus.Frame2Text.IsDebug = String(Laurus.Frame2Text.Parameters.IsDebug) === 'true'
    Laurus.Frame2Text.DisplayMsg = String(Laurus.Frame2Text.Parameters.DisplayMsg) === 'true'
    Laurus.Frame2Text.DisplayWarning = String(Laurus.Frame2Text.Parameters.DisplayWarning) === 'true'
    Laurus.Frame2Text.EnglishTag = String(Laurus.Frame2Text.Parameters.EnglishTag) === 'true'
    Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`
    Laurus.Frame2Text.MapPath = `${BASE_PATH}${path.sep}data${path.sep}Map${('000' + Laurus.Frame2Text.MapID).slice(
      -3
    )}.json`
    Laurus.Frame2Text.CommonEventPath = `${BASE_PATH}${path.sep}data${path.sep}CommonEvents.json`
  }

  const addMessage = function (text) {
    if (Laurus.Frame2Text.DisplayMsg) {
      $gameMessage.add(text)
    }
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
          Laurus.Frame2Text.MapPath = `${BASE_PATH}${path.sep}data${path.sep}Map${(
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
        addMessage(args[0])
        addMessage(args[1])
        addMessage(args[2])
        addMessage(args.length)
        if (args.length === 3) {
          Laurus.Frame2Text.ExecMode = 'EXPORT_CE_TO_MESSAGE'
          Laurus.Frame2Text.FileFolder = args[0]
          Laurus.Frame2Text.FileName = args[1]
          Laurus.Frame2Text.CommonEventID = args[2]
          Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`
          Laurus.Frame2Text.CommonEventPath = `${BASE_PATH}${path.sep}data${path.sep}CommonEvents.json`
        }
        addMessage('=====> Common EventID :' + Laurus.Frame2Text.CommonEventID)
        break
      case 'COMMAND_LINE':
        Laurus.Frame2Text.ExecMode = args[0]
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
        fs.writeFileSync(filepath, textData, { encoding: 'utf8' })
      } catch (e) {
        throw new Error(
          'Save failed. / 保存に失敗しました。\n' + 'ファイルが開いていないか確認してください。\n' + filepath
        )
      }
    }

    let map_events
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
    const space = ' '
    const baseIndent = 4
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
      else return Number(operandValue)
    }
    const getCheckBoxValue = (checkBoxValue) => {
      if (checkBoxValue === 0) return EnglishTag ? 'false' : 'OFF'
      else if (checkBoxValue === 1) return EnglishTag ? 'true' : 'ON'
      else if (checkBoxValue === false) return EnglishTag ? 'false' : 'OFF'
      else if (checkBoxValue === true) return EnglishTag ? 'true' : 'ON'
      else return EnglishTag ? 'false' : 'OFF'
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
      else if (operationType === 1) return EnglishTag ? 'Forgot' : '忘れる'
      else return EnglishTag ? 'Learn' : '覚える'
    }
    const getDirectOrVariablesValue = (location) => {
      if (location === 0) return EnglishTag ? 'Direct' : '直接指定'
      else if (location === 1) return EnglishTag ? 'Variables' : '変数で指定'
      else if (location === 2) return EnglishTag ? 'Exchange' : '交換'
      else return EnglishTag ? 'Direct' : '直接指定'
    }
    const getDirectOrVariablesOrRandomValue = (location) => {
      if (location === 0) return EnglishTag ? 'Direct' : '直接指定'
      else if (location === 1) return EnglishTag ? 'Variables' : '変数で指定'
      else if (location === 2) return EnglishTag ? 'Random' : 'ランダム'
      else return EnglishTag ? 'Direct' : '直接指定'
    }
    const getDirectOrVariablesOrCharacterValue = (location) => {
      if (location === 0) return EnglishTag ? 'Direct' : '直接指定'
      else if (location === 1) return EnglishTag ? 'Variables' : '変数の指定'
      else if (location === 2) return EnglishTag ? 'Character' : 'キャラクターで指定'
      else return EnglishTag ? 'Direct' : '直接指定'
    }
    const getItemOrWeaponOrArmorValue = (location) => {
      if (location === 0) return EnglishTag ? 'Item' : 'アイテム'
      else if (location === 1) return EnglishTag ? 'Weapon' : '武器'
      else if (location === 2) return EnglishTag ? 'Armor' : '防具'
      else return EnglishTag ? 'Item' : 'アイテム'
    }
    const getStandardOrSpecifyValue = (location) => {
      if (location === 0) return EnglishTag ? 'Standard' : '標準'
      else if (location === 1) return EnglishTag ? 'Specify' : '指定'
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
    const getSpeedValue = (speed) => {
      if (speed === 1) return EnglishTag ? 'x8slower' : '1/8倍速'
      else if (speed === 2) return EnglishTag ? 'x4slower' : '1/4倍速'
      else if (speed === 3) return EnglishTag ? 'x2slower' : '1/2倍速'
      else if (speed === 4) return EnglishTag ? 'Normal' : '標準速'
      else if (speed === 5) return EnglishTag ? 'x2faster' : '2倍速'
      else if (speed === 6) return EnglishTag ? 'x4faster' : '4倍速'
      else return EnglishTag ? 'x8slower' : '1/8倍速'
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
      else if (balloonIcon === 3) return EnglishTag ? 'Musicnote' : '音符'
      else if (balloonIcon === 4) return EnglishTag ? 'Heart' : 'ハート'
      else if (balloonIcon === 5) return EnglishTag ? 'Anger' : '怒り'
      else if (balloonIcon === 6) return EnglishTag ? 'Sweat' : '汗'
      else if (balloonIcon === 7) return EnglishTag ? 'Flustration' : 'くしゃくしゃ'
      else if (balloonIcon === 8) return EnglishTag ? 'Silence' : '沈黙'
      else if (balloonIcon === 9) return EnglishTag ? 'Lightbulb' : '電球'
      else if (balloonIcon === 10) return EnglishTag ? 'zzz' : 'zzz'
      else if (balloonIcon === 11) return EnglishTag ? 'Userdefined1' : 'ユーザー定義1'
      else if (balloonIcon === 12) return EnglishTag ? 'Userdefined2' : 'ユーザー定義2'
      else if (balloonIcon === 13) return EnglishTag ? 'Userdefined3' : 'ユーザー定義3'
      else if (balloonIcon === 14) return EnglishTag ? 'Userdefined4' : 'ユーザー定義4'
      else if (balloonIcon === 15) return EnglishTag ? 'Userdefined5' : 'ユーザー定義5'
      else return EnglishTag ? 'Exclamation' : 'びっくり'
    }
    const getPositionValue = (position, direct, x, y) => {
      const positionUpperLeft = EnglishTag ? 'Upper Left' : '左上'
      const positionCenter = EnglishTag ? 'Center' : '中央'
      const variablesString = EnglishTag ? 'Variables' : '変数'
      const positionString = position === 0 ? positionUpperLeft : positionCenter
      if (position === 0 && x === 0 && y === 0) return ''
      else if (direct === 0) return `Position[${positionString}][${x}][${y}]`
      else if (direct === 1) return `Position[${positionString}][${variablesString}[${x}]][${variablesString}[${y}]]`
    }
    const getScaleValue = (width, Height) => {
      const scaleStr = EnglishTag ? 'Scale' : '拡大率'
      if (width === 100 && Height === 100) return ''
      else return `${scaleStr}[${width}][${Height}]`
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
      if (opcity === 255 && blendMode === 0) return ''
      else return `${blendStr}[${opcity}][${blendModeValue}]`
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
      else if (easing === 3) { return EnglishTag ? `${easingStr}[Slow start and end]` : `${easingStr}[ゆっくり始まってゆっくり終わる]` } else return EnglishTag ? `${easingStr}[Constant speed]` : `${easingStr}[一定速度]`
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
      if (infoType === 0) return EnglishTag ? 'Terraintag' : '地形タグ'
      else if (infoType === 1) return EnglishTag ? 'EventId' : 'イベントid'
      else if (infoType === 2) return EnglishTag ? 'Layer1' : 'レイヤー1'
      else if (infoType === 3) return EnglishTag ? 'Layer2' : 'レイヤー2'
      else if (infoType === 4) return EnglishTag ? 'Layer3' : 'レイヤー3'
      else if (infoType === 5) return EnglishTag ? 'Layer4' : 'レイヤー4'
      else if (infoType === 6) return EnglishTag ? 'RegionId' : 'リージョンid'
      else return EnglishTag ? 'Terraintag' : '地形タグ'
    }
    const getActionTarget = (target) => {
      if (target === -2) return EnglishTag ? 'LastTarget' : 'ラストターゲット'
      else if (target === -1) return EnglishTag ? 'Random' : 'ランダム'
      else if (target === 0) return EnglishTag ? 'Index1' : 'インデックス1'
      else if (target === 1) return EnglishTag ? 'Index2' : 'インデックス2'
      else if (target === 2) return EnglishTag ? 'Index3' : 'インデックス3'
      else if (target === 3) return EnglishTag ? 'Index4' : 'インデックス4'
      else if (target === 4) return EnglishTag ? 'Index5' : 'インデックス5'
      else if (target === 5) return EnglishTag ? 'Index6' : 'インデックス6'
      else if (target === 6) return EnglishTag ? 'Index7' : 'インデックス7'
      else if (target === 7) return EnglishTag ? 'Index8' : 'インデックス8'
      else return EnglishTag ? 'LastTarget' : 'ラストターゲット'
    }
    const getTimerValue = (timer) => {
      if (timer === 0) return EnglishTag ? 'Start' : '始動'
      else if (timer === 1) return EnglishTag ? 'Stop' : '停止'
      else return EnglishTag ? 'Start' : '始動'
    }
    const getIndent = (indentValue) => {
      // 一旦indent無し
      // const indent = space.repeat(indentValue * baseIndent)
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
      else return EnglishTag ? 'MapX' : 'マップX'
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
      if (enemy === -1) return EnglishTag ? 'EntireTroop' : '敵グループ全体'
      else return Number(enemy) + 1
    }
    const getNone = (name) => {
      if (name === '') return EnglishTag ? 'None' : 'なし'
      else return name
    }

    // 出力するテキスト変数
    let text = ''
    // Laurus.Frame2Text.EnglishTagの値を別変数に代入
    const EnglishTag = Laurus.Frame2Text.EnglishTag
    // イベントコード毎にループ
    map_events.forEach(function (event) {
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
        // テキストはindentを入れない
        text += newLine + showText
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
          itemType = 'Regular Item'
        } else if (itemTypeValue === 2) {
          itemType = 'Key Item'
        } else if (itemTypeValue === 3) {
          itemType = 'Hidden Item A'
        } else if (itemTypeValue === 4) {
          itemType = 'Hidden Item B'
        } else {
          itemType = 'Key Item'
        }
        const tag = EnglishTag ? '<SelectItem: ' : '<アイテム選択の処理: '
        addNewLineIndent(indent)
        text += tag + variableId + ', ' + itemType + '>'
      }
      if (event.code === 105) {
        const speed = event.parameters[0] + comma
        const noFastForward = getCheckBoxValue(event.parameters[1])
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
            const gameDataParam2Value = getEventValue(param6)
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
          text += tag + operation + comma + minutes + comma + seconds + '>'
        } else {
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
          const button = param2
          if (param3) {
            // MZ
            let buttonState
            if (param3 === 0) buttonState = EnglishTag ? 'is being pressed' : 'が押されている'
            else if (param3 === 1) buttonState = EnglishTag ? 'is being triggered' : 'がトリガーされている'
            else if (param3 === 2) buttonState = EnglishTag ? 'is being repeated' : 'がリピートされている'
            else buttonState = EnglishTag ? 'is being pressed' : 'が押されている'
            text += tag + buttonStr + button + comma + buttonState + '>'
          } else {
            // MV
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
        text += indent + tag + operation + operandValue + '>' + newLine
      }
      if (event.code === 126) {
        const itemId = event.parameters[0] + comma
        const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
        const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3])
        const tag = EnglishTag ? '<ChangeItems: ' : '<アイテムの増減: '
        text += indent + tag + itemId + operation + operandValue + '>' + newLine
      }
      if (event.code === 127) {
        const weaponId = event.parameters[0] + comma
        const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
        const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma
        const includeEquipmentFlg = getCheckBoxValue(event.parameters[4])
        const tag = EnglishTag ? '<ChangeWeapons: ' : '<武器の増減: '
        text += indent + tag + weaponId + operation + operandValue + includeEquipmentFlg + '>' + newLine
      }
      if (event.code === 128) {
        const armorId = event.parameters[0] + comma
        const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
        const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma
        const includeEquipmentFlg = getCheckBoxValue(event.parameters[4])
        const tag = EnglishTag ? '<ChangeArmors: ' : '<防具の増減: '
        text += indent + tag + armorId + operation + operandValue + includeEquipmentFlg + '>' + newLine
      }
      if (event.code === 129) {
        const actorId = event.parameters[0] + comma
        const operation = getAddOrRemove(event.parameters[1]) + comma
        const initialize = getCheckBoxValue(event.parameters[2])
        const tag = EnglishTag ? '<ChangePartyMember: ' : '<メンバーの入れ替え: '
        text += indent + tag + actorId + operation + initialize + '>' + newLine
      }

      /** ********************************************** */
      // アクター
      /** ********************************************** */
      if (event.code === 311) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
        const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma
        const allowDeathFlg = getCheckBoxValue(event.parameters[5])
        const tag = EnglishTag ? '<ChangeHp: ' : '<HPの増減: '
        text += indent + tag + actorValue + operation + operandValue + allowDeathFlg + '>' + newLine
      }
      if (event.code === 312) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
        const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma
        const tag = EnglishTag ? '<ChangeMp: ' : '<MPの増減: '
        text += indent + tag + actorValue + operation + operandValue + '>' + newLine
      }
      if (event.code === 326) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
        const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma
        const tag = EnglishTag ? '<ChangeTp: ' : '<TPの増減: '
        text += indent + tag + actorValue + operation + operandValue + '>' + newLine
      }
      if (event.code === 313) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
        const operation = getAddOrRemove(event.parameters[2]) + comma
        const stateId = event.parameters[3]
        const tag = EnglishTag ? '<ChangeState: ' : '<ステートの変更: '
        text += indent + tag + actorValue + operation + stateId + '>' + newLine
      }
      if (event.code === 314) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1])
        const tag = EnglishTag ? '<RecoverAll: ' : '<全回復: '
        text += indent + tag + actorValue + '>' + newLine
      }
      if (event.code === 315) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
        const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma
        const showLevelUpFlg = getCheckBoxValue(event.parameters[5])
        const tag = EnglishTag ? '<ChangeExp: ' : '<経験値の増減: '
        text += indent + tag + actorValue + operation + operandValue + showLevelUpFlg + '>' + newLine
      }
      if (event.code === 316) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[2]) + comma
        const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma
        const showLevelUpFlg = getCheckBoxValue(event.parameters[5])
        const tag = EnglishTag ? '<ChangeLevel: ' : '<レベルの増減: '
        text += indent + tag + actorValue + operation + operandValue + showLevelUpFlg + '>' + newLine
      }
      if (event.code === 317) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
        const parameter = getActorParameterValue(event.parameters[2]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[3]) + comma
        const operandValue = getConstantOrVariable(event.parameters[4], event.parameters[5])
        const tag = EnglishTag ? '<ChangeParameter: ' : '<能力値の増減: '
        text += indent + tag + actorValue + parameter + operation + operandValue + '>' + newLine
      }
      if (event.code === 318) {
        const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma
        const operation = getLearnOrForgot(event.parameters[2]) + comma
        const skillId = event.parameters[3]
        const tag = EnglishTag ? '<ChangeSkill: ' : '<スキルの増減: '
        text += indent + tag + actorValue + operation + skillId + '>' + newLine
      }
      if (event.code === 319) {
        const actorId = event.parameters[0] + comma
        const equipmentTypeId = event.parameters[1] + comma
        const equipmentItemId = event.parameters[2]
        const tag = EnglishTag ? '<ChangeEquipment: ' : '<装備の変更: '
        text += indent + tag + actorId + equipmentTypeId + equipmentItemId + '>' + newLine
      }
      if (event.code === 320) {
        const actorId = event.parameters[0] + comma
        const name = event.parameters[1]
        const tag = EnglishTag ? '<ChangeName: ' : '<名前の変更: '
        text += indent + tag + actorId + name + '>' + newLine
      }
      if (event.code === 321) {
        const actorId = event.parameters[0] + comma
        const classId = event.parameters[1] + comma
        const saveExpFlg = getCheckBoxValue(event.parameters[2])
        const tag = EnglishTag ? '<ChangeClass: ' : '<職業の変更: '
        text += indent + tag + actorId + classId + saveExpFlg + '>' + newLine
      }
      if (event.code === 324) {
        const actorId = event.parameters[0] + comma
        const nickname = event.parameters[1]
        const tag = EnglishTag ? '<ChangeNickname: ' : '<二つ名の変更: '
        text += indent + tag + actorId + nickname + '>' + newLine
      }
      if (event.code === 325) {
        const actorId = event.parameters[0] + comma
        const profile = event.parameters[1]
        const replaceProfile = profile.replace('\n', '\\n')
        const tag = EnglishTag ? '<ChangeProfile: ' : '<プロフィールの変更: '
        text += indent + tag + actorId + replaceProfile + '>' + newLine
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
        const tmpWaitForCompletion = getCheckBoxValue(event.parameters[3])
        const waitForCompletion = tmpWaitForCompletion === undefined ? '' : tmpWaitForCompletion
        const tag = EnglishTag ? '<ScrollMap: ' : '<マップのスクロール: '
        addNewLineIndent(indent)
        text += tag + direction + distance + speed + waitForCompletion + '>'
      }
      // 移動ルートの設定
      if (event.code === 205) {
        const target = getEventValue(event.parameters[0]) + comma
        const repeat = getCheckBoxValue(event.parameters[1].repeat) + comma
        const skippable = getCheckBoxValue(event.parameters[1].skippable) + comma
        const wait = getCheckBoxValue(event.parameters[1].wait)
        const tag = EnglishTag ? '<SetMovementRoute: ' : '<移動ルートの設定: '
        addNewLineIndent(indent)
        text += tag + target + repeat + skippable + wait + '>'
      }
      // 移動ルートの設定(移動コマンド)
      if (event.code === 505) {
        const movement = event.parameters[0]
        const correctMoveIndent = event.indent + 1
        const moveIndent = space.repeat(correctMoveIndent * baseIndent)

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
          const image = movement.parameters[0] + comma
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
        text += indent + tag + newLine
      }

      /** ********************************************** */
      // キャラクター
      /** ********************************************** */
      if (event.code === 211) {
        const transparencyValue = event.parameters[0]
        const transparency = getOnOffRadioButtonValue(transparencyValue)
        const tag = EnglishTag ? '<ChangeTransparency: ' : '<透明状態の変更: '
        text += indent + tag + transparency + '>' + newLine
      }
      if (event.code === 216) {
        const playerFollowersValue = event.parameters[0]
        const playerFollowers = getOnOffRadioButtonValue(playerFollowersValue)
        const tag = EnglishTag ? '<ChangePlayerFollowers: ' : '<隊列歩行の変更: '
        text += indent + tag + playerFollowers + '>' + newLine
      }
      if (event.code === 217) {
        const tag = EnglishTag ? '<GatherFollowers>' : '<隊列メンバーの集合>'
        text += indent + tag + newLine
      }
      if (event.code === 212) {
        const character = getEventValue(event.parameters[0]) + comma
        const animationId = event.parameters[1] + comma
        const waitForCompletion = getCheckBoxValue(event.parameters[2])
        const tag = EnglishTag ? '<ShowAnimation: ' : '<アニメーションの表示: '
        text += indent + tag + character + animationId + waitForCompletion + '>' + newLine
      }
      if (event.code === 213) {
        const character = getEventValue(event.parameters[0]) + comma
        const balloonIcon = getBalloonIconValue(event.parameters[1]) + comma
        const waitForCompletion = getCheckBoxValue(event.parameters[2])
        const tag = EnglishTag ? '<ShowBalloonIcon: ' : '<フキダシアイコンの表示: '
        text += indent + tag + character + balloonIcon + waitForCompletion + '>' + newLine
      }
      if (event.code === 214) {
        const tag = EnglishTag ? '<EraseEvent>' : '<イベントの一時消去>'
        text += indent + tag + newLine
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
        text += indent + tag + duration + colorTone + '>' + newLine
      }
      if (event.code === 224) {
        const red = event.parameters[0][0] + comma
        const green = event.parameters[0][1] + comma
        const blue = event.parameters[0][2] + comma
        const gray = event.parameters[0][3] + comma
        const duration = event.parameters[1] + comma
        const waitForCompletion = getCheckBoxValue(event.parameters[2])
        const tag = EnglishTag ? '<FlashScreen: ' : '<画面のフラッシュ: '
        text += indent + tag + red + green + blue + gray + duration + waitForCompletion + '>' + newLine
      }
      if (event.code === 225) {
        const power = event.parameters[0] + comma
        const speed = event.parameters[1] + comma
        const duration = event.parameters[2] + comma
        const waitForCompletion = getCheckBoxValue(event.parameters[3])
        const tag = EnglishTag ? '<ShakeScreen: ' : '<画面のシェイク: '
        text += indent + tag + power + speed + duration + waitForCompletion + '>' + newLine
      }
      if (event.code === 236) {
        const type = getWeatherTypeValue(event.parameters[0]) + comma
        const power = event.parameters[1] + comma
        const duration = event.parameters[2] + comma
        const waitForCompletion = getCheckBoxValue(event.parameters[3])
        const tag = EnglishTag ? '<SetWeatherEffect: ' : '<天候の設定: '
        text += indent + tag + type + power + duration + waitForCompletion + '>' + newLine
      }

      /** ********************************************** */
      // ピクチャ
      /** ********************************************** */
      if (event.code === 231) {
        const pictureNumber = event.parameters[0] + comma
        const image = event.parameters[1] + comma
        const tmpPosition = getPositionValue(
          event.parameters[2],
          event.parameters[3],
          event.parameters[4],
          event.parameters[5]
        )
        const position = tmpPosition === '' ? '' : tmpPosition + comma
        const tmpScale = getScaleValue(event.parameters[6], event.parameters[7])
        const scale = tmpScale === '' ? '' : tmpScale + comma
        const tmpBlend = getBlendValue(event.parameters[8], event.parameters[9])
        const blend = tmpBlend === '' ? '' : tmpBlend
        const tag = EnglishTag ? '<ShowPicture: ' : '<ピクチャの表示: '
        text += indent + tag + pictureNumber + image + position + scale + blend + '>' + newLine
      }
      if (event.code === 232) {
        const pictureNumber = event.parameters[0]
        const tmpPosition = getPositionValue(
          event.parameters[2],
          event.parameters[3],
          event.parameters[4],
          event.parameters[5]
        )
        const position = tmpPosition === '' ? '' : comma + tmpPosition
        const tmpScale = getScaleValue(event.parameters[6], event.parameters[7])
        const scale = tmpScale === '' ? '' : comma + tmpScale
        const tmpBlend = getBlendValue(event.parameters[8], event.parameters[9])
        const blend = tmpBlend === '' ? '' : comma + tmpBlend
        const tmpDuration = getDurationValue(event.parameters[10], event.parameters[11])
        const duration = tmpDuration === '' ? '' : comma + tmpDuration
        const tmpEasing = getEasingValue(event.parameters[12])
        const easing = tmpEasing === '' ? '' : comma + tmpEasing
        const tag = EnglishTag ? '<MovePicture: ' : '<ピクチャの移動: '
        text += indent + tag + pictureNumber + duration + position + scale + blend + easing + '>' + newLine
      }
      if (event.code === 233) {
        const pictureNumber = event.parameters[0] + comma
        const rotationSpeed = event.parameters[1]
        const tag = EnglishTag ? '<RotatePicture: ' : '<ピクチャの回転: '
        text += indent + tag + pictureNumber + rotationSpeed + '>' + newLine
      }
      if (event.code === 234) {
        const pictureNumber = event.parameters[0]
        const tmpColorTone = getColorToneValue(
          event.parameters[1][0],
          event.parameters[1][1],
          event.parameters[1][2],
          event.parameters[1][3]
        )
        const colorTone = tmpColorTone === '' ? '' : comma + tmpColorTone
        const tmpDuration = getDurationValue(event.parameters[2], event.parameters[3])
        const duration = tmpDuration === '' ? '' : comma + tmpDuration
        const tag = EnglishTag ? '<TintPicture: ' : '<ピクチャの色調変更: '
        text += indent + tag + pictureNumber + duration + colorTone + '>' + newLine
      }

      if (event.code === 235) {
        const pictureNumber = event.parameters[0]
        const tag = EnglishTag ? '<ErasePicture: ' : '<ピクチャの消去: '
        text += indent + tag + pictureNumber + '>' + newLine
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
        const movie = event.parameters[0]
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
        const name = event.parameters[0].name + comma
        const volume = event.parameters[0].volume + comma
        const pitch = event.parameters[0].pitch + comma
        const pan = event.parameters[0].pan
        const tag = EnglishTag ? '<ChangeVictoryMe: ' : '<勝利MEの変更: '
        addNewLineIndent(indent)
        text += tag + name + volume + pitch + pan + '>'
      }
      if (event.code === 139) {
        const name = event.parameters[0].name + comma
        const volume = event.parameters[0].volume + comma
        const pitch = event.parameters[0].pitch + comma
        const pan = event.parameters[0].pan
        const tag = EnglishTag ? '<ChangeDefeatMe: ' : '<敗北MEの変更: '
        addNewLineIndent(indent)
        text += tag + name + volume + pitch + pan + '>'
      }
      if (event.code === 140) {
        const vehicle = getVehicleValue(event.parameters[0]) + comma
        const name = event.parameters[1].name + comma
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
        const face = event.parameters[0] + comma
        const faceId = event.parameters[1] + comma
        const character = event.parameters[2] + comma
        const characterId = event.parameters[3] + comma
        const battler = event.parameters[4] + comma
        const battlerId = event.parameters[5]
        const tag = EnglishTag ? '<ChangeActorImages: ' : '<アクターの画像変更: '
        addNewLineIndent(indent)
        text += tag + face + faceId + character + characterId + battler + battlerId + '>'
      }
      if (event.code === 323) {
        const vehicle = getVehicleValue(event.parameters[0]) + comma
        const image = event.parameters[1] + comma
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
        text += indent + tag + mapNameDisplay + '>' + newLine
      }
      if (event.code === 282) {
        const tilesetId = event.parameters[0]
        const tag = EnglishTag ? '<ChangeTileset: ' : '<タイルセットの変更: '
        text += indent + tag + tilesetId + '>' + newLine
      }
      if (event.code === 283) {
        const battleBackGround1 = event.parameters[0] + comma
        const battleBackGround2 = event.parameters[1]
        const tag = EnglishTag ? '<ChangeBattleBackGround: ' : '<戦闘背景の変更: '
        text += indent + tag + battleBackGround1 + battleBackGround2 + '>' + newLine
      }
      if (event.code === 284) {
        const image = event.parameters[0] + comma
        const loopHorizontaly = event.parameters[1] + comma
        const loopVertically = event.parameters[2] + comma
        const loopHorizontalyScroll = event.parameters[3] + comma
        const loopVerticallyScroll = event.parameters[4]
        const tag = EnglishTag ? '<ChangeParallax: ' : '<遠景の変更: '
        text +=
          indent +
          tag +
          image +
          loopHorizontaly +
          loopVertically +
          loopHorizontalyScroll +
          loopVerticallyScroll +
          '>' +
          newLine
      }
      if (event.code === 285) {
        const variableId = event.parameters[0] + comma
        const infoType = getLocationInfoTypeValue(event.parameters[1]) + comma
        const location = getDirectOrVariablesOrCharacterValue(event.parameters[2]) + comma
        const mapX = event.parameters[3] + comma
        const mapY = event.parameters[4]
        const tag = EnglishTag ? '<ChangeGetLocationInfo: ' : '<指定位置の情報取得: '
        text += indent + tag + variableId + infoType + location + mapX + mapY + '>' + newLine
      }

      /** ********************************************** */
      // シーン制御
      /** ********************************************** */
      if (event.code === 301) {
        const troop = getDirectOrVariablesOrRandomValue(event.parameters[0]) + comma
        const troopValue = event.parameters[1] + comma
        const canEscape = getCheckBoxValue(event.parameters[2]) + comma
        const canLose = getCheckBoxValue(event.parameters[3])
        const tag = EnglishTag ? '<BattleProcessing: ' : '<戦闘の処理: '
        text += indent + tag + troop + troopValue + canEscape + canLose + '>' + newLine
      }
      if (event.code === 601) text += EnglishTag ? '<IfWin>' + newLine : '<勝ったとき>' + newLine
      if (event.code === 602) text += EnglishTag ? '<IfEscape>' + newLine : '<逃げたとき>' + newLine
      if (event.code === 603) text += EnglishTag ? '<IfLose>' + newLine : '<負けたとき>' + newLine
      if (event.code === 604) text += EnglishTag ? '<IfEnd>' + newLine : '<戦闘処理分岐終了>' + newLine
      if (event.code === 302) {
        const merchandise = getItemOrWeaponOrArmorValue(event.parameters[0]) + comma
        const merchandiseId = event.parameters[1] + comma
        const price = getStandardOrSpecifyValue(event.parameters[2]) + comma
        const priceValue = event.parameters[3] + comma
        const purchaseOnly = getCheckBoxValue(event.parameters[4])
        const tag = EnglishTag ? '<ShopProcessing: ' : '<ショップの処理: '
        text += indent + tag + merchandise + merchandiseId + price + priceValue + purchaseOnly + '>' + newLine
      }
      if (event.code === 605) {
        const merchandise = getItemOrWeaponOrArmorValue(event.parameters[0]) + comma
        const merchandiseId = event.parameters[1] + comma
        const price = getStandardOrSpecifyValue(event.parameters[2]) + comma
        const priceValue = event.parameters[3]
        const tag = EnglishTag ? '<ShopProcessingSecondLineOnwards: ' : '<ショップの処理2行目以降: '
        text += indent + tag + merchandise + merchandiseId + price + priceValue + '>' + newLine
      }
      if (event.code === 303) {
        const actorId = event.parameters[0] + comma
        const maxCharacter = event.parameters[1]
        const tag = EnglishTag ? '<NameInputProcessing: ' : '<名前入力の処理: '
        text += indent + tag + actorId + maxCharacter + '>' + newLine
      }
      if (event.code === 351) {
        const tag = EnglishTag ? '<OpenMenuScreen>' : '<メニュー画面を開く>'
        text += indent + tag + newLine
      }
      if (event.code === 352) {
        const tag = EnglishTag ? '<OpenSaveScreen>' : '<セーブ画面を開く>'
        text += indent + tag + newLine
      }
      if (event.code === 353) {
        const tag = EnglishTag ? '<GameOver>' : '<ゲームオーバー>'
        text += indent + tag + newLine
      }
      if (event.code === 354) {
        const tag = EnglishTag ? '<ReturnToTitleScreen>' : '<タイトル画面に戻す>'
        text += indent + tag + newLine
      }

      /** ********************************************** */
      // バトル
      /** ********************************************** */
      if (event.code === 331) {
        const enemy = getEnemyTarget(event.parameters[0]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
        const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma
        const allowDeath = getCheckBoxValue(event.parameters[4])
        const tag = EnglishTag ? '<ChangeEnemyHp: ' : '<敵キャラのHP増減: '
        text += indent + tag + enemy + operation + operandValue + allowDeath + '>' + newLine
      }
      if (event.code === 332) {
        const enemy = getEnemyTarget(event.parameters[0]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
        const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3])
        const tag = EnglishTag ? '<ChangeEnemyMp: ' : '<敵キャラのMP増減: '
        text += indent + tag + enemy + operation + operandValue + '>' + newLine
      }
      if (event.code === 342) {
        const enemy = getEnemyTarget(event.parameters[0]) + comma
        const operation = getIncreaseOrDecrease(event.parameters[1]) + comma
        const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3])
        const tag = EnglishTag ? '<ChangeEnemyTp: ' : '<敵キャラのTP増減: '
        text += indent + tag + enemy + operation + operandValue + '>' + newLine
      }
      if (event.code === 333) {
        const enemy = getEnemyTarget(event.parameters[0]) + comma
        const operation = getAddOrRemove(event.parameters[1]) + comma
        const stateId = event.parameters[2]
        const tag = EnglishTag ? '<ChangeEnemyState: ' : '<敵キャラのステート変更: '
        text += indent + tag + enemy + operation + stateId + '>' + newLine
      }
      if (event.code === 334) {
        const enemy = getEnemyTarget(event.parameters[0])
        const tag = EnglishTag ? '<EnemyRecoverAll: ' : '<敵キャラの全回復: '
        text += indent + tag + enemy + '>' + newLine
      }
      if (event.code === 335) {
        const enemy = getEnemyTarget(event.parameters[0])
        const tag = EnglishTag ? '<EnemyAppear: ' : '<敵キャラの出現: '
        text += indent + tag + enemy + '>' + newLine
      }
      if (event.code === 336) {
        const enemy = getEnemyTarget(event.parameters[0]) + comma
        const enemyId = event.parameters[1]
        const tag = EnglishTag ? '<EnemyTransform: ' : '<敵キャラの変身: '
        text += indent + tag + enemy + enemyId + '>' + newLine
      }
      if (event.code === 337) {
        const enemy = getEnemyTarget(event.parameters[0]) + comma
        const animationId = event.parameters[1] + comma
        const tag = EnglishTag ? '<ShowBattleAnimation: ' : '<戦闘アニメーションの表示: '
        if (event.parameters[2] === undefined) {
          // MZ
          text += indent + tag + enemy + animationId + 'MZ' + '>' + newLine
        } else {
          // MV
          text += indent + tag + enemy + animationId + 'MV' + '>' + newLine
        }
      }
      if (event.code === 339) {
        const subjectValue = getEnemyOrActor(event.parameters[0], event.parameters[1]) + comma
        const skillId = event.parameters[2] + comma
        const target = getActionTarget(event.parameters[3])
        const tag = EnglishTag ? '<ForceAction: ' : '<戦闘行動の強制: '
        text += indent + tag + subjectValue + skillId + target + '>' + newLine
      }
      if (event.code === 340) {
        const tag = EnglishTag ? '<AbortBattle>' : '<バトルの中断>'
        text += indent + tag + newLine
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
    })

    /** ********************************************** */
    // txtファイルを出力
    /** ********************************************** */
    writeData(Laurus.Frame2Text.TextPath, text)

    /** ********************************************** */
    // 出力メッセージ
    /** ********************************************** */
    const EnglishMessage = `Exported to ${Laurus.Frame2Text.FileName}`
    const JapaneseMessage = `${Laurus.Frame2Text.FileName}にエクスポートしました`
    addMessage(EnglishMessage + '\n' + JapaneseMessage)
    console.log(EnglishMessage + '\n' + JapaneseMessage)
  }
})()

// developer mode
if (typeof require.main !== 'undefined' && require.main === module) {
  const program = require('commander')
  program
    .version('0.0.1')
    .usage('[options]')
    .option('-m, --mode <map|common|test>', 'output mode', /^(map|common|test)$/i)
    .option('-i, --input_path <name>', 'input map data path')
    .option('-o, --output_path <name>', 'output file path')
    .option('-e, --event_id <name>', 'event file id')
    .option('-p, --page_id <name>', 'page id', '1')
    .option('-c, --common_event_id <name>', 'common event id')
    .option('-v, --verbose', 'debug mode', false)
    .option('-w, --english_tag <true/false>', 'english tag', 'true')
    .parse()
    // .option('-w, --overwrite <true/false>', 'overwrite mode', 'false')

  const options = program.opts()

  Laurus.Frame2Text.IsDebug = options.verbose
  Laurus.Frame2Text.MapID = options.map_id
  Laurus.Frame2Text.EventID = options.event_id
  Laurus.Frame2Text.PageID = options.page_id
  Laurus.Frame2Text.TextPath = options.output_path
  Laurus.Frame2Text.FileName = options.output_path
  Laurus.Frame2Text.MapPath = options.input_path
  Laurus.Frame2Text.CommonEventPath = options.input_path
  Laurus.Frame2Text.CommonEventID = options.common_event_id
  // Laurus.Frame2Text.IsOverwrite = (options.overwrite === 'true')

  if (options.mode === 'map') {
    Game_Interpreter.prototype.pluginCommandFrame2Text('COMMAND_LINE', ['EXPORT_EVENT_TO_MESSAGE'])
  } else if (options.mode === 'common') {
    Game_Interpreter.prototype.pluginCommandFrame2Text('COMMAND_LINE', ['EXPORT_CE_TO_MESSAGE'])
  } else if (options.mode === 'test') {
    const folder_name = 'test'
    const file_name = 'frame2text.txt'
    const map_id = '1'
    const event_id = '1'
    const page_id = '1'
    // const overwrite = 'true'
    Game_Interpreter.prototype.pluginCommandFrame2Text('EXPORT_EVENT_TO_MESSAGE', [
      folder_name,
      file_name,
      map_id,
      event_id,
      page_id
    ])
  } else {
    console.log('===== Manual =====')
    console.log(`
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
    `)
  }
}
