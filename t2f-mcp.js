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
 *   2. **書き込みの道具は同期で書く。** applyTextFile は共有の可変状態を退避・復元して
 *      使うが、それ自体が完全に同期なので、await を挟まない限り交錯しない。
 *      待ってよいのは再生の道具だけ(サーバの起動、visit の答え、停止の通知)。
 *      殻は要求を1本の鎖に並べ、N の答えを送るまで N+1 を始めないので、待つ道具が
 *      居ても要求どうしは交錯しない。
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
  '・t2f_check は文法だけでなく、**参照している素材が無いこと**も言います(顔と敵グループ)。',
  '  素材が無いとゲームは起動してから読み込みで落ちるので、書く前に通してください。',
  '・スイッチや変数の番号は t2f_names で名前から引けます。',
  '・「このスイッチはどこで操作され、どのページの出現条件か」は t2f_usages で引けます。',
  '  テキストではなくゲームのデータから引くので、まだ取り出していないイベントも入ります。',
  '  ただし条件分岐での**読み**は入りません(本文は t2f_search で)。',
  '・書き込みは2段です。t2f_write_plan で何が変わるかを見てから、返ってきた札を t2f_write_apply に渡します。',
  '・**テキストからイベントのページは増やせません**(出現条件がテキストに書けないため)。',
  '  新しいページが要るときは、先に RPGツクールで作ってください。',
  '・スイッチと変数の名前は t2f_name_plan / t2f_name_apply で付けられます。番号だけ残さないでください。',
  '・RPGツクールのエディタを開いたまま、または t2f-sync の監視を動かしたまま書き込まないでください。',
  '  どちらも data/*.json を書き戻すので、反映した内容が失われます。',
  '',
  '書いたものを動かして確かめる(t2f_play_*):',
  '・t2f_play_start でサーバが上がります。**返ってきた URL をブラウザで開くまで何も動きません。**',
  '  開いたかどうかは t2f_play_status の「繋がっているか」で分かります。',
  '・t2f_play_goto で任意のイベントをその場で走らせられます(拡張の「このページをすぐ実行」と同じ)。',
  '  出現条件は見ません。走っているイベントと開いているメッセージは捨てられます。',
  '  反映した直後は reload: true を付けてください。付けないと古いデータのまま走ります。',
  '・t2f_play_input でキーとタップを送ります。メッセージを進めるのも、タイトルで決定を押すのもこれ。',
  '・t2f_play_status は**画面に出ている文面と選択肢**、いま走っている場所(テキストの行)まで返します。',
  '  押したあとそれを見れば、思ったとおりの台詞が出たかを確かめられます。',
  '・t2f_play_state で値を見て、t2f_play_set で変えられます(状態を作ってから1か所だけ試せます)。',
  '・t2f_play_break はテキストの**行番号**で止めます。t2f_play_step で進めると、',
  '  止まった場所をテキストの行に戻して返します。',
  '・VS Code のテストプレイと同時には使えません(状態の受け手は1つなので、別のゲームになります)。'
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

/* ---------- 拡張が持っている「純粋な層」 ---------- */

/*
 * vscode-extension/src/db/* は vscode に依存しない層で、ゲームの構造を問い合わせる仕組み
 * (逆引き・名前・出現条件)を既に持っている。設計書(.github/agents/project-context.agent.md:133)
 * がそう宣言していて、あちらのテストも out/db/*.js を素の node で回している。
 * **書き写さずにそこを使う。**
 *
 * 置き場所が3つあるのは、TypeScript の生成物なのでどこに在るかが配り方で変わるから。
 *   1. ../out/db/                  .vsix の中。このファイルは lib/ へ写される
 *   2. ./vscode-extension/out/db/  手元のリポジトリ(拡張をコンパイルした後)
 *   3. ./db/                       npm で配るぶん。prepack が写す生成物
 *
 * **この順番は意図したもの。** ./db/ を最後にするのは、あれが配布用の写しに過ぎず、
 * リポジトリでは out/db/ が権威だから。先にすると、一度 npm pack を走らせた後ずっと
 * 古い写しが勝ち、拡張を直して再コンパイルしても効かない(gitignore なので誰も消さない)。
 * npm の tarball には db/ しか入らないので、順番を下げても届く。
 *
 * try して次へ落とす作法は Frame2Text.js:714、多候補の解決器は拡張の compiler.ts:92。
 * どれも無いときは構造を問い合わせる道具を**出さない**。動かない道具を並べるより、
 * 無いことが分かる方がエージェントには親切。
 */
const DB_DIRS = [
  path.join(__dirname, '..', 'out', 'db'),
  path.join(__dirname, 'vscode-extension', 'out', 'db'),
  path.join(__dirname, 'db')
]

/* 再生の層(gameServer / liveMonitor / liveState)は拡張の src/ 直下にある。
 * **順番は DB_DIRS と必ず同じ。** 逆にすると、手元で copy-db を走らせた後に再生の層だけ
 * db/ から、構造の層は vscode-extension/out/db/ から読まれ、database と lang が2つの
 * 別インスタンスになる。 */
const LIVE_DIRS = [
  path.join(__dirname, '..', 'out'),
  path.join(__dirname, 'vscode-extension', 'out'),
  // 写すときに db/ へ平らに入れている(相対パスを ./db/ -> ./ に書き換えてある)。
  path.join(__dirname, 'db')
]

const loadFrom = function (dirs, name) {
  for (let i = 0; i < dirs.length; i++) {
    const file = path.join(dirs[i], name + '.js')
    if (!fs.existsSync(file)) continue
    try {
      return require(file)
    } catch (e) { /* 次の置き場所へ */ }
  }
  return undefined
}

const loadDb = function (name) { return loadFrom(DB_DIRS, name) }
const loadLive = function (name) { return loadFrom(LIVE_DIRS, name) }

/*
 * つながりの索引を組む。拡張の LinkService(src/eventLinks.ts:69)がやっているのと
 * 同じ手順だが、あちらは vscode の EventEmitter と編集中のバッファを抱えているので、
 * 読む所だけをここに写した。**つながりを見分ける規則は1行も書いていない** -
 * commandLinks / conditionLinks / commonTriggerLinks がそれを持っている。
 *
 * 鍵の形は nodeKey が決める(e:マップ:イベント:ページ / c:番号 / s:番号 / v:番号 /
 * ss:マップ:イベント:文字 / m:番号)。イベントの名前は結果に添えるために覚えておく。
 */
