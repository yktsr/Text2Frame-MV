/*
 * プラグインパラメータの宣言(@default)と、それを読むコードの食い違いを探す。
 *
 *   node tools/check-params.js        食い違いを並べる(見つかれば終了コード 1)
 *
 * 何を見るか: `@type boolean` のパラメータについて、「設定が保存されていないとき
 * コードが何に落ちるか」と `@default` を突き合わせる。@default は設定画面が新規
 * インストールに書き込む値で、述語が決めるのは「キーが無いとき」。別の場面なので
 * 食い違い自体は成立しうるが、黙って食い違っているのが事故になる。
 *
 * この種類が実際に事故になった例: 英語タグの値だけが英語で出ていた件と、
 * Text2Frame だけ DisplayWarning が `=== 'true'` で取り残されていた件。
 *
 * 対象を boolean に絞るのは、文字列・数値・select の既定は別の話だから。
 * (ライブラリ分岐の 'test' / 'basic.txt' のような検体値は、@default とは別の役目)
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

/** 未設定のときに何へ落ちるかが分かる書き方。これ以外は「読めなかった」として報告する。 */
const RULES = [
  { re: /^String\([^)]*\) === 'true'$/, whenUnset: false, name: "String(x) === 'true'" },
  { re: /^String\([^)]*\) !== 'false'$/, whenUnset: true, name: "String(x) !== 'false'" },
  { re: /^toFlag\([^,]*,\s*false\)$/, whenUnset: false, name: 'toFlag(x, false)' },
  { re: /^toFlag\([^,]*,\s*true\)$/, whenUnset: true, name: 'toFlag(x, true)' }
]

/* いまのところ食い違ったままにしているもの。調べて「そうしておく」と決めたものだけを
 * 理由つきで並べる。新しい食い違いはここに無いので、検査が落ちて気づける。 */
const ACCEPTED = {
  'Text2Frame.js': {
    DisplayMsg: '未設定なら出さない。古い設定のまま使っている人の画面に、毎回のコマンドで新しい表示を出さないため',
    DisplayWarning: '未設定なら出さない。Frame2Text 側だけ緩い規則に直されており、揃えるかは別途判断する'
  },
  'Frame2Text.js': {
    DisplayMsg: '未設定なら出さない。Text2Frame 側と同じ理由',
    EnglishTag: '未設定なら日本語。この設定が無かった頃からの扱いを変えないため'
  }
}

/** ヘルプの @param から、boolean のものだけを拾う。 */
const declaredBooleans = function (source) {
  const out = []
  let current = null
  source.split('\n').forEach(function (line) {
    const param = line.match(/^\s*\*\s*@param\s+(\S+)\s*$/)
    if (param) {
      current = { name: param[1], type: null, def: null }
      out.push(current)
      return
    }
    if (!current) return
    const type = line.match(/^\s*\*\s*@type\s+(\S+)\s*$/)
    if (type) { current.type = type[1]; return }
    const def = line.match(/^\s*\*\s*@default\s*(.*)$/)
    if (def) current.def = def[1].trim()
  })
  return out.filter(function (p) { return p.type === 'boolean' })
}

/* 式全体を括っている丸括弧だけ外す(Text2Frame 側は `= (String(x) === 'true')` と書く)。
 * 末尾の1文字を無条件に剥がすと toFlag(x, true) の閉じ括弧まで落ちる。 */
const unwrap = function (expr) {
  let out = expr.trim()
  for (;;) {
    if (out[0] !== '(' || out[out.length - 1] !== ')') return out
    let depth = 0
    for (let i = 0; i < out.length; i++) {
      if (out[i] === '(') depth++
      else if (out[i] === ')') depth--
      // 先頭の括弧が途中で閉じるなら、全体を括ってはいない。
      if (depth === 0 && i < out.length - 1) return out
    }
    out = out.slice(1, -1).trim()
  }
}

/** パラメータを読んでいる代入を拾う。Laurus.<名前空間>.<鍵> = <式> の形。 */
const readerOf = function (source, param) {
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*Laurus\.\w+\.\w+\s*=\s*(.+)$/)
    if (!m) continue
    const expr = unwrap(m[1])
    if (expr.indexOf('Parameters.' + param) === -1 && expr.indexOf("Parameters['" + param + "']") === -1) continue
    return { line: i + 1, expr }
  }
  return null
}

