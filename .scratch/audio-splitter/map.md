# Audio Splitter: wayfinding map

Label: wayfinder:map

## Destination

A rewritten `docs/audio-splitter-milestones.md` in which every technical decision is locked (decode path, split and export path, code layout, review-screen scope), so that each milestone can be built in its own later session with nothing left to decide. The map plans; it builds nothing except the throwaway spike.

## Notes

**Domain.** A browser-only tool that proposes splits in a long source file (1–3 h of concatenated tracks with audible gaps) and exports each track as its own file. Vocabulary is in `GLOSSARY.md`; use those terms in ticket titles and answers.

**Skills.** Every grilling ticket: `grilling` and `domain-modeling`. UI questions: `impeccable`. No `research` or `prototype` skill is installed: a research ticket is resolved by a subagent with web access that writes its findings into the ticket's `## Answer`; a prototype ticket is a throwaway spike that is deleted once the ticket is resolved. The repo has no git remote, so research findings live in the ticket file, not on a pushed branch.

**Why the project exists.** Two reasons with equal weight: the user needs the tool (split long work-music files, then rely on a player's shuffle), and the user is learning audio concepts by watching it being built. The second reason shapes the destination: each milestone teaches one idea, explains the concept before the code, saves that explanation as a short note in `docs/concepts/`, and stops for confirmation. Code comments say why, not what.

**Standing preferences.**

- Simple and human-readable over reusable. No abstraction that exists only for a possible future.
- Few dependencies, each one justified. This rule is about core logic: signal processing (peaks, downmix, RMS, dB, gap finding) and canvas drawing are hand-written because they are the learnable parts.
- Container work (reading and writing `.mp3`, `.m4a`, `.opus`) uses ffmpeg.wasm. The user chose it.
- UI uses Reka UI primitives and Tailwind. Code follows a subset of Feature-Sliced Design, settled in [Code layout](issues/05-code-layout.md).

**Settled while charting** (decisions with no ticket of their own):

- Source files are mostly lossy: `.mp3`, `.m4a` (AAC), `.opus`, 1–3 h long.
- Gaps are audible silence or near-silence of about 1–3 s.
- Detection is the simplest that works: a loudness curve (RMS in dB per window of about 50 ms) and "quiet for at least the minimum gap length means a split at the middle of the gap". Two settings only: silence threshold and minimum gap length. False splits are acceptable; the user deletes them by hand.
- Export cuts the original stream without re-encoding, in the source file's format. Cut accuracy of a few tens of milliseconds is accepted.
- Desktop Chrome only.
- Tracks are numbered by default; the user can rename a track before export. The name goes into the filename.
- Review screen keeps five panels from `docs/screens/2.png`: whole-file waveform with splits, loudness curve with a draggable threshold line, zoomed view around one split with play-across and drag-to-move, track list with rename and delete, resulting-tracks strip with export (the list became a track list in [Review-screen interaction design](issues/13-review-screen-interaction-design.md)).
- One source file at a time, state in memory only.
- The repo's existing Vue 3 + Vite + TypeScript scaffold stays.

## Decisions so far

<!-- one line per resolved ticket: [title](link): gist -->

- [Add sample files](issues/01-add-sample-files.md): one real sample, `samples/sample1.m4a` (AAC, 1 h 01 min, 89 MB, git-ignored). Its gaps sit around −30 to −40 dB and none is under −50 dB, so the draft's −50 dB default finds nothing. No `.mp3` or `.opus` sample exists.
- [Decoding a long file for analysis](issues/04-decoding-a-long-file-for-analysis.md): first choice is ffmpeg.wasm decoding in 5-minute slices to full-rate stereo PCM, with the slice loop, downmix and downsample hand-written; fallback is one ffmpeg run with `-ac 1 -ar 8000`; `decodeAudioData` is rejected. About 8 kHz mono is enough for gap detection. All browser figures are estimates for the spike to measure.
- [Stream-copy splitting per format](issues/03-stream-copy-splitting-per-format.md): one ffmpeg run per track with `-ss` and `-to` on the same side of `-i`, never the segment muxer. Measured on the real `.m4a` sample: cuts land within one frame (23 ms) and title and track-number tags cost about 63 bytes and no time. MP3 and Opus are from documentation only and need a real file in the spike.
- [ffmpeg.wasm with long files in Chrome](issues/02-ffmpeg-wasm-with-long-files.md): pin `@ffmpeg/ffmpeg@0.12.15` with the single-thread `@ffmpeg/core@0.12.10`, self-hosted, no special headers; mount the source file read-only (WORKERFS) so input size is not the limit. The limits are on the other side: the core fails after repeated calls on one worker (reload it about every 20 calls), outputs are held in memory, the project has had no release since January 2025, and the default core is GPL.
- [Spike: decode and split a real file](issues/06-spike-decode-and-split-a-real-file.md): both risky parts work on the real `.m4a` in Chrome. Sliced decode of 1 h takes 4.4 s; the hand-written downmix and decimation match ffmpeg within 0.03 dB; reloading every 20 calls carried 71 calls with no failure; the 8 cut tracks start on the sample, end within one frame, and the user judged them good enough for v1. `.mp3`, `.opus` and a 3 h file are still unverified.
- [Code layout](issues/05-code-layout.md): FSD layers `app`, `pages`, `widgets`, `entities` (`source-file`, `split`), `shared`, with no `features` layer, no barrels and no router ([ADR 0001](../../docs/adr/0001-fsd-subset.md)). Signal math in `shared/lib/audio/`, ffmpeg machinery in `shared/api/ffmpeg/`, and Pinia setup stores per entity. Tailwind 4, Reka UI and a day-one `shared/ui` kit; `eslint-plugin-boundaries` and `prettier-plugin-tailwindcss` approved.
- [Decode path and hand-written steps](issues/07-decode-path-and-hand-written-steps.md): probe, then 60 s slices of `f32le` at the file's own rate, analysed on the page (no app worker; Code layout amended). Downmix (average of channels), RMS/dB per 50 ms and min/max peaks per 10 ms are hand-written; no downsampling code, only a concept note. Only the loudness curve and one peaks array are kept. A setting change re-runs gap finding on the curve and replaces all splits and track names.
- [Export delivery and filenames](issues/08-export-delivery-and-filenames.md): export writes into a new subfolder named after the source file inside a folder picked on every export (File System Access API, no zip), never overwriting (`name (2)/`). Files are `03.m4a` or `03 Sunrise Drive.m4a`. One ffmpeg run per track behind a "Track 3 of 8" overlay with Cancel. Tags are title, track `N/TOTAL` and album = source stem. Every export writes all tracks.
- [What v1 claims for .mp3 and .opus](issues/10-what-v1-claims-for-mp3-and-opus.md): v1's supported formats are AAC in `.m4a`, MP3 and Opus in Ogg, each only once it passes the m4a spike's bar; there is no "untested" tier. Real `sample1.mp3` and `sample1.opus` (conversions of the m4a) now exist, and the agent checks them in a task ticket that blocks Milestone sequence. The probe's container and codec decide, not the extension; an unsupported file gets a message naming what it is. A failing format leaves v1 unless a command-line change fixes it. The MP3 last-track quirk is accepted.
- [Visual direction for the UI kit](issues/11-visual-direction-for-the-ui-kit.md): "Side of an LP". Tracks are drawn as waveform bands and gaps as flat lands, with one vermilion that only marks splits, the threshold and danger. Light and dark follow the system. Manrope (a committed woff2), `lucide-vue-next` icons, and the kit's variants and states. The tokens are a ready-to-paste Tailwind 4 `@theme` block in [DESIGN.md](../../DESIGN.md); the product record is [PRODUCT.md](../../PRODUCT.md).
- [Review-screen interaction design](issues/13-review-screen-interaction-design.md): panels stack top to bottom (whole file, loudness curve, zoom view beside a track list, track strip) and the page scrolls. The zoom view is a fixed 20 s window on the selected split, moved to empty spots by clicking the whole-file view. Splits move only there (drag or arrow keys, 1 s from neighbours); one "Add split" at the window centre; delete from track-list rows. `split-list` became `track-list`, where renaming happens inline with no invalid state. Both settings are Sliders in the loudness panel. A confirm dialog guards setting changes and "New file" only when edits exist. The kit gains `sm` buttons and a `Dialog`.
- [Playback for auditioning a split](issues/14-playback-for-auditioning-a-split.md): "Play across split" (or Space on the split handle) plays 4 s either side and stops, with a playhead in the zoom view, through one hidden `<audio>` element. What it plays was changed by MP3 playback.
- [Load progress, cancel and failure](issues/15-load-progress-cancel-and-failure.md): choose or drop a file; a file chip, a "38 / 62 slices" bar and Cancel (terminate, back to empty); every failure ends in one message naming the step and ffmpeg's last log line, with "Choose another file". No size limit.
- [Default silence threshold](issues/16-default-silence-threshold.md): the default is the loudness curve's median minus an offset (about 15 dB); offset and minimum gap default (about 1 s) are calibrated with the user in the detection milestone on all three samples.
- [Testing approach](issues/18-testing-approach-for-the-signal-code.md): unit specs generate tone-and-silence arrays in code for signal code, the split store and canvas maths; one Playwright spec per format runs load → review → export on a committed 30 s synthetic fixture, with the folder picker stubbed to the origin-private file system.
- [Spike: decode and split the .mp3 and .opus samples](issues/12-spike-decode-and-split-the-mp3-and-opus-samples.md): `.mp3` (VBR, CBR, with cover) passes the bar and `.opus` passes every measurement but 6 of its 7 cut starts carry a short −37 to −41 dBFS burst the user must listen to; Chrome's `<audio>` seeks VBR MP3 2–10 s off (m4a and Opus exact), and a 1 s pre-roll per slice plus `-ss START-2 -i … -ss 2` cuts are command-line fixes for later tickets. The user then listened and heard nothing, so `.opus` passes too.
- [MP3 playback](issues/19-mp3-playback.md): Chrome seeks VBR MP3 seconds off, so every format plays an 8 s WAV clip that ffmpeg decodes around the split. Adopted from the spike: a 1 s pre-roll on each decode slice (amends Decode path), the faster `-ss START-2 -i … -ss 2 -t` cut for `.mp3` and `.opus` (amends Stream-copy splitting), and the slow decode of long MP3 files is accepted. All three formats are in v1.

- [Milestone sequence](issues/09-milestone-sequence.md): **destination reached.** [docs/audio-splitter-milestones.md](../../docs/audio-splitter-milestones.md) is rewritten: M0 setup and UI kit (no concept note), then M1 Sound is numbers, M2 Long files, M3 Loudness, M4 Gaps become splits, M5 Editing splits, M6 Auditioning, M7 Export. Each milestone has one concept note in `docs/concepts/`, two stops for confirmation, a `milestone/NN-<slug>` branch, and links to the tickets holding its detail. M5 and M7 have named seams.

## Not yet specified

Nothing. The last items became tickets on 2026-11-13: playback, load progress, the default silence threshold, the CUE sheet and the testing approach.

## Out of scope

- [CUE sheet](issues/17-cue-sheet.md): dropped from v1 by the user; separate files for shuffle are the need, and a CUE sheet would point at a source file export never copies.
- Spectral features, timbre comparison and ML (the draft's Milestone 6): the simplest detection plus manual deletion covers the need.
- Crossfaded or gapless mixes with no quiet point between tracks.
- Identifying track names.
- Hysteresis, adaptive threshold, minimum track length and a confidence score per split.
- Re-encoding, sample-accurate cuts and zero-crossing snapping.
- "Snap to quietest point" and the ±0.1 s nudge buttons from the wireframe.
- Browsers other than desktop Chrome.
- Opus in `.webm` (yt-dlp's usual Opus download) and any other container and codec pair beyond the three supported formats: each would add its own export command and risks. Ruled out in [What v1 claims for .mp3 and .opus](issues/10-what-v1-claims-for-mp3-and-opus.md); the user converts such a file first.
- Keeping splits and names across a reload; several source files at once.
- Helping with repeated tracks when a source file is a playlist played several times (finding the repeats, or exporting only the first pass). Out of v1 by the user's decision on 2026-11-13; the user deletes duplicate tracks by hand. A candidate for the next iteration, since the first sample appears to be such a loop.