const buildLinks = function (ctx, st) {
  const el = st.eventLinks
  const links = []
  const pages = []
  const names = {}

  /* 参照している箇所。**つながり(操作・呼び出し・出現条件)とは別の面**で、
   * commandRefs が「このコマンドがどのデータベースの項目を指すか」を答える。
   * 条件分岐(111)での読みや、本文の \V[5] はこちらにしか出ない。
   *
   * 走査はつながりと同じ1回で済ます(別に回すと202ファイルを読み直す)。種類は4つに絞る -
   * commandRefs は face/icon なども返すので、入れると索引が無駄に膨らむ。 */
  const refModule = loadDb('commandRefs')
  const REF_KINDS = { switch: 's', variable: 'v', commonEvent: 'c', map: 'm' }
  const refs = {}
  const noteRefs = function (place, list) {
    if (!refModule) return
    ;(list || []).forEach(function (command, index) {
      refModule.commandRefs(command).forEach(function (ref) {
        const letter = REF_KINDS[ref.kind]
        if (!letter) return
        const id = Number(ref.id)
        if (!(id > 0)) return
        const key = letter + ':' + id
        if (!refs[key]) refs[key] = []
        refs[key].push({ place, index, code: Number(command && command.code) || 0 })
      })
    })
  }

  const mapFiles = []
  try {
    fs.readdirSync(ctx.dataDir).forEach(function (name) {
      if (/^Map\d+\.json$/.test(name)) mapFiles.push(name)
    })
  } catch (e) { /* data が読めなければつながりは無い */ }

  mapFiles.forEach(function (name) {
    const mapId = Number(name.replace(/\D/g, ''))
    let map
    try {
      map = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, name), 'utf8'))
    } catch (e) { return }
    if (!map || !Array.isArray(map.events)) return
    map.events.forEach(function (event) {
      if (!event || !Array.isArray(event.pages)) return
      names[mapId + ':' + event.id] = String(event.name || '')
      pages.push({ mapId, eventId: event.id, summaries: st.eventPages.summarizePages(event) })
      event.pages.forEach(function (page, i) {
        const from = el.nodeKey({ kind: 'page', mapId, eventId: event.id, pageId: i + 1 })
        links.push.apply(links, el.commandLinks(from, page.list || []))
        noteRefs(from, page.list)
      })
    })
  })

  const commons = []
  try {
    const list = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, 'CommonEvents.json'), 'utf8'))
    ;(list || []).forEach(function (common) {
      if (!common) return
      names['c:' + common.id] = String(common.name || '')
      commons.push({ id: common.id, trigger: Number(common.trigger) || 0, switchId: Number(common.switchId) || 0 })
      const place = el.nodeKey({ kind: 'common', id: common.id })
      links.push.apply(links, el.commandLinks(place, common.list || []))
      noteRefs(place, common.list)
    })
  } catch (e) { /* コモンイベントが無いプロジェクトもある */ }

  links.push.apply(links, el.conditionLinks(pages))
  links.push.apply(links, el.commonTriggerLinks(commons))
  ctx.log('[mcp] つながり ' + links.length + ' 本')

  /* 名前はデータベースから引く(GameDatabase が16種類ぶん持っている)。読めなければ番号だけ。 */
  let db
  try {
    db = st.database.GameDatabase.load(ctx.dataDir)
  } catch (e) { db = undefined }

  return {
    index: new el.LinkIndex(links),
    names,
    total: links.length,
    /** 鍵ごとの参照箇所。commandRefs が無い配り方では空のまま。 */
    refs,
    hasRefs: !!refModule,
    key: el.nodeKey,
    node: el.nodeFromKey,
    /** 問い合わせた番号を人が読める見出しにする。 */
    label: function (kind, args) {
      if (kind === 'selfSwitch') {
        const name = names[Number(args.mapId) + ':' + Number(args.eventId)]
        return 'マップ' + Number(args.mapId) + ' / イベント' + Number(args.eventId) +
          (name ? '「' + name + '」' : '') + ' / セルフスイッチ ' + String(args.letter)
      }
      const id = Number(args.id)
      const dbKind = kind === 'map' ? 'map' : kind
      let found
      if (db) {
        try { found = db.lookup(dbKind, id) } catch (e) { found = undefined }
      }
      const name = found && found.name ? '「' + found.name + '」' : ''
      const title = { switch: 'スイッチ', variable: '変数', commonEvent: 'コモンイベント', map: 'マップ' }
      return (title[kind] || kind) + id + name
    }
  }
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
  // 拡張の純粋な層。配り方によっては無いので、引かれたときに1回だけ試す。
  let structure
  // つながりの索引。全マップを読むので、引かれたときに1回だけ。
  let links = null
  // 素材の一覧。img を読むので、引かれたときに1回だけ。
  let assets
  /* 動いているゲームとの繋がり。サーバを持つのは**状態の受け手が1つしか無い**から
   * (onState は startGameServer のときに決まる)。命令を送るだけなら2人目の聞き手として
   * 割り込めるが、状態は読めない。 */
  let play = null
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
        const source = fs.readFileSync(parser.COMPILER, 'utf8')
        help = parser.buildTagHelp(source)
        /* 別名(同じ命令の日本語名・英語名・短縮形)。buildTagHelp は節を引くために
         * 畳んでしまうので、組のままもう一度取る。<Add> を引いた人に「加算」「+」でも
         * 書けると言えないと、ヘルプを読み直す往復が増える。 */
        help.aliases = {}
        parser.aliasGroups(source).forEach(function (names) {
          const all = Array.from(names)
          all.forEach(function (name) { help.aliases[name] = all })
        })
      }
      return help
    },
    /** 拡張の純粋な層。無ければ undefined で、呼び側は道具を出さない。 */
    structure: function () {
      if (structure !== undefined) return structure || undefined
      const database = loadDb('database')
      const eventLinks = loadDb('eventLinks')
      const eventPages = loadDb('eventPages')
      if (!database || !eventLinks || !eventPages) {
        structure = false
        return undefined
      }
      /* db/lang.js はモジュールで1つの旗を持ち、既定が日本語。呼ばないと英語環境でも
       * 日本語が出るので、こちらの他の文面と揃えて明示する。 */
      const lang = loadDb('lang')
      if (lang) lang.setJapanese(true)
      structure = { database, eventLinks, eventPages }
      return structure
    },
    /** 素材の一覧。無い配り方もあるので、引かれたときに1回だけ試す。 */
    assets: function () {
      if (assets !== undefined) return assets || undefined
      const faces = loadDb('faces')
      if (!faces) {
        assets = false
        return undefined
      }
      const imgDir = path.join(root, 'img')
      const cache = {}
      assets = {
        /* そのフォルダにある画像の名前(拡張子なし)。listImageNames は .png と
         * 暗号化済みの拡張子をまとめて見る。**名前の照合だけで、復号はしない。** */
        names: function (folder) {
          if (cache[folder] === undefined) cache[folder] = faces.listImageNames(imgDir, folder)
          return cache[folder]
        },
        has: function (folder, name) {
          return this.names(folder).indexOf(String(name)) >= 0
        }
      }
      return assets
    },
    /** 再生の層。無い配り方もあるので、引かれたときに1回だけ試す。 */
    live: function () {
      if (this._live !== undefined) return this._live || undefined
      const gameServer = loadLive('gameServer')
      const liveState = loadLive('liveState')
      if (!gameServer || !liveState) {
        this._live = false
        return undefined
      }
      this._live = { gameServer, liveState }
      return this._live
    },
    /** いま動かしているゲーム(持っていなければ undefined)。 */
    game: function () { return play || undefined },
    /** ゲームを持つ。既にあれば使い回す。 */
    openGame: function () {
      if (play) return Promise.resolve(play)
      const live = this.live()
      if (!live) return Promise.reject(new Error('再生の層が使えません(拡張をコンパイルしてください)'))
      /* ゲームのフォルダは data/ の親。index.html があるのはそこ。 */
      const gameRoot = path.dirname(dataDir)
      const state = new live.liveState.LiveState()
      return live.gameServer.startGameServer(gameRoot, undefined, {
        onState: function (message) { state.apply(message, Date.now()) }
      }).then(function (server) {
        play = { server, state, gameRoot }
        return play
      })
    },
    /** 片付ける。**冪等**にする(道具と afterEach の両方が呼ぶ)。 */
    closeGame: function () {
      if (!play) return Promise.resolve(false)
      const closing = play.server
      play = null
      return closing.close().then(function () { return true }, function () { return true })
    },
    /** つながりの索引と名前。全マップを読むので、引かれたときに1回だけ。 */
    links: function () {
      if (links !== null) return links
      const st = this.structure()
      if (!st) return undefined
      links = buildLinks(this, st)
      return links
    }
  }
}

/* ---------- 宛先の解決 ---------- */

/* onlyFile を渡すとそのファイルだけを読む(Frame2Text.js:3586)。マップを指すと
 * コモンイベントは落ちる。201 ファイルを読まずに済むので、絞り込みの土台になる。 */
