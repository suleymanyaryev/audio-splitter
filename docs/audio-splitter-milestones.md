# Audio Splitter: Milestones

A browser-only tool that proposes splits in a long source file (1–3 h of tracks played one after another, with audible gaps between them), lets the user review them, and exports each track as its own file. Nothing is uploaded. Vocabulary is in [GLOSSARY.md](../GLOSSARY.md).

The project exists for two equal reasons: the user needs the tool (split long work-music files, then shuffle them in a player), and the user is learning audio concepts by watching it being built. So each milestone teaches one idea, explains it before the code, and stops for confirmation.

Every technical decision below is locked. The detail of each decision lives in exactly one place, the ticket linked from the milestone; this document says what to build in which order, not how each piece was decided. The planning record is the [wayfinding map](../.scratch/audio-splitter/map.md).

## Stack

- Vue 3, Vite, TypeScript, Pinia (one setup store per entity). No router: `App.vue` switches between the load and review pages on state.
- Code layout: a subset of Feature-Sliced Design ([ADR 0001](adr/0001-fsd-subset.md), [Code layout][05]), enforced by `eslint-plugin-boundaries`.
- UI: Tailwind 4 (`@tailwindcss/vite`), Reka UI 2, `lucide-vue-next`, Manrope as a committed woff2, a `shared/ui` kit styled per [DESIGN.md](../DESIGN.md) ([Visual direction for the UI kit][11]). Canvas views are hand-drawn inside their widgets.
- Container work: `@ffmpeg/ffmpeg` 0.12.15 with the single-thread `@ffmpeg/core` 0.12.10, self-hosted, no special headers, source file mounted read-only with WORKERFS, a fresh worker about every 20 calls ([ffmpeg.wasm with long files in Chrome][02]).
- Desktop Chrome only. One source file at a time, state in memory only.

**Hand-written, because they are the learnable parts:** the probe's log parsing, the slice loop, downmix, RMS and dB per 50 ms, min/max peaks per 10 ms, gap finding, and all canvas drawing. Downsampling is a concept note only; no code does it ([Decode path and hand-written steps][07]).

## How a milestone session runs

One milestone per session.

1. Read the milestone below and the tickets it links.
2. Explain the concept in chat, with a number from the real sample.
3. Write the concept note, `docs/concepts/NN-<slug>.md`: about one screen, plain words, one worked example with real numbers from `samples/sample1.m4a`, and a "where it lives in the code" list of file links. It uses GLOSSARY.md's terms. An audio-only term (sample, frame, RMS) is defined in the note, not in the glossary.
4. **Stop 1**: the user asks questions and confirms the note. No code before this.
5. Build, with unit specs beside the code ([Testing approach][18]) and the Task-tier checks from `AGENTS.md`. Code comments say why, not what.
6. Show the result in the browser and run the Checkpoint checks.
7. **Stop 2**: the user confirms the milestone.
8. Commit on a `milestone/NN-<slug>` branch and merge it into `main`.

Milestone 0 has no concept, so it skips steps 2–4. A milestone that outgrows one session splits at its named **seam**, and only there.

The real samples (`samples/sample1.{m4a,mp3,opus}`, 1 h 01 min, git-ignored) are for trying things by hand and for calibration; no spec reads them.

---

## Milestone 0: Setup and UI kit

**Concept.** None; this milestone teaches no audio.

**Build.**

- Remove `vue-router`, `src/router/` and the scaffold's `e2e/vue.spec.ts`. Create the FSD folders that this milestone fills.
- Tailwind 4, the token block from DESIGN.md pasted into `src/app/styles/main.css`, Manrope woff2 committed, `lucide-vue-next`.
- `prettier-plugin-tailwindcss` and `eslint-plugin-boundaries` (layer direction, no imports between slices of one layer).
- The whole `shared/ui` kit with its variants, sizes (`sm`, `lg`) and states: `Button`, `IconButton`, `Slider`, `TextField` (with the inline variant), `Panel`, `ProgressBar`, `Dialog` (Reka `AlertDialog`). The `Dialog`'s look is designed here within DESIGN.md's rules (flat, hairline, no shadow) ([Review-screen interaction design][13]).
- Refresh the stale `.impeccable/design.json` with an impeccable documenter pass.
- Write the "Code layout" section in `AGENTS.md`, describing only folders that now exist. Replace the create-vue `README.md` with a pointer to `AGENTS.md`.

