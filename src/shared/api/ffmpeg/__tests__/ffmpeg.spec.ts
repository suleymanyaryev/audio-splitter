import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { openFfmpeg } from '../ffmpeg.ts'

const workers = vi.hoisted(() => [] as Record<string, ReturnType<typeof vi.fn>>[])

// Every `new FFmpeg()` is one worker; `workers` keeps them in the order they were opened.
vi.mock('@ffmpeg/ffmpeg', () => ({
  FFFSType: { WORKERFS: 'WORKERFS' },
  FFmpeg: class {
    on = vi.fn()
    load = vi.fn().mockResolvedValue(true)
    createDir = vi.fn().mockResolvedValue(true)
    mount = vi.fn().mockResolvedValue(true)
    exec = vi.fn().mockResolvedValue(0)
    terminate = vi.fn()
    constructor() {
      workers.push(this as unknown as Record<string, ReturnType<typeof vi.fn>>)
    }
  },
}))

const file = new File(['x'], 'evening-set-vol3.m4a')

// The first worker's next call never answers, so its watchdog fires and terminates it.
async function timeoutFirstCall() {
  vi.useFakeTimers()
  const session = await openFfmpeg(file)
  workers[0]?.exec?.mockReturnValue(new Promise(() => {}))
  const outcome = (async () => {
    try {
      await session.run(['-version'], 1000)
      return 'answered'
    } catch (error) {
      return String(error)
    }
  })()
  await vi.advanceTimersByTimeAsync(1000)
  expect(await outcome).toContain('did not finish')
  return session
}

describe('openFfmpeg', () => {
  beforeEach(() => {
    workers.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('serves the first 20 calls on one worker', async () => {
    const session = await openFfmpeg(file)

    for (let call = 0; call < 20; call++) await session.run(['-version'], 1000)

    expect(workers).toHaveLength(1)
    expect(workers[0]?.exec).toHaveBeenCalledTimes(20)
    expect(workers[0]?.terminate).not.toHaveBeenCalled()
  })

  it('replaces the worker before call 21, with the file mounted again at the same path', async () => {
    const session = await openFfmpeg(file)
    const inputPath = session.inputPath
    for (let call = 0; call < 20; call++) await session.run(['-version'], 1000)

    await session.run(['-version'], 1000)

    expect(workers).toHaveLength(2)
    expect(workers[0]?.terminate).toHaveBeenCalledOnce()
    expect(workers[1]?.load).toHaveBeenCalledOnce()
    expect(workers[1]?.createDir).toHaveBeenCalledWith('/in')
    expect(workers[1]?.mount).toHaveBeenCalledWith(
      'WORKERFS',
      { blobs: [{ name: 'source.m4a', data: file }] },
      '/in',
    )
    expect(workers[1]?.exec).toHaveBeenCalledOnce()
    expect(workers[0]?.exec).toHaveBeenCalledTimes(20)
    expect(session.inputPath).toBe(inputPath)
  })

  it('counts the calls of each worker again after a reload', async () => {
    const session = await openFfmpeg(file)

    for (let call = 0; call < 41; call++) await session.run(['-version'], 1000)

    expect(workers).toHaveLength(3)
  })

  it('terminates the current worker on close', async () => {
    const session = await openFfmpeg(file)
    for (let call = 0; call < 21; call++) await session.run(['-version'], 1000)

    session.close()

    expect(workers[1]?.terminate).toHaveBeenCalledOnce()
  })

  describe('after a call timed out', () => {
    it('starts a fresh worker for the next run, with the file mounted again', async () => {
      const session = await timeoutFirstCall()
      expect(workers[0]?.terminate).toHaveBeenCalledOnce()

      await session.run(['-version'], 1000)

      expect(workers).toHaveLength(2)
      expect(workers[1]?.mount).toHaveBeenCalledWith(
        'WORKERFS',
        { blobs: [{ name: 'source.m4a', data: file }] },
        '/in',
      )
      expect(workers[1]?.exec).toHaveBeenCalledOnce()
      expect(workers[0]?.exec).toHaveBeenCalledOnce()
    })

    it('keeps the fresh worker for the runs after it', async () => {
      const session = await timeoutFirstCall()

      await session.run(['-version'], 1000)
      await session.run(['-version'], 1000)

      expect(workers).toHaveLength(2)
      expect(workers[1]?.exec).toHaveBeenCalledTimes(2)
    })

    it('stays closed once closed: a run fails and starts no worker', async () => {
      const session = await timeoutFirstCall()

      session.close()

      await expect(session.run(['-version'], 1000)).rejects.toThrow('closed')
      expect(workers).toHaveLength(1)
    })
  })

  it('does not start a worker for a run after close, even one due for a reload', async () => {
    const session = await openFfmpeg(file)
    for (let call = 0; call < 20; call++) await session.run(['-version'], 1000)

    session.close()

    await expect(session.run(['-version'], 1000)).rejects.toThrow('closed')
    expect(workers).toHaveLength(1)
  })
})
