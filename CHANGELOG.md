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
