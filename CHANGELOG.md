# Changelog

What changed for the person using Audio Splitter, release by release. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Versions

Versions follow [Semantic Versioning](https://semver.org/) applied to the product, since the app has no API for other code to depend on:

- **Major**: a planned milestone set (v1, v2, …, as in [the milestones doc](docs/audio-splitter-milestones.md)), or a change that breaks what users already rely on: the exported files' names, tags or format, or, once the app keeps state across a reload, saved data that needs migrating.
- **Minor**: a new capability outside a milestone set, such as another supported format.
- **Patch**: a fix that adds no capability.

## Keeping it

- Each user-visible change adds a line under `## [Unreleased]` in the same commit, in one of Keep a Changelog's groups: Added, Changed, Deprecated, Removed, Fixed, Security. Write what the user notices, not how the code changed. Refactors, tests, tooling and docs get no entry.
- A release renames `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, opens a fresh `## [Unreleased]` above it, sets `version` in `package.json`, and tags the commit `vX.Y.Z`.

## [Unreleased]

### Added

- A track longer than 10 minutes plays in full. The player decodes it 10 minutes at a time, starting at the playhead, and decodes the next 10 minutes while you listen, so sound carries on into them with a break of about 60 milliseconds and no wait to decode. A click, a drag or a key press that moves the playhead outside the minutes already decoded decodes the minutes from there, which takes the 1 to 2 seconds a range takes.
- The Track view plays the selected track, from its start to its end. Its title row has "Back to track start" and Play, which reads "Stop" while the track is decoded and "Pause" while it plays; pausing and playing again resume at once. A click in the view moves the playhead, a press near the playhead drags it (a playing track pauses while it is held and plays on from where it is dropped), and the view takes the keyboard: Left and Right move the playhead 1 second, with Shift 10 seconds, Space plays or pauses, Home goes back to the start, and Delete and Backspace do nothing. At the track's end the sound stops and the playhead returns to the start. Playback stops when the selection changes, when the track's start or end moves, when a new range is dragged, when the view changes, when the export starts and when the page is left.
- A click on a track's block in the strip, on its row in the Track list, on its number button, or focusing its name field selects that track, the first track included, instead of the split where it starts. The selected track's block and row are marked, the whole-file view outlines its stretch, and the zoom panel switches to a Track view: the track stretched across the panel with its gaps and its two end splits, and its name, start and end as the title. The panel's control is now `Split | Track | Range`, each segment disabled while it has nothing to show. A split and a track are never selected together, and Split with a track selected shows the zoom window where it was with no split selected.
- A click in the Range view places a mark, a 1 px dashed line, and leaves the sound alone; Left and Right move it 100 ms, with Shift 1 second. "Add split" in the Range view's title row, or Enter, adds a split at the mark, without leaving the Range view or stopping the sound, so several track starts can be marked in one listen. The button is disabled with no mark and within a second of a split or of the file's ends, and the new split counts as an edit. A click within 6 pixels of a split's line selects that split and returns to the Split view. A new range has no mark.
- The playhead in the Range view can be dragged along the range to listen again from any point: a playing range pauses while the playhead is held and plays on from where it is dropped, a paused one stays paused, and a drag while the range is still being decoded sets where it starts. A "Back to range start" button left of Play, and Home on the Range view, move the playhead to the range's start and keep playing if it was playing.
- The range plays: a Play button in the Range view's title row decodes the range and plays it (it reads "Stop" while it is decoded and "Pause" while it plays), and so does Space on the Range view. A 1 px playhead shows where it is, or where it resumes: at the range's start for a new range. Pausing and playing again start at once, and at the range's end the sound stops and the playhead goes back to the start. Only one thing plays at a time: the range and "Play across split" stop each other, and playback stops when the view changes, a new range is dragged, the export starts or the page is left.
- Dragging across the whole-file waveform marks out a stretch of the file, from 1 second to 10 minutes, with a light overlay that stays until the next drag. A click still selects a split or moves the zoom window, and so does a drag under 1 second.
- A dragged-out range fills the zoom panel as its own view, with the range's waveform, gaps and splits stretched across it and its start, end and length as the title. A `Split | Range` control in the panel's title row switches between the zoom view and the range; selecting a split or moving the zoom window goes back to the zoom view, and the zoom window's outline shows on the whole-file view only while the zoom view is shown.

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

[unreleased]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/suleymanyaryev/audio-splitter/releases/tag/v1.0.0
