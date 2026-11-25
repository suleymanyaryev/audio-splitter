import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useExportSingleStore } from '../export-single.ts'
import { useExportTracksStore } from '../export-tracks.ts'
import { FakeFolder } from './fake-folder.ts'

// The worker is replaced by an answer: the second track repeats the first, the third is its own.
vi.mock('@/entities/split/api/find-matches-client.ts', () => ({
  findMatchesInWorker: () =>
    Promise.resolve([
      {
        later: 1,
        earlier: 0,
        kind: 'full',
        laterShared: { from: 0, to: 30 },
        earlierShared: { from: 0, to: 30 },
      },
    ]),
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

// The names of the files in a folder, in the order they were made.
const filesOf = (folder: FakeFolder) => Object.keys(Object.fromEntries(folder.files))

const bytesOf = (value: number) => Uint8Array.of(value, value, value)

describe('the single export store', () => {
  let folder: FakeFolder
  let picker: ReturnType<typeof vi.fn>
  let cutTrack: MockInstance<ReturnType<typeof useSourceFileStore>['cutTrack']>
  let stopCuts: MockInstance<ReturnType<typeof useSourceFileStore>['stopCuts']>

  function setUp() {
    const sourceFile = useSourceFileStore()
    sourceFile.file = new File([], 'Evening Set.m4a')
    sourceFile.format = 'm4a'
    sourceFile.status = 'ready'
    const split = useSplitStore()
    split.open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    split.findSplits()
    return { sourceFile, split, exporter: useExportSingleStore() }
  }

  const trackOf = (split: ReturnType<typeof useSplitStore>, number: number) =>
    split.tracks.find((track) => track.number === number)!

  beforeEach(() => {
    setActivePinia(createPinia())
    folder = new FakeFolder('', [], 'Music')
    picker = vi.fn(() => Promise.resolve(folder))
    vi.stubGlobal('showDirectoryPicker', picker)
    cutTrack = vi
      .spyOn(useSourceFileStore(), 'cutTrack')
      .mockImplementation(() => Promise.resolve(bytesOf(cutTrack.mock.calls.length)))
    stopCuts = vi.spyOn(useSourceFileStore(), 'stopCuts').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('opening', () => {
    it('opens an unnamed track with its shown name as the default name', () => {
      const { split, exporter } = setUp()
      split.setTrackNamePrefix('Evening Set-')

      exporter.openTrack(trackOf(split, 2))

      expect(exporter.status).toBe('naming')
      expect(exporter.subject).toBe('track')
      expect(exporter.defaultName).toBe('Evening Set-02')
      expect(picker).not.toHaveBeenCalled()
    })

    it('opens an unnamed track with its bare number when the prefix is empty', () => {
      const { split, exporter } = setUp()

      exporter.openTrack(trackOf(split, 2))

      expect(exporter.defaultName).toBe('02')
    })

    it("opens a named track with the track's name, the first track too", () => {
      const { split, exporter } = setUp()
      split.renameTrack(null, 'Opening')
      split.renameTrack(split.splits[0]!.id, 'Chorus')

      exporter.openTrack(trackOf(split, 1))
      expect(exporter.defaultName).toBe('Opening')

      exporter.openTrack(trackOf(split, 2))
      expect(exporter.defaultName).toBe('Chorus')
    })

    it('opens an unnamed left-out track with the prefix and its place in the file', () => {
      const { split, exporter } = setUp()
      split.setTrackNamePrefix('dreamscape-')
      split.toggleLeftOut(split.splits[1]!.id)

      exporter.openTrack(trackOf(split, 3))

      expect(exporter.defaultName).toBe('dreamscape-03')
    })

    it('opens a named left-out track with its name, and an included track after one with its export number', () => {
      const { split, exporter } = setUp()
      split.setTrackNamePrefix('dreamscape-')
      split.renameTrack(split.splits[0]!.id, 'Interlude')
      split.toggleLeftOut(null)
      split.toggleLeftOut(split.splits[0]!.id)

      exporter.openTrack(trackOf(split, 2))
      expect(exporter.defaultName).toBe('Interlude')

      // Track 3 is the only one written, so its file would be number 1 of 1.
      exporter.openTrack(trackOf(split, 3))
      expect(exporter.defaultName).toBe('dreamscape-01')
    })

    it('opens a range with the source stem and its times, dots in place of colons', () => {
      const { exporter } = setUp()

      exporter.openRange({ startSeconds: 10, endSeconds: 40.4 })

      expect(exporter.status).toBe('naming')
      expect(exporter.subject).toBe('range')
      expect(exporter.defaultName).toBe('Evening Set 0.00.10–0.00.40')
    })

    it('opens nothing with no file', () => {
      const { split, sourceFile, exporter } = setUp()
      sourceFile.file = null

      exporter.openTrack(trackOf(split, 1))

      expect(exporter.status).toBe('idle')
    })

    it('closes with no change when the dialog is closed, and keeps no subject', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))

      exporter.close()
      await exporter.confirm('Anything')

      expect(exporter.status).toBe('idle')
      expect(cutTrack).not.toHaveBeenCalled()
    })
  })

  describe('a track, end to end', () => {
    it('asks for the folder, cuts the track with the full export’s tags and writes "name.ext"', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm('Chorus')

      expect(picker).toHaveBeenCalledExactlyOnceWith({ id: 'export-folder', mode: 'readwrite' })
      expect(cutTrack).toHaveBeenCalledExactlyOnceWith({
        startSeconds: 21,
        endSeconds: 71.5,
        tags: { title: 'Chorus', track: '2/3', album: 'Evening Set' },
      })
      expect(filesOf(folder)).toEqual(['Chorus.m4a'])
      expect(folder.files.get('Chorus.m4a')).toEqual(bytesOf(1))
      expect(exporter.status).toBe('saved')
      expect(exporter.savedFile).toBe('Chorus.m4a')
      expect(exporter.savedFolderName).toBe('Music')
    })

    it('writes straight into the picked folder, with no subfolder', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('Opening')

      expect(folder.folders.size).toBe(0)
      expect(folder.files.size).toBe(1)
    })

    it('cuts the last track to the end of the file, with no end', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 3))

      await exporter.confirm('Outro')

      expect(cutTrack).toHaveBeenCalledWith(
        expect.objectContaining({ startSeconds: 71.5, endSeconds: undefined }),
      )
      expect(folder.files.has('Outro.m4a')).toBe(true)
    })

    it('sanitises the file name, and keeps the name as typed in the title tag', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('Live: part 1/2')

      expect(cutTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { title: 'Live: part 1/2', track: '1/3', album: 'Evening Set' },
        }),
      )
      expect(filesOf(folder)).toEqual(['Live- part 1-2.m4a'])
    })

    it('holds the name to a track name’s length', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('x'.repeat(150))

      expect(cutTrack.mock.calls[0]?.[0].tags.title).toBe('x'.repeat(100))
    })

    it('refuses an empty name, and leaves the dialog open', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm(' '.repeat(3))

      expect(exporter.status).toBe('naming')
      expect(picker).not.toHaveBeenCalled()
      expect(cutTrack).not.toHaveBeenCalled()
    })
  })

  describe('a duplicate', () => {
    it('is written alone like any left-out track, tagged with its place in the file', async () => {
      const { split, exporter } = setUp()
      split.open(curveWithThreeLongTracks(), { windowSeconds: 0.05, durationSeconds: 107 })
      split.findSplits()
      await split.findDuplicates()
      split.setTrackNamePrefix('dreamscape-')
      expect(trackOf(split, 2).inclusion).toBe('duplicate')
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm(exporter.defaultName)

      expect(exporter.status).toBe('saved')
      expect(filesOf(folder)).toEqual(['dreamscape-02.m4a'])
      expect(cutTrack.mock.calls[0]?.[0].tags).toEqual({
        title: 'dreamscape-02',
        track: '2/3',
        album: 'Evening Set',
      })
      expect(trackOf(split, 2).inclusion).toBe('duplicate')
    })
  })

  describe('a left-out track', () => {
    it('is written alone, under the name offered, tagged with its place in the file', async () => {
      const { split, exporter } = setUp()
      split.setTrackNamePrefix('dreamscape-')
      split.toggleLeftOut(split.splits[1]!.id)
      exporter.openTrack(trackOf(split, 3))

      await exporter.confirm(exporter.defaultName)

      expect(exporter.status).toBe('saved')
      expect(filesOf(folder)).toEqual(['dreamscape-03.m4a'])
      expect(cutTrack.mock.calls[0]?.[0].tags).toEqual({
        title: 'dreamscape-03',
        track: '3/3',
        album: 'Evening Set',
      })
      // Confirming the offered name names nothing: the track stays unnamed, and left out.
      expect(trackOf(split, 3).ownName).toBeNull()
      expect(trackOf(split, 3).isLeftOut).toBe(true)
    })

    it('is renamed when another name is confirmed, like any track', async () => {
      const { split, exporter } = setUp()
      split.toggleLeftOut(split.splits[1]!.id)
      exporter.openTrack(trackOf(split, 3))

      await exporter.confirm('Hidden track')

      expect(filesOf(folder)).toEqual(['Hidden track.m4a'])
      expect(trackOf(split, 3).ownName).toBe('Hidden track')
    })
  })

  describe('the track’s name', () => {
    it('is changed to the name confirmed, when that is another name', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm('Chorus')

      expect(trackOf(split, 2).name).toBe('Chorus')
      expect(split.editCount).toBe(1)
    })

    it('is renamed before the cut, so a failed export keeps the name', async () => {
      const { split, exporter } = setUp()
      cutTrack.mockRejectedValue(new Error('Invalid data'))
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm('Chorus')

      expect(trackOf(split, 2).name).toBe('Chorus')
    })

    it('is left alone when an unnamed track’s default is confirmed as it is, so a later prefix change renames it', async () => {
      const { split, exporter } = setUp()
      split.setTrackNamePrefix('Evening Set-')
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm('Evening Set-02')
      split.setTrackNamePrefix('Late-')

      expect(trackOf(split, 2).ownName).toBeNull()
      expect(trackOf(split, 2).name).toBe('Late-02')
      expect(split.editCount).toBe(0)
    })

    it('writes the file the dialog offered, titled the same, for an unnamed track confirmed as it is', async () => {
      const { split, exporter } = setUp()
      split.setTrackNamePrefix('Evening Set-')
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm(exporter.defaultName)

      expect(filesOf(folder)).toEqual(['Evening Set-02.m4a'])
      expect(cutTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { title: 'Evening Set-02', track: '2/3', album: 'Evening Set' },
        }),
      )
    })

    it('offers and writes the bare number when the prefix is empty', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 2))

      expect(exporter.defaultName).toBe('02')
      await exporter.confirm('02')

      expect(filesOf(folder)).toEqual(['02.m4a'])
      expect(cutTrack).toHaveBeenCalledWith(
        expect.objectContaining({ tags: { title: '02', track: '2/3', album: 'Evening Set' } }),
      )
      expect(trackOf(split, 2).ownName).toBeNull()
    })

    it('is left alone when the default is too long for a name and is confirmed as it is', async () => {
      const { split, exporter } = setUp()
      // The prefix and `02` would be 102 characters: the default cuts the prefix to keep within 100.
      split.setTrackNamePrefix('x'.repeat(100))
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm(exporter.defaultName)

      expect(trackOf(split, 2).ownName).toBeNull()
      expect(split.editCount).toBe(0)
      expect(filesOf(folder)).toEqual([`${'x'.repeat(98)}02.m4a`])
    })

    it('is left alone when the default is confirmed with spaces around it', async () => {
      const { split, exporter } = setUp()
      split.setTrackNamePrefix('Evening Set-')
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm('  Evening Set-02 ')

      expect(split.editCount).toBe(0)
    })

    it('is left alone when a named track’s name is confirmed as it is', async () => {
      const { split, exporter } = setUp()
      split.renameTrack(null, 'Opening')
      const edits = split.editCount
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('Opening')

      expect(split.editCount).toBe(edits)
      expect(filesOf(folder)).toEqual(['Opening.m4a'])
    })

    it('is changed for the first track too', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('Opening')

      expect(split.firstTrackName).toBe('Opening')
    })
  })

  describe('the folder', () => {
    it('is asked for once: later exports of the file go to it with no picker', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      exporter.openTrack(trackOf(split, 2))
      expect(exporter.folderName).toBe('Music')
      await exporter.confirm('Two')

      expect(picker).toHaveBeenCalledOnce()
      expect(filesOf(folder)).toEqual(['One.m4a', 'Two.m4a'])
    })

    it('is not known before the first export', () => {
      const { split, exporter } = setUp()

      exporter.openTrack(trackOf(split, 1))

      expect(exporter.folderName).toBeNull()
    })

    it('is forgotten when the source file changes', async () => {
      const { sourceFile, split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      sourceFile.file = new File([], 'Morning Set.m4a')
      await flush()
      expect(exporter.folderName).toBeNull()

      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One again')
      expect(picker).toHaveBeenCalledTimes(2)
    })

    it('is picked again by "Change folder", and the next file goes there', async () => {
      const { split, exporter } = setUp()
      const other = new FakeFolder('', [], 'Podcasts')
      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      exporter.openTrack(trackOf(split, 2))
      picker.mockResolvedValueOnce(other)
      await exporter.changeFolder()
      expect(exporter.folderName).toBe('Podcasts')
      expect(exporter.status).toBe('naming')
      await exporter.confirm('Two')

      expect(filesOf(other)).toEqual(['Two.m4a'])
      expect(filesOf(folder)).toEqual(['One.m4a'])
      expect(exporter.savedFolderName).toBe('Podcasts')
    })

    it('stays as it was when "Change folder" is closed without a choice', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')
      exporter.openTrack(trackOf(split, 2))
      picker.mockRejectedValueOnce(new DOMException('The user aborted a request.', 'AbortError'))

      await exporter.changeFolder()

      expect(exporter.folderName).toBe('Music')
      expect(exporter.status).toBe('naming')
    })

    it('leaves the dialog open when the picker is closed on the first export', async () => {
      const { split, exporter } = setUp()
      picker.mockRejectedValueOnce(new DOMException('The user aborted a request.', 'AbortError'))
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm('Chorus')

      expect(exporter.status).toBe('naming')
      expect(exporter.failure).toBeNull()
      expect(cutTrack).not.toHaveBeenCalled()
      // The name is not taken yet: a closed picker is no confirmation.
      expect(trackOf(split, 2).ownName).toBeNull()

      await exporter.confirm('Chorus')
      expect(exporter.status).toBe('saved')
    })

    it('runs nothing when the dialog was closed while the picker was open', async () => {
      const { split, exporter } = setUp()
      const picking = deferred<FakeFolder>()
      picker.mockReturnValueOnce(picking.promise)
      exporter.openTrack(trackOf(split, 2))

      const run = exporter.confirm('Chorus')
      await flush()
      exporter.close()
      picking.resolve(folder)
      await run

      expect(exporter.status).toBe('idle')
      expect(cutTrack).not.toHaveBeenCalled()
      expect(trackOf(split, 2).ownName).toBeNull()
      expect(folder.files.size).toBe(0)
    })

    it('reports a picker that fails for another reason, in the dialog', async () => {
      const { split, exporter } = setUp()
      picker.mockRejectedValueOnce(new DOMException('Not allowed', 'SecurityError'))
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('One')

      expect(exporter.status).toBe('failed')
      expect(exporter.failure).toBe('Not allowed')
      expect(cutTrack).not.toHaveBeenCalled()
    })
  })

  describe('a typed name that is empty once made safe', () => {
    it('is written under the track’s prefixed name, and titled as typed', async () => {
      const { split, exporter } = setUp()
      split.setTrackNamePrefix('set-')
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm('...')

      expect(filesOf(folder)).toEqual(['set-02.m4a'])
      expect(cutTrack).toHaveBeenCalledWith(
        expect.objectContaining({ tags: { title: '...', track: '2/3', album: 'Evening Set' } }),
      )
      expect(trackOf(split, 2).ownName).toBe('...')
    })
  })

  describe('a name that is taken', () => {
    it('takes (2), then (3), when the same track is exported again', async () => {
      const { split, exporter } = setUp()

      for (let times = 0; times < 3; times++) {
        exporter.openTrack(trackOf(split, 2))
        await exporter.confirm('Chorus')
      }

      expect(filesOf(folder)).toEqual(['Chorus.m4a', 'Chorus (2).m4a', 'Chorus (3).m4a'])
      expect(exporter.savedFile).toBe('Chorus (3).m4a')
    })

    it('never overwrites a file that was in the folder already', async () => {
      const { split, exporter } = setUp()
      folder.files.set('Chorus.m4a', Uint8Array.of(9))
      exporter.openTrack(trackOf(split, 2))

      await exporter.confirm('Chorus')

      expect(folder.files.get('Chorus.m4a')).toEqual(Uint8Array.of(9))
      expect(exporter.savedFile).toBe('Chorus (2).m4a')
    })
  })

  describe('a range', () => {
    it('is written as "<name>.ext" with the name as title, the stem as album and no track', async () => {
      const { exporter } = setUp()
      exporter.openRange({ startSeconds: 10, endSeconds: 40 })

      await exporter.confirm('My chorus')

      expect(cutTrack).toHaveBeenCalledExactlyOnceWith({
        startSeconds: 10,
        endSeconds: 40,
        tags: { title: 'My chorus', track: null, album: 'Evening Set' },
      })
      expect(filesOf(folder)).toEqual(['My chorus.m4a'])
      expect(exporter.savedFile).toBe('My chorus.m4a')
    })

    it('renames no track', async () => {
      const { split, exporter } = setUp()
      split.selectTrack(trackOf(split, 2))
      exporter.openRange({ startSeconds: 22, endSeconds: 40 })

      await exporter.confirm('Anything at all')

      expect(split.editCount).toBe(0)
      expect(split.tracks.map((track) => track.ownName)).toEqual([null, null, null])
    })

    it('goes to the folder the tracks go to, and takes (2) like a track', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      exporter.openRange({ startSeconds: 10, endSeconds: 40 })
      await exporter.confirm('Clip')
      exporter.openRange({ startSeconds: 10, endSeconds: 40 })
      await exporter.confirm('Clip')

      expect(picker).toHaveBeenCalledOnce()
      expect(filesOf(folder)).toEqual(['One.m4a', 'Clip.m4a', 'Clip (2).m4a'])
    })
  })

  describe('the run', () => {
    it('shows running while the file is cut and written, then saved', async () => {
      const { split, exporter } = setUp()
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      exporter.openTrack(trackOf(split, 1))

      const run = exporter.confirm('One')
      await flush()
      expect(exporter.status).toBe('running')
      expect(exporter.isRunning).toBe(true)

      cut.resolve(bytesOf(1))
      await run
      expect(exporter.status).toBe('saved')
      expect(exporter.isRunning).toBe(false)
    })

    it('ignores a second confirmation while it runs', async () => {
      const { split, exporter } = setUp()
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      exporter.openTrack(trackOf(split, 1))

      const run = exporter.confirm('One')
      await flush()
      await exporter.confirm('One')
      cut.resolve(bytesOf(1))
      await run

      expect(cutTrack).toHaveBeenCalledOnce()
      expect(folder.files.size).toBe(1)
    })

    it('stops the cut on cancel, writes nothing and closes the dialog', async () => {
      const { split, exporter } = setUp()
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      exporter.openTrack(trackOf(split, 1))
      const run = exporter.confirm('One')
      await flush()

      exporter.cancel()
      expect(stopCuts).toHaveBeenCalledOnce()
      // ffmpeg's stop rejects the cut like any failure.
      cut.reject(new Error('The export was stopped'))
      await run

      expect(exporter.status).toBe('idle')
      expect(exporter.failure).toBeNull()
      expect(folder.files.size).toBe(0)
    })

    it('writes nothing for a cancel that came as the cut ended', async () => {
      const { split, exporter } = setUp()
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      exporter.openTrack(trackOf(split, 1))
      const run = exporter.confirm('One')
      await flush()

      exporter.cancel()
      cut.resolve(bytesOf(1))
      await run

      expect(exporter.status).toBe('idle')
      expect(folder.files.size).toBe(0)
    })

    it('is too late once the file is being written: no cut is stopped and the file is saved', async () => {
      const { split, exporter } = setUp()
      const gate = deferred<undefined>()
      const getFileHandle = folder.getFileHandle.bind(folder)
      vi.spyOn(folder, 'getFileHandle').mockImplementation(async (name, options) => {
        await gate.promise
        return getFileHandle(name, options)
      })
      exporter.openTrack(trackOf(split, 1))
      const run = exporter.confirm('One')
      await flush()

      exporter.cancel()
      gate.resolve(undefined)
      await run

      expect(stopCuts).not.toHaveBeenCalled()
      expect(exporter.status).toBe('saved')
      expect(folder.files.size).toBe(1)
    })

    it('stops a cut that is asked for right after a cancel, however early the cancel came', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      // The folder is remembered from a first export, so the second has no picker to wait for.
      await exporter.confirm('Zero')
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      exporter.openTrack(trackOf(split, 1))

      const run = exporter.confirm('One')
      // The cut is asked for in the same turn as the run starts, so a cancel has one to stop.
      expect(cutTrack).toHaveBeenCalledTimes(2)
      exporter.cancel()
      expect(stopCuts).toHaveBeenCalledOnce()
      cut.reject(new Error('stopped'))
      await run

      expect(exporter.status).toBe('idle')
    })

    it('can run again after a cancel', async () => {
      const { split, exporter } = setUp()
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      exporter.openTrack(trackOf(split, 1))
      const run = exporter.confirm('One')
      await flush()
      exporter.cancel()
      cut.reject(new Error('stopped'))
      await run

      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      expect(exporter.status).toBe('saved')
    })

    it('does nothing on cancel when nothing runs', () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))

      exporter.cancel()

      expect(stopCuts).not.toHaveBeenCalled()
      expect(exporter.status).toBe('naming')
    })
  })

  describe('a failure', () => {
    it('shows the reason when the cut fails, and leaves the name to confirm again', async () => {
      const { split, exporter } = setUp()
      cutTrack.mockRejectedValueOnce(new Error('Invalid data found'))
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('One')

      expect(exporter.status).toBe('failed')
      expect(exporter.failure).toBe('Invalid data found')
      expect(folder.files.size).toBe(0)

      await exporter.confirm('One')
      expect(exporter.status).toBe('saved')
      expect(exporter.failure).toBeNull()
    })

    it('aborts the file it was writing and removes the empty file it made, so none stays', async () => {
      const { split, exporter } = setUp()
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
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('One')

      expect(exporter.status).toBe('failed')
      expect(exporter.failure).toBe('Disk full')
      expect(folder.log.slice(-2)).toEqual(['abort One.m4a', 'remove One.m4a'])
      expect(folder.files.size).toBe(0)
      create.mockRestore()
    })

    it('is shown with no saved line', async () => {
      const { split, exporter } = setUp()
      cutTrack.mockRejectedValueOnce(new Error('boom'))
      exporter.openTrack(trackOf(split, 1))

      await exporter.confirm('One')

      expect(exporter.savedFile).toBeNull()
    })
  })

  describe('the saved line', () => {
    it('holds the file and folder names until it is dismissed', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      expect(exporter.status).toBe('saved')
      exporter.dismissSaved()

      expect(exporter.status).toBe('idle')
      expect(exporter.savedFile).toBeNull()
    })

    it('does not close a dialog that is open', () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))

      exporter.dismissSaved()

      expect(exporter.status).toBe('naming')
    })

    it('goes when another export is opened', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      exporter.openTrack(trackOf(split, 2))

      expect(exporter.status).toBe('naming')
      expect(exporter.savedFile).toBeNull()
    })
  })

  describe('with the full export', () => {
    it('is not opened while the full export runs', async () => {
      const { split, exporter } = setUp()
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      const full = useExportTracksStore()
      const run = full.start()
      await flush()

      exporter.openTrack(trackOf(split, 1))
      exporter.openRange({ startSeconds: 10, endSeconds: 40 })
      expect(exporter.status).toBe('idle')

      cut.resolve(bytesOf(1))
      await run
    })

    it('does not start while a single export runs', async () => {
      const { split, exporter } = setUp()
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      exporter.openTrack(trackOf(split, 1))
      const run = exporter.confirm('One')
      await flush()

      const full = useExportTracksStore()
      await full.start()

      expect(full.status).toBe('idle')
      expect(picker).toHaveBeenCalledOnce()

      cut.resolve(bytesOf(1))
      await run
    })

    it('does not confirm while the full export runs, and the dialog stays open', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      const cut = deferred<Uint8Array>()
      cutTrack.mockReturnValueOnce(cut.promise)
      const full = useExportTracksStore()
      const run = full.start()
      await flush()

      await exporter.confirm('One')
      expect(exporter.status).toBe('naming')
      expect(cutTrack).toHaveBeenCalledOnce()

      cut.resolve(bytesOf(1))
      await run
    })

    it('lets the full export start again once a single export is over', async () => {
      const { split, exporter } = setUp()
      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      const full = useExportTracksStore()
      await full.start()

      expect(full.status).toBe('done')
    })

    it('lets a single export run again after the full export ends', async () => {
      const { split, exporter } = setUp()
      await useExportTracksStore().start()

      exporter.openTrack(trackOf(split, 1))
      await exporter.confirm('One')

      expect(exporter.status).toBe('saved')
    })
  })
})