const targetsOf = function (ctx, scope, onlyFile) {
  const index = ctx.f2t.indexTexts(ctx.textDir)
  const options = { scope: scope || ctx.scope, index }
  if (onlyFile) options.onlyFile = onlyFile
  const targets = ctx.f2t.enumerateTargets(ctx.dataDir, options)
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

/*
 * 宛先が無いときの説明。**「ページを増やしたい」のかどうかを見分ける**のが肝。
 *
 * テキストからページは増やせない。出現条件がテキストに書けないので、増やすと条件が
 * 全部 false の無条件ページが末尾に付き、コアは pages.length-1 から逆に走るため
 * (js/rpg_objects.js の findProperPageIndex)**既存のページが到達しなくなる**。
 * だから増やさないのが正しい。
 *
 * ただし「その宛先はありません」とだけ言うと、エージェントは名前を間違えたと思って
 * t2f_list を引き直し、見つからずに迷う。理由を言えば、ツクールで先に作ればよいと分かる。
 */
const missReason = function (targets, wanted) {
  if (!wanted || wanted.kind !== 'event' || !(Number(wanted.pageId) > 0)) return ''
  const pages = targets.filter(function (t) {
    return t.kind !== 'common' && String(t.mapId) === String(wanted.mapId) && String(t.eventId) === String(wanted.eventId)
  })
  if (!pages.length) return ''
  const most = pages.reduce(function (n, t) { return Math.max(n, Number(t.pageId) || 1) }, 0)
  if (Number(wanted.pageId) <= most) return ''
  return 'このイベントは ' + most + ' ページまでです。**テキストからページを増やすことはできません**' +
    '（出現条件がテキストに書けないため、条件の無いページが既存のページを隠してしまいます）。' +
    '先に RPGツクールでページを作ってから、もう一度どうぞ。'
}

const keyParts = function (key) {
  const m = /^map(\d+)_event(\d+)_page(\d+)$/.exec(String(key || ''))
  if (!m) return undefined
  return { kind: 'event', mapId: String(Number(m[1])), eventId: String(Number(m[2])), pageId: String(Number(m[3])) }
}

const findTarget = function (ctx, args) {
  const found = targetsOf(ctx, 'all')
  const key = args && args.key
  if (key) {
    const hit = found.targets.filter(function (t) { return t.key === key })[0]
    if (!hit) {
      const why = missReason(found.targets, keyParts(key))
      throw new Error('その宛先はありません: ' + key +
        (why ? '。' + why : '（t2f_list で一覧を見てください）'))
    }
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
  if (!hit) {
    const why = missReason(found.targets, wanted)
    throw new Error('その宛先はありません' +
      (why ? '。' + why : '（key か mapId/eventId/pageId、または commonEventId を指定してください）'))
  }
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
    /* このゲームに戦闘の素材があるか。無いゲームで <BattleProcessing> を書くと、
     * 文法も下書きも通ったうえでゲームが読み込みで落ちる(実際にそうなった)。
     * 先に知らせれば、最初から別の作りにできる。 */
    const art = ctx.assets()
    if (art) {
      info.battleArt = art.names('enemies').length + art.names('sv_enemies').length
      info.faceArt = art.names('faces').length
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
    if (art && info.battleArt === 0) {
      notes.push('このゲームには敵の画像が1枚もありません(img/enemies も img/sv_enemies も空)。' +
        '<BattleProcessing> を書くとゲームが読み込みで落ちます。戦闘を使わない作りにしてください。')
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
      },
      mapId: {
        type: ['integer', 'string'],
        description: 'このマップだけ。**実データでは1マップ最大52件なので、絞れば必ず全件返ります。** 省くと件数の要約になります'
      },
      summary: { type: 'boolean', description: 'マップごとの件数だけを返す' },
      limit: { type: 'integer', minimum: 1, maximum: 2000, description: '行数の上限(既定 100)。明示したときだけ行を切ります' },
      offset: {
        type: 'integer',
        minimum: 0,
        description: '何件目から返すか。並びはデータファイルの順(Map001.json → イベントの添字 → ページ)。' +
          'データが変わると番号がずれるので、mapId で絞る方が確実です'
      }
    }
  },
  run: function (ctx, args) {
    const scope = (args && args.scope) || ctx.scope
    /* mapId は文字列でも受ける。この道具自身が行の mapId を文字列で返すので、
     * 返ってきた値をそのまま渡せないと使いにくい。 */
    const mapId = args && args.mapId !== undefined && args.mapId !== null ? Number(args.mapId) : undefined
    if (mapId !== undefined && !(mapId > 0)) throw new Error('mapId はマップの番号です: ' + args.mapId)
    const limit = args && args.limit !== undefined ? Number(args.limit) : 100
    const offset = args && args.offset !== undefined ? Math.max(Number(args.offset), 0) : 0
    const cutAsked = !!(args && (args.limit !== undefined || args.offset !== undefined))
    const found = targetsOf(ctx, scope, mapId === undefined ? undefined : mapFileName(mapId))
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
    /* マップごとの件数。絞っていないのに多すぎるときは**これだけ**返す。
     * 行の部分集合を返すと、エージェントが「その宛先は無い」と誤解する余地が残る。
     * 警告文を添えるより、誤解する材料そのものを返さない方が強い。 */
    const countByMap = function () {
      const order = []
      const counts = {}
      rows.forEach(function (r) {
        const key = r.kind === 'common' ? 'common' : String(r.mapId)
        if (counts[key] === undefined) {
          counts[key] = { mapId: r.kind === 'common' ? null : r.mapId, mapName: r.kind === 'common' ? 'コモンイベント' : r.mapName, count: 0 }
          order.push(key)
        }
        counts[key].count++
      })
      return order.map(function (k) { return counts[k] })
    }

    const asSummary = function (reason) {
      const groups = countByMap()
      const lines = groups.map(function (g) {
        return (g.mapId === null ? 'common' : 'map' + ('00' + g.mapId).slice(-3)) +
          '  ' + String(g.count).padStart(4) + ' 件  ' + g.mapName
      })
      return toolResult([reason, '', lines.join('\n'), '',
        '合計 ' + rows.length + ' 件 / ' + groups.length + ' 組。mapId を渡すとそのマップの宛先を全件返します。'
      ].filter(function (l) { return l !== undefined }).join('\n'),
      { scope, mapId: mapId === undefined ? null : mapId, total: rows.length, summary: groups, targets: null })
    }

    if (!rows.length) {
      return toolResult('該当する宛先がありません(範囲: ' + scope + ')', { scope, total: 0, targets: [] })
    }
    if (args && args.summary) return asSummary('マップごとの件数です。')
    /* 絞っていない大量の一覧は、行を1つも返さず件数だけにする。 */
    if (mapId === undefined && !cutAsked && rows.length > limit) {
      return asSummary('宛先が ' + rows.length + ' 件あるため、行ではなくマップごとの件数を返します。')
    }

    const shown = cutAsked ? rows.slice(offset, offset + limit) : rows
    const lines = shown.map(function (r) {
      const where = r.textPath ? r.textPath : '(まだ無い -> ' + r.plannedTextPath + ')'
      const label = r.kind === 'common' ? 'common ' + r.commonEventId : r.mapName + ' / ' + r.name
      return r.key + '  ' + label + '  ' + where + (r.skippedBecauseDuplicated ? '  [重複のため見送り]' : '')
    })
    const truncated = shown.length < rows.length
    const tail = truncated
      ? ['', '全 ' + rows.length + ' 件のうち ' + (offset + 1) + '〜' + (offset + shown.length) + ' 件目です。']
      : []
    /* 本文と structuredContent は**同じ1つの配列**から作る。片方だけ切ると、
     * UI とモデルの見え方が食い違う。 */
    return toolResult(lines.concat(tail).join('\n'), {
      scope,
      mapId: mapId === undefined ? null : mapId,
      total: rows.length,
      offset,
      truncated,
      targets: shown
    })
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
      return toolResult(header + body, { key: found.target.key, translationOnly: true, text: header + body })
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
    /* 本文は content にも structuredContent にも載せる。片方だけだと、
     * structuredContent を見た読み手が「本文が返らない」と結論する(実際にそうなった)。
     * 仕様も「structured を返すなら content にも」と言っていて、ここは向きが逆だった。 */
    return toolResult(built.text, {
      key: found.target.key,
      textPath: existing ? relOf(ctx, existing) : null,
      conflicts: built.conflicts || 0,
      text: built.text
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

    /* 節を1つ返す。別名を添えるのは、同じ命令が日本語でも短縮形でも書けることを
     * ここでしか知らせられないから。 */
    const sectionResult = function (at, name) {
      const section = help.sections[at]
      /* 引いた名前を**除かない**。除くと、同じ節が引いた名前によって違う文面になり、
       * 「どの名前で引いても同じ答え」が崩れる(test_mcp.js がその契約を見ている)。 */
      const aliases = help.aliases[name] || []
      const head = '○ ' + section.title + (aliases.length > 1 ? '\n書ける名前: ' + aliases.join(', ') : '')
      return toolResult(head + '\n\n' + section.body, {
        tag: name,
        title: section.title,
        aliases: help.aliases[name] || [name],
        body: section.body
      })
    }

    // タグ名そのままが当たるのがいちばん強い。
    if (help.tags[tag] !== undefined) return sectionResult(help.tags[tag], tag)

    /* ここからが探しもの。**タグ名しか見ていなかったので「スイッチの操作」や「変数」で
     * 引けなかった** - 前者は見出しの題、後者は 153 見出しのうち 28 の本文にしか出ない。
     * 題と本文も部分一致で見て、当たりの強い順に並べる。 */
    /* 候補には**引き直せるタグ名**を添える。題だけ見せて「タグ名で引き直して」と言うと、
     * 題からタグ名を当て推量させることになる。 */
    const nameBySection = {}
    Object.keys(help.tags).forEach(function (name) {
      const at = help.tags[name]
      if (nameBySection[at] === undefined || name.length < nameBySection[at].length) nameBySection[at] = name
    })
    const hits = []
    const seen = {}
    const push = function (at, why) {
      if (at === undefined || seen[at]) return
      seen[at] = true
      hits.push({ at, title: help.sections[at].title, tag: nameBySection[at], why })
    }
    Object.keys(help.tags).forEach(function (name) {
      if (name.indexOf(tag) >= 0) push(help.tags[name], 'タグ名 <' + name + '>')
    })
    help.sections.forEach(function (section, i) {
      if (section.title.toLowerCase().indexOf(tag) >= 0) push(i, '見出しの題')
    })
    const strong = hits.length
    help.sections.forEach(function (section, i) {
      if (section.body.toLowerCase().indexOf(tag) >= 0) push(i, '本文')
    })

    if (!hits.length) {
      return toolError('「' + tag + '」に当たるタグも見出しもありません（引数なしで呼ぶと見出しの一覧が出ます）')
    }
    // 題かタグ名で1つに決まるなら、そのまま節を返す(「スイッチの操作」がこれ)。
    if (strong === 1) return sectionResult(hits[0].at, tag)

    const shown = hits.slice(0, 10)
    const lines = ['「' + tag + '」に当たる見出し ' + hits.length + ' 件' + (hits.length > shown.length ? '（先頭 10 件）' : '') + ':', '']
      .concat(shown.map(function (h) {
        return '  ' + h.title + (h.tag ? '   tag: ' + h.tag : '') + '   … ' + h.why
      }))
      .concat(['', '上の tag で引き直すと、その節の全文が出ます。'])
    return toolResult(lines.join('\n'), {
      query: tag,
      total: hits.length,
      candidates: shown.map(function (h) { return { title: h.title, tag: h.tag || null, why: h.why } })
    })
  }
})

/* 名前の出どころ。**拡張の db/database.ts の SOURCES と同じ16種類にそろえてある。**
 * あちらを使わないのは、層が無い配り方だと道具の形(inputSchema の enum)が変わって
 * しまうから。ずれは vscode-extension/test/test_mcp_names.js が突き合わせる。
 * field が無いものはレコードの配列(各要素の .name)。 */
const NAME_SOURCES = {
  switch: { file: 'System.json', field: 'switches' },
  variable: { file: 'System.json', field: 'variables' },
  actor: { file: 'Actors.json' },
  class: { file: 'Classes.json' },
  item: { file: 'Items.json' },
  weapon: { file: 'Weapons.json' },
  armor: { file: 'Armors.json' },
  equipType: { file: 'System.json', field: 'equipTypes' },
  skill: { file: 'Skills.json' },
  state: { file: 'States.json' },
  enemy: { file: 'Enemies.json' },
  troop: { file: 'Troops.json' },
  animation: { file: 'Animations.json' },
  commonEvent: { file: 'CommonEvents.json' },
  map: { file: 'MapInfos.json' },
  tileset: { file: 'Tilesets.json' }
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
      /* 同じ名前が複数あると、名前で引いた番号を取り違える。実データでは258件の
       * スイッチのうち12の名前が重複していた(「シャチ出てくる」が 13/121/229/237)。
       * 絞り込みで消えないよう、**数えるのは絞る前の全体**で行う。 */
      const sameName = {}
      names.forEach(function (entry) {
        if (entry === null || entry === undefined) return
        const n = typeof entry === 'string' ? entry : String(entry.name || '')
        if (n) sameName[n] = (sameName[n] || 0) + 1
      })
      rows.forEach(function (r) { if (sameName[r.name] > 1) r.sameName = sameName[r.name] })
      if (rows.length) out[kind] = rows
    })
    const lines = []
    Object.keys(out).forEach(function (kind) {
      lines.push('[' + kind + ']')
      out[kind].forEach(function (r) {
        lines.push('  ' + r.id + ': ' + r.name + (r.sameName ? '   ※ 同名 ×' + r.sameName : ''))
      })
    })
    if (lines.length) return toolResult(lines.join('\n'), out)
    return toolResult(query
      ? '「' + query + '」に当たる名前はありません。'
      : 'まだ名前が付いていません(ツクールのデータベースで名前を付けると引けます)。', out)
  }
})

/* つながりの向きを言葉にする。表に出るのはこれだけなので、短く。 */
const HOW_TEXT = {
  call: 'コモンイベントを呼ぶ',
  transfer: '場所移動',
  vehicle: '乗り物の位置設定',
  switchOn: 'ON にする',
  switchOff: 'OFF にする',
  variable: '値を変える',
  selfSwitchOn: 'ON にする',
  selfSwitchOff: 'OFF にする',
  condition: '出現条件',
  trigger: '自動実行・並列処理の起動'
}

/** 鍵を人が読める場所に直す。イベントには名前も添える。 */
const placeOf = function (links, key) {
  const node = links.node(key)
  if (!node) return key
  if (node.kind === 'page') {
    const name = links.names[node.mapId + ':' + node.eventId]
    return 'マップ' + node.mapId + ' / イベント' + node.eventId +
      (name ? '「' + name + '」' : '') + ' / ' + node.pageId + 'ページ'
  }
  if (node.kind === 'common') {
    const name = links.names['c:' + node.id]
    return 'コモンイベント' + node.id + (name ? '「' + name + '」' : '')
  }
  if (node.kind === 'selfSwitch') {
    return 'マップ' + node.mapId + ' / イベント' + node.eventId + ' / セルフスイッチ ' + node.letter
  }
  if (node.kind === 'map') return 'マップ' + node.id
  return key
}

