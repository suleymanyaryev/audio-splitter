# Audio Splitter

A browser-only tool that proposes where to cut a long audio file made of concatenated tracks, lets the user review those cuts, and exports each track as its own file.

## Language

### The file and its formats

**Source file**:
The long file the user loads, audio or video, whose first audio stream holds several tracks played one after another.
_Avoid_: Input, upload, mix, set, video, clip

**Supported format**:
A container and codec pair the splitter accepts as a source file, told by the file's contents rather than its extension.
_Avoid_: File type, extension

**Track format**:
The audio-only file type a source file's tracks are exported in, set by its codec.
_Avoid_: Export format, output format

**Seek method**:
How a cut finds its start in a source file, set by the container: once, with one jump before the input, or twice, with an early jump and then an exact seek. It is not the track format, which the codec sets.
_Avoid_: Cut mode, seek type

**ffmpeg core**:
The audio toolkit the splitter downloads once and keeps in the browser; probing, decoding and cutting all run in it.
_Avoid_: Engine, codec library, wasm

**Export**:
Writing every track that is not left out as its own audio file, in the track format, into a new folder named after the source file.
_Avoid_: Download, save, split (as a verb)

**Single export**:
Writing one track, or the range, as one audio file in the track format, under a name the user confirms.
_Avoid_: Cut, extract, chunk

### Splits and tracks

**Split**:
A single point in time where the source file is cut. It is detected, proposed by the splitter at a gap, a dip or a contrast peak, or manual, added by the user.
_Avoid_: Candidate, cut point, marker, split point, Find gaps

**Confidence**:
How sure a detected split is that one track ends there: sure, likely or doubtful. A manual split has none.
_Avoid_: Score, certainty, probability, rating

**Selected split**:
The one split the user is reviewing, if any.
_Avoid_: Current split, active split, focused split

**Pending split**:
A spot in the selected track marked to become a split once the pending splits are applied. Until then it makes no track.
_Avoid_: Candidate, draft split, ghost split

**Track**:
A stretch of the source file between two neighbouring splits, or between a split and the start or end of the file. Its number is its place in the source file, counting every track.
_Avoid_: Segment, part, chunk, song

**Selected track**:
The one track the user is reviewing, heard end to end, in place of a selected split.
_Avoid_: Track range, current track, active track

**Track name**:
The name a track is exported under: the track name prefix and its number, or the name the user gave it. It belongs to the split where the track starts.
_Avoid_: Title, label

**Track name prefix**:
The text put before the number of every unnamed track, any separator included. Each source file has its own.
_Avoid_: Base name, stem

**Track removal**:
Merging a track into its neighbours by deleting the splits at both its ends.
_Avoid_: Deleting a track, excluding a track

**Left-out track**:
A track that stays in the review but that the export skips, left out by hand or as a duplicate.
_Avoid_: Excluded track, skipped track, disabled track, muted track

**Edit**:
A change the user made by hand since the source file opened: to a split, a track's name, whether a track is left out, or a match. What the splitter finds is no edit until the user changes it.
_Avoid_: Change, modification, revision

### Views and playing

**Zoom window**:
The stretch of the source file around a centre time that the Split view shows, outlined on the whole-file view.
_Avoid_: Viewport, zoom range, visible range

**Split view**:
The zoom panel's view of the zoom window around the selected split, where the split is moved, deleted and auditioned. It is one of the panel's three views, with the Track view and the Range view.
_Avoid_: Zoom view

**Track view**:
The zoom panel's view of the selected track, stretched across the panel, where pending splits are placed.
_Avoid_: Track panel, track range view

**Range**:
A stretch of the source file that the user drags out on the whole-file view to listen to.
_Avoid_: Selection, section, region

**Range view**:
The zoom panel's view of the range, stretched across the panel with its gaps and splits.
_Avoid_: Range panel, overview

**Mark**:
The dashed spot the user clicks in the stretch on show: in the Range view where a split goes, in the Track view where a pending split goes.
_Avoid_: Cursor, marker, ghost playhead

**Audition**:
Hearing a short stretch across the selected split to judge where the cut falls. Hearing the range or a track is playing it, not an audition.
_Avoid_: Preview, playback

**Playhead**:
The line that marks the point being heard, or where playback will resume, in a view. Each view keeps its own.
_Avoid_: Cursor, scrubber, position marker

**Play speed**:
How fast the source file is heard against real time, with its pitch kept. It changes only what is heard, never an export.
_Avoid_: Playback rate, tempo, rate

### Matches

**Match**:
A stretch where a track is the same recording as an earlier track, which it names. It is full or partial.
_Avoid_: Mark, flag, repeat, copy

**Kept copy**:
The track a duplicate's match names: the earliest track of that recording that is not left out by hand.
_Avoid_: Original, source, master

**Duplicate**:
A track whose match with the kept copy covers the whole of both.
_Avoid_: Copy, repeat, double

**Partial match**:
A match that covers only part of one track or of both. It usually means a split is missing or misplaced.
_Avoid_: Partial duplicate, overlap, near match

**Swap**:
Going from the selected track to the same moment in a track it matches.
_Avoid_: Jump, toggle, compare

### Detection

**Loudness curve**:
The loudness of the source file over time, one value in decibels per short window.
_Avoid_: Energy curve, RMS curve, volume graph

**Spectrum**:
How strong each tone is in one short moment of the source file.
_Avoid_: Frequency content, FFT, spectral frame

**Spectrogram**:
The source file's spectrum over time: time across, frequency up, strength as shade.
_Avoid_: Spectrum view, sonogram, frequency view, FFT view

**Silence threshold**:
The loudness, in decibels, under which the source file counts as quiet.
_Avoid_: Noise floor, cutoff

**Minimum gap length**:
The shortest time the loudness must stay under the silence threshold for the stretch to count as a gap.
_Avoid_: Minimum duration, minimum silence

**Gap**:
A stretch of the source file whose loudness stays under the silence threshold for at least the minimum gap length.
_Avoid_: Silence, pause, quiet region

**Depth**:
How far the loudness at a point in the source file falls under the loudness of the stretch around it, in decibels. A gap between tracks is usually deep; a quiet passage inside a track is usually shallow.
_Avoid_: Drop, prominence, dip size

**Dip**:
A point where the loudness falls at least the depth setting under the loudness around it, and further than anywhere near it. It can be short or stay over the silence threshold, so it finds the track changes a gap misses.
_Avoid_: Shallow gap, valley, trough

**Contrast**:
How far apart the sound of the stretch before a point in the source file and the stretch after it are, in decibels, whatever their loudness. A **contrast peak** is a point whose contrast reaches the contrast setting and is the highest near it; a split proposed there is a contrast split.
_Avoid_: Change, novelty, difference, score

**Default settings**:
The detection settings every source file starts with: the ones the user saved, or the built-in ones.
_Avoid_: Preferences, presets, starting values, my defaults
