# 04 · Gaps become splits

Milestone 3 gave the file one loudness number per 50 ms, the loudness curve. This milestone reads that curve, and never the samples again, to answer one question: where do the tracks end? The answer is a list of **splits**. Finding them is a few lines of counting; choosing the two numbers that drive it is the lesson.

## The words

- **Quiet window**: a window whose dB is strictly under the **silence threshold**. One comparison per window.
- **Gap**: a maximal run of consecutive quiet windows that lasts at least the **minimum gap length**. "Maximal" means the run is as long as it can be: the windows just before and just after are not quiet. Its start is the first quiet window's start, its end is the end of the last quiet window (never past the end of the file), and its length is `end − start`.
- **Why a minimum length**: music dips. Inside the loud passages of `sample1.m4a` there are 369 runs of quiet windows shorter than 1 s (113 of them a single window), a rest between two phrases. None is a gap between tracks. A single quiet window says "very quiet for 50 ms", and a track boundary is a stretch, not an instant. Only 67 runs reach 1 s, and the calibrated default asks for 2 s.
- **Split**: one point in time, put in the **middle of the gap**, `(start + end) / 2`. Both neighbours lose about the same fade tail or room noise, and the cut is as far as it can be from either track's sound. The user moves it later (milestone 5) if the ear disagrees.
- **Edge gaps propose no split**: a gap that starts at window 0 is a lead-in, one that includes the last window is a run-out. There is no track on the other side, so cutting there would only make an empty first or last track. `sample1.m4a` has both: 0:00.00 to 0:08.90 (the file fades in from digital silence) and 61:18.60 to 61:26.21.
- **Track**: the stretch between two neighbouring splits, or between a split and the start or end of the file. N splits make N + 1 tracks, and each starts out with its number as its **track name**; the name belongs to the split where the track starts (the first one to the start of the file).

## The two settings

- **Silence threshold**: too high and ordinary music counts as quiet, so quiet passages inside a track become gaps and real gaps stretch and merge with their neighbours. Too low and the gaps never get under it, so they disappear.
- **Minimum gap length**: too short and every breath counts. Too long and the real, short gaps between tracks are dropped, and two tracks are exported as one.
- **Why not a fixed threshold**: "−50 dB" would fit a file mastered at one loudness and propose nothing for `sample1.m4a`, whose fade tails cross −31.7 dB on the way down. So the default is **relative**: the curve's **median** (note 03, the file's typical loudness) minus an **offset**. It is computed once, when analysis ends, rounded to the Slider's 0.1 dB step (so the readout, the thumb and the detection agree: −34.72 dB starts as −34.7 dB), and the Slider starts there. From then on the Slider is a plain value: moving it does not recompute anything from the median (ticket 16).
- **A change re-runs gap finding, not the decoding**: the curve is stored (73,725 values for this file, 0.29 MB), the scan walks it once, and it takes milliseconds. The result replaces **all** splits and all track names, edited or not (ticket 07). So the workflow is to tune the two settings first and edit after.

Real counts from `samples/sample1.m4a` (median −16.72 dB), splits found for each setting:

| Offset (threshold) | 0.5 s | 1 s | 1.5 s | 2 s | 3 s |
| ------------------ | ----- | --- | ----- | --- | --- |
| 10 dB (−26.7 dB)   | 92    | 74  | 51    | 44  | 36  |
| 15 dB (−31.7 dB)   | 93    | 65  | 50    | 39  | 33  |
| 18 dB (−34.7 dB)   | 58    | 44  | 36    | 33  | 27  |
| 25 dB (−41.7 dB)   | 42    | 27  | 24    | 21  | 12  |

Read along a row and the counts fall as the minimum grows, because short gaps are dropped. Read down a column and they fall as the threshold goes lower, because the shallow gaps no longer get under it; at 35 dB (−51.7 dB) one second leaves 5 splits and three seconds none. Between the extremes there is no right answer in the numbers: the count is only right if the splits fall where the ear hears the tracks end.

## Calibration: 18 dB and 2 s

The starting points of ticket 16 were 15 dB and 1 s. They were calibrated on 2026-11-15 by listening to `sample1.m4a` (and checking `sample1.mp3` and `sample1.opus`) against the proposed splits. The defaults are now **offset 18 dB** (threshold −34.72 dB) and **minimum gap length 2 s**.

