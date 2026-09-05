const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')

Game_Interpreter = {}
Game_Interpreter.prototype = {}
$gameMessage = {}
$gameMessage.add = function () {}

PluginManager = {}
PluginManager.parameters = function (str) {
  return {
    'Default Window Position': 'Bottom',
    'Default Background': 'Window',
    'Default Scenario Folder': '',
    'Default Scenario File': '',
    'Default Common Event ID': '1',
    'Default MapID': '1',
    'Default EventID': '1',
    IsOverwrite: 'true',
    'Comment Out Char': '%',
    IsDebug: 'false'
  }
}

const text2frame = require('../Text2Frame.js')
const frame2text = require('../Frame2Text.js')

describe('Frame2Text Test', function () {
  const tests = require('./test_cases.js')
  sinon.stub(console, 'log')
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
  const readFileSyncStub = sinon.stub(fs, 'readFileSync')
  // 祖先スナップショット(.t2f-base)の保存で実ディレクトリを作らせない。
  sinon.stub(fs, 'mkdirSync')

  tests.forEach(function (test, index) {
    it(test.title, function (done) {
      fs.readFile(test.mapfile, 'utf8', function (err, test_map_data) {
        if (err) return done(err)
        fs.readFile(test.expfile, 'utf8', function (err, expected_data) {
          if (err) return done(err)
          let event_2_message = ''
          let message_2_event = ''
          // 取り出しの最中か、反映の最中か。同じ Map001.json でも返すものが違うため。
          let phase = 'export'

          // 書き込みはパスで振り分ける(祖先スナップショットの保存が挟まっても壊れないように)。
          writeFileSyncStub.callsFake(function (file_path, data, encoding) {
            const p = String(file_path)
            if (p.indexOf('.t2f-base') !== -1) { return file_path } // 祖先は検証対象外
            if (/\.json$/i.test(p)) {
              message_2_event = data // テキスト -> データJSON(反映結果)
            } else {
              event_2_message = data // データ -> テキスト(書き出し結果)
            }
            return file_path
          })
          /* 読み込みもパスで振り分ける。呼び出し回数で並べると、経路に読み込みが
         * 1つ増えただけで全件ずれる(実際に一度そうなった)。 */
          readFileSyncStub.callsFake(function (file_path, encoding) {
            const p = String(file_path)
            if (p.indexOf('.t2f-base') !== -1) { throw new Error('no base') } // 祖先は無い扱い
            if (/\.json$/i.test(p)) {
              return phase === 'export' ? expected_data : test_map_data
            }
            return event_2_message // 取り出したテキスト(取り出し前は空文字)
          })

          const folder_name = ''
          const file_name = ''
          const map_id = '1'
          const event_id = '1'
          const page_id = '1'
          // 往復の検査なので、既存テキストと突き合わせない全上書きで取り出す
          // (取り出しの既定は merge)。
          Game_Interpreter.prototype.pluginCommandFrame2Text('EXPORT_EVENT_TO_MESSAGE', [
            folder_name, file_name, map_id, event_id, page_id, 'overwrite'
          ])

          phase = 'import'
          const overwrite = 'true'
          Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT', [
            folder_name, file_name, map_id, event_id, page_id, overwrite
          ])

          const expected_json = JSON.parse(expected_data)
          const actual_json = JSON.parse(message_2_event)
          expect(actual_json).to.eql(expected_json)
          done()
        })
      })
    })
  })
})

describe('Skip(109) round-trip', function () {
  it('preserves a Skip block through decompile -> compile', function () {
    const list = [
      { code: 109, indent: 0, parameters: [] },
      { code: 121, indent: 1, parameters: [43, 43, 0] },
      { code: 0, indent: 1, parameters: [] },
      { code: 409, indent: 0, parameters: [] }
    ]
    const body = frame2text.decompile(list, true, { pretty: true })
    expect(body).to.match(/<Skip>/)
    expect(body).to.match(/<SkipEnd>/)
    const cmds = text2frame.compile(body)
    const stripped = (cmds.length && cmds[cmds.length - 1].code === 0) ? cmds.slice(0, -1) : cmds
    expect(stripped.map(function (c) { return [c.code, c.indent] }))
      .to.eql([[109, 0], [121, 1], [0, 1], [409, 0]])
  })
})

