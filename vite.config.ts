import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoBase = process.env.GITHUB_PAGES === 'true' ? '/hongkong-four-trails/' : '/'

export default defineConfig({
  base: repoBase,
  plugins: [react()],
  server: {
    host: true,
  },
  assetsInclude: ['**/*.gpx'],
})