TOOLS.push({
  name: 't2f_usages',
  title: '番号の使われ方を逆に引く',
  needsStructure: true,
  description: 'スイッチ・変数・セルフスイッチ・コモンイベント・マップが、どこで操作され、' +
    'どのページの出現条件になっているかを返します。テキストではなくゲームのデータから引くので、' +
    'まだ取り出していないイベントも入ります。' +
    '\n返すのは2つの面です。**つながり**(操作・呼び出し・出現条件)と、**参照箇所**' +
    '(そのコマンドがこの番号を指している所。条件分岐 <If: ...> での読みや本文の \\V[5] はこちら)。' +
    '参照箇所のうち操作でもあるものには印が付きます。' +
    '\n参照箇所に入らないもの: セルフスイッチ(規則が無いため)、コメント・スクリプト・' +
    'プラグインコマンドの中(走査していないため。$gameVariables.value(5) は見えません)。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['kind'],
    properties: {
      kind: {
        type: 'string',
        enum: ['switch', 'variable', 'selfSwitch', 'commonEvent', 'map'],
        description: '種類'
      },
      id: { type: 'integer', minimum: 1, description: '番号。selfSwitch 以外で必須' },
      mapId: { type: 'integer', minimum: 1, description: 'selfSwitch のときのマップ番号' },
      eventId: { type: 'integer', minimum: 1, description: 'selfSwitch のときのイベント番号' },
      letter: { type: 'string', description: 'selfSwitch のときの文字(A-D)' },
      limit: { type: 'integer', minimum: 1, maximum: 500, description: '各向きの最大件数(既定 50)' }
    }
  },
  run: function (ctx, args) {
    const links = ctx.links()
    if (!links) throw new Error('つながりの索引が使えません(拡張の純粋な層が見つかりません)')
    const kind = String((args && args.kind) || '')
    const limit = Math.min(Math.max(Number((args && args.limit) || 50), 1), 500)

    let key
    if (kind === 'selfSwitch') {
      const mapId = Number(args && args.mapId)
      const eventId = Number(args && args.eventId)
      const letter = String((args && args.letter) || '')
      if (!mapId || !eventId || !letter) {
        throw new Error('selfSwitch には mapId と eventId と letter が要ります')
      }
      key = links.key({ kind: 'selfSwitch', mapId, eventId, letter })
    } else {
      const id = Number(args && args.id)
      if (!id) throw new Error(kind + ' には id が要ります')
      key = links.key({ kind: kind === 'commonEvent' ? 'common' : kind, id })
    }

    const label = links.label(kind, args || {})
    const lines = ['■ ' + label]
    const render = function (title, rows, side) {
      lines.push('')
      lines.push(title + ' (' + rows.length + ' 件' + (rows.length > limit ? '、先頭 ' + limit + ' 件' : '') + ')')
      if (!rows.length) lines.push('  なし')
      rows.slice(0, limit).forEach(function (link) {
        const where = placeOf(links, side === 'in' ? link.from : link.to)
        lines.push('  ' + where + '  … ' + (HOW_TEXT[link.how] || link.how) + (link.note ? '(' + link.note + ')' : ''))
      })
    }
    const inbound = links.index.in(key)
    const outbound = links.index.out(key)
    render('ここを操作している / ここから出る条件になっている', inbound, 'in')
    render('ここが指している先', outbound, 'out')

    /* 参照箇所。**引き算しない。**
     * 最初は「全参照 − 操作 = 読み」を考えたが、実測して捨てた:
     *   変数7 += 変数7   refs = v7,v7       links = v:7      → 読みが消える(最頻出)
     *   変数1..5 = 変数3  refs = v1..v5,v3   links = v1..v5   → オペランドの読みが消える
     *   数値入力 {103}    refs = v7          links = なし     → 書き込みを読みと誤判定
     * データが read/write の軸を持っていないので、分類ではなく**印**にする。完全さで
     * 答える方が正直で、守りたいもの(「使われていないから消せる」の誤解)にも効く。 */
    const written = {}
    inbound.concat(outbound).forEach(function (link) {
      if (link.index === undefined) return
      written[(link.from || '') + '#' + link.index] = true
      written[(link.to || '') + '#' + link.index] = true
    })
    const spots = links.refs[key] || []
    lines.push('')
    if (kind === 'selfSwitch') {
      lines.push('参照箇所: セルフスイッチには出せません(借りている層に見分ける規則が無いため)。')
    } else if (!links.hasRefs) {
      lines.push('参照箇所: この配り方では出せません。')
    } else {
      lines.push('参照箇所 (' + spots.length + ' 件' + (spots.length > limit ? '、先頭 ' + limit + ' 件' : '') + ')')
      if (!spots.length) lines.push('  なし')
      spots.slice(0, limit).forEach(function (spot) {
        const alsoWrites = !!written[spot.place + '#' + spot.index]
        lines.push('  ' + placeOf(links, spot.place) + ' の ' + (spot.index + 1) + ' 番目' +
          (alsoWrites ? '  … 操作でもある' : ''))
      })
      lines.push('')
      lines.push('※ コメント・スクリプト・プラグインコマンドの中は走査していません。')
    }

    const shape = function (link, side) {
      const out = {
        place: side === 'in' ? link.from : link.to,
        label: placeOf(links, side === 'in' ? link.from : link.to),
        how: link.how
      }
      if (link.note) out.note = link.note
      if (link.index !== undefined) out.commandIndex = link.index
      if (link.byVariable) out.byVariable = true
      return out
    }
    return toolResult(lines.join('\n'), {
      key,
      label,
      inbound: inbound.slice(0, limit).map(function (l) { return shape(l, 'in') }),
      outbound: outbound.slice(0, limit).map(function (l) { return shape(l, 'out') }),
      inboundTotal: inbound.length,
      outboundTotal: outbound.length,
      /* 参照箇所は commandRefs の当たりを全部。操作でもあるものに印を付けるだけで、
       * 読みと書きに分類はしない(データがその軸を持っていない)。 */
      references: spots.slice(0, limit).map(function (spot) {
        return {
          place: spot.place,
          label: placeOf(links, spot.place),
          commandIndex: spot.index,
          commandCode: spot.code,
          alsoOperates: !!written[spot.place + '#' + spot.index]
        }
      }),
      referencesTotal: spots.length,
      referencesCovered: kind !== 'selfSwitch' && links.hasRefs,
      notScanned: ['コメント', 'スクリプト', 'プラグインコマンド']
    })
  }
})

/*
 * 参照している素材が本当にあるか。
 *
 * なぜ要るか: MCP でイベントを作って <BattleProcessing> を入れたら、ゲームが
 * 「Failed to load img/enemies/Orc.png」で落ちた。番号としては正しいので、文法の検査も
 * 下書きも全部通る。あのゲームは戦闘を使わないので敵の画像を全部削除していた。
 *
 * **参照の取り方は commandRefs に任せる**(新しい規則を書かない)。あれが名前を返すのは
 * 顔と敵グループだけなので、覆うのもその2つ。音声(241/250)・ピクチャ(231)・キャラ画像は
 * commandRefs が返さないので覆えない。音声のタグ表は checks.js が持っているが、あれは
 * db/ の外(../tagBrackets)を読むので写せない。
 *
 * 実在はファイル名の照合だけで見る(listImageNames が暗号化済みの拡張子もまとめて見る)。
 */
const missingAssets = function (ctx, commands) {
  const st = ctx.structure()
  const art = ctx.assets()
  if (!st || !art) return []
  const refs = loadDb('commandRefs')
  if (!refs) return []

  const troopFile = function (name) {
    try { return JSON.parse(fs.readFileSync(path.join(ctx.dataDir, name), 'utf8')) } catch (e) { return [] }
  }
  let troops = null
  let enemies = null
  const out = []
  const seen = {}
  const note = function (what, where) {
    const key = what + '\u0000' + where
    if (seen[key]) return
    seen[key] = true
    out.push({ asset: what, used: where })
  }

  ;(commands || []).forEach(function (command) {
    refs.commandRefs(command).forEach(function (ref) {
      if (ref.kind === 'face' && ref.faceName) {
        if (!art.has('faces', ref.faceName)) note('img/faces/' + ref.faceName, '顔')
        return
      }
      if (ref.kind !== 'troop') return
      if (troops === null) {
        troops = troopFile('Troops.json')
        enemies = troopFile('Enemies.json')
      }
      const troop = troops[Number(ref.id)]
      if (!troop) return
      ;(troop.members || []).forEach(function (member) {
        const enemy = enemies[Number(member.enemyId)]
        const art1 = enemy && enemy.battlerName
        if (!art1) return
        /* 横向き戦闘のときは sv_enemies を使う。どちらかにあれば足りる。 */
        if (!art.has('enemies', art1) && !art.has('sv_enemies', art1)) {
          note('img/enemies/' + art1, '敵グループ' + ref.id + '「' + (troop.name || '') + '」')
        }
      })
    })
  })
  return out
}

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
    let commands
    try {
      commands = ctx.t2f.compile(body)
    } catch (e) {
      return toolError('文法の誤りがあります: ' + ((e && e.message) || String(e)))
    }
    /* 文法が通っても、参照している素材が無ければゲームは起動してから落ちる。
     * 実際にそれで落ちた(img/enemies が1枚も無いゲームだった)ので、ここで言う。 */
    const missing = missingAssets(ctx, commands)
    const head = '文法の誤りはありません。イベントコマンド ' + commands.length + ' 個になります。'
    if (!missing.length) return toolResult(head, { ok: true, commandCount: commands.length, missingAssets: [] })
    const lines = [head, '', '**ただし参照している素材がありません**（ゲームを起こすと読み込みで落ちます）:']
      .concat(missing.map(function (m) { return '  ・' + m.asset + '  … ' + m.used + 'で参照' }))
      .concat(['', '素材を入れるか、その参照を使わない作りにしてください。'])
    return toolResult(lines.join('\n'), { ok: true, commandCount: commands.length, missingAssets: missing })
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

/* 名前で引く。**その場で引く**のが要点 - 一度作った表に固めると、下に道具を足した日に
 * tools/list には出るのに tools/call が「知らない道具」と言う(実際にそうなった)。 */
const toolNamed = function (name) {
  const hit = TOOLS.filter(function (t) { return t.name === name })
  return hit.length ? hit[0] : undefined
}

/* ---------- データベースの名前を付ける ---------- */

