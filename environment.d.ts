/// <reference types="vite/client" />

/*
The unpacked size of the ffmpeg core's wasm in bytes, read from the installed package by
`vite.config.ts`. Download progress is a fraction of it, so 100% means done whatever the
connection compresses.
*/
declare const __FFMPEG_WASM_BYTES__: number
