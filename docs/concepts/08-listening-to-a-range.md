# 08 · Listening to a range

Milestone 6 plays the 8 s across a split. This milestone plays any stretch the user drags out, up to 10 min, and lets them pause it, jump around in it and add a split where they hear a track start. The method is the same as the audition's: ffmpeg decodes the range to a WAV and the page plays that, never the compressed file. What changes is the size. Eight seconds is 1.4 MB; ten minutes is 106 MB, and that is where the limit comes from. A track can be longer than a range may be; the last section is how one is heard in full.

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

**From the press of Play to sound.** Checked by hand in the same browser on the same 3 h files, with a 10 min range from 10,400 s (held to 11,000 s) made by dragging on the whole-file view, on 2026-11-18. The time is from the click on Play to the element playing, so it includes the clip call, the blob and `play()`:

| `.m4a` | `.mp3` | `.opus` |
| ------ | ------ | ------- |
| 0.69 s | 1.94 s | 1.16 s  |

It matches the decode times above, so nothing else in the press is slow. Pausing and pressing Play again took 2 to 5 ms in all three: the WAV is held, so the press sets `currentTime` and calls `play()`, and ffmpeg is not asked again.

## A track longer than 10 min: a moving window

A range is never longer than 10 min, but a track can be (the 3 h file's last tracks are 1.5 to 2.3 min, and a user who deletes a few splits makes a long one). The player still decodes no more than 10 min at a time, so a long track is heard through a **window**: a part of the track, decoded to a WAV, that moves along it.

**The arithmetic.** Take the track at 10,159.45 s of the 3 h MP3, 764 s long after six splits are deleted (it ends at 10,923.40 s). The playhead starts at the track's start, so the first window is 10,159.45 s to 10,759.45 s: 600 s, a WAV of 105,840,078 bytes. The next window is due when the playhead is 30 s from the end of the first, at 10,729.45 s, and it starts where the first ends, 10,759.45 s, and runs to the track's end: 163.95 s, about 29 MB. The two are held together for the last 30 s of the first and the whole of the second's first moments, at most 2 × 105.8 MB = 212 MB (2 × 115.2 MB = 230 MB as `.opus`); when the first ends, its WAV is let go and one is held again.

**A seek.** Inside the held window it is the same multiplication as in a range: `currentTime = x`, exact and immediate. Outside it there is no WAV to read from, so the player lets both windows go and decodes a new one that starts at the seek point and runs 10 min (or to the track's end): the wait is a decode, as for a new range. A seek to the track's very end ends the track, as the end of a short one does.

**The hand-over.** The window ahead is asked for when the element reports the playhead is 30 s from the end (`timeupdate`, a few times a second), once per window, so a decode that takes 2 s has 28 s to spare. When the first window ends, the element is pointed at the second's blob URL and played: nothing is decoded, but the element has to load the new source, and that is the one break. When the window ahead is not there yet (a seek 3 s before the end of a window, with a slow decode), the Play button reads "Stop" until it arrives, as for any decode.

**In the browser.** The same track (95 · 2:49:19 – 3:02:03, made by deleting the start splits of tracks 96 to 101 in the Track list) in Chrome on the 3 h files, same machine as above, on 2026-11-19. The element's events are logged with `performance.now()`; the hand-over is from `ended` of the first window to `playing` of the second. The playhead was read at rest, by pausing.

| Measured                                              | `.m4a`  | `.mp3`  | `.opus` |
| ----------------------------------------------------- | ------- | ------- | ------- |
| Play to sound, first window (600 s)                   | 0.85 s  | 1.85 s  | 1.36 s  |
| `ended` to `playing`, window ahead decoded in advance | 58.8 ms | 59.6 ms | 59.0 ms |
| The same with the playhead put 3 s before the end     | 59.2 ms | 58.6 ms | 59.8 ms |
| Click outside the window to sound, new window (600 s) | 0.81 s  | 2.32 s  | 1.32 s  |

The second window's WAV is 163.9 s long in all three. A seek to 300 s into the window and 1 s of play read 10,460.46 s for an expected 10,460.48 s (`.m4a`). 1.3 s after the hand-over the playhead read 10,760.79 s, 10,760.77 s and 10,760.82 s, where the boundaries were 10,759.48 s, 10,759.45 s and 10,759.50 s: it carried on from the boundary. The click outside the window put the playhead at 10,312.27 s for a click at 10,312.26 s, and at the end of the last window the track stopped with the playhead back at its start in all three. The window ahead in the third row was only 11 s, the track's last stretch after the click. The first and last rows are one 10 min decode each, plus the press, and match the earlier tables (0.69, 1.94 and 1.16 s from the press to the sound); the MP3's are the longest because the window is late in the file.

**What the break is.** The 59 ms are the element loading a new source: `loadedmetadata` 10 to 13 ms after the switch and `canplay` about 45 ms after that, the same in the three formats. No decode is waited for, but it is not gapless: a user can hear a short drop-out once for each 10 min window. The way to remove it would be a second element started before the first ends; this milestone keeps the one element, and the break is about 0.01 % of the time.

## Where it lives in the code

Existing modules are linked, new ones are named.

- [`src/entities/source-file/api/decode-clip.ts`](../../src/entities/source-file/api/decode-clip.ts): the clip command for a start and a length, instead of a split time.
- [`src/entities/source-file/model/source-file.ts`](../../src/entities/source-file/model/source-file.ts): the `clip` call follows the same change.
- [`src/entities/split/model/split.ts`](../../src/entities/split/model/split.ts): holds the range (`setRange`), the mark (`placeMark`, `markSeconds`) and the panel's view (`view`, `showView`); `addSplitAt(seconds)` adds a split at a time, rounded to the 10 ms grid, without selecting it, by the same 1 s rule as `addSplit`; `addSplitAtMark` does it at the mark (`canAddSplitAtMark`), and the Range view's Shift+Enter does it at the playhead.
- [`src/widgets/source-waveform/ui/SourceWaveform.vue`](../../src/widgets/source-waveform/ui/SourceWaveform.vue): the overlay, drawn from the live drag or the held range.
- [`src/widgets/source-waveform/lib/use-range-drag.ts`](../../src/widgets/source-waveform/lib/use-range-drag.ts): tells a click from a drag (4 px), captures the pointer and reports the live range.
- [`src/entities/split/lib/range-between.ts`](../../src/entities/split/lib/range-between.ts) and [`config/range-limits.ts`](../../src/entities/split/config/range-limits.ts): the range a drag makes, held to the file and to 10 min from the press, and the 1 s minimum.
- [`src/widgets/split-zoom/model/player.ts`](../../src/widgets/split-zoom/model/player.ts): the one player, for the audition and for a stretch, the range or the selected track. A stretch is played with `toggle()`, which decodes its window on the first press and keeps the WAV, so a pause and a replay set `currentTime` inside it and decode nothing; `seek`, `backToStart`, `grabPlayhead` and `dropPlayhead` move the playhead the same way. For a stretch over 10 min it decodes the next window ahead and plays on into it.
- [`src/widgets/split-zoom/lib/decode-window.ts`](../../src/widgets/split-zoom/lib/decode-window.ts): which window to decode for a stretch and a playhead (`decodeWindow`), whether a time is inside one (`windowHolds`) and when the next is due (`nextWindow`).
- [`src/widgets/split-zoom/ui/SplitZoom.vue`](../../src/widgets/split-zoom/ui/SplitZoom.vue): the zoom view the Range view sits beside.
- [`src/widgets/split-zoom/ui/RangeView.vue`](../../src/widgets/split-zoom/ui/RangeView.vue): the range stretched across the zoom panel, drawn from the peaks already held. Its `lib/stretch-axis.ts` maps the range (the player's extent) onto the canvas, and gives the centre and length the zoom view's bar and land helpers take (through `lib/range-window.ts`), and `lib/range-title.ts` writes the title. It draws the playhead and is a slider on it ("Playhead in the range"): Left and Right move the playhead 1 s, with Shift 10 s, Space and Home play and rewind (all four in `lib/use-stretch-keys.ts`, shared with the Track view), Enter adds a split at the mark and Shift+Enter at the playhead, and a held Space, Enter or Shift+Enter counts once. `lib/use-playhead-drag.ts` drags the playhead, and the view's own pointer handling is: a single press takes hold of the playhead within 6 px and otherwise places the mark, even next to a split's line, and a double-click selects the split whose line is within 6 px and otherwise moves the playhead there.
- [`src/shared/lib/canvas/dash-pattern.ts`](../../src/shared/lib/canvas/dash-pattern.ts): the dash of the mark, shared with the silence threshold.
- [`src/shared/ui/UiSegmentedControl.vue`](../../src/shared/ui/UiSegmentedControl.vue): the `Split | Range` control.
- [`src/widgets/split-zoom/ui/TrackView.vue`](../../src/widgets/split-zoom/ui/TrackView.vue): the selected track in the same place, drawn the same way, with the playhead and the same `lib/use-playhead-drag.ts`. A press takes hold of the playhead, selects a pending split within 6 px, or places the track's mark, and a double-click selects an end split within 6 px or moves the playhead; Left and Right move the playhead 1 s, with Shift 10 s. `lib/track-extent.ts` has `trackExtent`, the track as the start and end the player takes, and the view reads it as the player's extent.
- [`src/pages/review/ui/ReviewPage.vue`](../../src/pages/review/ui/ReviewPage.vue): swaps the zoom view, the Track view and the Range view on the store's view, and holds the `Split | Track | Range` control; its Play button reads "Stop", "Pause" or "Play", with "Back to range start" or "Back to track start" beside it, and its "Add split" follows the view (at the window's centre in the zoom view, at the mark in the Range view).