/*
 * ここだけが data/System.json を書く。ほかの道具は全部「イベントのテキスト」の話で、
 * これは境界を1つ越えている。だから対象を **switch と variable の名前だけ**に絞った。
 * イベントが番号で参照するのはこの2つなので、「イベントのために要る最小限」で説明が付く。
 * アイテムの値段や敵の能力値には触らない(あれはツクールのデータベース編集器の仕事)。
 *
 * なぜ要るか: MCP でイベントを1つ作ってみたら、エージェントが使ったスイッチが
 * 名前の無いまま残った。逆引きも「スイッチ259」としか言えない。番号だけが残ると、
 * 後で読む人にも AI にも効く。
 */
const NAMEABLE = {
  switch: { field: 'switches', label: 'スイッチ' },
  variable: { field: 'variables', label: '変数' }
}

const systemPathOf = function (ctx) { return path.join(ctx.dataDir, 'System.json') }

/** System.json を読む。**丸ごと保って、名前の配列だけを差し替える**ために全体を返す。 */
const readSystem = function (ctx) {
  const file = systemPathOf(ctx)
  let data
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error('System.json が読めません: ' + relOf(ctx, file))
  }
  if (!data || typeof data !== 'object') throw new Error('System.json の形が違います: ' + relOf(ctx, file))
  return data
}

TOOLS.push({
  name: 't2f_name_plan',
  title: 'スイッチ・変数に名前を付ける(下書き)',
  partOfWriting: true,
  description: 'スイッチか変数の名前を付ける下書きを作ります。data/System.json は1バイトも書きません。' +
    '返ってくる札(token)を t2f_name_apply に渡すと実際に書きます。' +
    '\n名前を付けられるのは**スイッチと変数だけ**です(イベントが番号で参照するのがこの2つなので)。' +
    'アイテムや敵などの名前はツクールのデータベースで付けてください。' +
    '\n既に名前が付いているものは断ります。差し替えるなら force を渡してください。' +
    '\n**RPGツクールのエディタを閉じてから**使ってください。あちらも System.json を書き戻します。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'id', 'name'],
    properties: {
      kind: { type: 'string', enum: Object.keys(NAMEABLE), description: '種類' },
      id: { type: ['integer', 'string'], minimum: 1, description: '番号' },
      name: { type: 'string', description: '付ける名前' },
      force: { type: 'boolean', description: '既に名前が付いていても差し替える' }
    }
  },
  run: function (ctx, args) {
    const kind = String((args && args.kind) || '')
    const source = NAMEABLE[kind]
    if (!source) throw new Error('名前を付けられるのは ' + Object.keys(NAMEABLE).join(' と ') + ' だけです: ' + kind)
    const id = Number(args && args.id)
    if (!(id > 0) || Math.floor(id) !== id) throw new Error('番号は1以上の整数です: ' + (args && args.id))
    const name = String((args && args.name) === undefined ? '' : args.name).trim()
    if (!name) throw new Error('付ける名前が空です')

    const data = readSystem(ctx)
    const names = data[source.field]
    if (!Array.isArray(names)) throw new Error('System.json に ' + source.field + ' の配列がありません')
    if (id >= names.length) {
      throw new Error(source.label + id + ' は作られていません(' + source.field + ' は ' + (names.length - 1) +
        ' 番までです)。RPGツクールで枠を増やしてください。')
    }
    const current = typeof names[id] === 'string' ? names[id] : ''
    /* 同じ名前なら何もしない。**force より先に見る** - 同じ名前を頼んだだけで
     * 「force を渡せ」と言われるのは、やることが無いのに手間を増やしている。 */
    if (current === name) {
      return toolResult(source.label + id + ' は既に「' + name + '」です。変えるところがありません。',
        { kind, id, name, changed: false })
    }
    if (current && !(args && args.force)) {
      return toolError(source.label + id + ' には既に「' + current + '」が付いています。' +
        '差し替えるなら force を渡してください(人が付けた名前を黙って奪わないため)。')
    }

    const file = systemPathOf(ctx)
    const token = sha1(['name', kind, String(id), name, fingerprintOf(file)].join('\u0000'))
    forgetOldPlans(Date.now())
    PLANS.set(token, {
      at: Date.now(),
      nameChange: { kind, id, name, field: source.field, label: source.label, was: current },
      systemPath: file,
      systemFingerprint: fingerprintOf(file)
    })
    return toolResult([
      '付ける名前: ' + source.label + id + '  「' + (current || '(名前なし)') + '」 -> 「' + name + '」',
      '書くファイル: ' + relOf(ctx, file) + '（' + source.field + ' だけを差し替えます）',
      '',
      '※ RPGツクールのエディタを閉じてから適用してください。あちらも System.json を書き戻します。',
      '',
      'この内容でよければ t2f_name_apply に token を渡してください: ' + token
    ].join('\n'), { kind, id, name, was: current, changed: true, token })
  }
})

TOOLS.push({
  name: 't2f_name_apply',
  title: 'スイッチ・変数に名前を付ける(適用)',
  description: 't2f_name_plan が返した札(token)を受け取り、本当に data/System.json へ書きます。' +
    '直前の中身は .t2f-history に控えるので、VS Code 拡張の「編集履歴を表示する」から戻せます。',
  annotations: { destructiveHint: true, idempotentHint: false },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['token'],
    properties: {
      token: { type: 'string', description: 't2f_name_plan が返した札' }
    }
  },
  run: function (ctx, args) {
    const token = String((args && args.token) || '')
    forgetOldPlans(Date.now())
    const plan = PLANS.get(token)
    if (!plan || !plan.nameChange) {
      return toolError('その札は使えません(知らない札か、期限切れ(' + (PLAN_TTL_MS / 60000) + '分)です)。t2f_name_plan からやり直してください。')
    }
    if (fingerprintOf(plan.systemPath) !== plan.systemFingerprint) {
      PLANS.delete(token)
      return toolError('下書きのあとに System.json が変わりました(ツクールのエディタが書き戻した可能性があります)。t2f_name_plan からやり直してください。')
    }

    const change = plan.nameChange
    const history = require(path.join(__dirname, 't2f-history.js'))
    const recorder = history.beginEntry(ctx.root, 'mcp-name', 'MCP の名前付け ' + change.label + change.id, { keep: ctx.historyKeep })
    recorder.note(plan.systemPath, 'data')

    try {
      /* 読み直してから名前の配列だけを差し替える。**全体を作り直さない** -
       * System.json にはゲームの設定が丸ごと入っているので、ほかのキーを落とせない。 */
      const data = readSystem(ctx)
      if (!Array.isArray(data[change.field])) throw new Error('System.json に ' + change.field + ' の配列がありません')
      data[change.field][change.id] = change.name
      fs.writeFileSync(plan.systemPath, JSON.stringify(data), 'utf8')
    } finally {
      PLANS.delete(token)
    }
    const entry = recorder.finish()

    return toolResult([
      '名前を付けました: ' + change.label + change.id + '  「' + (change.was || '(名前なし)') + '」 -> 「' + change.name + '」',
      entry ? '直前の中身を .t2f-history に控えました(' + entry.id + ')。戻すときは VS Code 拡張の「編集履歴を表示する」から。' : ''
    ].filter(function (l) { return l }).join('\n'), {
      kind: change.kind,
      id: change.id,
      name: change.name,
      was: change.was,
      systemPath: relOf(ctx, plan.systemPath),
      historyId: entry ? entry.id : null
    })
  }
})

/* ---------- 動いているゲーム(再生とデバッグ) ---------- */

/*
 * 拡張のテストプレイでできることを、MCP からも使えるようにする。
 *
 * **サーバはこちらが持つ。** 状態を読むには持つしかないので、VS Code 側でテストプレイ中
 * だと別のゲームになる。
 *
 * 待つのはこの一群だけ(不変条件2)。殻が鎖なので、待っても要求どうしは交錯しない。
 */

/** ゲームが繋がっているか。 */
const gameIsLive = function (ctx) {
  const game = ctx.game()
  if (!game) return false
  return game.state.received() && game.state.connected(Date.now())
}

/** 待つ。鎖の中なので、ここで止めるのは次の要求も止める - 締め切りを必ず置く。 */
const waitFor = function (check, deadlineMs) {
  const until = Date.now() + Math.max(100, deadlineMs)
  return new Promise(function (resolve) {
    const look = function () {
      const got = check()
      if (got !== undefined && got !== false) return resolve(got)
      if (Date.now() >= until) return resolve(undefined)
      setTimeout(look, 50)
    }
    look()
  })
}

/** 命令を送る。聞いているゲームが無ければすぐ失敗する(待っても来ない)。 */
const sendToGame = function (ctx, command) {
  const game = ctx.game()
  if (!game) throw new Error('ゲームを動かしていません(先に t2f_play_start)')
  if (!game.server.send(command)) {
    throw new Error('ゲームが聞いていません。ブラウザでそのページを開いてください: ' + game.server.url)
  }
  return game
}

/** いまの様子。道具をまたいで同じ形で返す。 */
const playStatus = function (ctx) {
  const game = ctx.game()
  if (!game) return { running: false }
  const state = game.state
  const frames = (state.running && state.running()) || []
  return {
    running: true,
    url: game.server.url,
    port: game.server.port,
    gameRoot: relOf(ctx, game.gameRoot) || '.',
    connected: gameIsLive(ctx),
    scene: state.scene || null,
    message: state.message || null,
    player: state.player || null,
    mapId: state.mapId === undefined ? null : state.mapId,
    paused: state.paused ? { reason: state.paused.reason, at: state.paused.frames.map(function (f) { return textLineOf(ctx, f) }) } : null,
    frames: frames.map(function (f) { return Object.assign({ place: f.key, commandIndex: f.index }, textLineOf(ctx, f)) })
  }
}

/** 「どこに居るか」の一行。拡張がハイライトするのと同じ場所を、文字で言う。 */
const whereLine = function (f) {
  const head = f.place + ' の ' + (f.commandIndex + 1) + ' 番目'
  if (!f.line) return head
  return head + '  -> ' + f.textPath + ' の ' + f.line + ' 行目' + (f.exact ? '' : '(近くの行)') +
    (f.text ? '  ' + JSON.stringify(f.text) : '')
}

