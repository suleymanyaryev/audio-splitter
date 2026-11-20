import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { MAX_TRACK_NAME_LENGTH } from '@/entities/split/config/track-name.ts'
import { useSplitStore, type Track } from '@/entities/split/model/split.ts'
import { pickExportFolder, type ExportFolder } from '../api/export-folder.ts'
import { writeFile } from '../api/write-file.ts'
import { freeFileName } from '../lib/free-file-name.ts'
import { messageOf } from '../lib/message-of.ts'
import { padTrackNumber } from '../lib/pad-track-number.ts'
import { rangeDefaultName } from '../lib/range-default-name.ts'
import { rangeFileName } from '../lib/range-file-name.ts'
import { rangeTags } from '../lib/range-tags.ts'
import { sourceStem } from '../lib/source-stem.ts'
import { trackFileName } from '../lib/track-file-name.ts'
import { trackTags } from '../lib/track-tags.ts'
import { useExportLockStore } from './export-lock.ts'

// What one single export writes, as it was when the dialog opened.
type Subject =
  | {
      kind: 'track'
      number: number
      count: number
      // The user's own name for the track, null while it has none.
      ownName: string | null
      // The split where the track starts, null for the first track: what `renameTrack` takes.
      startSplitId: number | null
      startSeconds: number
      endSeconds: number | undefined
    }
  | { kind: 'range'; startSeconds: number; endSeconds: number }

