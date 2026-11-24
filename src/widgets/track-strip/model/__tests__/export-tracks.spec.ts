import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { exportSummary } from '../../lib/export-summary.ts'
import { useExportTracksStore } from '../export-tracks.ts'
import { FakeFolder } from './fake-folder.ts'

// The worker is replaced by an answer: the second track repeats the first, the third is its own.
vi.mock('@/entities/split/api/find-matches-client.ts', () => ({
  findMatchesInWorker: () => Promise.resolve([{ duplicate: 1, kept: 0 }]),
}))

// 107 s: three loud stretches of 35 s with a 2 s silence between each two, so three tracks of 30 s or more.
function curveWithThreeLongTracks() {
  const curve = new Float32Array(2140).fill(-10)
  curve.fill(-70, 700, 740)
  curve.fill(-70, 1440, 1480)
  return curve
}

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

// Names the tracks in order, the first with the file's start; an empty name leaves one unnamed.
function renameAll(split: ReturnType<typeof useSplitStore>, names: string[]) {
  const ids = [null, ...split.splits.map((point) => point.id)]
  for (const [index, name] of names.entries()) {
    const id = ids[index]
    if (id !== undefined) split.renameTrack(id, name)
  }
}

// Opens the three long tracks in place of the file, and finds that the second repeats the first.
async function findTheDuplicate(split: ReturnType<typeof useSplitStore>) {
  split.open(curveWithThreeLongTracks(), { windowSeconds: 0.05, durationSeconds: 107 })
  split.addGapSplits()
  await split.findDuplicates()
  expect(split.tracks.map((track) => track.duplicateOf)).toEqual([null, 1, null])
}