| Candidate       | Splits m4a / mp3 / opus | Tracks (shortest to longest, m4a) | Formats agree                                             |
| --------------- | ----------------------- | --------------------------------- | --------------------------------------------------------- |
| 15 dB / 1 s     | 65 / 64 / 64            | 2.7 to 139.3 s                    | no: one window at 2:16.15 sits 0.01 dB from the threshold |
| 15 dB / 2 s     | 39 / 39 / 38            | 7.4 to 139.3 s                    | no: opus drops one split, 0.6 s shifts                    |
| **18 dB / 2 s** | **33 / 33 / 33**        | **93.0 to 139.5 s**               | **yes, within 0.33 s**                                    |
| 20 dB / 2 s     | 30 / 30 / 30            | 93.4 to 194.1 s                   | yes, within 0.08 s                                        |

**What the ear heard** (a clip around every split that the candidates disagreed on):

- 3:43.70 is not a track boundary: between 3:35 and 4:05 there is one track change, the long break (3:47.8 to 3:57.9, down to −62.6 dB). 15 dB / 1 s and 15 dB / 2 s split there too, in a dip of −40.5 dB.
- 8:36.00 is a new track: a 2.7 s gap at −46.4 dB. 20 dB / 2 s misses it and so exports two tracks as one of 194 s.
- The intro (0:10.88 and 0:15.15, dips of −37 and −36 dB) is one piece, and the first change is at 2:13.
- The other 15 dB / 1 s extras, shallow dips of −36 to −50 dB in the fade tails beside a long gap, are not boundaries either.

So 18 dB / 2 s is the only candidate that matches the ear on both counts, finds 33 splits identically on all three formats, and has no 3 s tracks. 15 dB is too eager and 20 dB / 2 s too strict. The numbers are still only a starting point: other music wants other values, which is why the Sliders exist.

**One cycle was enough.** The file is a 19 min 42 s stretch played three times, so the gaps recur at +19:42 and +39:24 (at 3:43, 23:25 and 43:07, and at 8:36, 28:18 and 48:00). The shifted splits fall within 0.1 s of each other, so judging the first cycle, 0:00 to 19:45, decided all three.

## Worked example: `samples/sample1.m4a` at the starting point (15 dB / 1 s)

Measured with native ffmpeg 8.1 (`8.1-tessus`) through the app's own downmix and loudness builder: 73,725 windows of 50 ms at 44.1 kHz, median **−16.72 dB**. The same curve from `sample1.mp3` and `sample1.opus` (48 kHz) has the same median.

**Threshold.** Offset 15 dB gives −16.72 − 15 = **−31.72 dB**. 7,876 of the 73,725 windows are under it, in 436 runs. 369 of them are under 1 s (the longest, 0.95 s, is 19 windows) and 67 reach 1 s: 65 between tracks and the two edge gaps above. So 15 dB / 1 s proposes **65 splits**.

**One gap, walked through.** The run from 5:25.25 to 5:32.85:

| Window             | Index | Time    | dB                |
| ------------------ | ----- | ------- | ----------------- |
| Just before        | 6,504 | 5:25.20 | −31.42, not quiet |
| First quiet window | 6,505 | 5:25.25 | −33.47            |
| Quietest window    | –     | inside  | −54.93            |
| Last quiet window  | 6,656 | 5:32.80 | −40.11            |
| Just after         | 6,657 | 5:32.85 | −25.19, not quiet |

That is 152 quiet windows: 152 × 0.05 = **7.60 s**, far over the minimum of 1 s, so it is a gap. Start 6,505 × 0.05 = 325.25 s; end (6,656 + 1) × 0.05 = 332.85 s; middle (325.25 + 332.85) / 2 = 329.05 s, so the split lands at **5:29.05**, and the tracks on either side get 3.8 s of quiet each.

**Why it was too eager.** The 65 splits are not 65 track ends: 33 are far apart (83 to 139 s) and the other 32 sit 2.7 to 8.7 s after one of those or in the quiet intro, shallow dips (−36 to −50 dB) in the fade next to a deep gap. The calibration above is what separates the two kinds.

