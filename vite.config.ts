import { statSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { build, defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

const ffmpegWasmPath = fileURLToPath(import.meta.resolve('@ffmpeg/core/wasm'))
const ffmpegWasmBytes = statSync(ffmpegWasmPath).size

const srcPath = fileURLToPath(new URL('src', import.meta.url))
const serviceWorkerEntry = fileURLToPath(new URL('src/app/sw.worker.ts', import.meta.url))

/*
Builds the service worker on its own, after the app, to a self-contained `sw.js` at the build's
root. As a second input of the app's build, Rollup would split code the two share into a chunk the
worker must import, and a classic worker cannot; the name stays unhashed so that its address (and
so its scope) never changes.
*/
function coreServiceWorker(): Plugin {
  let outputDirectory = 'dist'
  return {
    name: 'core-service-worker',
    apply: 'build',
    configResolved(resolved) {
      outputDirectory = resolved.build.outDir
    },
    async closeBundle() {
      const library = {
        entry: serviceWorkerEntry,
        formats: ['iife' as const],
        name: 'coreServiceWorker',
        fileName: () => 'sw.js',
      }
      await build({
        configFile: false,
        publicDir: false,
        resolve: { alias: { '@': srcPath } },
        build: { outDir: outputDirectory, emptyOutDir: false, lib: library },
      })
    },
  }
}

// https://vite.dev/config/
const config = defineConfig({
  // Relative URLs, so the build works from any folder (GitHub Pages serves it from /<repo>/).
  base: './',
  plugins: [vue(), tailwindcss(), vueDevTools(), coreServiceWorker()],
  resolve: {
    alias: {
      '@': srcPath,
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
