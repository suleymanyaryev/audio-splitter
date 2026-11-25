import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'

import { buildDepth, gapDepth, type DepthProfile } from '@/shared/lib/audio/depth.ts'
import { median } from '@/shared/lib/audio/median.ts'
import {
  readSavedDefaultSettings,
  saveDefaultSettings,
  type DefaultSettings,
} from '../api/saved-default-settings.ts'
import {
  DEFAULT_DEPTH_DB,
  DEFAULT_MINIMUM_GAP_SECONDS,
  DEFAULT_OFFSET_DB,
  DEPTH_MAX_DB,
  DEPTH_MIN_DB,
  THRESHOLD_MAX_DB,
  THRESHOLD_MIN_DB,
} from '../config/defaults.ts'
import { LIMIT_TOLERANCE, MINIMUM_DISTANCE_SECONDS } from '../config/split-room.ts'
import { MAX_TRACK_NAME_LENGTH } from '../config/track-name.ts'
import { ZOOM_WINDOW_SECONDS } from '../config/zoom-window.ts'
import { findMatchesInWorker } from '../api/find-matches-client.ts'
import { MINIMUM_COMPARED_SECONDS } from '../config/match-thresholds.ts'
import { bandOf, type Confidence } from '../lib/confidence-band.ts'
import { findDips } from '../lib/find-dips.ts'
import { findGaps, type Gap } from '../lib/find-gaps.ts'
import { proposeSplits } from '../lib/propose-splits.ts'
import type { FoundMatch, SharedStretch } from '../lib/find-matches.ts'
import type { TrackMatch } from '../lib/match-words.ts'
import { defaultTrackName } from '../lib/default-track-name.ts'
import { rangeBetween, type TimeRange } from '../lib/range-between.ts'
import { roundToTenth } from '../lib/round-to-tenth.ts'
import { swapMoment, type SwapLink } from '../lib/swap-moment.ts'

const BUILT_IN_SETTINGS: DefaultSettings = {
  offsetDb: DEFAULT_OFFSET_DB,
  minimumGapSeconds: DEFAULT_MINIMUM_GAP_SECONDS,
  depthDb: DEFAULT_DEPTH_DB,
}

// Splits sit on the same 10 ms grid the arrow keys and a drag step in.
const GRID_STEPS_PER_SECOND = 100

function snapToGrid(seconds: number) {
  return Math.round(seconds * GRID_STEPS_PER_SECOND) / GRID_STEPS_PER_SECOND
}

/*
What a split keeps of whether the export writes the track that starts there (GLOSSARY.md:
Left-out track): `included`, or left out `by-hand`. The other reason, a duplicate, is never kept:
it lasts while a match does, so it is derived (`Inclusion`).
*/
type StoredInclusion = 'included' | 'by-hand'

/*
Whether the export writes a track: `included`, or left out for a reason. It is a reason, not a
flag. A track is `by-hand` when its split says so, a `duplicate` while it has a live match with an
earlier track, and `included` otherwise.
*/
export type Inclusion = StoredInclusion | 'duplicate'

/*
`id` is stable for the split's life, so a selection and a count of edits can hold it.
`name` and `inclusion` are those of the track that starts at this split: the name is null while the
track is unnamed. `confidence` (GLOSSARY.md) is how sure Find splits was of the split, set once when
it added it, and null for any other split and for one the user has moved.
*/
export interface Split {
  id: number
  seconds: number
  name: string | null
  inclusion: StoredInclusion
  confidence: Confidence | null
}

