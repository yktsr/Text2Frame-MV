const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const http = require('http')
const net = require('net')
const { startGameServer, stablePort, resolveRequestPath } = require('../out/gameServer')

/* リクエストをそのまま送る(http.get は ../ を丸めてしまうので、パスは生で書く)。 */
const request = function (port, rawPath, headers) {
  return new Promise(function (resolve, reject) {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, headers: headers || {} }, function (res) {
      const chunks = []
      res.on('data', function (c) { chunks.push(c) })
      res.on('end', function () { resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }) })
    })
    req.on('error', reject)
    req.end()
  })
}

describe('gameServer', function () {
  let parent
  let root
  let server

  before(async function () {
    parent = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-serve-'))
    root = path.join(parent, 'game')
    fs.mkdirSync(path.join(root, 'data'), { recursive: true })
    fs.mkdirSync(path.join(root, 'effects'))
    fs.writeFileSync(path.join(root, 'index.html'), '<title>game</title>')
    fs.writeFileSync(path.join(root, 'data', 'System.json'), '{"gameTitle":"x"}')
    fs.writeFileSync(path.join(root, 'effects', 'effekseer.wasm'), Buffer.from([0, 97, 115, 109]))
    fs.writeFileSync(path.join(root, 'ゲーム.txt'), '0123456789')
    fs.writeFileSync(path.join(parent, 'secret.txt'), 'secret') // ゲームのフォルダの外
    server = await startGameServer(root, 0)
  })

  after(async function () {
    await server.close()
    fs.rmSync(parent, { recursive: true, force: true })
  })

  it('serves the game files with their types and no caching', async function () {
    const page = await request(server.port, '/index.html?test')
    expect(page.status).to.equal(200)
    expect(page.headers['content-type']).to.equal('text/html; charset=utf-8')
    expect(page.headers['cache-control']).to.equal('no-store')
    expect((await request(server.port, '/')).body.toString()).to.equal('<title>game</title>')
    expect((await request(server.port, '/data/System.json')).headers['content-type']).to.contain('application/json')
    expect((await request(server.port, '/effects/effekseer.wasm')).headers['content-type']).to.equal('application/wasm')
    expect((await request(server.port, '/' + encodeURIComponent('ゲーム.txt'))).body.toString()).to.equal('0123456789')
    expect((await request(server.port, '/nothing.png')).status).to.equal(404)
  })

  it('never serves a file outside the game folder', async function () {
    for (const p of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/data/../../secret.txt', '/..\\secret.txt']) {
      const res = await request(server.port, p)
      expect(res.status, p).to.not.equal(200)
      expect(res.body.toString(), p).to.not.contain('secret')
    }
    expect(resolveRequestPath(root, '/../secret.txt')).to.equal(path.join(root, 'secret.txt'))
    expect(resolveRequestPath(root, '/a%00b')).to.equal(undefined)
  })

  it('answers range requests (for movies)', async function () {
    const res = await request(server.port, '/' + encodeURIComponent('ゲーム.txt'), { Range: 'bytes=2-5' })
    expect(res.status).to.equal(206)
    expect(res.headers['content-range']).to.equal('bytes 2-5/10')
    expect(res.body.toString()).to.equal('2345')
    expect((await request(server.port, '/' + encodeURIComponent('ゲーム.txt'), { Range: 'bytes=-3' })).body.toString()).to.equal('789')
    expect((await request(server.port, '/' + encodeURIComponent('ゲーム.txt'), { Range: 'bytes=20-' })).status).to.equal(416)
  })

  it('refuses anything but GET and HEAD', async function () {
    const res = await new Promise(function (resolve) {
      const req = http.request({ host: '127.0.0.1', port: server.port, path: '/index.html', method: 'POST' }, resolve)
      req.end()
    })
    expect(res.statusCode).to.equal(405)
    res.resume()
  })

  it('serves pages as they are without a state handler', async function () {
    expect((await request(server.port, '/index.html')).body.toString()).to.equal('<title>game</title>')
    expect((await request(server.port, '/__t2f/state')).status).to.equal(404)
  })

  it('takes values from the game only with the token', async function () {
    const received = []
    const live = await startGameServer(root, 0, { onState: function (m) { received.push(m) } })
    const post = function (body, headers) {
      return new Promise(function (resolve, reject) {
        const req = http.request({ host: '127.0.0.1', port: live.port, path: '/__t2f/state', method: 'POST', headers }, function (res) {
          res.resume()
          res.on('end', function () { resolve(res.statusCode) })
        })
        req.on('error', reject)
        req.end(body)
      })
    }
    try {
      const page = (await request(live.port, '/index.html?test')).body.toString()
      expect(page.startsWith('<title>game</title>')).to.equal(true)
      const token = /var TOKEN = "([0-9a-f]{32})"/.exec(page)[1]
      expect((await request(live.port, '/data/System.json')).body.toString()).to.equal('{"gameTitle":"x"}')
      expect(fs.readFileSync(path.join(root, 'index.html'), 'utf8')).to.equal('<title>game</title>')

      expect(await post('{"reset":true,"switches":{"3":true}}', { 'x-t2f-token': token })).to.equal(204)
      expect(received).to.have.length(1)
      expect(received[0].reset).to.equal(true)
      expect(received[0].switches.get(3)).to.equal(true)

      expect(await post('{"switches":{"3":false}}', {})).to.equal(403)
      expect(await post('{"switches":{"3":false}}', { 'x-t2f-token': token.replace(/./, 'z') })).to.equal(403)
      expect(await post('{"switches":{"3":"no"}}', { 'x-t2f-token': token })).to.equal(400)
      expect(await post('not json', { 'x-t2f-token': token })).to.equal(400)
      expect((await request(live.port, '/__t2f/state', { 'x-t2f-token': token })).status).to.equal(403)
      expect(received).to.have.length(1)
    } finally {
      await live.close()
    }
  })

  it('sends values to the pages that listen with the token', async function () {
    const live = await startGameServer(root, 0, { onState: function () {} })
    try {
      const token = /var TOKEN = "([0-9a-f]{32})"/.exec((await request(live.port, '/index.html')).body.toString())[1]
      expect((await request(live.port, '/__t2f/events?token=wrong')).status).to.equal(403)
      expect(live.send({ switches: { 1: true } })).to.equal(0)
      const received = await new Promise(function (resolve, reject) {
        const req = http.get({ host: '127.0.0.1', port: live.port, path: '/__t2f/events?token=' + token }, function (res) {
          expect(res.statusCode).to.equal(200)
          expect(res.headers['content-type']).to.contain('text/event-stream')
          let body = ''
          res.on('data', function (c) {
            body += c
            if (body.includes(': connected')) {
              if (!body.includes('data:')) expect(live.send({ switches: { 1: true }, variables: { 2: 'a' }, selfSwitches: { '3,4,A': true } })).to.equal(1)
              const m = /data: (.*)\n\n/.exec(body)
              if (m) { req.destroy(); resolve(JSON.parse(m[1])) }
            }
          })
        })
        req.on('error', reject)
      })
      expect(received).to.eql({ switches: { 1: true }, variables: { 2: 'a' }, selfSwitches: { '3,4,A': true } })
    } finally {
      await live.close()
    }
  })

  it('keeps the same port for the same folder, and moves when it is taken', async function () {
    expect(stablePort(root)).to.equal(stablePort(root + path.sep))
    expect(stablePort(root)).to.be.within(40000, 59999)
    const blocker = net.createServer()
    await new Promise(function (resolve) { blocker.listen(0, '127.0.0.1', resolve) })
    const taken = blocker.address().port
    const other = await startGameServer(root, taken)
    try {
      expect(other.port).to.not.equal(taken)
      expect((await request(other.port, '/index.html')).status).to.equal(200)
    } finally {
      await other.close()
      blocker.close()
    }
  })
})