/*
Single export (GLOSSARY.md): one track or the range written as one file under a name the user
confirms, straight into a folder the user picks once per file. It sits beside the full export,
`export-tracks.ts`, and shares its file writing and its track file names and tags.

`openTrack` and `openRange` open the name dialog (`status` is `naming`) with the default name;
`confirm` takes the typed name and runs: the folder is asked for if none is remembered (a closed
picker leaves the dialog open), the track is renamed if the name changed, then the file is cut and
written under a name free in the folder (`name (2)` when it is taken). It ends `saved`, with the
file and folder names for the line the view shows, `failed`, with the reason, the dialog still
open to confirm again, or `idle` after a cancel. The folder is forgotten when the source file
changes. The page stops the sound before it calls `confirm`: the store cannot import the player.
*/
export const useExportSingleStore = defineStore('export-single', () => {
  const sourceFile = useSourceFileStore()
  const splitStore = useSplitStore()
  const lock = useExportLockStore()

  const status = ref<'idle' | 'naming' | 'running' | 'saved' | 'failed'>('idle')
  const subjectOf = ref<Subject | null>(null)
  const subject = computed(() => subjectOf.value?.kind ?? null)
  const defaultName = ref('')
  // The remembered folder's handle is no reactive state: Vue would wrap it in a proxy.
  let folder: ExportFolder | null = null
  const folderName = ref<string | null>(null)
  const savedFile = ref<string | null>(null)
  const savedFolderName = ref<string | null>(null)
  const failure = ref<string | null>(null)
  const isRunning = computed(() => status.value === 'running')

  // Set by `cancel`: ffmpeg's stop rejects the cut like a failure, and this tells the two apart.
  let wasCancelled = false

  // A new file starts with no folder, so one file's tracks never land in another's.
  watch(
    () => sourceFile.file,
    () => {
      folder = null
      folderName.value = null
      if (status.value !== 'running') status.value = 'idle'
    },
  )

  function open(next: Subject, name: string) {
    if (lock.isHeld || status.value === 'running') return
    subjectOf.value = next
    defaultName.value = name
    savedFile.value = null
    savedFolderName.value = null
    failure.value = null
    status.value = 'naming'
  }

  function openTrack(track: Track) {
    const { file } = sourceFile
    if (file === null) return
    const tracks = splitStore.tracks
    const ownName = track.startSplit === null ? splitStore.firstTrackName : track.startSplit.name
    open(
      {
        kind: 'track',
        number: track.number,
        count: tracks.length,
        ownName,
        startSplitId: track.startSplit?.id ?? null,
        startSeconds: track.startSeconds,
        endSeconds: tracks[track.number]?.startSeconds,
      },
      ownName ?? `${sourceStem(file.name)} ${padTrackNumber(track.number, tracks.length)}`,
    )
  }

  function openRange(range: TimeRange) {
    const { file } = sourceFile
    if (file === null) return
    open({ kind: 'range', ...range }, rangeDefaultName(sourceStem(file.name), range))
  }

  // Closes the dialog, whatever it shows, unless the file is being written.
  function close() {
    if (status.value === 'running') return
    status.value = 'idle'
    subjectOf.value = null
    failure.value = null
  }

  // Takes the line away: the next press or key in the view, a view switch or a selection change.
  function dismissSaved() {
    if (status.value !== 'saved') return
    status.value = 'idle'
    savedFile.value = null
    savedFolderName.value = null
  }

  function fail(error: unknown) {
    failure.value = messageOf(error)
    status.value = 'failed'
  }

  /*
  Asks for a folder and remembers it. Null when the user closed the picker (nothing changes) or
  when the picker failed, which is then the failure shown.
  */
  async function pick(): Promise<ExportFolder | null> {
    try {
      const picked = await pickExportFolder()
      if (picked === null) return null
      folder = picked
      folderName.value = picked.name
      return picked
    } catch (error) {
      fail(error)
      return null
    }
  }

  async function changeFolder() {
    if ((status.value !== 'naming' && status.value !== 'failed') || lock.isHeld) return
    lock.take('single')
    try {
      await pick()
    } finally {
      lock.release('single')
    }
  }

  // The file name, free in the folder: the full export's for a track, `<name>.ext` for a range.
  async function fileNameFor(
    target: Subject,
    name: string,
    where: ExportFolder,
    extension: string,
  ): Promise<string> {
    const wanted =
      target.kind === 'range'
        ? rangeFileName({ name, extension })
        : trackFileName({ ...target, name: trackNameOf(target, name), extension })
    const taken = new Set<string>()
    for await (const entry of where.keys()) taken.add(entry)
    return freeFileName(wanted, taken)
  }

  // The name the track has once confirmed: its own, or none for an unnamed track left as offered.
  function trackNameOf(target: Subject & { kind: 'track' }, name: string): string | null {
    return name === defaultName.value ? target.ownName : name
  }

  async function confirm(typed: string) {
    const target = subjectOf.value
    const { file, format } = sourceFile
    const name = typed.trim().slice(0, MAX_TRACK_NAME_LENGTH)
    const canConfirm = status.value === 'naming' || status.value === 'failed'
    if (
      target === null ||
      file === null ||
      format === null ||
      !canConfirm ||
      name === '' ||
      lock.isHeld
    )
      return
    lock.take('single')
    wasCancelled = false
    try {
      const where = folder ?? (await pick())
      // Closed, or failed: the dialog stays, and the name is not taken yet.
      if (where === null) return

      status.value = 'running'
      failure.value = null
      const stem = sourceStem(file.name)

      let tags
      if (target.kind === 'track') {
        const trackName = trackNameOf(target, name)
        if (name !== defaultName.value) splitStore.renameTrack(target.startSplitId, name)
        tags = trackTags({ ...target, name: trackName, sourceStem: stem })
      } else {
        tags = rangeTags({ name, sourceStem: stem })
      }

      try {
        const fileName = await fileNameFor(target, name, where, format)
        let bytes: Uint8Array | null = await sourceFile.cutTrack({
          startSeconds: target.startSeconds,
          endSeconds: target.endSeconds,
          tags,
        })
        // A cancel that came as the cut ended: the file is not written.
        if (wasCancelled) {
          status.value = 'idle'
          return
        }
        await writeFile(where, fileName, bytes)
        bytes = null
        savedFile.value = fileName
        savedFolderName.value = where.name
        status.value = 'saved'
      } catch (error) {
        if (wasCancelled) status.value = 'idle'
        else fail(error)
      }
    } finally {
      lock.release('single')
    }
  }

  function cancel() {
    if (status.value !== 'running') return
    wasCancelled = true
    sourceFile.stopCuts()
  }

  return {
    status,
    subject,
    defaultName,
    folderName,
    savedFile,
    savedFolderName,
    failure,
    isRunning,
    openTrack,
    openRange,
    changeFolder,
    confirm,
    cancel,
    close,
    dismissSaved,
  }
})
