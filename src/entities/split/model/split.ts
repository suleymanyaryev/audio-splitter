import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { median } from '@/shared/lib/audio/median.ts'
import { DEFAULT_MINIMUM_GAP_SECONDS, DEFAULT_OFFSET_DB } from '../config/defaults.ts'
import { MAX_TRACK_NAME_LENGTH } from '../config/track-name.ts'
import { ZOOM_WINDOW_SECONDS } from '../config/zoom-window.ts'
import { findGaps, splitsOf, type Gap } from '../lib/find-gaps.ts'
import { rangeBetween, type TimeRange } from '../lib/range-between.ts'

/*
A split stays at least this far from its neighbours and from the file's start and end. Moves are
compared with a hair of tolerance, because a split a step away from its limit can sit an ulp off it.
*/
const MINIMUM_DISTANCE_SECONDS = 1
const LIMIT_TOLERANCE = 1e-9

// `id` is stable for the split's life, so a selection and a count of edits can hold it.
// `name` is the name of the track that starts at this split, null while it is unnamed.
export interface Split {
  id: number
  seconds: number
  name: string | null
}

export interface Track {
  number: number
  // The track's own name, or its number while it has none.
  name: string
  startSeconds: number
  lengthSeconds: number
  // The split where the track starts: none for the first track, which starts with the file.
  startSplit: Split | null
}

/*
What the user is reviewing, one thing at a time (GLOSSARY.md: Selected split, Selected track): a
split by its id, a track by the id of the split where it starts (null for the first track, which
starts with the file), or nothing.
*/
type Selection =
  { kind: 'split'; id: number } | { kind: 'track'; startSplitId: number | null } | null

// Which view the zoom panel shows: the 20 s zoom view, or the Range view (GLOSSARY.md: Range).
export type PanelView = 'split' | 'range'

export interface CurveTiming {
  windowSeconds: number
  durationSeconds: number
}

