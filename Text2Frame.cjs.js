"use strict";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function getAugmentedNamespace(n) {
  if (n.__esModule)
    return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else
    a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
function commonjsRequire(path) {
  throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var Text2Frame$1 = { exports: {} };
const __viteBrowserExternal = {};
const __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: __viteBrowserExternal
}, Symbol.toStringTag, { value: "Module" }));
const require$$1 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
(function(module2) {
  (function() {
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
      PluginManager.registerCommand("Text2Frame", "IMPORT_MESSAGE_TO_EVENT", function(args) {
        const file_folder = args.FileFolder;
        const file_name = args.FileName;
        const map_id = args.MapID;
        const event_id = args.EventID;
        const page_id = args.PageID;
        const is_overwrite = args.IsOverwrite;
        this.pluginCommand(
          "IMPORT_MESSAGE_TO_EVENT",
          [file_folder, file_name, map_id, event_id, page_id, is_overwrite]
        );
      });
      PluginManager.registerCommand("Text2Frame", "IMPORT_MESSAGE_TO_CE", function(args) {
        const file_folder = args.FileFolder;
        const file_name = args.FileName;
        const common_event_id = args.CommonEventID;
        const is_overwrite = args.IsOverwrite;
        this.pluginCommand(
          "IMPORT_MESSAGE_TO_CE",
          [file_folder, file_name, common_event_id, is_overwrite]
        );
      });
    }
    var Laurus = typeof Laurus !== "undefined" ? Laurus : {};
    Laurus.Text2Frame = {};
    if (typeof PluginManager === "undefined") {
      Laurus.Text2Frame.WindowPosition = "Bottom";
      Laurus.Text2Frame.Background = "Window";
      Laurus.Text2Frame.FileFolder = "test";
      Laurus.Text2Frame.FileName = "basic.txt";
      Laurus.Text2Frame.CommonEventID = "1";
      Laurus.Text2Frame.MapID = "1";
      Laurus.Text2Frame.EventID = "1";
      Laurus.Text2Frame.PageID = "1";
      Laurus.Text2Frame.IsOverwrite = true;
      Laurus.Text2Frame.CommentOutChar = "%";
      Laurus.Text2Frame.IsDebug = false;
      Laurus.Text2Frame.DisplayMsg = true;
      Laurus.Text2Frame.DisplayWarning = true;
      Laurus.Text2Frame.TextPath = "dummy";
      Laurus.Text2Frame.MapPath = "dummy";
      Laurus.Text2Frame.CommonEventPath = "dummy";
      globalThis.Game_Interpreter = {};
      Game_Interpreter.prototype = {};
      globalThis.$gameMessage = {};
      $gameMessage.add = function() {
      };
    } else {
      Laurus.Text2Frame.Parameters = PluginManager.parameters("Text2Frame");
      Laurus.Text2Frame.WindowPosition = String(Laurus.Text2Frame.Parameters["Default Window Position"]);
      Laurus.Text2Frame.Background = String(Laurus.Text2Frame.Parameters["Default Background"]);
      Laurus.Text2Frame.FileFolder = String(Laurus.Text2Frame.Parameters["Default Scenario Folder"]);
      Laurus.Text2Frame.FileName = String(Laurus.Text2Frame.Parameters["Default Scenario File"]);
      Laurus.Text2Frame.CommonEventID = String(Laurus.Text2Frame.Parameters["Default Common Event ID"]);
      Laurus.Text2Frame.MapID = String(Laurus.Text2Frame.Parameters["Default MapID"]);
      Laurus.Text2Frame.EventID = String(Laurus.Text2Frame.Parameters["Default EventID"]);
      Laurus.Text2Frame.PageID = String(Laurus.Text2Frame.Parameters["Default PageID"]);
      Laurus.Text2Frame.IsOverwrite = String(Laurus.Text2Frame.Parameters.IsOverwrite) === "true";
      Laurus.Text2Frame.CommentOutChar = String(Laurus.Text2Frame.Parameters["Comment Out Char"]);
      Laurus.Text2Frame.IsDebug = String(Laurus.Text2Frame.Parameters.IsDebug) === "true";
      Laurus.Text2Frame.DisplayMsg = String(Laurus.Text2Frame.Parameters.DisplayMsg) === "true";
      Laurus.Text2Frame.DisplayWarning = String(Laurus.Text2Frame.Parameters.DisplayWarning) === "true";
      let PATH_SEP = "/";
      let BASE_PATH = ".";
      if (typeof commonjsRequire !== "undefined") {
        const path = require$$1;
        PATH_SEP = path.sep;
        BASE_PATH = path.dirname(process.mainModule.filename);
      }
      Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
      Laurus.Text2Frame.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${("000" + Laurus.Text2Frame.MapID).slice(-3)}.json`;
      Laurus.Text2Frame.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`;
    }
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
      _Game_Interpreter_pluginCommand.apply(this, arguments);
      this.pluginCommandText2Frame(command, args);
    };
    Game_Interpreter.prototype.pluginCommandText2Frame = function(command, args) {
      const addMessage = function(text) {
        if (Laurus.Text2Frame.DisplayMsg) {
          $gameMessage.add(text);
        }
      };
      const addWarning = function(warning) {
        if (Laurus.Text2Frame.DisplayWarning) {
          $gameMessage.add(warning);
        }
      };
      const getDirParams = function() {
        let PATH_SEP = "/";
        let BASE_PATH = ".";
        if (typeof commonjsRequire !== "undefined") {
          const path = require$$1;
          PATH_SEP = path.sep;
          BASE_PATH = path.dirname(process.mainModule.filename);
        }
        return { PATH_SEP, BASE_PATH };
      };
      const getDefaultPage = function() {
        return {
          conditions: {
            actorId: 1,
            actorValid: false,
            itemId: 1,
            itemValid: false,
            selfSwitchCh: "A",
            selfSwitchValid: false,
            switch1Id: 1,
            switch1Valid: false,
            switch2Id: 1,
            switch2Valid: false,
            variableId: 1,
            variableValid: false,
            variableValue: 0
          },
          directionFix: false,
          image: { characterIndex: 0, characterName: "", direction: 2, pattern: 0, tileId: 0 },
          list: [
            { code: 0, indent: 0, parameters: [] }
          ],
          moveFrequency: 3,
          moveRoute: {
            list: [{ code: 0, parameters: [] }],
            repeat: true,
            skippable: false,
            wait: false
          },
          moveSpeed: 3,
          moveType: 0,
          priorityType: 0,
          stepAnime: false,
          through: false,
          trigger: 0,
          walkAnime: true
        };
      };
      Laurus.Text2Frame.ExecMode = command.toUpperCase();
      switch (Laurus.Text2Frame.ExecMode) {
        case "IMPORT_MESSAGE_TO_EVENT":
        case "メッセージをイベントにインポート":
          addMessage("import message to event. \n/ メッセージをイベントにインポートします。");
          if (args[0])
            Laurus.Text2Frame.FileFolder = args[0];
          if (args[1])
            Laurus.Text2Frame.FileName = args[1];
          if (args[2])
            Laurus.Text2Frame.MapID = args[2];
          if (args[3])
            Laurus.Text2Frame.EventID = args[3];
          if (args[4] && (args[4].toLowerCase() === "true" || args[4].toLowerCase() === "false")) {
            Laurus.Text2Frame.IsOverwrite = args[4].toLowerCase() === "true";
            addWarning("【警告】5番目の引数に上書き判定を設定することは非推奨に");
            addWarning("なりました。ページIDを設定してください。上書き判定は6番");
            addWarning("目に設定してください。(警告はオプションでOFFにできます)");
          } else if (args[4]) {
            Laurus.Text2Frame.PageID = args[4];
          }
          if (args[5] && args[5].toLowerCase() === "true")
            Laurus.Text2Frame.IsOverwrite = true;
          if (args[0] || args[1]) {
            const { PATH_SEP, BASE_PATH } = getDirParams();
            Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
            Laurus.Text2Frame.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${("000" + Laurus.Text2Frame.MapID).slice(-3)}.json`;
          }
          break;
        case "IMPORT_MESSAGE_TO_CE":
        case "メッセージをコモンイベントにインポート":
          if (args.length === 4) {
            addMessage("import message to common event. \n/ メッセージをコモンイベントにインポートします。");
            Laurus.Text2Frame.ExecMode = "IMPORT_MESSAGE_TO_CE";
            Laurus.Text2Frame.FileFolder = args[0];
            Laurus.Text2Frame.FileName = args[1];
            Laurus.Text2Frame.CommonEventID = args[2];
            Laurus.Text2Frame.IsOverwrite = args[3] === "true";
            const { PATH_SEP, BASE_PATH } = getDirParams();
            Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
            Laurus.Text2Frame.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`;
          }
          break;
        case "COMMAND_LINE":
          Laurus.Text2Frame = Object.assign(Laurus.Text2Frame, args[0]);
          break;
        case "LIBRARY_EXPORT":
          break;
        default:
          return;
      }
      const logger = {};
      logger.log = function() {
        if (Laurus.Text2Frame.IsDebug) {
          console.debug.apply(console, arguments);
        }
      };
      logger.error = function() {
        console.error(Array.prototype.join.call(arguments));
      };
      const readText = function(filepath) {
        const fs = require$$1;
        try {
          return fs.readFileSync(filepath, { encoding: "utf8" });
        } catch (e) {
          throw new Error("File not found. / ファイルが見つかりません。\n" + filepath);
        }
      };
      const readJsonData = function(filepath) {
        try {
          const jsondata = JSON.parse(readText(filepath));
          if (typeof jsondata === "object") {
            return jsondata;
          } else {
            throw new Error(
              "Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n" + filepath
            );
          }
        } catch (e) {
          throw new Error(
            "Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n" + filepath
          );
        }
      };
      const writeData = function(filepath, jsonData) {
        const fs = require$$1;
        try {
          fs.writeFileSync(filepath, JSON.stringify(jsonData, null, "  "), { encoding: "utf8" });
        } catch (e) {
          throw new Error(
            "Save failed. / 保存に失敗しました。\nファイルが開いていないか確認してください。\n" + filepath
          );
        }
      };
      const uniformNewLineCode = function(text) {
        return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      };
      const eraseCommentOutLines = function(scenario_text2, commentOutChar) {
        const re = new RegExp("^ *" + commentOutChar);
        return scenario_text2.split("\n").filter((x) => !x.match(re)).join("\n");
      };
      const getValidNumberOrDefault = function(value, defaultValue = 0) {
        return isNaN(value) || value === "" ? defaultValue : Number(value);
      };
      const getBackground = function(background) {
        switch (background.toUpperCase()) {
          case "WINDOW":
          case "ウインドウ":
            return 0;
          case "DIM":
          case "暗くする":
          case "暗く":
            return 1;
          case "TRANSPARENT":
          case "透明":
            return 2;
          default:
            throw new Error("Syntax error. / 文法エラーです。");
        }
      };
      const getWindowPosition = function(windowPosition) {
        switch (windowPosition.toUpperCase()) {
          case "TOP":
          case "上":
            return 0;
          case "MIDDLE":
          case "中":
            return 1;
          case "BOTTOM":
          case "下":
            return 2;
          default:
            throw new Error("Syntax error. / 文法エラーです。");
        }
      };
      const getChoiceWindowPosition = function(windowPosition) {
        switch (windowPosition.toUpperCase()) {
          case "LEFT":
          case "左":
            return 0;
          case "MIDDLE":
          case "中":
            return 1;
          case "RIGHT":
          case "右":
            return 2;
          default:
            throw new Error("Syntax error. / 文法エラーです。");
        }
      };
      const getPretextEvent = function() {
        return {
          code: 101,
          indent: 0,
          parameters: [
            "",
            0,
            getBackground(Laurus.Text2Frame.Background),
            getWindowPosition(Laurus.Text2Frame.WindowPosition),
            ""
          ]
        };
      };
      const getTextFrameEvent = function(text) {
        return { code: 401, indent: 0, parameters: [text] };
      };
      const getCommandBottomEvent = function() {
        return { code: 0, indent: 0, parameters: [] };
      };
      const getScriptHeadEvent = function(text) {
        const script_head = { code: 355, indent: 0, parameters: [""] };
        script_head.parameters[0] = text;
        return script_head;
      };
      const getScriptBodyEvent = function(text) {
        const script_body = { code: 655, indent: 0, parameters: [""] };
        script_body.parameters[0] = text;
        return script_body;
      };
      const getPluginCommandEvent = function(text) {
        const plugin_command = { code: 356, indent: 0, parameters: [""] };
        plugin_command.parameters[0] = text;
        return plugin_command;
      };
      const getPluginCommandEventMZ = function(plugin_name, plugin_command, disp_plugin_command, args2) {
        const plugin_args = {};
        const plugin_command_mz = {
          code: 357,
          indent: 0,
          parameters: [
            plugin_name,
            plugin_command,
            disp_plugin_command,
            plugin_args
          ]
        };
        const arg_regexp = /([^[\]]+)(\[.*\])/i;
        for (let i = 0; i < args2.length; i++) {
          const matched = args2[i].match(arg_regexp);
          if (matched) {
            const arg_name = matched[1] || "";
            const values = matched[2].slice(1, -1).split("][") || [];
            plugin_args[arg_name] = values[0] || "";
          }
        }
        return plugin_command_mz;
      };
      const getPluginCommandMzParamsComment = function(plugin_command_mz_arg) {
        const arg_regexp = /([^[\]]+)(\[.*\])/i;
        const matched = plugin_command_mz_arg.match(arg_regexp);
        if (matched) {
          let arg_name = matched[1] || "";
          const values = matched[2].slice(1, -1).split("][") || [];
          const value = values[0] || "";
          if (values[1]) {
            arg_name = values[1];
          }
          return { code: 657, indent: 0, parameters: [arg_name + " = " + value] };
        } else {
          throw new Error("Syntax error. / 文法エラーです。" + plugin_command_mz_arg + " はプラグインコマンドMZの引数として不適切です。");
        }
      };
      const getCommonEventEvent = function(num) {
        const common_event = { code: 117, indent: 0, parameters: [""] };
        common_event.parameters[0] = num;
        return common_event;
      };
      const getCommentOutHeadEvent = function(text) {
        const comment_out = { code: 108, indent: 0, parameters: [""] };
        comment_out.parameters[0] = text;
        return comment_out;
      };
      const getCommentOutBodyEvent = function(text) {
        const comment_out = { code: 408, indent: 0, parameters: [""] };
        comment_out.parameters[0] = text;
        return comment_out;
      };
      const getScrollingTextHeadEvent = function(scrolling_speed, enable_auto_scroll) {
        const scrolling_text = { code: 105, indent: 0, parameters: [2, false] };
        if (scrolling_speed) {
          scrolling_text.parameters[0] = scrolling_speed;
        }
        if (enable_auto_scroll) {
          switch (enable_auto_scroll.toLowerCase()) {
            case "on":
            case "オン":
            case "true":
            case "no fast forward":
            case "1": {
              scrolling_text.parameters[1] = true;
              break;
            }
            case "off":
            case "オフ":
            case "false":
            case "0": {
              scrolling_text.parameters[1] = false;
              break;
            }
          }
        }
        return scrolling_text;
      };
      const getScrollingTextBodyEvent = function(text) {
        return { code: 405, indent: 0, parameters: [text] };
      };
      const getWaitEvent = function(num) {
        const wait = { code: 230, indent: 0, parameters: [""] };
        wait.parameters[0] = num;
        return wait;
      };
      const getFadeinEvent = function() {
        return { code: 222, indent: 0, parameters: [] };
      };
      const getFadeoutEvent = function() {
        return { code: 221, indent: 0, parameters: [] };
      };
      const getPlayBgmEvent = function(name, volume, pitch, pan) {
        let param_volume = 90;
        let param_pitch = 100;
        let param_pan = 0;
        if (typeof volume === "number") {
          param_volume = volume;
        }
        if (typeof pitch === "number") {
          param_pitch = pitch;
        }
        if (typeof pan === "number") {
          param_pan = pan;
        }
        return {
          code: 241,
          indent: 0,
          parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
        };
      };
      const getStopBgmEvent = function(volume, pitch, pan) {
        return getPlayBgmEvent("", volume, pitch, pan);
      };
      const getFadeoutBgmEvent = function(duration) {
        let param_duration = 10;
        if (typeof duration === "number") {
          param_duration = duration;
        }
        return { code: 242, indent: 0, parameters: [param_duration] };
      };
      const getSaveBgmEvent = function() {
        return { code: 243, indent: 0, parameters: [] };
      };
      const getReplayBgmEvent = function() {
        return { code: 244, indent: 0, parameters: [] };
      };
      const getChangeBattleBgmEvent = function(name, volume, pitch, pan) {
        let param_volume = 90;
        let param_pitch = 100;
        let param_pan = 0;
        if (typeof volume === "number") {
          param_volume = volume;
        }
        if (typeof pitch === "number") {
          param_pitch = pitch;
        }
        if (typeof pan === "number") {
          param_pan = pan;
        }
        return {
          code: 132,
          indent: 0,
          parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
        };
      };
      const getPlayBgsEvent = function(name, volume, pitch, pan) {
        let param_volume = 90;
        let param_pitch = 100;
        let param_pan = 0;
        if (typeof volume === "number") {
          param_volume = volume;
        }
        if (typeof pitch === "number") {
          param_pitch = pitch;
        }
        if (typeof pan === "number") {
          param_pan = pan;
        }
        return {
          code: 245,
          indent: 0,
          parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
        };
      };
      const getStopBgsEvent = function(volume, pitch, pan) {
        return getPlayBgsEvent("", volume, pitch, pan);
      };
      const getFadeoutBgsEvent = function(duration) {
        let param_duration = 10;
        if (typeof duration === "number") {
          param_duration = duration;
        }
        return { code: 246, indent: 0, parameters: [param_duration] };
      };
      const getPlaySeEvent = function(name, volume, pitch, pan) {
        let param_volume = 90;
        let param_pitch = 100;
        let param_pan = 0;
        if (typeof volume === "number") {
          param_volume = volume;
        }
        if (typeof pitch === "number") {
          param_pitch = pitch;
        }
        if (typeof pan === "number") {
          param_pan = pan;
        }
        return {
          code: 250,
          indent: 0,
          parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
        };
      };
      const getStopSeEvent = function() {
        return { code: 251, indent: 0, parameters: [] };
      };
      const getPlayMeEvent = function(name, volume, pitch, pan) {
        let param_volume = 90;
        let param_pitch = 100;
        let param_pan = 0;
        if (typeof volume === "number") {
          param_volume = volume;
        }
        if (typeof pitch === "number") {
          param_pitch = pitch;
        }
        if (typeof pan === "number") {
          param_pan = pan;
        }
        return {
          code: 249,
          indent: 0,
          parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
        };
      };
      const getStopMeEvent = function(volume, pitch, pan) {
        return getPlayMeEvent("", volume, pitch, pan);
      };
      const getControlSwitch = function(start_pointer, end_pointer, value) {
        switch (value.toLowerCase()) {
          case "on":
          case "オン":
          case "1":
          case "true": {
            return { code: 121, indent: 0, parameters: [parseInt(start_pointer), parseInt(end_pointer), 0] };
          }
          case "off":
          case "オフ":
          case "0":
          case "false": {
            return { code: 121, indent: 0, parameters: [parseInt(start_pointer), parseInt(end_pointer), 1] };
          }
        }
      };
      const getControlValiable = function(operation, start_pointer, end_pointer, operand, operand_arg1 = 0, operand_arg2 = 0, operand_arg3 = 0) {
        const parameters = [start_pointer, end_pointer];
        switch (operation.toLowerCase()) {
          case "set":
            parameters.push(0);
            break;
          case "add":
            parameters.push(1);
            break;
          case "sub":
            parameters.push(2);
            break;
          case "mul":
            parameters.push(3);
            break;
          case "div":
            parameters.push(4);
            break;
          case "mod":
            parameters.push(5);
            break;
          default:
            parameters.push(0);
            break;
        }
        switch (operand.toLowerCase()) {
          case "constant":
            parameters.push(0);
            parameters.push(operand_arg1);
            break;
          case "variables":
            parameters.push(1);
            parameters.push(operand_arg1);
            break;
          case "random":
            parameters.push(2);
            parameters.push(parseInt(operand_arg1));
            parameters.push(parseInt(operand_arg2));
            break;
          case "gamedata": {
            parameters.push(3);
            operand_arg1 = operand_arg1.toLowerCase();
            switch (operand_arg1) {
              case "item":
              case "アイテム":
                parameters.push(0);
                parameters.push(parseInt(operand_arg2));
                parameters.push(0);
                break;
              case "weapon":
              case "武器":
                parameters.push(1);
                parameters.push(parseInt(operand_arg2));
                parameters.push(0);
                break;
              case "armor":
              case "防具":
                parameters.push(2);
                parameters.push(parseInt(operand_arg2));
                parameters.push(0);
                break;
              case "actor":
              case "アクター":
              case "enemy":
              case "敵キャラ":
              case "エネミー": {
                if (operand_arg1 === "actor" || operand_arg1 === "アクター") {
                  parameters.push(3);
                } else {
                  parameters.push(4);
                }
                parameters.push(parseInt(operand_arg2));
                switch (operand_arg3.toLowerCase()) {
                  case "level":
                  case "レベル": {
                    parameters.push(0);
                    break;
                  }
                  case "exp":
                  case "経験値": {
                    parameters.push(1);
                    break;
                  }
                  case "hp": {
                    parameters.push(2);
                    break;
                  }
                  case "mp": {
                    parameters.push(3);
                    break;
                  }
                  case "maxhp":
                  case "最大hp": {
                    parameters.push(4);
                    break;
                  }
                  case "maxmp":
                  case "最大mp": {
                    parameters.push(5);
                    break;
                  }
                  case "attack":
                  case "攻撃力": {
                    parameters.push(6);
                    break;
                  }
                  case "defense":
                  case "防御力": {
                    parameters.push(7);
                    break;
                  }
                  case "m.attack":
                  case "魔法攻撃力": {
                    parameters.push(8);
                    break;
                  }
                  case "m.defense":
                  case "魔法防御力": {
                    parameters.push(9);
                    break;
                  }
                  case "agility":
                  case "敏捷性": {
                    parameters.push(10);
                    break;
                  }
                  case "luck":
                  case "運": {
                    parameters.push(11);
                    break;
                  }
                  default: {
                    parameters.push(0);
                    break;
                  }
                }
                if (operand_arg1 === "enemy" || operand_arg1 === "敵キャラ" || operand_arg1 === "エネミー") {
                  let value = parameters.pop();
                  let key = parameters.pop();
                  value = value - 2;
                  key = key - 1;
                  parameters.push(key);
                  parameters.push(value);
                }
                break;
              }
              case "character":
              case "キャラクター":
                parameters.push(5);
                switch (operand_arg2.toLowerCase()) {
                  case "player":
                  case "プレイヤー":
                  case "-1": {
                    parameters.push(-1);
                    break;
                  }
                  case "thisevent":
                  case "このイベント":
                  case "0": {
                    parameters.push(0);
                    break;
                  }
                  default: {
                    parameters.push(parseInt(operand_arg2));
                    break;
                  }
                }
                switch (operand_arg3.toLowerCase()) {
                  case "mapx":
                  case "マップx": {
                    parameters.push(0);
                    break;
                  }
                  case "mapy":
                  case "マップy": {
                    parameters.push(1);
                    break;
                  }
                  case "direction":
                  case "方向": {
                    parameters.push(2);
                    break;
                  }
                  case "screenx":
                  case "画面x": {
                    parameters.push(3);
                    break;
                  }
                  case "screeny":
                  case "画面y": {
                    parameters.push(4);
                    break;
                  }
                  default: {
                    parameters.push(0);
                    break;
                  }
                }
                break;
              case "party":
              case "パーティ":
                parameters.push(6);
                parameters.push(parseInt(operand_arg2) - 1);
                parameters.push(0);
                break;
              case "other":
                parameters.push(7);
                switch (operand_arg2.toLowerCase()) {
                  case "mapid":
                  case "マップid": {
                    parameters.push(0);
                    break;
                  }
                  case "partymembers":
                  case "パーティ人数": {
                    parameters.push(1);
                    break;
                  }
                  case "gold":
                  case "所持金": {
                    parameters.push(2);
                    break;
                  }
                  case "steps":
                  case "歩数": {
                    parameters.push(3);
                    break;
                  }
                  case "playtime":
                  case "プレイ時間": {
                    parameters.push(4);
                    break;
                  }
                  case "timer":
                  case "タイマー": {
                    parameters.push(5);
                    break;
                  }
                  case "savecount":
                  case "セーブ回数": {
                    parameters.push(6);
                    break;
                  }
                  case "battlecount":
                  case "戦闘回数": {
                    parameters.push(7);
                    break;
                  }
                  case "wincount":
                  case "勝利回数": {
                    parameters.push(8);
                    break;
                  }
                  case "escapecount":
                  case "逃走回数": {
                    parameters.push(9);
                    break;
                  }
                  default: {
                    parameters.push(parseInt(operand_arg2));
                    break;
                  }
                }
                parameters.push(0);
                break;
              case "last":
              case "直前":
                parameters.push(8);
                switch (operand_arg2.toLowerCase()) {
                  case "last used skill id":
                  case "直前に使用したスキルのid":
                  case "used skill id": {
                    parameters.push(0);
                    break;
                  }
                  case "last used item id":
                  case "直前に使用したアイテムのid":
                  case "used item id": {
                    parameters.push(1);
                    break;
                  }
                  case "last actor id to act":
                  case "直前に行動したアクターのid":
                  case "actor id to act": {
                    parameters.push(2);
                    break;
                  }
                  case "last enemy index to act":
                  case "直前に行動した敵キャラのインデックス":
                  case "enemy index to act": {
                    parameters.push(3);
                    break;
                  }
                  case "last target actor id":
                  case "直前に対象となったアクターのid":
                  case "target actor id": {
                    parameters.push(4);
                    break;
                  }
                  case "last target enemy index":
                  case "直前に対象となった敵キャラのインデックス":
                  case "target enemy index": {
                    parameters.push(5);
                    break;
                  }
                  default: {
                    parameters.push(0);
                    break;
                  }
                }
                parameters.push(0);
                break;
            }
            break;
          }
          case "script": {
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
        return { code: 122, indent: 0, parameters };
      };
      const getControlSelfSwitch = function(target, value) {
        switch (value.toLowerCase()) {
          case "on":
          case "オン":
          case "1":
          case "true": {
            return { code: 123, indent: 0, parameters: [target.toUpperCase(), 0] };
          }
          case "off":
          case "オフ":
          case "0":
          case "false": {
            return { code: 123, indent: 0, parameters: [target.toUpperCase(), 1] };
          }
          default:
            return { code: 123, indent: 0, parameters: [target.toUpperCase(), 1] };
        }
      };
      const getControlTimer = function(operation, sec) {
        switch (operation.toLowerCase()) {
          case "start":
          case "始動":
          case "スタート": {
            return { code: 124, indent: 0, parameters: [0, parseInt(sec)] };
          }
          case "stop":
          case "停止":
          case "ストップ": {
            return { code: 124, indent: 0, parameters: [1, parseInt(sec)] };
          }
          default:
            return { code: 124, indent: 0, parameters: [1, parseInt(sec)] };
        }
      };
      const getBlockStatement = function(scenario_text2, statement) {
        const block_map = {};
        let block_count = 0;
        let re = null;
        let event_head_func = function() {
        };
        let event_body_func = function() {
        };
        switch (statement.toLowerCase()) {
          case "script": {
            re = /<script>([\s\S]*?)<\/script>|<sc>([\s\S]*?)<\/sc>|<スクリプト>([\s\S]*?)<\/スクリプト>/i;
            event_head_func = getScriptHeadEvent;
            event_body_func = getScriptBodyEvent;
            break;
          }
          case "comment": {
            re = /<comment>([\s\S]*?)<\/comment>|<co>([\s\S]*?)<\/co>|<注釈>([\s\S]*?)<\/注釈>/i;
            event_head_func = getCommentOutHeadEvent;
            event_body_func = getCommentOutBodyEvent;
            break;
          }
          case "scrolling": {
            let block2 = scenario_text2.match(/<ShowScrollingText\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/ShowScrollingText>/i) || scenario_text2.match(/<sst\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/sst>/i) || scenario_text2.match(
              /<文章のスクロール表示\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/文章のスクロール表示>/i
            );
            while (block2 !== null) {
              const match_block = block2[0];
              const scrolling_speed = Number(block2[1]);
              const enable_auto_scroll = block2[2];
              const scrolling_text = block2[3];
              const match_text_list = scrolling_text.replace(/^\n/, "").replace(/\n$/, "").split("\n");
              let event_list = [];
              event_list.push(getScrollingTextHeadEvent(scrolling_speed, enable_auto_scroll));
              event_list = event_list.concat(match_text_list.map((t) => getScrollingTextBodyEvent(t)));
              block_map[`#${statement.toUpperCase()}_BLOCK${block_count}#`] = event_list;
              scenario_text2 = scenario_text2.replace(match_block, `
#${statement.toUpperCase()}_BLOCK${block_count}#
`);
              block_count++;
              block2 = scenario_text2.match(
                /<ShowScrollingText\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/ShowScrollingText>/i
              ) || scenario_text2.match(/<sst\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/sst>/i) || scenario_text2.match(
                /<文章のスクロール表示\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/文章のスクロール表示>/i
              );
            }
            return { scenario_text: scenario_text2, block_map };
          }
        }
        let block = scenario_text2.match(re);
        while (block !== null) {
          const match_block = block[0];
          const match_text = block[1] || block[2] || block[3];
          scenario_text2 = scenario_text2.replace(match_block, `
#${statement.toUpperCase()}_BLOCK${block_count}#
`);
          const match_text_list = match_text.replace(/^\n/, "").replace(/\n$/, "").split("\n");
          const event_list = [];
          for (let i = 0; i < match_text_list.length; i++) {
            const text = match_text_list[i];
            if (i === 0) {
              event_list.push(event_head_func(text));
            } else {
              event_list.push(event_body_func(text));
            }
          }
          block_map[`#${statement.toUpperCase()}_BLOCK${block_count}#`] = event_list;
          block = scenario_text2.match(re);
          block_count++;
        }
        return { scenario_text: scenario_text2, block_map };
      };
      const getDefaultPictureOptions = function() {
        return {
          origin: 0,
          // 0: UpperLeft, 1:Center
          variable: 0,
          // 0: Constant, 1: Variable
          // if variable is 0, x and y are  a constant values.
          // if variable is 1, x is a number of variables
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          // %
          opacity: 255,
          blend_mode: 0,
          // 0:Normal, 1:Additive, 2:Multiply, 3:Screen
          duration: 60,
          wait: true,
          // for a function that move a picture
          red: 0,
          green: 0,
          blue: 0,
          gray: 0,
          // for a function that tints a picture.
          easing: 0
          // for MZ
        };
      };
      const getPictureOptions = function(option_str) {
        const out = {};
        const option_regexp = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])/i;
        const option = option_str.match(option_regexp);
        if (option) {
          const key = option[1] || "";
          const values = option[2].slice(1, -1).split("][") || "";
          switch (key.toLowerCase()) {
            case "position":
            case "位置": {
              const origin = values[0] || "Upper Left";
              if (origin.toLowerCase() === "center" || origin === "中央") {
                out.origin = 1;
              }
              const constant_regexp = /^-?[0-9]+$/;
              const variable_regexp = /(?:variables|v|変数)\[([0-9]+)\]/i;
              const x = values[1] || "0";
              if (x.match(constant_regexp)) {
                out.variable = 0;
                out.x = Number(x);
              } else {
                const v = x.match(variable_regexp);
                if (v) {
                  out.variable = 1;
                  out.x = Number(v[1]);
                }
              }
              const y = values[2] || "0";
              if (y.match(constant_regexp)) {
                out.variable = 0;
                out.y = Number(y);
              } else {
                const v = y.match(variable_regexp);
                if (v) {
                  out.variable = 1;
                  out.y = Number(v[1]);
                }
              }
              break;
            }
            case "scale":
            case "拡大率": {
              out.width = getValidNumberOrDefault(values[0], 100);
              out.height = getValidNumberOrDefault(values[1], 100);
              break;
            }
            case "blend":
            case "合成": {
              out.opacity = getValidNumberOrDefault(values[0], 255);
              out.blend_mode = {
                normal: 0,
                通常: 0,
                additive: 1,
                加算: 1,
                multiply: 2,
                乗算: 2,
                screen: 3,
                スクリーン: 3
              }[values[1].toLowerCase()] || 0;
              break;
            }
            case "duration":
            case "時間": {
              out.duration = getValidNumberOrDefault(values[0], 60);
              if (typeof values[1] === "undefined" || values[1] === "") {
                out.wait = false;
              }
              break;
            }
            case "colortone":
            case "色調":
            case "ct": {
              const firstValue = values[0].toLowerCase() || 0;
              switch (firstValue) {
                case "normal":
                case "通常": {
                  out.red = 0;
                  out.green = 0;
                  out.blue = 0;
                  out.gray = 0;
                  break;
                }
                case "dark":
                case "ダーク": {
                  out.red = -68;
                  out.green = -68;
                  out.blue = -68;
                  out.gray = 0;
                  break;
                }
                case "sepia":
                case "セピア": {
                  out.red = 34;
                  out.green = -34;
                  out.blue = -68;
                  out.gray = 170;
                  break;
                }
                case "sunset":
                case "夕暮れ": {
                  out.red = 68;
                  out.green = -34;
                  out.blue = -34;
                  out.gray = 0;
                  break;
                }
                case "night":
                case "夜": {
                  out.red = -68;
                  out.green = -68;
                  out.blue = 0;
                  out.gray = 68;
                  break;
                }
                default: {
                  out.red = Number(values[0]) || 0;
                  out.green = Number(values[1]) || 0;
                  out.blue = Number(values[2]) || 0;
                  out.gray = Number(values[3]) || 0;
                  break;
                }
              }
              break;
            }
            case "easing":
            case "イージング": {
              const easingMode = values[0].toLowerCase() || "inear";
              out.easing = {
                "constant speed": 0,
                一定速度: 0,
                linear: 0,
                "slow start": 1,
                ゆっくり始まる: 1,
                "ease-in": 1,
                "slow end": 2,
                ゆっくり終わる: 2,
                "ease-out": 2,
                "slow start and end": 3,
                ゆっくり始まってゆっくり終わる: 3,
                "ease-in-out": 3
              }[easingMode];
              break;
            }
          }
        }
        return out;
      };
      const getShowPicture = function(pic_no, name, options = []) {
        const ps = getDefaultPictureOptions();
        options.map((x) => Object.assign(ps, getPictureOptions(x)));
        return {
          code: 231,
          indent: 0,
          parameters: [
            pic_no,
            name,
            ps.origin,
            ps.variable,
            ps.x,
            ps.y,
            ps.width,
            ps.height,
            ps.opacity,
            ps.blend_mode
          ]
        };
      };
      const getMovePicture = function(pic_no, options = []) {
        const ps = getDefaultPictureOptions();
        options.map((x) => Object.assign(ps, getPictureOptions(x)));
        return {
          code: 232,
          indent: 0,
          parameters: [
            pic_no,
            0,
            ps.origin,
            ps.variable,
            ps.x,
            ps.y,
            ps.width,
            ps.height,
            ps.opacity,
            ps.blend_mode,
            ps.duration,
            ps.wait,
            ps.easing
          ]
        };
      };
      const getRotatePicture = function(pic_no, speed) {
        return { code: 233, indent: 0, parameters: [pic_no, speed] };
      };
      const getTintPicture = function(pic_no, options = []) {
        const ps = getDefaultPictureOptions();
        options.map((x) => Object.assign(ps, getPictureOptions(x)));
        return {
          code: 234,
          indent: 0,
          parameters: [
            pic_no,
            [ps.red, ps.green, ps.blue, ps.gray],
            ps.duration,
            ps.wait
          ]
        };
      };
      const getErasePicture = function(pic_no) {
        return { code: 235, indent: 0, parameters: [pic_no] };
      };
      const getIfSwitchParameters = function(switchId, params) {
        switchId = Math.max(Number(switchId) || 1, 1);
        if (typeof params[0] === "undefined") {
          return [0, switchId, 0];
        }
        const value = {
          on: 0,
          オン: 0,
          true: 0,
          1: 0,
          off: 1,
          オフ: 1,
          false: 1,
          0: 1
        }[params[0].toLowerCase()];
        if (switchId > 0 && (value === 1 || value === 0)) {
          return [0, switchId, value];
        }
        return [0, switchId, 0];
      };
      const getIfVariableParameters = function(variableId, params) {
        variableId = Math.max(Number(variableId) || 1, 1);
        const operator = {
          "==": 0,
          "＝": 0,
          ">=": 1,
          "≧": 1,
          "<=": 2,
          "≦": 2,
          ">": 3,
          "＞": 3,
          "<": 4,
          "＜": 4,
          "!=": 5,
          "≠": 5
        }[params[0]] || 0;
        const constant_regexp = /^\d+$/;
        const variable_regexp = /(?:variables|v|変数)\[([0-9]+)\]/i;
        const operand = params[1] || "0";
        if (operand.match(constant_regexp)) {
          return [1, variableId, 0, Number(operand), operator];
        } else if (operand.match(variable_regexp)) {
          const value = Math.max(Number(operand.match(variable_regexp)[1]), 1);
          return [1, variableId, 1, value, operator];
        }
        return [1, variableId, 0, 0, 0];
      };
      const getIfSelfSwitchParameters = function(selfSwitchId, params) {
        selfSwitchId = selfSwitchId.toUpperCase();
        switch (selfSwitchId) {
          case "A":
          case "B":
          case "C":
          case "D":
            break;
          default:
            selfSwitchId = "A";
        }
        if (typeof params[0] === "undefined") {
          return [2, selfSwitchId, 0];
        }
        const value = {
          on: 0,
          オン: 0,
          true: 0,
          1: 0,
          off: 1,
          オフ: 1,
          false: 1,
          0: 1
        }[params[0].toLowerCase()];
        if (value === 0 || value === 1) {
          return [2, selfSwitchId, value];
        }
        return [2, selfSwitchId, 0];
      };
      const getIfTimerParameters = function(params) {
        const condition = {
          ">=": 0,
          "≧": 0,
          "<=": 1,
          "≦": 1
        }[params[0]] || 0;
        const minute = Number(params[1]) || 0;
        const second = Number(params[2]) || 0;
        return [3, 60 * minute + second, condition];
      };
      const getIfActorParameters = function(actorId, params) {
        actorId = Math.max(Number(actorId) || 1, 1);
        const actor_mode = {
          "in the party": 0,
          パーティにいる: 0,
          name: 1,
          名前: 1,
          class: 2,
          職業: 2,
          skill: 3,
          スキル: 3,
          weapon: 4,
          武器: 4,
          armor: 5,
          防具: 5,
          state: 6,
          ステート: 6
        }[params[0].toLowerCase()] || 0;
        if (actor_mode > 0) {
          if (actor_mode === 1) {
            return [4, actorId, 1, params[1]];
          } else if (Number(params[1])) {
            return [4, actorId, actor_mode, Math.max(Number(params[1]), 1)];
          }
        }
        return [4, actorId, 0];
      };
      const getIfEnemyParameters = function(enemyId, params) {
        enemyId = Math.max(Number(enemyId) || 1, 1) - 1;
        const condition = (params[0] || "appeared").toLowerCase();
        const state_id = Math.max(Number(params[1]) || 1, 1);
        if (condition === "appeared" || condition === "出現している") {
          return [5, enemyId, 0];
        } else if (condition === "state" || condition === "ステート") {
          return [5, enemyId, 1, state_id];
        } else {
          return [5, enemyId, 0];
        }
      };
      const getIfCharacterParameters = function(character, params) {
        let characterId = {
          player: -1,
          プレイヤー: -1,
          thisevent: 0,
          このイベント: 0
        }[character.toLowerCase()];
        if (typeof characterId === "undefined") {
          characterId = Math.max(Number(character) || 0, -1);
        }
        const direction = {
          down: 2,
          下: 2,
          2: 2,
          left: 4,
          左: 4,
          4: 4,
          right: 6,
          右: 6,
          6: 6,
          up: 8,
          上: 8,
          8: 8
        }[(params[0] || "").toLowerCase()] || 2;
        return [6, characterId, direction];
      };
      const getIfVehicleParameters = function(params) {
        const vehicle = {
          boat: 0,
          小型船: 0,
          ship: 1,
          大型船: 1,
          airship: 2,
          飛行船: 2
        }[(params[0] || "").toLowerCase()] || 0;
        return [13, vehicle];
      };
      const getIfGoldParameters = function(params) {
        const condition = {
          ">=": 0,
          "≧": 0,
          "<=": 1,
          "≦": 1,
          "<": 2,
          "＜": 2
        }[params[0]] || 0;
        const gold = Number(params[1]) || 0;
        return [7, gold, condition];
      };
      const getIfItemParameters = function(itemId) {
        itemId = Math.max(Number(itemId) || 1, 1);
        return [8, itemId];
      };
      const getIfWeaponParameters = function(weaponId, params) {
        weaponId = Math.max(Number(weaponId) || 1, 1);
        let include_equipment = false;
        if (params[0])
          include_equipment = true;
        return [9, weaponId, include_equipment];
      };
      const getIfArmorParameters = function(armorId, params) {
        armorId = Math.max(Number(armorId) || 1, 1);
        let include_equipment = false;
        if (params[0])
          include_equipment = true;
        return [10, armorId, include_equipment];
      };
      const getIfButtonParameters = function(params) {
        const button = {
          ok: "ok",
          決定: "ok",
          cancel: "cancel",
          キャンセル: "cancel",
          shift: "shift",
          シフト: "shift",
          down: "down",
          下: "down",
          left: "left",
          左: "left",
          right: "right",
          右: "right",
          up: "up",
          上: "up",
          pageup: "pageup",
          ページアップ: "pageup",
          pagedown: "pagedown",
          ページダウン: "pagedown"
        }[(params[0] || "").toLowerCase()] || "ok";
        const how = {
          "is being pressed": 0,
          が押されている: 0,
          pressed: 0,
          "is being triggered": 1,
          がトリガーされている: 1,
          triggered: 1,
          "is being repeated": 2,
          がリピートされている: 2,
          repeated: 2
        }[(params[1] || "").toLowerCase()] || 0;
        return [11, button, how];
      };
      const getIfScriptParameters = function(params) {
        return [12, params.join(",").trim()];
      };
      const getConditionalBranch = function(target, params) {
        const out = { code: 111, indent: 0, parameters: [0, 1, 0] };
        const target_regexp = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])*/i;
        target = target.match(target_regexp);
        const mode = target[1];
        const mode_value = (target[2] || "").replace(/[[\]]/g, "");
        switch (mode.toLowerCase()) {
          case "script":
          case "スクリプト":
          case "sc":
            break;
          default:
            params = params.map((s) => s.trim());
            break;
        }
        switch (mode.toLowerCase()) {
          case "switches":
          case "スイッチ":
          case "sw": {
            out.parameters = getIfSwitchParameters(mode_value, params);
            break;
          }
          case "variables":
          case "変数":
          case "v": {
            out.parameters = getIfVariableParameters(mode_value, params);
            break;
          }
          case "selfswitches":
          case "セルフスイッチ":
          case "ssw": {
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
      const getElse = function() {
        return { code: 411, indent: 0, parameters: [] };
      };
      const getEnd = function() {
        return { code: 412, indent: 0, parameters: [] };
      };
      const getLoop = function() {
        return { code: 112, indent: 0, parameters: [] };
      };
      const getRepeatAbove = function() {
        return { code: 413, indent: 0, parameters: [] };
      };
      const getBreakLoop = function() {
        return { code: 113, indent: 0, parameters: [] };
      };
      const getBlockEnd = function() {
        return { code: 0, indent: 0, parameters: [] };
      };
      const getExitEventProcessing = function() {
        return { code: 115, indent: 0, parameters: [] };
      };
      const getLabel = function(name) {
        return { code: 118, indent: 0, parameters: [name] };
      };
      const getJumpToLabel = function(name) {
        return { code: 119, indent: 0, parameters: [name] };
      };
      const getInputNumber = function(val_num, num_of_digits) {
        return { code: 103, indent: 0, parameters: [val_num, num_of_digits] };
      };
      const getSelectItem = function(val_num, item_type) {
        let item_type_num = 1;
        switch (item_type.trim().toLowerCase()) {
          case "Regular Item".toLowerCase():
          case "通常アイテム".toLowerCase(): {
            item_type_num = 1;
            break;
          }
          case "Key Item".toLowerCase():
          case "大事なもの".toLowerCase(): {
            item_type_num = 2;
            break;
          }
          case "Hidden Item A".toLowerCase():
          case "隠しアイテムA".toLowerCase(): {
            item_type_num = 3;
            break;
          }
          case "Hidden Item B".toLowerCase():
          case "隠しアイテムB".toLowerCase(): {
            item_type_num = 4;
            break;
          }
        }
        return { code: 104, indent: 0, parameters: [val_num, item_type_num] };
      };
      const getShowChoices = function(window_type, window_position, default_choice, default_cancel) {
        return { code: 102, indent: 0, parameters: [[], default_cancel, default_choice, window_position, window_type] };
      };
      const getShowChoiceWhen = function(index, text) {
        return { code: 402, indent: 0, parameters: [index, text] };
      };
      const getShowChoiceWhenCancel = function() {
        return { code: 403, indent: 0, parameters: [6, null] };
      };
      const getShowChoiceEnd = function() {
        return { code: 404, indent: 0, parameters: [] };
      };
      const getChangeGold = function(operation, operand, variable) {
        return { code: 125, indent: 0, parameters: [operation, operand, variable] };
      };
      const getChangeItems = function(itemId, operation, operand, variable) {
        return { code: 126, indent: 0, parameters: [itemId, operation, operand, variable] };
      };
      const getChangeWeapons = function(weaponId, operation, operand, variableId, includeEquipment) {
        return { code: 127, indent: 0, parameters: [weaponId, operation, operand, variableId, includeEquipment] };
      };
      const getChangeArmors = function(armorId, operation, operand, variableId, includeEquipment) {
        return { code: 128, indent: 0, parameters: [armorId, operation, operand, variableId, includeEquipment] };
      };
      const getChangePartyMember = function(actorId, operation, initialize) {
        return { code: 129, indent: 0, parameters: [actorId, operation, initialize] };
      };
      const getChangeHp = function(actor, actorValue, operation, operand, operandValue, allowDeath) {
        return { code: 311, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue, allowDeath] };
      };
      const getChangeMp = function(actor, actorValue, operation, operand, operandValue) {
        return { code: 312, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue] };
      };
      const getChangeTp = function(actor, actorValue, operation, operand, operandValue) {
        return { code: 326, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue] };
      };
      const getChangeState = function(actor, actorValue, operation, stateId) {
        return { code: 313, indent: 0, parameters: [actor, actorValue, operation, stateId] };
      };
      const getRecoverAll = function(actor, actorValue) {
        return { code: 314, indent: 0, parameters: [actor, actorValue] };
      };
      const getChangeExp = function(actor, actorValue, operation, operand, operandValue, showLevelUp) {
        return { code: 315, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue, showLevelUp] };
      };
      const getChangeLevel = function(actor, actorValue, operation, operand, operandValue, showLevelUp) {
        return { code: 316, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue, showLevelUp] };
      };
      const getChangeParameter = function(actor, actorValue, parameter, operation, operand, operandValue) {
        return { code: 317, indent: 0, parameters: [actor, actorValue, parameter, operation, operand, operandValue] };
      };
      const getChangeSkill = function(actor, actorValue, operation, skillId) {
        return { code: 318, indent: 0, parameters: [actor, actorValue, operation, skillId] };
      };
      const getChangeEquipment = function(actorId, equipmentType, equipmentItem) {
        return { code: 319, indent: 0, parameters: [actorId, equipmentType, equipmentItem] };
      };
      const getChangeName = function(actorId, name) {
        return { code: 320, indent: 0, parameters: [actorId, name] };
      };
      const getChangeClass = function(actorId, classId, saveExp) {
        return { code: 321, indent: 0, parameters: [actorId, classId, saveExp] };
      };
      const getChangeNickname = function(actorId, nickname) {
        return { code: 324, indent: 0, parameters: [actorId, nickname] };
      };
      const getChangeProfile = function(actorId, profile) {
        const replaceProfile = profile.replace("\\n", "\n");
        return { code: 325, indent: 0, parameters: [actorId, replaceProfile] };
      };
      const getTransferPlayer = function(location, mapId, mapX, mapY, direction, fade) {
        return { code: 201, indent: 0, parameters: [location, mapId, mapX, mapY, direction, fade] };
      };
      const getSetVehicleLocation = function(vehicle, location, mapId, mapX, mapY) {
        return { code: 202, indent: 0, parameters: [vehicle, location, mapId, mapX, mapY] };
      };
      const getSetEventLocation = function(event, location, mapX, mapY, direction) {
        return { code: 203, indent: 0, parameters: [event, location, mapX, mapY, direction] };
      };
      const getScrollMap = function(direction, distance, speed, waitForCompletion) {
        return { code: 204, indent: 0, parameters: [direction, distance, speed, waitForCompletion] };
      };
      const getMovementRoute = function(target, repeat, skippable, wait) {
        return {
          code: 205,
          indent: 0,
          parameters: [target, { list: [{ code: 0 }], repeat, skippable, wait }]
        };
      };
      const getMovementRoute505 = function(parameters) {
        return { code: 505, indent: 0, parameters: [parameters] };
      };
      const getMoveDown = function() {
        const parameters = { code: 1, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveLeft = function() {
        const parameters = { code: 2, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveRight = function() {
        const parameters = { code: 3, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveUp = function() {
        const parameters = { code: 4, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveLowerLeft = function() {
        const parameters = { code: 5, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveLowerRight = function() {
        const parameters = { code: 6, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveUpperLeft = function() {
        const parameters = { code: 7, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveUpperRight = function() {
        const parameters = { code: 8, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveAtRandom = function() {
        const parameters = { code: 9, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveTowardPlayer = function() {
        const parameters = { code: 10, indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveAwayFromPlayer = function() {
        const parameters = { code: 11, indent: null };
        return getMovementRoute505(parameters);
      };
      const getOneStepForward = function() {
        const parameters = { code: 12, indent: null };
        return getMovementRoute505(parameters);
      };
      const getOneStepBackward = function() {
        const parameters = { code: 13, indent: null };
        return getMovementRoute505(parameters);
      };
      const getJump = function(x, y) {
        const parameters = { code: 14, parameters: [x, y], indent: null };
        return getMovementRoute505(parameters);
      };
      const getMoveWait = function(wait) {
        const parameters = { code: 15, parameters: [wait], indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurnDown = function() {
        const parameters = { code: 16, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurnLeft = function() {
        const parameters = { code: 17, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurnRight = function() {
        const parameters = { code: 18, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurnUp = function() {
        const parameters = { code: 19, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurn90Right = function() {
        const parameters = { code: 20, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurn90Left = function() {
        const parameters = { code: 21, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurn180 = function() {
        const parameters = { code: 22, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurn90RightorLeft = function() {
        const parameters = { code: 23, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurnAtRandom = function() {
        const parameters = { code: 24, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurnTowardPlayer = function() {
        const parameters = { code: 25, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTurnAwayFromPlayer = function() {
        const parameters = { code: 26, indent: null };
        return getMovementRoute505(parameters);
      };
      const getSwitchOn = function(switchId) {
        const parameters = { code: 27, parameters: [switchId], indent: null };
        return getMovementRoute505(parameters);
      };
      const getSwitchOff = function(switchId) {
        const parameters = { code: 28, parameters: [switchId], indent: null };
        return getMovementRoute505(parameters);
      };
      const getChangeSpeed = function(speed) {
        const parameters = { code: 29, parameters: [speed], indent: null };
        return getMovementRoute505(parameters);
      };
      const getChangeFrequency = function(frequency) {
        const parameters = { code: 30, parameters: [frequency], indent: null };
        return getMovementRoute505(parameters);
      };
      const getWalkingAnimationOn = function() {
        const parameters = { code: 31, indent: null };
        return getMovementRoute505(parameters);
      };
      const getWalkingAnimationOff = function() {
        const parameters = { code: 32, indent: null };
        return getMovementRoute505(parameters);
      };
      const getSteppingAnimationOn = function() {
        const parameters = { code: 33, indent: null };
        return getMovementRoute505(parameters);
      };
      const getSteppingAnimationOff = function() {
        const parameters = { code: 34, indent: null };
        return getMovementRoute505(parameters);
      };
      const getDirectionFixOn = function() {
        const parameters = { code: 35, indent: null };
        return getMovementRoute505(parameters);
      };
      const getDirectionFixOff = function() {
        const parameters = { code: 36, indent: null };
        return getMovementRoute505(parameters);
      };
      const getThroughOn = function() {
        const parameters = { code: 37, indent: null };
        return getMovementRoute505(parameters);
      };
      const getThroughOff = function() {
        const parameters = { code: 38, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTransparentOn = function() {
        const parameters = { code: 39, indent: null };
        return getMovementRoute505(parameters);
      };
      const getTransparentOff = function() {
        const parameters = { code: 40, indent: null };
        return getMovementRoute505(parameters);
      };
      const getChangeImage = function(image, imageId) {
        const parameters = { code: 41, parameters: [image, imageId], indent: null };
        return getMovementRoute505(parameters);
      };
      const getChangeOpacity = function(opacity) {
        const parameters = { code: 42, parameters: [opacity], indent: null };
        return getMovementRoute505(parameters);
      };
      const getChangeBlendMode = function(blendMode) {
        const parameters = { code: 43, parameters: [blendMode], indent: null };
        return getMovementRoute505(parameters);
      };
      const getMcPlaySeEvent = function(name, volume, pitch, pan) {
        let param_volume = 90;
        let param_pitch = 100;
        let param_pan = 0;
        if (typeof volume === "number") {
          param_volume = volume;
        }
        if (typeof pitch === "number") {
          param_pitch = pitch;
        }
        if (typeof pan === "number") {
          param_pan = pan;
        }
        const parameters = {
          code: 44,
          parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }],
          indent: null
        };
        return getMovementRoute505(parameters);
      };
      const getMoveScript = function(script) {
        const parameters = { code: 45, parameters: [script], indent: null };
        return getMovementRoute505(parameters);
      };
      const getOnOffVehicle = function() {
        return { code: 206, indent: 0, parameters: [] };
      };
      const getChangeTransparency = function(transparency) {
        return { code: 211, indent: 0, parameters: [transparency] };
      };
      const getChangePlayerFollowers = function(playerFollowers) {
        return { code: 216, indent: 0, parameters: [playerFollowers] };
      };
      const getGatherFollowers = function() {
        return { code: 217, indent: 0, parameters: [] };
      };
      const getShowAnimation = function(character, animationId, waitForCompletion) {
        return { code: 212, indent: 0, parameters: [character, animationId, waitForCompletion] };
      };
      const getShowBalloonIcon = function(character, balloonIcon, waitForCompletion) {
        return { code: 213, indent: 0, parameters: [character, balloonIcon, waitForCompletion] };
      };
      const getEraseEvent = function() {
        return { code: 214, indent: 0, parameters: [] };
      };
      const getTintScreen = function(options = []) {
        const ps = getDefaultPictureOptions();
        options.map((x) => Object.assign(ps, getPictureOptions(x)));
        return { code: 223, indent: 0, parameters: [[ps.red, ps.green, ps.blue, ps.gray], ps.duration, ps.wait] };
      };
      const getFlashScreen = function(red, green, blue, intensity, frames, waitForCompletion) {
        return { code: 224, indent: 0, parameters: [[red, green, blue, intensity], frames, waitForCompletion] };
      };
      const getShakeScreen = function(power, speed, frames, waitForCompletion) {
        return { code: 225, indent: 0, parameters: [power, speed, frames, waitForCompletion] };
      };
      const getSetWeatherEffect = function(type, power, frames, waitForCompletion) {
        return { code: 236, indent: 0, parameters: [type, power, frames, waitForCompletion] };
      };
      const getPlayMovie = function(fileName) {
        return { code: 261, indent: 0, parameters: [fileName] };
      };
      const getBattleProcessing = function(troop, troopValue) {
        return { code: 301, indent: 0, parameters: [troop, troopValue, false, false] };
      };
      const getIfWin = function() {
        return { code: 601, indent: 0, parameters: [] };
      };
      const getIfEscape = function() {
        return { code: 602, indent: 0, parameters: [] };
      };
      const getIfLose = function() {
        return { code: 603, indent: 0, parameters: [] };
      };
      const getIfEnd = function() {
        return { code: 604, indent: 0, parameters: [] };
      };
      const getNameInputProcessing = function(actorId, maxCharacter) {
        return { code: 303, indent: 0, parameters: [actorId, maxCharacter] };
      };
      const getShopProcessing = function(purchaseOnly) {
        return { code: 302, indent: 0, parameters: [0, 0, 0, 0, purchaseOnly] };
      };
      const getMerchandise = function(merchandiseType, merchandiseId, price, priceValue) {
        return { code: 605, indent: 0, parameters: [merchandiseType, merchandiseId, price, priceValue] };
      };
      const getOpenMenuScreen = function() {
        return { code: 351, indent: 0, parameters: [] };
      };
      const getOpenSaveScreen = function() {
        return { code: 352, indent: 0, parameters: [] };
      };
      const getGameOver = function() {
        return { code: 353, indent: 0, parameters: [] };
      };
      const getReturnToTitleScreen = function() {
        return { code: 354, indent: 0, parameters: [] };
      };
      const getChangeVictoryMe = function(name, volume, pitch, pan) {
        return { code: 133, indent: 0, parameters: [{ name, volume, pitch, pan }] };
      };
      const getChangeDefeatMe = function(name, volume, pitch, pan) {
        return { code: 139, indent: 0, parameters: [{ name, volume, pitch, pan }] };
      };
      const getChangeVehicleBgm = function(vehicle, name, volume, pitch, pan) {
        return { code: 140, indent: 0, parameters: [vehicle, { name, volume, pitch, pan }] };
      };
      const getChangeSaveAccess = function(save) {
        return { code: 134, indent: 0, parameters: [save] };
      };
      const getChangeMenuAccess = function(menu) {
        return { code: 135, indent: 0, parameters: [menu] };
      };
      const getChangeEncounter = function(encounter) {
        return { code: 136, indent: 0, parameters: [encounter] };
      };
      const getChangeFormationAccess = function(formation) {
        return { code: 137, indent: 0, parameters: [formation] };
      };
      const getChangeWindowColor = function(red, green, blue) {
        return { code: 138, indent: 0, parameters: [[red, green, blue, 0]] };
      };
      const getChangeActorImages = function(actorId, faceName, faceId, characterName, characterId, battlerName) {
        return {
          code: 322,
          indent: 0,
          parameters: [actorId, faceName, faceId, characterName, characterId, battlerName]
        };
      };
      const getChangeVehicleImage = function(vehicle, vehicleName, vehicleId) {
        return { code: 323, indent: 0, parameters: [vehicle, vehicleName, vehicleId] };
      };
      const getChangeMapNameDisplay = function(mapNameDisplay) {
        return { code: 281, indent: 0, parameters: [mapNameDisplay] };
      };
      const getChangeTileset = function(tilesetId) {
        return { code: 282, indent: 0, parameters: [tilesetId] };
      };
      const getChangeBattleBackGround = function(battleBackGround1, battleBackGround2) {
        return { code: 283, indent: 0, parameters: [battleBackGround1, battleBackGround2] };
      };
      const getChangeParallax = function(image, loopHorizontally, loopVertically, loopHorizontallyScroll, loopVerticallyScroll) {
        return {
          code: 284,
          indent: 0,
          parameters: [image, loopHorizontally, loopVertically, loopHorizontallyScroll, loopVerticallyScroll]
        };
      };
      const getGetLocationInfo = function(variableId, infoType, locationType, locationX, locationY) {
        return {
          code: 285,
          indent: 0,
          parameters: [variableId, infoType, locationType, locationX, locationY]
        };
      };
      const getChangeEnemyHp = function(enemy, operation, operand, operandValue, allowDeath) {
        return { code: 331, indent: 0, parameters: [enemy, operation, operand, operandValue, allowDeath] };
      };
      const getChangeEnemyMp = function(enemy, operation, operand, operandValue) {
        return { code: 332, indent: 0, parameters: [enemy, operation, operand, operandValue] };
      };
      const getChangeEnemyTp = function(enemy, operation, operand, operandValue) {
        return { code: 342, indent: 0, parameters: [enemy, operation, operand, operandValue] };
      };
      const getChangeEnemyState = function(enemy, operation, stateId) {
        return { code: 333, indent: 0, parameters: [enemy, operation, stateId] };
      };
      const getEnemyRecoverAll = function(enemy) {
        return { code: 334, indent: 0, parameters: [enemy] };
      };
      const getEnemyAppear = function(enemy) {
        return { code: 335, indent: 0, parameters: [enemy] };
      };
      const getEnemyTransform = function(enemy, transformToEnemyId) {
        return { code: 336, indent: 0, parameters: [enemy, transformToEnemyId] };
      };
      const getShowBattleAnimation = function(enemyValue, animationId, isAllChecked) {
        return { code: 337, indent: 0, parameters: [enemyValue, animationId, isAllChecked] };
      };
      const getForceAction = function(subject, subjectValue, skillId, target) {
        return { code: 339, indent: 0, parameters: [subject, subjectValue, skillId, target] };
      };
      const getAbortBattle = function() {
        return { code: 340, indent: 0, parameters: [] };
      };
      const completeLackedBottomEvent = function(events) {
        const BOTTOM_CODE = 0;
        const IF_CODE = 111;
        const ELSE_CODE = 411;
        const LOOP_CODE = 112;
        const stack = events.reduce((s, e) => {
          const code = e.code;
          if (code === IF_CODE)
            s.push(IF_CODE);
          else if (code === ELSE_CODE)
            s.push(ELSE_CODE);
          else if (code === BOTTOM_CODE)
            s.pop();
          return s;
        }, []);
        const bottom = stack.reduce((b, code) => {
          b.push(getCommandBottomEvent());
          if (code === IF_CODE)
            b.push(getEnd());
          else if (code === ELSE_CODE)
            b.push(getEnd());
          else if (code === LOOP_CODE)
            b.push(getRepeatAbove());
          return b;
        }, []);
        return events.concat(bottom);
      };
      const _getEvents = function(text, frame_param, block_stack, block_map) {
        const face = text.match(/<face *: *(.+?)>/i) || text.match(/<FC *: *(.+?)>/i) || text.match(/<顔 *: *(.+?)>/i);
        const window_position = text.match(/<windowposition *: *(.+?)>/i) || text.match(/<WP *: *(.+?)>/i) || text.match(/<位置 *: *(.+?)>/i);
        const background = text.match(/<background *: *(.+?)>/i) || text.match(/<BG *: *(.+?)>/i) || text.match(/<背景 *: *(.+?)>/i);
        const namebox = text.match(/<name *: ?(.+?)>/i) || text.match(/<NM *: ?(.+?)>/i) || text.match(/<名前 *: ?(.+?)>/i);
        const plugin_command = text.match(/<plugincommand *: *(.+?)>/i) || text.match(/<PC *: *(.+?)>/i) || text.match(/<プラグインコマンド *: *(.+?)>/i);
        const plugin_command_mz = text.match(/<plugincommandmz\s*:\s*([^\s].*)>/i) || text.match(/<PCZ\s*:\s*([^\s].*)>/i) || text.match(/<プラグインコマンドmz\s*:\s*([^\s].*)>/i);
        const common_event = text.match(/<commonevent *: *(.+?)>/i) || text.match(/<CE *: *(.+?)>/i) || text.match(/<コモンイベント *: *(.+?)>/i);
        const wait = text.match(/<wait *: *(.+?)>/i) || text.match(/<ウェイト *: *(.+?)>/i);
        const fadein = text.match(/<fadein>/i) || text.match(/<FI>/i) || text.match(/<フェードイン>/i);
        const fadeout = text.match(/<fadeout>/i) || text.match(/<FO>/i) || text.match(/<フェードアウト>/i);
        const play_bgm = text.match(/<playbgm *: *([^ ].+)>/i) || text.match(/<BGMの演奏 *: *([^ ].+)>/);
        const stop_bgm = text.match(/<stopbgm>/i) || text.match(/<playbgm *: *none>/i) || text.match(/<playbgm *: *なし>/i) || text.match(/<BGMの停止>/);
        const fadeout_bgm = text.match(/<fadeoutbgm *: *(.+?)>/i) || text.match(/<BGMのフェードアウト *: *(.+?)>/);
        const save_bgm = text.match(/<savebgm>/i) || text.match(/<BGMの保存>/);
        const replay_bgm = text.match(/<replaybgm>/i) || text.match(/<BGMの再開>/);
        const change_battle_bgm = text.match(/<changebattlebgm *: *([^ ].+)>/i) || text.match(/<戦闘曲の変更 *: *([^ ].+)>/);
        const play_bgs = text.match(/<playbgs *: *([^ ].+)>/i) || text.match(/<BGSの演奏 *: *([^ ].+)>/);
        const stop_bgs = text.match(/<stopbgs>/i) || text.match(/<playbgs *: *none>/i) || text.match(/<playbgs *: *なし>/i) || text.match(/<BGSの停止>/);
        const fadeout_bgs = text.match(/<fadeoutbgs *: *(.+?)>/i) || text.match(/<BGSのフェードアウト *: *(.+?)>/);
        const play_se = text.match(/<playse *: *([^ ].+)>/i) || text.match(/<SEの演奏 *: *([^ ].+)>/);
        const stop_se = text.match(/<stopse>/i) || text.match(/<SEの停止>/);
        const play_me = text.match(/<playme *: *([^ ].+)>/i) || text.match(/<MEの演奏 *: *([^ ].+)>/);
        const stop_me = text.match(/<stopme>/i) || text.match(/<playme *: *none>/i) || text.match(/<playme *: *なし>/i) || text.match(/<MEの停止>/);
        const show_picture = text.match(/<showpicture\s*:\s*([^\s].*)>/i) || text.match(/<ピクチャの表示\s*:\s*([^\s].+)>/i) || text.match(/<SP\s*:\s*([^\s].+)>/i);
        const move_picture = text.match(/<movepicture\s*:\s*([^\s].*)>/i) || text.match(/<ピクチャの移動\s*:\s*([^\s].*)>/i) || text.match(/<MP\s*:\s*([^\s].*)>/i);
        const rotate_picture = text.match(/<rotatepicture\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i) || text.match(/<ピクチャの回転\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i) || text.match(/<RP\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i);
        const tint_picture = text.match(/<tintpicture\s*:\s*([^\s].*)>/i) || text.match(/<ピクチャの色調変更\s*:\s*([^\s].*)>/i) || text.match(/<TP\s*:\s*([^\s].*)>/i);
        const erase_picture = text.match(/<erasepicture\s*:\s*(\d{1,2})\s*>/i) || text.match(/<ピクチャの消去\s*:\s*(\d{1,2})\s*>/i) || text.match(/<ep\s*:\s*(\d{1,2})\s*>/i);
        const conditional_branch_if = text.match(/\s*<if\s*:\s*([^\s].*)>/i) || text.match(/\s*<条件分岐\s*:\s*([^\s].*)>/i);
        const conditional_branch_else = text.match(/\s*<else>/i) || text.match(/\s*<それ以外のとき>/);
        const conditional_branch_end = text.match(/\s*<end>/i) || text.match(/\s*<分岐終了>/);
        const loop = text.match(/\s*<loop>/i) || text.match(/\s*<ループ>/);
        const repeat_above = text.match(/<repeatabove>/i) || text.match(/\s*<以上繰り返し>/) || text.match(/\s*<ra>/i);
        const break_loop = text.match(/<breakloop>/i) || text.match(/<ループの中断>/) || text.match(/<BL>/i);
        const exit_event_processing = text.match(/<ExitEventProcessing>/i) || text.match(/<イベント処理の中断>/) || text.match(/<EEP>/i);
        const label = text.match(/<label\s*:\s*(\S+)\s*>/i) || text.match(/<ラベル\s*:\s*(\S+)\s*>/i);
        const jump_to_label = text.match(/<jumptolabel\s*:\s*(\S+)\s*>/i) || text.match(/<ラベルジャンプ\s*:\s*(\S+)\s*>/) || text.match(/<jtl\s*:\s*(\S+)\s*>/i);
        const input_number = text.match(/<InputNumber\s*:\s*(\d+),\s*(\d+)>/i) || text.match(/<INN\s*:\s*(\d+),\s*(\d+)>/i) || text.match(/<数値入力の処理\s*:\s*(\d+),\s*(\d+)>/i);
        const select_item = text.match(/<SelectItem\s*:\s*(\d+),\s*([\s\S]+)\s*>/i) || text.match(/<SI\s*:\s*(\d+),\s*([\s\S]+)\s*>/i) || text.match(/<アイテム選択の処理\s*:\s*(\d+),\s*([\s\S]+)\s*>/i);
        const show_choices = text.match(/<ShowChoices\s*:*\s*([\s\S]*)>/i) || text.match(/<SHC\s*:*\s*([\s\S]*)>/i) || text.match(/<選択肢の表示\s*:*\s*([\s\S]*)>/i);
        const show_choice_when = text.match(/<When\s*:\s*([\s\S]+)>/i) || text.match(/<選択肢\s*:\s*([\s\S]+)>/i);
        const show_choice_when_cancel = text.match(/<WhenCancel>/i) || text.match(/<キャンセルのとき>/i);
        const change_gold = text.match(/<ChangeGold\s*:\s*([^\s].*)>/i) || text.match(/<所持金の増減\s*:\s*([^\s].*)>/i);
        const change_items = text.match(/<ChangeItems\s*:\s*([^\s].*)>/i) || text.match(/<アイテムの増減\s*:\s*([^\s].*)>/i);
        const change_weapons = text.match(/<ChangeWeapons\s*:\s*([^\s].*)>/i) || text.match(/<武器の増減\s*:\s*([^\s].*)>/i);
        const change_armors = text.match(/<ChangeArmors\s*:\s*([^\s].*)>/i) || text.match(/<防具の増減\s*:\s*([^\s].*)>/i);
        const change_party_member = text.match(/<ChangePartyMember\s*:\s*([^\s].*)>/i) || text.match(/<メンバーの入れ替え\s*:\s*([^\s].*)>/i);
        const change_hp = text.match(/<ChangeHp\s*:\s*([^\s].*)>/i) || text.match(/<HPの増減\s*:\s*([^\s].*)>/i);
        const change_mp = text.match(/<ChangeMp\s*:\s*([^\s].*)>/i) || text.match(/<MPの増減\s*:\s*([^\s].*)>/i);
        const change_tp = text.match(/<ChangeTp\s*:\s*([^\s].*)>/i) || text.match(/<TPの増減\s*:\s*([^\s].*)>/i);
        const change_state = text.match(/<ChangeState\s*:\s*([^\s].*)>/i) || text.match(/<ステートの変更\s*:\s*([^\s].*)>/i);
        const recover_all = text.match(/<RecoverAll\s*:\s*([^\s].*)>/i) || text.match(/<全回復\s*:\s*([^\s].*)>/i);
        const change_exp = text.match(/<ChangeExp\s*:\s*([^\s].*)>/i) || text.match(/<経験値の増減\s*:\s*([^\s].*)>/i);
        const change_level = text.match(/<ChangeLevel\s*:\s*([^\s].*)>/i) || text.match(/<レベルの増減\s*:\s*([^\s].*)>/i);
        const change_parameter = text.match(/<ChangeParameter\s*:\s*([^\s].*)>/i) || text.match(/<能力値の増減\s*:\s*([^\s].*)>/i);
        const change_skill = text.match(/<ChangeSkill\s*:\s*([^\s].*)>/i) || text.match(/<スキルの増減\s*:\s*([^\s].*)>/i);
        const change_equipment = text.match(/<ChangeEquipment\s*:\s*([^\s].*)>/i) || text.match(/<装備の変更\s*:\s*([^\s].*)>/i);
        const change_name = text.match(/<ChangeName\s*:\s*([^\s].*)>/i) || text.match(/<名前の変更\s*:\s*([^\s].*)>/i);
        const change_class = text.match(/<ChangeClass\s*:\s*([^\s].*)>/i) || text.match(/<職業の変更\s*:\s*([^\s].*)>/i);
        const change_nickname = text.match(/<ChangeNickname\s*:\s*([^\s].*)>/i) || text.match(/<二つ名の変更\s*:\s*([^\s].*)>/i);
        const change_profile = text.match(/<ChangeProfile\s*:\s*([^\s].*)>/i) || text.match(/<プロフィールの変更\s*:\s*([^\s].*)>/i);
        const transfer_player = text.match(/<TransferPlayer\s*:\s*([^\s].*)>/i) || text.match(/<場所移動\s*:\s*([^\s].*)>/i);
        const set_vehicle_location = text.match(/<SetVehicleLocation\s*:\s*([^\s].*)>/i) || text.match(/<乗り物の位置設定\s*:\s*([^\s].*)>/i);
        const set_event_location = text.match(/<SetEventLocation\s*:\s*([^\s].*)>/i) || text.match(/<イベントの位置設定\s*:\s*([^\s].*)>/i);
        const scroll_map = text.match(/<ScrollMap\s*:\s*([^\s].*)>/i) || text.match(/<マップのスクロール\s*:\s*([^\s].*)>/i);
        const set_movement_route = text.match(/<SetMovementRoute\s*:\s*([^\s].*)>/i) || text.match(/<移動ルートの設定\s*:\s*([^\s].*)>/i);
        const move_down = text.match(/<MoveDown>/i) || text.match(/<下に移動>/);
        const move_left = text.match(/<MoveLeft>/i) || text.match(/<左に移動>/);
        const move_right = text.match(/<MoveRight>/i) || text.match(/<右に移動>/);
        const move_up = text.match(/<MoveUp>/i) || text.match(/<上に移動>/);
        const move_lower_left = text.match(/<MoveLowerLeft>/i) || text.match(/<左下に移動>/);
        const move_lower_right = text.match(/<MoveLowerRight>/i) || text.match(/<右下に移動>/);
        const move_upper_left = text.match(/<MoveUpperLeft>/i) || text.match(/<左上に移動>/);
        const move_upper_right = text.match(/<MoveUpperRight>/i) || text.match(/<右上に移動>/);
        const move_at_random = text.match(/<MoveAtRandom>/i) || text.match(/<ランダムに移動>/);
        const move_toward_player = text.match(/<MoveTowardPlayer>/i) || text.match(/<プレイヤーに近づく>/);
        const move_away_from_player = text.match(/<MoveAwayFromPlayer>/i) || text.match(/<プレイヤーから遠ざかる>/);
        const one_step_forward = text.match(/<OneStepForward>/i) || text.match(/<一歩前進>/);
        const one_step_backward = text.match(/<OneStepBackward>/i) || text.match(/<一歩後退>/);
        const jump = text.match(/<Jump\s*:\s*([^\s].*)>/i) || text.match(/<ジャンプ\s*:\s*([^\s].*)>/i);
        const mc_wait = text.match(/<McWait\s*:\s*([^\s].*)>/i) || text.match(/<移動コマンドウェイト\s*:\s*([^\s].*)>/i);
        const turn_down = text.match(/<TurnDown>/i) || text.match(/<下を向く>/);
        const turn_left = text.match(/<TurnLeft>/i) || text.match(/<左を向く>/);
        const turn_right = text.match(/<TurnRight>/i) || text.match(/<右を向く>/);
        const turn_up = text.match(/<TurnUp>/i) || text.match(/<上を向く>/);
        const turn_90_right = text.match(/<Turn90Right>/i) || text.match(/<右に90度回転>/);
        const turn_90_left = text.match(/<Turn90Left>/i) || text.match(/<左に90度回転>/);
        const turn_180 = text.match(/<Turn180>/i) || text.match(/<180度回転>/);
        const turn_90_right_or_left = text.match(/<Turn90RightorLeft>/i) || text.match(/<右か左に90度回転>/);
        const turn_at_random = text.match(/<TurnAtRandom>/i) || text.match(/<ランダムに方向転換>/);
        const turn_toward_Player = text.match(/<TurnTowardPlayer>/i) || text.match(/<プレイヤーの方を向く>/);
        const turn_away_from_player = text.match(/<TurnAwayFromPlayer>/i) || text.match(/<プレイヤーの逆を向く>/);
        const switch_on = text.match(/<SwitchOn\s*:\s*([^\s].*)>/i) || text.match(/<スイッチON\s*:\s*([^\s].*)>/i);
        const switch_off = text.match(/<SwitchOff\s*:\s*([^\s].*)>/i) || text.match(/<スイッチOFF\s*:\s*([^\s].*)>/i);
        const change_speed = text.match(/<ChangeSpeed\s*:\s*([^\s].*)>/i) || text.match(/<移動速度の変更\s*:\s*([^\s].*)>/i);
        const change_frequency = text.match(/<ChangeFrequency\s*:\s*([^\s].*)>/i) || text.match(/<移動頻度の変更\s*:\s*([^\s].*)>/i);
        const walking_animation_on = text.match(/<WalkingAnimationOn>/i) || text.match(/<歩行アニメON>/);
        const walking_animation_off = text.match(/<WalkingAnimationOff>/i) || text.match(/<歩行アニメOFF>/);
        const stepping_animation_on = text.match(/<SteppingAnimationOn>/i) || text.match(/<足踏みアニメON>/);
        const stepping_animation_off = text.match(/<SteppingAnimationOff>/i) || text.match(/<足踏みアニメOFF>/);
        const direction_fix_on = text.match(/<DirectionFixOn>/i) || text.match(/<向き固定ON>/);
        const direction_fix_off = text.match(/<DirectionFixOff>/i) || text.match(/<向き固定OFF>/);
        const through_On = text.match(/<ThroughOn>/i) || text.match(/<すり抜けON>/);
        const through_Off = text.match(/<ThroughOff>/i) || text.match(/<すり抜けOFF>/);
        const transparent_on = text.match(/<TransparentOn>/i) || text.match(/<透明化ON>/);
        const transparent_off = text.match(/<TransparentOff>/i) || text.match(/<透明化OFF>/);
        const change_image = text.match(/<ChangeImage\s*:\s*([^\s].*)>/i) || text.match(/<画像の変更\s*:\s*([^\s].*)>/i);
        const change_opacity = text.match(/<ChangeOpacity\s*:\s*([^\s].*)>/i) || text.match(/<不透明度の変更\s*:\s*([^\s].*)>/i);
        const change_blend_mode = text.match(/<ChangeBlendMode\s*:\s*([^\s].*)>/i) || text.match(/<合成方法の変更\s*:\s*([^\s].*)>/i);
        const mc_play_se = text.match(/<McPlaySe *: *([^ ].+)>/i) || text.match(/<移動コマンドSEの演奏 *: *([^ ].+)>/);
        const mc_script = text.match(/<McScript\s*:\s*([^\s].*)>/i) || text.match(/<移動コマンドスクリプト\s*:\s*([^\s].*)>/i);
        const get_on_off_vehicle = text.match(/<GetOnOffVehicle>/i) || text.match(/<乗り物の乗降>/);
        const change_transparency = text.match(/<ChangeTransparency\s*:\s*([^\s].*)>/i) || text.match(/<透明状態の変更\s*:\s*([^\s].*)>/i);
        const change_player_followers = text.match(/<ChangePlayerFollowers\s*:\s*([^\s].*)>/i) || text.match(/<隊列歩行の変更\s*:\s*([^\s].*)>/i);
        const gather_followers = text.match(/<GatherFollowers>/i) || text.match(/<隊列メンバーの集合>/);
        const show_animation = text.match(/<ShowAnimation\s*:\s*([^\s].*)>/i) || text.match(/<アニメーションの表示\s*:\s*([^\s].*)>/i);
        const show_balloon_icon = text.match(/<ShowBalloonIcon\s*:\s*([^\s].*)>/i) || text.match(/<フキダシアイコンの表示\s*:\s*([^\s].*)>/i);
        const erase_event = text.match(/<EraseEvent>/i) || text.match(/<イベントの一時消去>/);
        const tint_screen = text.match(/<TintScreen\s*:?\s*([^\s]*.*)>/i) || text.match(/<画面の色調変更\s*:?\s*([^\s]*.*)>/i);
        const flash_screen = text.match(/<FlashScreen\s*:\s*([^\s].*)>/i) || text.match(/<画面のフラッシュ\s*:\s*([^\s].*)>/i);
        const shake_screen = text.match(/<ShakeScreen\s*:\s*([^\s].*)>/i) || text.match(/<画面のシェイク\s*:\s*([^\s].*)>/i);
        const set_weather_effect = text.match(/<SetWeatherEffect\s*:\s*([^\s].*)>/i) || text.match(/<天候の設定\s*:\s*([^\s].*)>/i);
        const play_movie = text.match(/<PlayMovie\s*:\s*([^\s].*)>/i) || text.match(/<ムービーの再生\s*:\s*([^\s].*)>/i);
        const battle_processing = text.match(/<BattleProcessing\s*:\s*([^\s].*)>/i) || text.match(/<戦闘の処理\s*:\s*([^\s].*)>/i);
        const shop_processing = text.match(/<ShopProcessing\s*:*\s*([\s\S]*)>/i) || text.match(/<ショップの処理\s*:\s*([^\s].*)>/i);
        const merchandise = text.match(/<Merchandise\s*:\s*([^\s].*)>/i) || text.match(/<商品\s*:\s*([^\s].*)>/i);
        const if_win = text.match(/\s*<IfWin>/i) || text.match(/\s*<勝ったとき>/);
        const if_escape = text.match(/\s*<IfEscape>/i) || text.match(/\s*<逃げたとき>/);
        const if_lose = text.match(/\s*<IfLose>/i) || text.match(/\s*<負けたとき>/);
        const name_input_processing = text.match(/<NameInputProcessing\s*:\s*([^\s].*)>/i) || text.match(/<名前入力の処理\s*:\s*([^\s].*)>/i);
        const open_menu_screen = text.match(/<OpenMenuScreen>/i) || text.match(/<メニュー画面を開く>/);
        const open_save_screen = text.match(/<OpenSaveScreen>/i) || text.match(/<セーブ画面を開く>/);
        const game_over = text.match(/<GameOver>/i) || text.match(/<ゲームオーバー>/);
        const return_to_title_screen = text.match(/<ReturnToTitleScreen>/i) || text.match(/<タイトル画面に戻す>/);
        const change_victory_me = text.match(/<ChangeVictoryMe\s*:\s*([^\s].*)>/i) || text.match(/<勝利MEの変更\s*:\s*([^\s].*)>/i);
        const change_defeat_me = text.match(/<ChangeDefeatMe\s*:\s*([^\s].*)>/i) || text.match(/<敗北MEの変更\s*:\s*([^\s].*)>/i);
        const change_vehicle_bgm = text.match(/<ChangeVehicleBgm\s*:\s*([^\s].*)>/i) || text.match(/<乗り物BGMの変更\s*:\s*([^\s].*)>/i);
        const change_save_access = text.match(/<ChangeSaveAccess\s*:\s*([^\s].*)>/i) || text.match(/<セーブ禁止の変更\s*:\s*([^\s].*)>/i);
        const change_menu_access = text.match(/<ChangeMenuAccess\s*:\s*([^\s].*)>/i) || text.match(/<メニュー禁止の変更\s*:\s*([^\s].*)>/i);
        const change_encounter = text.match(/<ChangeEncounter\s*:\s*([^\s].*)>/i) || text.match(/<エンカウント禁止の変更\s*:\s*([^\s].*)>/i);
        const change_formation_access = text.match(/<ChangeFormationAccess\s*:\s*([^\s].*)>/i) || text.match(/<並び変え禁止の変更\s*:\s*([^\s].*)>/i);
        const change_window_color = text.match(/<ChangeWindowColor\s*:\s*([^\s].*)>/i) || text.match(/<ウィンドウカラーの変更\s*:\s*([^\s].*)>/i);
        const change_actor_images = text.match(/<ChangeActorImages\s*:\s*([^\s].*)>/i) || text.match(/<アクターの画像変更\s*:\s*([^\s].*)>/i);
        const change_vehicle_image = text.match(/<ChangeVehicleImage\s*:\s*([^\s].*)>/i) || text.match(/<乗り物の画像変更\s*:\s*([^\s].*)>/i);
        const change_map_name_display = text.match(/<ChangeMapNameDisplay\s*:\s*([^\s].*)>/i) || text.match(/<マップ名表示の変更\s*:\s*([^\s].*)>/i);
        const change_tileset = text.match(/<ChangeTileset\s*:\s*([^\s].*)>/i) || text.match(/<タイルセットの変更\s*:\s*([^\s].*)>/i);
        const change_battle_background = text.match(/<ChangeBattleBackGround\s*:\s*([^\s].*)>/i) || text.match(/<戦闘背景の変更\s*:\s*([^\s].*)>/i);
        const change_parallax = text.match(/<ChangeParallax\s*:\s*([^\s].*)>/i) || text.match(/<遠景の変更\s*:\s*([^\s].*)>/i);
        const get_location_info = text.match(/<GetLocationInfo\s*:\s*([^\s].*)>/i) || text.match(/<指定位置の情報取得\s*:\s*([^\s].*)>/i);
        const change_enemy_hp = text.match(/<ChangeEnemyHp\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラのHP増減\s*:\s*([^\s].*)>/i);
        const change_enemy_mp = text.match(/<ChangeEnemyMp\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラのMP増減\s*:\s*([^\s].*)>/i);
        const change_enemy_tp = text.match(/<ChangeEnemyTp\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラのTP増減\s*:\s*([^\s].*)>/i);
        const change_enemy_state = text.match(/<ChangeEnemyState\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラのステート変更\s*:\s*([^\s].*)>/i);
        const enemy_recover_all = text.match(/<EnemyRecoverAll\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラの全回復\s*:\s*([^\s].*)>/i);
        const enemy_appear = text.match(/<EnemyAppear\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラの出現\s*:\s*([^\s].*)>/i);
        const enemy_transform = text.match(/<EnemyTransform\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラの変身\s*:\s*([^\s].*)>/i);
        const show_battle_animation = text.match(/<ShowBattleAnimation\s*:\s*([^\s].*)>/i) || text.match(/<戦闘アニメーションの表示\s*:\s*([^\s].*)>/i);
        const force_action = text.match(/<ForceAction\s*:\s*([^\s].*)>/i) || text.match(/<戦闘行動の強制\s*:\s*([^\s].*)>/i);
        const abort_battle = text.match(/<AbortBattle>/i) || text.match(/<バトルの中断>/);
        const script_block = text.match(/#SCRIPT_BLOCK[0-9]+#/i);
        const comment_block = text.match(/#COMMENT_BLOCK[0-9]+#/i);
        const scrolling_block = text.match(/#SCROLLING_BLOCK[0-9]+#/i);
        if (script_block) {
          const block_tag = script_block[0];
          return block_map[block_tag];
        }
        if (comment_block) {
          const block_tag = comment_block[0];
          return block_map[block_tag];
        }
        if (scrolling_block) {
          const block_tag = scrolling_block[0];
          return block_map[block_tag];
        }
        if (plugin_command) {
          return [getPluginCommandEvent(plugin_command[1])];
        }
        if (plugin_command_mz) {
          const params = plugin_command_mz[1].split(",").map((s) => s.trim());
          const event_command_list3 = [];
          if (params.length > 2) {
            const arg_plugin_name = params[0];
            const arg_plugin_command = params[1];
            const arg_disp_plugin_command = params[2];
            const pcz_args = params.slice(3);
            const pcemz = getPluginCommandEventMZ(
              arg_plugin_name,
              arg_plugin_command,
              arg_disp_plugin_command,
              pcz_args
            );
            event_command_list3.push(pcemz);
            pcz_args.map((arg) => event_command_list3.push(getPluginCommandMzParamsComment(arg)));
          } else {
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
          return event_command_list3;
        }
        if (common_event) {
          const event_num = Number(common_event[1]);
          if (event_num) {
            return [getCommonEventEvent(event_num)];
          } else {
            throw new Error(
              "Syntax error. / 文法エラーです。" + common_event[1] + " is not number. / " + common_event[1] + "は整数ではありません"
            );
          }
        }
        if (wait) {
          const wait_num = Number(wait[1]);
          if (wait_num) {
            return [getWaitEvent(wait_num)];
          } else {
            throw new Error(
              "Syntax error. / 文法エラーです。" + common_event[1] + " is not number. / " + common_event[1] + "は整数ではありません"
            );
          }
        }
        if (fadein) {
          return [getFadeinEvent()];
        }
        if (fadeout) {
          return [getFadeoutEvent()];
        }
        if (stop_bgm) {
          return [getStopBgmEvent(90, 100, 0)];
        }
        if (play_bgm) {
          if (play_bgm[1]) {
            const params = play_bgm[1].replace(/ /g, "").split(",");
            let name = "Battle1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
            if (params[0]) {
              name = params[0];
            }
            if (Number(params[1]) || Number(params[1]) === 0) {
              volume = Number(params[1]);
            }
            if (Number(params[2]) || Number(params[2]) === 0) {
              pitch = Number(params[2]);
            }
            if (Number(params[3]) || Number(params[3]) === 0) {
              pan = Number(params[3]);
            }
            if (name.toUpperCase() === "NONE" || name === "なし") {
              return [getPlayBgmEvent("", volume, pitch, pan)];
            } else {
              return [getPlayBgmEvent(name, volume, pitch, pan)];
            }
          }
        }
        if (fadeout_bgm) {
          if (fadeout_bgm[1]) {
            let duration = 10;
            const d = fadeout_bgm[1].replace(/ /g, "");
            if (Number(d) || Number(d) === 0) {
              duration = Number(d);
            }
            return [getFadeoutBgmEvent(duration)];
          }
        }
        if (save_bgm) {
          return [getSaveBgmEvent()];
        }
        if (replay_bgm) {
          return [getReplayBgmEvent()];
        }
        if (change_battle_bgm) {
          if (change_battle_bgm[1]) {
            const params = change_battle_bgm[1].replace(/ /g, "").split(",");
            let name = "Battle1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
            if (params[0]) {
              name = params[0];
            }
            if (Number(params[1]) || Number(params[1]) === 0) {
              volume = Number(params[1]);
            }
            if (Number(params[2]) || Number(params[2]) === 0) {
              pitch = Number(params[2]);
            }
            if (Number(params[3]) || Number(params[3]) === 0) {
              pan = Number(params[3]);
            }
            if (name.toUpperCase() === "NONE" || name === "なし") {
              return [getChangeBattleBgmEvent("", volume, pitch, pan)];
            } else {
              return [getChangeBattleBgmEvent(name, volume, pitch, pan)];
            }
          }
        }
        if (stop_bgs) {
          return [getStopBgsEvent(90, 100, 0)];
        }
        if (play_bgs) {
          if (play_bgs[1]) {
            const params = play_bgs[1].replace(/ /g, "").split(",");
            let name = "City";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
            if (params[0]) {
              name = params[0];
            }
            if (Number(params[1]) || Number(params[1]) === 0) {
              volume = Number(params[1]);
            }
            if (Number(params[2]) || Number(params[2]) === 0) {
              pitch = Number(params[2]);
            }
            if (Number(params[3]) || Number(params[3]) === 0) {
              pan = Number(params[3]);
            }
            if (name.toUpperCase() === "NONE" || name === "なし") {
              return [getPlayBgsEvent("", volume, pitch, pan)];
            } else {
              return [getPlayBgsEvent(name, volume, pitch, pan)];
            }
          }
        }
        if (fadeout_bgs) {
          if (fadeout_bgs[1]) {
            let duration = 10;
            const d = fadeout_bgs[1].replace(/ /g, "");
            if (Number(d) || Number(d) === 0) {
              duration = Number(d);
            }
            return [getFadeoutBgsEvent(duration)];
          }
        }
        if (play_se) {
          if (play_se[1]) {
            const params = play_se[1].replace(/ /g, "").split(",");
            let name = "Attack1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
            if (params[0]) {
              name = params[0];
            }
            if (Number(params[1]) || Number(params[1]) === 0) {
              volume = Number(params[1]);
            }
            if (Number(params[2]) || Number(params[2]) === 0) {
              pitch = Number(params[2]);
            }
            if (Number(params[3]) || Number(params[3]) === 0) {
              pan = Number(params[3]);
            }
            if (name.toUpperCase() === "NONE" || name === "なし") {
              return [getPlaySeEvent("", volume, pitch, pan)];
            } else {
              return [getPlaySeEvent(name, volume, pitch, pan)];
            }
          }
        }
        if (stop_se) {
          return [getStopSeEvent()];
        }
        if (stop_me) {
          return [getStopMeEvent(90, 100, 0)];
        }
        if (play_me) {
          if (play_me[1]) {
            const params = play_me[1].replace(/ /g, "").split(",");
            let name = "Curse1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
            if (params[0]) {
              name = params[0];
            }
            if (Number(params[1]) || Number(params[1]) === 0) {
              volume = Number(params[1]);
            }
            if (Number(params[2]) || Number(params[2]) === 0) {
              pitch = Number(params[2]);
            }
            if (Number(params[3]) || Number(params[3]) === 0) {
              pan = Number(params[3]);
            }
            if (name.toUpperCase() === "NONE" || name === "なし") {
              return [getPlayMeEvent("", volume, pitch, pan)];
            } else {
              return [getPlayMeEvent(name, volume, pitch, pan)];
            }
          }
        }
        const num_char_regex = "\\w゠-ヿ぀-ゟ々-〆ム-鿏";
        const control_variable_arg_regex = ".+";
        const set_operation_list = ["set", "代入", "="];
        const set_reg_list = set_operation_list.map(
          (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
        );
        const set = text.match(new RegExp(set_reg_list.join("|"), "i"));
        const add_operation_list = ["add", "加算", "\\+"];
        const add_reg_list = add_operation_list.map(
          (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
        );
        const add = text.match(new RegExp(add_reg_list.join("|"), "i"));
        const sub_operation_list = ["sub", "減算", "-"];
        const sub_reg_list = sub_operation_list.map(
          (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
        );
        const sub = text.match(new RegExp(sub_reg_list.join("|"), "i"));
        const mul_operation_list = ["mul", "乗算", "\\*"];
        const mul_reg_list = mul_operation_list.map(
          (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
        );
        const mul = text.match(new RegExp(mul_reg_list.join("|"), "i"));
        const div_operation_list = ["div", "除算", "\\/"];
        const div_reg_list = div_operation_list.map(
          (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
        );
        const div = text.match(new RegExp(div_reg_list.join("|"), "i"));
        const mod_operation_list = ["mod", "剰余", "\\%"];
        const mod_reg_list = mod_operation_list.map(
          (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
        );
        const mod = text.match(new RegExp(mod_reg_list.join("|"), "i"));
        const switch_operation_list = ["sw", "switch", "スイッチ"];
        const switch_reg_list = switch_operation_list.map(
          (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
        );
        const switch_tag = text.match(new RegExp(switch_reg_list.join("|"), "i"));
        const self_switch_operation_list = ["ssw", "selfswitch", "セルフスイッチ"];
        const self_switch_reg_list = self_switch_operation_list.map(
          (x) => `<${x} *: *([abcd]) *, *(${control_variable_arg_regex}) *>`
        );
        const self_switch_tag = text.match(new RegExp(self_switch_reg_list.join("|"), "i"));
        const getControlTag = function(operator, operand1, operand2) {
          if (operator === "selfswitch") {
            const selfswitch_target = operand1.match(/[abcd]/i);
            const selfswitch_value = operand2.match(/on|オン|1|true|off|オフ|0|false/i);
            if (selfswitch_target && selfswitch_value) {
              return getControlSelfSwitch(selfswitch_target[0], selfswitch_value[0]);
            }
          }
          const operand1_num = operand1.match(/\d+/i);
          const operand1_range = operand1.match(/(\d+)-(\d+)/i);
          let start_pointer = 0;
          let end_pointer = 0;
          if (operand1_range) {
            start_pointer = parseInt(operand1_range[1]);
            end_pointer = parseInt(operand1_range[2]);
          } else if (operand1_num) {
            const num = parseInt(operand1_num[0]);
            start_pointer = num;
            end_pointer = num;
          } else {
            throw new Error("Syntax error. / 文法エラーです。");
          }
          if (operator === "switch") {
            const switch_tag2 = operand2.match(/on|オン|1|true|off|オフ|0|false/i);
            if (switch_tag2) {
              return getControlSwitch(start_pointer, end_pointer, switch_tag2[0]);
            }
          }
          const variables = operand2.match(/v\[(\d+)\]|variables\[(\d+)\]|変数\[(\d+)\]/i);
          if (variables) {
            const num = variables[1] || variables[2] || variables[3];
            return getControlValiable(operator, start_pointer, end_pointer, "variables", parseInt(num));
          }
          const random = operand2.match(
            /r\[(\-?\d+)\]\[(\-?\d+)\]|random\[(\-?\d+)\]\[(\-?\d+)\]|乱数\[(\-?\d+)\]\[(\-?\d+)\]/i
          );
          if (random) {
            const random_range1 = random[1] || random[3] || random[5];
            const random_range2 = random[2] || random[4] || random[6];
            return getControlValiable(
              operator,
              start_pointer,
              end_pointer,
              "random",
              parseInt(random_range1),
              parseInt(random_range2)
            );
          }
          const gamedata_operation_list = ["gd", "gamedata", "ゲームデータ"];
          const gamedata_reg_list = gamedata_operation_list.map((x) => `(${x})(${control_variable_arg_regex})`);
          const gamedata = operand2.match(new RegExp(gamedata_reg_list.join("|"), "i"));
          if (gamedata) {
            const func = gamedata[2] || gamedata[4] || gamedata[6];
            const gamedata_key_match = func.match(new RegExp(`\\[([${num_char_regex}]+)\\]`, "i"));
            if (gamedata_key_match) {
              const gamedata_key = gamedata_key_match[1];
              switch (gamedata_key.toLowerCase()) {
                case "mapid":
                case "マップid":
                case "partymembers":
                case "パーティ人数":
                case "gold":
                case "所持金":
                case "steps":
                case "歩数":
                case "playtime":
                case "プレイ時間":
                case "timer":
                case "タイマー":
                case "savecount":
                case "セーブ回数":
                case "battlecount":
                case "戦闘回数":
                case "wincount":
                case "勝利回数":
                case "escapecount":
                case "逃走回数": {
                  return getControlValiable(
                    operator,
                    start_pointer,
                    end_pointer,
                    "gamedata",
                    "other",
                    gamedata_key.toLowerCase(),
                    0
                  );
                }
                case "item":
                case "アイテム":
                case "weapon":
                case "武器":
                case "armor":
                case "防具":
                case "party":
                case "パーティ": {
                  const args2 = func.match(new RegExp(`\\[[${num_char_regex}]+\\]\\[([${num_char_regex}]+)\\]`, "i"));
                  if (args2) {
                    const arg1 = args2[1];
                    return getControlValiable(
                      operator,
                      start_pointer,
                      end_pointer,
                      "gamedata",
                      gamedata_key.toLowerCase(),
                      parseInt(arg1)
                    );
                  }
                  break;
                }
                case "last":
                case "直前": {
                  const args2 = func.match(new RegExp(`\\[[${num_char_regex}]+\\]\\[([${num_char_regex} ]+)\\]`, "i"));
                  if (args2) {
                    const arg1 = args2[1];
                    return getControlValiable(
                      operator,
                      start_pointer,
                      end_pointer,
                      "gamedata",
                      gamedata_key.toLowerCase(),
                      arg1
                    );
                  }
                  break;
                }
                case "actor":
                case "アクター":
                case "enemy":
                case "敵キャラ":
                case "エネミー":
                case "character":
                case "キャラクター": {
                  const args2 = func.match(
                    new RegExp(
                      `\\[[${num_char_regex}]+\\]\\[([${num_char_regex}\\-]+)\\]\\[([${num_char_regex}\\.]+)\\]`,
                      "i"
                    )
                  );
                  if (args2) {
                    const arg1 = args2[1];
                    const arg2 = args2[2];
                    return getControlValiable(
                      operator,
                      start_pointer,
                      end_pointer,
                      "gamedata",
                      gamedata_key.toLowerCase(),
                      arg1,
                      arg2
                    );
                  }
                  break;
                }
              }
            }
          }
          const script = operand2.match(/sc\[(.+)\]|script\[(.+)\]|スクリプト\[(.+)\]/i);
          if (script) {
            const script_body = script[1] || script[2] || script[3];
            return getControlValiable(operator, start_pointer, end_pointer, "script", script_body);
          }
          const value_num = Number(operand2);
          return getControlValiable(operator, start_pointer, end_pointer, "constant", value_num);
        };
        if (set) {
          const operand1 = set[1] || set[3] || set[5];
          const operand2 = set[2] || set[4] || set[6];
          return [getControlTag("set", operand1, operand2)];
        }
        if (add) {
          const operand1 = add[1] || add[3] || add[5];
          const operand2 = add[2] || add[4] || add[6];
          return [getControlTag("add", operand1, operand2)];
        }
        if (sub) {
          const operand1 = sub[1] || sub[3] || sub[5];
          const operand2 = sub[2] || sub[4] || sub[6];
          return [getControlTag("sub", operand1, operand2)];
        }
        if (mul) {
          const operand1 = mul[1] || mul[3] || mul[5];
          const operand2 = mul[2] || mul[4] || mul[6];
          return [getControlTag("mul", operand1, operand2)];
        }
        if (div) {
          const operand1 = div[1] || div[3] || div[5];
          const operand2 = div[2] || div[4] || div[6];
          return [getControlTag("div", operand1, operand2)];
        }
        if (mod) {
          const operand1 = mod[1] || mod[3] || mod[5];
          const operand2 = mod[2] || mod[4] || mod[6];
          return [getControlTag("mod", operand1, operand2)];
        }
        if (switch_tag) {
          const operand1 = switch_tag[1] || switch_tag[3] || switch_tag[5];
          const operand2 = switch_tag[2] || switch_tag[4] || switch_tag[6];
          return [getControlTag("switch", operand1, operand2)];
        }
        if (self_switch_tag) {
          const operand1 = self_switch_tag[1] || self_switch_tag[3] || self_switch_tag[5];
          const operand2 = self_switch_tag[2] || self_switch_tag[4] || self_switch_tag[6];
          return [getControlTag("selfswitch", operand1, operand2)];
        }
        const timer_start_reg_list = ["timer", "タイマー"].map((x) => `<${x} *: *(.+) *, *(\\d+), *(\\d+) *>`);
        const timer_start = text.match(new RegExp(timer_start_reg_list.join("|"), "i"));
        const timer_stop_reg_list = ["timer", "タイマー"].map((x) => `<${x} *: *(.+) *>`);
        const timer_stop = text.match(new RegExp(timer_stop_reg_list.join("|"), "i"));
        if (timer_start) {
          const operand1 = timer_start[1] || timer_start[4];
          const min = parseInt(timer_start[2] || timer_start[5]);
          const sec = parseInt(timer_start[3] || timer_start[6]);
          const setting_sec = 60 * min + sec;
          return [getControlTimer(operand1, setting_sec)];
        }
        if (timer_stop) {
          const operand1 = timer_stop[1] || timer_stop[2];
          return [getControlTimer(operand1, 0)];
        }
        if (show_picture) {
          const params = show_picture[1].split(",").map((s) => s.trim());
          if (params.length > 1) {
            const pic_no = Number(params[0]);
            const name = params[1];
            const options = params.slice(2);
            return [getShowPicture(pic_no, name, options)];
          } else {
            console.error(text);
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        }
        if (move_picture) {
          const params = move_picture[1].split(",").map((s) => s.trim());
          if (params.length > 0) {
            const pic_no = Number(params[0]);
            const options = params.slice(1);
            return [getMovePicture(pic_no, options)];
          } else {
            console.error(text);
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        }
        if (rotate_picture) {
          const pic_no = Number(rotate_picture[1]);
          const speed = Number(rotate_picture[2]);
          return [getRotatePicture(pic_no, speed)];
        }
        if (tint_picture) {
          const params = tint_picture[1].split(",").map((s) => s.trim());
          if (params.length > 0) {
            const pic_no = Number(params[0]);
            const options = params.slice(1);
            return [getTintPicture(pic_no, options)];
          } else {
            console.error(text);
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        }
        if (erase_picture) {
          const pic_no = Number(erase_picture[1]);
          return [getErasePicture(pic_no)];
        }
        if (conditional_branch_if) {
          const args2 = conditional_branch_if[1].split(",");
          if (args2.length > 0) {
            const target = args2[0].trim();
            const params = args2.slice(1);
            return [getConditionalBranch(target, params)];
          } else {
            console.error(text);
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        }
        if (conditional_branch_else) {
          const event_command_list3 = [];
          event_command_list3.push(getCommandBottomEvent());
          event_command_list3.push(getElse());
          return event_command_list3;
        }
        if (conditional_branch_end) {
          const current_block = block_stack.slice(-1)[0];
          const CHOICE_CODE = 102;
          const BATTLE_PROCESSING_CODE = 301;
          if (Boolean(current_block) && current_block.code === CHOICE_CODE) {
            return [getBlockEnd(), getShowChoiceEnd()];
          } else if (Boolean(current_block) && current_block.code === BATTLE_PROCESSING_CODE) {
            return [getBlockEnd(), getIfEnd()];
          } else {
            return [getCommandBottomEvent(), getEnd()];
          }
        }
        if (loop) {
          return [getLoop()];
        }
        if (repeat_above) {
          const event_command_list3 = [];
          event_command_list3.push(getCommandBottomEvent());
          event_command_list3.push(getRepeatAbove());
          return event_command_list3;
        }
        if (break_loop) {
          return [getBreakLoop()];
        }
        if (exit_event_processing) {
          return [getExitEventProcessing()];
        }
        if (label) {
          const label_name = label[1] || "";
          return [getLabel(label_name)];
        }
        if (jump_to_label) {
          const label_name = jump_to_label[1] || "";
          return [getJumpToLabel(label_name)];
        }
        if (input_number) {
          const val_num = Number(input_number[1]);
          const num_of_digits = Number(input_number[2]);
          return [getInputNumber(val_num, num_of_digits)];
        }
        if (select_item) {
          const val_num = Number(select_item[1]);
          const item_type = select_item[2];
          return [getSelectItem(val_num, item_type)];
        }
        if (show_choices) {
          const params = show_choices[1].split(",").filter((s) => s).map((s) => s.trim());
          let window_type = 0;
          let window_position2 = 2;
          let default_choice = 0;
          let default_cancel = 1;
          let exist_default_choice = false;
          params.forEach((p) => {
            try {
              window_type = getBackground(p);
              return;
            } catch (e) {
            }
            try {
              window_position2 = getChoiceWindowPosition(p);
              return;
            } catch (e) {
            }
            switch (p.toLowerCase()) {
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
                exist_default_choice = true;
                return;
            }
            if (!isNaN(Number(p))) {
              if (exist_default_choice) {
                default_cancel = Number(p) - 1;
              } else {
                default_choice = Number(p) - 1;
                exist_default_choice = true;
              }
            }
          });
          return [getShowChoices(window_type, window_position2, default_choice, default_cancel)];
        }
        if (show_choice_when) {
          const index = 0;
          const text2 = show_choice_when[1];
          return [getShowChoiceWhen(index, text2)];
        }
        if (show_choice_when_cancel) {
          return [getShowChoiceWhenCancel()];
        }
        if (face) {
          if (!frame_param) {
            frame_param = getPretextEvent();
          }
          const face_number = face[1].match(/.*\((.+?)\)/i);
          if (face_number) {
            frame_param.parameters[0] = face[1].replace(/\(\d\)/, "");
            frame_param.parameters[1] = parseInt(face_number[1]);
            text = text.replace(face[0], "");
          } else {
            console.error(text);
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        }
        if (background) {
          if (!frame_param) {
            frame_param = getPretextEvent();
          }
          try {
            frame_param.parameters[2] = getBackground(background[1]);
          } catch (e) {
            console.error(text);
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
          text = text.replace(background[0], "");
        }
        if (window_position) {
          if (!frame_param) {
            frame_param = getPretextEvent();
          }
          try {
            frame_param.parameters[3] = getWindowPosition(window_position[1]);
          } catch (e) {
            console.error(text);
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
          text = text.replace(window_position[0], "");
        }
        if (namebox) {
          if (!frame_param) {
            frame_param = getPretextEvent();
          }
          frame_param.parameters[4] = namebox[1];
          text = text.replace(namebox[0], "");
        }
        const event_command_list2 = [];
        if (face || background || window_position || namebox) {
          if (frame_param) {
            logger.log("push: ", frame_param.parameters);
            event_command_list2.push(frame_param);
          }
        }
        const constant_regexp = /^\d+$/;
        const variable_regexp = /(?:variables|v|変数)\[([0-9]+)\]/i;
        const actor_regexp = /(?:actors|v|アクター)\[([0-9]+)\]/i;
        const operationIncreaseList = ["increase", "+", "増やす"];
        const operationDecreaseList = ["decrease", "-", "減らす"];
        const operationAddList = ["add", "+", "加える", "付加"];
        const operationRemoveList = ["remove", "-", "外す", "解除"];
        const operationLearnList = ["learn", "+", "覚える"];
        const operationForgetList = ["forget", "-", "忘れる"];
        const locationDirectList = ["direct", "0", "直接指定"];
        const locationEventVariablesList = ["withvariables", "変数で指定"];
        const locationExchangeList = ["exchange", "2", "交換"];
        const troopRandomEncountList = ["random", "2", "ランダム"];
        const locationDesignationList = ["character", "2", "キャラクターで指定", "キャラクター"];
        const directionRetainList = ["retain", "0", "そのまま"];
        const directionDownList = ["down", "2", "下"];
        const directionLeftList = ["left", "4", "左"];
        const directionRightList = ["right", "6", "右"];
        const directionUpList = ["up", "8", "上"];
        const fadeBlackList = ["black", "0", "黒"];
        const fadeWhiteList = ["white", "1", "白"];
        const fadeNoneList = ["none", "2", "なし"];
        const vehicleBoatList = ["boat", "0", "小型船"];
        const vehicleShipList = ["ship", "1", "大型船"];
        const vehicleAirshipList = ["airship", "2", "飛行船"];
        const speedX8SlowerList = ["x8 slower", "1", "1/8倍速"];
        const speedX4SlowerList = ["x4 slower", "2", "1/4倍速"];
        const speedX2SlowerList = ["x2 slower", "3", "1/2倍速"];
        const speedNormalList = ["normal", "4", "標準速"];
        const speedX2FasterList = ["x2 faster", "5", "2倍速"];
        const speedX4FasterList = ["x4 faster", "6", "4倍速"];
        const infoTypeTerrainTagList = ["terrain tag", "0", "地形タグ"];
        const infoTypeEventIdList = ["event id", "1", "イベントid"];
        const infoTypeLayer1List = ["layer 1", "2", "レイヤー１"];
        const infoTypeLayer2List = ["layer 2", "3", "レイヤー２"];
        const infoTypeLayer3List = ["layer 3", "4", "レイヤー３"];
        const infoTypeLayer4List = ["layer 4", "5", "レイヤー４"];
        const infoTypeRegionIdList = ["region id", "6", "リージョンid"];
        const frequencyLowestList = ["lowest", "1", "最低"];
        const frequencyLowerList = ["lower", "2", "低"];
        const frequencynormalList = ["normal", "3", "標準"];
        const frequencyHigherList = ["higher", "4", "高"];
        const frequencyHighestList = ["highest", "5", "最高"];
        const blendModeNormalList = ["normal", "0", "通常"];
        const blendModeAdditiveList = ["additive", "1", "加算"];
        const blendModeMultiplyList = ["multiply", "2", "乗算"];
        const blendModeScreenList = ["screen", "3", "スクリーン"];
        const actorMaxHpList = ["maxhp", "0", "最大hp"];
        const actorMaxMpList = ["maxmp", "1", "最大mp"];
        const actorAttackList = ["attack", "2", "攻撃力"];
        const actorDefenseList = ["defense", "3", "防御力"];
        const actorMAttackList = ["m.attack", "4", "魔法力"];
        const actorMDefenseList = ["m.defense", "5", "魔法防御"];
        const actorAgilityList = ["agility", "6", "敏捷性"];
        const actorLuckList = ["luck", "7", "運"];
        const equipmentItemList = ["none", "なし", "0"];
        const characterPlayerList = ["player", "-1", "プレイヤー"];
        const characterThisEventList = ["this event", "0", "このイベント"];
        const balloonIconExclamationList = ["exclamation", "1", "びっくり"];
        const balloonIconQuestionList = ["question", "2", "はてな"];
        const balloonIconMusicNoteList = ["music note", "3", "音符"];
        const balloonIconHeartList = ["heart", "4", "ハート"];
        const balloonIconAngerList = ["anger", "5", "怒り"];
        const balloonIconSweatList = ["sweat", "6", "汗"];
        const balloonIconFlustrationList = ["flustration", "cobweb", "7", "くしゃくしゃ"];
        const balloonIconSilenceList = ["silence", "8", "沈黙"];
        const balloonIconLightBulbList = ["light bulb", "9", "電球"];
        const balloonIconZzzList = ["zzz", "10", "zzz"];
        const balloonIconUserDefined1List = ["user-defined1", "11", "ユーザー定義1"];
        const balloonIconUserDefined2List = ["user-defined2", "12", "ユーザー定義2"];
        const balloonIconUserDefined3List = ["user-defined3", "13", "ユーザー定義3"];
        const balloonIconUserDefined4List = ["user-defined4", "14", "ユーザー定義4"];
        const balloonIconUserDefined5List = ["user-defined5", "15", "ユーザー定義5"];
        const weatherNoneList = ["none", "なし"];
        const weatherRainList = ["rain", "雨"];
        const weatherStormList = ["storm", "嵐"];
        const weatherSnowList = ["snow", "雪"];
        const merchandiseItemList = ["item", "0", "アイテム"];
        const merchandiseWeaponList = ["weapon", "1", "武器"];
        const merchandiseArmorList = ["armor", "2", "防具"];
        const priceStandardList = ["standard", "0", "標準"];
        const actionTargetLastTargetList = ["last target", "-1", "ラストターゲット"];
        const actionTargetRandomList = ["random", "0", "ランダム"];
        const actionTargetIndex1List = ["index 1", "1", "インデックス１"];
        const actionTargetIndex2List = ["index 2", "2", "インデックス２"];
        const actionTargetIndex3List = ["index 3", "3", "インデックス３"];
        const actionTargetIndex4List = ["index 4", "4", "インデックス４"];
        const actionTargetIndex5List = ["index 5", "5", "インデックス５"];
        const actionTargetIndex6List = ["index 6", "6", "インデックス６"];
        const actionTargetIndex7List = ["index 7", "7", "インデックス７"];
        const actionTargetIndex8List = ["index 8", "8", "インデックス８"];
        const checkBoxOnList = ["true", "on", "オン", "1"];
        const checkBoxOffList = ["false", "off", "オフ", "0"];
        const checkBoxWaitList = ["wait for completion", "完了までウェイト", "wait"];
        const checkBoxPurchaseOnlyList = ["purchase only", "購入のみ"];
        const checkBoxRepeatList = ["repeat", "repeat movements", "動作を繰り返す"];
        const checkBoxSkipList = ["skip", "skip if cannot move", "移動できない場合は飛ばす"];
        const checkBoxEquipmentList = ["include equipment", "装備品を含む"];
        const checkBoxInitializeList = ["initialize", "初期化"];
        const checkBoxKnockoutList = ["allow knockout", "戦闘不能を許可"];
        const checkBoxLevelUpList = ["show level up", "レベルアップを表示"];
        const checkBoxSaveExpList = ["save exp", "経験値の保存", "save level", "レベルの保存"];
        const checkBoxLoopHorizontallyList = ["loophorizontally", "横方向にループする"];
        const checkBoxLoopVerticallyList = ["loopvertically", "縦方向にループする"];
        const radioButtonOnList = ["true", "on", "オン", "0"];
        const radioButtonOffList = ["false", "off", "オフ", "1"];
        const radioButtonDisableList = ["disable", "0", "禁止"];
        const radioButtonEnableList = ["enable", "1", "許可"];
        const enemyTargetList = ["entire troop", "敵グループ全体"];
        const actorTargetList = ["entire party", "パーティ全体"];
        const getIncreaseOrDecrease = (operationType) => {
          if (operationIncreaseList.includes(operationType)) {
            return 0;
          } else if (operationDecreaseList.includes(operationType)) {
            return 1;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getAddOrRemove = (operationType) => {
          if (operationAddList.includes(operationType)) {
            return 0;
          } else if (operationRemoveList.includes(operationType)) {
            return 1;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getLearnOrForget = (operationType) => {
          if (operationLearnList.includes(operationType)) {
            return 0;
          } else if (operationForgetList.includes(operationType)) {
            return 1;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getConstantOrVariable = (operandValue) => {
          if (operandValue.match(constant_regexp)) {
            return { operand: 0, operandValue: Number(operandValue) };
          } else if (operandValue.match(variable_regexp)) {
            return { operand: 1, operandValue: Number(operandValue.match(variable_regexp)[1]) };
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getFixedOrVariable = (operandValue) => {
          if (operandValue.match(constant_regexp)) {
            return { actor: 0, actorValue: Number(operandValue) };
          } else if (actorTargetList.includes(operandValue)) {
            return { actor: 0, actorValue: 0 };
          } else if (operandValue.match(variable_regexp)) {
            return { actor: 1, actorValue: Number(operandValue.match(variable_regexp)[1]) };
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getEnemyOrActor = (subject) => {
          if (subject.match(constant_regexp)) {
            return { subject: 0, subjectValue: Number(subject) - 1 };
          } else if (subject.match(actor_regexp)) {
            return { subject: 1, subjectValue: Number(subject.match(actor_regexp)[1]) };
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getCheckBoxValue = (checkBoxValue) => {
          if (checkBoxOnList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxWaitList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxPurchaseOnlyList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxRepeatList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxSkipList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxEquipmentList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxInitializeList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxKnockoutList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxLevelUpList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxSaveExpList.includes(checkBoxValue)) {
            return true;
          } else if (checkBoxOffList.includes(checkBoxValue)) {
            return false;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getOnOffRadioButtonValue = (checkBoxValue) => {
          if (radioButtonOnList.includes(checkBoxValue)) {
            return 0;
          } else if (radioButtonOffList.includes(checkBoxValue)) {
            return 1;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getDisableEnableRadioButtonValue = (radioButtonValue) => {
          if (radioButtonDisableList.includes(radioButtonValue)) {
            return 0;
          } else if (radioButtonEnableList.includes(radioButtonValue)) {
            return 1;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getLocationValue = (location) => {
          if (locationDirectList.includes(location)) {
            return 0;
          } else if (locationEventVariablesList.includes(location)) {
            return 1;
          } else if (locationExchangeList.includes(location) || locationDesignationList.includes(location)) {
            return 2;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getLocationEvent = (matches1, matches2, matches4) => {
          if (locationDirectList.includes(matches1)) {
            return { locationType: 0, locationX: parseInt(matches2), locationY: parseInt(matches4) };
          } else if (locationEventVariablesList.includes(matches1)) {
            return { locationType: 1, locationX: parseInt(matches2), locationY: parseInt(matches4) };
          } else if (locationDesignationList.includes(matches1)) {
            if (characterPlayerList.includes(matches2)) {
              return { locationType: 2, locationX: -1, locationY: 0 };
            } else if (characterThisEventList.includes(matches2)) {
              return { locationType: 2, locationX: 0, locationY: 0 };
            } else if (!isNaN(parseInt(matches2))) {
              return { locationType: 2, locationX: parseInt(matches2), locationY: 0 };
            } else {
              throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
            }
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getTroopValue = (troop) => {
          if (troop.match(constant_regexp)) {
            return { troop: 0, troopValue: Number(troop) };
          } else if (troop.match(variable_regexp)) {
            return { troop: 1, troopValue: Number(troop.match(variable_regexp)[1]) };
          } else if (troopRandomEncountList.includes(troop)) {
            return { troop: 2, troopValue: 0 };
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getDirectionValue = (direction) => {
          if (directionRetainList.includes(direction)) {
            return 0;
          } else if (directionDownList.includes(direction)) {
            return 2;
          } else if (directionLeftList.includes(direction)) {
            return 4;
          } else if (directionRightList.includes(direction)) {
            return 6;
          } else if (directionUpList.includes(direction)) {
            return 8;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getFadeValue = (fade) => {
          if (fadeBlackList.includes(fade)) {
            return 0;
          } else if (fadeWhiteList.includes(fade)) {
            return 1;
          } else if (fadeNoneList.includes(fade)) {
            return 2;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getVehicleValue = (vehicle) => {
          if (vehicleBoatList.includes(vehicle)) {
            return 0;
          } else if (vehicleShipList.includes(vehicle)) {
            return 1;
          } else if (vehicleAirshipList.includes(vehicle)) {
            return 2;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getSpeedValue = (speed) => {
          if (speedX8SlowerList.includes(speed)) {
            return 1;
          } else if (speedX4SlowerList.includes(speed)) {
            return 2;
          } else if (speedX2SlowerList.includes(speed)) {
            return 3;
          } else if (speedNormalList.includes(speed)) {
            return 4;
          } else if (speedX2FasterList.includes(speed)) {
            return 5;
          } else if (speedX4FasterList.includes(speed)) {
            return 6;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getFrequencyValue = (frequency) => {
          if (frequencyLowestList.includes(frequency)) {
            return 1;
          } else if (frequencyLowerList.includes(frequency)) {
            return 2;
          } else if (frequencynormalList.includes(frequency)) {
            return 3;
          } else if (frequencyHigherList.includes(frequency)) {
            return 4;
          } else if (frequencyHighestList.includes(frequency)) {
            return 5;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getBlendModeValue = (blendMode) => {
          if (blendModeNormalList.includes(blendMode)) {
            return 0;
          } else if (blendModeAdditiveList.includes(blendMode)) {
            return 1;
          } else if (blendModeMultiplyList.includes(blendMode)) {
            return 2;
          } else if (blendModeScreenList.includes(blendMode)) {
            return 3;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getLocationInfoTypeValue = (infoType) => {
          if (infoTypeTerrainTagList.includes(infoType)) {
            return 0;
          } else if (infoTypeEventIdList.includes(infoType)) {
            return 1;
          } else if (infoTypeLayer1List.includes(infoType)) {
            return 2;
          } else if (infoTypeLayer2List.includes(infoType)) {
            return 3;
          } else if (infoTypeLayer3List.includes(infoType)) {
            return 4;
          } else if (infoTypeLayer4List.includes(infoType)) {
            return 5;
          } else if (infoTypeRegionIdList.includes(infoType)) {
            return 6;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getActorParameterValue = (actorParameter) => {
          if (actorMaxHpList.includes(actorParameter)) {
            return 0;
          } else if (actorMaxMpList.includes(actorParameter)) {
            return 1;
          } else if (actorAttackList.includes(actorParameter)) {
            return 2;
          } else if (actorDefenseList.includes(actorParameter)) {
            return 3;
          } else if (actorMAttackList.includes(actorParameter)) {
            return 4;
          } else if (actorMDefenseList.includes(actorParameter)) {
            return 5;
          } else if (actorAgilityList.includes(actorParameter)) {
            return 6;
          } else if (actorLuckList.includes(actorParameter)) {
            return 7;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getChangeEquipmentItemValue = (equipmentItem) => {
          if (equipmentItemList.includes(equipmentItem)) {
            return 0;
          } else if (!isNaN(parseInt(equipmentItem))) {
            return parseInt(equipmentItem);
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getCharacterValue = (character) => {
          if (characterPlayerList.includes(character)) {
            return -1;
          } else if (characterThisEventList.includes(character)) {
            return 0;
          } else if (!isNaN(parseInt(character))) {
            return parseInt(character);
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getBalloonIconValue = (balloonIcon) => {
          if (balloonIconExclamationList.includes(balloonIcon)) {
            return 1;
          } else if (balloonIconQuestionList.includes(balloonIcon)) {
            return 2;
          } else if (balloonIconMusicNoteList.includes(balloonIcon)) {
            return 3;
          } else if (balloonIconHeartList.includes(balloonIcon)) {
            return 4;
          } else if (balloonIconAngerList.includes(balloonIcon)) {
            return 5;
          } else if (balloonIconSweatList.includes(balloonIcon)) {
            return 6;
          } else if (balloonIconFlustrationList.includes(balloonIcon)) {
            return 7;
          } else if (balloonIconSilenceList.includes(balloonIcon)) {
            return 8;
          } else if (balloonIconLightBulbList.includes(balloonIcon)) {
            return 9;
          } else if (balloonIconZzzList.includes(balloonIcon)) {
            return 10;
          } else if (balloonIconUserDefined1List.includes(balloonIcon)) {
            return 11;
          } else if (balloonIconUserDefined2List.includes(balloonIcon)) {
            return 12;
          } else if (balloonIconUserDefined3List.includes(balloonIcon)) {
            return 13;
          } else if (balloonIconUserDefined4List.includes(balloonIcon)) {
            return 14;
          } else if (balloonIconUserDefined5List.includes(balloonIcon)) {
            return 15;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getWeatherTypeValue = (weather) => {
          if (weatherNoneList.includes(weather)) {
            return "none";
          } else if (weatherRainList.includes(weather)) {
            return "rain";
          } else if (weatherStormList.includes(weather)) {
            return "storm";
          } else if (weatherSnowList.includes(weather)) {
            return "snow";
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getMerchandiseType = (merchandise2) => {
          if (merchandiseItemList.includes(merchandise2)) {
            return 0;
          } else if (merchandiseWeaponList.includes(merchandise2)) {
            return 1;
          } else if (merchandiseArmorList.includes(merchandise2)) {
            return 2;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getPriceValue = (price) => {
          if (priceStandardList.includes(price)) {
            return { price: 0, priceValue: 0 };
          } else if (!isNaN(parseInt(price))) {
            return { price: 1, priceValue: parseInt(price) };
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getActionTarget = (target) => {
          if (actionTargetLastTargetList.includes(target)) {
            return -2;
          } else if (actionTargetRandomList.includes(target)) {
            return -1;
          } else if (actionTargetIndex1List.includes(target)) {
            return 0;
          } else if (actionTargetIndex2List.includes(target)) {
            return 1;
          } else if (actionTargetIndex3List.includes(target)) {
            return 2;
          } else if (actionTargetIndex4List.includes(target)) {
            return 3;
          } else if (actionTargetIndex5List.includes(target)) {
            return 4;
          } else if (actionTargetIndex6List.includes(target)) {
            return 5;
          } else if (actionTargetIndex7List.includes(target)) {
            return 6;
          } else if (actionTargetIndex8List.includes(target)) {
            return 7;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getEnemyTargetValue = (enemy) => {
          if (enemyTargetList.includes(enemy)) {
            return -1;
          } else if (!isNaN(parseInt(enemy))) {
            return parseInt(enemy) - 1;
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        const getTargetEnemyMultipleValues = (enemy) => {
          if (enemyTargetList.includes(enemy)) {
            return { enemyValue: 0, isAllChecked: true };
          } else if (!isNaN(parseInt(enemy))) {
            return { enemyValue: parseInt(enemy) - 1, isAllChecked: false };
          } else {
            throw new Error("Syntax error. / 文法エラーです。:" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        };
        if (change_gold) {
          const params = change_gold[1].split(",").map((s) => s.trim().toLowerCase());
          const operation = getIncreaseOrDecrease(params[0].toLowerCase());
          const { operand, operandValue } = getConstantOrVariable(params[1].toLowerCase());
          return [getChangeGold(operation, operand, operandValue)];
        }
        if (change_items) {
          const params = change_items[1].split(",").map((s) => s.trim().toLowerCase());
          const itemId = parseInt(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          return [getChangeItems(itemId, operation, operand, operandValue)];
        }
        if (change_weapons) {
          const params = change_weapons[1].split(",").map((s) => s.trim().toLowerCase());
          const weaponId = parseInt(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          const includeEquipmentFlg = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getChangeWeapons(weaponId, operation, operand, operandValue, includeEquipmentFlg)];
        }
        if (change_armors) {
          const params = change_armors[1].split(",").map((s) => s.trim().toLowerCase());
          const armorId = parseInt(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          const includeEquipmentFlg = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getChangeArmors(armorId, operation, operand, operandValue, includeEquipmentFlg)];
        }
        if (change_party_member) {
          const params = change_party_member[1].split(",").map((s) => s.trim().toLowerCase());
          const actorId = parseInt(params[0]);
          const operation = getAddOrRemove(params[1]);
          const includeEquipmentFlg = params[2] === void 0 ? false : getCheckBoxValue(params[2]);
          return [getChangePartyMember(actorId, operation, includeEquipmentFlg)];
        }
        if (change_hp) {
          const params = change_hp[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          const allowDeathFlg = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getChangeHp(actor, actorValue, operation, operand, operandValue, allowDeathFlg)];
        }
        if (change_mp) {
          const params = change_mp[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          return [getChangeMp(actor, actorValue, operation, operand, operandValue)];
        }
        if (change_tp) {
          const params = change_tp[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          return [getChangeTp(actor, actorValue, operation, operand, operandValue)];
        }
        if (change_state) {
          const params = change_state[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          const operation = getAddOrRemove(params[1]);
          const stateId = parseInt(params[2]);
          return [getChangeState(actor, actorValue, operation, stateId)];
        }
        if (recover_all) {
          const params = recover_all[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          return [getRecoverAll(actor, actorValue)];
        }
        if (change_exp) {
          const params = change_exp[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          const showLevelUpFlg = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getChangeExp(actor, actorValue, operation, operand, operandValue, showLevelUpFlg)];
        }
        if (change_level) {
          const params = change_level[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          const showLevelUpFlg = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getChangeLevel(actor, actorValue, operation, operand, operandValue, showLevelUpFlg)];
        }
        if (change_parameter) {
          const params = change_parameter[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          const parameter = getActorParameterValue(params[1]);
          const operation = getIncreaseOrDecrease(params[2]);
          const { operand, operandValue } = getConstantOrVariable(params[3]);
          return [getChangeParameter(actor, actorValue, parameter, operation, operand, operandValue)];
        }
        if (change_skill) {
          const params = change_skill[1].split(",").map((s) => s.trim().toLowerCase());
          const { actor, actorValue } = getFixedOrVariable(params[0]);
          const operation = getLearnOrForget(params[1]);
          const skillId = parseInt(params[2]);
          return [getChangeSkill(actor, actorValue, operation, skillId)];
        }
        if (change_equipment) {
          const params = change_equipment[1].split(",").map((s) => s.trim().toLowerCase());
          const actorId = parseInt(params[0]);
          const equipmentType = parseInt(params[1]);
          const equipmentItem = getChangeEquipmentItemValue(params[2]);
          return [getChangeEquipment(actorId, equipmentType, equipmentItem)];
        }
        if (change_name) {
          const params = change_name[1].split(",").map((s) => s.trim().toLowerCase());
          const actorId = parseInt(params[0]);
          const name = params[1] === void 0 ? "" : params[1];
          return [getChangeName(actorId, name)];
        }
        if (change_class) {
          const params = change_class[1].split(",").map((s) => s.trim().toLowerCase());
          const actorId = parseInt(params[0]);
          const classId = parseInt(params[1]);
          const saveExpFlg = params[2] === void 0 ? false : getCheckBoxValue(params[2]);
          return [getChangeClass(actorId, classId, saveExpFlg)];
        }
        if (change_nickname) {
          const params = change_nickname[1].split(",").map((s) => s.trim().toLowerCase());
          const actorId = parseInt(params[0]);
          const nickname = params[1] === void 0 ? "" : params[1];
          return [getChangeNickname(actorId, nickname)];
        }
        if (change_profile) {
          const params = change_profile[1].split(",").map((s) => s.trim());
          const actorId = parseInt(params[0]);
          const firstLine = params[1] === void 0 ? "" : String(params[1]);
          const secondLine = params[2] === void 0 ? "" : String(params[2]);
          const isNewlineCharacter = firstLine.includes("\\n");
          let profile = "";
          if (isNewlineCharacter || secondLine === "") {
            profile = firstLine;
          } else {
            profile = firstLine + "\n" + secondLine;
          }
          return [getChangeProfile(actorId, profile)];
        }
        if (transfer_player) {
          const params = transfer_player[1].split(",").map((s) => s.trim().toLowerCase());
          const regex = /(.*?)\[(\d+)]\[(\d+)]\[(\d+)]/;
          const matches = params[0].match(regex);
          if (!matches)
            throw new Error("Syntax error. / 文法エラーです。:" + params[0]);
          const location = getLocationValue(matches[1]);
          const mapId = parseInt(matches[2]);
          const mapX = parseInt(matches[3]);
          const mapY = parseInt(matches[4]);
          const direction = getDirectionValue(params[1]);
          const fade = getFadeValue(params[2]);
          return [getTransferPlayer(location, mapId, mapX, mapY, direction, fade)];
        }
        if (set_vehicle_location) {
          const params = set_vehicle_location[1].split(",").map((s) => s.trim().toLowerCase());
          const vehicle = getVehicleValue(params[0]);
          const regex = /(.*?)\[(\d+)]\[(\d+)]\[(\d+)]/;
          const matches = params[1].match(regex);
          if (!matches)
            throw new Error("Syntax error. / 文法エラーです。:" + params[1]);
          const location = getLocationValue(matches[1]);
          const mapId = parseInt(matches[2]);
          const mapX = parseInt(matches[3]);
          const mapY = parseInt(matches[4]);
          return [getSetVehicleLocation(vehicle, location, mapId, mapX, mapY)];
        }
        if (set_event_location) {
          const params = set_event_location[1].split(",").map((s) => s.trim().toLowerCase());
          const event = getCharacterValue(params[0]);
          const regex = /(.*?)\[(.*?)](\[(\d+)])?(\[(\d+)])?/;
          const matches = params[1].match(regex);
          if (!matches)
            throw new Error("Syntax error. / 文法エラーです。:" + params[1]);
          const location = getLocationValue(matches[1]);
          let mapX = 0;
          let mapY = 0;
          if (location === 0 || location === 1) {
            mapX = parseInt(matches[2]);
            mapY = parseInt(matches[4]);
          } else if (location === 2) {
            mapX = getCharacterValue(matches[2]);
            mapY = 0;
          }
          const direction = getDirectionValue(params[2]);
          return [getSetEventLocation(event, location, mapX, mapY, direction)];
        }
        if (scroll_map) {
          const params = scroll_map[1].split(",").map((s) => s.trim().toLowerCase());
          const direction = getDirectionValue(params[0]);
          const distance = parseInt(params[1]);
          const speed = getSpeedValue(params[2]);
          const waitForCompletion = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getScrollMap(direction, distance, speed, waitForCompletion)];
        }
        if (set_movement_route) {
          const params = set_movement_route[1].split(",").map((s) => s.trim().toLowerCase());
          const target = getCharacterValue(params[0]);
          const repeat = params[1] === void 0 ? false : getCheckBoxValue(params[1]);
          const skippable = params[2] === void 0 ? false : getCheckBoxValue(params[2]);
          const wait2 = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getMovementRoute(target, repeat, skippable, wait2)];
        }
        if (move_down) {
          return [getMoveDown()];
        }
        if (move_left) {
          return [getMoveLeft()];
        }
        if (move_right) {
          return [getMoveRight()];
        }
        if (move_up) {
          return [getMoveUp()];
        }
        if (move_lower_left) {
          return [getMoveLowerLeft()];
        }
        if (move_lower_right) {
          return [getMoveLowerRight()];
        }
        if (move_upper_left) {
          return [getMoveUpperLeft()];
        }
        if (move_upper_right) {
          return [getMoveUpperRight()];
        }
        if (move_at_random) {
          return [getMoveAtRandom()];
        }
        if (move_toward_player) {
          return [getMoveTowardPlayer()];
        }
        if (move_away_from_player) {
          return [getMoveAwayFromPlayer()];
        }
        if (one_step_forward) {
          return [getOneStepForward()];
        }
        if (one_step_backward) {
          return [getOneStepBackward()];
        }
        if (jump) {
          const params = jump[1].split(",").map((s) => s.trim().toLowerCase());
          const x = parseInt(params[0]);
          const y = parseInt(params[1]);
          return [getJump(x, y)];
        }
        if (mc_wait) {
          const params = mc_wait[1].split(",").map((s) => s.trim().toLowerCase());
          const wait2 = parseInt(params[0]);
          return [getMoveWait(wait2)];
        }
        if (turn_down) {
          return [getTurnDown()];
        }
        if (turn_left) {
          return [getTurnLeft()];
        }
        if (turn_right) {
          return [getTurnRight()];
        }
        if (turn_up) {
          return [getTurnUp()];
        }
        if (turn_90_left) {
          return [getTurn90Left()];
        }
        if (turn_90_right) {
          return [getTurn90Right()];
        }
        if (turn_180) {
          return [getTurn180()];
        }
        if (turn_90_right_or_left) {
          return [getTurn90RightorLeft()];
        }
        if (turn_at_random) {
          return [getTurnAtRandom()];
        }
        if (turn_toward_Player) {
          return [getTurnTowardPlayer()];
        }
        if (turn_away_from_player) {
          return [getTurnAwayFromPlayer()];
        }
        if (switch_on) {
          const params = switch_on[1].split(",").map((s) => s.trim().toLowerCase());
          const switchId = parseInt(params[0]);
          return [getSwitchOn(switchId)];
        }
        if (switch_off) {
          const params = switch_off[1].split(",").map((s) => s.trim().toLowerCase());
          const switchId = parseInt(params[0]);
          return [getSwitchOff(switchId)];
        }
        if (change_speed) {
          const params = change_speed[1].split(",").map((s) => s.trim().toLowerCase());
          const speed = getSpeedValue(params[0]);
          return [getChangeSpeed(speed)];
        }
        if (change_frequency) {
          const params = change_frequency[1].split(",").map((s) => s.trim().toLowerCase());
          const frequency = getFrequencyValue(params[0]);
          return [getChangeFrequency(frequency)];
        }
        if (walking_animation_on) {
          return [getWalkingAnimationOn()];
        }
        if (walking_animation_off) {
          return [getWalkingAnimationOff()];
        }
        if (stepping_animation_on) {
          return [getSteppingAnimationOn()];
        }
        if (stepping_animation_off) {
          return [getSteppingAnimationOff()];
        }
        if (direction_fix_on) {
          return [getDirectionFixOn()];
        }
        if (direction_fix_off) {
          return [getDirectionFixOff()];
        }
        if (through_On) {
          return [getThroughOn()];
        }
        if (through_Off) {
          return [getThroughOff()];
        }
        if (transparent_on) {
          return [getTransparentOn()];
        }
        if (transparent_off) {
          return [getTransparentOff()];
        }
        if (change_image) {
          const params = change_image[1].split(",").map((s) => s.trim());
          const image = weatherNoneList.includes(params[0].toLowerCase()) ? "" : params[0];
          const imageId = params[1] === void 0 ? 0 : parseInt(params[1]);
          return [getChangeImage(image, imageId)];
        }
        if (change_opacity) {
          const params = change_opacity[1].split(",").map((s) => s.trim().toLowerCase());
          const opacity = parseInt(params[0]);
          return [getChangeOpacity(opacity)];
        }
        if (change_blend_mode) {
          const params = change_blend_mode[1].split(",").map((s) => s.trim().toLowerCase());
          const blendMode = getBlendModeValue(params[0]);
          return [getChangeBlendMode(blendMode)];
        }
        if (mc_play_se) {
          if (mc_play_se[1]) {
            const params = mc_play_se[1].replace(/ /g, "").split(",");
            let name = "Attack1";
            let volume = 90;
            let pitch = 100;
            let pan = 0;
            if (params[0]) {
              name = params[0];
            }
            if (Number(params[1]) || Number(params[1]) === 0) {
              volume = Number(params[1]);
            }
            if (Number(params[2]) || Number(params[2]) === 0) {
              pitch = Number(params[2]);
            }
            if (Number(params[3]) || Number(params[3]) === 0) {
              pan = Number(params[3]);
            }
            if (name.toUpperCase() === "NONE" || name === "なし") {
              return [getMcPlaySeEvent("", volume, pitch, pan)];
            } else {
              return [getMcPlaySeEvent(name, volume, pitch, pan)];
            }
          }
        }
        if (mc_script) {
          const params = mc_script[1].split(",").map((s) => s.trim().toLowerCase());
          const script = params[0];
          return [getMoveScript(script)];
        }
        if (get_on_off_vehicle) {
          return [getOnOffVehicle()];
        }
        if (change_transparency) {
          const params = change_transparency[1].split(",").map((s) => s.trim().toLowerCase());
          const transparency = getOnOffRadioButtonValue(params[0]);
          return [getChangeTransparency(transparency)];
        }
        if (change_player_followers) {
          const params = change_player_followers[1].split(",").map((s) => s.trim().toLowerCase());
          const playerFollowers = getOnOffRadioButtonValue(params[0]);
          return [getChangePlayerFollowers(playerFollowers)];
        }
        if (gather_followers) {
          return [getGatherFollowers()];
        }
        if (show_animation) {
          const params = show_animation[1].split(",").map((s) => s.trim().toLowerCase());
          const character = getCharacterValue(params[0]);
          const animationId = parseInt(params[1]);
          const waitForCompletion = params[2] === void 0 ? false : getCheckBoxValue(params[2]);
          return [getShowAnimation(character, animationId, waitForCompletion)];
        }
        if (show_balloon_icon) {
          const params = show_balloon_icon[1].split(",").map((s) => s.trim().toLowerCase());
          const character = getCharacterValue(params[0]);
          const balloonIcon = getBalloonIconValue(params[1]);
          const waitForCompletion = params[2] === void 0 ? false : getCheckBoxValue(params[2]);
          return [getShowBalloonIcon(character, balloonIcon, waitForCompletion)];
        }
        if (erase_event) {
          return [getEraseEvent()];
        }
        if (tint_screen) {
          const params = tint_screen[1].split(",").map((s) => s.trim());
          if (params.length > 0) {
            const options = params;
            return [getTintScreen(options)];
          } else {
            console.error(text);
            throw new Error("Syntax error. / 文法エラーです。" + text.replace(/</g, "  ").replace(/>/g, "  "));
          }
        }
        if (flash_screen) {
          const params = flash_screen[1].split(",").map((s) => s.trim().toLowerCase());
          const red = parseInt(params[0]);
          const green = parseInt(params[1]);
          const blue = parseInt(params[2]);
          const intensity = parseInt(params[3]);
          const frames = parseInt(params[4]);
          const waitForCompletion = params[5] === void 0 ? false : getCheckBoxValue(params[5]);
          return [getFlashScreen(red, green, blue, intensity, frames, waitForCompletion)];
        }
        if (shake_screen) {
          const params = shake_screen[1].split(",").map((s) => s.trim().toLowerCase());
          const power = parseInt(params[0]);
          const speed = parseInt(params[1]);
          const frames = parseInt(params[2]);
          const waitForCompletion = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getShakeScreen(power, speed, frames, waitForCompletion)];
        }
        if (set_weather_effect) {
          const params = set_weather_effect[1].split(",").map((s) => s.trim().toLowerCase());
          const type = getWeatherTypeValue(params[0]);
          const power = parseInt(params[1]);
          const frames = parseInt(params[2]);
          const waitForCompletion = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getSetWeatherEffect(type, power, frames, waitForCompletion)];
        }
        if (play_movie) {
          const params = play_movie[1].split(",").map((s) => s.trim());
          const fileName = weatherNoneList.includes(params[0].toLowerCase()) ? "" : params[0];
          return [getPlayMovie(fileName)];
        }
        if (battle_processing) {
          const params = battle_processing[1].split(",").map((s) => s.trim().toLowerCase());
          const { troop, troopValue } = getTroopValue(params[0]);
          return [getBattleProcessing(troop, troopValue)];
        }
        if (if_win) {
          return [getIfWin()];
        }
        if (if_escape) {
          return [getIfEscape()];
        }
        if (if_lose) {
          return [getIfLose()];
        }
        if (name_input_processing) {
          const params = name_input_processing[1].split(",").map((s) => s.trim().toLowerCase());
          const actorId = parseInt(params[0]);
          const maxCharacter = parseInt(params[1]);
          return [getNameInputProcessing(actorId, maxCharacter)];
        }
        if (shop_processing) {
          const params = shop_processing[1].split(",").map((s) => s.trim().toLowerCase());
          const purchaseOnly = params[0] === "" ? false : getCheckBoxValue(params[0]);
          return [getShopProcessing(purchaseOnly)];
        }
        if (merchandise) {
          const params = merchandise[1].split(",").map((s) => s.trim().toLowerCase());
          const merchandiseType = getMerchandiseType(params[0]);
          const merchandiseId = parseInt(params[1]);
          const { price, priceValue } = params[2] === void 0 ? { price: 0, priceValue: 0 } : getPriceValue(params[2]);
          return [getMerchandise(merchandiseType, merchandiseId, price, priceValue)];
        }
        if (open_menu_screen) {
          return [getOpenMenuScreen()];
        }
        if (open_save_screen) {
          return [getOpenSaveScreen()];
        }
        if (game_over) {
          return [getGameOver()];
        }
        if (return_to_title_screen) {
          return [getReturnToTitleScreen()];
        }
        if (change_victory_me) {
          const params = change_victory_me[1].split(",").map((s) => s.trim());
          const name = weatherNoneList.includes(params[0].toLowerCase()) ? "" : params[0];
          const volume = params[1] === void 0 ? 90 : parseInt(params[1]);
          const pitch = params[2] === void 0 ? 100 : parseInt(params[2]);
          const pan = params[3] === void 0 ? 0 : parseInt(params[3]);
          return [getChangeVictoryMe(name, volume, pitch, pan)];
        }
        if (change_defeat_me) {
          const params = change_defeat_me[1].split(",").map((s) => s.trim());
          const name = weatherNoneList.includes(params[0].toLowerCase()) ? "" : params[0];
          const volume = params[1] === void 0 ? 90 : parseInt(params[1]);
          const pitch = params[2] === void 0 ? 100 : parseInt(params[2]);
          const pan = params[3] === void 0 ? 0 : parseInt(params[3]);
          return [getChangeDefeatMe(name, volume, pitch, pan)];
        }
        if (change_vehicle_bgm) {
          const params = change_vehicle_bgm[1].split(",").map((s) => s.trim());
          const vehicle = getVehicleValue(params[0].toLowerCase());
          const name = weatherNoneList.includes(params[1].toLowerCase()) ? "" : params[1];
          const volume = params[2] === void 0 ? 90 : parseInt(params[2]);
          const pitch = params[3] === void 0 ? 100 : parseInt(params[3]);
          const pan = params[4] === void 0 ? 0 : parseInt(params[4]);
          return [getChangeVehicleBgm(vehicle, name, volume, pitch, pan)];
        }
        if (change_save_access) {
          const params = change_save_access[1].split(",").map((s) => s.trim().toLowerCase());
          const save = getDisableEnableRadioButtonValue(params[0]);
          return [getChangeSaveAccess(save)];
        }
        if (change_menu_access) {
          const params = change_menu_access[1].split(",").map((s) => s.trim().toLowerCase());
          const menu = getDisableEnableRadioButtonValue(params[0]);
          return [getChangeMenuAccess(menu)];
        }
        if (change_encounter) {
          const params = change_encounter[1].split(",").map((s) => s.trim().toLowerCase());
          const encounter = getDisableEnableRadioButtonValue(params[0]);
          return [getChangeEncounter(encounter)];
        }
        if (change_formation_access) {
          const params = change_formation_access[1].split(",").map((s) => s.trim().toLowerCase());
          const formation = getDisableEnableRadioButtonValue(params[0]);
          return [getChangeFormationAccess(formation)];
        }
        if (change_window_color) {
          const params = change_window_color[1].split(",").map((s) => s.trim().toLowerCase());
          const red = parseInt(params[0]);
          const green = parseInt(params[1]);
          const blue = parseInt(params[2]);
          return [getChangeWindowColor(red, green, blue)];
        }
        if (change_actor_images) {
          const params = change_actor_images[1].split(",").map((s) => s.trim());
          const actorId = parseInt(params[0]);
          const faceName = weatherNoneList.includes(params[1].toLowerCase()) ? "" : String(params[1]);
          const faceId = parseInt(params[2]);
          const characterName = weatherNoneList.includes(params[3].toLowerCase()) ? "" : String(params[3]);
          const characterId = parseInt(params[4]);
          const battlerName = weatherNoneList.includes(params[5].toLowerCase()) ? "" : String(params[5]);
          return [getChangeActorImages(actorId, faceName, faceId, characterName, characterId, battlerName)];
        }
        if (change_vehicle_image) {
          const params = change_vehicle_image[1].split(",").map((s) => s.trim());
          const vehicle = getVehicleValue(params[0].toLowerCase());
          const vehicleName = weatherNoneList.includes(params[1].toLowerCase()) ? "" : String(params[1]);
          const vehicleId = params[2] === void 0 ? 0 : parseInt(params[2]);
          return [getChangeVehicleImage(vehicle, vehicleName, vehicleId)];
        }
        if (change_map_name_display) {
          const params = change_map_name_display[1].split(",").map((s) => s.trim().toLowerCase());
          const mapNameDisplay = getOnOffRadioButtonValue(params[0]);
          return [getChangeMapNameDisplay(mapNameDisplay)];
        }
        if (change_tileset) {
          const params = change_tileset[1].split(",").map((s) => s.trim().toLowerCase());
          const tilesetId = parseInt(params[0]);
          return [getChangeTileset(tilesetId)];
        }
        if (change_battle_background) {
          const params = change_battle_background[1].split(",").map((s) => s.trim());
          const battleBackGround1 = weatherNoneList.includes(params[0].toLowerCase()) ? "" : String(params[0]);
          const battleBackGround2 = weatherNoneList.includes(params[1].toLowerCase()) ? "" : String(params[1]);
          return [getChangeBattleBackGround(battleBackGround1, battleBackGround2)];
        }
        if (change_parallax) {
          const params = change_parallax[1].split(",").map((s) => s.trim());
          const image = weatherNoneList.includes(params[0].toLowerCase()) ? "" : String(params[0]);
          const regex = /(.*?)\[(-?\d+)]/;
          const matches1 = params[1] === void 0 ? void 0 : params[1].match(regex);
          const matches2 = params[2] === void 0 ? void 0 : params[2].match(regex);
          let loopHorizontally = false;
          let loopVertically = false;
          let loopHorizontallyScroll = 0;
          let loopVerticallyScroll = 0;
          if (matches1 !== void 0) {
            if (checkBoxLoopHorizontallyList.includes(matches1[1].toLowerCase())) {
              loopHorizontally = true;
              loopHorizontallyScroll = parseInt(matches1[2]);
            } else if (checkBoxLoopVerticallyList.includes(matches1[1].toLowerCase())) {
              loopVertically = true;
              loopVerticallyScroll = parseInt(matches1[2]);
            }
          }
          if (matches2 !== void 0) {
            if (checkBoxLoopHorizontallyList.includes(matches2[1].toLowerCase())) {
              loopHorizontally = true;
              loopHorizontallyScroll = parseInt(matches2[2]);
            } else if (checkBoxLoopVerticallyList.includes(matches2[1].toLowerCase())) {
              loopVertically = true;
              loopVerticallyScroll = parseInt(matches2[2]);
            }
          }
          return [getChangeParallax(image, loopHorizontally, loopVertically, loopHorizontallyScroll, loopVerticallyScroll)];
        }
        if (get_location_info) {
          const params = get_location_info[1].split(",").map((s) => s.trim().toLowerCase());
          const variableId = parseInt(params[0]);
          const infoType = getLocationInfoTypeValue(params[1]);
          const regex = /^(.*?)\[(.*?)](\[(\d+)])?/;
          const matches = params[2].match(regex);
          if (!matches)
            throw new Error("Syntax error. / 文法エラーです。:" + params[2]);
          const { locationType, locationX, locationY } = getLocationEvent(matches[1], matches[2], matches[4]);
          return [getGetLocationInfo(variableId, infoType, locationType, locationX, locationY)];
        }
        if (change_enemy_hp) {
          const params = change_enemy_hp[1].split(",").map((s) => s.trim().toLowerCase());
          const enemy = getEnemyTargetValue(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          const allowDeath = params[3] === void 0 ? false : getCheckBoxValue(params[3]);
          return [getChangeEnemyHp(enemy, operation, operand, operandValue, allowDeath)];
        }
        if (change_enemy_mp) {
          const params = change_enemy_mp[1].split(",").map((s) => s.trim().toLowerCase());
          const enemy = getEnemyTargetValue(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          return [getChangeEnemyMp(enemy, operation, operand, operandValue)];
        }
        if (change_enemy_tp) {
          const params = change_enemy_tp[1].split(",").map((s) => s.trim().toLowerCase());
          const enemy = getEnemyTargetValue(params[0]);
          const operation = getIncreaseOrDecrease(params[1]);
          const { operand, operandValue } = getConstantOrVariable(params[2]);
          return [getChangeEnemyTp(enemy, operation, operand, operandValue)];
        }
        if (change_enemy_state) {
          const params = change_enemy_state[1].split(",").map((s) => s.trim().toLowerCase());
          const enemy = getEnemyTargetValue(params[0]);
          const operation = getAddOrRemove(params[1]);
          const stateId = parseInt(params[2]);
          return [getChangeEnemyState(enemy, operation, stateId)];
        }
        if (enemy_recover_all) {
          const params = enemy_recover_all[1].split(",").map((s) => s.trim().toLowerCase());
          const enemy = getEnemyTargetValue(params[0]);
          return [getEnemyRecoverAll(enemy)];
        }
        if (enemy_appear) {
          const params = enemy_appear[1].split(",").map((s) => s.trim().toLowerCase());
          const enemy = getEnemyTargetValue(params[0]);
          return [getEnemyAppear(enemy)];
        }
        if (enemy_transform) {
          const params = enemy_transform[1].split(",").map((s) => s.trim().toLowerCase());
          const enemy = getEnemyTargetValue(params[0]);
          const transformToEnemyId = parseInt(params[1]);
          return [getEnemyTransform(enemy, transformToEnemyId)];
        }
        if (show_battle_animation) {
          const params = show_battle_animation[1].split(",").map((s) => s.trim().toLowerCase());
          const { enemyValue, isAllChecked } = getTargetEnemyMultipleValues(params[0]);
          const animationId = parseInt(params[1]);
          return [getShowBattleAnimation(enemyValue, animationId, isAllChecked)];
        }
        if (force_action) {
          const params = force_action[1].split(",").map((s) => s.trim().toLowerCase());
          const { subject, subjectValue } = getEnemyOrActor(params[0]);
          const skillId = parseInt(params[1]);
          const target = getActionTarget(params[2]);
          return [getForceAction(subject, subjectValue, skillId, target)];
        }
        if (abort_battle) {
          return [getAbortBattle()];
        }
        if (text.match(/\S/g)) {
          logger.log("push: ", text);
          event_command_list2.push(getTextFrameEvent(text));
        }
        return event_command_list2;
      };
      const getEvents = function(text, previous_text, window_frame, previous_frame, block_stack, block_map) {
        let event_command_list2 = [];
        const events = _getEvents(text, window_frame, block_stack, block_map);
        const PRE_CODE = 101;
        const CHOICE_CODE = 102;
        const TEXT_CODE = 401;
        const WHEN_CODE = 402;
        const WHEN_CANCEL_CODE = 403;
        const IF_CODE = 111;
        const SHOP_PROCESSING_CODE = 302;
        const MERCHANDISE_CODE = 605;
        const IF_END_CODE = getEnd().code;
        const CHOICE_END_CODE = getShowChoiceEnd().code;
        const IF_IFEND_CODE = getIfEnd().code;
        const BATTLE_PROCESSING_CODE = 301;
        const IF_WIN_CODE = 601;
        const IF_ESCAPE_CODE = 602;
        const IF_LOSE_CODE = 603;
        const MOVEMENT_ROUTE_CODE = 205;
        const MOVEMENT_COMMANDS_CODE = 505;
        events.forEach((current_frame) => {
          if (current_frame.code === IF_END_CODE || current_frame.code === CHOICE_END_CODE || current_frame.code === IF_IFEND_CODE) {
            block_stack.pop();
          }
        });
        if (Array.isArray(events) && events.length > 0) {
          if (events.length > 1) {
            event_command_list2 = event_command_list2.concat(events);
            return { window_frame: null, event_command_list: event_command_list2, block_stack };
          }
          const current_frame = events[0];
          if (current_frame.code === PRE_CODE) {
            window_frame = current_frame;
            return { window_frame, event_command_list: event_command_list2, block_stack };
          }
          if (current_frame.code === TEXT_CODE) {
            if (previous_frame) {
              if (previous_frame.code === TEXT_CODE) {
                if (previous_text === "") {
                  event_command_list2.push(getPretextEvent());
                }
              } else if (previous_frame.code === PRE_CODE) {
                event_command_list2.push(window_frame);
              } else {
                event_command_list2.push(getPretextEvent());
              }
            } else {
              event_command_list2.push(getPretextEvent());
            }
          } else if (current_frame.code === WHEN_CODE) {
            const current_index = block_stack.slice(-1)[0].index;
            const current_choice = block_stack.slice(-1)[0].event;
            if (current_index !== 0) {
              event_command_list2.push(getBlockEnd());
            }
            current_frame.parameters[0] = current_index;
            block_stack.slice(-1)[0].index += 1;
            if (current_choice) {
              if (Array.isArray(current_choice.parameters)) {
                current_choice.parameters[0].push(current_frame.parameters[1]);
              }
            }
          } else if (current_frame.code === WHEN_CANCEL_CODE) {
            const current_index = block_stack.slice(-1)[0].index;
            if (current_index !== 0) {
              event_command_list2.push(getBlockEnd());
            }
            block_stack.slice(-1)[0].index += 1;
          } else if (current_frame.code === IF_WIN_CODE) {
            block_stack.slice(-1)[0].winCode = true;
          } else if (current_frame.code === IF_ESCAPE_CODE) {
            if (block_stack.slice(-1)[0].winCode === false) {
              event_command_list2.push(getIfWin());
              block_stack.slice(-1)[0].winCode = true;
            }
            const current_event = block_stack.slice(-1)[0].event;
            event_command_list2.push(getBlockEnd());
            current_event.parameters[2] = true;
          } else if (current_frame.code === IF_LOSE_CODE) {
            if (block_stack.slice(-1)[0].winCode === false) {
              event_command_list2.push(getIfWin());
              block_stack.slice(-1)[0].winCode = true;
            }
            const current_event = block_stack.slice(-1)[0].event;
            event_command_list2.push(getBlockEnd());
            current_event.parameters[3] = true;
          } else if (current_frame.code === CHOICE_CODE) {
            block_stack.push({ code: current_frame.code, event: current_frame, indent: block_stack.length, index: 0 });
          } else if (current_frame.code === IF_CODE) {
            block_stack.push({ code: current_frame.code, event: current_frame, indent: block_stack.length, index: 0 });
          } else if (current_frame.code === BATTLE_PROCESSING_CODE) {
            block_stack.push({ code: current_frame.code, event: current_frame, indent: block_stack.length, winCode: false });
          } else if (current_frame.code === MOVEMENT_ROUTE_CODE) {
            block_stack.push({ code: current_frame.code, event: current_frame, indent: block_stack.length });
          }
          if (current_frame.code === MERCHANDISE_CODE) {
            if (previous_frame.code === SHOP_PROCESSING_CODE && previous_frame.parameters[1] === 0) {
              previous_frame.parameters[0] = current_frame.parameters[0];
              previous_frame.parameters[1] = current_frame.parameters[1];
              previous_frame.parameters[2] = current_frame.parameters[2];
              previous_frame.parameters[3] = current_frame.parameters[3];
              events.pop();
            }
          }
          if (current_frame.code === MOVEMENT_COMMANDS_CODE) {
            const current_movement_route = block_stack.slice(-1)[0].event;
            if (current_movement_route.code === MOVEMENT_ROUTE_CODE) {
              const movement_command_parameters = current_frame.parameters[0];
              const movement_command_end = current_movement_route.parameters[1].list.pop();
              current_movement_route.parameters[1].list.push(movement_command_parameters);
              current_movement_route.parameters[1].list.push(movement_command_end);
            }
          }
          event_command_list2 = event_command_list2.concat(events);
        }
        return { window_frame: null, event_command_list: event_command_list2, block_stack };
      };
      const autoIndent = function(events) {
        const BOTTOM_CODE = 0;
        const IF_CODE = 111;
        const ELSE_CODE = 411;
        const LOOP_CODE = 112;
        const WHEN_CODE = 402;
        const WHEN_CANCEL_CODE = 403;
        const IF_WIN_CODE = 601;
        const IF_ESCAPE_CODE = 602;
        const IF_LOSE_CODE = 603;
        const out_events = events.reduce((o, e) => {
          const parameters = JSON.parse(JSON.stringify(e.parameters));
          let now_indent = 0;
          const last = o.slice(-1)[0];
          if (last !== void 0) {
            now_indent = last.indent;
            switch (last.code) {
              case IF_CODE:
              case ELSE_CODE:
              case LOOP_CODE:
              case WHEN_CODE:
              case IF_WIN_CODE:
              case IF_ESCAPE_CODE:
              case IF_LOSE_CODE:
              case WHEN_CANCEL_CODE: {
                now_indent += 1;
                break;
              }
              case BOTTOM_CODE:
                now_indent -= 1;
                break;
            }
          }
          o.push({ code: e.code, indent: now_indent, parameters });
          return o;
        }, []);
        return out_events;
      };
      const compile = function(text) {
        let scenario_text2 = uniformNewLineCode(text);
        scenario_text2 = eraseCommentOutLines(scenario_text2, Laurus.Text2Frame.CommentOutChar);
        let block_map = {};
        ["script", "comment", "scrolling"].forEach(function(block_name) {
          const t = getBlockStatement(scenario_text2, block_name);
          scenario_text2 = t.scenario_text;
          block_map = Object.assign(block_map, t.block_map);
        });
        const text_lines = scenario_text2.split("\n");
        let event_command_list2 = [];
        let previous_text = "";
        let window_frame = null;
        let block_stack = [];
        for (let i = 0; i < text_lines.length; i++) {
          const text2 = text_lines[i];
          if (text2) {
            let previous_frame = window_frame;
            if (previous_frame === null) {
              previous_frame = event_command_list2.slice(-1)[0];
            }
            const return_obj = getEvents(text2, previous_text, window_frame, previous_frame, block_stack, block_map);
            window_frame = return_obj.window_frame;
            const new_event_command_list = return_obj.event_command_list;
            block_stack = return_obj.block_stack;
            event_command_list2 = event_command_list2.concat(new_event_command_list);
          }
          logger.log(i, text2);
          previous_text = text2;
        }
        event_command_list2 = completeLackedBottomEvent(event_command_list2);
        event_command_list2 = autoIndent(event_command_list2);
        return event_command_list2;
      };
      Laurus.Text2Frame.export = { compile };
      if (Laurus.Text2Frame.ExecMode === "LIBRARY_EXPORT") {
        return;
      }
      const scenario_text = readText(Laurus.Text2Frame.TextPath);
      const event_command_list = compile(scenario_text);
      event_command_list.push(getCommandBottomEvent());
      switch (Laurus.Text2Frame.ExecMode) {
        case "IMPORT_MESSAGE_TO_EVENT":
        case "メッセージをイベントにインポート": {
          const map_data = readJsonData(Laurus.Text2Frame.MapPath);
          if (!map_data.events[Laurus.Text2Frame.EventID]) {
            throw new Error(
              "EventID not found. / EventIDが見つかりません。\nEvent ID: " + Laurus.Text2Frame.EventID
            );
          }
          const pageID = Number(Laurus.Text2Frame.PageID) - 1;
          while (!map_data.events[Laurus.Text2Frame.EventID].pages[pageID]) {
            map_data.events[Laurus.Text2Frame.EventID].pages.push(getDefaultPage());
          }
          let map_events = map_data.events[Laurus.Text2Frame.EventID].pages[pageID].list;
          if (Laurus.Text2Frame.IsOverwrite) {
            map_events = [];
          }
          map_events.pop();
          map_events = map_events.concat(event_command_list);
          map_data.events[Laurus.Text2Frame.EventID].pages[pageID].list = map_events;
          writeData(Laurus.Text2Frame.MapPath, map_data);
          addMessage(
            "Success / 書き出し成功！\n======> MapID: " + Laurus.Text2Frame.MapID + " -> EventID: " + Laurus.Text2Frame.EventID + " -> PageID: " + Laurus.Text2Frame.PageID
          );
          break;
        }
        case "IMPORT_MESSAGE_TO_CE":
        case "メッセージをコモンイベントにインポート": {
          const ce_data = readJsonData(Laurus.Text2Frame.CommonEventPath);
          if (ce_data.length - 1 < Laurus.Text2Frame.CommonEventID) {
            throw new Error(
              "Common Event not found. / コモンイベントが見つかりません。: " + Laurus.Text2Frame.CommonEventID
            );
          }
          let ce_events = ce_data[Laurus.Text2Frame.CommonEventID].list;
          if (Laurus.Text2Frame.IsOverwrite) {
            ce_events = [];
          }
          ce_events.pop();
          ce_data[Laurus.Text2Frame.CommonEventID].list = ce_events.concat(event_command_list);
          writeData(Laurus.Text2Frame.CommonEventPath, ce_data);
          addMessage("Success / 書き出し成功！\n=====> Common EventID :" + Laurus.Text2Frame.CommonEventID);
          break;
        }
      }
      addMessage("\n");
      addMessage(
        "Please restart RPG Maker MV(Editor) WITHOUT save. \n**セーブせずに**プロジェクトファイルを開き直してください"
      );
      console.log(
        "Please restart RPG Maker MV(Editor) WITHOUT save. \n**セーブせずに**プロジェクトファイルを開き直してください"
      );
    };
    Game_Interpreter.prototype.pluginCommandText2Frame("LIBRARY_EXPORT", [0]);
    {
      module2.exports = Laurus.Text2Frame.export;
    }
  })();
})(Text2Frame$1);
var Text2FrameExports = Text2Frame$1.exports;
const Text2Frame = /* @__PURE__ */ getDefaultExportFromCjs(Text2FrameExports);
module.exports = Text2Frame;
