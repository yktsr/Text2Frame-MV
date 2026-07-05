import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'

function removeDeveloperMode() {
  return {
    name: 'remove-developer-mode',
    transform(code, id) {
      if (id.endsWith('Text2Frame.js')) {
        const startIndex = code.indexOf('// developer mode')
        if (startIndex !== -1) {
          return code.substring(0, startIndex)
        }
      }
      return code
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
