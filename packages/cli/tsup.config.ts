import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const read = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as { version: string };

export default defineConfig({
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  define: {
    // The SDK is bundled in: its version, and the CLI's.
    __VERSION__: JSON.stringify(read("../js/package.json").version),
    __CLI_VERSION__: JSON.stringify(read("package.json").version),
  },
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  noExternal: ["@emitkit/js"],
  platform: "node",
  target: "node20",
});
