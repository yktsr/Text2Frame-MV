#!/usr/bin/env node
/*
 * t2f-mcp — Text2Frame を MCP(Model Context Protocol)の道具として差し出すサーバ。
 *
 *   npx @yktsr/text2frame-mv t2f-mcp --root <ゲームのフォルダ>
 *
 * プラグインコマンド・CLI・VSCode 拡張に続く4つ目の前面。変換は何もせず、
 * Text2Frame / Frame2Text の公開 API をそのまま呼ぶ。
 *
 * 作りを2つに分ける理由:
 *   handler は (要求) -> 応答 の純粋な関数。テストはプロセス内で直に叩ける。
 *   殻(startServer)だけが stdin/stdout を持つ。常駐プロセスを起こすテストは
 *   tools/run-tests.js に kill もタイムアウトも無いため、1つ漏らすと全体が止まる。
 *
 * 不変条件:
 *   1. stdout には MCP のメッセージ以外を1バイトも書かない。殻に入った直後に本物の
 *      process.stdout.write を退避し、以後 process.stdout.write は stderr へ流す。
 *      ライブラリの中には console.log を持つ経路がある(今は _quiet で抑制されているが、
 *      通らない経路が増えた日に通路が壊れる)。
 *   2. 道具の handler は同期で書く。applyTextFile は共有の可変状態を退避・復元して
 *      使うが、それ自体が完全に同期なので、await を挟まない限り交錯しない。
 *   3. パスは全部絶対にしてから渡し、baseRoot を必ず明示する(省くと基準がこのファイルの
 *      置き場所になる)。--root の外は拒否する。
 */
'use strict'

const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')

/* ---------- プロトコルの定数 ---------- */

// 対応するのは無状態方式だけ。旧方式(initialize の握手)は実装しない。
const PROTOCOL_VERSIONS = ['2026-07-28']
const SERVER_NAME = 'text2frame-mv'

const META_VERSION = 'io.modelcontextprotocol/protocolVersion'
const META_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities'
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo'

// JSON-RPC の汎用コードと、MCP が定めたコード(-32020..-32099 は仕様の予約)。
const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602
const INTERNAL_ERROR = -32603
const UNSUPPORTED_PROTOCOL_VERSION = -32022

/* キャッシュの指定。仕様の CacheableResult が ttlMs と cacheScope を**必須**で持ち、
 * DiscoverResult と ListToolsResult がそれを継承する(resources / prompts の一覧も同じだが
 * こちらは出していない)。CallToolResult は継承しないので載せてはいけない。
 *
 * 0 は「すぐ陳腐」。道具の一覧は起動時の旗(--read-only)からプロセス内で純粋に決まるので
 * 作り直しが無料で、キャッシュが何も買わない。将来一覧がプロジェクトの状態に依るように
 * なっても 0 なら陳腐化しない。private は、この一覧が「このプロセスの旗」を映したもので
 * あって、認可の文脈を越えて共有してよいものではないから。 */
const CACHE_TTL_MS = 0
const CACHE_SCOPE = 'private'

/* LLM への入口。道具の説明だけでは伝わらない「このツールの癖」をここに置く。 */
const INSTRUCTIONS = [
  'RPGツクール MV/MZ のイベントを、テキストとして読み書きします。',
  '',
  '・反映方法は merge(統合)が既定。祖先(.t2f-base)との3方向マージで、両方が同じ所を直すと',
  '  目印3行で両方残り、目印がある間は次の統合が止まります。どちらかを残して目印を消してください。',
  '・祖先が無い初回の反映だけはテキストが丸ごと勝ちます(ゲーム側の編集は残りません)。警告で知らせます。',
  '・タグ記法は t2f_syntax で引けます。当て推量で書かないでください。',
  '・スイッチや変数の番号は t2f_names で名前から引けます。',
  '・書き込みは2段です。t2f_write_plan で何が変わるかを見てから、返ってきた札を t2f_write_apply に渡します。',
  '・RPGツクールのエディタを開いたまま、または t2f-sync の監視を動かしたまま書き込まないでください。',
  '  どちらも data/*.json を書き戻すので、反映した内容が失われます。'
].join('\n')

/* ---------- 小さな道具 ---------- */

let _version = null
const version = function () {
  if (_version === null) {
    try {
      _version = String(JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version)
    } catch (e) { _version = '0.0.0' }
  }
  return _version
}

const jsonrpcError = function (id, code, message, data) {
  const error = { code, message }
  if (data !== undefined) error.data = data
  return { jsonrpc: '2.0', id: id === undefined ? null : id, error }
}

/* 結果には resultType と serverInfo を必ず載せる(どちらも仕様の求め)。 */
const jsonrpcResult = function (id, result) {
  const body = Object.assign({ resultType: 'complete' }, result)
  body._meta = Object.assign({}, body._meta)
  body._meta[META_SERVER_INFO] = { name: SERVER_NAME, version: version() }
  return { jsonrpc: '2.0', id, result: body }
}

/** 一覧ものの結果に付けるキャッシュの指定。付ける先は CACHE_TTL_MS のコメントのとおり。 */
const cacheable = function (result) {
  return Object.assign({ ttlMs: CACHE_TTL_MS, cacheScope: CACHE_SCOPE }, result)
}

/** 道具の返り値。本文は人とモデルが読む文、structured は機械が読む形。 */
const toolResult = function (text, structured) {
  const out = { content: [{ type: 'text', text }] }
  if (structured !== undefined) out.structuredContent = structured
  return out
}

/** 道具の中で起きたこと。モデルが読んで直せるよう本文で返す(JSON-RPC エラーにしない)。 */
const toolError = function (text) {
  return { content: [{ type: 'text', text }], isError: true }
}

/** --root の外を指していないか。祖先(.t2f-base)が取り残され、別プロジェクトと鍵を取り合うため。 */
const insideRoot = function (root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target))
  if (rel === '') return true
  return !path.isAbsolute(rel) && rel.split(path.sep)[0] !== '..'
}

const relOf = function (ctx, abs) {
  const rel = path.relative(ctx.root, abs)
  return rel.split(path.sep).join('/')
}