describe('empty message line (<br>) round-trip', function () {
  function rt (list) {
    const body = frame2text.decompile(list, true, { pretty: true })
    const cmds = text2frame.compile(body)
    const stripped = (cmds.length && cmds[cmds.length - 1].code === 0) ? cmds.slice(0, -1) : cmds
    return { body, codes: stripped.map(function (c) { return c.code }), cmds: stripped }
  }
  it('preserves a Show Text whose only line is empty (101 + empty 401)', function () {
    const list = [
      { code: 101, indent: 0, parameters: ['', 0, 2, 2] },
      { code: 401, indent: 0, parameters: [''] },
      { code: 235, indent: 0, parameters: [50] }
    ]
    const r = rt(list)
    expect(r.body).to.match(/<br>/)
    expect(r.codes).to.eql([101, 401, 235])
    expect(r.cmds[1].parameters[0]).to.equal('')
  })
  it('preserves an empty line in the middle of a message (does not split the window)', function () {
    const list = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2] },
      { code: 401, indent: 0, parameters: ['A'] },
      { code: 401, indent: 0, parameters: [''] },
      { code: 401, indent: 0, parameters: ['B'] }
    ]
    const r = rt(list)
    expect(r.codes).to.eql([101, 401, 401, 401]) // one window, three lines (no extra 101)
    expect(r.cmds.map(function (c) { return c.parameters[0] })).to.eql(['', 'A', '', 'B'])
  })
})

describe('blank line after message text', function () {
  const list = [
    { code: 101, indent: 0, parameters: ['', 0, 0, 2] },
    { code: 401, indent: 0, parameters: ['ここを耐えれば、マリクに勝てるんだから！'] },
    { code: 121, indent: 0, parameters: [7, 7, 0] },
    { code: 101, indent: 0, parameters: ['', 0, 0, 2] },
    { code: 401, indent: 0, parameters: ['次の相手は…'] },
    { code: 401, indent: 0, parameters: ['城之内だ。'] },
    { code: 250, indent: 0, parameters: [{ name: 'Bell1', volume: 90, pitch: 100, pan: 0 }] }
  ]

  it('separates a message block from the command that follows it', function () {
    const body = frame2text.decompile(list, true, { pretty: true })
    expect(body).to.contain('マリクに勝てるんだから！\n\n<Switch:')
    expect(body).to.contain('城之内だ。\n\n<PlaySE:')
  })

  it('does not separate the lines inside one message block', function () {
    const body = frame2text.decompile(list, true, { pretty: true })
    // 空行を挟むと compile がウィンドウを分けてしまうため、本文の連続は詰めたまま。
    expect(body).to.contain('次の相手は…\n城之内だ。')
  })

  it('round-trips: the blank line adds no command', function () {
    const body = frame2text.decompile(list, true, { pretty: true })
    const cmds = text2frame.compile(body)
    const stripped = (cmds.length && cmds[cmds.length - 1].code === 0) ? cmds.slice(0, -1) : cmds
    expect(stripped.map(function (c) { return c.code })).to.eql([101, 401, 121, 101, 401, 401, 250])
  })

  it('leaves non-pretty output untouched', function () {
    const body = frame2text.decompile(list, true)
    expect(body).to.not.contain('\n\n')
  })
})

describe('long-tail round-trip fixes', function () {
  function rt (list) {
    const body = frame2text.decompile(list, true, { pretty: true })
    const cmds = text2frame.compile(body)
    return (cmds.length && cmds[cmds.length - 1].code === 0) ? cmds.slice(0, -1) : cmds
  }
  it('preserves a move-route Script (45) containing commas and mixed case verbatim', function () {
    const script = 'this.moveTowardCharacter({x: 22, y: 12})'
    const route = { list: [{ code: 45, indent: null, parameters: [script] }, { code: 0, indent: null }], repeat: false, skippable: false, wait: false }
    const list = [
      { code: 205, indent: 0, parameters: [-1, route] },
      { code: 505, indent: 0, parameters: [{ code: 45, indent: null, parameters: [script] }] }
    ]
    const cmds = rt(list)
    const mc = cmds.find(function (c) { return c.code === 505 })
    expect(mc.parameters[0].parameters[0]).to.equal(script)
  })
  it('preserves a message line of full-width spaces (not dropped as blank)', function () {
    const list = [
      { code: 101, indent: 0, parameters: ['', 0, 0, 2] },
      { code: 401, indent: 0, parameters: ['　　　　'] }
    ]
    const cmds = rt(list)
    const line = cmds.find(function (c) { return c.code === 401 })
    expect(line.parameters[0]).to.equal('　　　　')
  })
})
