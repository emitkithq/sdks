import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: [],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.js' : '.mjs',
      dts: format === 'cjs' ? '.d.ts' : '.d.mts'
    };
  }
});
