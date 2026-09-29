const { expect } = require('chai')
const sinon = require('sinon')
const fs = require('fs')
const { installEngine, msg, bottom, texts } = require('./helpers')

// 省略時の設定を add と区別できるようにする。
const { registered } = installEngine({ IsOverwrite: 'overwrite', DisplayMsg: 'false' })
Game_Interpreter.prototype.pluginCommand = function () {}
require('../Text2Frame.js')
const source = fs.readFileSync(require.resolve('../Text2Frame.js'), 'utf8')

describe('MZ import commands with the preserved IsOverwrite argument', function () {
  const cases = [
    {
      command: 'IMPORT_MESSAGE_TO_EVENT',
      args: { FileFolder: 'text', FileName: 'message.txt', MapID: '1', EventID: '1', PageID: '1' },
      file: 'Map001.json',
      data: function (list) { return { events: [null, { id: 1, pages: [{ list }] }] } },
      list: function (data) { return data.events[1].pages[0].list }
    },
    {
      command: 'IMPORT_MESSAGE_TO_CE',
      args: { FileFolder: 'text', FileName: 'message.txt', CommonEventID: '1' },
      file: 'CommonEvents.json',
      data: function (list) { return [null, { id: 1, list }] },
      list: function (data) { return data[1].list }
    }
  ]

  cases.forEach(function (c) {
    describe(c.command, function () {
      let written

      beforeEach(function () {
        written = undefined
        const list = msg('Hello').concat([{ code: 121, indent: 0, parameters: [7, 7, 0] }, bottom])
        sinon.stub(fs, 'readFileSync').callsFake(function (p) {
          const name = String(p)
          if (name.includes('.t2f-base')) return 'Hello\n'
          if (name.endsWith(c.file)) return JSON.stringify(c.data(list))
          if (name.endsWith('message.txt')) return 'Bonjour\n'
          throw new Error('Unexpected read: ' + name)
        })
        sinon.stub(fs, 'writeFileSync').callsFake(function (p, data) {
          const name = String(p)
          if (name.includes('.t2f-base')) return
          if (!name.endsWith(c.file)) throw new Error('Unexpected write: ' + name)
          written = JSON.parse(data)
        })
        sinon.stub(fs, 'mkdirSync')
        sinon.stub(console, 'log')
      })

      afterEach(function () { sinon.restore() })

      it('exposes the original argument key and all five choices in the editor', function () {
        const definition = source.split('@command ' + c.command + '\n')[1].split('@command ')[0]
        expect(definition).to.not.include('@arg Strategy')
        const argument = definition.split('@arg IsOverwrite\n')[1]
        expect(argument).to.be.a('string')
        expect(argument).to.include('@text 反映方法')
        expect(argument).to.include('@type select')
        expect(argument).to.include('@default add')
        const values = Array.from(argument.matchAll(/@value (\S+)/g), function (m) { return m[1] })
        expect(values).to.eql(['add', 'merge', 'overwrite', 'true', 'false'])
      })

      const choices = [
        { value: 'add', expected: ['Hello', 'Bonjour'], keepsSwitch: true },
        { value: 'merge', expected: ['Bonjour'], keepsSwitch: true },
        { value: 'overwrite', expected: ['Bonjour'], keepsSwitch: false },
        { value: 'true', expected: ['Bonjour'], keepsSwitch: false },
        { value: 'false', expected: ['Hello', 'Bonjour'], keepsSwitch: true },
        { value: undefined, expected: ['Bonjour'], keepsSwitch: false },
        { value: '', expected: ['Bonjour'], keepsSwitch: false }
      ]
      choices.forEach(function (choice) {
        it('imports through the MZ handler with IsOverwrite=' + JSON.stringify(choice.value), function () {
          const handler = registered.find(function (r) { return r.plugin === 'Text2Frame' && r.name === c.command })
          const args = Object.assign({}, c.args)
          if (choice.value !== undefined) args.IsOverwrite = choice.value
          handler.fn.call(Game_Interpreter.prototype, args)

          expect(written).to.not.equal(undefined)
          const list = c.list(written)
          expect(texts(list)).to.eql(choice.expected)
          expect(list.some(function (command) { return command.code === 121 })).to.equal(choice.keepsSwitch)
        })
      })
    })
  })
})
