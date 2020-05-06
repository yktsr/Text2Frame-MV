const assert = require('assert');
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

describe('BasicTest', function() {
  it('Equal json', function(done) {
    fs.readFile('./test/basic.txt', 'utf8', function(err, test_input) {
    fs.readFile('./data/Map001.json', 'utf8', function(err, test_map_data) {
    fs.readFile('./test/expected_basic.json', 'utf8', function(err, test_result) {
      const writeFileSyncStub = sinon.stub(fs, 'writeFileSync');
      var result_json = {};
      writeFileSyncStub.callsFake(function(file_path, json_data, encoding){
        result_json = json_data;
        return file_path;
      }); 
      const readFileSyncStub = sinon.stub(fs, 'readFileSync');
      readFileSyncStub.onCall(0).returns(test_input);
      readFileSyncStub.onCall(1).returns(test_map_data);

      let folder_name = '';
      let file_name   = '';
      let map_id      = '1';
      let event_id    = '1';
      let overwrite   = true;
      Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT',
        [folder_name, file_name, map_id, event_id, overwrite]);

      assert.deepEqual(JSON.parse(result_json), JSON.parse(test_result));
    });
    });
    });
    done();
  })
})
