/*
 * MCP のプロトコルの表面を書き出す / 照合する。
 *
 *   node tools/snapshot-mcp.js           test/snapshot/mcp-protocol.txt を書き直す
 *   node tools/snapshot-mcp.js --check   ずれていれば終了コード 1(書き換えない)
 *
 * 何を見張るか: server/discover の結果、tools/list の全文(道具の名前・説明・inputSchema・
 * annotations)、そしてエラーの形。**道具の説明文が LLM への唯一の案内**なので、ここが
 * 黙って変わるのが一番怖い。手で書く assert では「説明から1文が消えた」に気づけない。
 *
 * 何を見張らないか: 道具の出力。絶対パスや一時フォルダ名が混じって決定的にならないので、
 * そちらは test/test_mcp.js で普通に assert する。
 *
 * 決定的にするために: 時刻を入れない。版は <version> に置き換える(リリースごとに
 * 筆記録が動くのを避ける。見たいのはプロトコルの形で、版番号ではない)。
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const mcp = require(path.join(root, 't2f-mcp.js'))

const OUT = path.join(root, 'test', 'snapshot', 'mcp-protocol.txt')

const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
  'io.modelcontextprotocol/clientInfo': { name: 'snapshot', version: '1.0.0' }
}

/* 記録する往復。道具の出力は含めない(上のコメントの理由)。 */
const EXCHANGES = [
  { label: 'server/discover', request: { jsonrpc: '2.0', id: 1, method: 'server/discover', params: { _meta: META } } },
  { label: 'tools/list', request: { jsonrpc: '2.0', id: 2, method: 'tools/list', params: { _meta: META } } },
  {
    label: 'tools/list (--read-only)',
    readOnly: true,
    request: { jsonrpc: '2.0', id: 3, method: 'tools/list', params: { _meta: META } }
  },
  { label: 'エラー: _meta が無い', request: { jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} } },
  {
    label: 'エラー: 知らない版',
    request: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/list',
      params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '1900-01-01', 'io.modelcontextprotocol/clientCapabilities': {} } }
    }
  },
  { label: 'エラー: 知らないメソッド', request: { jsonrpc: '2.0', id: 6, method: 'tools/nope', params: { _meta: META } } },
  {
    label: 'エラー: 知らない道具',
    request: { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 't2f_nope', arguments: {}, _meta: META } }
  },
  { label: 'エラー: 旧方式の initialize', request: { jsonrpc: '2.0', id: 8, method: 'initialize', params: {} } },
  { label: '通知(応答しない)', request: { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 2 } } }
]

/* 版だけは置き換える。ほかは一切触らない(触ると見張る意味が薄れる)。 */
const redact = function (value) {
  return JSON.parse(JSON.stringify(value).split('"' + mcp.version() + '"').join('"<version>"'))
}

const build = function () {
  // root はどの応答にも出てこない(discover と tools/list はプロジェクトを読まない)。
  const normal = mcp.createContext({ root: path.join(root, 'Project1') })
  const readOnly = mcp.createContext({ root: path.join(root, 'Project1'), readOnly: true })
  const lines = [
    '# MCP のプロトコルの筆記録',
    '# tools/snapshot-mcp.js が作る生成物。手で編集しない。',
    '# 作り直す: npm run update-mcp-snapshot',
    ''
  ]
  EXCHANGES.forEach(function (exchange) {
    const response = mcp.handle(exchange.request, exchange.readOnly ? readOnly : normal)
    lines.push('===== ' + exchange.label + ' =====')
    lines.push('--> ' + JSON.stringify(exchange.request))
    lines.push('<-- ' + (response === null ? '(応答なし)' : JSON.stringify(redact(response), null, 2)))
    lines.push('')
  })
  return lines.join('\n')
}

const write = function () {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  const next = build()
  let current = null
  try { current = fs.readFileSync(OUT, 'utf8') } catch (e) { /* まだ無い */ }
  if (current === next) return false
  fs.writeFileSync(OUT, next, 'utf8')
  return true
}

const stale = function () {
  let current = null
  try { current = fs.readFileSync(OUT, 'utf8') } catch (e) { /* 無いのもずれ */ }
  return current !== build()
}

module.exports = { build, write, stale, OUT, EXCHANGES, META }

if (require.main === module) {
  if (process.argv.includes('--check')) {
    if (stale()) {
      console.error('MCP の筆記録がずれています。')
      console.error('作り直してから差分を確かめてください: npm run update-mcp-snapshot')
      process.exit(1)
    }
    console.log('MCP の筆記録は最新です (' + EXCHANGES.length + ' 往復)')
  } else {
    console.log(write()
      ? '書き直しました: ' + path.relative(root, OUT)
      : '変わりませんでした (' + EXCHANGES.length + ' 往復)')
  }
}