// The names of the files the export wrote into its subfolder, in order.
const fileNames = (folder: FakeFolder) => [
  ...(folder.folders.get('Evening Set')?.files.keys() ?? []),
]

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
    split.open(withSplits ? curveWithTwoGaps() : new Float32Array(2000).fill(-10), {
      windowSeconds: 0.05,
      durationSeconds: 100,
    })
    if (withSplits) split.addGapSplits()
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
      { title: '03', track: '3/3', album: 'Evening Set' },
    ])
    expect([...(picked.folders.get('Evening Set')?.files.keys() ?? [])]).toEqual([
      'Opener.m4a',
      'Sunrise- Drive.m4a',
      '03.m4a',
    ])
  })

  describe('duplicates', () => {
    it('writes no file for a duplicate, and numbers the files it writes 1 to K', async () => {
      const { split, exporter } = setUp({ withSplits: false })
      await findTheDuplicate(split)
      split.setTrackNamePrefix('set-')

      await exporter.start()

      expect(fileNames(picked)).toEqual(['set-01.m4a', 'set-02.m4a'])
      expect(cutTrack.mock.calls.map(([cut]) => cut.tags)).toEqual([
        { title: 'set-01', track: '1/2', album: 'Evening Set' },
        { title: 'set-02', track: '2/2', album: 'Evening Set' },
      ])
      expect(exporter.trackCount).toBe(2)
    })

    it('cuts the track before a duplicate to where the duplicate starts', async () => {
      const { split, exporter } = setUp({ withSplits: false })
      await findTheDuplicate(split)

      await exporter.start()

      expect(cutTrack.mock.calls.map(([cut]) => [cut.startSeconds, cut.endSeconds])).toEqual([
        [0, 36],
        [73, undefined],
      ])
    })
  })

  describe('left-out tracks', () => {
    it('writes no file for a left-out track, but cuts its neighbours to where the next one starts', async () => {
      const { exporter, split } = setUp()
      split.toggleLeftOut(split.splits[0]!.id)

      await exporter.start()

      expect(cutTrack.mock.calls.map(([cut]) => [cut.startSeconds, cut.endSeconds])).toEqual([
        [0, 21],
        [71.5, undefined],
      ])
      expect(fileNames(picked)).toEqual(['01.m4a', '02.m4a'])
      expect(exporter.savedCount).toBe(2)
      expect(exporter.trackCount).toBe(2)
    })

    it('numbers the files and the N/K tags 1 to K among the tracks written', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('set-')
      split.toggleLeftOut(null)

      await exporter.start()

      expect(fileNames(picked)).toEqual(['set-01.m4a', 'set-02.m4a'])
      expect(cutTrack.mock.calls.map(([cut]) => cut.tags)).toEqual([
        { title: 'set-01', track: '1/2', album: 'Evening Set' },
        { title: 'set-02', track: '2/2', album: 'Evening Set' },
      ])
    })

    it('writes a named left-in track under its name, and counts it among the K', async () => {
      const { exporter, split } = setUp()
      split.renameTrack(split.splits[1]!.id, 'Closer')
      split.toggleLeftOut(split.splits[0]!.id)

      await exporter.start()

      expect(fileNames(picked)).toEqual(['01.m4a', 'Closer.m4a'])
      expect(cutTrack.mock.calls.map(([cut]) => cut.tags.track)).toEqual(['1/2', '2/2'])
    })

    it('refuses to start when every track is left out, with no picker and no folder', async () => {
      const { exporter, split } = setUp()
      for (const track of split.tracks) split.toggleLeftOut(track.startSplit?.id ?? null)

      await exporter.start()

      expect(exporter.status).toBe('idle')
      expect(picker).not.toHaveBeenCalled()
      expect(cutTrack).not.toHaveBeenCalled()
    })

    it('says the tracks written in the summary, so it matches the files in the folder', async () => {
      const { exporter, split } = setUp()
      split.toggleLeftOut(split.splits[0]!.id)

      await exporter.start()

      expect(
        exportSummary({
          status: 'done',
          savedCount: exporter.savedCount,
          trackCount: exporter.trackCount,
          folderName: exporter.folderName,
          failure: exporter.failure,
        }),
      ).toBe('2 tracks saved to Evening Set/')
    })
  })

  describe('names that clash', () => {
    it('writes a renamed track under its name as typed, with no number', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('set-')
      renameAll(split, ['', 'Intro', ''])

      await exporter.start()

      expect(fileNames(picked)).toEqual(['set-01.m4a', 'Intro.m4a', 'set-03.m4a'])
    })

    it('gives the later of two tracks of the same name `name (2)`', async () => {
      const { exporter, split } = setUp()
      renameAll(split, ['Intro', 'Intro', 'Intro'])

      await exporter.start()

      expect(fileNames(picked)).toEqual(['Intro.m4a', 'Intro (2).m4a', 'Intro (3).m4a'])
      expect(exporter.savedCount).toBe(3)
    })

    it('keeps a typed name that equals another track’s default apart, the earlier track keeping the plain name', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('dreamscape-')
      // Track 1 is typed as track 2's default name: track 1 comes first.
      renameAll(split, ['dreamscape-02', '', ''])

      await exporter.start()

      expect(fileNames(picked)).toEqual([
        'dreamscape-02.m4a',
        'dreamscape-02 (2).m4a',
        'dreamscape-03.m4a',
      ])
    })

    it('gives the later track the `(2)` when the typed name comes after the default it matches', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('dreamscape-')
      renameAll(split, ['', '', 'dreamscape-01'])

      await exporter.start()

      expect(fileNames(picked)).toEqual([
        'dreamscape-01.m4a',
        'dreamscape-02.m4a',
        'dreamscape-01 (2).m4a',
      ])
    })

    it('treats names that differ only in capital letters as the same name', async () => {
      const { exporter, split } = setUp()
      renameAll(split, ['intro', 'Intro', 'INTRO'])

      await exporter.start()

      expect(fileNames(picked)).toEqual(['intro.m4a', 'Intro (2).m4a', 'INTRO (3).m4a'])
    })

    it('writes a name that is empty once made safe under the track’s prefixed name, titled as typed', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('set-')
      renameAll(split, ['', '...', ''])

      await exporter.start()

      expect(fileNames(picked)).toEqual(['set-01.m4a', 'set-02.m4a', 'set-03.m4a'])
      expect(cutTrack.mock.calls[1]?.[0].tags.title).toBe('...')
    })

    it('keeps the `(2)` apart from a later track typed with that very name', async () => {
      const { exporter, split } = setUp()
      renameAll(split, ['Intro', 'Intro', 'Intro (2)'])

      await exporter.start()

      expect(fileNames(picked)).toEqual(['Intro.m4a', 'Intro (2).m4a', 'Intro (2) (2).m4a'])
    })
  })

  describe('the track name prefix', () => {
    it('writes an unnamed track as the prefix and its padded number, and titles it the same', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('Evening Set-')

      await exporter.start()

      expect(fileNames(picked)).toEqual([
        'Evening Set-01.m4a',
        'Evening Set-02.m4a',
        'Evening Set-03.m4a',
      ])
      expect(cutTrack.mock.calls.map(([cut]) => cut.tags)).toEqual([
        { title: 'Evening Set-01', track: '1/3', album: 'Evening Set' },
        { title: 'Evening Set-02', track: '2/3', album: 'Evening Set' },
        { title: 'Evening Set-03', track: '3/3', album: 'Evening Set' },
      ])
    })

    it('puts nothing between the prefix and the number', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('take ')

      await exporter.start()

      expect(fileNames(picked)).toEqual(['take 01.m4a', 'take 02.m4a', 'take 03.m4a'])
    })

    it('writes plain numbers, and titles them with the bare number, when the prefix is empty', async () => {
      const { exporter } = setUp()

      await exporter.start()

      expect(fileNames(picked)).toEqual(['01.m4a', '02.m4a', '03.m4a'])
      expect(cutTrack.mock.calls.map(([cut]) => cut.tags.title)).toEqual(['01', '02', '03'])
    })

    it('turns unsafe characters in the prefix into -, in the file name only', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('a/b: ')

      await exporter.start()

      expect(fileNames(picked)).toEqual(['a-b- 01.m4a', 'a-b- 02.m4a', 'a-b- 03.m4a'])
      expect(cutTrack.mock.calls[0]?.[0].tags.title).toBe('a/b: 01')
    })

    it('cuts a 100-character prefix, and not the number, so the files stay apart', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('x'.repeat(100))

      await exporter.start()

      expect(fileNames(picked)).toEqual(
        ['01', '02', '03'].map((number) => `${'x'.repeat(98)}${number}.m4a`),
      )
    })

    it('uses the prefix the export started with, whatever is typed while it runs', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('a-')
      const firstCut = deferred<Uint8Array>()
      cutTrack.mockImplementationOnce(() => firstCut.promise)

      const running = exporter.start()
      await flush()
      split.setTrackNamePrefix('b-')
      firstCut.resolve(bytesOf(1))
      await running

      expect(fileNames(picked)).toEqual(['a-01.m4a', 'a-02.m4a', 'a-03.m4a'])
    })
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

    it('names an unnamed track by its number alone, whatever the prefix', async () => {
      const { exporter, split } = setUp()
      split.setTrackNamePrefix('Evening Set-')
      cutTrack.mockResolvedValueOnce(bytesOf(1)).mockRejectedValueOnce(new Error('Invalid data'))

      await exporter.start()

      expect(exporter.failure).toEqual({
        track: { number: 2, name: null },
        message: 'Invalid data',
      })
      expect(
        exportSummary({
          status: 'failed',
          savedCount: exporter.savedCount,
          trackCount: exporter.trackCount,
          folderName: exporter.folderName,
          failure: exporter.failure,
        }),
      ).toBe('Track 2 failed: Invalid data. 1 of 3 tracks saved to Evening Set/.')
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