/** テキストのフォルダを掘って .txt を集める(並びは毎回同じ)。 */
const textFiles = function (dir) {
  const out = []
  const walk = function (current) {
    let names = []
    try { names = fs.readdirSync(current).sort() } catch (e) { return }
    names.forEach(function (name) {
      const abs = path.join(current, name)
      let stat = null
      try { stat = fs.statSync(abs) } catch (e) { return }
      if (stat.isDirectory()) {
        // 祖先と履歴の控えはテキストではない。
        if (name !== '.t2f-base' && name !== '.t2f-history') walk(abs)
      } else if (/\.txt$/i.test(name)) out.push(abs)
    })
  }
  walk(dir)
  return out
}

// 衝突の目印。3行のうち1行でも残っていれば未解決。
const MARKERS = ['=== テキストの変更 / from text ===', '=== ゲームの変更 / from game ===']
const hasMarker = function (text) {
  return MARKERS.some(function (m) { return text.indexOf(m) !== -1 })
}

/* ---------- 文脈(起動時に1回だけ決める) ---------- */

const createContext = function (options) {
  const o = options || {}
  const root = path.resolve(o.root || process.env.T2F_GAME_DIR || process.cwd())
  const dataDir = path.resolve(root, o.dataDir || 'data')
  const textDir = path.resolve(root, o.textDir || 'text')
  if (!insideRoot(root, dataDir)) throw new Error('data のフォルダが --root の外にあります: ' + dataDir)
  if (!insideRoot(root, textDir)) throw new Error('text のフォルダが --root の外にあります: ' + textDir)

  /* 読み込むのは生のファイル1組だけ。2つ読むと Game_Interpreter.prototype が後勝ちになり、
   * 片方の applyTextFile が他方の中身を動かして警告や衝突が空で返る。 */
  const t2f = require(path.join(__dirname, 'Text2Frame.js'))
  const f2t = require(path.join(__dirname, 'Frame2Text.js'))

  const strategy = String(o.strategy || 'merge').toLowerCase()
  if (strategy !== 'merge' && strategy !== 'overwrite') {
    throw new Error('反映方法は merge か overwrite です: ' + o.strategy)
  }
  // ヘルプの解析は 12000 行を読むので、引かれたときに1回だけ。
  let help = null
  return {
    root,
    dataDir,
    textDir,
    strategy,
    // 取り出す範囲は明示して渡す。省くと enumerateTargets が conversation に落ちる。
    scope: String(o.scope || 'nonempty').toLowerCase(),
    readOnly: !!o.readOnly,
    // 控えを残す数。拡張の text2frame.history.keep と同じ既定。
    historyKeep: o.historyKeep === undefined ? 100 : Number(o.historyKeep),
    t2f,
    f2t,
    log: o.log || function () {},
    help: function () {
      if (help === null) {
        const parser = require(path.join(__dirname, 't2f-help.js'))
        help = parser.buildTagHelp(fs.readFileSync(parser.COMPILER, 'utf8'))
      }
      return help
    }
  }
}

/* ---------- 宛先の解決 ---------- */

const targetsOf = function (ctx, scope) {
  const index = ctx.f2t.indexTexts(ctx.textDir)
  const targets = ctx.f2t.enumerateTargets(ctx.dataDir, { scope: scope || ctx.scope, index })
  return { index, targets }
}

const mapFileName = function (mapId) { return 'Map' + ('00' + String(mapId)).slice(-3) + '.json' }

/** 宛先1件のコマンド列。データのパスは必ず正規の形で作る(Laurus の MapID 持ち越しを避ける)。 */
const listOf = function (ctx, target) {
  if (String(target.kind) === 'common') {
    const data = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, 'CommonEvents.json'), 'utf8'))
    const ce = data[Number(target.commonEventId)]
    if (!ce) throw new Error('コモンイベントが見つかりません: ' + target.commonEventId)
    return ce.list || []
  }
  const map = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, mapFileName(target.mapId)), 'utf8'))
  const ev = map.events && map.events[Number(target.eventId)]
  const page = ev && ev.pages && ev.pages[Number(target.pageId || 1) - 1]
  if (!page) throw new Error('イベントのページが見つかりません: ' + target.key)
  return page.list || []
}

const findTarget = function (ctx, args) {
  const found = targetsOf(ctx, 'all')
  const key = args && args.key
  if (key) {
    const hit = found.targets.filter(function (t) { return t.key === key })[0]
    if (!hit) throw new Error('その宛先はありません: ' + key + '（t2f_list で一覧を見てください）')
    return { target: hit, index: found.index }
  }
  const wanted = args && args.commonEventId !== undefined
    ? { kind: 'common', commonEventId: String(args.commonEventId) }
    : { kind: 'event', mapId: String(args && args.mapId), eventId: String(args && args.eventId), pageId: String((args && args.pageId) || 1) }
  const hit = found.targets.filter(function (t) {
    if (t.kind !== wanted.kind) return false
    if (wanted.kind === 'common') return t.commonEventId === wanted.commonEventId
    return t.mapId === wanted.mapId && t.eventId === wanted.eventId && String(t.pageId) === wanted.pageId
  })[0]
  if (!hit) throw new Error('その宛先はありません（key か mapId/eventId/pageId、または commonEventId を指定してください）')
  return { target: hit, index: found.index }
}

/* ---------- 道具 ---------- */

const TARGET_ARGS = {
  key: { type: 'string', description: 't2f_list が返す宛先の鍵(例 map003_event004_page1)。これだけで足ります' },
  mapId: { type: 'string', description: '鍵の代わりに指定するとき: マップID' },
  eventId: { type: 'string', description: '鍵の代わりに指定するとき: イベントID' },
  pageId: { type: 'string', description: '鍵の代わりに指定するとき: ページ番号(既定 1)' },
  commonEventId: { type: 'string', description: 'コモンイベントを指すとき: その番号' }
}

const TOOLS = []

