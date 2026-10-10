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

const FILES = ['Text2Frame.js', 'Frame2Text.js']

/** 全部の食い違い。accepted が付いているものは「そうしておくと決めたもの」。 */
const findings = function () {
  return FILES.reduce(function (all, file) { return all.concat(checkFile(file)) }, [])
}

/** 知らせるべきもの(理由つきで受け入れていないもの)だけ。 */
const unexpected = function () {
  return findings().filter(function (f) { return !f.accepted })
}

module.exports = { findings, unexpected, checkSource, declaredBooleans, readerOf, unwrap, FILES, ACCEPTED }

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
