import { defineConfig } from "vite";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

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
      fileName: (format) => `Text2Frame.${format}.js`,
    },
    rollupOptions: {
      plugins: [resolve(), commonjs({ transformMixedEsModules: true })],
    },
  },
});
