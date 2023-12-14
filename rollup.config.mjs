import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "./Text2Frame.js",
  output: {
    file: "./Text2Frame.mjs",
    format: "esm",
    sourcemap: true,
  },
  plugins: [
    {
      name: "replace-require-main",
      transform(code, _id) {
        return {
          // `require.main` を `undefined` に置換する
          code: code.replace(/require\.main/g, "undefined"),
          map: null,
        };
      },
    },
    resolve(),
    commonjs({ transformMixedEsModules: true, }),
  ],
};
