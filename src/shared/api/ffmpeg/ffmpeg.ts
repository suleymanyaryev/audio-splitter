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
One ffmpeg.wasm worker with one source file mounted in it, replaced by a fresh one every so often.
ffmpeg.wasm already runs in its own Web Worker, so the page stays responsive while a command runs.
*/
export interface FfmpegSession {
  // Where ffmpeg sees the source file. The mount is read-only, so outputs go elsewhere.
  readonly inputPath: string
  run(command: string[], timeoutMs: number): Promise<FfmpegRun>
  // Hands an output file to the page and deletes it inside ffmpeg, so only one copy stays.
  takeFile(path: string): Promise<Uint8Array>
  /*
  Stops the command that is running: it rejects at once with "ffmpeg was stopped", and the worker
  is terminated, because that is the only way to stop ffmpeg. The session stays usable: the next
  `run` starts a fresh worker. With no command running it does nothing.
  */
  interrupt(): void
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
const LOAD_TIMEOUT_MS = 180_000
const FILE_TIMEOUT_MS = 10_000

/*
A call into ffmpeg's worker can hang without ever answering, so every call races a watchdog.
Terminating is the only thing that really stops the worker. The watchdog rejects before it
terminates, because terminating rejects the pending call with a less useful message of its own.
`onTerminate` tells the session that its worker is gone, so the next run starts a fresh one.
*/
async function watched<T>(
  ffmpeg: FFmpeg,
  call: Promise<T>,
  timeoutMs: number,
  what: string,
  onTerminate: () => void,
): Promise<T> {
  let watchdog: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<never>((_, reject) => {
    watchdog = setTimeout(() => {
      reject(new Error(`ffmpeg did not finish ${what} within ${timeoutMs / 1000} s`))
      ffmpeg.terminate()
      onTerminate()
    }, timeoutMs)
  })
  try {
    return await Promise.race([call, timedOut])
  } finally {
    clearTimeout(watchdog)
  }
}

/*
ffmpeg ends each call by throwing, and nothing resets its call stack, so a worker wears out after
a few dozen calls (docs/concepts/02-long-files.md, section 8, measured failures from the 75th
call). 20 leaves a wide margin, and a reload takes under 100 ms.
*/
const CALLS_PER_WORKER = 20

/*
Loads the core and mounts the file with WORKERFS, which reads only the bytes ffmpeg asks for
instead of copying the whole file into memory.

The session replaces its worker before the 21st call, the 41st and so on, and also before the
first call after a watchdog terminated the worker (the session outlives a hung call, so later
calls must not meet the dead worker). Callers never see it: the file is mounted again at the same
path. After `close` no worker starts again and `run` fails.
*/
export async function openFfmpeg(file: File): Promise<FfmpegSession> {
  const name = inputName(file)
  let log: string[] = []
  // The current worker and how many `run` calls it has served.
  let ffmpeg: FFmpeg
  let calls = 0
  // Set when a watchdog terminated the current worker, until a fresh one is up.
  let hasLostWorker = false
  let isClosed = false
  const markTerminated = () => {
    hasLostWorker = true
  }
  // Rejects the command in flight, if any, with the interrupt's own message.
  let stopRun: ((error: Error) => void) | undefined

  async function startWorker() {
    const worker = new FFmpeg()
    // `close` terminates whichever worker is current, even one that is still loading.
    ffmpeg = worker
    calls = 0
    worker.on('log', ({ message }) => {
      // The wasm runtime prints this after ffmpeg exits with an error; it would hide ffmpeg's own
      // last line, which is the useful reason.
      if (message !== 'Aborted()') log.push(message)
    })

    await watched(
      worker,
      worker.load({ coreURL, wasmURL }),
      LOAD_TIMEOUT_MS,
      'loading',
      markTerminated,
    )
    await watched(
      worker,
      worker.createDir(INPUT_DIRECTORY),
      FILE_TIMEOUT_MS,
      'creating /in',
      markTerminated,
    )
    await watched(
      worker,
      worker.mount(FFFSType.WORKERFS, { blobs: [{ name, data: file }] }, INPUT_DIRECTORY),
      FILE_TIMEOUT_MS,
      'mounting the file',
      markTerminated,
    )
  }

  await startWorker()

  return {
    inputPath: `${INPUT_DIRECTORY}/${name}`,

    async run(command, timeoutMs) {
      if (isClosed) throw new Error('The ffmpeg session is closed')
      if (hasLostWorker || calls >= CALLS_PER_WORKER) {
        ffmpeg.terminate()
        // Stays set if the start fails, so the next run tries again.
        hasLostWorker = true
        await startWorker()
        hasLostWorker = false
      }
      calls++
      log = []
      const stopper = new AbortController()
      stopRun = (error) => {
        stopper.abort(error)
      }
      const stopped = new Promise<never>((_, reject) => {
        stopper.signal.addEventListener(
          'abort',
          () => {
            reject(stopper.signal.reason as Error)
          },
          { once: true },
        )
      })
      try {
        const exitCode = await watched(
          ffmpeg,
          Promise.race([ffmpeg.exec(command), stopped]),
          timeoutMs,
          'the command',
          markTerminated,
        )
        return { exitCode, log }
      } finally {
        stopRun = undefined
      }
    },

    interrupt() {
      if (!stopRun) return
      /*
      Rejects before it terminates, as the watchdog does: terminating rejects the pending call
      with a message of its own, and the first rejection is the one the caller sees.
      */
      stopRun(new Error('ffmpeg was stopped'))
      stopRun = undefined
      markTerminated()
      ffmpeg.terminate()
    },

    async takeFile(path) {
      const data = await watched(
        ffmpeg,
        ffmpeg.readFile(path),
        FILE_TIMEOUT_MS,
        `reading ${path}`,
        markTerminated,
      )
      await watched(
        ffmpeg,
        ffmpeg.deleteFile(path),
        FILE_TIMEOUT_MS,
        `deleting ${path}`,
        markTerminated,
      )
      if (typeof data === 'string') throw new TypeError(`${path} came back as text`)
      return data
    },

    close() {
      isClosed = true
      ffmpeg.terminate()
    },
  }
}
