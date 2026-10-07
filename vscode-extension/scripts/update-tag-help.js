// タグの説明(ホバー)を、Text2Frame.js のヘルプ(@help)から作り直す。ヘルプ自体は読むだけで書き換えない。
//
//   node scripts/update-tag-help.js          src/tagHelpData.ts を書き換える
//   node scripts/update-tag-help.js --check  ずれていれば終了コード 1(書き換えない)
//
// ヘルプは各コマンドを「○ (1) 選択肢の表示」のような見出しで説明している。見出しごとに区切り、
// 見出しの名前がタグの日本語名と同じならそのタグの、そうでなければ本文で最初に出てくるタグの説明とする。
// コンパイラが同じ命令として受け付ける別名(ShowChoices / 選択肢の表示 / SHC など)すべてに、同じ説明を付ける。
// 自分の見出しを持たないタグ(When・Else など)は、最初に出てくる見出しの説明を付ける。
// 見出しと本文が食い違っている箇所は知らせるだけで、その見出しの説明は付けない。
const fs = require('fs')
const path = require('path')

const extDir = path.resolve(__dirname, '..')
const COMPILER = path.resolve(extDir, '..', 'Text2Frame.js')
// 配布物(.vsix)には src/ が入らないので、JSON ではなく TypeScript として出して out/ にコンパイルさせる。
const OUT = path.join(extDir, 'src', 'tagHelpData.ts')

// 自分の見出しを持たず、最初に出てくる見出し(選択肢の表示)より条件分岐の説明が合うもの。
const PREFER_SECTION = { conditional_branch_end: '条件分岐', conditional_branch_else: '条件分岐' }

function functionBody (source, head) {
  const start = source.indexOf(head)
  if (start < 0) throw new Error('Text2Frame.js に見つかりません: ' + head)
  return source.slice(start, source.indexOf('\n    }\n', start))
}