**The edges of a decision.** At 15 dB the m4a has one window at 2:16.15 of −31.71 dB, 0.01 dB over the threshold of −31.72 and so not quiet; the same window in the mp3 and the opus is −31.73 and −31.74 dB, so it is quiet and joins two gaps into one. That gives 65 splits for the m4a and 64 for the others. Everywhere else the three formats agree within a quarter of a second (the mp3 within 0.03 s). A threshold is a hard line drawn through a continuous curve, so a window that lands on the line can go either way. At 18 dB / 2 s no window is that close, and the three formats agree.

## Where it lives in the code

Milestone 4 added these.

- [`src/entities/split/lib/find-gaps.ts`](../../src/entities/split/lib/find-gaps.ts): the scan over the loudness curve, the strict comparison, the minimum length, the edge gaps dropped, the middle of each gap.
- [`src/entities/split/config/defaults.ts`](../../src/entities/split/config/defaults.ts): the calibrated defaults: offset 18 dB, minimum gap length 2 s.
- [`src/shared/lib/audio/median.ts`](../../src/shared/lib/audio/median.ts): the median of the curve, hand-written.
- [`src/entities/split/model/split.ts`](../../src/entities/split/model/split.ts): the store: the splits, the track names (numbered by default), the two settings, the default threshold (median − offset, once), and the tracks derived from them.
- [`src/widgets/loudness-curve/ui/LoudnessSettings.vue`](../../src/widgets/loudness-curve/ui/LoudnessSettings.vue): the two Sliders in the panel's title row, bound to the store (threshold −60 to 0 dB in 0.1 dB, minimum gap length 0.2 to 5 s in 0.1 s).
- [`src/widgets/loudness-curve/ui/LoudnessCurve.vue`](../../src/widgets/loudness-curve/ui/LoudnessCurve.vue), [`lib/threshold-line.ts`](../../src/widgets/loudness-curve/lib/threshold-line.ts) and [`lib/use-threshold-drag.ts`](../../src/widgets/loudness-curve/lib/use-threshold-drag.ts): the dashed threshold line, a second handle on the same value (drag it; keyboard access is the Slider's), with its position, hit test and drag maths in `threshold-line.ts` and the pointer handlers in `use-threshold-drag.ts`; [`lib/decibels-to-y.ts`](../../src/widgets/loudness-curve/lib/decibels-to-y.ts) maps dB to height and back.
- [`src/widgets/source-waveform/`](../../src/widgets/source-waveform/) and the loudness curve widget: split markers, and the split-number band above the whole-file waveform ([`lib/place-split-numbers.ts`](../../src/widgets/source-waveform/lib/place-split-numbers.ts): split k is the split where track k + 1 starts, and a number that would touch the last one shown is left out).
- [`src/shared/lib/canvas/`](../../src/shared/lib/canvas/): what both whole-file canvases share. `time-axis.ts` (time → x), `land-spans.ts` (every gap drawn as a land, at least 12 px wide: a narrower one widens around its middle, an edge gap away from its edge), `draw-lands-and-splits.ts` (the land fills and the split lines) and `canvas-text.ts` (the canvas font and the repaint once it has loaded).
- [`src/widgets/track-list/ui/TrackList.vue`](../../src/widgets/track-list/ui/TrackList.vue): the table in time order: a row for each track (number, name, start (`0:42:03.25`, from [`format-hundredths.ts`](../../src/shared/lib/time/format-hundredths.ts), which rounds before it splits the time into fields so 59.996 s reads `0:01:00.00`) and length (`0:42:03`), and a merge button that removes the track) with a split row between every two (`Split N`, its time and a trash button that deletes the split), scrolling inside a panel as tall as the zoom view.
- [`src/widgets/track-strip/`](../../src/widgets/track-strip/): the proportional blocks with name and length. [`lib/layout-track-blocks.ts`](../../src/widgets/track-strip/lib/layout-track-blocks.ts) turns the track lengths and the strip's pixel width into block widths (after the 8 px split items between the blocks, at least 12 px each while they fit) and decides what fits: the name from 32 px, the length under it from 72 px; a narrower block is a plain grey sliver that keeps its name and length in a tooltip. The page titles the panel "Tracks (N)".