/** 1ファイル分の食い違い。番人が鳴ることを確かめられるよう、中身は別に受け取れる。 */
const checkFile = function (file) {
  return checkSource(file, fs.readFileSync(path.join(root, file), 'utf8'))
}

const checkSource = function (file, source) {
  const accepted = ACCEPTED[file] || {}
  return declaredBooleans(source).map(function (param) {
    const reader = readerOf(source, param.name)
    if (!reader) {
      return { file, param: param.name, kind: 'reader-missing', detail: 'パラメータを読んでいる代入が見つかりません' }
    }
    const rule = RULES.find(function (r) { return r.re.test(reader.expr) })
    if (!rule) {
      return { file, param: param.name, kind: 'rule-unknown', line: reader.line, detail: '未設定のときどうなるか読めない書き方: ' + reader.expr }
    }
    const declared = param.def === 'true'
    if (rule.whenUnset === declared) return null
    return {
      file,
      param: param.name,
      kind: 'default-mismatch',
      line: reader.line,
      detail: '@default ' + param.def + ' だが、未設定なら ' + rule.whenUnset + '(' + rule.name + ')',
      accepted: accepted[param.name] || null
    }
  }).filter(function (x) { return x })
}

/* --- プラグイン側が読む鍵は、2つの箱のどちらかに入っていること ---
 *
 * 事故の形: ツクール側で「既定の背景」を透明にしているプロジェクトのテキストを、
 * ツクールの外から反映すると全部ウィンドウに倒れた。鍵は両側にちゃんと在って、
 * **ライブラリ側の値の意味が「検体」と「プロジェクトの設定」に分かれていた**のが正体。
 * 鍵の数を比べる検査では鳴らない(数は合っている)。
 *
 * だから意味で分ける。新しいパラメータはどちらの箱にも無いので、ここが落ちて気づける。
 *   HONOURED            … ゲームの js/plugins.js から読む(ライブラリ側も同じ値になる)
 *   ACCEPTED_DIVERGENCE … ライブラリ側は検体値のまま。**なぜ困らないか**を書く
 */
const HONOURED = {
  'Text2Frame.js': ['WindowPosition', 'Background', 'CommentOutChar'],
  'Frame2Text.js': []
}

const ACCEPTED_DIVERGENCE = {
  'Text2Frame.js': {
    FileFolder: '検体値。反映元のテキストは呼び出しごとに textPath で渡る',
    FileName: '検体値。FileFolder と同じ',
    DefaultFileFolder: '検体値。一括反映もフォルダを引数で受ける',
    CommonEventID: '宛先は見出し情報か引数が毎回決める',
    MapID: '宛先は見出し情報か引数が毎回決める',
    EventID: '宛先は見出し情報か引数が毎回決める',
    PageID: '宛先は見出し情報か引数が毎回決める',
    IsOverwrite: '反映のしかたは Strategy 1つで決まり、呼び出しごとに渡る',
    DefaultStrategy: '引数を省いたときの既定。ライブラリは必ず渡す',
    IsDebug: 'ログの量。出力には効かない',
    DisplayMsg: 'ゲーム内の $gameMessage 表示。ライブラリでは出さない',
    DisplayWarning: 'ゲーム内の $gameMessage 表示。ライブラリでは戻り値の warnings で返す'
  },
  'Frame2Text.js': {
    FileFolder: '検体値。書き先は呼び出しごとに渡る',
    FileName: '検体値。FileFolder と同じ',
    TextBase: '検体値。FileFolder と同じ',
    CommonEventID: '取り出す対象は引数が毎回決める',
    MapID: '取り出す対象は引数が毎回決める',
    EventID: '取り出す対象は引数が毎回決める',
    PageID: '取り出す対象は引数が毎回決める',
    IsDebug: 'ログの量。出力には効かない',
    DisplayMsg: 'ゲーム内の $gameMessage 表示。ライブラリでは出さない',
    DisplayWarning: 'ゲーム内の $gameMessage 表示。ライブラリでは出さない',
    EnglishTag: 'ライブラリ側は英語で固定。取り出しの4経路とも呼び出しごとに渡す',
    /* これは正直に言う: t2f-sync と MCP は omitDefaults を渡しておらず、
     * ライブラリ側の固定値(省く)に落ちている。拡張だけが設定を渡す。
     * 省く・省かないは往復しても失わないので急がないが、揃えるのは別の回。 */
    OmitDefaultTags: 'ライブラリ側は省くで固定。拡張は設定を渡すが、t2f-sync と MCP は渡していない(別途揃える)'
  }
}

