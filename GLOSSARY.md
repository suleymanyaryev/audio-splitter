# Audio Splitter

A browser-only tool that proposes where to cut a long audio file made of concatenated tracks, lets the user review those cuts, and exports each track as its own file.

## Language

**Source file**:
The long audio file the user loads, made of several tracks played one after another.
_Avoid_: Input, upload, mix, set

**Supported format**:
A container and codec pair the splitter accepts as a source file and exports tracks in: AAC in `.m4a`, MP3 in `.mp3`, or Opus in `.opus`. It is told by the file's contents, not its extension.
_Avoid_: File type, extension

**Track**:
A stretch of the source file between two neighbouring splits (or between a split and the start or end of the file), exported as one audio file.
_Avoid_: Segment, part, chunk, song

**Track name**:
The name a track is exported under: its number until the user renames it. It belongs to the split where the track starts (or to the start of the source file for the first track), so it follows that split when it moves and disappears when that split is deleted.
_Avoid_: Title, label

**Export**:
Writing every track as its own audio file, in the source file's format, into a new folder named after the source file, made inside a folder the user picks (a second export of the same file makes `name (2)`).
_Avoid_: Download, save, split (as a verb)

**Gap**:
A stretch of the source file whose loudness stays under the silence threshold for at least the minimum gap length.
_Avoid_: Silence, pause, quiet region

**Split**:
A single point in time where the source file is cut. A split is either detected (proposed at the middle of a gap) or manual (added by the user); once it exists the two are treated the same.
_Avoid_: Candidate, cut point, marker, split point

**Selected split**:
The one split the user is reviewing: at most one at a time. Selecting a split centres the zoom window on it; moving it does not recentre the window.
_Avoid_: Current split, active split, focused split

**Zoom window**:
The 20 second stretch of the source file around a centre time that the zoom view shows, outlined on the whole-file view.
_Avoid_: Viewport, zoom range, visible range

**Audition**:
Hearing the 8 seconds across the selected split (4 before it, 4 after) to judge where the cut falls. The user starts and stops it with "Play across split"; moving or changing the selection ends it.
_Avoid_: Preview, playback

**Range**:
A stretch of the source file, 1 s to 10 min, that the user drags out on the whole-file view to listen to. Hearing it is "playing the range", not an audition.
_Avoid_: Selection, section, region

**Range view**:
The zoom panel's other view: the range stretched across the whole panel, with its gaps and splits, in place of the zoom view. A `Split | Range` control switches between the two; selecting a split or moving the zoom window switches back.
_Avoid_: Range panel, overview

**Mark**:
The spot in a range where "Add split" puts a split.
_Avoid_: Cursor, marker

**Playhead**:
The 1 px line that marks the point being heard, or where playback will resume: in the zoom view during an audition, and in the Range view always.
_Avoid_: Cursor, scrubber, position marker

**Loudness curve**:
The loudness of the source file over time, one value in decibels per short window.
_Avoid_: Energy curve, RMS curve, volume graph

**Silence threshold**:
The loudness, in decibels, under which the source file counts as quiet.
_Avoid_: Noise floor, cutoff

**Minimum gap length**:
The shortest time the loudness must stay under the silence threshold for the stretch to count as a gap.
_Avoid_: Minimum duration, minimum silence

**Edit**:
A thing the user changed since the last detection: a split moved, added or deleted, or a track renamed. It is counted once per thing changed, however often it was changed, and changing a setting replaces all edits with freshly detected splits.
_Avoid_: Change, modification, revision