**Try it.** An empty load page and an empty review page, both built from the kit, in light and dark.

**Left for later.** Everything audio.

---

## Milestone 1: Sound is numbers

**Concept.** Digital audio is a list of numbers: PCM samples, sample rate, amplitude from −1 to 1, channels, and the difference between a container and a codec. Downmixing averages the channels into one. You cannot draw millions of samples, so a waveform draws the lowest and highest sample of each short stretch (min/max peaks). Note: `docs/concepts/01-sound-is-numbers.md`.

**Build.**

- Synthetic fixtures, one per supported format: about 30 s, three tone bursts separated by two 2 s silences. They are committed under `e2e/fixtures/`, with the short native-ffmpeg script that made them beside them ([Testing approach][18]).
- `shared/api/ffmpeg/`: load the pinned core, mount with WORKERFS, a timeout on every call.
- The probe: duration, sample rate, channel count, container and codec, parsed from ffmpeg's log. The container and codec decide whether the file is a supported format; an unsupported file gets the message naming what it is ([What v1 claims for .mp3 and .opus][10]).
- Decode the **whole file in one call** to `f32le` at the file's own rate. This is deliberately naive and only works for short files.
- `shared/lib/audio/`: downmix (average of all channels) and min/max peaks per 10 ms, with specs.
- `entities/source-file` store holding the file, its format, duration and peaks.
- Load page: "Choose file…" and drop anywhere, file chip ([Load progress, cancel and failure][15]). Review page: the `source-waveform` panel, merging 10 ms buckets down to its pixel width. "New file" returns to the load page.

**Try it.** Load a fixture and see three bursts and two silences. Load a `.ogg` Vorbis file and read the message.

**Left for later.** Long files, progress, Cancel, slice failures.

---

## Milestone 2: Long files

**Concept.** Memory math: an hour of stereo float32 at 44.1 kHz is about 1.3 GB, so the session opens by loading the 1 h sample with Milestone 1's code and watching it fail. Then: decoding in 60 s slices, the 1 s pre-roll that makes slices join seamlessly, carrying a window's leftover samples across a slice border, keeping only small summaries and throwing samples away, ffmpeg's own worker and why the app adds none, and the reload budget. Sample rate, Nyquist and aliasing explain why the app does not downsample (note only, using the measured table). Note: `docs/concepts/02-long-files.md`.

**Build.**

- `entities/source-file/api/decode-slice.ts`: `-ss S-1 -i input -ss 1 -t 60` (the first slice without pre-roll) ([Decode path and hand-written steps][07], [MP3 playback][19]).
- The slice loop: progress counted per slice, a fresh ffmpeg worker about every 20 calls, peaks carried across slice borders, each slice file deleted after analysis.
- Load page: `ProgressBar` "38 / 62 slices", Cancel (terminate, back to the empty load page), and the one failure message naming the step and ffmpeg's last log line, with "Choose another file" ([Load progress, cancel and failure][15]).

**Done when.** The 1 h sample loads in all three formats. Three 3 h files (`samples/sample3h.{m4a,mp3,opus}`, sample1 concatenated three times with native ffmpeg, git-ignored) also load without a crash. Their decode times are written into the concept note. If the 3 h MP3 is too slow, longer MP3 slices are measured here ([MP3 playback][19]).

**Try it.** The whole-file waveform of a 1 h file, with a live progress bar and a working Cancel.

**Left for later.** Loudness, gaps, splits.

---

## Milestone 3: Loudness

**Concept.** Windows (50 ms, sized from sample counts so odd rates work), RMS as the energy in a window, decibels as a log scale that matches hearing, a −100 dB floor for digital silence, and "silence" that is rarely zero. The curve's median is the file's typical loudness, which Milestone 4 builds on. Note: `docs/concepts/03-loudness.md`.

**Build.**

- `shared/lib/audio/`: RMS and dB per 50 ms window, with leftover samples carried across slice borders and the last, shorter window kept. Specs use generated tones and silence.
- The loudness curve (a `Float32Array` of dB) kept in the `source-file` store next to the peaks, and nothing else ([Decode path and hand-written steps][07]).
- The `loudness-curve` panel below the whole-file view, on the same time axis, with the 14 % fill from DESIGN.md.

