const chai = require('chai');
const expect = chai.expect;
const sinon = require("sinon");
const fs = require('fs');

Game_Interpreter = {};
Game_Interpreter.prototype = {};
$gameMessage = {};
$gameMessage.add = function(){};

PluginManager = {};
PluginManager.parameters = function(str){return {
  "Default Window Position" : 'Bottom',
  "Default Background"      : 'Window',
  "Default Scenario Folder" : '',
  "Default Scenario File"   : '',
  "Default Common Event ID" : '1',
  "Default MapID"           : '1',
  "Default EventID"         : '1',
  "IsOverwrite"             : 'true',
  "Comment Out Char"        : '%',
  "IsDebug"                 : 'false'
};};

const text2frame = require('../Text2Frame.js');

describe('Text2Frame Test', function() {
  var tests = [
    {title: "Basic",   infile: "./test/basic.txt",      mapfile: "./data/Map001.json", expfile: "./test/expected_basic.json"},
    {title: "Crlf",    infile: "./test/crlf.txt",       mapfile: "./data/Map001.json", expfile: "./test/expected_crlf.json"},
    {title: "Audio",   infile: "./test/audio.txt",      mapfile: "./data/Map001.json", expfile: "./test/expected_audio.json"},
    {title: "Extend",  infile: "./test/extend.txt",     mapfile: "./data/Map001.json", expfile: "./test/expected_extend.json"},
    {title: "Mix",     infile: "./test/mix.txt",        mapfile: "./data/Map001.json", expfile: "./test/expected_mix.json"},
    {title: "Context", infile: "./test/31-context.txt", mapfile: "./data/Map001.json", expfile: "./test/expected_31-context.json"},
    {title: "Control variables/constant", infile: "./test/35-control_variables/constant.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_constant.json"},
    {title: "Control variables/random", infile: "./test/35-control_variables/random.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_random.json"},
    {title: "Control variables/gamedata", infile: "./test/35-control_variables/gamedata.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_gamedata.json"},
    {title: "Control variables/variable", infile: "./test/35-control_variables/variable.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_variable.json"},
    {title: "Control variables/script", infile: "./test/35-control_variables/script.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_script.json"},
    {title: "Control variables/misc", infile: "./test/35-control_variables/misc.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_misc.json"},
    {title: "Switch", infile: "./test/38-switches.txt", mapfile: "./data/Map001.json", expfile: "./test/38-expected_switches.json"},
    {title: "Self switch", infile: "./test/39-self_switches.txt", mapfile: "./data/Map001.json", expfile: "./test/39-expected_self_switches.json"},
    {title: "Timer", infile: "./test/40-timer.txt", mapfile: "./data/Map001.json", expfile: "./test/40-expected_timer.json"},
    {title: "Comment Out 1", infile: "./test/43-bug-comment-out.txt", mapfile: "./data/Map001.json", expfile: "./test/43-expected_bug-comment-out.json"},
    {title: "Comment Out 2", infile: "./test/45-comment-out.txt", mapfile: "./data/Map001.json", expfile: "./test/45-expected_comment-out.json"},
    {title: "Show Picture", infile: "./test/56-show-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/56-expected_show-picture.json"},
    {title: "Move Picture", infile: "./test/57-move-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/57-expected_move-picture.json"},
    {title: "Rotate Picture", infile: "./test/58-rotate-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/58-expected_rotate_picture.json"},
    {title: "Tint Picture", infile: "./test/59-tint-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/59-expected_tint-picture.json"},
    {title: "Erase Picture", infile: "./test/60-erase-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/60-expected_erase-picture.json"}, 
    {title: "Conditional Branch/if-else", infile: "./test/50-if-else/if-else.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_if-else.json"},
    {title: "Conditional Branch/Switch", infile: "./test/50-if-else/switch.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_switch.json"},
    {title: "Conditional Branch/SelfSwitch", infile: "./test/50-if-else/self-switch.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_self-switch.json"},
    {title: "Conditional Branch/Variable", infile: "./test/50-if-else/variable.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_variable.json"},
    {title: "Conditional Branch/Timer", infile: "./test/50-if-else/timer.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_timer.json"},
    {title: "Conditional Branch/Actor", infile: "./test/50-if-else/actor.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_actor.json"},
    {title: "Conditional Branch/Enemy", infile: "./test/50-if-else/enemy.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_enemy.json"},
    {title: "Conditional Branch/Character", infile: "./test/50-if-else/character.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_character.json"},
    {title: "Conditional Branch/Vehicle", infile: "./test/50-if-else/vehicle.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_vehicle.json"},
    {title: "Conditional Branch/Gold", infile: "./test/50-if-else/gold.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_gold.json"},
    {title: "Conditional Branch/Item", infile: "./test/50-if-else/item.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_item.json"},
    {title: "Conditional Branch/Weapon", infile: "./test/50-if-else/weapon.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_weapon.json"},
    {title: "Conditional Branch/Armor", infile: "./test/50-if-else/armor.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_armor.json"},
    {title: "Conditional Branch/Button", infile: "./test/50-if-else/button.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_button.json"},
    {title: "Conditional Branch/Script", infile: "./test/50-if-else/script.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_script.json"},
    {title: "Conditional Branch/Error", infile: "./test/50-if-else/error.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_error.json"},
    {title: "Loop", infile: "./test/51-loop.txt", mapfile: "./data/Map001.json", expfile: "./test/51-expected_loop.json"},
    {title: "Break Loop", infile: "./test/52-break-loop.txt", mapfile: "./data/Map001.json", expfile: "./test/52-expected_break-loop.json"},
    {title: "Exit Event Processing", infile: "./test/53-exit-event-processing.txt", mapfile: "./data/Map001.json", expfile: "./test/53-expected_exit-event-processing.json"},
    {title: "Label", infile: "./test/54-label.txt", mapfile: "./data/Map001.json", expfile: "./test/54-expected_label.json"},
    {title: "Jump to Label", infile: "./test/55-jump-to-label.txt", mapfile: "./data/Map001.json", expfile: "./test/55-expected_jump-to-label.json"},
    {title: "Name", infile: "./test/67-name.txt", mapfile: "./data/Map001.json", expfile: "./test/67-expected_name.json"},
    {title: "Move Picture MZ", infile: "./test/69-move-picture-mz.txt", mapfile: "./data/Map001.json", expfile: "./test/69-expected_move-picture-mz.json"},
    {title: "Conditional Branch/Button-MZ", infile: "./test/70-if-else-button-mz.txt", mapfile: "./data/Map001.json", expfile: "./test/70-expected_if-else-button-mz.json"},
  ];

  const consoleStub = sinon.stub(console, 'log');
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync');
  const readFileSyncStub = sinon.stub(fs, 'readFileSync');

  tests.forEach(function(test, index) {
    it(test.title, function(done) {
      fs.readFile(test.infile, 'utf8', function(err, test_input) {
      fs.readFile(test.mapfile, 'utf8', function(err, test_map_data) {
      fs.readFile(test.expfile, 'utf8', function(err, expected_data) {
        let result_data = "";
        writeFileSyncStub.callsFake(function(file_path, json_data, encoding){
          result_data = json_data;
          return file_path;
        });
        const count = index * 2;
        readFileSyncStub.onCall(count).returns(test_input);
        readFileSyncStub.onCall(count+1).returns(test_map_data);

        const folder_name = '';
        const file_name   = '';
        const map_id      = '1';
        const event_id    = '1';
        const page_id     = '1';
        const overwrite   = 'true';
        Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT',
          [folder_name, file_name, map_id, event_id, page_id, overwrite]);

        const expected_json = JSON.parse(expected_data);
        const actual_json = JSON.parse(result_data);
        expect(actual_json).to.eql(expected_json);
        done();
      });
      });
      });
    })
  });
})
