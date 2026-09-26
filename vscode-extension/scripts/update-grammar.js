// 構文の色付け(syntaxes/text2frame.tmLanguage.json)のタグ名の一覧を、コンパイラ(Text2Frame.js)が
// 受け付けるタグ名から作り直す。一覧だけを差し替え、ほかの規則には触らない。
//
//   node scripts/update-grammar.js          書き換える
//   node scripts/update-grammar.js --check  ずれていれば終了コード 1(書き換えない)
//
// タグ名はコンパイラのソースから読み取る。拾った名前が本当にタグとして受け付けられるかは
// test/test_grammar.js がコンパイラに通して確かめる。
const fs = require('fs')
const path = require('path')

const extDir = path.resolve(__dirname, '..')
const COMPILER = path.resolve(extDir, '..', 'Text2Frame.js')
const GRAMMAR = path.join(extDir, 'syntaxes', 'text2frame.tmLanguage.json')

// 文章の表示に付く設定のタグ。色を分けている(それ以外はイベントコマンドのタグ)。
const MESSAGE_VARS = ['face', 'window_position', 'background', 'namebox']

// 正規表現リテラルの「<名前」「</名前」「|<名前」「/^\s*<名前」から名前を拾う。
const TAG_IN_REGEX = /(?:\/|\|)(?:\^)?(?:\\s\*)?<(?:\\\/)?([^\s\\:*>()?|/[]+)/g

function functionBody (source, head) {
  const start = source.indexOf(head)
  if (start < 0) throw new Error('Text2Frame.js に見つかりません: ' + head)
  // 関数の閉じ括弧(4字下げの「}」だけの行)まで。
  const end = source.indexOf('\n    }\n', start)
  return source.slice(start, end)
}

function codeLines (text) {
  return text.split('\n').filter((line) => !/^\s*(\*|\/\/)/.test(line))
}

function listItems (text) {
  return text.match(/'[^']*'/g).map((s) => s.slice(1, -1).replace(/\\\\/g, ''))
}

/** コンパイラが受け付けるタグ名。message / event / block(script・comment・scrolling)に分ける。 */
function compilerTagNames (source) {
  const events = functionBody(source, 'const _getEvents = function')
  const message = []
  const event = []
  let owner = ''
  for (const line of codeLines(events)) {
    const decl = line.match(/^\s*const (\w+) =/)
    if (decl) owner = decl[1]
    for (const m of line.matchAll(TAG_IN_REGEX)) (MESSAGE_VARS.includes(owner) ? message : event).push(m[1])
  }
  // スイッチ・変数の操作は別名の配列から正規表現を組み立てている。「<${x}」で使う配列だけを拾う
  // (同じ形の配列でも、ゲームデータの gd などはタグではなく値の書き方)。
  for (const m of events.matchAll(/const (\w+)_operation_list = \[([^\]]*)\]/g)) {
    if (new RegExp(m[1] + '_operation_list\\.map\\(\\s*\\(x\\) => `<\\$\\{x\\}').test(events)) event.push(...listItems(m[2]))
  }
  for (const m of events.matchAll(/\[((?:'[^']*',?\s*)+)\]\.map\(\(x\) => `<\$\{x\}/g)) event.push(...listItems(m[1]))

  // 複数行のブロック(<script>…</script> など)は、行ごとの解釈の前に別の関数で畳まれる。
  const blocks = functionBody(source, 'const getBlockStatement = function')
  const block = {}
  let kind = ''
  for (const line of codeLines(blocks)) {
    const c = line.match(/case '(\w+)':/)
    if (c) kind = c[1]
    if (kind) for (const m of line.matchAll(TAG_IN_REGEX)) (block[kind] = block[kind] || []).push(m[1])
  }
  for (const k of ['script', 'comment', 'scrolling']) {
    if (!block[k] || !block[k].length) throw new Error('ブロックのタグ名が読み取れません: ' + k)
  }
  return { message: unique(message), event: unique(event), block: mapValues(block, unique) }
}

function mapValues (obj, fn) {
  const out = {}
  for (const k of Object.keys(obj)) out[k] = fn(obj[k])
  return out
}

/* 大小文字を区別せずに重複を除く。綴りは最初に出てきたものを使う。 */
function unique (names) {
  const seen = new Set()
  return names.filter((n) => {
    const k = n.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/* 正規表現の選択肢にする。長い名前を先に並べる(If より IfWin を先に試す)。 */
function alternation (names) {
  const sorted = names.slice().sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0))
  return '(?i:' + sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|') + ')'
}

/** 文法の JSON(オブジェクト)に、タグ名の一覧を差し込んだものを返す。 */
function applyNames (grammar, names) {
  const g = JSON.parse(JSON.stringify(grammar))
  const rule = (list, name) => {
    const r = list.find((p) => p.name === name)
    if (!r) throw new Error('文法に規則が見つかりません: ' + name)
    return r
  }
  const tags = g.repository.tags.patterns
  const comment = alternation(names.block.comment)
  const blockComment = rule(g.repository['block-comments'].patterns, 'comment.block.text2frame')
  blockComment.begin = '<' + comment + '>'
  blockComment.end = '</' + comment + '>'
  rule(tags, 'meta.tag.text2frame').match = '<(' + alternation(names.message) + ')\\s*:\\s*([^>]*)>'
  // <script> と <ShowScrollingText> の開きタグは引数を取ることがあるので、イベントのタグと同じに塗る。
  const event = unique(names.event.concat(names.block.script, names.block.scrolling))
  rule(tags, 'meta.tag.event.text2frame').match = '<(' + alternation(event) + ')(?:\\s*:\\s*([^>]*))?>'
  const closing = unique(names.block.script.concat(names.block.comment, names.block.scrolling))
  rule(tags, 'meta.tag.closing.text2frame').match = '</' + alternation(closing) + '>'
  return g
}

function render (grammar) {
  return JSON.stringify(grammar, null, 2) + '\n'
}

function main () {
  const names = compilerTagNames(fs.readFileSync(COMPILER, 'utf8'))
  const current = fs.readFileSync(GRAMMAR, 'utf8')
  const next = render(applyNames(JSON.parse(current), names))
  if (process.argv.includes('--check')) {
    if (next !== current) {
      console.error('[update-grammar] タグ名の一覧がコンパイラとずれています。npm run update-grammar で作り直してください。')
      process.exit(1)
    }
    return
  }
  fs.writeFileSync(GRAMMAR, next)
  const count = names.message.length + names.event.length + Object.values(names.block).reduce((n, l) => n + l.length, 0)
  console.log('[update-grammar] ' + count + ' 個のタグ名で ' + path.relative(extDir, GRAMMAR) + ' を更新しました')
}

module.exports = { compilerTagNames, applyNames, render, COMPILER, GRAMMAR }

if (require.main === module) main()