const statusLines = function (info) {
  if (!info.running) return ['ゲームは動いていません。t2f_play_start で始めてください。']
  const lines = [
    'URL: ' + info.url,
    'ゲームが繋がっているか: ' + (info.connected ? 'はい' : 'いいえ(ブラウザでその URL を開いてください)')
  ]
  if (info.scene) lines.push('いまの画面: ' + info.scene)
  if (info.message) {
    lines.push('メッセージ: ' + (info.message.busy ? (info.message.choice ? '選択肢が出ています' : '出ています') : '出ていません'))
    ;(info.message.lines || []).forEach(function (one) { lines.push('  | ' + one) })
    ;(info.message.choices || []).forEach(function (one, i) { lines.push('  ' + (i + 1) + ') ' + one) })
  }
  if (info.player) lines.push('いる場所: マップ' + info.mapId + ' (' + info.player.x + ',' + info.player.y + ')')
  else if (info.mapId !== null) lines.push('いるマップ: ' + info.mapId)
  if (info.paused) {
    lines.push('**止まっています**(' + info.paused.reason + ')。t2f_play_step で動かしてください:')
    info.paused.at.forEach(function (f) { lines.push('  ' + whereLine(f)) })
  }
  if (info.frames.length) {
    lines.push('走っているもの:')
    info.frames.forEach(function (f) { lines.push('  ' + whereLine(f)) })
  }
  return lines
}

TOOLS.push({
  name: 't2f_play_start',
  title: 'テストプレイを始める',
  needsLive: true,
  /* readOnlyHint は名乗らない。ゲームのファイルは1バイトも書かないが、ポートを開けて
   * 保ち続けるのは環境を変えること。--read-only では isWriteTool がこれを隠す。 */
  description: 'ゲームのフォルダを配るサーバを起こし、URL を返します。その URL をブラウザで開くと、' +
    'ここから状態を読んだり、スイッチを変えたり、イベントを走らせたりできます。' +
    '\n既に動いていれば同じものを使い回します。' +
    '\n※ VS Code のテストプレイと同時には使えません(状態の受け手は1つだけなので、別のサーバ=別のゲームになります)。',
  annotations: { destructiveHint: false, idempotentHint: true },
  inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  run: function (ctx) {
    const already = !!ctx.game()
    return ctx.openGame().then(function (game) {
      const info = playStatus(ctx)
      /* FOSSIL を使うゲームは index.html だと require is not defined で落ちる。
       * 拡張の testPlay.ts も同じ逃げ道を持っている。 */
      const fossil = fs.existsSync(path.join(game.gameRoot, 'FOSSILindex.html'))
      const page = fossil ? 'FOSSILindex.html' : 'index.html'
      const open = game.server.url + page + '?test'
      const lines = [(already ? '既に動いていました。' : 'テストプレイを始めました。'), 'ブラウザでここを開いてください: ' + open]
      if (fossil) lines.push('(このゲームは FOSSIL を使うので index.html ではなく FOSSILindex.html を開きます)')
      const usual = ctx.live().gameServer.stablePort(game.gameRoot)
      if (game.server.port !== usual) {
        lines.push('※ いつもの番号(' + usual + ')が塞がっていたので ' + game.server.port + ' で開きました。' +
          'セーブの置き場所が番号ごとに分かれるので、前に開いたタブがあれば閉じてください' +
          '(VS Code のテストプレイか、前のこの道具が掴んでいます)。')
      }
      return toolResult(lines.concat('', statusLines(info)).join('\n'),
        Object.assign({ openUrl: open, page }, info))
    })
  }
})

TOOLS.push({
  name: 't2f_play_stop',
  title: 'テストプレイを止める',
  needsLive: true,
  description: '配るサーバを閉じます。ブラウザのタブは閉じません。',
  annotations: { destructiveHint: false, idempotentHint: true },
  inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  run: function (ctx) {
    return ctx.closeGame().then(function (was) {
      return toolResult(was ? '止めました。' : '動いていませんでした。', { stopped: was })
    })
  }
})

TOOLS.push({
  name: 't2f_play_status',
  title: 'いまの様子',
  needsLive: true,
  /* 本当に何も書かない(readOnlyHint は正直)。だが --read-only では t2f_play_start が
   * 隠れるので、見えても繋ぐ手段が無い。t2f_write_plan と同じ理由でここも隠す。 */
  partOfWriting: true,
  description: 'ゲームが繋がっているか、いまどの画面でどこに居るか、何が走っているかを返します。' +
    '\nメッセージが出ていれば**その文面と選択肢**も返します。走っている場所は、拡張がエディタで' +
    '光らせるのと同じようにテキストの行へ戻して返します。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  run: function (ctx) {
    const info = playStatus(ctx)
    return toolResult(statusLines(info).join('\n'), info)
  }
})

TOOLS.push({
  name: 't2f_play_state',
  title: 'スイッチと変数を見る',
  needsLive: true,
  /* 本当に何も書かない(readOnlyHint は正直)。だが --read-only では t2f_play_start が
   * 隠れるので、見えても繋ぐ手段が無い。t2f_write_plan と同じ理由でここも隠す。 */
  partOfWriting: true,
  description: '動いているゲームのいまの値を返します。ON のスイッチ、0でない変数、持ち物、所持金、並列処理。' +
    '番号には名前を添えます。',
  annotations: { readOnlyHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      kind: { type: 'string', enum: ['switch', 'variable', 'selfSwitch', 'item', 'all'], description: '種類。省くと全部' }
    }
  },
  run: function (ctx, args) {
    const game = ctx.game()
    if (!game) throw new Error('ゲームを動かしていません(先に t2f_play_start)')
    if (!game.state.received()) throw new Error('ゲームがまだ何も報告していません。ブラウザでそのページを開いてください: ' + game.server.url)
    const snap = game.state.snapshot()
    const want = (args && args.kind) || 'all'
    const st = ctx.structure()
    let db
    if (st) { try { db = st.database.GameDatabase.load(ctx.dataDir) } catch (e) { db = undefined } }
    /* name は**素の名前だけ**。label が表示用(番号つき)。
     * 片方の半分だけ見ても足りるようにする - structuredContent に id があるのに
     * name にも番号が入っていると、機械で読む側が番号を二度持つことになる。 */
    const named = function (kind, id) {
      let found
      if (db) { try { found = db.lookup(kind, Number(id)) } catch (e) { found = undefined } }
      const name = (found && found.name) || null
      return { name, label: id + (name ? '「' + name + '」' : '') }
    }
    const pairs = function (rows) { return rows || [] }
    const out = {
      switches: pairs(snap.switches).map(function (e) { return Object.assign({ id: e[0] }, named('switch', e[0]), { value: e[1] }) }),
      variables: pairs(snap.variables).map(function (e) { return Object.assign({ id: e[0] }, named('variable', e[0]), { value: e[1] }) }),
      selfSwitches: pairs(snap.selfSwitches).map(function (key) { return { key: String(key), value: true } }),
      items: pairs(snap.items).map(function (e) { return { key: e[0], count: e[1] } }),
      gold: snap.gold === undefined ? null : snap.gold,
      mapId: snap.mapId === undefined ? null : snap.mapId,
      parallel: snap.parallel || { events: [], commons: [] }
    }
    const lines = []
    const show = function (kind, label, rows, render) {
      if (want !== 'all' && want !== kind) return
      lines.push('[' + label + '] ' + rows.length + ' 件')
      rows.slice(0, 200).forEach(function (r) { lines.push('  ' + render(r)) })
    }
    show('switch', 'ON のスイッチ', out.switches, function (r) { return r.label })
    show('variable', '0 でない変数', out.variables, function (r) { return r.label + ' = ' + r.value })
    show('selfSwitch', 'ON のセルフスイッチ', out.selfSwitches, function (r) { return r.key })
    show('item', '持ち物', out.items, function (r) { return r.key + ' ×' + r.count })
    if (want === 'all') {
      lines.push('所持金: ' + out.gold)
      const running = (out.parallel.events || []).map(function (id) { return 'イベント' + id })
        .concat((out.parallel.commons || []).map(function (id) { return 'コモン' + id }))
      if (running.length) lines.push('並列処理: ' + running.join(', '))
    }
    return toolResult(lines.join('\n') || '(まだ何も立っていません)', out)
  }
})

TOOLS.push({
  name: 't2f_play_set',
  needsLive: true,
  title: '値を変える',
  description: '動いているゲームのスイッチ・変数・セルフスイッチ・持ち物・所持金を変えます。' +
    'セルフスイッチの鍵は「マップ,イベント,文字」(例 1,8,A)、持ち物は i:/w:/a: に番号。',
  annotations: { destructiveHint: true, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      switches: { type: ['object', 'array'], description: '{番号: true/false} か [{id, value}]' },
      variables: { type: ['object', 'array'], description: '{番号: 数か文字列} か [{id, value}]' },
      selfSwitches: { type: ['object', 'array'], description: '{"1,8,A": true/false} か [{key, value}]' },
      items: { type: ['object', 'array'], description: '{"i:3": 個数} か [{key, count}]' },
      gold: { type: 'integer', minimum: 0, description: '所持金' }
    }
  },
  run: function (ctx, args) {
    /* t2f_play_state は [{id, name, label, value}] の形で返す。**読んだ形をそのまま
     * 書けないと往復が1つ増える**(t2f_list の mapId で同じ罠を踏んだ)。だから配列も畳む。 */
    const asMap = function (value) {
      if (!Array.isArray(value)) return value
      const out = {}
      value.forEach(function (row) {
        if (!row || typeof row !== 'object') return
        const key = row.id !== undefined ? row.id : row.key
        if (key === undefined) return
        out[key] = row.value !== undefined ? row.value : row.count
      })
      return out
    }
    const command = {}
    ;['switches', 'variables', 'selfSwitches', 'items'].forEach(function (k) {
      if (args && args[k] && typeof args[k] === 'object') command[k] = asMap(args[k])
    })
    if (args && typeof args.gold === 'number') command.gold = args.gold
    if (!Object.keys(command).length) throw new Error('変えるものがありません')
    sendToGame(ctx, command)
    const what = Object.keys(command).map(function (k) {
      return k === 'gold' ? '所持金' : k + ' ' + Object.keys(command[k]).length + ' 件'
    })
    return toolResult('送りました: ' + what.join(' / ') + '\n(ゲーム側に反映されたかは t2f_play_state で確かめてください)', { sent: command })
  }
})