/*
The splits proposed for the source file and the tracks between them. This slice cannot import
`entities/source-file`, so `detect` receives the loudness curve as data and keeps a reference to it
(the page's source-file store owns the array; it is never written to), to find the gaps again when
one of the two settings moves.

A track name belongs to the split where the track starts, and the first track's to the file's
start, so moving or deleting a split keeps the right name with it, and unnamed tracks take their
number from their position. Every change of a setting replaces all splits and all names.

One selection (`Selection`) holds what is under review: a split, a track or nothing. The selected
split and its index are derived from it, so they follow the splits as they move. The zoom window is
`ZOOM_WINDOW_SECONDS` wide around `zoomCentreSeconds`: selecting a split centres it there and
nothing else moves it except `moveZoomTo`. A split can only be moved inside the window, which never follows the move. A split
is added at the window's centre, and `editCount` says how many things the user changed since the
last detection.

The range (GLOSSARY.md) is view state beside the window's centre: a stretch the user dragged out on
the whole-file view, or none. It belongs to the file, not to the detection, so a setting change and
the edits leave it alone; `reset` clears it. The panel shows the range's view after a new range and
the zoom view again as soon as the user selects a split or moves the window, since both are about
the zoom view; the range stays while the zoom view is shown. The mark is a spot inside the range,
placed by the user, cleared by a new range and kept otherwise; `addSplitAtMark` adds a split there
without selecting it, so the user stays in the Range view.
*/
export const useSplitStore = defineStore('split', () => {
  const curve = shallowRef<Float32Array | null>(null)
  const timing = ref<CurveTiming | null>(null)
  // Null until the first detection; from then on a plain value the user moves (ticket 16).
  const silenceThreshold = ref<number | null>(null)
  const minimumGapLength = ref(DEFAULT_MINIMUM_GAP_SECONDS)
  const gaps = ref<Gap[]>([])
  const splits = ref<Split[]>([])
  const firstTrackName = ref<string | null>(null)
  const selection = ref<Selection>(null)
  // With nothing to centre on, the window starts at 0:00.
  const zoomCentreSeconds = ref(ZOOM_WINDOW_SECONDS / 2)
  const range = ref<TimeRange | null>(null)
  // The spot in the range where "Add split" puts a split (GLOSSARY.md), or none.
  const markSeconds = ref<number | null>(null)
  const view = ref<PanelView>('split')
  let nextSplitId = 0
  /*
  What the user changed since the last detection, counted as things changed, not actions: a split
  moved ten times is one edit. The sets hold split ids (a rename is keyed by the split where its
  track starts, null for the file's start); `deletedCount` counts detected splits only, because
  deleting an added split just takes its "added" edit back.
  */
  const movedIds = ref(new Set<number>())
  const addedIds = ref(new Set<number>())
  const renamedKeys = ref(new Set<number | null>())
  const deletedCount = ref(0)

  // The index in `splits` of the selected split, or null when no split is selected.
  const selectedSplitIndex = computed(() => {
    const current = selection.value
    if (current?.kind !== 'split') return null
    const index = splits.value.findIndex((split) => split.id === current.id)
    return index === -1 ? null : index
  })

  const selectedSplit = computed(() =>
    selectedSplitIndex.value === null ? null : (splits.value[selectedSplitIndex.value] ?? null),
  )

  // N splits make N + 1 tracks; with no splits, one track over the whole file.
  const tracks = computed<Track[]>(() => {
    if (timing.value === null) return []
    const { durationSeconds } = timing.value
    const starts = [0, ...splits.value.map((split) => split.seconds)]
    return starts.map((startSeconds, index) => {
      const startSplit = splits.value[index - 1] ?? null
      const endSeconds = starts[index + 1] ?? durationSeconds
      const name =
        (startSplit === null ? firstTrackName.value : startSplit.name) ?? String(index + 1)
      return {
        number: index + 1,
        name,
        startSeconds,
        lengthSeconds: endSeconds - startSeconds,
        startSplit,
      }
    })
  })

  function clearEdits() {
    movedIds.value.clear()
    addedIds.value.clear()
    renamedKeys.value.clear()
    deletedCount.value = 0
  }

  const editCount = computed(
    () => movedIds.value.size + addedIds.value.size + renamedKeys.value.size + deletedCount.value,
  )
  const hasEdits = computed(() => editCount.value > 0)

  /*
  Room for a new split at a time: 1 s from every split and from the file's ends, as `moveSplit`
  keeps them.
  */
  function hasRoomFor(seconds: number) {
    if (timing.value === null) return false
    const isClearOf = (other: number) =>
      Math.abs(other - seconds) >= MINIMUM_DISTANCE_SECONDS - LIMIT_TOLERANCE
    // The window is not clamped to the file, so its centre can lie outside it.
    const isInside = seconds > 0 && seconds < timing.value.durationSeconds
    return (
      isInside &&
      isClearOf(0) &&
      isClearOf(timing.value.durationSeconds) &&
      splits.value.every((split) => isClearOf(split.seconds))
    )
  }

  // "Add split" in the zoom view puts the split at the window's centre.
  const canAddSplit = computed(() => hasRoomFor(zoomCentreSeconds.value))

  // "Add split" in the Range view puts it at the mark, when there is one.
  const canAddSplitAtMark = computed(
    () => markSeconds.value !== null && hasRoomFor(markSeconds.value),
  )

  // Finds the gaps again and replaces all splits and all track names with the proposed ones.
  function findAgain() {
    if (curve.value === null || timing.value === null || silenceThreshold.value === null) return
    gaps.value = findGaps(curve.value, {
      ...timing.value,
      silenceThreshold: silenceThreshold.value,
      minimumGapLength: minimumGapLength.value,
    })
    splits.value = splitsOf(gaps.value).map((seconds) => ({
      id: nextSplitId++,
      seconds,
      name: null,
    }))
    firstTrackName.value = null
    clearEdits()
    const first = splits.value[0]
    selection.value = first === undefined ? null : { kind: 'split', id: first.id }
    zoomCentreSeconds.value = first?.seconds ?? ZOOM_WINDOW_SECONDS / 2
  }

  /*
  Once per file, when its analysis ends: both settings start at their defaults, the threshold
  relative to this file's median and rounded to the Slider's 0.1 dB step, so the readout, the thumb
  and the detection agree.
  */
  function detect(loudness: Float32Array, curveTiming: CurveTiming) {
    curve.value = loudness
    timing.value = curveTiming
    silenceThreshold.value = Math.round((median(loudness) - DEFAULT_OFFSET_DB) * 10) / 10
    minimumGapLength.value = DEFAULT_MINIMUM_GAP_SECONDS
    findAgain()
  }

  function setSilenceThreshold(decibels: number) {
    silenceThreshold.value = decibels
    findAgain()
  }

  function setMinimumGapLength(seconds: number) {
    minimumGapLength.value = seconds
    findAgain()
  }

  function selectSplit(id: number) {
    const split = splits.value.find((candidate) => candidate.id === id)
    if (split === undefined) return
    selection.value = { kind: 'split', id: split.id }
    zoomCentreSeconds.value = split.seconds
    view.value = 'split'
  }

  /*
  A track starts at a split, so selecting the track selects that split. The first starts with the
  file: it has no split to select.
  */
  function selectTrack(track: Track) {
    if (track.startSplit !== null) selectSplit(track.startSplit.id)
  }

  function isTrackSelected(track: Track) {
    const current = selection.value
    return (
      track.startSplit !== null && current?.kind === 'split' && track.startSplit.id === current.id
    )
  }

  // A click on empty ground in the whole-file view: the window goes there, with nothing selected.
  function moveZoomTo(seconds: number) {
    zoomCentreSeconds.value = seconds
    selection.value = null
    view.value = 'split'
  }

  /*
  Makes the range the user dragged from `anchorSeconds` (where the press began) to `pointerSeconds`,
  held to the file and to 10 min from the anchor. A range under 1 s is refused (false) and the one
  held stays: the caller treats the drag as a click.
  */
  function setRange(anchorSeconds: number, pointerSeconds: number) {
    if (timing.value === null) return false
    const made = rangeBetween(anchorSeconds, pointerSeconds, timing.value.durationSeconds)
    if (made === null) return false
    range.value = made
    // A mark belongs to the range it was placed in.
    markSeconds.value = null
    view.value = 'range'
    return true
  }

  // Places the mark, held inside the range: a split is never added outside the stretch on show.
  function placeMark(seconds: number) {
    if (range.value === null) return
    markSeconds.value = Math.min(
      Math.max(seconds, range.value.startSeconds),
      range.value.endSeconds,
    )
  }

  // The Range view needs a range to show: asked for with none, the panel stays where it is.
  function showView(next: PanelView) {
    if (next === 'range' && range.value === null) return
    view.value = next
  }

  /*
  Moves a split to `seconds`, held to the nearest limit: 1 s from its neighbours and from the
  file's ends, and inside the zoom window. A split already outside its limits (it is not in the
  window, or its neighbours are too close for both) stays where it is rather than jumping.
  */
  function moveSplit(id: number, seconds: number) {
    const index = splits.value.findIndex((candidate) => candidate.id === id)
    const split = splits.value[index]
    if (split === undefined || timing.value === null) return
    const previous = splits.value[index - 1]?.seconds ?? 0
    const next = splits.value[index + 1]?.seconds ?? timing.value.durationSeconds
    const halfWindow = ZOOM_WINDOW_SECONDS / 2
    const lowest = Math.max(
      previous + MINIMUM_DISTANCE_SECONDS,
      zoomCentreSeconds.value - halfWindow,
    )
    const highest = Math.min(next - MINIMUM_DISTANCE_SECONDS, zoomCentreSeconds.value + halfWindow)
    if (split.seconds < lowest - LIMIT_TOLERANCE || split.seconds > highest + LIMIT_TOLERANCE)
      return
    const moved = Math.min(Math.max(seconds, lowest), highest)
    if (moved === split.seconds) return
    split.seconds = moved
    // A split the user added is one edit already.
    if (!addedIds.value.has(id)) movedIds.value.add(id)
  }

  // The new split is unnamed, so its track takes its number from its place.
  function insertSplit(seconds: number) {
    const index = splits.value.findIndex((candidate) => candidate.seconds > seconds)
    const split: Split = { id: nextSplitId++, seconds, name: null }
    splits.value.splice(index === -1 ? splits.value.length : index, 0, split)
    addedIds.value.add(split.id)
    return split
  }

  function addSplit() {
    if (!canAddSplit.value) return
    selectSplit(insertSplit(zoomCentreSeconds.value).id)
  }

  /*
  A split where the mark is, for the user who is listening in the Range view: it is not selected,
  so the view, the playback and the mark stay as they are.
  */
  function addSplitAtMark() {
    if (markSeconds.value === null || !canAddSplitAtMark.value) return
    insertSplit(markSeconds.value)
  }

  function deleteSplit(id: number) {
    const index = splits.value.findIndex((candidate) => candidate.id === id)
    if (index === -1) return
    const current = selection.value
    const wasSelected = current?.kind === 'split' && current.id === id
    splits.value.splice(index, 1)
    // A split added and deleted again leaves no edit; a detected one leaves "deleted" for "moved".
    if (!addedIds.value.delete(id)) deletedCount.value++
    movedIds.value.delete(id)
    renamedKeys.value.delete(id)
    if (!wasSelected) return
    // The split now at this index is the next one; the last split falls back to the previous.
    const neighbour = splits.value[index] ?? splits.value[index - 1]
    selection.value = neighbour === undefined ? null : { kind: 'split', id: neighbour.id }
    // Not `selectSplit`: a delete is no choice of split, so the Range view stays shown and playing.
    if (neighbour !== undefined) zoomCentreSeconds.value = neighbour.seconds
  }

  /*
  Names the track that starts at the split `startSplitId`, or the first track with null. Whatever is
  typed is valid: an empty name means "use the number".
  */
  function renameTrack(startSplitId: number | null, name: string) {
    const stored = name.trim().slice(0, MAX_TRACK_NAME_LENGTH) || null
    const split =
      startSplitId === null ? null : splits.value.find((candidate) => candidate.id === startSplitId)
    if (split === undefined) return
    const current = split === null ? firstTrackName.value : split.name
    if (stored === current) return
    if (split === null) firstTrackName.value = stored
    else split.name = stored
    // Detection leaves every track unnamed, so a track named back to its number is no edit.
    if (stored === null) renamedKeys.value.delete(startSplitId)
    else renamedKeys.value.add(startSplitId)
  }

  function reset() {
    curve.value = null
    timing.value = null
    silenceThreshold.value = null
    minimumGapLength.value = DEFAULT_MINIMUM_GAP_SECONDS
    gaps.value = []
    splits.value = []
    firstTrackName.value = null
    clearEdits()
    selection.value = null
    zoomCentreSeconds.value = ZOOM_WINDOW_SECONDS / 2
    range.value = null
    markSeconds.value = null
    view.value = 'split'
    nextSplitId = 0
  }

  return {
    silenceThreshold,
    minimumGapLength,
    gaps,
    splits,
    firstTrackName,
    selection,
    selectedSplit,
    selectedSplitIndex,
    zoomCentreSeconds,
    range,
    markSeconds,
    view,
    canAddSplit,
    canAddSplitAtMark,
    editCount,
    hasEdits,
    tracks,
    detect,
    setSilenceThreshold,
    setMinimumGapLength,
    selectSplit,
    selectTrack,
    isTrackSelected,
    moveZoomTo,
    setRange,
    placeMark,
    showView,
    moveSplit,
    addSplit,
    addSplitAtMark,
    deleteSplit,
    renameTrack,
    reset,
  }
})
