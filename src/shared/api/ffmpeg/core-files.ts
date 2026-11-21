/*
The pinned ffmpeg core's two files: the script and the wasm. `?url` makes Vite copy them into the
build under hashed names and serve them from the app's own origin. Defined once, so the files the
preloader downloads and keeps are the ones `load()` asks for next. Not in core-cache.ts: the
service worker reads that module, and has no use for the files themselves.
*/
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

export const CORE_FILES = { coreURL, wasmURL }