TOOLS.push({
  name: 't2f_project_info',
  title: 'プロジェクトの状態',
  description: 'ゲームのフォルダ、MV か MZ か、見出し情報の無いテキスト、同じ宛先を指す重複、未解決の衝突の目印を返します。書き込む前にまず読んでください。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: { type: 'object', additionalProperties: false },
  run: function (ctx) {
    const index = ctx.f2t.indexTexts(ctx.textDir)
    const files = textFiles(ctx.textDir)
    const headless = []
    const conflicted = []
    files.forEach(function (abs) {
      let text = ''
      try { text = fs.readFileSync(abs, 'utf8') } catch (e) { return }
      if (!ctx.t2f.parseFrontMatter(text).meta.kind) headless.push(relOf(ctx, abs))
      if (hasMarker(text)) conflicted.push(relOf(ctx, abs))
    })
    const engine = fs.existsSync(path.join(ctx.root, 'js', 'rmmz_core.js'))
      ? 'MZ'
      : (fs.existsSync(path.join(ctx.root, 'js', 'rpg_core.js')) ? 'MV' : 'unknown')
    const info = {
      root: ctx.root,
      dataDir: relOf(ctx, ctx.dataDir),
      textDir: relOf(ctx, ctx.textDir),
      engine,
      strategy: ctx.strategy,
      scope: ctx.scope,
      readOnly: ctx.readOnly,
      textCount: files.length,
      routedCount: Object.keys(index.paths).length,
      withoutFrontMatter: headless,
      duplicates: index.duplicates,
      withConflictMarkers: conflicted
    }
    const notes = [
      'ゲーム: ' + ctx.root + ' (' + engine + ')',
      'テキスト ' + files.length + ' 件のうち ' + Object.keys(index.paths).length + ' 件に見出し情報があります。',
      '見出し情報の無いテキストは反映も取り出しも対象外です' + (headless.length ? '（' + headless.length + ' 件）' : '（0 件）') + '。',
      '索引は各テキストの先頭2048バイトしか読みません。見出しを本文より下に書くと拾われません。'
    ]
    if (Object.keys(index.duplicates).length) {
      notes.push('同じ宛先を指すテキストが複数あるため見送られる宛先: ' + Object.keys(index.duplicates).join(', '))
    }
    if (conflicted.length) {
      notes.push('未解決の衝突の目印が残っているテキスト: ' + conflicted.join(', ') + '（どちらかを残して目印3行を消してください）')
    }
    notes.push('注意: RPGツクールのエディタを開いたまま、または t2f-sync の監視中は書き込まないでください。')
    return toolResult(notes.join('\n'), info)
  }
})

TOOLS.push({
  name: 't2f_list',
  title: '宛先の一覧',
  description: 'ゲームのイベント(とコモンイベント)を一覧します。テキストが既にあればその場所、無ければこれから作られる名前を添えます。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      scope: {
        type: 'string',
        enum: ['all', 'nonempty', 'conversation', 'custom'],
        description: '範囲。nonempty=中身のあるもの(既定) / conversation=会話があるもの / custom=見出し情報付きテキストがあるものだけ / all=全部'
      }
    }
  },
  run: function (ctx, args) {
    const scope = (args && args.scope) || ctx.scope
    const found = targetsOf(ctx, scope)
    const rows = found.targets.map(function (t) {
      const existing = found.index.paths[t.key]
      const row = {
        key: t.key,
        kind: t.kind,
        name: t.name || '',
        textPath: existing ? relOf(ctx, existing) : null,
        plannedTextPath: existing ? null : relOf(ctx, ctx.f2t.outPathFor(ctx.textDir, found.index, t))
      }
      if (t.kind === 'common') row.commonEventId = t.commonEventId
      else {
        row.mapId = t.mapId
        row.eventId = t.eventId
        row.pageId = String(t.pageId)
        row.mapName = t.mapName || ''
        row.mapOrder = t.mapOrder || ''
      }
      if (found.index.duplicates[t.key]) row.skippedBecauseDuplicated = true
      return row
    })
    const lines = rows.map(function (r) {
      const where = r.textPath ? r.textPath : '(まだ無い -> ' + r.plannedTextPath + ')'
      const label = r.kind === 'common' ? 'common ' + r.commonEventId : r.mapName + ' / ' + r.name
      return r.key + '  ' + label + '  ' + where + (r.skippedBecauseDuplicated ? '  [重複のため見送り]' : '')
    })
    return toolResult(rows.length ? lines.join('\n') : '該当する宛先がありません(範囲: ' + scope + ')', { scope, targets: rows })
  }
})

TOOLS.push({
  name: 't2f_read',
  title: 'イベントをテキストで読む',
  description: 'ゲームのイベント1件を Text2Frame のテキストにして返します。ファイルは書きません。translationOnly は会話だけを残しますが不可逆なので、書き戻す元には使えません。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: Object.assign({}, TARGET_ARGS, {
      translationOnly: { type: 'boolean', description: '会話系のコマンドだけを残す(翻訳用。往復しません)' }
    })
  },
  run: function (ctx, args) {
    const found = findTarget(ctx, args)
    const list = listOf(ctx, found.target)
    const header = ctx.f2t.renderFrontMatter(found.target, found.target.kind)
    if (args && args.translationOnly) {
      const body = ctx.f2t.decompile(list, true, { pretty: true, translationOnly: true })
      return toolResult(header + body, { key: found.target.key, translationOnly: true })
    }
    const existing = found.index.paths[found.target.key]
    let existingText = ''
    if (existing) { try { existingText = fs.readFileSync(existing, 'utf8') } catch (e) { existingText = '' } }
    /* 読むだけなので「ゲームの今」をそのまま出す(overwrite)。統合は書き込みの話で、
     * t2f_write_plan が扱う。見出しは既にあるテキストのものを引き継ぐ。 */
    const built = ctx.f2t.buildPullText({
      list,
      strategy: 'overwrite',
      existingText,
      fallbackHeader: header
    })
    return toolResult(built.text, {
      key: found.target.key,
      textPath: existing ? relOf(ctx, existing) : null,
      conflicts: built.conflicts || 0
    })
  }
})

