import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { exportFolderName } from '../lib/export-folder-name.ts'
import type { ExportFailure } from '../lib/export-summary.ts'
import { pickExportFolder, type ExportFolder } from '../api/export-folder.ts'
import { sourceStem } from '../lib/source-stem.ts'
import { trackFileName } from '../lib/track-file-name.ts'
import { trackTags } from '../lib/track-tags.ts'

// One track to write, with the name the user gave it (null while it has none).
interface PlannedTrack {
  number: number
  name: string | null
  startSeconds: number
  endSeconds: number | undefined
}

// A DOMException (what the picker and the writable reject with) is no `Error` in every realm.
function messageOf(error: unknown): string {
  const hasMessage = typeof error === 'object' && error !== null && 'message' in error
  return String(hasMessage ? error.message : error)
}

// Waits for a clean-up step, whatever its outcome: it must not hide the failure that caused it.
async function bestEffort(step: Promise<unknown> | undefined) {
  try {
    await step
  } catch {
    // Nothing more can be done about it.
  }
}

/*
Writes one track into the folder. Chrome makes the file, empty, as soon as it is asked for, and
only a closed writable fills it, so a failure aborts the writable and then removes that empty
file: a failed export leaves whole tracks only (ticket 08). The app deletes nothing of the
user's here: the file is one it made a moment ago, in the subfolder it made for this export.
*/
async function writeTrack(folder: ExportFolder, fileName: string, bytes: Uint8Array) {
  const handle = await folder.getFileHandle(fileName, { create: true })
  let writable: Awaited<ReturnType<typeof handle.createWritable>> | undefined
  try {
    writable = await handle.createWritable()
    await writable.write(bytes)
    await writable.close()
  } catch (error) {
    // The write's own failure is the one to report, so the clean-up's own failures are let go.
    await bestEffort(writable?.abort())
    await bestEffort(folder.removeEntry(fileName))
    throw error
  }
}

/*
Export (GLOSSARY.md): every track as its own file, in a new subfolder of the folder the user picks
(ticket 08). The picker opens on every export; the subfolder is named after the source file and
never overwrites anything (`name (2)`). Tracks are cut one at a time, each written and dropped
before the next is cut, so one track is in memory at most.

The state is what the overlay shows: `status`, the track in hand and the count, the tracks saved,
the folder and, after a failure, the track that failed. Cancel stops ffmpeg and starts no further
track; the tracks already closed stay on disk.
*/
export const useExportTracksStore = defineStore('export-tracks', () => {
  const sourceFile = useSourceFileStore()
  const splitStore = useSplitStore()

  const status = ref<'idle' | 'running' | 'done' | 'cancelled' | 'failed'>('idle')
  // The track being cut and written, from 1; 0 until an export starts.
  const trackNumber = ref(0)
  const trackCount = ref(0)
  const savedCount = ref(0)
  // The subfolder's name as it was created, null until it exists.
  const folderName = ref<string | null>(null)
  const failure = ref<ExportFailure | null>(null)
  const isRunning = computed(() => status.value === 'running')

  /*
  Set by `cancel`. ffmpeg's stop rejects the cut like any failure, and a press between two tracks
  stops nothing at all, so this flag is what tells the loop a cancel from a real failure.
  */
  let wasCancelled = false
  // Also true while the picker is open, when the status is still idle.
  let isBusy = false

  // Ends the export as failed; `track` is null when it was no track that failed.
  function fail(track: PlannedTrack | null, error: unknown) {
    failure.value = {
      track: track === null ? null : { number: track.number, name: track.name },
      message: messageOf(error),
    }
    status.value = 'failed'
  }

  // The tracks as they are when the export starts; an edit made later cannot change a run.
  function planTracks(): PlannedTrack[] {
    const tracks = splitStore.tracks
    return tracks.map((track, index) => ({
      number: track.number,
      // The user's own name: `track.name` falls back to the number, which is no name.
      name: track.startSplit === null ? splitStore.firstTrackName : track.startSplit.name,
      startSeconds: track.startSeconds,
      endSeconds: tracks[index + 1]?.startSeconds,
    }))
  }

  async function createSubfolder(parent: ExportFolder, stem: string) {
    const taken = new Set<string>()
    for await (const name of parent.keys()) taken.add(name)
    const name = exportFolderName(stem, taken)
    const folder = await parent.getDirectoryHandle(name, { create: true })
    folderName.value = name
    return folder
  }

  async function exportTracks(
    folder: ExportFolder,
    tracks: PlannedTrack[],
    stem: string,
    extension: string,
  ) {
    for (const track of tracks) {
      if (wasCancelled) break
      trackNumber.value = track.number
      try {
        let bytes: Uint8Array | null = await sourceFile.cutTrack({
          startSeconds: track.startSeconds,
          endSeconds: track.endSeconds,
          tags: trackTags({ ...track, count: tracks.length, sourceStem: stem }),
        })
        // A cancel that came as the cut ended: the track is not written.
        if (wasCancelled) break
        await writeTrack(
          folder,
          trackFileName({ ...track, count: tracks.length, extension }),
          bytes,
        )
        // Dropped before the next cut starts.
        bytes = null
        savedCount.value++
      } catch (error) {
        if (wasCancelled) break
        fail(track, error)
        return
      }
    }
    status.value = wasCancelled ? 'cancelled' : 'done'
  }

  async function start() {
    const { file, format } = sourceFile
    if (file === null || format === null || isBusy || sourceFile.status !== 'ready') return
    isBusy = true
    wasCancelled = false
    try {
      let picked: ExportFolder | null
      try {
        picked = await pickExportFolder()
      } catch (error) {
        fail(null, error)
        return
      }
      // The user closed the picker: nothing was asked for, so nothing is shown.
      if (picked === null) return

      const tracks = planTracks()
      const stem = sourceStem(file.name)
      status.value = 'running'
      trackNumber.value = tracks[0]?.number ?? 0
      trackCount.value = tracks.length
      savedCount.value = 0
      folderName.value = null
      failure.value = null

      let folder: ExportFolder
      try {
        folder = await createSubfolder(picked, stem)
      } catch (error) {
        fail(null, error)
        return
      }
      await exportTracks(folder, tracks, stem, format)
    } finally {
      isBusy = false
    }
  }

  function cancel() {
    if (status.value !== 'running') return
    wasCancelled = true
    sourceFile.stopCuts()
  }

  // Closes the summary: the page may export again.
  function dismiss() {
    if (status.value === 'running') return
    status.value = 'idle'
    failure.value = null
  }

  return {
    status,
    trackNumber,
    trackCount,
    savedCount,
    folderName,
    failure,
    isRunning,
    start,
    cancel,
    dismiss,
  }
})
