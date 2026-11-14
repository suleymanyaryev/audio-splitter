import { FFFSType, FFmpeg } from '@ffmpeg/ffmpeg'
// `?url` makes Vite copy the pinned core into the build and serve it from the app's own origin.
// Both URLs must be passed: without them the wrapper downloads an older core from a CDN.
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

interface FfmpegRun {
  exitCode: number
  // ffmpeg's text output, one line per entry. Probing reads the file's details from it.
  log: string[]
}

/*
One loaded ffmpeg.wasm worker with one source file mounted in it. ffmpeg.wasm already runs in its
own Web Worker, so the page stays responsive while a command runs.
*/
export interface FfmpegSession {
  // Where ffmpeg sees the source file. The mount is read-only, so outputs go elsewhere.
  readonly inputPath: string
  run(command: string[], timeoutMs: number): Promise<FfmpegRun>
  // Hands an output file to the page and deletes it inside ffmpeg, so only one copy stays.
  takeFile(path: string): Promise<Uint8Array>
  close(): void
}

const INPUT_DIRECTORY = '/in'

// A fixed name keeps odd characters in the user's file name out of ffmpeg's command line; the
// real extension stays, because ffmpeg uses it as a hint.
function inputName(file: File): string {
  const extension = /\.([a-z\d]+)$/i.exec(file.name)?.[1]
  return extension ? `source.${extension.toLowerCase()}` : 'source'
}

// Loading fetches and compiles the 32 MB core; file calls (mount, read, delete) take milliseconds.
const LOAD_TIMEOUT_MS = 60_000
const FILE_TIMEOUT_MS = 10_000

/*
A call into ffmpeg's worker can hang without ever answering, so every call races a watchdog.
Terminating is the only thing that really stops the worker. The watchdog rejects before it
terminates, because terminating rejects the pending call with a less useful message of its own.
*/
async function watched<T>(
  ffmpeg: FFmpeg,
  call: Promise<T>,
  timeoutMs: number,
  what: string,
): Promise<T> {
  let watchdog: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<never>((_, reject) => {
    watchdog = setTimeout(() => {
      reject(new Error(`ffmpeg did not finish ${what} within ${timeoutMs / 1000} s`))
      ffmpeg.terminate()
    }, timeoutMs)
  })
  try {
    return await Promise.race([call, timedOut])
  } finally {
    clearTimeout(watchdog)
  }
}

/*
Loads the core and mounts the file with WORKERFS, which reads only the bytes ffmpeg asks for
instead of copying the whole file into memory.
*/
export async function openFfmpeg(file: File): Promise<FfmpegSession> {
  const ffmpeg = new FFmpeg()
  let log: string[] = []
  ffmpeg.on('log', ({ message }) => {
    // The wasm runtime prints this after ffmpeg exits with an error; it would hide ffmpeg's own
    // last line, which is the useful reason.
    if (message !== 'Aborted()') log.push(message)
  })

  const name = inputName(file)
  await watched(ffmpeg, ffmpeg.load({ coreURL, wasmURL }), LOAD_TIMEOUT_MS, 'loading')
  await watched(ffmpeg, ffmpeg.createDir(INPUT_DIRECTORY), FILE_TIMEOUT_MS, 'creating /in')
  await watched(
    ffmpeg,
    ffmpeg.mount(FFFSType.WORKERFS, { blobs: [{ name, data: file }] }, INPUT_DIRECTORY),
    FILE_TIMEOUT_MS,
    'mounting the file',
  )

  return {
    inputPath: `${INPUT_DIRECTORY}/${name}`,

    async run(command, timeoutMs) {
      log = []
      const exitCode = await watched(ffmpeg, ffmpeg.exec(command), timeoutMs, 'the command')
      return { exitCode, log }
    },

    async takeFile(path) {
      const data = await watched(ffmpeg, ffmpeg.readFile(path), FILE_TIMEOUT_MS, `reading ${path}`)
      await watched(ffmpeg, ffmpeg.deleteFile(path), FILE_TIMEOUT_MS, `deleting ${path}`)
      if (typeof data === 'string') throw new TypeError(`${path} came back as text`)
      return data
    },

    close() {
      ffmpeg.terminate()
    },
  }
}