TOOLS.push({
  name: 't2f_search',
  title: 'テキストを横断して探す',
  description: 'text フォルダのテキストを探し、当たった行を「どのマップのどのイベントの何ページ」に解き直して返します。セリフの推敲や語彙の統一に使えます。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['query'],
    properties: {
      query: { type: 'string', description: '探す文字列' },
      limit: { type: 'integer', minimum: 1, maximum: 500, description: '返す行数の上限(既定 50)' }
    }
  },
  run: function (ctx, args) {
    const query = String((args && args.query) || '')
    if (!query) return toolError('query が空です。')
    const limit = Math.min(Math.max(Number((args && args.limit) || 50), 1), 500)
    const hits = []
    textFiles(ctx.textDir).forEach(function (abs) {
      if (hits.length >= limit) return
      let text = ''
      try { text = fs.readFileSync(abs, 'utf8') } catch (e) { return }
      const parsed = ctx.t2f.parseFrontMatter(text)
      const meta = parsed.meta
      const where = meta.kind === 'common'
        ? 'common ' + meta.commonEventId
        : 'map ' + meta.mapId + ' / event ' + meta.eventId + ' / page ' + (meta.pageId || '1')
      text.split('\n').forEach(function (line, i) {
        if (hits.length >= limit) return
        if (line.indexOf(query) === -1) return
        hits.push({ textPath: relOf(ctx, abs), line: i + 1, target: meta.kind ? where : null, text: line })
      })
    })
    const lines = hits.map(function (h) {
      return h.textPath + ':' + h.line + (h.target ? '  [' + h.target + ']' : '  [見出し情報なし]') + '  ' + h.text.trim()
    })
    return toolResult(hits.length ? lines.join('\n') : '見つかりませんでした: ' + query, { query, hits })
  }
})

TOOLS.push({
  name: 't2f_syntax',
  title: 'タグ記法を引く',
  description: 'Text2Frame のタグ記法を、プラグイン本体のヘルプから引きます。引数なしで見出しの一覧、tag を渡すとそのタグの説明。テキストを書く前に必ず引いてください。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      tag: { type: 'string', description: 'タグ名(例 Switch / スイッチ / ShowChoices)。山括弧は不要' }
    }
  },
  run: function (ctx, args) {
    const help = ctx.help()
    const tag = args && args.tag ? String(args.tag).replace(/^<|[:>].*$/g, '').trim().toLowerCase() : ''
    if (!tag) {
      const titles = help.sections.map(function (s, i) { return i + ': ' + s.title })
      return toolResult(titles.join('\n'), { sections: help.sections.map(function (s) { return s.title }) })
    }
    const at = help.tags[tag]
    if (at === undefined) {
      const near = Object.keys(help.tags).filter(function (n) { return n.indexOf(tag) === 0 }).slice(0, 10)
      return toolError('そのタグは見つかりません: ' + tag + (near.length ? '（近い名前: ' + near.join(', ') + '）' : '（引数なしで呼ぶと見出しの一覧が出ます）'))
    }
    const section = help.sections[at]
    return toolResult('○ ' + section.title + '\n\n' + section.body, { tag, title: section.title })
  }
})

const NAME_SOURCES = {
  switch: { file: 'System.json', field: 'switches' },
  variable: { file: 'System.json', field: 'variables' },
  actor: { file: 'Actors.json' },
  class: { file: 'Classes.json' },
  skill: { file: 'Skills.json' },
  item: { file: 'Items.json' },
  weapon: { file: 'Weapons.json' },
  armor: { file: 'Armors.json' },
  enemy: { file: 'Enemies.json' },
  troop: { file: 'Troops.json' },
  state: { file: 'States.json' },
  animation: { file: 'Animations.json' },
  commonEvent: { file: 'CommonEvents.json' }
}

TOOLS.push({
  name: 't2f_names',
  title: 'データベースの名前と番号',
  description: 'スイッチ・変数・アクターなどの名前と番号の対応を返します。<スイッチ: 12, ON> のような番号を当て推量せず、ここで引いてください。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      kind: { type: 'string', enum: Object.keys(NAME_SOURCES), description: '種類。省くと全部' },
      query: { type: 'string', description: '名前の一部で絞る' }
    }
  },
  run: function (ctx, args) {
    const kinds = args && args.kind ? [String(args.kind)] : Object.keys(NAME_SOURCES)
    const query = args && args.query ? String(args.query) : ''
    const out = {}
    kinds.forEach(function (kind) {
      const src = NAME_SOURCES[kind]
      if (!src) return
      let data = null
      try { data = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, src.file), 'utf8')) } catch (e) { return }
      const names = src.field ? data[src.field] : data
      if (!Array.isArray(names)) return
      const rows = []
      names.forEach(function (entry, id) {
        if (entry === null || entry === undefined) return
        const name = typeof entry === 'string' ? entry : String(entry.name || '')
        if (!name) return
        if (query && name.indexOf(query) === -1) return
        rows.push({ id, name })
      })
      if (rows.length) out[kind] = rows
    })
    const lines = []
    Object.keys(out).forEach(function (kind) {
      lines.push('[' + kind + ']')
      out[kind].forEach(function (r) { lines.push('  ' + r.id + ': ' + r.name) })
    })
    if (lines.length) return toolResult(lines.join('\n'), out)
    return toolResult(query
      ? '「' + query + '」に当たる名前はありません。'
      : 'まだ名前が付いていません(ツクールのデータベースで名前を付けると引けます)。', out)
  }
})

TOOLS.push({
  name: 't2f_check',
  title: 'テキストの文法を見る',
  description: 'Text2Frame のテキストを読んで、コンパイラが拒む書き方を返します。ファイルもゲームも触りません。' +
    '注意: 知らないタグ名はセリフとして扱われるため誤りになりません(<Nope: 1> はそのまま文章になります)。' +
    'ここで捕まるのは主に値が選択肢から外れているもの(例 <位置: よこ>)です。タグ名の確認は t2f_syntax で行ってください。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: {
      text: { type: 'string', description: '確かめたいテキスト(見出し情報は付いていてもいなくてもよい)' }
    }
  },
  run: function (ctx, args) {
    const text = String((args && args.text) || '')
    const body = ctx.t2f.parseFrontMatter(text).body
    try {
      const commands = ctx.t2f.compile(body)
      return toolResult('文法の誤りはありません。イベントコマンド ' + commands.length + ' 個になります。', { ok: true, commandCount: commands.length })
    } catch (e) {
      return toolError('文法の誤りがあります: ' + ((e && e.message) || String(e)))
    }
  }
})

/* ---------- 書き込み(下書き -> 札 -> 適用の二段) ---------- */

