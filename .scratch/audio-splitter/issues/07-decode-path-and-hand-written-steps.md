# Decode path and hand-written steps

Type: grilling
Status: resolved
Blocked by: 04, 06

## Question

Given the options in [Decoding a long file for analysis](04-decoding-a-long-file-for-analysis.md) and the measurements from [Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md), how does the source file become analysis samples, and which steps does the user get to see as hand-written code?

Decide:

- The decode path.
- Whether downmixing to mono and downsampling are hand-written (slower, but the concepts of the draft's Milestone 2 stay visible) or delegated to ffmpeg flags.
- The analysis sample rate.
- What the worker keeps and what it sends to the page: raw analysis samples, waveform peaks, the loudness curve, or all three.
- What can be recomputed without decoding again when the user moves the silence threshold or the minimum gap length.

## Answer

Resolved 2026-11-13, grilled with the user. Builds on the facts in [Decoding a long file for analysis](04-decoding-a-long-file-for-analysis.md) and the measurements in [Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md).

**Decode path.** First a probe call reads duration, sample rate and channel count from ffmpeg's log. Then one `exec` per 60 s slice decodes to `f32le` at the file's own rate and channel count, with no `-ac` or `-ar` flags. The page reads each slice's PCM, analyses it, and deletes the slice file. 60 s rather than 300 s because it halves peak memory (+360 MB against +770 MB in the spike) for about 10 % more time. The slice length is one constant; whether MP3's seek-from-the-start cost changes it is for [What v1 claims for .mp3 and .opus](10-what-v1-claims-for-mp3-and-opus.md).

**Where the analysis runs: the page, with no app worker.** ffmpeg.wasm already runs in its own worker and transfers each slice to the page without a copy. The hand-written analysis takes about 8 ms per 60 s slice (0.5 s per hour in the spike), too little to freeze the UI. A second, app-owned worker would nest ffmpeg's worker inside it (untested under Vite) and add message plumbing for no measurable gain. `entities/source-file/api/analysis.worker.ts` is dropped from [Code layout](05-code-layout.md). The Web Worker idea is still taught, through ffmpeg's own worker.

**Downmix: hand-written, on the real path.** It averages every channel of each frame: mono passes through unchanged, stereo is `(L+R)/2`, and a rare 5.1 file is handled by the same formula. The concept note records that ffmpeg's `-ac 1` comes out 3.01 dB louder than this average.

**Analysis sample rate: the file's own (44.1 or 48 kHz). No downsampling code.** The loudness curve and peaks are computed directly from each full-rate slice, and the slice is then thrown away. No copy of the samples is kept, at any rate. Downsampling stays a concept: the note explains sample rate, Nyquist and aliasing, why aliasing does not change RMS, and why the app does not need to downsample, using ticket 04's measured table (8 kHz within 0.03 dB; trouble starts below 2 kHz).

**What is kept.** The `source-file` store keeps two arrays and nothing else:

- **Loudness curve**: a `Float32Array` of dB, one value per 50 ms window. A window is `round(rate × 0.05)` samples and window times come from sample counts, so odd rates such as 22.05 kHz work. A window that crosses a slice border carries its leftover samples into the next slice. The last, shorter window is kept. Digital silence is floored at −100 dB. A 3 h file gives about 216,000 values (0.9 MB).
- **Peaks**: one array holding the lowest and highest sample of the mono downmix for every 10 ms. The zoomed view reads it directly (10 ms per pixel shows about 10 s across 1000 px). The whole-file waveform merges buckets down to its pixel width when it draws. A 3 h file gives about 8.6 MB.

**What re-runs without decoding.** Gap finding re-runs on the stored loudness curve, in milliseconds, whenever the silence threshold or the minimum gap length changes. It **replaces all splits and every track name** with freshly detected ones. The workflow is to tune the two settings first and then edit. The glossary's **Split** stays as it is: detected and manual splits carry no flag. Whether the UI warns before discarding edits belongs to the review-screen interaction design.

**What is hand-written and what is delegated.**

| Step | Who |
| --- | --- |
| Reading the container, decoding, seeking to a slice | ffmpeg.wasm |
| Probe: parsing duration, rate and channels from the log | hand-written |
| Slice loop (60 s, progress counted per slice, reload about every 20 calls) | hand-written |
| Downmix (average of all channels) | hand-written |
| RMS and dB per 50 ms window, carried across slice borders | hand-written |
| Min/max peaks per 10 ms | hand-written |
| Gap finding on the loudness curve | hand-written |
| Downsampling | none (concept note only) |

## Comments

### 2026-11-13: amended by MP3 playback

[MP3 playback](19-mp3-playback.md) adds a 1 s pre-roll to every slice after the first (`-ss S-1 -i input -ss 1 -t 60`), measured in [Spike: decode and split the .mp3 and .opus samples](12-spike-decode-and-split-the-mp3-and-opus-samples.md) to make slice borders exact. It also accepts the slow decode of long MP3 files (time grows with the square of the length) with the 60 s slice unchanged.