/** コンパイラが同じ命令として受け付けるタグ名のまとまり(命令ごと)。 */
function aliasGroups (source) {
  const groups = new Map() // 命令 → 名前(小文字)の集合
  const add = (owner, name) => {
    if (!groups.has(owner)) groups.set(owner, new Set())
    groups.get(owner).add(name.toLowerCase())
  }
  const TAG = /(?:\/|\|)(?:\^)?(?:\\s\*)?<(?:\\\/)?([^\s\\:*>()?|/[]+)/g
  const code = (text) => text.split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l))

  const events = functionBody(source, 'const _getEvents = function')
  let owner = ''
  for (const line of code(events)) {
    const d = line.match(/^\s*const (\w+) =/)
    if (d) owner = d[1]
    for (const m of line.matchAll(TAG)) add(owner, m[1])
  }
  const items = (s) => s.match(/'[^']*'/g).map((x) => x.slice(1, -1).replace(/\\\\/g, ''))
  for (const m of events.matchAll(/const (\w+)_operation_list = \[([^\]]*)\]/g)) {
    if (new RegExp(m[1] + '_operation_list\\.map\\(\\s*\\(x\\) => `<\\$\\{x\\}').test(events)) items(m[2]).forEach((n) => add(m[1] + '_list', n))
  }
  for (const m of events.matchAll(/\[((?:'[^']*',?\s*)+)\]\.map\(\(x\) => `<\$\{x\}/g)) items(m[1]).forEach((n) => add('timer_list', n))

  const blocks = functionBody(source, 'const getBlockStatement = function')
  let kind = ''
  for (const line of code(blocks)) {
    const c = line.match(/case '(\w+)':/)
    if (c) kind = c[1]
    if (kind) for (const m of line.matchAll(TAG)) add('block_' + kind, m[1])
  }
  return groups
}

/** @help の本文(行頭の " * " を落としたもの)。 */
function helpLines (source) {
  const start = source.indexOf(' * @help')
  const end = source.indexOf('\n */', start)
  if (start < 0 || end < 0) throw new Error('Text2Frame.js に @help が見つかりません')
  return source.slice(start, end).split('\n').slice(1).map((l) => l.replace(/^ \*( |$)/, ''))
}

const HEADING = /^(\s*)○ (.+?)\s*$/
const BREAK = /^\s*(?:-{10,}|◆)/

/** ○ 見出しごとの説明。見出しと同じか浅い字下げの次の見出し、区切り線、◆ の手前まで。 */
function sections (lines) {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(HEADING)
    if (!h) continue
    const indent = h[1].length
    let j = i + 1
    for (; j < lines.length; j++) {
      const next = lines[j].match(HEADING)
      if ((next && next[1].length <= indent) || BREAK.test(lines[j])) break
    }
    const body = lines.slice(i + 1, j)
    while (body.length && !body[body.length - 1].trim()) body.pop()
    // 字下げは見出しの深さぶんを揃えて落とす。
    const cut = Math.min(...body.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length))
    out.push({ title: h[2], body: body.map((l) => l.slice(Math.min(cut, l.length - l.trimStart().length))).join('\n') })
  }
  return out
}

/**
 * 「(40) 移動ルートの設定」の中の移動コマンド(<MoveDown> や <Jump: x, y> など)ごとの説明。
 * 移動コマンドは (40) の中の一覧と小見出しで説明されているので、(40) 全体ではなく、
 * 冒頭の書き方(<SetMovementRoute> のあとに移動コマンドを並べる)と、その命令の部分だけを切り出す。
 *   ・引数無しの移動コマンド: 一覧の1行(<MoveDown>   <下に移動>)
 *   ・引数ありの移動コマンド: 「* ジャンプ」のような小見出しから次の小見出しまで
 */
function moveCommandSections (section) {
  const lines = section.body.split('\n')
  // 冒頭の書き方: 最初の --- で囲まれた部分まで(その前の1行を含む)。
  const fences = lines.map((l, i) => (/^\s*---\s*$/.test(l) ? i : -1)).filter((i) => i >= 0)
  if (fences.length < 2) return []
  const intro = lines.slice(0, fences[1] + 1).join('\n')
  const out = []
  const noArgs = lines.findIndex((l) => /^\s*・引数無しの移動コマンド/.test(l))
  const withArgs = lines.findIndex((l) => /^\s*・引数ありの移動コマンド/.test(l))
  if (noArgs >= 0) {
    const end = withArgs > noArgs ? withArgs : lines.length
    for (const row of lines.slice(noArgs + 1, end)) {
      if (/^\s*<[^>]+>\s+<[^>]+>\s*$/.test(row)) {
        out.push({ title: section.title + ' ・引数無しの移動コマンド', body: intro + '\n\n' + row.trim(), own: row })
      }
    }
  }
  if (withArgs >= 0) {
    const bullets = []
    lines.forEach((l, i) => { if (i > withArgs && /^\s*\* \S/.test(l)) bullets.push(i) })
    bullets.forEach((b, n) => {
      const body = lines.slice(b + 1, n + 1 < bullets.length ? bullets[n + 1] : lines.length)
      while (body.length && !body[body.length - 1].trim()) body.pop()
      const cut = Math.min(...body.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length))
      const text = body.map((l) => l.slice(Math.min(cut, l.length - l.trimStart().length))).join('\n')
      out.push({ title: section.title + ' ・' + lines[b].replace(/^\s*\* /, '').trim(), body: intro + '\n\n' + text, own: text })
    })
  }
  return out
}