/* 下書きの札。内容のハッシュなので、同じ下書きなら同じ札になる(筆記録も決定的になる)。
 * MCP は無状態でセッションを持てないため、仕様の「Stateful Tools」の作法どおり、
 * 明け渡す handle としてこれを使う。寿命つきで、数にも上限を置く。 */
const PLANS = new Map()
const PLAN_TTL_MS = 30 * 60 * 1000
const PLAN_MAX = 64

const sha1 = function (value) { return crypto.createHash('sha1').update(value).digest('hex') }
const fingerprintOf = function (file) {
  try { return sha1(fs.readFileSync(file)) } catch (e) { return null }
}

const forgetOldPlans = function (now) {
  PLANS.forEach(function (plan, token) {
    if (now - plan.at > PLAN_TTL_MS) PLANS.delete(token)
  })
  // 入った順に消す(Map は挿入順を保つ)。
  while (PLANS.size > PLAN_MAX) PLANS.delete(PLANS.keys().next().value)
}

const dataPathOf = function (ctx, target) {
  // Map\d+\.json の形でないと Laurus.Text2Frame.MapID が前回の値に落ちて祖先の鍵が狂う。
  return String(target.kind) === 'common'
    ? path.join(ctx.dataDir, 'CommonEvents.json')
    : path.join(ctx.dataDir, mapFileName(target.mapId))
}

/** 祖先(.t2f-base)の置き場所。宛先から決まるので、テキストの名前を変えても同じ。 */
const basePathOf = function (ctx, textPath, target) {
  const id = ctx.t2f.baseIdForTarget(textPath, ctx.root, target)
  return path.join(ctx.root, '.t2f-base', id.key + '.txt')
}

const pageListOf = function (json, target) {
  if (String(target.kind) === 'common') {
    const entry = Array.isArray(json) ? json[Number(target.commonEventId)] : undefined
    return entry && Array.isArray(entry.list) ? entry.list : undefined
  }
  const events = json && json.events
  const event = Array.isArray(events) ? events[Number(target.eventId)] : undefined
  const page = event && Array.isArray(event.pages) ? event.pages[Number(target.pageId || 1) - 1] : undefined
  return page && Array.isArray(page.list) ? page.list : undefined
}

const applyOptsFor = function (ctx, target, textPath, dataPath, strategy) {
  const opts = {
    textPath,
    strategy,
    kind: target.kind,
    baseRoot: ctx.root
  }
  if (String(target.kind) === 'common') {
    opts.commonEventId = String(target.commonEventId)
    opts.commonEventPath = dataPath
  } else {
    opts.mapId = String(target.mapId)
    opts.eventId = String(target.eventId)
    opts.pageId = String(target.pageId || 1)
    opts.mapPath = dataPath
  }
  return opts
}

TOOLS.push({
  name: 't2f_write_plan',
  title: '下書き(何が変わるか)',
  /* 書き込みの一連のうち。readOnlyHint は正直に true(本当に何も書かない)だが、
   * --read-only では隠す。適用できない下書きを勧めても使えないため。 */
  partOfWriting: true,
  description: '渡したテキストをゲームに反映したら何が変わるかを、一時的な写しの上で試して返します。' +
    '本物のファイルは1バイトも書きません。返ってくる札(token)を t2f_write_apply に渡すと実際に反映します。' +
    '警告と衝突の数もそのまま返すので、とくに「初回反映」の警告(祖先が無く、その回だけゲーム側の編集が残らない)は必ず読んでください。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: Object.assign({}, TARGET_ARGS, {
      text: { type: 'string', description: '反映したいテキスト(見出し情報は付いていなくてもよい。宛先は引数で決まります)' },
      strategy: {
        type: 'string',
        enum: ['merge', 'overwrite'],
        description: 'merge=統合(既定。3方向マージ。衝突は目印で両方残る) / overwrite=上書き(テキストで全部置き換える。詰まった統合からの出口)'
      }
    })
  },
  run: function (ctx, args) {
    const found = findTarget(ctx, args)
    const target = found.target
    const strategy = String((args && args.strategy) || ctx.strategy).toLowerCase()
    if (strategy !== 'merge' && strategy !== 'overwrite') return toolError('反映方法は merge か overwrite です: ' + strategy)
    const text = String((args && args.text) || '')
    if (!text) return toolError('text が空です。')

    const dataPath = dataPathOf(ctx, target)
    const existing = found.index.paths[target.key]
    const textPath = existing || ctx.f2t.outPathFor(ctx.textDir, found.index, target)
    if (!insideRoot(ctx.root, textPath) || !insideRoot(ctx.root, dataPath)) {
      return toolError('書き先が --root の外です。')
    }

    /* 試すのは写しの上。テキストも写す(統合が衝突すると、コンパイラはテキストに目印を書く)。
     * 祖先は読むだけ: 本物を basePath で渡し、新しい祖先は一時フォルダへ逃がす。
     * ここを省くと、祖先があるのに「初回反映」の扱いになって下書きが実物と食い違う。 */
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-plan-'))
    try {
      const dataCopy = path.join(dir, path.basename(dataPath))
      fs.copyFileSync(dataPath, dataCopy)
      const textCopy = path.join(dir, 'proposed.txt')
      fs.writeFileSync(textCopy, text, 'utf8')

      const opts = applyOptsFor(ctx, target, textCopy, dataCopy, strategy)
      opts.baseRoot = path.join(dir, 'base')
      const realBase = basePathOf(ctx, textPath, target)
      if (fs.existsSync(realBase)) opts.basePath = realBase

      const result = ctx.t2f.applyTextFile(opts)
      const before = pageListOf(JSON.parse(fs.readFileSync(dataPath, 'utf8')), target)
      const after = result.ok ? pageListOf(JSON.parse(fs.readFileSync(dataCopy, 'utf8')), target) : undefined
      if (!result.ok) return toolError('反映できません: ' + (result.error || '原因不明') + (result.errorLine ? '（' + result.errorLine + ' 行目: ' + (result.errorLineText || '') + '）' : ''))

      const render = function (list) {
        return list ? ctx.f2t.decompile(list, true, { pretty: true }) : '(ページがありません)'
      }
      const token = sha1([target.key, strategy, text, fingerprintOf(dataPath), fingerprintOf(textPath)].join('\u0000'))
      forgetOldPlans(Date.now())
      PLANS.set(token, {
        at: Date.now(),
        key: target.key,
        target,
        strategy,
        text,
        textPath,
        dataPath,
        dataFingerprint: fingerprintOf(dataPath),
        textFingerprint: fingerprintOf(textPath)
      })

      const structured = {
        token,
        key: target.key,
        strategy,
        textPath: relOf(ctx, textPath),
        textExists: !!existing,
        warnings: result.warnings || [],
        conflicts: result.conflicts || 0,
        writesBackToText: !!result.writtenBack,
        before: render(before),
        after: render(after)
      }
      const lines = [
        '反映先: ' + target.key + ' (' + relOf(ctx, dataPath) + ')',
        'テキスト: ' + relOf(ctx, textPath) + (existing ? '' : ' （新しく作られます）'),
        '反映方法: ' + strategy,
        ''
      ]
      if (structured.warnings.length) lines.push('警告:', structured.warnings.map(function (w) { return '  ・' + w }).join('\n'), '')
      if (structured.conflicts) lines.push('衝突 ' + structured.conflicts + ' 件。目印つきで両方が残ります。', '')
      if (structured.writesBackToText) lines.push('統合の結果はテキストにも書き戻されます。', '')
      lines.push('--- ゲームの今 ---', structured.before, '', '--- 反映後 ---', structured.after, '')
      lines.push('この内容でよければ t2f_write_apply に token を渡してください: ' + token)
      return toolResult(lines.join('\n'), structured)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
})

