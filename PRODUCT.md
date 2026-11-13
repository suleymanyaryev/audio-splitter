# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the developer, who is also the only user. They have long work-music files (1–3 h of tracks played one after another, with short quiet gaps between them) and want each track as its own file so a music player's shuffle works. They have little audio experience and are learning audio concepts by watching the tool being built.

## Product Purpose

Load one long source file in the browser, see where the tool proposes splits, fix the proposals by hand (move, add, delete, rename), and export every track as its own file into a folder. Success is a folder of correctly cut, named tracks with no re-encoding. Terms are defined in `GLOSSARY.md`.

## Positioning

Nothing is uploaded: decoding, analysis and cutting all run locally in the browser. Detection is deliberately simple (a loudness curve and a silence threshold) and visible, so the user can see why each split was proposed and correct it.

## Operating Context

- Desktop Chrome only, at a desk, used in daylight and in the evening; the theme follows the system setting.
- One source file at a time; state lives in memory and is lost on reload.
- Two screens: a load screen (pick a file, watch it decode) and a review screen with five panels (whole-file waveform, loudness curve with threshold, zoomed view around one split, track list with rename, track strip with export). Wireframes: `docs/screens/1.png`, `docs/screens/2.png`.
- Source files are mostly `.m4a`, `.mp3` and `.opus`.

## Capabilities and Constraints

- Vue 3, Vite, TypeScript, Tailwind 4, Reka UI; a small `shared/ui` kit (`UiButton`, `UiIconButton`, `UiSlider`, `UiTextField`, `UiPanel`, `UiProgressBar`, `UiDialog`). Canvas views are hand-drawn inside their widgets.
- ffmpeg.wasm for decoding and cutting; signal code is hand-written.
- Export writes into a folder picked through the File System Access API.

## Evidence on Hand

- One real sample: `samples/sample1.m4a` (1 h 01 min, git-ignored). Its gaps sit around −30 to −40 dB.
- Real `sample1.mp3` and `sample1.opus` exist too (conversions of the m4a, git-ignored); no screenshots of a built UI.

## Product Principles

- The waveforms and the loudness curve are the content; everything else frames them.
- Show the mechanism: the user should be able to see why a split is where it is.
- Simple and readable over clever; the code is also a learning text.
- Manual correction is normal, not an error path.

## Accessibility & Inclusion

WCAG AA contrast, visible focus, every control reachable by keyboard. No further requirement stated.