TOOLS.push({
  name: 't2f_play_goto',
  title: 'イベントを試す',
  needsLive: true,
  description: '拡張の「このページをすぐ実行」「イベントの前に立つ」「コモンイベントを試す」と同じもの。' +
    '\nmode=run はそのページを**出現条件を見ずに**走らせます。stand は前に立つだけ。common はコモンイベントを予約します。' +
    '\n※ 走っているイベントと開いているメッセージは**捨てられます**(進めるのではなく clear します)。' +
    '\nタイトル画面のときは新しいゲームを始めてから動きます。',
  annotations: { destructiveHint: true, idempotentHint: false },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: { type: 'string', enum: ['run', 'stand', 'common'], description: '既定は run' },
      key: { type: 'string', description: '宛先の鍵(例 map001_event008_page1)' },
      mapId: { type: ['integer', 'string'] },
      eventId: { type: ['integer', 'string'] },
      pageId: { type: ['integer', 'string'] },
      commonEventId: { type: ['integer', 'string'], description: 'mode=common のとき' },
      reload: { type: 'boolean', description: '先にゲームを読み直す(反映した直後はこれが要る。進行は失われます)' },
      waitMs: { type: 'integer', minimum: 500, maximum: 60000, description: '答えを待つ上限(既定 10000)' }
    }
  },
  run: function (ctx, args) {
    const game = ctx.game()
    if (!game) throw new Error('ゲームを動かしていません(先に t2f_play_start)')
    const mode = (args && args.mode) || 'run'
    const waitMs = (args && args.waitMs) || 10000
    let visit

    if (mode === 'common') {
      const id = Number(args && (args.commonEventId !== undefined ? args.commonEventId : args.key))
      if (!(id > 0)) throw new Error('mode=common には commonEventId が要ります')
      visit = { common: id }
    } else {
      const found = findTarget(ctx, args)
      if (String(found.target.kind) === 'common') {
        visit = { common: Number(found.target.commonEventId) }
      } else {
        /* 立つ場所はゲームのデータから取る(テキストには座標が無い)。 */
        const map = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, mapFileName(found.target.mapId)), 'utf8'))
        const ev = map.events && map.events[Number(found.target.eventId)]
        if (!ev) throw new Error('そのイベントがゲームのデータにありません: ' + found.target.key)
        visit = {
          mapId: Number(found.target.mapId),
          eventId: Number(found.target.eventId),
          pageId: Number(found.target.pageId || 1),
          x: ev.x,
          y: ev.y,
          run: mode === 'run',
          show: true
        }
      }
    }

    if (args && args.reload) {
      sendToGame(ctx, { reload: true })
      // 読み直したページが繋がり直すのを待つ。
      const at = Date.now()
      return waitFor(function () { return gameIsLive(ctx) && game.state.lastSeen > at }, waitMs)
        .then(function (back) {
          if (!back) throw new Error('読み直したゲームが戻ってきませんでした')
          /* 読み直すとゲーム側のブレークポイントは消えるので、覚えている分を送り直す。 */
          if (ctx.breakpoints && Object.keys(ctx.breakpoints).length) sendToGame(ctx, { breakpoints: ctx.breakpoints })
          return runVisit(ctx, game, visit, mode, waitMs)
        })
    }
    return runVisit(ctx, game, visit, mode, waitMs)
  }
})

/** visit を送って、ゲームの答え(ran / stood / noPage …)が来るまで待つ。 */
const VISIT_WORDS = {
  ran: '走らせました',
  stood: '前に立ちました',
  noEvent: 'そのイベントがありません',
  noPage: 'そのページがありません',
  failed: 'うまくいきませんでした',
  timeout: 'ゲーム側で時間切れになりました'
}
const runVisit = function (ctx, game, visit, mode, waitMs) {
  const before = game.state.lastVisit
  sendToGame(ctx, { visit })
  return waitFor(function () {
    const now = game.state.lastVisit
    return now && (!before || now.at > before.at) ? now : false
  }, waitMs).then(function (answer) {
    if (!answer) {
      return toolError('ゲームから答えが返りませんでした(' + (waitMs / 1000) + '秒)。' +
        'ブラウザのタブが裏に回っていると動きません。t2f_play_status で様子を見てください。')
    }
    const word = String(answer.result || '')
    const ok = word === 'ran' || word === 'stood'
    const text = (VISIT_WORDS[word] || word) + '(' + word + ')'
    const info = Object.assign({ result: word, ok, mode }, playStatus(ctx))
    if (!ok) return toolResult(text, info)
    return toolResult(text + '\n\n' + statusLines(info).join('\n'), info)
  })
}

TOOLS.push({
  name: 't2f_play_input',
  title: 'キーを押す / 画面を触る',
  needsLive: true,
  description: '動いているゲームにキー入力とタップを送ります。メッセージを進めるのも、タイトルで決定するのもこれ。' +
    '\nキーの名前は RPGツクールのもの: ok(決定) / cancel / up / down / left / right / shift / pageup / pagedown。' +
    '\n押したあとの様子は返り値に入ります(メッセージがまだ開いているかなど)。',
  annotations: { destructiveHint: true, idempotentHint: false },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      keys: { type: 'array', items: { type: 'string' }, description: '一度に押すキー' },
      key: { type: 'string', description: 'キー1つ' },
      times: { type: 'integer', minimum: 1, maximum: 50, description: '繰り返す回数(既定 1)' },
      hold: { type: 'integer', minimum: 1, maximum: 600, description: '押している長さ(フレーム。既定 2)' },
      tap: {
        type: 'object',
        additionalProperties: false,
        required: ['x', 'y'],
        properties: { x: { type: 'integer' }, y: { type: 'integer' } },
        description: '画面を触る(キャンバスの座標)'
      },
      waitMs: { type: 'integer', minimum: 0, maximum: 10000, description: '押したあと様子を見るまでの待ち(既定 400)' }
    }
  },
  run: function (ctx, args) {
    const input = {}
    if (args && Array.isArray(args.keys)) input.keys = args.keys
    if (args && typeof args.key === 'string') input.key = args.key
    if (args && typeof args.hold === 'number') input.hold = args.hold
    if (args && args.tap) input.tap = args.tap
    if (!input.keys && !input.key && !input.tap) throw new Error('押すものがありません(keys か key か tap)')

    const times = Math.min(Math.max(Number(args && args.times) || 1, 1), 50)
    const waitMs = args && args.waitMs !== undefined ? Number(args.waitMs) : 400
    for (let i = 0; i < times; i++) sendToGame(ctx, { input })

    return waitFor(function () { return false }, waitMs).then(function () {
      const info = playStatus(ctx)
      const what = (input.keys || (input.key ? [input.key] : [])).join(', ') + (input.tap ? ' tap(' + input.tap.x + ',' + input.tap.y + ')' : '')
      return toolResult('押しました: ' + what + (times > 1 ? ' ×' + times : '') + '\n\n' + statusLines(info).join('\n'),
        Object.assign({ sent: input, times }, info))
    })
  }
})

/* ゲーム側がイベントを指す鍵。拡張の debugSession.ts と同じ作り方にする。 */
const liveKeyOf = function (target) {
  if (String(target.kind) === 'common') return 'c:' + Number(target.commonEventId)
  return 'e:' + Number(target.mapId) + ':' + Number(target.eventId) + ':' + Number(target.pageId || 1)
}

/* テキストの行とゲームのコマンド番号を結ぶ。借りている層(runLines / breakpoints)が
 * 両方向を持っているので、こちらは繋ぐだけ。 */
const alignFor = function (ctx, target) {
  const lines = loadDb('runLines')
  if (!lines) throw new Error('行とコマンドの対応が使えません(拡張をコンパイルしてください)')
  const found = findTarget(ctx, target)
  const existing = found.index.paths[found.target.key]
  if (!existing) throw new Error('そのイベントのテキストがまだありません: ' + found.target.key + '(先に t2f_read で取り出してください)')
  const text = fs.readFileSync(existing, 'utf8')
  const body = ctx.t2f.parseFrontMatter(text).body
  /* lineMap は**本文の中の**0始まりの行。利用者が見るのはファイルの行なので、見出し情報の
   * ぶんだけずらす。body は改行を畳んだ text の後ろ半分なので、そこで測る(見出し情報が
   * 無いときは body が元の text そのままなので 0 になる)。 */
  const flat = text.split('\r\n').join('\n')
  const offset = flat.length > body.length ? flat.slice(0, flat.length - body.length).split('\n').length - 1 : 0
  const built = ctx.t2f.compile(body, { lineMap: true })
  const game = listOf(ctx, found.target)
  const alignment = lines.alignCommands(game.map(lines.commandMark), built.commands.map(lines.commandMark))
  return { found, built, alignment, offset, lines, textPath: existing }
}

TOOLS.push({
  name: 't2f_play_break',
  title: 'ブレークポイントを置く',
  needsLive: true,
  needsStructure: true,
  description: 'テキストの**行番号**で止める場所を決めます(1 始まり)。行はゲームのコマンド番号に直して送ります。' +
    '\nlines を空にするとそのイベントの分を消します。clearAll で全部消します。',
  annotations: { destructiveHint: false, idempotentHint: true },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: Object.assign({}, TARGET_ARGS, {
      lines: { type: 'array', items: { type: 'integer', minimum: 1 }, description: '止めたい行(1 始まり)' },
      clearAll: { type: 'boolean', description: '全部消す' }
    })
  },
  run: function (ctx, args) {
    if (args && args.clearAll) {
      ctx.breakpoints = {}
      sendToGame(ctx, { breakpoints: {} })
      return toolResult('ブレークポイントを全部消しました。', { breakpoints: {} })
    }
    const marks = loadDb('breakpoints')
    if (!marks) throw new Error('ブレークポイントの層が使えません')
    const at = alignFor(ctx, args)
    const key = liveKeyOf(at.found.target)
    const wanted = (args && Array.isArray(args.lines) ? args.lines : [])
    const placed = []
    const missed = []
    wanted.forEach(function (one) {
      // 利用者は1始まりで数える。lineMap は本文の中の0始まり。
      const spot = marks.breakpointAt(at.built.commands, at.built.lineMap, at.alignment, Number(one) - 1 - at.offset)
      if (spot.problem) { missed.push({ line: one, why: spot.problem }); return }
      placed.push({ line: spot.line + 1 + at.offset, commandIndex: spot.game })
    })
    ctx.breakpoints = ctx.breakpoints || {}
    if (placed.length) ctx.breakpoints[key] = placed.map(function (p) { return p.commandIndex })
    else delete ctx.breakpoints[key]
    sendToGame(ctx, { breakpoints: ctx.breakpoints })

    const lines = placed.length
      ? ['置きました: ' + key].concat(placed.map(function (p) { return '  ' + p.line + ' 行目 -> コマンド ' + (p.commandIndex + 1) + ' 番目' }))
      : ['消しました: ' + key]
    missed.forEach(function (m) {
      lines.push('  ' + m.line + ' 行目は置けません(' +
        (m.why === 'noCommand' ? 'そこから先にコマンドがありません' : 'ゲーム側に対応するコマンドがありません。反映していない変更があるかもしれません') + ')')
    })
    return toolResult(lines.join('\n'), { key, placed, missed, textPath: relOf(ctx, at.textPath) })
  }
})

