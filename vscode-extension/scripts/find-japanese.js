// 画面に出る言葉のうち、英語が付いていない日本語を探す。
//   node scripts/find-japanese.js          見つかった所を並べる(無ければ何も出さない)
//   node scripts/find-japanese.js --check  見つかれば終了コード 1
// 英語が付いているとみなすもの:
//   tr('日本語', 'English') の中、trList(...)・table(...) の中、['日本語', 'English'] の組、正規表現の中。
// そのほかで日本語のままにしてよい行には、行末に「// lang: keep」を付ける(書き方の別名など)。
// 英語にしないファイルは KEEP_FILES に理由と並べる。
const fs = require('fs')
const path = require('path')

const JAPANESE = /[ぁ-んァ-ヶ一-龠々ー・]/
const ROOT = path.join(__dirname, '..', 'src')
const KEEP_FILES = {
  'tagHelpData.ts': 'Text2Frame.js のヘルプから作るタグの説明(ヘルプは日本語だけ)',
  'db/tagRefs.ts': 'タグの名前と別名(書き方そのもの)'
}
const COVER = new Set(['tr', 'trList', 'table'])
const KEEP_MARK = /\/\/ lang: keep\b/

/** 画面の HTML のテンプレートの中の、スクリプトや CSS のコメント(画面には出ない)を除く。 */
function withoutComments (text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1')
}

function files (dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name)
    return d.isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []
  })
}

/** 1つのファイルの、英語が付いていない日本語の文字列。{ line, text } の並び。 */
function scan (source) {
  const found = []
  const lines = source.split('\n')
  const keepLine = (n) => KEEP_MARK.test(lines[n - 1] || '')
  const stack = [] // { name, kind: '(' | '[' | '{' | '${', items: [] }
  let i = 0
  let line = 1
  let prev = '' // 直前の意味のある文字(正規表現か割り算かの見分け)
  let word = '' // 直前の名前
  let generic = '' // 型引数の前の名前
  const covered = () => stack.some((g) => g.kind === '(' && COVER.has(g.name))
  const literal = (text, startLine) => {
    const item = { text, line: startLine, covered: covered() || keepLine(startLine) }
    const top = stack[stack.length - 1]
    if (top) top.items.push(item)
    if (JAPANESE.test(text)) found.push(item)
    prev = 'x'
  }
  while (i < source.length) {
    const c = source[i]
    const next = source[i + 1]
    if (c === '\n') { line++; i++; continue }
    if (c === '/' && next === '/') { while (i < source.length && source[i] !== '\n') i++; continue }
    if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      line += source.slice(i, end).split('\n').length - 1
      i = end + 2
      continue
    }
    if (c === '\'' || c === '"') {
      const start = line
      let j = i + 1
      let text = ''
      while (j < source.length && source[j] !== c) { if (source[j] === '\\') { text += source[j] + source[j + 1]; j += 2; continue } text += source[j]; j++ }
      literal(text, start)
      i = j + 1
      continue
    }
    if (c === '`') {
      stack.push({ name: '', kind: '`', items: [], start: line, text: '' })
      i++
      while (i < source.length) {
        const t = source[i]
        if (t === '\\') { stack[stack.length - 1].text += t + source[i + 1]; i += 2; continue }
        if (t === '\n') line++
        if (t === '`') break
        if (t === '$' && source[i + 1] === '{') break
        stack[stack.length - 1].text += t
        i++
      }
      if (source[i] === '`') { const g = stack.pop(); literal(withoutComments(g.text), g.start); i++; continue }
      stack.push({ name: '', kind: '${', items: [] }); i += 2; prev = '('; continue
    }
    if (c === '}' && stack.length && stack[stack.length - 1].kind === '${') {
      stack.pop()
      i++
      // テンプレートの続き
      while (i < source.length) {
        const t = source[i]
        if (t === '\\') { stack[stack.length - 1].text += t + source[i + 1]; i += 2; continue }
        if (t === '\n') line++
        if (t === '`') break
        if (t === '$' && source[i + 1] === '{') break
        stack[stack.length - 1].text += t
        i++
      }
      if (source[i] === '`') { const g = stack.pop(); literal(withoutComments(g.text), g.start); i++; continue }
      stack.push({ name: '', kind: '${', items: [] }); i += 2; prev = '('; continue
    }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev) || /^(return|typeof|case|in|of)$/.test(word))) {
      // 正規表現。中の日本語は書き方の別名なので見ない。
      let j = i + 1
      let inClass = false
      while (j < source.length && (source[j] !== '/' || inClass)) {
        if (source[j] === '\\') { j += 2; continue }
        if (source[j] === '[') inClass = true
        if (source[j] === ']') inClass = false
        j++
      }
      j++
      while (/[a-z]/.test(source[j] || '')) j++
      i = j
      prev = 'x'
      continue
    }
    if (c === '(' || c === '[' || c === '{') { stack.push({ name: c === '(' ? word : '', kind: c, items: [] }); i++; prev = c; word = ''; continue }
    if (c === ')' || c === ']' || c === '}') {
      const g = stack.pop()
      if (g && g.kind === '[' && g.items.length === 2 && JAPANESE.test(g.items[0].text) && !JAPANESE.test(g.items[1].text)) g.items[0].covered = true
      if (g && g.kind === '(' && COVER.has(g.name)) g.items.forEach((it) => { it.covered = true })
      i++
      prev = 'x'
      word = ''
      continue
    }
    if (/[A-Za-z_$0-9]/.test(c)) {
      let j = i
      while (/[A-Za-z_$0-9]/.test(source[j] || '')) j++
      word = source.slice(i, j)
      prev = 'x'
      i = j
      continue
    }
    // 型引数(table<number>(…))では、呼んでいる名前を覚えておく
    if (c === '<' && word) { generic = word; prev = c; i++; continue }
    if (c === '>' && generic) { word = generic; generic = ''; prev = 'x'; i++; continue }
    if (!/\s/.test(c)) { prev = c; word = '' }
    i++
  }
  return found.filter((f) => !f.covered)
}

function report () {
  const out = []
  for (const file of files(ROOT).sort()) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    if (KEEP_FILES[rel]) continue
    for (const f of scan(fs.readFileSync(file, 'utf8'))) out.push({ file: rel, line: f.line, text: f.text })
  }
  return out
}

module.exports = { scan, report, KEEP_FILES }

if (require.main === module) {
  const out = report()
  for (const f of out) console.log(`src/${f.file}:${f.line}  ${f.text.replace(/\n/g, '\\n').slice(0, 120)}`)
  if (process.argv.includes('--check') && out.length) {
    console.error(`${out.length} Japanese strings without English`)
    process.exit(1)
  }
}
