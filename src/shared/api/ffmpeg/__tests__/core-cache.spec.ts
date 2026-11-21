import { describe, expect, it } from 'vitest'

import { isCoreUrl } from '../core-cache.ts'

describe('isCoreUrl', () => {
  it.each([
    'https://example.github.io/audio-splitter/assets/ffmpeg-core-CI9Irx9p.js',
    'https://example.github.io/audio-splitter/assets/ffmpeg-core-CgUfceKH.wasm',
    'http://localhost:4173/assets/ffmpeg-core-a_B-9z.wasm?v=1',
  ])('matches the built core file %s', (url) => {
    expect(isCoreUrl(url)).toBe(true)
  })

  it.each([
    // The dev server's unhashed names: the service worker never runs there.
    'http://localhost:5173/node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js',
    'https://example.github.io/audio-splitter/assets/index-sTNSkl27.js',
    'https://example.github.io/audio-splitter/assets/worker-BzJKLsK6.js',
    'https://example.github.io/audio-splitter/assets/ffmpeg-core-CI9Irx9p.js.map',
    'https://example.github.io/audio-splitter/assets/my-ffmpeg-core-CI9Irx9p.js',
    'https://example.github.io/audio-splitter/assets/ffmpeg-core-CI9Irx9p.css',
    'https://example.github.io/audio-splitter/',
    'https://example.github.io/audio-splitter/sw.js',
  ])('does not match %s', (url) => {
    expect(isCoreUrl(url)).toBe(false)
  })
})