TOOLS.push({
  name: 't2f_write_apply',
  title: '下書きを適用する',
  partOfWriting: true,
  description: 't2f_write_plan が返した札(token)を受け取り、本当にゲームとテキストへ書きます。' +
    '下書きを作ったあとに人やツクールがファイルを触っていたら拒否します(もう一度 t2f_write_plan から)。' +
    '書き換える直前の中身は .t2f-history に控えるので、VS Code 拡張の「編集履歴を表示する」から戻せます。',
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['token'],
    properties: {
      token: { type: 'string', description: 't2f_write_plan が返した札' }
    }
  },
  run: function (ctx, args) {
    const token = String((args && args.token) || '')
    forgetOldPlans(Date.now())
    const plan = PLANS.get(token)
    if (!plan) {
      return toolError('その札は使えません(知らない札か、期限切れ(' + (PLAN_TTL_MS / 60000) + '分)です)。t2f_write_plan からやり直してください。')
    }
    // 下書きのあとに誰かが触っていたら断る(拡張がレビュー後に指紋を見直すのと同じ)。
    if (fingerprintOf(plan.dataPath) !== plan.dataFingerprint) {
      PLANS.delete(token)
      return toolError('下書きのあとにゲームのデータが変わりました: ' + relOf(ctx, plan.dataPath) + '。t2f_write_plan からやり直してください。')
    }
    if (fingerprintOf(plan.textPath) !== plan.textFingerprint) {
      PLANS.delete(token)
      return toolError('下書きのあとにテキストが変わりました: ' + relOf(ctx, plan.textPath) + '。t2f_write_plan からやり直してください。')
    }

    const history = require(path.join(__dirname, 't2f-history.js'))
    const recorder = history.beginEntry(ctx.root, 'mcp-apply', 'MCP の反映 ' + plan.key, { keep: ctx.historyKeep })
    // 書く前に控える。拡張の noteApply と同じ3つ(データ・テキスト・祖先)。
    const pageKey = history.pageKeyOf(plan.target)
    recorder.note(plan.dataPath, 'data', pageKey ? [pageKey] : undefined)
    recorder.note(plan.textPath, 'text')
    recorder.note(basePathOf(ctx, plan.textPath, plan.target), 'base')

    let result = null
    try {
      fs.mkdirSync(path.dirname(plan.textPath), { recursive: true })
      fs.writeFileSync(plan.textPath, plan.text, 'utf8')
      result = ctx.t2f.applyTextFile(applyOptsFor(ctx, plan.target, plan.textPath, plan.dataPath, plan.strategy))
    } finally {
      PLANS.delete(token)
    }
    const entry = recorder.finish()

    if (!result.ok) {
      return toolError('反映できませんでした: ' + (result.error || '原因不明') +
        (entry ? '（直前の中身は .t2f-history に控えました: ' + entry.id + '）' : ''))
    }
    const structured = {
      key: plan.key,
      strategy: plan.strategy,
      textPath: relOf(ctx, plan.textPath),
      dataPath: relOf(ctx, plan.dataPath),
      warnings: result.warnings || [],
      conflicts: result.conflicts || 0,
      writtenBack: !!result.writtenBack,
      historyId: entry ? entry.id : null
    }
    const lines = ['反映しました: ' + plan.key + ' -> ' + relOf(ctx, plan.dataPath)]
    if (structured.warnings.length) lines.push('警告:', structured.warnings.map(function (w) { return '  ・' + w }).join('\n'))
    if (structured.conflicts) lines.push('衝突 ' + structured.conflicts + ' 件を目印つきで残しました。テキストで解決して、もう一度反映してください。')
    if (structured.writtenBack) lines.push('統合の結果をテキストにも書き戻しました: ' + structured.textPath)
    lines.push(entry
      ? '直前の中身を .t2f-history に控えました(' + entry.id + ')。戻すときは VS Code 拡張の「編集履歴を表示する」から。'
      : '控えるほどの変化はありませんでした。')
    return toolResult(lines.join('\n'), structured)
  }
})

const TOOLS_BY_NAME = {}
TOOLS.forEach(function (t) { TOOLS_BY_NAME[t.name] = t })

/* --read-only で隠す道具。MCP の annotations は「この道具は書くか」をクライアントへ
 * 伝えるもので、こちらの印は「書き込みの一連に属すか」。別の関心なので分けておく。 */
const isWriteTool = function (tool) {
  return !!tool.partOfWriting || !(tool.annotations && tool.annotations.readOnlyHint)
}

const toolsFor = function (ctx) {
  return TOOLS.filter(function (t) { return !(ctx.readOnly && isWriteTool(t)) })
}