TOOLS.push({
  name: 't2f_play_step',
  title: '続ける / 1歩進める / 止める',
  needsLive: true,
  description: 'ブレークポイントで止まったゲームを動かします。' +
    'continue=続ける / next=次のコマンド(呼び出しは飛ばす) / stepIn=呼び出しの中へ / stepOut=呼び出しから出る / pause=次のコマンドで止める。' +
    '\n止まった所は**テキストの行に戻して**返します。',
  annotations: { destructiveHint: false, idempotentHint: false },
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['how'],
    properties: {
      how: { type: 'string', enum: ['continue', 'next', 'stepIn', 'stepOut', 'pause'] },
      waitMs: { type: 'integer', minimum: 100, maximum: 60000, description: '止まるのを待つ上限(既定 5000)' }
    }
  },
  run: function (ctx, args) {
    const game = ctx.game()
    if (!game) throw new Error('ゲームを動かしていません(先に t2f_play_start)')
    const how = String(args && args.how)
    const waitMs = (args && args.waitMs) || 5000
    const before = game.state.paused
    sendToGame(ctx, { debug: how })

    if (how === 'continue') {
      return toolResult('続けました。', Object.assign(playStatus(ctx), { how, paused: false }))
    }
    return waitFor(function () {
      const now = game.state.paused
      return now && (!before || now.at > before.at) ? now : false
    }, waitMs).then(function (stopped) {
      if (!stopped) {
        return toolResult('まだ止まっていません(' + (waitMs / 1000) + '秒)。\n\n' + statusLines(playStatus(ctx)).join('\n'),
          Object.assign(playStatus(ctx), { how, paused: false, stoppedAt: [] }))
      }
      const lines = ['止まりました(' + stopped.reason + ')']
      const stoppedAt = []
      stopped.frames.forEach(function (frame) {
        const at = textLineOf(ctx, frame)
        stoppedAt.push(at)
        lines.push('  ' + frame.key + ' の ' + (frame.index + 1) + ' 番目' +
          (at.line ? '  -> ' + at.textPath + ' の ' + at.line + ' 行目' + (at.exact ? '' : '(近くの行)') : ''))
      })
      return toolResult(lines.join('\n'),
        Object.assign(playStatus(ctx), { how, paused: true, reason: stopped.reason, stoppedAt }))
    })
  }
})

/** 止まったコマンド番号を、テキストの行に戻す。 */
const textLineOf = function (ctx, frame) {
  const out = { place: frame.key, commandIndex: frame.index, line: null, textPath: null, exact: false, text: null }
  const m = /^e:(\d+):(\d+):(\d+)$/.exec(String(frame.key || ''))
  const c = /^c:(\d+)$/.exec(String(frame.key || ''))
  if (!m && !c) return out
  try {
    const at = alignFor(ctx, m
      ? { mapId: m[1], eventId: m[2], pageId: m[3] }
      : { commonEventId: c[1] })
    const target = at.lines.locateCommand(at.alignment, frame.index)
    if (target.index === undefined) return out
    const span = at.lines.commandLines(at.built.commands, at.built.lineMap, target.index)
    out.line = span ? span.from + 1 + at.offset : null
    out.exact = !!target.exact
    out.textPath = relOf(ctx, at.textPath)
    if (span) {
      /* 行そのものも返す。番号だけでは、呼んだ側がもう一度ファイルを読む往復が要る。
       * 拡張がエディタで光らせているのと同じ範囲。 */
      const all = fs.readFileSync(at.textPath, 'utf8').split('\r\n').join('\n').split('\n')
      out.text = all.slice(span.from + at.offset, span.to + at.offset + 1).join('\n').slice(0, 400)
    }
  } catch (e) { /* テキストがまだ無いなどは、行が無いだけ */ }
  return out
}

/* --read-only で隠す道具。MCP の annotations は「この道具は書くか」をクライアントへ
 * 伝えるもので、こちらの印は「書き込みの一連に属すか」。別の関心なので分けておく。 */
const isWriteTool = function (tool) {
  return !!tool.partOfWriting || !(tool.annotations && tool.annotations.readOnlyHint)
}

/* 拡張の純粋な層が要る道具は、それが無い配り方では出さない。
 * --read-only と同じ「出す/出さない」の仕組みに乗せる。 */
const toolsFor = function (ctx) {
  const hasStructure = !!ctx.structure()
  const hasLive = !!ctx.live()
  return TOOLS.filter(function (t) {
    if (ctx.readOnly && isWriteTool(t)) return false
    if (t.needsStructure && !hasStructure) return false
    if (t.needsLive && !hasLive) return false
    return true
  })
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
 * I/O は再生の道具だけが持つ(それ以外はここで増やさない)。テストはこれを直に叩く。
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
    const tool = toolNamed(name)
    /* tools/list に出していない道具は、呼ばれても知らないものとして扱う(扱いを1つに保つ)。
     * 出す/出さないの判断は toolsFor が持っているので、そこを引く。 */
    if (!tool || toolsFor(ctx).indexOf(tool) === -1) {
      return jsonrpcError(request.id, INVALID_PARAMS, '知らない道具です: ' + name)
    }
    const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {}
    // 道具の中で起きたことはモデルが読んで直せるよう本文で返す。
    const failed = function (e) { return jsonrpcResult(request.id, toolError((e && e.message) || String(e))) }
    let out
    try {
      out = tool.run(ctx, args)
    } catch (e) {
      return failed(e)
    }
    /* 再生の道具だけが待つ(サーバの起動、visit の答え)。**待つのはここだけ**で、
     * 書き込みの道具は同期のまま - 殻が鎖なので要求どうしは交錯しない。 */
    if (out && typeof out.then === 'function') {
      return out.then(function (result) { return jsonrpcResult(request.id, result) }, failed)
    }
    return jsonrpcResult(request.id, out)
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
      enqueueError(PARSE_ERROR, 'JSON として読めませんでした')
      return
    }
    enqueue(request)
  }

  /* 要求を1本の鎖に並べる。**N の答えを送るまで N+1 を始めない。**
   *
   * なぜ鎖か: 再生の道具は待つ(サーバの起動、visit の答え、ブレークポイントの停止)。
   * 素朴に await を足すと2つの要求が同時に飛び、Laurus.Text2Frame の共有状態
   * (_warnings / _conflicts / _writeBack の退避・復元)が交錯して、片方の警告が
   * もう片方に混ざる。鎖なら順番が守られるので起きない。
   *
   * 3つとも外せない:
   *  - if (response) … 通知は null。落とすと標準出力に "null" の行が出る
   *  - .catch …… 無いと、投げた要求に答えが返らないうえ鎖が拒否で止まり、
   *              **以後の要求が全部無視される**
   *  - .catch を最後 … 鎖の尾を必ず成功で終える(send 自身が投げる場合も拾う) */
  let chain = Promise.resolve()
  const enqueue = function (request) {
    chain = chain
      .then(function () { return handle(request, ctx) })
      .then(function (response) { if (response) send(response) })
      .catch(function (e) {
        try {
          send(jsonrpcError(request && request.id, INTERNAL_ERROR, (e && e.message) || String(e)))
        } catch (ignored) { /* 通路が死んでいるなら言う先が無い */ }
      })
  }

  /* 通路の書き手を1人に保つ。読めない行の知らせも鎖に乗せないと、visit が走っている間に
   * 順序が入れ替わる。 */
  const enqueueError = function (code, message) {
    chain = chain.then(function () { send(jsonrpcError(null, code, message)) }).catch(function () {})
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
      enqueueError(PARSE_ERROR, '1行が長すぎます(上限 ' + MAX_LINE_BYTES + ' バイト)')
    }
  })
  /* 標準入力が閉じたら終わる(仕様が求める、唯一移植性のある終わり方)。
   * ただし process.exit を呼ばない。標準出力がパイプのとき書き込みは非同期で、
   * 急いで exit すると後ろの応答が切り落ちる。手を離せばループが枯れて自然に終わる
   * (この殻は見張りもタイマも持たない。400要求・1.3MB で切り落ちゼロを確認済み)。 */
  /* 終わるときは**鎖が片付いてから**閉じる。end の瞬間に閉じると、走っている visit の
   * 足元からサーバを抜くことになる。 */
  const finish = function (why) {
    ctx.log('[mcp] ' + why)
    chain = chain.then(function () { return closeContext(ctx) }).catch(function () {})
    return chain
  }
  process.stdin.on('end', function () { finish('stdin が閉じました') })
  /* MCP のクライアントは stdin を閉じてから SIGTERM を送る。捕まえたら**自分で終わる** -
   * 捕まえるだけだと既定の kill が消えて、stdin が開いたままなら止まらなくなる。 */
  process.on('SIGTERM', function () {
    finish('SIGTERM を受けました').then(function () { process.exit(0) })
  })

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

/** 文脈が持っている長生きするものを閉じる。**冪等。** テストの afterEach と、
 * 殻の終わり(stdin が閉じたとき・SIGTERM)から呼ぶ。 */
const closeContext = function (ctx) {
  if (!ctx || typeof ctx.closeGame !== 'function') return Promise.resolve(false)
  return ctx.closeGame()
}

module.exports = {
  PROTOCOL_VERSIONS,
  closeContext,
  NAME_SOURCES,
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
