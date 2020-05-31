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
    //{title: "Content", infile: "./test/31-context.txt", mapfile: "./data/Map001.json", expfile: "./test/expected_31-context.json"},
    {title: "Control variables/constant", infile: "./test/35-control_variables/constant.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_constant.json"},
    {title: "Control variables/random", infile: "./test/35-control_variables/random.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_random.json"},
    {title: "Control variables/gamedata", infile: "./test/35-control_variables/gamedata.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_gamedata.json"},
    {title: "Control variables/variable", infile: "./test/35-control_variables/variable.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_variable.json"},
    {title: "Control variables/script", infile: "./test/35-control_variables/script.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_script.json"},
    {title: "Control variables/misc", infile: "./test/35-control_variables/misc.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_misc.json"},
    {title: "Switch", infile: "./test/38-switches.txt", mapfile: "./data/Map001.json", expfile: "./test/38-expected_switches.json"},
    {title: "Self switch", infile: "./test/39-self_switches.txt", mapfile: "./data/Map001.json", expfile: "./test/39-expected_self_switches.json"},
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
        const overwrite   = true;
        Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT',
          [folder_name, file_name, map_id, event_id, overwrite]);

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