/** tools/list に出す形。run は内部のものなので出さない。 */
const describeTool = function (tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations
  }
}

/* ---------- handler ---------- */

/**
 * 要求1つを応答1つにする。通知(id が無いもの)には null を返す。
 * 純粋に保つ(ここで I/O を増やさない)。テストはこれを直に叩く。
 */
const handle = function (request, ctx) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return jsonrpcError(null, INVALID_REQUEST, 'リクエストは JSON のオブジェクトである必要があります')
  }
  if (request.jsonrpc !== '2.0') {
    return jsonrpcError(request.id, INVALID_REQUEST, 'jsonrpc は "2.0" である必要があります')
  }
  const method = String(request.method || '')
  // 通知は応答しない。取り消しもここで落ちる(こちらは取り消せる長い仕事を持たない)。
  if (request.id === undefined || request.id === null) return null

  const params = request.params && typeof request.params === 'object' ? request.params : {}
  const meta = params._meta && typeof params._meta === 'object' ? params._meta : {}

  // 旧方式のクライアントには、こちらが話せる版を名前で伝える(向こうに前進する術が無いため)。
  if (method === 'initialize') {
    return jsonrpcError(request.id, METHOD_NOT_FOUND,
      'このサーバは initialize の握手を実装していません。対応する版: ' + PROTOCOL_VERSIONS.join(', '))
  }

  const wanted = meta[META_VERSION]
  if (typeof wanted !== 'string' || !wanted) {
    return jsonrpcError(request.id, INVALID_PARAMS, 'params._meta["' + META_VERSION + '"] が必要です')
  }
  if (meta[META_CAPABILITIES] === undefined || meta[META_CAPABILITIES] === null) {
    return jsonrpcError(request.id, INVALID_PARAMS, 'params._meta["' + META_CAPABILITIES + '"] が必要です')
  }
  if (PROTOCOL_VERSIONS.indexOf(wanted) === -1) {
    return jsonrpcError(request.id, UNSUPPORTED_PROTOCOL_VERSION, 'Unsupported protocol version',
      { supported: PROTOCOL_VERSIONS, requested: wanted })
  }

  if (method === 'server/discover') {
    return jsonrpcResult(request.id, cacheable({
      supportedVersions: PROTOCOL_VERSIONS,
      capabilities: { tools: {} },
      instructions: INSTRUCTIONS
    }))
  }

  if (method === 'tools/list') {
    return jsonrpcResult(request.id, cacheable({ tools: toolsFor(ctx).map(describeTool) }))
  }

  if (method === 'tools/call') {
    const name = String(params.name || '')
    const tool = TOOLS_BY_NAME[name]
    if (!tool || (ctx.readOnly && isWriteTool(tool))) {
      return jsonrpcError(request.id, INVALID_PARAMS, '知らない道具です: ' + name)
    }
    const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {}
    try {
      return jsonrpcResult(request.id, tool.run(ctx, args))
    } catch (e) {
      // 道具の中で起きたことはモデルが読んで直せるよう本文で返す。
      return jsonrpcResult(request.id, toolError(((e && e.message) || String(e))))
    }
  }

  return jsonrpcError(request.id, METHOD_NOT_FOUND, '知らないメソッドです: ' + method)
}

/* ---------- 殻(ここだけが stdin/stdout を持つ) ---------- */

// 1行の上限。これを超えたら読み捨てる(gameServer.ts の本文の上限と同じ考え方)。
const MAX_LINE_BYTES = 4 * 1024 * 1024

const startServer = function (options) {
  const ctx = createContext(options)

  /* stdout を予約する。ここから先の console.log / console.debug は stderr へ行く。
   * 退避した本物だけがプロトコルを書く。戻り値と引数の形は保つ(壊すと、
   * 戻り値で詰まりを見ているコードが止まる)。 */
  const writeOut = process.stdout.write.bind(process.stdout)
  process.stdout.write = function (chunk, encoding, callback) {
    return process.stderr.write(chunk, encoding, callback)
  }
  const send = function (message) { writeOut(JSON.stringify(message) + '\n') }

  const onLine = function (line) {
    const trimmed = line.trim()
    if (!trimmed) return
    let request = null
    try {
      request = JSON.parse(trimmed)
    } catch (e) {
      send(jsonrpcError(null, PARSE_ERROR, 'JSON として読めませんでした'))
      return
    }
    let response = null
    try {
      response = handle(request, ctx)
    } catch (e) {
      // handle は投げない作りだが、投げたときに通路を黙らせない。
      response = jsonrpcError(request && request.id, INTERNAL_ERROR, (e && e.message) || String(e))
    }
    if (response) send(response)
  }

  let buffer = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', function (chunk) {
    buffer += chunk
    for (;;) {
      const at = buffer.indexOf('\n')
      if (at === -1) break
      const line = buffer.slice(0, at)
      buffer = buffer.slice(at + 1)
      onLine(line)
    }
    if (buffer.length > MAX_LINE_BYTES) {
      buffer = ''
      send(jsonrpcError(null, PARSE_ERROR, '1行が長すぎます(上限 ' + MAX_LINE_BYTES + ' バイト)'))
    }
  })
  /* 標準入力が閉じたら終わる(仕様が求める、唯一移植性のある終わり方)。
   * ただし process.exit を呼ばない。標準出力がパイプのとき書き込みは非同期で、
   * 急いで exit すると後ろの応答が切り落ちる。手を離せばループが枯れて自然に終わる
   * (この殻は見張りもタイマも持たない。400要求・1.3MB で切り落ちゼロを確認済み)。 */
  process.stdin.on('end', function () { ctx.log('[mcp] stdin が閉じました') })

  ctx.log('[mcp] ' + SERVER_NAME + ' ' + version() + ' / root=' + ctx.root +
    ' / strategy=' + ctx.strategy + ' / scope=' + ctx.scope + (ctx.readOnly ? ' / read-only' : ''))
  return ctx
}

/* ---------- CLI ---------- */

