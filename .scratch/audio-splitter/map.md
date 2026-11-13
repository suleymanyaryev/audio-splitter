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
- Review screen keeps five panels from `docs/screens/2.png`: whole-file waveform with splits, loudness curve with a draggable threshold line, zoomed view around one split with play-across and drag-to-move, split list with add and delete, resulting-tracks strip with rename and export.
- A CUE sheet export is a small final milestone, droppable.
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
- [Visual direction for the UI kit](issues/11-visual-direction-for-the-ui-kit.md): "Side of an LP". Tracks are drawn as waveform bands and gaps as flat lands, with one vermilion that only marks splits, the threshold and danger. Light and dark follow the system. Manrope (a committed woff2), `lucide-vue-next` icons, and the kit's variants and states. The tokens are a ready-to-paste Tailwind 4 `@theme` block in [DESIGN.md](../../DESIGN.md); the product record is [PRODUCT.md](../../PRODUCT.md).

## Not yet specified

- **Review-screen interaction design.** How the five widgets (`source-waveform`, `loudness-curve`, `split-zoom`, `split-list`, `track-strip`) behave: dragging a split, moving the zoom window, where renaming happens, and where the minimum gap length control sits now that the wireframe's settings panel is gone, how wide the zoom window is (peaks are 10 ms buckets), and whether the UI warns before a setting change replaces all splits and track names. The look is settled in DESIGN.md. From Visual direction for the UI kit: panel arrangement and heights, whether the kit needs a small (32 px) button size, and the invalid state of the inline rename field. Likely a prototype ticket.
- **Playback for auditioning a split.** Probably a plain `<audio>` element on the source file; whether seeking is accurate enough in a variable-bitrate MP3 is unknown.
- **Progress, cancel and failure while loading.** (Export's overlay is settled in Export delivery and filenames.) What the load screen reports while slices decode, and what happens with a file ffmpeg cannot read. The spike showed that progress can only be counted per call (slice or track), and that cancelling means `terminate()`. The failure mode near the memory limit is still unseen.
- **CUE sheet details.** Small; only matters once export works. Probably written into the same export subfolder.
- **Default silence threshold.** The sample's gaps are fade tails at −30 to −40 dB, so a fixed −50 dB default proposes nothing. Whether the default is a fixed higher value or is derived from the file's own loudness is open; it belongs to the detection milestone.
- **Testing approach for the signal code.** Synthetic fixtures (generated tones and silence) versus real sample files, and whether any flow needs an e2e spec. An export e2e spec would have to stub `showDirectoryPicker`.

## Out of scope

- Spectral features, timbre comparison and ML (the draft's Milestone 6): the simplest detection plus manual deletion covers the need.
- Crossfaded or gapless mixes with no quiet point between tracks.
- Identifying track names.
- Hysteresis, adaptive threshold, minimum track length and a confidence score per split.
- Re-encoding, sample-accurate cuts and zero-crossing snapping.
- "Snap to quietest point" and the ±0.1 s nudge buttons from the wireframe.
- Browsers other than desktop Chrome.
- Keeping splits and names across a reload; several source files at once.
- Helping with repeated tracks when a source file is a playlist played several times (finding the repeats, or exporting only the first pass). Out of v1 by the user's decision on 2026-11-13; the user deletes duplicate tracks by hand. A candidate for the next iteration, since the first sample appears to be such a loop.
