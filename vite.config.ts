import { statSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

const ffmpegWasmPath = fileURLToPath(import.meta.resolve('@ffmpeg/core/wasm'))
const ffmpegWasmBytes = statSync(ffmpegWasmPath).size

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
  /*
  Download progress is a fraction of the wasm's unpacked size; the stream counts unpacked bytes
  whatever the server compresses.
  */
  define: {
    __FFMPEG_WASM_BYTES__: ffmpegWasmBytes,
  },
  // Pre-bundling has broken ffmpeg.wasm's worker before; upstream's own Vite example excludes it.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
})

export default config
