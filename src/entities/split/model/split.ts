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
// Splits sit on the same 10 ms grid the arrow keys and a drag step in.
const GRID_STEPS_PER_SECOND = 100

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

// Which view the zoom panel shows: the 20 s zoom view, the Track view or the Range view (GLOSSARY.md).
export type PanelView = 'split' | 'track' | 'range'

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
number from their position. Removing a track deletes the splits at both its ends, which is two
deletes with the names and edits of a delete. Every change of a setting replaces all splits and all names.

One selection (`Selection`) holds what is under review: a split, a track or nothing. The selected
split, its index and the selected track are derived from it, so they follow the splits as they move
(the track is kept by the split where it starts, so only deleting that split moves the key). Every
detection selects the first track and puts the window at the file's start, so a file opens on
track 1, ready to play. The zoom window is
`ZOOM_WINDOW_SECONDS` wide around `zoomCentreSeconds`: selecting a split centres it there and
nothing else moves it except `moveZoomTo`. A split can only be moved inside the window, which never follows the move. A split
is added at the window's centre, and `editCount` says how many things the user changed since the
last detection.

The range (GLOSSARY.md) is view state beside the window's centre: a stretch the user dragged out on
the whole-file view, or none. It belongs to the file, not to the detection, so a setting change and
the edits leave it alone; `reset` clears it. The panel shows the range's view after a new range and
the zoom view again as soon as the user selects a split or moves the window, since both are about
the zoom view; the range stays while the zoom view is shown. The mark is a spot inside the range,
placed by the user, cleared by a new range and kept otherwise; `addSplitAtMark` adds a split there,
and `addSplitAt` at any time (the playhead), without selecting it, so the user stays in the Range view.
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

  // The track the selection keys, from the live tracks: it follows its splits as they move.
  const selectedTrack = computed(() => {
    const current = selection.value
    return current?.kind === 'track'
      ? (tracks.value.find((track) => (track.startSplit?.id ?? null) === current.startSplitId) ??
          null)
      : null
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
    // The first track starts with the file, so it is keyed by no split and exists with no gap too.
    selection.value = { kind: 'track', startSplitId: null }
    // The window starts at 0:00, so the Split view shows the file's opening seconds.
    zoomCentreSeconds.value = ZOOM_WINDOW_SECONDS / 2
    // The Range view keeps the stretch the user is listening to; any other view shows the track.
    if (view.value !== 'range') view.value = 'track'
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
    // The first detection of a file always lands on its first track.
    view.value = 'track'
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
  Selects the track, keyed by the split where it starts (none for the first), and shows the Track
  view. The zoom window stays where it is: the track is no split to centre on. A stale `Track`, whose
  start split is gone, or one before any detection, selects nothing.
  */
  function selectTrack(track: Track) {
    if (timing.value === null) return
    const startSplitId = track.startSplit?.id ?? null
    const isLive =
      startSplitId === null || splits.value.some((candidate) => candidate.id === startSplitId)
    if (!isLive) return
    selection.value = { kind: 'track', startSplitId }
    view.value = 'track'
  }

  function isTrackSelected(track: Track) {
    const current = selection.value
    return current?.kind === 'track' && current.startSplitId === (track.startSplit?.id ?? null)
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

  // A view needs something to show: asked for with no range or no selected track, the panel stays.
  function showView(next: PanelView) {
    if (next === 'range' && range.value === null) return
    if (next === 'track' && selectedTrack.value === null) return
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
  A split at a time, for the user who is listening in the Range view (the playhead): the time is
  rounded to the 10 ms grid first, then held to the same room as any split. It is not selected, so
  the view, the playback and the mark stay as they are.
  */
  function addSplitAt(seconds: number) {
    const onGrid = Math.round(seconds * GRID_STEPS_PER_SECOND) / GRID_STEPS_PER_SECOND
    if (hasRoomFor(onGrid)) insertSplit(onGrid)
  }

  // A split where the mark is.
  function addSplitAtMark() {
    if (markSeconds.value !== null) addSplitAt(markSeconds.value)
  }

  function deleteSplit(id: number) {
    const index = splits.value.findIndex((candidate) => candidate.id === id)
    if (index === -1) return
    const current = selection.value
    const wasSelected = current?.kind === 'split' && current.id === id
    const wasTrackStart = current?.kind === 'track' && current.startSplitId === id
    splits.value.splice(index, 1)
    // A split added and deleted again leaves no edit; a detected one leaves "deleted" for "moved".
    if (!addedIds.value.delete(id)) deletedCount.value++
    movedIds.value.delete(id)
    renamedKeys.value.delete(id)
    // The selected track starts at the deleted split: the merged track starts at the one before it.
    if (wasTrackStart) {
      selection.value = { kind: 'track', startSplitId: splits.value[index - 1]?.id ?? null }
      return
    }
    if (!wasSelected) return
    // The split now at this index is the next one; the last split falls back to the previous.
    const neighbour = splits.value[index] ?? splits.value[index - 1]
    selection.value = neighbour === undefined ? null : { kind: 'split', id: neighbour.id }
    // Not `selectSplit`: a delete is no choice of split, so the Range view stays shown and playing.
    if (neighbour !== undefined) zoomCentreSeconds.value = neighbour.seconds
  }

  /*
  Removes a track (GLOSSARY.md: Removing a track): deletes the splits at both its ends, whichever
  exist, so the track and its neighbours become one. It is `deleteSplit` twice, so the edits and the
  selection follow as a delete's do: the end split goes first, so a selected split at either end of
  the track lands on the split after it, or, for the last track, on the split before it.
  The removed track's name goes with its start split. The next track's name belonged to the end
  split, so when the first track is removed, which has no start split to keep a name on, it moves to
  the file's start (`renameTrack` counts the edit). The only track is refused, as is one whose start
  split is gone, so a stale `Track` removes nothing.
  */
  function removeTrack(track: Track) {
    const startIndex =
      track.startSplit === null
        ? -1
        : splits.value.findIndex((candidate) => candidate.id === track.startSplit?.id)
    if (splits.value.length === 0 || (startIndex === -1 && track.startSplit !== null)) return
    const start = splits.value[startIndex]
    const end = splits.value[startIndex + 1]
    const inheritedName = end?.name ?? null
    if (end !== undefined) deleteSplit(end.id)
    if (start !== undefined) deleteSplit(start.id)
    if (start === undefined) renameTrack(null, inheritedName ?? '')
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
    selectedTrack,
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
    addSplitAt,
    addSplitAtMark,
    deleteSplit,
    removeTrack,
    renameTrack,
    reset,
  }
})