/** ヘルプから、タグ名(小文字)→ 説明 の対応を作る。 */
function buildTagHelp (source) {
  const groups = aliasGroups(source)
  const ownerOf = new Map()
  for (const [owner, names] of groups) for (const n of names) if (!ownerOf.has(n)) ownerOf.set(n, owner)
  const list = sections(helpLines(source))
  const tagsIn = (text) => Array.from(text.matchAll(/<\/?\s*([^\s:>/<]+)/g), (m) => m[1].toLowerCase()).filter((n) => ownerOf.has(n))

  const sectionOf = new Map() // 命令 → 見出しの番号
  const claimed = new Set() // 主なタグが決まった見出し
  const mismatches = [] // 見出しの名前と本文が合っていない見出し(ヘルプの食い違い)
  // 1. 見出しの名前が命令の名前(日本語名)と同じなら、その命令の見出し。
  //    ただし本文にその命令のタグが出てこなければ付けない(見出しと本文が食い違っている)。
  list.forEach((s, k) => {
    const title = s.title.replace(/^\([\d-]+\)\s*/, '').toLowerCase()
    const owner = ownerOf.get(title)
    if (!owner || sectionOf.has(owner)) return
    if (tagsIn(s.body).some((n) => ownerOf.get(n) === owner)) {
      sectionOf.set(owner, k)
      claimed.add(k)
    } else {
      mismatches.push(`「${s.title}」の本文に <${title}> の書き方がありません`)
      claimed.add(k)
    }
  })
  // 2. それ以外の見出しは、本文で最初に出てくるタグの命令
  list.forEach((s, k) => {
    if (claimed.has(k)) return
    const first = tagsIn(s.body)[0]
    if (first && !sectionOf.has(ownerOf.get(first))) sectionOf.set(ownerOf.get(first), k)
  })
  // 3. 自分の見出しを持たない命令は、最初に出てくる見出し(指定があればそちら)
  for (const [owner, title] of Object.entries(PREFER_SECTION)) {
    const k = list.findIndex((s) => s.title.includes(title))
    if (k >= 0 && groups.has(owner) && !sectionOf.has(owner)) sectionOf.set(owner, k)
  }
  // 4. 移動コマンドは「(40) 移動ルートの設定」の中の、その命令の部分(移動ルートの設定そのものは (40) 全体)
  const route = list.findIndex((s) => s.title.includes('移動ルートの設定'))
  if (route >= 0) {
    const routeOwner = [...sectionOf].find(([, k]) => k === route)
    for (const part of moveCommandSections(list[route])) {
      const own = tagsIn(part.own).map((n) => ownerOf.get(n))
      const fresh = own.filter((o) => o && (!routeOwner || o !== routeOwner[0]) && (!sectionOf.has(o) || sectionOf.get(o) === route))
      if (!fresh.length) continue
      list.push({ title: part.title, body: part.body })
      for (const o of fresh) sectionOf.set(o, list.length - 1)
    }
  }
  list.forEach((s, k) => {
    for (const n of tagsIn(s.body)) if (!sectionOf.has(ownerOf.get(n))) sectionOf.set(ownerOf.get(n), k)
  })

  const tags = {}
  for (const [owner, names] of groups) {
    if (!sectionOf.has(owner)) continue
    for (const n of names) if (!(n in tags)) tags[n] = sectionOf.get(owner)
  }
  const sorted = {}
  for (const n of Object.keys(tags).sort()) sorted[n] = tags[n]
  return { sections: list, tags: sorted, mismatches }
}

function render (data) {
  return [
    '// 生成したファイル。手で書き換えず、npm run update-tag-help で作り直す(元は Text2Frame.js の @help)。',
    '/* eslint-disable */',
    'export interface TagHelpSection {',
    '    title: string;',
    '    body: string;',
    '}',
    '',
    '/** ヘルプの見出しごとの説明。 */',
    'export const TAG_HELP_SECTIONS: TagHelpSection[] = ' + JSON.stringify(data.sections, null, 1) + ';',
    '',
    '/** タグ名(小文字)→ TAG_HELP_SECTIONS の番号。 */',
    'export const TAG_HELP_INDEX: { [name: string]: number } = ' + JSON.stringify(data.tags, null, 1) + ';',
    ''
  ].join('\n')
}

function main () {
  const built = buildTagHelp(fs.readFileSync(COMPILER, 'utf8'))
  // ヘルプの食い違いは知らせるだけ(ヘルプは書き換えない)。その見出しの説明は付けない。
  for (const m of built.mismatches) console.warn('[update-tag-help] ヘルプの食い違い: ' + m)
  const next = render(built)
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''
  if (process.argv.includes('--check')) {
    if (next !== current) {
      console.error('[update-tag-help] タグの説明が Text2Frame.js のヘルプとずれています。npm run update-tag-help で作り直してください。')
      process.exit(1)
    }
    return
  }
  fs.writeFileSync(OUT, next)
  console.log(`[update-tag-help] ${built.sections.length} 個の見出し・${Object.keys(built.tags).length} 個のタグ名で ${path.relative(extDir, OUT)} を更新しました`)
}

module.exports = { buildTagHelp, render, aliasGroups, COMPILER, OUT }

if (require.main === module) main()
