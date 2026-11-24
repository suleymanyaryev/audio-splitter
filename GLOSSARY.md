# Audio Splitter

A browser-only tool that proposes where to cut a long audio file made of concatenated tracks, lets the user review those cuts, and exports each track as its own file.

## Language

**Source file**:
The long audio file the user loads, made of several tracks played one after another.
_Avoid_: Input, upload, mix, set

**Supported format**:
A container and codec pair the splitter accepts as a source file and exports tracks in: AAC in `.m4a`, MP3 in `.mp3`, or Opus in `.opus`. It is told by the file's contents, not its extension.
_Avoid_: File type, extension

**ffmpeg core**:
The audio toolkit the splitter downloads once and keeps in the browser; probing, decoding and cutting all run in it.
_Avoid_: Engine, codec library, wasm

**Track**:
A stretch of the source file between two neighbouring splits (or between a split and the start or end of the file), exported as one audio file unless it is left out. Its number is its place in the source file, counting every track, left out or not.
_Avoid_: Segment, part, chunk, song

**Track name**:
The name a track is exported under: the track name prefix followed by the track's number among the tracks the export writes until the user renames it, then the name as typed. It belongs to the split where the track starts (or to the start of the source file for the first track), so it follows that split when it moves and disappears when that split is deleted.
_Avoid_: Title, label

**Track name prefix**:
The text put before the number of every unnamed track, any separator included. Each source file has its own, starting as the source file's name without its extension followed by `-`.
_Avoid_: Base name, stem

**Export**:
Writing every track that is not left out as its own audio file, in the source file's format, into a new folder named after the source file, made inside a folder the user picks (a second export of the same file makes `name (2)`).
_Avoid_: Download, save, split (as a verb)

**Single export**:
Writing one track, or the range, as one audio file under a name the user confirms, into a folder the user picks once per file.
_Avoid_: Cut, extract, chunk

**Gap**:
A stretch of the source file whose loudness stays under the silence threshold for at least the minimum gap length.
_Avoid_: Silence, pause, quiet region

**Split**:
A single point in time where the source file is cut. A split is either detected (added by Find gaps at the middle of a gap, only when the user asks) or manual (added by the user); once it exists the two are treated the same.
_Avoid_: Candidate, cut point, marker, split point

**Selected split**:
The one split the user is reviewing: at most one at a time. Selecting a split centres the zoom window on it; moving it does not recentre the window.
_Avoid_: Current split, active split, focused split

**Selected track**:
The one track the user is reviewing, heard end to end whatever its length. Its ends are its splits, so it follows them when they move; a split is added inside it by applying pending splits, or from the Range view, which asks first when pending splits would be lost. A split and a track are never selected at the same time.
_Avoid_: Track range, current track, active track

**Split view**:
The zoom panel's view of the zoom window around the selected split, where the split is moved, deleted and auditioned. It is one of the panel's three views, with the Track view and the Range view.
_Avoid_: Zoom view

**Track view**:
The zoom panel's view of the selected track, stretched across the whole panel with its gaps and its two end splits, to listen to and to place pending splits in.
_Avoid_: Track panel, track range view

**Pending split**:
A spot in the selected track marked to become a split once the pending splits are applied. Until then it makes no track, has no name and is no edit; it belongs to the selected track, and the user is asked before anything that would discard it. One pending split can be selected inside the Track view while the track stays selected.
_Avoid_: Candidate, draft split, ghost split

**Removing a track**:
Merging a track into its neighbours by deleting the splits at both its ends. Its name goes with it: the merged track keeps the previous track's name, or the next track's when the first track is removed.
_Avoid_: Deleting a track, excluding a track

**Left-out track**:
A track that stays in the review, shown and heard like any other, that the export skips. It is left out for a reason: by hand, when the user leaves it out and brings it back, or as a duplicate. A split added inside a track left out by hand makes two left-out tracks, and a merged track is left out by hand when the earlier of the two was.
_Avoid_: Excluded track, skipped track, disabled track, muted track

**Match**:
A stretch where a track is the same recording as an earlier track, found by Find duplicates only when the user asks. It names the kept copy, is full or partial, and lasts until the user dismisses it or a split at either track's ends changes.
_Avoid_: Mark, flag, repeat, copy

**Kept copy**:
The track a match names: the earliest track in the source file, among those that are the same recording, that was not left out by hand.
_Avoid_: Original, source, master

**Duplicate**:
A track whose match with the kept copy covers the whole of both. It is left out as a duplicate while the match lasts, unless it was already left out by hand.
_Avoid_: Copy, repeat, double

**Partial match**:
A match that covers only part of one track or of both, at least 30 s long; it usually means a split is missing or misplaced. The track stays in the export.
_Avoid_: Partial duplicate, overlap, near match

**Zoom window**:
The 20 second stretch of the source file around a centre time that the Split view shows, outlined on the whole-file view.
_Avoid_: Viewport, zoom range, visible range

**Audition**:
Hearing the 8 seconds across the selected split (4 before it, 4 after) to judge where the cut falls. It can be paused, resumed and heard from any point in it. Moving the split pauses it and keeps the point being heard; selecting another split, or none, ends it.
_Avoid_: Preview, playback

**Range**:
A stretch of the source file, 1 s to 10 min, that the user drags out on the whole-file view to listen to. Hearing it is "playing the range", not an audition.
_Avoid_: Selection, section, region

**Range view**:
The zoom panel's view of the range, stretched across the whole panel with its gaps and splits. A `Split | Track | Range` control switches between the three views; selecting a split or moving the zoom window switches back to the Split view.
_Avoid_: Range panel, overview

**Mark**:
The dashed spot the user clicks in the stretch on show: in the Range view where a split goes, in the Track view where a pending split goes. Each of the two views keeps its own.
_Avoid_: Cursor, marker, ghost playhead

**Playhead**:
The 1 px line that marks the point being heard, or where playback will resume, in each of the three views at all times.
_Avoid_: Cursor, scrubber, position marker

**Play speed**:
How fast the source file is heard against real time, 0.5× to 2.0×, with its pitch kept. It changes only what is heard, never an export.
_Avoid_: Playback rate, tempo, rate

**Loudness curve**:
The loudness of the source file over time, one value in decibels per short window.
_Avoid_: Energy curve, RMS curve, volume graph

**Silence threshold**:
The loudness, in decibels, under which the source file counts as quiet.
_Avoid_: Noise floor, cutoff

**Default settings**:
The silence threshold, as a distance under the source file's median loudness, and the minimum gap length that every source file starts with: the ones the user saved, or the built-in ones.
_Avoid_: Preferences, presets, starting values, my defaults

**Minimum gap length**:
The shortest time the loudness must stay under the silence threshold for the stretch to count as a gap.
_Avoid_: Minimum duration, minimum silence

**Edit**:
A thing the user changed by hand since the source file opened: a split moved, added or deleted, a track renamed, a track left out or brought back, or a match dismissed. It is counted once per thing changed, however often it was changed; the splits Find gaps adds are no edit until the user changes one, and the matches Find duplicates finds are no edit.
_Avoid_: Change, modification, revision