**Try it.** On `sample1.m4a`, music sits around −15 dB and the gaps dip to −30 to −40 dB.

**Left for later.** The threshold line and anything that finds gaps.

---

## Milestone 4: Gaps become splits

**Concept.** Thresholding: the loudness curve under the silence threshold for at least the minimum gap length is a gap, and the split goes in its middle. A fixed threshold suits only files mastered at one loudness, so the default is the curve's median minus an offset. Tuning both settings is part of the lesson. Note: `docs/concepts/04-gaps-become-splits.md`.

**Build.**

- `entities/split/lib/find-gaps.ts` with specs.
- `entities/split` store: the splits, each split's track name (numbered by default), the two settings, and the tracks derived from them. A setting change re-runs gap finding on the stored curve and replaces all splits and track names ([Decode path and hand-written steps][07]).
- Default threshold = median − offset, computed once when analysis ends ([Default silence threshold][16]). **Calibrate the offset (start near 15 dB) and the minimum gap length (start near 1 s) with the user on all three samples**, comparing proposed splits with what the user hears; the chosen numbers go into the code and the concept note.
- The silence threshold and minimum gap length Sliders in the loudness panel's title row; the dashed threshold line as a second handle on the same value.
- Split markers on the whole-file and loudness views. The split-number band above the whole-file waveform. Lands (gaps) drawn at least 12 px wide in whole-file views.
- A read-only `track-list` (number, start, length) and `track-strip` (proportional blocks with name and length, title "Tracks (8)").

**Try it.** Drag the threshold and watch splits appear and vanish; count the tracks.

**Left for later.** Selecting, moving, adding, deleting and renaming.

---

## Milestone 5: Editing splits

**Concept.** Time on screen: mapping time to pixels and back, and one peaks array shown at two resolutions. The whole-file view merges thousands of 10 ms buckets into each pixel; the 20 s zoom view shows about one bucket per pixel. Note: `docs/concepts/05-time-on-screen.md`.

**Build** (everything in [Review-screen interaction design][13]):

- `split-zoom`: a fixed 20 s window, the run-out line across a land, the zoom-window outline on the whole-file view, `0:42:03.25` times.
- Selection: at most one split. Split 1 is selected on arrival and after every setting change. A click within 6 px of a whole-file marker selects it; a click elsewhere moves the zoom window there. Track-list rows and track-strip blocks select the split where their track starts.
- Moving: drag the handle, or Left/Right (10 ms) and Shift+Left/Right (100 ms). A split stays at least 1 s from its neighbours and the file's ends.
- "Add split" at the window's centre. Delete from a track-list row's trash button or with the Delete key on the handle.
- Inline renaming in track-list rows: Enter or blur saves, Escape reverts, empty falls back to the number, 100 characters at most, no invalid state.
- The store's "edited" state. The confirm dialog before a setting change or "New file" when edits exist.
- Canvas maths (time ↔ x, land widening, hit test) as plain functions with specs.

**Seam.** 5a: zoom view, selection, moving. 5b: add, delete, rename, edited state and confirm dialog.

**Try it.** Delete a false split, rescue a missed gap by clicking the whole-file view and adding a split, rename a track.

**Left for later.** Hearing the split.

---

## Milestone 6: Auditioning

**Concept.** Compressed audio is stored in frames. A variable-bitrate MP3 has no exact map from time to byte, which is why Chrome's `<audio>` seeks it seconds off. Decoding a short stretch with ffmpeg and playing it as WAV (a small header plus PCM) is exact for every format. Note: `docs/concepts/06-seeking-compressed-audio.md`.

**Build** ([Playback for auditioning a split][14], as changed by [MP3 playback][19]):

- A clip command beside `decode-slice.ts` in `entities/source-file/api/`: 8 s around the split (4 s either side) with the 1 s pre-roll, to WAV. It counts toward the reload budget.
- One hidden `<audio>` element playing that blob. "Play across split" (and Space on the focused handle) plays and stops by itself; while playing, the button reads "Stop". Moving, deselecting or selecting another split stops it.
- A 1 px ink playhead across the zoom view, driven by `currentTime` each animation frame.

