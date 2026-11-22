# 10 · Speed without pitch

This milestone adds a play speed, 0.5× to 2.0×, to the player. The control is small. The idea under it is not: there are two ways to make sound play faster, and only one of them keeps the pitch. This note makes a sample twice as fast both ways, measures what each does, and explains the method that keeps the pitch.

## The words

- **Sample rate**: how many samples make one second, as in note 01. 44,100 for the sample used here.
- **Pitch**: how high a note sounds. It is its **frequency**, the number of times the wave repeats in a second. A wave that repeats 90 times a second is 90 Hz, a low hum. Doubling it moves the note up one octave.
- **Period**: the length of one repeat. In samples, `sample rate / frequency`.
- **Resampling**: playing the same list of samples at a different sample rate. This is what a tape or a record does when it is sped up.
- **Time-stretching**: changing how long the sound lasts while keeping its pitch. The samples are not just replayed at another rate: the sound is rebuilt from pieces of itself.
- **WSOLA** (waveform-similarity overlap-add): the time-stretching method used by ffmpeg's `atempo` and by Chrome, explained below.
- **Play speed** (GLOSSARY.md): how fast the source is heard against real time. Avoid "rate", which is the sample rate here.
- **Stretch** (in the player's code, `toggleStretch`): a piece of the source file the player plays, the range or the selected track. It has nothing to do with time-stretching: one word for two unrelated things.

## Worked example: `samples/sample1.m4a`

Ten seconds from 1:00.000, mono, 44,100 Hz: 441,000 samples. Native ffmpeg 8.1 made it twice as fast two ways, on 2026-11-22:

- **Resampled:** `asetrate=88200,aresample=44100`. The same samples, each one lasting half as long. This is tape played fast.
- **Time-stretched:** `atempo=2`. The same sound, in half the time.

The length is from the file's sample count. The strongest frequency is the highest peak of a Hann-windowed FFT of 32,768 samples (a bin 1.35 Hz wide), on the same stretch of sound in each version: 1 s into the original, so 0.5 s into the fast ones.

| Version             | Length   | Strongest frequency            |
| ------------------- | -------- | ------------------------------ |
| Original            | 10.000 s | 89.73 Hz                       |
| Resampled ×2        | 5.000 s  | 179.61 Hz: ×2.00, an octave up |
| Time-stretched ×2   | 5.0008 s | 90.16 Hz: ×1.00, unchanged     |
| Resampled ×0.5      | 20.000 s | 44.83 Hz: an octave down       |
| Time-stretched ×0.5 | 19.965 s | 90.05 Hz: unchanged            |

The lengths are the same, and the pitches are not: that is the whole difference.

**Why resampling moves the pitch.** The strongest frequency is a bass note that repeats every 44,100 / 89.73 = **491.5 samples**. Resampling does not change those 491.5 samples. It only changes how long a sample lasts: at 88,200 samples a second, 491.5 of them take half as long, so the note repeats twice as often, at 88,200 / 491.5 = 179.5 Hz. Every repeat is kept and squeezed into half the time: 897 repeats in 10 s, 898 in 5 s. Speed and pitch are one number, and they cannot move apart.

**What time-stretching does instead.** It keeps the period at about 491.5 samples, so the pitch stays. Half the time then fits only half the repeats: 451 of them in 5.0008 s. The sound has been cut up and about every other repeat dropped, and the cuts must not be heard. The lengths show it is not a resample: 5.0008 s and 19.965 s are not exact, because `atempo` works in whole blocks, and the resampled versions (5.000 s, 20.000 s) are.

## WSOLA

1. **Cut** the sound into short blocks that overlap, so each block shares its edges with its neighbours.
2. **Lay them down at a new spacing.** To go twice as fast, the next block is taken from twice as far ahead in the source, so about half of the source is never used. To go half as fast, the blocks are taken from half as far ahead, so each stretch of source is used by two blocks in a row.
3. **Line each block up with its neighbour.** If a block is laid down exactly where the plan puts it, the two waves may be out of step at the join, and the cross-fade between them is heard as a click or a hollow flutter. So each block is slid a little, within a small search range, to the spot where its waveform is **most like** the end of the block before it. That is the "waveform similarity". A held note is periodic, so a spot where the waves match is always near, and the join is silent.
4. **Cross-fade** the overlap. One block fades out as the next fades in.

Pitch survives because no block is replayed at another rate: each is the original sound at its original pace, and only the number of blocks, and so the total time, changes.

**Why speech and drum hits smear.** The search in step 3 works because a held note repeats. A drum hit is a burst, and a consonant ("t", "s") is mostly noise: each is a single event with nothing like it nearby to line up with. At 2.0×, the burst can fall in the part of the source that is skipped, or be cut by a block edge. At 0.5×, two blocks in a row use it, so it is laid down twice, a few tens of milliseconds apart. Either way the attack, which is the instant a hit starts, is blurred, which is why fast speech sounds slightly mushy and a snare gets a faint echo. Close to 1× the blocks barely move and little is lost; the effect grows towards the ends of the range.

**Why the app does not do it by hand.** The app's learnable signal maths is hand-written, but this one is done by the browser: the player is an `<audio>` element, and a hand-written stretch would mean leaving it. [ADR 0004](../adr/0004-time-stretching-by-the-browser.md) has the reasoning. This note is the learning: the method above is what Chrome runs when the app sets the speed.

## In Chrome

**Checked in Chrome (2026-11-22).** Chrome 158.0.8127.37 on an Apple M4 Pro with 24 GB, `pnpm dev`, `samples/sample1.m4a` loaded, driven with the browser automation skill. The page's one `<audio>` element was routed through an analyser node (`createMediaElementSource`, a 32,768-point FFT at 44,100 Hz, a bin 1.35 Hz wide), so what is measured is the sound after the element's own time-stretching, not the file. The element's events were logged with `performance.now()`.

**The pitch is kept.** The strongest frequency is the highest peak of the power spectrum averaged over the frames that held only source seconds 134.0 to 137.1, the sound just after the split at 2:13.15. The same stretch of the file was played three ways, each at 0.5×, 1.0× and 2.0×: the audition (clip 2:09.15 to 2:17.15), a range dragged on the whole-file view (2:03.61 to 2:36.57) and track 2 (2:13.15 to 3:52.38). Each cell is the peak bin's centre, with the peak refined by a parabola through its two neighbours in brackets.

| View     | 0.5×            | 1.0×            | 2.0×            |
| -------- | --------------- | --------------- | --------------- |
| Audition | 228.79 (228.92) | 228.79 (228.25) | 227.44 (228.08) |
| Range    | 228.79 (228.53) | 228.79 (228.24) | 228.79 (228.36) |
| Track    | 228.79 (228.81) | 228.79 (228.28) | 227.44 (228.09) |

The refined peak never moves more than 0.7 Hz from its 1.0× value. The bin centre moves by one bin in two places, the audition and the track at 2.0×, one bin down at 227.44 Hz: the peak sits between two bins, and the parabola puts it back. A resample would read 457 Hz at 2.0× and 114 Hz at 0.5×. The same check on the note's own material, a range from 1:00.43 and source seconds 62 to 66, gives the bass of the worked example:

| Range from 1:00.43  | 0.5×          | 1.0×          | 2.0×          |
| ------------------- | ------------- | ------------- | ------------- |
| Strongest frequency | 90.17 (90.03) | 90.17 (89.72) | 88.82 (89.17) |

The 1.0× reading, 89.72 Hz, matches the native FFT's 89.73 Hz. At 2.0× it is 0.55 Hz lower and at 0.5× 0.31 Hz higher, inside the 1.35 Hz bin, and nowhere near the 179 Hz and 45 Hz of resampling.

**The playhead moves, the times stay.** In the Range view from 1:00.43, 5 s of real time, starting about a second into the play:

| Play speed | Real time | `currentTime` advanced | Per real second | Playhead on screen |
| ---------- | --------- | ---------------------- | --------------- | ------------------ |
| 0.5×       | 5.002 s   | 2.503 s                | 0.5003          | 0:01:01 to 0:01:03 |
| 1.0×       | 5.001 s   | 5.001 s                | 1.0000          | 0:01:01 to 0:01:06 |
| 2.0×       | 5.001 s   | 10.020 s               | 2.0035          | 0:01:01 to 0:01:11 |

The playhead's readout is in source time, so it covers 2, 5 and 10 s of the file in the same 5 s, and the range's title, "0:01:00.43 – 0:01:25.15 · 0:24.72", did not change. A track's length, the split times and the axes are in source time too; only the real time they take changes.

**A change while playing restarts nothing.** In the Range view the slider was set to 2.0×, then 0.5×, then the button reset it to 1.0×, all during one play from the range's start. The log has only `ratechange` for each change, two at the same instant (one for `playbackRate`, one for `defaultPlaybackRate`), and no `emptied`, `loadstart`, `seeking`, `pause` or `ended` after the play began. The media time carried on: 4.02 s at the change to 2.0×, 6.97 s at the change to 0.5× (2.95 s in 1.484 s of real time, 1.99 per second), 7.40 s at the change to 1.0× (0.43 s in 0.866 s, 0.50 per second). The button read "Pause" throughout.

**A track over 10 min, at 2.0×, across the hand-over.** Eight splits at the top of the file were deleted, so track 1 is 0:00 to 16:15.85 (975.85 s) and is heard in two windows: 600.00 s and 375.85 s. At 2.0× the playhead was double-clicked to 585 s, so the hand-over came after about 7.4 s of real time. The element was sampled every 50 ms.

| Measured                                                  | Value                                 |
| --------------------------------------------------------- | ------------------------------------- |
| `playbackRate` and `defaultPlaybackRate`, all 449 samples | 2 and 2, before and after             |
| Last sample before (`currentTime` in the first window)    | 599.961 s, playhead 0:09:59           |
| First sample after (`currentTime` in the second window)   | 0.055 s, playhead 0:10:00 (600.055 s) |
| `ended` of the first window to `playing` of the second    | 3.4 ms                                |
| Second window loaded                                      | `loadedmetadata` 2.8 ms after `play`  |

Media time went from 599.961 s to 600.055 s in the 49.7 ms between those two samples, so the playhead carried on from the boundary at about the speed it had. The 3.4 ms is far below the 59 ms of note 08's 2026-11-19 measurements; why was not investigated. The play speed did not reset at any point, which is what setting the default rate is for.

At 0.5×, a double-click at 1:41 of the same track, outside the window held (600 s to 975.85 s), released both windows and decoded a new one of 600 s: 644 ms from the release to `play`. The rate and the default rate were 0.5 at every event in between and in the new window, and the element was playing at 0.5 afterwards.

**The keys still work after the slider.** After a drag of the slider's thumb with the mouse, Space started and stopped the play in the Track view (0.5× to 1.0× by the drag; "Play" to "Pause" and back), in the Range view (1.0× to 1.7×) and in the Split view (1.0× to 1.3×; "Play across split" to "Stop" and back), at the speed that had been dragged to. The focus was on the page after a drag, so the key went to the view as before.

**It is remembered across a reload.** The play speed is saved to `localStorage` on every change and read when the player is made, apart from the volume's entry. The first time (nothing saved), or when the browser blocks storage, it is 1.0×: the app plays at real time until the user changes it. A saved value that is not a tenth of a step from 0.5× to 2.0×, such as 1.55 or 3, is ignored and the default is used.

## Where it lives in the code

- [`src/widgets/split-zoom/model/audition.ts`](../../src/widgets/split-zoom/model/audition.ts): the one player. It owns the play speed (`playSpeed`), changed by `setPlaySpeed` (a tenth a step, held to the range). A synchronous watcher applies it to the element and saves it; `audioElement()` applies it when the element is made. Applying sets `preservesPitch` and both `defaultPlaybackRate` and `playbackRate`, because loading a source resets the rate to the default rate.
- [`src/widgets/split-zoom/api/saved-play-speed.ts`](../../src/widgets/split-zoom/api/saved-play-speed.ts) and [`src/widgets/split-zoom/config/play-speed.ts`](../../src/widgets/split-zoom/config/play-speed.ts): the first reads and writes the one `localStorage` entry, a JSON object with the speed, and gives 1.0× for a value that is not what it writes or for storage that throws. The second holds 0.5, 2.0, 0.1 and 1.0, the slider's range, step and default, and the storage key.
- [`src/widgets/split-zoom/ui/PlaySpeedControl.vue`](../../src/widgets/split-zoom/ui/PlaySpeedControl.vue): the button that reads the speed and resets it to 1.0×, and the slider (named "Play speed"), which [`ReviewPage.vue`](../../src/pages/review/ui/ReviewPage.vue) puts just before the volume control in the zoom panel's title row, in all three views.
- [ADR 0004](../adr/0004-time-stretching-by-the-browser.md): why the stretch is the browser's, and what it needs from the player.
