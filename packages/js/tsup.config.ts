import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  clean: true,
  define: { __VERSION__: JSON.stringify(version) },
  dts: true,
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  outExtension: ({ format }) => ({
    dts: format === "cjs" ? ".d.ts" : ".d.mts",
    js: format === "cjs" ? ".js" : ".mjs",
  }),
  sourcemap: true,
  target: "es2022",
});