**Try it.** Listen across a few splits in each format; near the end of the long MP3 the wait is up to about 1 s.

**Left for later.** Writing files.

---

## Milestone 7: Export

**Concept.** Stream copy versus re-encoding: copying compressed frames as they are is fast and lossless, but cuts land on frame boundaries (23 ms for AAC). Also covered: encoder priming and the MP3 last-track quirk, why the `.mp3` and `.opus` cut seeks twice, and tags. Note: `docs/concepts/07-cutting-without-re-encoding.md`.

**Build.**

- `entities/source-file/api/cut-track.ts`: `.m4a` keeps its command ([Stream-copy splitting per format][03]); `.mp3` and `.opus` use `-ss START-2 -i input -ss 2 -t LENGTH -c copy` ([MP3 playback][19]). It takes numbers, not splits.
- The export loop in `widgets/track-strip/model/`, one ffmpeg run per track, with the reload budget ([Export delivery and filenames][08]):
  - the folder picker on every export (fixed picker `id`);
  - a subfolder named after the source stem, never overwritten (`name (2)/`);
  - `03.m4a` or `03 Sunrise Drive.m4a`, zero-padded, sanitised;
  - tags: title, track `N/TOTAL`, album = source stem;
  - each track written and freed before the next.
- "Export to folder…" (primary `lg`) in the track strip's title row. With no splits, the whole file exports as one track.
- The locking overlay (the kit `Dialog`) with "Track 3 of 8", Cancel, and a closing summary such as "8 tracks saved to `evening-set-vol3/`"; a failure names the track.
- One Playwright spec per format, load → review → export on the fixtures, with `showDirectoryPicker` stubbed to the origin-private file system and the written files read back ([Testing approach][18]). These run in the Final tier.

**Seam.** 7a: `.m4a` export with overlay, filenames and tags. 7b: the `.mp3` and `.opus` cut commands and the three e2e specs.

**Try it.** Export `sample1` in each format, open the folder in a music player, and shuffle.

**Done when.** v1 is done.

---

## Not in v1

Ruled out on the [map](../.scratch/audio-splitter/map.md); each returns only as a fresh effort.

- The CUE sheet ([CUE sheet][17]).
- Spectral features, timbre comparison and ML.
- Hysteresis, adaptive threshold, minimum track length and a confidence score per split.
- Re-encoding, sample-accurate cuts and zero-crossing snapping.
- "Snap to quietest point" and ±0.1 s nudge buttons.
- Crossfaded or gapless mixes, and identifying track names.
- Help with repeated tracks in a looped playlist (a candidate for the next iteration).
- Opus in `.webm` and any other container and codec pair.
- Browsers other than desktop Chrome.
- Keeping splits and names across a reload; several source files at once.
- An app-owned Web Worker and any downsampling code.

[02]: ../.scratch/audio-splitter/issues/02-ffmpeg-wasm-with-long-files.md
[03]: ../.scratch/audio-splitter/issues/03-stream-copy-splitting-per-format.md
[05]: ../.scratch/audio-splitter/issues/05-code-layout.md
[07]: ../.scratch/audio-splitter/issues/07-decode-path-and-hand-written-steps.md
[08]: ../.scratch/audio-splitter/issues/08-export-delivery-and-filenames.md
[10]: ../.scratch/audio-splitter/issues/10-what-v1-claims-for-mp3-and-opus.md
[11]: ../.scratch/audio-splitter/issues/11-visual-direction-for-the-ui-kit.md
[13]: ../.scratch/audio-splitter/issues/13-review-screen-interaction-design.md
[14]: ../.scratch/audio-splitter/issues/14-playback-for-auditioning-a-split.md
[15]: ../.scratch/audio-splitter/issues/15-load-progress-cancel-and-failure.md
[16]: ../.scratch/audio-splitter/issues/16-default-silence-threshold.md
[17]: ../.scratch/audio-splitter/issues/17-cue-sheet.md
[18]: ../.scratch/audio-splitter/issues/18-testing-approach-for-the-signal-code.md
[19]: ../.scratch/audio-splitter/issues/19-mp3-playback.md
