import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
const config = defineConfig({
  // Relative URLs, so the build works from any folder (GitHub Pages serves it from /<repo>/).
  base: './',
  plugins: [vue(), tailwindcss(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  // Pre-bundling has broken ffmpeg.wasm's worker before; upstream's own Vite example excludes it.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
})

export default config
