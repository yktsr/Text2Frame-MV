import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'

/* 配るバンドルからは CLI の部分を落とす。目印は Text2Frame.js の `// developer mode`。
 * 目印が見つからないまま黙って通すと、CLI ごと配ってしまうので、そのときは失敗させる。 */
function removeDeveloperMode () {
  return {
    name: 'remove-developer-mode',
    transform (code, id) {
      if (!id.endsWith('Text2Frame.js')) return code
      const startIndex = code.indexOf('// developer mode')
      if (startIndex === -1) {
        this.error('Text2Frame.js に `// developer mode` の目印が見つかりません(CLI 部分を落とせません)。')
      }
      return code.substring(0, startIndex)
    }
  }
}

export default {
  input: './Text2Frame.js',
  output: [
    {
      file: 'dist/Text2Frame.es.mjs',
      format: 'es'
    },
    {
      file: 'dist/Text2Frame.cjs.js',
      format: 'cjs'
    },
    {
      file: 'dist/Text2Frame.umd.js',
      format: 'umd',
      name: 'Text2Frame'
    }
  ],
  plugins: [
    removeDeveloperMode(),
    resolve(),
    commonjs({ transformMixedEsModules: true })
  ]
}