/** プラグイン側が Parameters から読んでいる鍵。 */
const pluginKeys = function (source) {
  const out = []
  const re = /Laurus\.\w+\.(\w+)\s*=\s*[^\n]*Parameters(?:\.|\[')/g
  let m
  while ((m = re.exec(source)) !== null) {
    if (out.indexOf(m[1]) === -1) out.push(m[1])
  }
  return out
}

/** 読み口が実際に見ている鍵(PROJECT_FIELDS の中身)。宣言と実装がずれたら鳴らせる。 */
const honouredInCode = function (source) {
  const block = source.match(/const PROJECT_FIELDS = \{([\s\S]*?)\}/)
  if (!block) return []
  return (block[1].match(/^\s*(\w+):/gm) || []).map(function (line) {
    return line.replace(/[^\w]/g, '')
  })
}

/** 箱に入っていない鍵、どちらにも二重で入っている鍵、宣言と実装のずれ。 */
const unsortedKeys = function (file, source) {
  const honoured = HONOURED[file] || []
  const accepted = ACCEPTED_DIVERGENCE[file] || {}
  const out = []
  pluginKeys(source).forEach(function (key) {
    const inHonoured = honoured.indexOf(key) !== -1
    const inAccepted = Object.prototype.hasOwnProperty.call(accepted, key)
    if (inHonoured && inAccepted) {
      out.push({ file, param: key, kind: 'sorted-twice', detail: '2つの箱の両方に入っています' })
    } else if (!inHonoured && !inAccepted) {
      out.push({ file, param: key, kind: 'unsorted', detail: 'ゲームの設定から読むのか、検体値のままでよいのか決めてください(HONOURED か ACCEPTED_DIVERGENCE へ)' })
    }
  })
  honoured.forEach(function (key) {
    if (pluginKeys(source).indexOf(key) === -1) {
      out.push({ file, param: key, kind: 'honoured-unread', detail: 'HONOURED に入っていますが、プラグイン側が読んでいません' })
    }
  })
  if (file === 'Text2Frame.js') {
    const inCode = honouredInCode(source)
    honoured.concat(inCode).forEach(function (key) {
      if (honoured.indexOf(key) === -1 || inCode.indexOf(key) === -1) {
        out.push({ file, param: key, kind: 'honoured-mismatch', detail: 'HONOURED の一覧と読み口(PROJECT_FIELDS)が食い違っています' })
      }
    })
  }
  return out
}

const FILES = ['Text2Frame.js', 'Frame2Text.js']

/** 全部の食い違い。accepted が付いているものは「そうしておくと決めたもの」。 */
const findings = function () {
  return FILES.reduce(function (all, file) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    return all.concat(checkFile(file)).concat(unsortedKeys(file, source))
  }, [])
}

/** 知らせるべきもの(理由つきで受け入れていないもの)だけ。 */
const unexpected = function () {
  return findings().filter(function (f) { return !f.accepted })
}

module.exports = { findings, unexpected, checkSource, declaredBooleans, readerOf, unwrap, FILES, ACCEPTED, HONOURED, ACCEPTED_DIVERGENCE, pluginKeys, honouredInCode, unsortedKeys }

if (require.main === module) {
  const all = findings()
  all.forEach(function (f) {
    const mark = f.accepted ? '  ' : '!!'
    console.log(mark + ' ' + f.file + (f.line ? ':' + f.line : '') + ' ' + f.param + ' — ' + f.detail)
    if (f.accepted) console.log('     承知のうえ: ' + f.accepted)
  })
  const bad = all.filter(function (f) { return !f.accepted })
  if (bad.length) {
    console.error('\n知らない食い違いが ' + bad.length + ' 件あります。直すか、理由を添えて ACCEPTED に入れてください。')
    process.exit(1)
  }
  console.log('\n知らない食い違いはありません (承知のうえ ' + all.length + ' 件)')
}
