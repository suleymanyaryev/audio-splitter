import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'

import { median } from '@/shared/lib/audio/median.ts'
import { DEFAULT_MINIMUM_GAP_SECONDS, DEFAULT_OFFSET_DB } from '../config/defaults.ts'
import { MAX_TRACK_NAME_LENGTH } from '../config/track-name.ts'
import { ZOOM_WINDOW_SECONDS } from '../config/zoom-window.ts'
import { findGaps, splitsOf, type Gap } from '../lib/find-gaps.ts'
import { defaultTrackName } from '../lib/default-track-name.ts'
import { rangeBetween, type TimeRange } from '../lib/range-between.ts'

/*
A split stays at least this far from its neighbours and from the file's start and end. Moves are
compared with a hair of tolerance, because a split a step away from its limit can sit an ulp off it.
*/
const MINIMUM_DISTANCE_SECONDS = 1
const LIMIT_TOLERANCE = 1e-9
// Splits sit on the same 10 ms grid the arrow keys and a drag step in.
const GRID_STEPS_PER_SECOND = 100

function snapToGrid(seconds: number) {
  return Math.round(seconds * GRID_STEPS_PER_SECOND) / GRID_STEPS_PER_SECOND
}

// `id` is stable for the split's life, so a selection and a count of edits can hold it.
// `name` is the name of the track that starts at this split, null while it is unnamed.
export interface Split {
  id: number
  seconds: number
  name: string | null
}