const MANUAL = [
  '',
  '===== Manual =====',
  '    NAME',
  '       t2f-mcp - Text2Frame を MCP の道具として差し出すサーバ。',
  '    SYNOPSIS',
  '        npx t2f-mcp --root <ゲームのフォルダ>',
  '    DESCRIPTION',
  '        標準入出力で MCP(Model Context Protocol)を話します。クライアント(Claude Code,',
  '        VS Code など)がこのコマンドを起こし、パイプで繋いで使います。手で叩くものでは',
  '        ありません。端末から起こしたときはこの使い方を出して終わります。',
  '',
  '        登録はゲームのフォルダ直下の .mcp.json に書きます:',
  '',
  '          {',
  '            "mcpServers": {',
  '              "text2frame": {',
  '                "type": "stdio",',
  '                "command": "npx",',
  '                "args": ["-y", "@yktsr/text2frame-mv", "t2f-mcp", "--root", "."]',
  '              }',
  '            }',
  '          }',
  '',
  '        Claude Code なら次の1行でも書けます:',
  '',
  '          claude mcp add --scope project text2frame -- npx -y @yktsr/text2frame-mv t2f-mcp --root .',
  '',
  '    NOTE',
  '        ログは標準エラー出力へ出します(標準出力は MCP の通路なので使いません)。',
  '        RPGツクールのエディタを開いたまま、または t2f-sync の監視中は使わないでください。'
].join('\n')

/*
 * 引数は自前で読む。commander を使わない。
 *
 * このファイルは VS Code 拡張の lib/ へ同梱され、.vsix から1プロセスとして起こされる。
 * 依存ゼロの拡張なので .vsix に node_modules は入らず、require('commander') があると
 * そこで落ちる。Text2Frame.js / Frame2Text.js も commander を読むが、あちらは拡張から
 * require() されるだけで CLI ブロックが走らないので無事。**サーバだけがここに当たる。**
 *
 * 短縮形の意味は text2frame / frame2text / t2f-sync と同じにそろえる(test_cli_usage.js が見張る)。
 */
const FLAGS = [
  { name: '-V, --version', help: 'output the version number' },
  { name: '--root <dir>', key: 'root', help: 'project root for data/, text/ and .t2f-base (default: T2F_GAME_DIR or current directory)' },
  { name: '-t, --text-dir <dir>', key: 'textDir', fallback: 'text', help: 'text base directory' },
  { name: '-d, --data-dir <dir>', key: 'dataDir', fallback: 'data', help: 'game data directory' },
  { name: '-s, --strategy <merge|overwrite>', key: 'strategy', fallback: 'merge', help: 'write strategy' },
  { name: '--scope <all|nonempty|conversation|custom>', key: 'scope', fallback: 'nonempty', help: 'which events t2f_list shows' },
  { name: '--read-only', key: 'readOnly', help: 'offer only the reading tools' },
  { name: '-v, --verbose', key: 'verbose', help: 'debug mode' },
  { name: '-h, --help', help: 'display help for command' }
]

/** 使い方。option の表から組むので、足したものが必ず出る。 */
const usage = function () {
  const width = FLAGS.reduce(function (w, f) { return Math.max(w, f.name.length) }, 0)
  const lines = [
    'Usage: t2f-mcp [options]',
    '',
    'Text2Frame を MCP の道具として差し出すサーバ(標準入出力)',
    '',
    'Options:'
  ]
  FLAGS.forEach(function (f) {
    const pad = new Array(width - f.name.length + 1).join(' ')
    const tail = f.fallback === undefined ? '' : ' (default: "' + f.fallback + '")'
    lines.push('  ' + f.name + pad + '  ' + f.help + tail)
  })
  return lines.join('\n') + '\n' + MANUAL + '\n'
}

/* 引数を読む。`--opt value` と `--opt=value` の両方、短縮形、真偽の旗。
 * 知らない option は commander と同じく標準エラーへ出して 1 で終わる(黙って無視しない)。 */
const parseArgs = function (argv) {
  const byName = {}
  FLAGS.forEach(function (f) {
    const takesValue = f.name.indexOf('<') >= 0
    f.name.split(', ').forEach(function (n) {
      byName[n.replace(/ <.*$/, '')] = { key: f.key, takesValue }
    })
  })
  const options = {}
  FLAGS.forEach(function (f) { if (f.key && f.fallback !== undefined) options[f.key] = f.fallback })

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    const cut = token.indexOf('=')
    const name = cut > 1 && token.indexOf('--') === 0 ? token.slice(0, cut) : token
    const flag = byName[name]
    if (!flag) {
      process.stderr.write("error: unknown option '" + token + "'\n")
      process.exit(1)
    }
    if (name === '-h' || name === '--help') {
      process.stdout.write(usage())
      process.exit(0)
    }
    if (name === '-V' || name === '--version') {
      process.stdout.write(version() + '\n')
      process.exit(0)
    }
    if (!flag.takesValue) {
      options[flag.key] = true
      continue
    }
    const value = name === token ? argv[++i] : token.slice(cut + 1)
    if (value === undefined) {
      process.stderr.write("error: option '" + name + "' argument missing\n")
      process.exit(1)
    }
    options[flag.key] = value
  }
  return options
}

if (typeof require !== 'undefined' && typeof require.main !== 'undefined' && require.main === module) {
  const options = parseArgs(process.argv.slice(2))

  /* 人が端末から起こしたときは使い方を出して終わる。クライアントはパイプで繋ぐので、
   * そのときだけサーバを始める(既存3本の「引数なしで何もしない」と同じ考え方)。 */
  if (process.stdin.isTTY) {
    process.stdout.write(usage())
    process.exit(0)
  }

  try {
    startServer({
      root: options.root,
      dataDir: options.dataDir,
      textDir: options.textDir,
      strategy: options.strategy,
      scope: options.scope,
      readOnly: !!options.readOnly,
      log: options.verbose ? function (message) { process.stderr.write(message + '\n') } : undefined
    })
  } catch (e) {
    process.stderr.write('t2f-mcp: ' + ((e && e.message) || String(e)) + '\n')
    process.exit(1)
  }
}

module.exports = {
  PROTOCOL_VERSIONS,
  CACHE_TTL_MS,
  CACHE_SCOPE,
  startServer,
  INSTRUCTIONS,
  TOOLS,
  createContext,
  handle,
  describeTool,
  insideRoot,
  textFiles,
  version
}
