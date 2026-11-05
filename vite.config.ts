import { defineConfig } from 'vitest/config'

// GitHub Pages serves project sites under /<repo>/; local dev stays at /.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/math_games/' : '/',
  test: {
    // Agent worktrees live under .claude/; their copies of the tests are not ours.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
})
