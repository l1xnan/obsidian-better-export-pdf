import { defineConfig } from "vite";
import builtins from "builtin-modules";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
const outDir = "";

export default defineConfig(({ mode }) => ({
  plugins: [
    svelte({
      css: "injected",
      emitCss: false,
    }),
    writeObsidianAssets(),
  ],

  build: {
    outDir,
    target: "es2020",
    emptyOutDir: false,
    minify: mode === "development" ? false : "oxc",
    sourcemap: mode === "development" ? "inline" : false,
    lib: {
      entry: "src/main.ts",
      formats: ["cjs"],
      fileName: () => "main.js",
    },

    rolldownOptions: {
      external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/closebrackets",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/comment",
        "@codemirror/fold",
        "@codemirror/gutter",
        "@codemirror/highlight",
        "@codemirror/history",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/matchbrackets",
        "@codemirror/panel",
        "@codemirror/rangeset",
        "@codemirror/rectangular-selection",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/stream-parser",
        "@codemirror/text",
        "@codemirror/tooltip",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins,
      ],
      watch: {
        include: "src/**",
        // 忽略监听这些打包生成的文件，防止二次触发打包
        exclude: [
          "main.js",
          "styles.css",
          "manifest.json", // 如果你用脚本动态生成 manifest 也可以加上
          "node_modules/**",
        ],
      },
    },
  },
}));

function writeObsidianAssets() {
  return {
    name: "writeObsidianAssets",
    apply: "build",
    async generateBundle() {
      const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json")));

      const manifest = {
        ...pkg.obsidian,
        // version: pkg.version,
      };
      manifest.version = pkg.version;
      this.emitFile({ type: "asset", fileName: ".hotReload", source: "" });
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifest, null, "  ") + "\n",
      });
    },
  };
}
