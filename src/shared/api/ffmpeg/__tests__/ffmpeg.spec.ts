import { beforeEach, describe, it, expect, vi } from 'vitest'

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

describe('openFfmpeg', () => {
  beforeEach(() => {
    workers.length = 0
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
})
