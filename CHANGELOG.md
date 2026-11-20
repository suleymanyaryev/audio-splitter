# Changelog

What changed for the person using Audio Splitter, release by release. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Versions

Versions follow [Semantic Versioning](https://semver.org/) applied to the product, since the app has no API for other code to depend on:

- **Major**: a planned milestone set (v1, v2, …, as in [the milestones doc](docs/audio-splitter-milestones.md)), or a change that breaks what users already rely on: the exported files' names, tags or format, or, once the app keeps state across a reload, saved data that needs migrating.
- **Minor**: a new capability outside a milestone set, such as another supported format.
- **Patch**: a fix that adds no capability.

## Keeping it

- Each user-visible change adds a line under `## [Unreleased]` in the same commit, in one of Keep a Changelog's groups: Added, Changed, Deprecated, Removed, Fixed, Security. Write what the user notices, not how the code changed. Refactors, tests, tooling and docs get no entry.
- A release renames `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, opens a fresh `## [Unreleased]` above it, sets `version` in `package.json`, and tags the commit `vX.Y.Z`. Pushing a `v*` tag that is on `main` publishes that commit to GitHub Pages (`.github/workflows/deploy.yml`).

## [Unreleased]

### Added

- A volume control ends the zoom panel's title row in all three views: a mute button ("Mute" / "Unmute") and a slider named "Volume" from −40 dB to 0 dB in 1 dB steps, announced to a screen reader in decibels. It sets how loud the audition, the range and the track are heard, applies to sound that is already playing, and unmuting returns to the same level. It never changes an exported file. The level and the mute are remembered across a reload (0 dB and unmuted the first time, and whenever the browser blocks storage).
- In the Range view, Shift+Enter adds a split where the playhead is, while the range plays, without stopping the sound or leaving the view. Like every split it lands on the 10 ms grid and is refused within 1 s of another split or of the file's ends. A held Enter or Shift+Enter adds one split only.
- A `?` button in the header, "Keyboard shortcuts (?)", on the review screen, or the `?` key anywhere on the page, opens a dialog that lists every key and pointer gesture of the review screen, grouped by area: Split view, Track view, Range view, whole-file view and Track list, with the view on show first. `?` typed into a track name stays a question mark. Escape, a click outside or "Close" closes it.
- A single export: "Export track…" in the Track view's title row and "Export range…" in the Range view's write one file. A name dialog opens first, with the track's name, `<source file> NN` for a track with none, or `<source file> <start>–<end>` for a range (the times as `h.mm.ss`); Enter or OK confirms, and OK is off while the name is empty. The first single export of a file asks for a folder, later ones go to that folder with no picker, and "Change folder" in the dialog picks another; a new file forgets the folder, and a closed picker leaves the dialog open. A track is written as `NN name.ext` with the same title, track number and album tags as the full export, a range as `name.ext` with the name as title, the source file as album and no track number, straight into the folder. An existing file is never overwritten: the new one takes ` (2)`, ` (3)`. A name changed in a track's dialog becomes the track's name (a range renames nothing). Confirming stops the sound; the dialog shows its progress with Cancel, shows a failure with its reason and leaves no half-written file, and closes on success, after which a line under the view says "Saved <file> in <folder>" until the next press or key in the view, a view switch or a selection change. A single export and the full export never run at once.

### Changed

- Every slider now announces its value with its unit to a screen reader ("−27.0 dB", "2.0 s") instead of the bare number.
- In the Track view a single click now places the track's own mark, a dashed line, and leaves the playhead where it is; a double-click moves the playhead there, or, within 6 px of one of the track's two end split lines, selects that split and opens the Split view. A press within 6 px of the playhead still drags it, and the keys are as before. The mark is kept while the same track stays selected and cleared when another is selected or an end of the track changes; it never mixes with the Range view's mark.
- In the Range view a single click places the mark wherever it lands, even next to a split's line, and never leaves the view. A double-click moves the playhead there, or, within 6 px of a split's line, selects that split and opens the Split view. Left and Right now move the playhead 1 s, with Shift 10 s, as in the Track view; the mark is placed with the pointer only. The view is a slider on the playhead.
- Every button in the zoom panel's title row, in all three views, is now an icon button with a tooltip that says what it does and, where there is one, its key: "Add split" (Enter in the Range view), "Delete split (Delete)", "Back to track start (Home)", and Play across split, Play, Pause and Stop with "(Space)". The tooltip opens when the pointer rests on the button and when the keyboard focuses it, and closes on Escape. Play's icon and tooltip follow what a press will do. The Track list's merge and trash buttons show their names as tooltips too. The `Split | Track | Range` control, "Export to folder…" and "New file" keep their words.
- A freshly analysed file opens with track 1 selected in the Track view, ready to play, instead of on the first split. Changing the silence threshold or the minimum gap length selects track 1 again, and shows the Track view unless the Range view is on show. The Split view then opens on the file's first seconds with no split selected.
- Loading the audio engine now waits up to 3 minutes instead of 1 before giving up, so a slow connection can finish downloading it.

## [1.0.1] - 2026-11-20

### Added

- Each track row in the Track list has a merge button, "Remove track N", that removes the track: the splits at both its ends go, so the previous track, it and the next become one track, the first track merging into the next and the last into the previous. The removed track's name goes with it: the merged track keeps the previous track's name, or the next track's when the first track is removed. There is no confirmation, and no button when there is only one track. Each deleted split counts as an edit, as deleting it from its row does. If the removed track was selected, the merged track is selected; any other selection stays.
- The Track list has a split row between every two track rows, in time order: `Split N` where the name goes, its time in the Start column and no length. A click on it selects that split and shows the zoom view centred on it, and the selected split's row is marked and kept in view, as the selected track's row is. Its trash button, "Delete split at …", deletes that split and merges the tracks either side of it, without selecting the row. The trash button is no longer on the track rows. Deleting the split where the selected track starts selects the merged track; deleting its end split leaves it selected, now longer.
- "Delete split" in the zoom view's title row, between "Add split" and "Play across split", deletes the selected split and puts the keyboard on the split selected next. It is disabled with no split selected. Delete and Backspace on the split's handle still do the same.
- The track strip has a narrow split item between every two track blocks. A click on one selects that split and shows the zoom view centred on it, as selecting a split does elsewhere. It blends into the strip at rest and turns vermilion when hovered, focused or selected, and its name says which split it is and its time. A very short track keeps a block 12 pixels wide that can still be clicked (when there are too many tracks for that, the blocks are equal and narrower).
- A track longer than 10 minutes plays in full. The player decodes it 10 minutes at a time, starting at the playhead, and decodes the next 10 minutes while you listen, so sound carries on into them with a break of about 60 milliseconds and no wait to decode. A click, a drag or a key press that moves the playhead outside the minutes already decoded decodes the minutes from there, which takes the 1 to 2 seconds a range takes.
- The Track view plays the selected track, from its start to its end. Its title row has "Back to track start" and Play, which reads "Stop" while the track is decoded and "Pause" while it plays; pausing and playing again resume at once. A click in the view moves the playhead, a press near the playhead drags it (a playing track pauses while it is held and plays on from where it is dropped), and the view takes the keyboard: Left and Right move the playhead 1 second, with Shift 10 seconds, Space plays or pauses, Home goes back to the start, and Delete and Backspace do nothing. At the track's end the sound stops and the playhead returns to the start. Playback stops when the selection changes, when the track's start or end moves, when a new range is dragged, when the view changes, when the export starts and when the page is left.
- A click on a track's block in the strip, on its row in the Track list, on its number button, or focusing its name field selects that track, the first track included, instead of the split where it starts. The selected track's block and row are marked, the whole-file view outlines its stretch, and the zoom panel switches to a Track view: the track stretched across the panel with its gaps and its two end splits, and its name, start and end as the title. The panel's control is now `Split | Track | Range`, each segment disabled while it has nothing to show. A split and a track are never selected together, and Split with a track selected shows the zoom window where it was with no split selected.
- A click in the Range view places a mark, a 1 px dashed line, and leaves the sound alone; Left and Right move it 100 ms, with Shift 1 second. "Add split" in the Range view's title row, or Enter, adds a split at the mark, without leaving the Range view or stopping the sound, so several track starts can be marked in one listen. The button is disabled with no mark and within a second of a split or of the file's ends, and the new split counts as an edit. A click within 6 pixels of a split's line selects that split and returns to the Split view. A new range has no mark.
- The playhead in the Range view can be dragged along the range to listen again from any point: a playing range pauses while the playhead is held and plays on from where it is dropped, a paused one stays paused, and a drag while the range is still being decoded sets where it starts. A "Back to range start" button left of Play, and Home on the Range view, move the playhead to the range's start and keep playing if it was playing.
- The range plays: a Play button in the Range view's title row decodes the range and plays it (it reads "Stop" while it is decoded and "Pause" while it plays), and so does Space on the Range view. A 1 px playhead shows where it is, or where it resumes: at the range's start for a new range. Pausing and playing again start at once, and at the range's end the sound stops and the playhead goes back to the start. Only one thing plays at a time: the range and "Play across split" stop each other, and playback stops when the view changes, a new range is dragged, the export starts or the page is left.
- Dragging across the whole-file waveform marks out a stretch of the file, from 1 second to 10 minutes, with a light overlay that stays until the next drag. A click still selects a split or moves the zoom window, and so does a drag under 1 second.
- A dragged-out range fills the zoom panel as its own view, with the range's waveform, gaps and splits stretched across it and its start, end and length as the title. A `Split | Range` control in the panel's title row switches between the zoom view and the range; selecting a split or moving the zoom window goes back to the zoom view, and the zoom window's outline shows on the whole-file view only while the zoom view is shown.

### Changed

- Every slider now announces its value with its unit to a screen reader ("−27.0 dB", "2.0 s") instead of the bare number.
- The tab icon is the header's centre-label mark, a vermilion disc with a spindle hole on vinyl black, in place of the default icon. The page has a description, and a link to it shows a preview card with the title, a line about what the app does and a waveform cut into tracks.

## [1.0.0] - 2026-11-15

The first release: milestones 0 to 7.

### Added

- Load one source file by choosing or dropping it: AAC in `.m4a`, MP3 in `.mp3` or Opus in `.opus`, recognised from its contents. Any other file gets a message saying what it is.
- Analysis in slices, with a progress bar and Cancel, so files of three hours load without running out of memory. A failure names the step and ffmpeg's last log line.
- The whole-file waveform and the loudness curve on one time axis.
- Proposed splits in the middle of every gap: a stretch under the silence threshold (18 dB below the file's median loudness to start) for at least the minimum gap length (2 s to start). Both are sliders, and the threshold line can be dragged.
- A 20 s zoom view around the selected split. Move a split by dragging or with the arrow keys (10 ms, or 100 ms with Shift), add and delete splits, and name tracks in the track list.
- "Play across split": the 8 s around the selected split, exact in every format, with a playhead.
- A track list and a proportional track strip, both of which select splits.
- A question before a setting change ("Replace your edits?") or "New file" ("Discard your edits?") throws edits away.
- "Export to folder…": every track written by stream copy, without re-encoding, into a new subfolder named after the source file (`name (2)/` the second time). Files are named `01.m4a` or `01 Name.m4a` and tagged with title, track number and album. Cancel keeps the tracks already written.

[unreleased]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/suleymanyaryev/audio-splitter/releases/tag/v1.0.0
