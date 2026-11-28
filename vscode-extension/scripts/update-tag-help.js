// タグの説明(ホバー)を、Text2Frame.js のヘルプ(@help)から作り直す。ヘルプ自体は読むだけで書き換えない。
//
//   node scripts/update-tag-help.js          src/tagHelpData.ts を書き換える
//   node scripts/update-tag-help.js --check  ずれていれば終了コード 1(書き換えない)
//
// ヘルプの読み解きは ../../t2f-help.js に置いてある(MCP サーバも同じ解析を使うため。
// package.json の files に tools/ は入らないので、npm 経由でも届く場所に出した)。
// ここに残っているのは、その結果を src/tagHelpData.ts の形にする所だけ。
const fs = require('fs')
const path = require('path')
const { buildTagHelp, aliasGroups, COMPILER } = require('../../t2f-help.js')

const extDir = path.resolve(__dirname, '..')
// 配布物(.vsix)には src/ が入らないので、JSON ではなく TypeScript として出して out/ にコンパイルさせる。
const OUT = path.join(extDir, 'src', 'tagHelpData.ts')

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
