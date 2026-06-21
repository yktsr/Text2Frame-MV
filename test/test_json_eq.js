const chai = require('chai');
const expect = chai.expect;
const sinon = require("sinon");
const fs = require('fs');

const text2frame = require('../Text2Frame.js');

describe('Text2Frame Test', function() {
  const tests = require('./test_cases.js')
  const consoleStub = sinon.stub(console, 'log');
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync');
  const readFileSyncStub = sinon.stub(fs, 'readFileSync');

  it('accepts case-insensitive switch tags', function() {
    expect(text2frame.compile('<switch: 1, ON>')).to.eql([
      { code: 121, indent: 0, parameters: [1, 1, 0] }
    ]);
    expect(text2frame.compile('<SWITCH: 2, OFF>')).to.eql([
      { code: 121, indent: 0, parameters: [2, 2, 1] }
    ]);
  });

  it('accepts case-insensitive face tags', function() {
    expect(text2frame.compile('<face: Actor1(1)>\nhello')).to.eql([
      { code: 101, indent: 0, parameters: ['Actor1', 1, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['hello'] }
    ]);
    expect(text2frame.compile('<FACE: Actor1(2)>\nhello')).to.eql([
      { code: 101, indent: 0, parameters: ['Actor1', 2, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['hello'] }
    ]);
  });

  it('supports unicode vars names and unicode line separators', function() {
    const input = '#vars\u2028hero=アレックス\u2028town=リンデル\u2028アレックス怒りの表情=Actors1(0)\u2028\u2028ゲーム進行フラグ=1\u2028#endvars\u2028<Face: ${アレックス怒りの表情}>\u2028${hero}は${town}へ向かった。\u2028<Switch: ${ゲーム進行フラグ}, ON>';
    expect(text2frame.compile(input)).to.eql([
      { code: 101, indent: 0, parameters: ['Actors1', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['アレックスはリンデルへ向かった。'] },
      { code: 121, indent: 0, parameters: [1, 1, 0] }
    ]);
  });

  it('supports inline vars on #vars and #endvars lines', function() {
    const input = '#vars hero=アレックス town=リンデル\nアレックス怒りの表情=Actors1(0)\n\nゲーム進行フラグ=1 #endvars\n<Face: ${アレックス怒りの表情}>\n${hero}は${town}へ向かった。\n<Switch: ${ゲーム進行フラグ}, ON>';
    expect(text2frame.compile(input)).to.eql([
      { code: 101, indent: 0, parameters: ['Actors1', 0, 0, 2, ''] },
      { code: 401, indent: 0, parameters: ['アレックスはリンデルへ向かった。'] },
      { code: 121, indent: 0, parameters: [1, 1, 0] }
    ]);
  });

  it('throws on undefined vars in substitution', function() {
    const input = '#vars\nhero=Alex\n#endvars\n${hero} and ${town}';
    expect(() => text2frame.compile(input)).to.throw('Undefined variable. / 未定義の変数です。: town');
  });

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
