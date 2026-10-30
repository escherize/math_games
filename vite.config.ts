import { defineConfig } from 'vite'

// GitHub Pages serves project sites under /<repo>/; local dev stays at /.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/math_games/' : '/',
})
