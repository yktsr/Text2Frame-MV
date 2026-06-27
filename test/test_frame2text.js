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
const frame2text = require('../Frame2Text.js');

describe('Frame2Text Test', function() {
  const tests = require('./test_cases.js')
  const consoleStub = sinon.stub(console, 'log');
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync');
  const readFileSyncStub = sinon.stub(fs, 'readFileSync');

  tests.forEach(function(test, index) {
    it(test.title, function(done) {
      fs.readFile(test.mapfile, 'utf8', function(err, test_map_data) {
      fs.readFile(test.expfile, 'utf8', function(err, expected_data) {
        let event_2_message = "";
        let message_2_event = "";
        const write_count = index * 2;
        const read_count = index * 3;

        writeFileSyncStub.onCall(write_count).callsFake(function(file_path, text, encoding) {
          event_2_message = text;
          console.log("Message Text")
          console.log(text)
          return file_path;
        });
        writeFileSyncStub.onCall(write_count + 1).callsFake(function(file_path, json_data, encoding) {
          message_2_event = json_data;
          // console.log("Message To Event")
          // console.log(json_data)
          return file_path;
        });
        readFileSyncStub.onCall(read_count).returns(expected_data);
        readFileSyncStub.onCall(read_count + 1).callsFake(function(file_path, encoding) {
          return event_2_message;
        });
        readFileSyncStub.onCall(read_count + 2).returns(test_map_data);

        const folder_name = '';
        const file_name   = '';
        const map_id      = '1';
        const event_id    = '1';
        const page_id     = '1';
        Game_Interpreter.prototype.pluginCommandFrame2Text('EXPORT_EVENT_TO_MESSAGE', [
            folder_name, file_name, map_id, event_id, page_id
        ]);

        const overwrite   = 'true';
        Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT', [
            folder_name, file_name, map_id, event_id, page_id, overwrite
        ]);

        const expected_json = JSON.parse(expected_data);
        const actual_json = JSON.parse(message_2_event);
        expect(actual_json).to.eql(expected_json);
        done();
      });
      });
    })
  });
})

describe("Skip(109) round-trip", function () {
  it("preserves a Skip block through decompile -> compile", function () {
    const list = [
      { code: 109, indent: 0, parameters: [] },
      { code: 121, indent: 1, parameters: [43, 43, 0] },
      { code: 0, indent: 1, parameters: [] },
      { code: 409, indent: 0, parameters: [] }
    ];
    const body = frame2text.decompile(list, true, { pretty: true });
    expect(body).to.match(/<Skip>/);
    expect(body).to.match(/<SkipEnd>/);
    const cmds = text2frame.compile(body);
    const stripped = (cmds.length && cmds[cmds.length - 1].code === 0) ? cmds.slice(0, -1) : cmds;
    expect(stripped.map(function (c) { return [c.code, c.indent]; }))
      .to.eql([[109, 0], [121, 1], [0, 1], [409, 0]]);
  });
});