export interface Track {
  number: number
  // The name the user typed, null while the track is unnamed.
  ownName: string | null
  // The name shown: the own name, or the number while the track has none.
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
start, so moving or deleting a split keeps the right name with it, and an unnamed track shows the
track name prefix followed by its padded number, from its position. Removing a track deletes the
splits at both its ends, which is two deletes with the names and edits of a delete. Every change of
a setting replaces all splits and all names.

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
  /*
  The track name prefix (GLOSSARY.md): file-level state, so no edit, no setting change and no
  detection touches it. The page sets it once per file; `reset` clears it.
  */
  const trackNamePrefix = ref('')
  const selection = ref<Selection>(null)
  // With nothing to centre on, the window starts at 0:00.
  const zoomCentreSeconds = ref(ZOOM_WINDOW_SECONDS / 2)
  const range = ref<TimeRange | null>(null)
  // The spot in the range where "Add split" puts a split (GLOSSARY.md), or none.
  const markSeconds = ref<number | null>(null)
  // The Track view's own mark, inside the selected track, or none (see `trackSpan` below).
  const trackMarkSeconds = ref<number | null>(null)
  /*
  The pending splits of the selected track (GLOSSARY.md), in time order, each on the 10 ms grid, and
  the one the user selected, or none. A pending split has no id: it never moves, so its time is it.
  */
  const pendingSeconds = ref<number[]>([])
  const selectedPendingSeconds = ref<number | null>(null)
  /*
  The open question, or none: an action that would empty a non-empty pending list is held here with
  the number of pending splits it would lose, until `applyFirst`, `discardPending` or
  `cancelDiscard` answers it. The held action is a closure, so it is no state a widget reads.
  */
  const discardQuestion = ref<{ pendingCount: number } | null>(null)
  let heldAction: (() => void) | null = null
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
      const ownName = startSplit === null ? firstTrackName.value : startSplit.name
      return {
        number: index + 1,
        ownName,
        name: ownName ?? defaultTrackName(trackNamePrefix.value, index + 1, starts.length),
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

  /*
  The two splits that bound the selected track, the ones that exist: the first track has no start
  split and the last no end split. They are what a double-click in the Track view can reach.
  */
  const selectedTrackEndSplits = computed(() => {
    const track = selectedTrack.value
    if (track === null) return []
    const index = splits.value.findIndex((split) => split.id === track.startSplit?.id)
    const end = splits.value[index + 1]
    return [track.startSplit, end].filter((split) => split !== null && split !== undefined)
  })

  /*
  What makes the selected track the same track: the split where it starts and where it starts and
  ends in time. The Track view's mark belongs to it, so any change of it, another track selected, a
  split selected, an end split moved or deleted, or a split added inside, clears the mark.
  */
  const trackSpan = computed(() => {
    const track = selectedTrack.value
    return track === null
      ? null
      : `${track.startSplit?.id ?? 'first'}/${track.startSeconds}/${track.startSeconds + track.lengthSeconds}`
  })
  function clearPending() {
    pendingSeconds.value = []
    selectedPendingSeconds.value = null
  }
  // The pending splits are the track's too: they are only valid between its two ends.
  watch(
    trackSpan,
    () => {
      trackMarkSeconds.value = null
      clearPending()
    },
    { flush: 'sync' },
  )

  /*
  Runs `action`, unless it `isDiscarding` the pending splits (it empties them, or ends the track
  they belong to) while there are some: then it does not run but is held as the one open question.
  An action that arrives while a question is open is ignored: the first one is the one asked about.
  */
  function unlessItDiscards(action: () => void, isDiscarding = true) {
    if (discardQuestion.value !== null) return
    if (!isDiscarding || pendingSeconds.value.length === 0) {
      action()
      return
    }
    heldAction = action
    discardQuestion.value = { pendingCount: pendingSeconds.value.length }
  }

  // Closes the question and hands back the action it held.
  function closeQuestion() {
    const action = heldAction
    heldAction = null
    discardQuestion.value = null
    return action
  }

  /*
  Apply first: the pending splits become splits, then what the user asked for runs. Unlike Apply it
  does not show the Split view: the held action decides where the user goes, so a split added at the
  playhead keeps the Range view and its sound.
  */
  function applyFirst() {
    const action = closeQuestion()
    if (action === null) return
    insertPendingSplits()
    action()
  }

  // Discard: the pending splits are dropped, then what the user asked for runs.
  function discardPending() {
    const action = closeQuestion()
    if (action === null) return
    clearPending()
    action()
  }

  // Cancel: nothing happens, and the pending splits stay.
  function cancelDiscard() {
    closeQuestion()
  }

  // Whether a split is one of the two that bound the selected track, where the pending splits sit.
  function isSelectedTrackEnd(id: number) {
    return selectedTrackEndSplits.value.some((split) => split.id === id)
  }

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

  /*
  Room for a pending split at a time: inside the selected track and 1 s from its two ends and from
  every other pending split. The track's ends are splits or the file's ends, so a pending split that
  has room here makes valid tracks when applied.
  */
  function hasRoomForPending(seconds: number) {
    const track = selectedTrack.value
    if (track === null) return false
    const end = track.startSeconds + track.lengthSeconds
    const isClearOf = (other: number) =>
      Math.abs(other - seconds) >= MINIMUM_DISTANCE_SECONDS - LIMIT_TOLERANCE
    return (
      seconds > track.startSeconds &&
      seconds < end &&
      isClearOf(track.startSeconds) &&
      isClearOf(end) &&
      pendingSeconds.value.every((other) => isClearOf(other))
    )
  }

  // "Add split" in the zoom view puts the split at the window's centre.
  const canAddSplit = computed(() => hasRoomFor(zoomCentreSeconds.value))

  // "Add split" in the Range view puts it at the mark, when there is one.
  const canAddSplitAtMark = computed(
    () => markSeconds.value !== null && hasRoomFor(markSeconds.value),
  )

  /*
  "Add pending split" puts one at the Track view's mark, while there is room and no pending split is
  selected: the user finishes with the selected one first.
  */
  const canAddPendingSplit = computed(
    () =>
      trackMarkSeconds.value !== null &&
      selectedPendingSeconds.value === null &&
      hasRoomForPending(snapToGrid(trackMarkSeconds.value)),
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
    // A detection starts over, even when the first track is still the same stretch.
    trackMarkSeconds.value = null
    clearPending()
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

  // Selects the split, centres the window on it and shows the Split view, with no question.
  function showSplit(id: number) {
    const split = splits.value.find((candidate) => candidate.id === id)
    if (split === undefined) return
    selection.value = { kind: 'split', id: split.id }
    zoomCentreSeconds.value = split.seconds
    view.value = 'split'
  }

  // A split no longer selected for a track ends the pending splits, so it asks first.
  function selectSplit(id: number) {
    if (splits.value.some((candidate) => candidate.id === id)) unlessItDiscards(() => showSplit(id))
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
    // The track already selected asks nothing: its pending splits stay.
    unlessItDiscards(() => {
      selection.value = { kind: 'track', startSplitId }
      view.value = 'track'
    }, !isTrackSelected(track))
  }

  function isTrackSelected(track: Track) {
    const current = selection.value
    return current?.kind === 'track' && current.startSplitId === (track.startSplit?.id ?? null)
  }

  // A click on empty ground in the whole-file view: the window goes there, with nothing selected.
  function moveZoomTo(seconds: number) {
    unlessItDiscards(() => {
      zoomCentreSeconds.value = seconds
      selection.value = null
      view.value = 'split'
    })
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

  // Places the Track view's mark, held inside the selected track like the Range view's in its range.
  function placeTrackMark(seconds: number) {
    const track = selectedTrack.value
    if (track === null) return
    trackMarkSeconds.value = Math.min(
      Math.max(seconds, track.startSeconds),
      track.startSeconds + track.lengthSeconds,
    )
  }

  /*
  A pending split at a time, on the 10 ms grid and with room (`hasRoomForPending`). `isSelected` says
  whether the new one becomes the selected one: at the mark it does, at the playhead it does not, so
  the user can tap along a playing track and every tap is taken.
  */
  function addPendingSplit(seconds: number, isSelected: boolean) {
    const onGrid = snapToGrid(seconds)
    if (!hasRoomForPending(onGrid)) return
    const list = pendingSeconds.value
    const index = list.findIndex((other) => other > onGrid)
    const at = index === -1 ? list.length : index
    // A new array, not a splice: the Track view redraws when the list is replaced.
    pendingSeconds.value = [...list.slice(0, at), onGrid, ...list.slice(at)]
    if (isSelected) selectedPendingSeconds.value = onGrid
  }

  function addPendingSplitAtMark() {
    if (trackMarkSeconds.value !== null && canAddPendingSplit.value) {
      addPendingSplit(trackMarkSeconds.value, true)
    }
  }

  function selectPendingSplit(seconds: number) {
    if (pendingSeconds.value.includes(seconds)) selectedPendingSeconds.value = seconds
  }

  function deselectPendingSplit() {
    selectedPendingSeconds.value = null
  }

  function deleteSelectedPendingSplit() {
    const selected = selectedPendingSeconds.value
    if (selected === null) return
    pendingSeconds.value = pendingSeconds.value.filter((seconds) => seconds !== selected)
    selectedPendingSeconds.value = null
  }

  /*
  Turns every pending split into a split, each an added edit through the same insert as any added
  split. The list is taken first and emptied: the first insert changes the track, which would empty
  it under the loop.
  */
  function insertPendingSplits() {
    const times = pendingSeconds.value
    clearPending()
    return times.map((seconds) => insertSplit(seconds))
  }

  // Apply: then the first new split is selected, centred and shown in the Split view, to fine-tune.
  function applyPendingSplits() {
    const [first] = insertPendingSplits()
    if (first !== undefined) showSplit(first.id)
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

  /*
  It selects the new split, which leaves the track: with pending splits it asks first. The time is
  taken now and the room is checked again when it runs, since "Apply first" moves the window and
  adds splits in between.
  */
  function addSplit() {
    if (!canAddSplit.value) return
    const seconds = zoomCentreSeconds.value
    unlessItDiscards(() => {
      if (hasRoomFor(seconds)) showSplit(insertSplit(seconds).id)
    })
  }

  /*
  A split at a time, for the user who is listening in the Range view (the playhead): the time is
  rounded to the 10 ms grid first, then held to the same room as any split. It is not selected, so
  the view, the playback and the mark stay as they are.
  */
  function addSplitAt(seconds: number) {
    const onGrid = snapToGrid(seconds)
    if (!hasRoomFor(onGrid)) return
    // A split inside the selected track shortens it, ending its pending splits: it asks first.
    const track = selectedTrack.value
    const isInside =
      track !== null &&
      onGrid > track.startSeconds &&
      onGrid < track.startSeconds + track.lengthSeconds
    // The room is checked again when it runs: "Apply first" adds splits in between.
    unlessItDiscards(() => {
      if (hasRoomFor(onGrid)) insertSplit(onGrid)
    }, isInside)
  }

  // A split where the mark is.
  function addSplitAtMark() {
    if (markSeconds.value !== null) addSplitAt(markSeconds.value)
  }

  // Deleting an end split of the selected track changes the track, which ends its pending splits.
  function deleteSplit(id: number) {
    if (splits.value.some((candidate) => candidate.id === id)) {
      unlessItDiscards(() => {
        removeSplit(id)
      }, isSelectedTrackEnd(id))
    }
  }

  function removeSplit(id: number) {
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
    // The splits are taken now, so a held removal removes this track's, whatever is applied since.
    const isDiscarding = [start, end].some(
      (split) => split !== undefined && isSelectedTrackEnd(split.id),
    )
    unlessItDiscards(() => {
      const inheritedName = end?.name ?? null
      if (end !== undefined) removeSplit(end.id)
      if (start !== undefined) removeSplit(start.id)
      if (start === undefined) renameTrack(null, inheritedName ?? '')
    }, isDiscarding)
  }

  /*
  Names the track that starts at the split `startSplitId`, or the first track with null. Whatever is
  typed is valid: an empty name means "use the prefixed number".
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

  // Kept as typed, a separator or a space at its end included, up to a track name's length.
  function setTrackNamePrefix(prefix: string) {
    trackNamePrefix.value = prefix.slice(0, MAX_TRACK_NAME_LENGTH)
  }

  function reset() {
    curve.value = null
    timing.value = null
    silenceThreshold.value = null
    minimumGapLength.value = DEFAULT_MINIMUM_GAP_SECONDS
    gaps.value = []
    splits.value = []
    firstTrackName.value = null
    trackNamePrefix.value = ''
    clearEdits()
    selection.value = null
    zoomCentreSeconds.value = ZOOM_WINDOW_SECONDS / 2
    range.value = null
    markSeconds.value = null
    trackMarkSeconds.value = null
    clearPending()
    closeQuestion()
    view.value = 'split'
    nextSplitId = 0
  }

  return {
    silenceThreshold,
    minimumGapLength,
    gaps,
    splits,
    firstTrackName,
    trackNamePrefix,
    selection,
    selectedSplit,
    selectedSplitIndex,
    selectedTrack,
    zoomCentreSeconds,
    range,
    markSeconds,
    trackMarkSeconds,
    selectedTrackEndSplits,
    pendingSplits: pendingSeconds,
    selectedPendingSplit: selectedPendingSeconds,
    canAddPendingSplit,
    discardQuestion,
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
    placeTrackMark,
    addPendingSplit,
    addPendingSplitAtMark,
    selectPendingSplit,
    deselectPendingSplit,
    deleteSelectedPendingSplit,
    applyPendingSplits,
    applyFirst,
    discardPending,
    cancelDiscard,
    showView,
    moveSplit,
    addSplit,
    addSplitAt,
    addSplitAtMark,
    deleteSplit,
    removeTrack,
    renameTrack,
    setTrackNamePrefix,
    reset,
  }
})
