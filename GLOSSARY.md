# Audio Splitter

A browser-only tool that proposes where to cut a long audio file made of concatenated tracks, lets the user review those cuts, and exports each track as its own file.

## Language

**Source file**:
The long audio file the user loads, made of several tracks played one after another.
_Avoid_: Input, upload, mix, set

**Track**:
A stretch of the source file between two neighbouring splits (or between a split and the start or end of the file), exported as one audio file.
_Avoid_: Segment, part, chunk, song

**Track name**:
The name a track is exported under: its number until the user renames it. It belongs to the split where the track starts (or to the start of the source file for the first track), so it follows that split when it moves and disappears when that split is deleted.
_Avoid_: Title, label

**Export**:
Writing every track as its own audio file, in the source file's format, into a folder the user picks.
_Avoid_: Download, save, split (as a verb)

**Gap**:
A stretch of the source file whose loudness stays under the silence threshold for at least the minimum gap length.
_Avoid_: Silence, pause, quiet region

**Split**:
A single point in time where the source file is cut. A split is either detected (proposed at the middle of a gap) or manual (added by the user); once it exists the two are treated the same.
_Avoid_: Candidate, cut point, marker, split point

**Loudness curve**:
The loudness of the source file over time, one value in decibels per short window.
_Avoid_: Energy curve, RMS curve, volume graph

**Silence threshold**:
The loudness, in decibels, under which the source file counts as quiet.
_Avoid_: Noise floor, cutoff

**Minimum gap length**:
The shortest time the loudness must stay under the silence threshold for the stretch to count as a gap.
_Avoid_: Minimum duration, minimum silence
