import { defineConfig } from 'vitest/config'

// GitHub Pages serves project sites under /<repo>/; local dev stays at /.
// MG_LIB=1 builds the library (src/lib.ts -> dist-lib/mathgames.js) instead
// of the site: one ES module, cartridges and their styles inside, unminified
// so a host that vendors it gets readable diffs.
const lib = !!process.env.MG_LIB

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/math_games/' : '/',
  define: {
    __MG_VERSION__: JSON.stringify(process.env.MG_VERSION ?? 'dev'),
  },
  build: lib
    ? {
        lib: { entry: 'src/lib.ts', formats: ['es'], fileName: () => 'mathgames.js' },
        outDir: 'dist-lib',
        emptyOutDir: true,
        copyPublicDir: false,
        minify: false,
        sourcemap: true,
      }
    : undefined,
  test: {
    // Agent worktrees live under .claude/; their copies of the tests are not ours.
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-lib/**', '.claude/**'],
  },
})
