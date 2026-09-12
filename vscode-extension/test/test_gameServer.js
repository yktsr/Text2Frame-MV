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