export interface Track {
  // The track's place in the file, counting every track, left out or not.
  number: number
  inclusion: Inclusion
  isLeftOut: boolean
  /*
  The live matches of this track with earlier tracks (GLOSSARY.md: Match), in track order: the one
  full match that makes it a duplicate of the kept copy, or one for each earlier track it shares a
  stretch with, a partial match. Each is the parts of its words.
  */
  matches: TrackMatch[]
  // 1…K among the tracks the export writes, null for a left-out track.
  exportNumber: number | null
  // The name the user typed, null while the track is unnamed.
  ownName: string | null
  /*
  The name shown and exported: the own name, or the prefix and the export number while the track has
  none. A left-out unnamed track has no number, so its name is the bare prefix.
  */
  name: string
  // The own name, or the prefix and the track's place in the file: what the Track view's title says.
  placeName: string
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

// A track as a match recorded it: where it starts and ends, so a match can tell it has changed.
interface MatchedTrack {
  startSplitId: number | null
  startSeconds: number
  endSeconds: number
}

// A match of the last press (GLOSSARY.md: Match): a track, an earlier one, and what they share.
interface StoredMatch {
  later: MatchedTrack
  earlier: MatchedTrack
  kind: FoundMatch['kind']
  laterShared: SharedStretch
  earlierShared: SharedStretch
}

/*
A match seen from the track `C` is pressed on, and whether that track is the match's later one:
away from a way back, `C` goes only by the matches of the later track.
*/
interface MatchLink extends SwapLink {
  isFromLater: boolean
}

// A track's ends as a match records them.
function heldOf(track: { startSplit: Split | null; startSeconds: number; endSeconds: number }) {
  return {
    startSplitId: track.startSplit?.id ?? null,
    startSeconds: track.startSeconds,
    endSeconds: track.endSeconds,
  } satisfies MatchedTrack
}

function isSameTrack(first: MatchedTrack, second: MatchedTrack) {
  return (
    first.startSplitId === second.startSplitId &&
    first.startSeconds === second.startSeconds &&
    first.endSeconds === second.endSeconds
  )
}

// Whether two matches are of the same two tracks, with the ends they had.
function isSamePair(first: StoredMatch, second: StoredMatch) {
  return isSameTrack(first.later, second.later) && isSameTrack(first.earlier, second.earlier)
}

/*
The splits of the source file and the tracks between them. This slice cannot import
`entities/source-file`, so `open` receives the loudness curve as data and keeps a reference to it
(the page's source-file store owns the array; it is never written to), to find the gaps again when
one of the two settings moves.

A file opens as one track with no splits, and `clearSplits` brings it back to that. The gaps are separate state, shown on every view and
found again whenever a setting moves, which changes nothing else. `findSplits` ("Find splits")
turns the gaps, and the dips (GLOSSARY.md: Dip), into splits, one per boundary and only where no
split is near, and `proposedSplits` is what it would add. The depth of every window is worked out
once, when the file opens.
A file opens with the default settings: the user's saved ones (`saveAsDefault`, kept in
`localStorage`) or the built-in ones, with the threshold saved as a distance under the median.

A track name belongs to the split where the track starts, and the first track's to the file's
start, so moving or deleting a split keeps the right name with it, and an unnamed track shows the
track name prefix followed by its padded number, from its position. Removing a track deletes the
splits at both its ends, which is two deletes with the names and edits of a delete.

One selection (`Selection`) holds what is under review: a split, a track or nothing. The selected
split, its index and the selected track are derived from it, so they follow the splits as they move
(the track is kept by the split where it starts, so only deleting that split moves the key). Opening
a file selects the first track and puts the window at the file's start, so a file opens on
track 1, ready to play. The zoom window is
`ZOOM_WINDOW_SECONDS` wide around `zoomCentreSeconds`: selecting a split centres it there and
nothing else moves it except `moveZoomTo`. A split can only be moved inside the window, which never follows the move. A split
is added at the window's centre, and `editCount` says how many things the user changed since the
file opened. The splits Find splits adds are no edit; moving or deleting one is.

`findDuplicates` ("Find duplicates") keeps the matches of the last press (GLOSSARY.md: Match). A
match lasts while both its tracks keep the ends they had, so an edit drops it by changing a track,
and a track with a live match with an earlier track is a `duplicate` (`Inclusion`), derived and
never kept on a split. Finding matches is no edit and changes no split, name or selection;
`clearSplits`, `open` and `reset` drop every match and stop a running search. `dismissMatch` rejects
a match: the pair is remembered with both tracks' ends, so it lasts as long as a match does, is one
edit meanwhile, and the next press leaves it out.

The range (GLOSSARY.md) is view state beside the window's centre: a stretch the user dragged out on
the whole-file view, or none. It belongs to the file, so a setting change and the edits leave it
alone; `reset` clears it. The panel shows the range's view after a new range and
the zoom view again as soon as the user selects a split or moves the window, since both are about
the zoom view; the range stays while the zoom view is shown. The mark is a spot inside the range,
placed by the user, cleared by a new range and kept otherwise; `addSplitAtMark` adds a split there,
and `addSplitAt` at any time (the playhead), without selecting it, so the user stays in the Range view.
*/
export const useSplitStore = defineStore('split', () => {
  const curve = shallowRef<Float32Array | null>(null)
  const timing = ref<CurveTiming | null>(null)
  // Null until the file opens; from then on a plain value the user moves.
  const silenceThreshold = ref<number | null>(null)
  const minimumGapLength = ref(DEFAULT_MINIMUM_GAP_SECONDS)
  // How deep a dip must be to propose a split, in dB (GLOSSARY.md: Depth).
  const depthSetting = ref(DEFAULT_DEPTH_DB)
  // This file's median loudness, which the threshold's distance under it is measured from.
  const medianDecibels = ref<number | null>(null)
  /*
  The default settings (GLOSSARY.md) every file opens with: the user's saved ones, or the built-in
  ones. They outlive the file: `reset` leaves them, and a fresh store reads what an earlier one saved.
  */
  const defaultSettings = ref<DefaultSettings>(
    readSavedDefaultSettings() ?? { ...BUILT_IN_SETTINGS },
  )
  const gaps = ref<Gap[]>([])
  // The depth of every window, worked out when the file opens and never written again.
  const depthProfile = shallowRef<DepthProfile | null>(null)
  const splits = ref<Split[]>([])
  const firstTrackName = ref<string | null>(null)
  // The first track's inclusion lives beside its name, as it has no split to sit on.
  const firstTrackInclusion = ref<StoredInclusion>('included')
  /*
  The track name prefix (GLOSSARY.md): file-level state, so no edit, no setting change and no
  open touches it. The page sets it once per file; `reset` clears it.
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
  The matches of the last "Find duplicates" and what it is doing (GLOSSARY.md: Match). They are
  the answer as it was: whether one still holds is derived (`liveMatches`), so no edit has to find
  and remove them. `hasSearched` is false until the first answer, so the line says nothing before.
  A failed search says why in `duplicateSearchFailure` until the next press.
  */
  const matches = shallowRef<StoredMatch[]>([])
  const duplicateSearchStatus = ref<'idle' | 'running' | 'failed'>('idle')
  const duplicateSearchFailure = ref<string | null>(null)
  const hasSearched = ref(false)
  /*
  The pairs the user dismissed, as the match had them: a dismissal lives as long as both tracks keep
  those ends, as a match does, and counts as an edit while it lives.
  */
  const dismissed = shallowRef<StoredMatch[]>([])
  /*
  The last swap (`swapTrack`): the track it left and the track it went to, as they were. It is the
  way back for the track it went to, and holds while both keep their ends and the match between
  them lives (`liveWayBack`).
  */
  const wayBack = shallowRef<{ from: MatchedTrack; to: MatchedTrack } | null>(null)
  /*
  Every press takes a number, and the answer of an older press, or of an older file, is dropped.
  The running search's worker is stopped through `searchAbort` when the file starts over.
  */
  let searchNumber = 0
  let searchAbort: AbortController | null = null
  /*
  What the user changed since the file opened, counted as things changed, not actions: a split
  moved ten times is one edit. The sets hold split ids (a rename is keyed by the split where its
  track starts, null for the file's start); `deletedCount` counts detected splits only, because
  deleting an added split just takes its "added" edit back. A detected split (one Find splits added)
  is no edit until it is moved or deleted.
  */
  const movedIds = ref(new Set<number>())
  const addedIds = ref(new Set<number>())
  const renamedKeys = ref(new Set<number | null>())
  // The tracks the user left out or brought back, keyed like a rename; a second toggle takes it back.
  const inclusionKeys = ref(new Set<number | null>())
  // The splits the user marked checked: each one edit, as a move is.
  const checkedIds = ref(new Set<number>())
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
  const trackEnds = computed(() => {
    if (timing.value === null) return []
    const { durationSeconds } = timing.value
    const starts = [0, ...splits.value.map((split) => split.seconds)]
    const stored = [firstTrackInclusion.value, ...splits.value.map((split) => split.inclusion)]
    return starts.map((startSeconds, index) => ({
      startSplit: splits.value[index - 1] ?? null,
      startSeconds,
      endSeconds: starts[index + 1] ?? durationSeconds,
      stored: stored[index] ?? 'included',
    }))
  })

  /*
  The matches of the last press that still hold, as the indices of their two tracks: both tracks
  exist with the ends they had. A split moved, deleted or added inside changes a track's ends, so
  its matches, and those naming it, stop holding at once and nothing has to remove them.
  */
  const indexOfHeld = computed(() => {
    const ends = trackEnds.value
    const indexByStart = new Map(ends.map((track, index) => [track.startSplit?.id ?? null, index]))
    return (held: MatchedTrack) => {
      const index = indexByStart.get(held.startSplitId)
      const track = index === undefined ? undefined : ends[index]
      return track?.startSeconds === held.startSeconds && track.endSeconds === held.endSeconds
        ? index
        : undefined
    }
  })

  // The indices of a match's two tracks while both keep the ends it recorded, else null.
  function liveIndices(pair: StoredMatch) {
    const later = indexOfHeld.value(pair.later)
    const earlier = indexOfHeld.value(pair.earlier)
    return later === undefined || earlier === undefined ? null : { later, earlier }
  }

  function isDismissed(match: StoredMatch) {
    return dismissed.value.some((pair) => isSamePair(pair, match))
  }

  // The dismissed pairs that still hold, as the indices of their two tracks.
  const liveDismissals = computed(() => dismissed.value.flatMap((pair) => liveIndices(pair) ?? []))

  const liveMatches = computed(() => {
    const live: (Omit<StoredMatch, 'later' | 'earlier'> & { later: number; earlier: number })[] = []
    for (const match of matches.value) {
      const indices = liveIndices(match)
      if (indices !== null && !isDismissed(match)) live.push({ ...match, ...indices })
    }
    return live
  })

  /*
  The way back of the last swap, as the indices of the two tracks, while both keep their ends and a
  live match joins them; null once either fails, and then `wayBack` is let go for good, so a match
  that comes back with its ends does not bring the way back with it.
  */
  const liveWayBack = computed(() => {
    const back = wayBack.value
    if (back === null) return null
    const from = indexOfHeld.value(back.from)
    const to = indexOfHeld.value(back.to)
    if (from === undefined || to === undefined) return null
    const isJoined = liveMatches.value.some(
      (match) =>
        (match.later === from && match.earlier === to) ||
        (match.later === to && match.earlier === from),
    )
    return isJoined ? { from, to } : null
  })
  watch(
    liveWayBack,
    (live) => {
      if (live === null) wayBack.value = null
    },
    { flush: 'sync' },
  )

  const tracks = computed<Track[]>(() => {
    const ends = trackEnds.value
    // Each track's live matches, by the track's index, in the order found: the earlier tracks first.
    const matchesByTrack = new Map<number, (typeof liveMatches.value)[number][]>()
    for (const match of liveMatches.value)
      matchesByTrack.set(match.later, [...(matchesByTrack.get(match.later) ?? []), match])
    const matchesOf = (index: number) => matchesByTrack.get(index) ?? []
    const inclusions = ends.map((track, index): Inclusion => {
      if (track.stored === 'by-hand') return 'by-hand'
      return matchesOf(index).some((match) => match.kind === 'full') ? 'duplicate' : 'included'
    })
    function ownNameAt(index: number) {
      const startSplit = ends[index]?.startSplit ?? null
      return startSplit === null ? firstTrackName.value : startSplit.name
    }
    const exportCount = inclusions.filter((inclusion) => inclusion === 'included').length
    let exportedSoFar = 0
    return ends.map(({ startSplit, startSeconds, endSeconds }, index) => {
      const ownName = ownNameAt(index)
      const inclusion = inclusions[index] ?? 'included'
      const isLeftOut = inclusion !== 'included'
      const exportNumber = isLeftOut ? null : ++exportedSoFar
      const prefix = trackNamePrefix.value
      return {
        number: index + 1,
        inclusion,
        isLeftOut,
        matches: matchesOf(index).map(
          ({ earlier, kind, laterShared, earlierShared }): TrackMatch => ({
            kind,
            number: earlier + 1,
            ownName: ownNameAt(earlier),
            startSplitId: ends[earlier]?.startSplit?.id ?? null,
            here: laterShared,
            there: earlierShared,
          }),
        ),
        exportNumber,
        ownName,
        name:
          ownName ??
          (exportNumber === null
            ? prefix.slice(0, MAX_TRACK_NAME_LENGTH)
            : defaultTrackName(prefix, exportNumber, exportCount)),
        placeName: ownName ?? defaultTrackName(prefix, index + 1, ends.length),
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
    inclusionKeys.value.clear()
    checkedIds.value.clear()
    deletedCount.value = 0
  }

  const editCount = computed(
    () =>
      movedIds.value.size +
      addedIds.value.size +
      renamedKeys.value.size +
      inclusionKeys.value.size +
      checkedIds.value.size +
      liveDismissals.value.length +
      deletedCount.value,
  )

  // How many tracks the export writes: the ones not left out. With none, the export refuses.
  const exportTrackCount = computed(() => tracks.value.filter((track) => !track.isLeftOut).length)
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

  // Finds the gaps again from the two settings. Nothing but the gaps changes.
  function findGapsAgain() {
    if (curve.value === null || timing.value === null || silenceThreshold.value === null) return
    gaps.value = findGaps(curve.value, {
      ...timing.value,
      silenceThreshold: silenceThreshold.value,
      minimumGapLength: minimumGapLength.value,
    })
  }

  // The threshold that sits this far under this file's median, on the slider's grid and range.
  function thresholdUnder(offsetDecibels: number) {
    const level = roundToTenth((medianDecibels.value ?? 0) - offsetDecibels)
    return Math.min(Math.max(level, THRESHOLD_MIN_DB), THRESHOLD_MAX_DB)
  }

  /*
  Once per file, when its analysis ends: the file is one track with no splits, on track 1 in the
  Track view. Both settings start at the default settings, the threshold relative to this file's
  median, rounded to the Slider's 0.1 dB step and held to its range (`thresholdUnder`), so the
  readout, the thumb and the gaps agree.
  */
  function open(loudness: Float32Array, curveTiming: CurveTiming) {
    curve.value = loudness
    timing.value = curveTiming
    depthProfile.value = buildDepth(loudness)
    medianDecibels.value = median(loudness)
    silenceThreshold.value = thresholdUnder(defaultSettings.value.offsetDb)
    minimumGapLength.value = defaultSettings.value.minimumGapSeconds
    depthSetting.value = defaultSettings.value.depthDb
    findGapsAgain()
    // One track, no splits: the zoom window starts at 0:00, so the Split view shows the file's opening seconds.
    clearSplits()
    // A new file always lands on its first track, even from the Range view.
    view.value = 'track'
  }

  /*
  "Clear splits": the file is one track again, as when it opened. Every split, every track name and
  every edit and pending split go; the prefix, the range and the settings stay. It selects the first
  track and shows the Track view, unless the Range view is on show. Asking first, when there is
  something of the user's to lose, is the caller's job (`hasEdits`, `pendingSplits`).
  */
  function clearSplits() {
    splits.value = []
    firstTrackName.value = null
    firstTrackInclusion.value = 'included'
    clearEdits()
    dropMatches()
    trackMarkSeconds.value = null
    clearPending()
    // The first track starts with the file, so it is keyed by no split and exists with none.
    selection.value = { kind: 'track', startSplitId: null }
    zoomCentreSeconds.value = ZOOM_WINDOW_SECONDS / 2
    if (view.value !== 'range') view.value = 'track'
  }

  function setSilenceThreshold(decibels: number) {
    silenceThreshold.value = decibels
    findGapsAgain()
  }

  function setMinimumGapLength(seconds: number) {
    minimumGapLength.value = seconds
    findGapsAgain()
  }

  // The depth setting is held to its slider: it changes only what Find splits would add.
  function setDepthSetting(decibels: number) {
    depthSetting.value = Math.min(Math.max(decibels, DEPTH_MIN_DB), DEPTH_MAX_DB)
  }

  // The threshold's distance under this file's median now, rounded to 0.1 dB: what "Save as default" saves.
  const currentOffsetDecibels = computed(() =>
    medianDecibels.value === null || silenceThreshold.value === null
      ? null
      : roundToTenth(medianDecibels.value - silenceThreshold.value),
  )

  // Whether the three settings are what the default settings would give this file.
  const matchesDefaultSettings = computed(
    () =>
      silenceThreshold.value !== null &&
      roundToTenth(silenceThreshold.value) === thresholdUnder(defaultSettings.value.offsetDb) &&
      roundToTenth(minimumGapLength.value) === defaultSettings.value.minimumGapSeconds &&
      roundToTenth(depthSetting.value) === defaultSettings.value.depthDb,
  )

  const areDefaultSettingsBuiltIn = computed(
    () =>
      defaultSettings.value.offsetDb === BUILT_IN_SETTINGS.offsetDb &&
      defaultSettings.value.minimumGapSeconds === BUILT_IN_SETTINGS.minimumGapSeconds &&
      defaultSettings.value.depthDb === BUILT_IN_SETTINGS.depthDb,
  )

  // "Save as default": the current threshold distance, minimum gap length and depth, kept across visits.
  function saveAsDefault() {
    if (currentOffsetDecibels.value === null) return
    defaultSettings.value = {
      offsetDb: currentOffsetDecibels.value,
      minimumGapSeconds: roundToTenth(minimumGapLength.value),
      depthDb: roundToTenth(depthSetting.value),
    }
    saveDefaultSettings(defaultSettings.value)
  }

  // "Restore built-in": the default settings go back to the built-in ones, and this file's sliders too.
  function restoreBuiltIn() {
    defaultSettings.value = { ...BUILT_IN_SETTINGS }
    saveDefaultSettings(defaultSettings.value)
    if (medianDecibels.value === null) return
    silenceThreshold.value = thresholdUnder(BUILT_IN_SETTINGS.offsetDb)
    minimumGapLength.value = BUILT_IN_SETTINGS.minimumGapSeconds
    depthSetting.value = BUILT_IN_SETTINGS.depthDb
    findGapsAgain()
  }

  // "Clear splits" has something to clear while there is a split.
  const canClearSplits = computed(() => splits.value.length > 0)

  // The loudness around every window (GLOSSARY.md: Depth), which the loudness panel's moving line follows.
  const loudnessAround = computed(() => depthProfile.value?.around ?? null)

  // The dips that propose a split now: as deep as the depth setting, and the deepest within 15 s.
  const dips = computed(() =>
    depthProfile.value === null || timing.value === null
      ? []
      : findDips(depthProfile.value.depth, { ...timing.value, depthSetting: depthSetting.value }),
  )

  // Each gap with its depth, from its first window to its last.
  const measuredGaps = computed(() => {
    const profile = depthProfile.value
    if (profile === null || timing.value === null) return []
    const { windowSeconds } = timing.value
    return gaps.value.map((gap) => ({
      ...gap,
      depth: gapDepth(
        profile,
        Math.round(gap.startSeconds / windowSeconds),
        Math.round(gap.endSeconds / windowSeconds) - 1,
      ),
    }))
  })

  /*
  The splits "Find splits" would add now (see `proposeSplits`), each with its depth; its length is the
  button's count. Nothing changes until the button is pressed.
  */
  const proposedSplits = computed(() =>
    timing.value === null
      ? []
      : proposeSplits({
          gaps: measuredGaps.value,
          dips: dips.value,
          splitSeconds: splits.value.map((split) => split.seconds),
          durationSeconds: timing.value.durationSeconds,
        }),
  )

  /*
  "Find splits": a detected split at each proposal, keeping every split and name and leaving the
  selection, the window and the view where they are. A split inside the selected track ends its
  pending splits, so with some it asks first; the proposals are taken again when it runs, since
  "Apply first" adds splits in between.
  */
  function findSplits() {
    const times = proposedSplits.value.map((proposal) => proposal.seconds)
    const track = selectedTrack.value
    const isInside =
      track !== null &&
      times.some(
        (seconds) =>
          seconds > track.startSeconds && seconds < track.startSeconds + track.lengthSeconds,
      )
    unlessItDiscards(() => {
      for (const { seconds, depth } of proposedSplits.value) {
        insertSplit(seconds, { band: bandOf(depth), depth })
      }
    }, isInside)
  }

  /*
  Whether "Find duplicates" has anything to compare: two tracks of 30 s or more, and no search
  running. After a failed search it can be pressed again.
  */
  const canFindDuplicates = computed(
    () =>
      curve.value !== null &&
      duplicateSearchStatus.value !== 'running' &&
      trackEnds.value.filter(
        (track) => track.endSeconds - track.startSeconds >= MINIMUM_COMPARED_SECONDS,
      ).length >= 2,
  )

  // What the line beside the button says: the counts of the live matches, none before a press.
  const duplicateResult = computed(() =>
    hasSearched.value
      ? {
          duplicates: liveMatches.value.filter((match) => match.kind === 'full').length,
          partialMatches: liveMatches.value.filter((match) => match.kind !== 'full').length,
        }
      : null,
  )

  // Drops every match and stops a running search: its answer is for a gone file.
  function dropMatches() {
    searchNumber++
    searchAbort?.abort()
    searchAbort = null
    matches.value = []
    dismissed.value = []
    wayBack.value = null
    hasSearched.value = false
    duplicateSearchStatus.value = 'idle'
    duplicateSearchFailure.value = null
  }

  /*
  "Find duplicates" (GLOSSARY.md: Duplicate): compares the tracks as they are now in a worker, and
  keeps the answer as the matches of this press, replacing the last one. It changes no split, name,
  pending split or selection, counts no edit and asks nothing. The press takes a number: an answer
  for another press, or after the file started over, is dropped. A failed search keeps what the
  last press found and says why it failed.
  */
  async function findDuplicates() {
    const loudness = curve.value
    const curveTiming = timing.value
    const threshold = silenceThreshold.value
    if (loudness === null || curveTiming === null || threshold === null || !canFindDuplicates.value)
      return
    const press = ++searchNumber
    const pressed = trackEnds.value
    const abort = new AbortController()
    searchAbort = abort
    duplicateSearchStatus.value = 'running'
    duplicateSearchFailure.value = null
    let found
    try {
      found = await findMatchesInWorker(
        {
          curve: loudness,
          windowSeconds: curveTiming.windowSeconds,
          silenceThreshold: threshold,
          tracks: pressed.map(({ startSeconds, endSeconds, stored }) => ({
            startSeconds,
            endSeconds,
            isLeftOutByHand: stored === 'by-hand',
          })),
          dismissed: liveDismissals.value.map(({ later, earlier }) => ({ later, earlier })),
        },
        abort.signal,
      )
    } catch (error) {
      if (press !== searchNumber) return
      duplicateSearchStatus.value = 'failed'
      duplicateSearchFailure.value = error instanceof Error ? error.message : String(error)
      return
    }
    if (press !== searchNumber) return
    const held = pressed.map((track) => heldOf(track))
    const kept: StoredMatch[] = []
    for (const match of found) {
      const later = held[match.later]
      const earlier = held[match.earlier]
      if (later !== undefined && earlier !== undefined) kept.push({ ...match, later, earlier })
    }
    matches.value = kept
    hasSearched.value = true
    duplicateSearchStatus.value = 'idle'
  }

  /*
  Dismisses the match of `track` with the earlier track `match` names, a duplicate's or a partial
  one: it is one edit for as long as both tracks keep their ends, the next press does not find the
  pair again, and a duplicate it was is exported again. A pair that is no live match is refused, so
  a stale `Track` dismisses nothing.
  */
  function dismissMatch(track: Track, match: TrackMatch) {
    const startSplitId = track.startSplit?.id ?? null
    const stored = matches.value.find(
      (candidate) =>
        candidate.later.startSplitId === startSplitId &&
        candidate.earlier.startSplitId === match.startSplitId,
    )
    if (stored === undefined || liveIndices(stored) === null || isDismissed(stored)) return
    dismissed.value = [...dismissed.value, stored]
  }

  /*
  Where `C` goes from the selected track at `playheadSeconds` (a time in the file): the other track
  of a live match and the same moment in it (GLOSSARY.md: Match), or null.

  - A track that was swapped to, with a live match joining it to the track the swap came from, goes
    back there. Any other track goes by its own matches, with the earlier tracks.
  - Of those, the moment is the one `swapMoment` gives: the same moment inside a shared stretch,
    else the start of the nearest one in the other track.
  */
  function swapTarget(playheadSeconds: number) {
    const track = selectedTrack.value
    if (track === null) return null
    const index = track.number - 1
    const links: MatchLink[] = []
    for (const match of liveMatches.value) {
      if (match.later === index)
        links.push({
          other: match.earlier,
          here: match.laterShared,
          there: match.earlierShared,
          isFromLater: true,
        })
      else if (match.earlier === index)
        links.push({
          other: match.later,
          here: match.earlierShared,
          there: match.laterShared,
          isFromLater: false,
        })
    }
    const back = liveWayBack.value
    const wayBackLinks =
      back !== null && back.to === index ? links.filter((link) => link.other === back.from) : []
    const candidates =
      wayBackLinks.length > 0 ? wayBackLinks : links.filter((link) => link.isFromLater)
    const moment = swapMoment(candidates, playheadSeconds - track.startSeconds)
    const target = moment === null ? undefined : tracks.value[moment.other]
    if (moment === null || target === undefined) return null
    const end = target.startSeconds + target.lengthSeconds
    return { track: target, seconds: Math.min(target.startSeconds + moment.seconds, end) }
  }

  /*
  `C`: selects the track `swapTarget` gives, which is the way back for the swap that follows, and
  returns the target for the caller to put the playhead at. Null when there is no target, or when
  the selection did not move because pending splits would be discarded and the question opened.
  */
  function swapTrack(playheadSeconds: number) {
    const from = trackEnds.value[(selectedTrack.value?.number ?? 0) - 1]
    const target = swapTarget(playheadSeconds)
    if (from === undefined || target === null) return null
    selectTrack(target.track)
    if (!isTrackSelected(target.track)) return null
    const to = trackEnds.value[target.track.number - 1]
    if (to === undefined) return null
    wayBack.value = { from: heldOf(from), to: heldOf(to) }
    return target
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
  start split is gone, or one before the file opens, selects nothing.
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

  /*
  Selects the split after (`step` 1) or before (-1) the selected one, as a click on it does: the
  window centres on it, and the discard question comes the same way. With none selected, it steps
  from the zoom window's centre: the first split after it, or the last before it, a split at the
  centre itself being neither. Whether the selection changed at once: not at the first or last
  split, with no split in that direction, or when the question opened instead.
  */
  function selectAdjacentSplit(step: -1 | 1) {
    const current = selectedSplitIndex.value
    const next = current === null ? splitFromCentre(step) : splits.value[current + step]
    if (next === undefined) return false
    selectSplit(next.id)
    return selectedSplit.value?.id === next.id
  }

  /*
  The splits that still have a confidence, least deep first, ties by time (`splits` is in time
  order and the sort is stable). It is the queue that `{` and `}` walk: a split leaves it when it is
  moved or checked.
  */
  const confidenceOrder = computed(() => {
    const queue = splits.value.filter(
      (split): split is Split & { confidence: Confidence } => split.confidence !== null,
    )
    queue.sort((first, second) => first.confidence.depth - second.confidence.depth)
    return queue
  })

  /*
  Selects the next (`step` 1) or previous (-1) split in the confidence queue, as a click on it does.
  From no selection, or a split that is not in the queue, the next is the first and the previous is
  the last; past either end nothing happens. Whether the selection changed at once.
  */
  function selectAdjacentByConfidence(step: -1 | 1) {
    const queue = confidenceOrder.value
    const current = selectedSplit.value
    const at = current === null ? -1 : queue.findIndex((split) => split.id === current.id)
    // From none, or a split outside the queue: the first for `}`, the last for `{`.
    const edge = step === 1 ? queue[0] : queue.at(-1)
    const next = at === -1 ? edge : queue[at + step]
    if (next === undefined) return false
    selectSplit(next.id)
    return selectedSplit.value?.id === next.id
  }

  /*
  The selected split has been listened to and is kept where it is: its confidence goes, so it leaves
  the queue, and it counts as one edit. Nothing happens for a split with no confidence.
  */
  function markChecked() {
    const current = selectedSplit.value
    if (current === null || current.confidence === null) return
    current.confidence = null
    checkedIds.value.add(current.id)
  }

  // The split nearest the zoom window's centre on the `step` side of it, strictly past the centre.
  function splitFromCentre(step: -1 | 1) {
    const centre = zoomCentreSeconds.value
    // The splits are in time order: the first from the centre on, or none when all lie before it.
    // `[` walks back from it because `findLast` is not in the project's TS lib.
    const fromCentre = splits.value.findIndex((point) => point.seconds >= centre)
    if (step === -1) return splits.value[(fromCentre === -1 ? splits.value.length : fromCentre) - 1]
    return splits.value.find((point) => point.seconds > centre)
  }

  /*
  Selects the track after (`step` 1) or before (-1) the selected one, as a click on its row does, so
  the discard question comes the same way. Whether the selection changed at once: not at the first
  or last track, with no track selected, or when the question opened instead.
  */
  function selectAdjacentTrack(step: -1 | 1) {
    const current = selectedTrack.value
    if (current === null) return false
    // `Track.number` is 1-based and contiguous, so `number - 1` is the track's index.
    const next = tracks.value[current.number - 1 + step]
    if (next === undefined) return false
    selectTrack(next)
    return selectedTrack.value?.number === next.number
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
    // The place is the user's now: it is no longer a detector's guess.
    split.confidence = null
    // A split the user added is one edit already. A checked split that moves is still one edit.
    if (!addedIds.value.has(id)) movedIds.value.add(id)
    checkedIds.value.delete(id)
  }

  /*
  The new split is unnamed, so its track takes its prefixed number from its place. It takes the
  inclusion of the track it cuts, whichever way it is added, so cutting a left-out track makes two
  left-out tracks; that is no edit. A split the user adds is one edit; a detected one, which Find
  splits gives a confidence, is none until it is moved or deleted.
  */
  function insertSplit(seconds: number, confidence: Confidence | null = null) {
    const found = splits.value.findIndex((candidate) => candidate.seconds > seconds)
    const index = found === -1 ? splits.value.length : found
    // The track it cuts starts at the split before it, or with the file.
    const inclusion = splits.value[index - 1]?.inclusion ?? firstTrackInclusion.value
    const split: Split = { id: nextSplitId++, seconds, name: null, inclusion, confidence }
    splits.value.splice(index, 0, split)
    if (confidence === null) addedIds.value.add(split.id)
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
    inclusionKeys.value.delete(id)
    checkedIds.value.delete(id)
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
  The removed track's name and inclusion go with its start split. The next track's belonged to the
  end split, so when the first track is removed, which has no start split to keep them on, they move
  to the file's start (`renameTrack` counts the name's edit, and a left-out start is one edit). Any other merged track keeps the earlier track's, as a deleted split does. The only track
  is refused, as is one whose start split is gone, so a stale `Track` removes nothing.
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
      const inheritedInclusion = end?.inclusion ?? 'included'
      if (end !== undefined) removeSplit(end.id)
      if (start !== undefined) removeSplit(start.id)
      if (start !== undefined) {
        return
      }

      renameTrack(null, inheritedName ?? '')
      firstTrackInclusion.value = inheritedInclusion
      /*
      A file opens with its first track included, so the file's start is an edit exactly while it
      is left out, as a name is while it is set. Carrying the next track's edit flag instead would
      miss a state it took from a cut, which has no edit of its own.
      */
      inclusionKeys.value.delete(null)
      if (inheritedInclusion === 'by-hand') inclusionKeys.value.add(null)
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
    // A file opens with every track unnamed, so a track named back to its default is no edit.
    if (stored === null) renamedKeys.value.delete(startSplitId)
    else renamedKeys.value.add(startSplitId)
  }

  /*
  Leaves the track that starts at the split `startSplitId` (null for the first track) out of the
  export, or brings it back. It changes no split and no name. It is one edit for that track, and
  the second toggle takes the edit away again. A duplicate is left out already, so on one it brings
  the track back: its match is dismissed (`dismissMatch`), and a duplicate the user also left out by
  hand is brought back from that too, so one press is enough.
  */
  function toggleLeftOut(startSplitId: number | null) {
    const track = tracks.value.find(
      (candidate) => (candidate.startSplit?.id ?? null) === startSplitId,
    )
    const duplicateMatch = track?.matches.find((match) => match.kind === 'full')
    if (track !== undefined && duplicateMatch !== undefined) {
      dismissMatch(track, duplicateMatch)
      if (track.inclusion === 'duplicate') return
    }
    const point =
      startSplitId === null ? null : splits.value.find((candidate) => candidate.id === startSplitId)
    if (point === undefined) return
    const current = point === null ? firstTrackInclusion.value : point.inclusion
    const next: StoredInclusion = current === 'included' ? 'by-hand' : 'included'
    if (point === null) firstTrackInclusion.value = next
    else point.inclusion = next
    if (!inclusionKeys.value.delete(startSplitId)) inclusionKeys.value.add(startSplitId)
  }

  // Kept as typed, a separator or a space at its end included, up to a track name's length.
  function setTrackNamePrefix(prefix: string) {
    trackNamePrefix.value = prefix.slice(0, MAX_TRACK_NAME_LENGTH)
  }

  function reset() {
    curve.value = null
    timing.value = null
    depthProfile.value = null
    silenceThreshold.value = null
    minimumGapLength.value = DEFAULT_MINIMUM_GAP_SECONDS
    depthSetting.value = DEFAULT_DEPTH_DB
    medianDecibels.value = null
    gaps.value = []
    splits.value = []
    firstTrackName.value = null
    firstTrackInclusion.value = 'included'
    trackNamePrefix.value = ''
    clearEdits()
    dropMatches()
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
    depthSetting,
    gaps,
    proposedSplits,
    loudnessAround,
    canClearSplits,
    currentOffsetDb: currentOffsetDecibels,
    matchesDefaultSettings,
    areDefaultSettingsBuiltIn,
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
    exportTrackCount,
    canFindDuplicates,
    duplicateSearchStatus,
    duplicateSearchFailure,
    duplicateResult,
    open,
    findSplits,
    findDuplicates,
    dismissMatch,
    swapTarget,
    swapTrack,
    clearSplits,
    saveAsDefault,
    restoreBuiltIn,
    setSilenceThreshold,
    setMinimumGapLength,
    setDepthSetting,
    selectSplit,
    selectTrack,
    selectAdjacentTrack,
    selectAdjacentSplit,
    selectAdjacentByConfidence,
    markChecked,
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
    toggleLeftOut,
    setTrackNamePrefix,
    reset,
  }
})
