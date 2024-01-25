import { defineConfig } from "vite";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

function removeDeveloperMode() {
  return {
    name: 'remove-developer-mode',
    transform(code, id) {
      if (id.endsWith('Text2Frame.js')) {
        const startIndex = code.indexOf('// developer mode');
        if (startIndex !== -1) {
          return code.substring(0, startIndex);
        }
      }
      return code;
    }
  };
}

export default defineConfig({
  build: {
    outDir: ".",
    lib: {
      entry: "./Text2Frame.js",
      name: "Text2Frame",
      formats: [
        "es", // ESM
        "cjs", // CommonJS
        "umd", // ブラウザ向け
      ],
      fileName: (format) => {
        if (format === 'es') {
          return `Text2Frame.${format}.mjs`;
        } else {
          return `Text2Frame.${format}.js`;
        }
      }
    },
    rollupOptions: {
      plugins: [removeDeveloperMode(), resolve(), commonjs({ transformMixedEsModules: true })],
    },
    minify: false
  },
});

