# 08 · Listening to a range

Milestone 6 plays the 8 s across a split. This milestone plays any stretch the user drags out, up to 10 min, and lets them pause it, jump around in it and add a split where they hear a track start. The method is the same as the audition's: ffmpeg decodes the range to a WAV and the page plays that, never the compressed file. What changes is the size. Eight seconds is 1.4 MB; ten minutes is 106 MB, and that is where the limit comes from.

## The words

- **Sample frame** (PCM): one sample for each channel, taken at the same instant. Stereo 16-bit is 2 channels × 2 bytes = 4 bytes per sample frame. (Not the same as a compressed frame in note 06, which is 1,024 to 1,152 samples.)
- **Byte rate**: sample rate × bytes per sample frame. In a WAV a time is a byte: second `t` starts at `44 + t × byte rate`.
- **Range** (GLOSSARY.md): the stretch of the source file the user drags out, 1 s to 10 min. **Mark**: the spot in it where "Add split" puts a split. **Playhead**: the line that shows where playback is, or where it will resume.

## Worked example: `samples/sample1`

**Why a WAV grows with its length.** At 44,100 samples per second, 2 channels, 2 bytes each, one second is 44,100 × 2 × 2 = **176,400 bytes**, about 176 KB. A 10 min range is 600 × 176,400 + 78 = **105,840,078 bytes**, about 106 MB, and the WAV is in memory as one blob until the range changes. `.opus` decodes at 48,000 per second, so its 10 min is 115,200,078 bytes (115 MB). The same range in the compressed file is 8 to 15 MB (7.6 MB as `.opus`, 11.7 MB as `.mp3`, 14.5 MB as `.m4a`). The limit keeps the wait short and the memory to one blob of about 100 MB; a longer range would need streaming, which this milestone leaves out.

**Why pausing and seeking are exact.** Note 06's `.mp3` has no formula from time to byte, so Chrome's `<audio>` lands 2 to 10 s off. In the WAV there is one: the user pauses 42.5 s into the range, the element's `currentTime` is 42.5, and that is sample frame 42.5 × 44,100 = 1,874,250, at byte 44 + 1,874,250 × 4 = **7,497,044**. Playing again reads from that byte. The same holds for a drag of the playhead: `currentTime = x` is a multiplication.

**What a pause means once the audio is PCM.** In the compressed file a pause in the middle of a frame is awkward: the decoder cannot start inside one (a frame holds 1,152 samples, 26.12 ms of MP3, and each depends on the ones before it). In PCM every sample frame stands alone, so a pause can fall between any two of them and resume from there with no decoding. That is why resuming costs nothing: the app keeps the WAV and the element's position, and does not call ffmpeg again.

**What it costs.** Native ffmpeg 8.1, a 10 min range, median of 5 runs, written to a file. The browser's number follows below.

| Range starts at | `.m4a` | `.mp3` | `.opus` |
| --------------- | ------ | ------ | ------- |
| 0 s             | 0.60 s | 0.56 s | 1.08 s  |
| 1,500 s         | 0.57 s | 0.62 s | 1.09 s  |
| 3,000 s         | 0.59 s | 0.67 s | 1.05 s  |

The `.mp3` grows with position, as in note 06, because ffmpeg finds its spot by reading from the start; here it adds about 0.1 s over 3,000 s. `.opus` takes about twice as long as the other two; it also writes 9 % more samples (48,000 per second).

**In the browser.** The same clip command in Chrome with the real ffmpeg.wasm, on the 3 h files (`sample3h`, `sample1` three times), measured on 2026-11-18 on an Apple M4 Pro with 24 GB, `pnpm dev`, through the source-file store's `clip` call after the file had loaded. Three runs of a 10 min range at 10,400 s (the range ends at 11,000 s of 11,058 s), then one run each earlier in the file:

| Range of 600 s starts at | `.m4a`         | `.mp3`         | `.opus`        |
| ------------------------ | -------------- | -------------- | -------------- |
| 100 s                    | 0.64 s         | 0.75 s         | 1.10 s         |
| 5,000 s                  | 0.65 s         | 1.32 s         | 1.07 s         |
| 10,400 s                 | 0.65 to 0.67 s | 1.98 to 2.08 s | 1.06 to 1.11 s |

The longest wait is the MP3, late in the 3 h file: about 2 s, below the 3 s the spec expected, and it grows with position (0.75 s, 1.32 s, 2.0 s) as it did natively. `.m4a` and `.opus` do not depend on the position. For comparison, the 8 s audition clip at 10,400 s took 1.25 s as `.mp3` and 20 ms as `.m4a` or `.opus`: nearly all of the MP3's wait is finding the spot, and the 10 min range pays it once. The WAV the store returns is exactly 105,840,078 bytes (`.m4a`, `.mp3`) or 115,200,078 bytes (`.opus`), as computed above.

**The limit and the timeout.** The 10 min limit holds: the slowest decode is 2.1 s. The clip's 30 s watchdog also holds, at about 14 times the slowest decode, and is still short enough that a call that really hangs fails while the user waits.

## Where it lives in the code

Filled in as each ticket lands. Existing modules are linked, new ones are named.

- [`src/entities/source-file/api/decode-clip.ts`](../../src/entities/source-file/api/decode-clip.ts): the clip command for a start and a length, instead of a split time.
- [`src/entities/source-file/model/source-file.ts`](../../src/entities/source-file/model/source-file.ts): the `clip` call follows the same change.
- [`src/entities/split/model/split.ts`](../../src/entities/split/model/split.ts): holds the range (`setRange`) and the panel's view (`view`, `showView`); the mark and "add split at the mark" are still to come.
- [`src/widgets/source-waveform/ui/SourceWaveform.vue`](../../src/widgets/source-waveform/ui/SourceWaveform.vue): the overlay, drawn from the live drag or the held range.
- [`src/widgets/source-waveform/lib/use-range-drag.ts`](../../src/widgets/source-waveform/lib/use-range-drag.ts): tells a click from a drag (4 px), captures the pointer and reports the live range.
- [`src/entities/split/lib/range-between.ts`](../../src/entities/split/lib/range-between.ts) and [`config/range-limits.ts`](../../src/entities/split/config/range-limits.ts): the range a drag makes, held to the file and to 10 min from the press, and the 1 s minimum.
- [`src/widgets/split-zoom/model/audition.ts`](../../src/widgets/split-zoom/model/audition.ts): becomes the one player, for the audition and for the range.
- [`src/widgets/split-zoom/ui/SplitZoom.vue`](../../src/widgets/split-zoom/ui/SplitZoom.vue): the zoom view the Range view sits beside.
- [`src/widgets/split-zoom/ui/RangeView.vue`](../../src/widgets/split-zoom/ui/RangeView.vue): the range stretched across the zoom panel, drawn from the peaks already held. Its `lib/range-window.ts` turns the range into the centre and length the zoom view's bar, land and axis helpers take, and `lib/range-title.ts` writes the title. Its playhead and mark pointer handling are new files in the same widget, still to come.
- [`src/shared/ui/UiSegmentedControl.vue`](../../src/shared/ui/UiSegmentedControl.vue): the `Split | Range` control.
- [`src/pages/review/ui/ReviewPage.vue`](../../src/pages/review/ui/ReviewPage.vue): swaps the zoom view and the Range view on the store's view, and holds the `Split | Range` control; "Add split", "Back to range start" and Play/Pause for the Range view are still to come.
