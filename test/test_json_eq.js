const chai = require('chai');
const expect = chai.expect;
const sinon = require("sinon");
const fs = require('fs');

// Game_Interpreter = {};
// Game_Interpreter.prototype = {};
// $gameMessage = {};
// $gameMessage.add = function(){};

//  PluginManager = {};
//  PluginManager.parameters = function(str){return {
//    "Default Window Position" : 'Bottom',
//    "Default Background"      : 'Window',
//    "Default Scenario Folder" : '',
//    "Default Scenario File"   : '',
//    "Default Common Event ID" : '1',
//    "Default MapID"           : '1',
//    "Default EventID"         : '1',
//    "IsOverwrite"             : 'true',
//    "Comment Out Char"        : '%',
//    "IsDebug"                 : 'false'
//  };};

const text2frame = require('../Text2Frame.js');

describe('Text2Frame Test', function() {
  const tests = require('./test_cases.js')
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

        const folder_name = 'test';
        const file_name   = 'test';
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
