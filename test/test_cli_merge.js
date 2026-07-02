const chai = require('chai')
const expect = chai.expect
const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const CLI = path.join(ROOT, 'Text2Frame.js')

function runCli (args) {
  return cp.execFileSync('node', [CLI].concat(args), { cwd: ROOT, encoding: 'utf8' })
}
function listOf (mapPath) {
  return JSON.parse(fs.readFileSync(mapPath, 'utf8')).events[1].pages[0].list
}
function texts (list) {
  return list.filter(function (c) { return c.code === 401 }).map(function (c) { return c.parameters[0] })
}
function hasSwitch (list) {
  return list.some(function (c) { return c.code === 121 })
}

describe('CLI merge strategies (--mode map)', function () {
  let tmp
  let mapPath
  let textPath
  let basePath

  beforeEach(function () {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2fcli-'))
    mapPath = path.join(tmp, 'Map001.json')
    fs.writeFileSync(mapPath, JSON.stringify({
      events: [null, {
        id: 1,
        name: 'EV',
        pages: [{ list: [
          { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
          { code: 401, indent: 0, parameters: ['Hello'] },
          { code: 121, indent: 0, parameters: [7, 7, 0, 0] }, // dev-added switch
          { code: 0, indent: 0, parameters: [] }
        ] }]
      }]
    }))
    textPath = path.join(tmp, 'ev.txt')
    fs.writeFileSync(textPath, '---\nkind: event\nmapId: 1\neventId: 1\npageId: 1\n---\n\nBonjour\n')
    basePath = path.join(tmp, 'base.txt')
    fs.writeFileSync(basePath, 'Hello\n') // ancestor: message only, no switch
  })

  afterEach(function () {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  })

  it('overlay keeps non-conversation commands and translates text', function () {
    runCli(['--mode', 'map', '--strategy', 'overlay', '--text_path', textPath, '--output_path', mapPath, '--event_id', '1', '--page_id', '1'])
    const list = listOf(mapPath)
    expect(hasSwitch(list)).to.equal(true)
    expect(texts(list)).to.eql(['Bonjour'])
  })

  it('merge3 with --base merges writer text and dev switch cleanly', function () {
    runCli(['--mode', 'map', '--strategy', 'merge3', '--base', basePath, '--text_path', textPath, '--output_path', mapPath, '--event_id', '1', '--page_id', '1'])
    const list = listOf(mapPath)
    expect(hasSwitch(list)).to.equal(true)
    expect(texts(list)).to.eql(['Bonjour'])
  })

  it('merge3 without --base falls back to overlay (still keeps switch)', function () {
    runCli(['--mode', 'map', '--strategy', 'merge3', '--text_path', textPath, '--output_path', mapPath, '--event_id', '1', '--page_id', '1'])
    const list = listOf(mapPath)
    expect(hasSwitch(list)).to.equal(true)
    expect(texts(list)).to.eql(['Bonjour'])
  })
})
