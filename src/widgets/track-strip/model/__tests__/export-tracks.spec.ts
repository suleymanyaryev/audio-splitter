import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useExportTracksStore } from '../export-tracks.ts'
import { FakeFolder } from './fake-folder.ts'

/*
100 s at 50 ms per window: loud, a 2 s silence from 20 s, loud, a 2 s silence from 70.5 s, loud.
The splits are at 21 s and 71.5 s, so three tracks.
*/
function curveWithTwoGaps() {
  const curve = new Float32Array(2000).fill(-10)
  curve.fill(-70, 400, 440)
  curve.fill(-70, 1410, 1450)
  return curve
}

// A promise the test settles by hand, to hold a cut back while something else happens.
function deferred<T>() {
  const handlers = {} as { resolve: (value: T) => void; reject: (reason: unknown) => void }
  const promise = new Promise<T>((resolve, reject) => {
    handlers.resolve = (value) => {
      resolve(value)
    }
    handlers.reject = (reason) => {
      reject(reason)
    }
  })
  return { promise, ...handlers }
}

// Lets the promise callbacks the store waits on run.
const flush = () => new Promise((done) => setTimeout(done, 0))

const bytesOf = (track: number) => Uint8Array.of(track, track, track)

describe('the export store', () => {
  let picked: FakeFolder
  let picker: ReturnType<typeof vi.fn>
  let cutTrack: MockInstance<ReturnType<typeof useSourceFileStore>['cutTrack']>
  let stopCuts: MockInstance<ReturnType<typeof useSourceFileStore>['stopCuts']>

  function setUp({ withSplits = true } = {}) {
    const sourceFile = useSourceFileStore()
    sourceFile.file = new File([], 'Evening Set.m4a')
    sourceFile.format = 'm4a'
    sourceFile.status = 'ready'
    const split = useSplitStore()
    split.detect(withSplits ? curveWithTwoGaps() : new Float32Array(2000).fill(-10), {
      windowSeconds: 0.05,
      durationSeconds: 100,
    })
    return { split, exporter: useExportTracksStore() }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    picked = new FakeFolder()
    picker = vi.fn(() => Promise.resolve(picked))
    vi.stubGlobal('showDirectoryPicker', picker)
    cutTrack = vi.spyOn(useSourceFileStore(), 'cutTrack').mockImplementation(() => {
      // The log carries the cut too, so the specs can see it come between two writes.
      picked.log.push(`cut ${String(cutTrack.mock.calls.length)}`)
      return Promise.resolve(bytesOf(cutTrack.mock.calls.length))
    })
    stopCuts = vi.spyOn(useSourceFileStore(), 'stopCuts').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks for a read-write folder with a fixed picker id on every export', async () => {
    const { exporter } = setUp()

    await exporter.start()
    await exporter.start()

    expect(picker).toHaveBeenCalledTimes(2)
    expect(picker).toHaveBeenNthCalledWith(1, { id: 'export-folder', mode: 'readwrite' })
  })

  it('closes quietly when the user cancels the picker', async () => {
    const { exporter } = setUp()
    picker.mockRejectedValue(new DOMException('The user aborted a request.', 'AbortError'))

    await exporter.start()

    expect(exporter.status).toBe('idle')
    expect(exporter.failure).toBeNull()
    expect(cutTrack).not.toHaveBeenCalled()
  })

  it('reports a picker that fails for any other reason', async () => {
    const { exporter } = setUp()
    picker.mockRejectedValue(new DOMException('Not allowed', 'SecurityError'))

    await exporter.start()

    expect(exporter.status).toBe('failed')
    expect(exporter.failure).toEqual({ track: null, message: 'Not allowed' })
    expect(cutTrack).not.toHaveBeenCalled()
  })

  it('cuts every track in order and writes each into a folder named after the source file', async () => {
    const { exporter } = setUp()

    await exporter.start()

    expect(cutTrack.mock.calls.map(([cut]) => [cut.startSeconds, cut.endSeconds])).toEqual([
      [0, 21],
      [21, 71.5],
      [71.5, undefined],
    ])
    const folder = picked.folders.get('Evening Set')
    expect([...(folder?.files.keys() ?? [])]).toEqual(['01.m4a', '02.m4a', '03.m4a'])
    expect(folder?.files.get('02.m4a')).toEqual(bytesOf(2))
    expect(exporter.status).toBe('done')
    expect(exporter.folderName).toBe('Evening Set')
    expect(exporter.savedCount).toBe(3)
    expect(exporter.trackCount).toBe(3)
  })

  it('tags each track with its number, the source stem and the name the user gave it', async () => {
    const { exporter, split } = setUp()
    split.renameTrack(split.splits[0]?.id ?? null, 'Sunrise: Drive')
    split.renameTrack(null, 'Opener')

    await exporter.start()

    expect(cutTrack.mock.calls.map(([cut]) => cut.tags)).toEqual([
      { title: 'Opener', track: '1/3', album: 'Evening Set' },
      { title: 'Sunrise: Drive', track: '2/3', album: 'Evening Set' },
      { title: 'Evening Set 03', track: '3/3', album: 'Evening Set' },
    ])
    expect([...(picked.folders.get('Evening Set')?.files.keys() ?? [])]).toEqual([
      '01 Opener.m4a',
      '02 Sunrise- Drive.m4a',
      '03.m4a',
    ])
  })

  it('exports the whole file as one track when there are no splits', async () => {
    const { exporter } = setUp({ withSplits: false })

    await exporter.start()

    expect(cutTrack).toHaveBeenCalledTimes(1)
    expect(cutTrack.mock.calls[0]?.[0]).toMatchObject({
      startSeconds: 0,
      endSeconds: undefined,
      tags: { track: '1/1' },
    })
    expect([...(picked.folders.get('Evening Set')?.files.keys() ?? [])]).toEqual(['01.m4a'])
  })

  it('never reuses a folder name: it adds (2), ignoring case', async () => {
    const { exporter } = setUp()
    await picked.getDirectoryHandle('evening set', { create: true })

    await exporter.start()

    expect(exporter.folderName).toBe('Evening Set (2)')
    expect(picked.folders.get('Evening Set (2)')?.files.size).toBe(3)
    expect(picked.folders.get('evening set')?.files.size).toBe(0)
  })

  it('writes and closes each track before cutting the next', async () => {
    const { exporter } = setUp()

    await exporter.start()

    expect(picked.log).toEqual([
      'mkdir Evening Set/',
      'cut 1',
      'open Evening Set/01.m4a',
      'write Evening Set/01.m4a',
      'close Evening Set/01.m4a',
      'cut 2',
      'open Evening Set/02.m4a',
      'write Evening Set/02.m4a',
      'close Evening Set/02.m4a',
      'cut 3',
      'open Evening Set/03.m4a',
      'write Evening Set/03.m4a',
      'close Evening Set/03.m4a',
    ])
  })

  it('shows which track it is on while it runs', async () => {
    const { exporter } = setUp()
    const second = deferred<Uint8Array>()
    cutTrack.mockResolvedValueOnce(bytesOf(1)).mockReturnValueOnce(second.promise)

    const run = exporter.start()
    await flush()

    expect(exporter.status).toBe('running')
    expect(exporter.isRunning).toBe(true)
    expect(exporter.trackNumber).toBe(2)
    expect(exporter.trackCount).toBe(3)
    expect(exporter.savedCount).toBe(1)

    second.reject(new Error('stop the run'))
    await run
  })

  it('ignores a second start while an export runs', async () => {
    const { exporter } = setUp()
    const first = deferred<Uint8Array>()
    cutTrack.mockReturnValueOnce(first.promise)

    const run = exporter.start()
    await flush()
    await exporter.start()
    first.resolve(bytesOf(1))
    await run

    expect(picker).toHaveBeenCalledTimes(1)
  })

  describe('when a track fails', () => {
    it('stops at that track and names it, with the tracks saved before it', async () => {
      const { exporter, split } = setUp()
      split.renameTrack(split.splits[0]?.id ?? null, 'Sunrise')
      cutTrack.mockResolvedValueOnce(bytesOf(1)).mockRejectedValueOnce(new Error('Invalid data'))

      await exporter.start()

      expect(exporter.status).toBe('failed')
      expect(exporter.failure).toEqual({
        track: { number: 2, name: 'Sunrise' },
        message: 'Invalid data',
      })
      expect(exporter.savedCount).toBe(1)
      expect(cutTrack).toHaveBeenCalledTimes(2)
      expect([...(picked.folders.get('Evening Set')?.files.keys() ?? [])]).toEqual(['01.m4a'])
    })

    it('aborts the file it was writing and removes the empty file it made, so no track stays', async () => {
      const { exporter } = setUp()
      const folder = new FakeFolder()
      picker.mockResolvedValue(folder)
      const create = vi.spyOn(FakeFolder.prototype, 'getFileHandle')
      create.mockImplementationOnce(async function (this: FakeFolder, name, options) {
        const handle = await FakeFolder.prototype.getFileHandle.call(this, name, options)
        return {
          createWritable: async () => ({
            ...(await handle.createWritable()),
            write: () => Promise.reject(new Error('Disk full')),
          }),
        }
      })

      await exporter.start()

      expect(exporter.failure).toEqual({ track: { number: 1, name: null }, message: 'Disk full' })
      expect(folder.log.slice(-2)).toEqual([
        'abort Evening Set/01.m4a',
        'remove Evening Set/01.m4a',
      ])
      expect(folder.folders.get('Evening Set')?.files.size).toBe(0)
      create.mockRestore()
    })
  })

  describe('cancel', () => {
    it('stops ffmpeg, starts no further track and counts the tracks saved', async () => {
      const { exporter } = setUp()
      const second = deferred<Uint8Array>()
      cutTrack.mockResolvedValueOnce(bytesOf(1)).mockReturnValueOnce(second.promise)

      const run = exporter.start()
      await flush()
      exporter.cancel()
      expect(stopCuts).toHaveBeenCalledTimes(1)
      second.reject(new Error('ffmpeg was stopped'))
      await run

      expect(exporter.status).toBe('cancelled')
      expect(exporter.failure).toBeNull()
      expect(exporter.savedCount).toBe(1)
      expect(cutTrack).toHaveBeenCalledTimes(2)
      expect([...(picked.folders.get('Evening Set')?.files.keys() ?? [])]).toEqual(['01.m4a'])
    })

    it('does not start the next track when it comes between two tracks', async () => {
      const { exporter } = setUp()
      const first = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(first.promise)

      const run = exporter.start()
      await flush()
      exporter.cancel()
      // The cut finished anyway, as the press came after ffmpeg was done.
      first.resolve(bytesOf(1))
      await run

      expect(exporter.status).toBe('cancelled')
      expect(cutTrack).toHaveBeenCalledTimes(1)
    })

    it('does nothing when no export runs', () => {
      const { exporter } = setUp()

      exporter.cancel()

      expect(stopCuts).not.toHaveBeenCalled()
      expect(exporter.status).toBe('idle')
    })
  })

  it('can export again after the summary is closed', async () => {
    const { exporter } = setUp()
    await exporter.start()

    exporter.dismiss()

    expect(exporter.status).toBe('idle')
    await exporter.start()
    // The first export's folder is in the picked folder now.
    expect(exporter.folderName).toBe('Evening Set (2)')
    expect(exporter.savedCount).toBe(3)
  })
})
