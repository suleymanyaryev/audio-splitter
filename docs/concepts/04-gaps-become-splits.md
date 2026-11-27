# 04 · Gaps become splits

The loudness curve ([note 03](03-loudness.md)) gives the file one number per 50 ms. Gap finding reads that curve, and never the samples, to answer one question: where do the tracks end? The answer is a list of **splits**. Finding them is a few lines of counting; choosing the two numbers that drive it is the lesson.

## The words

- **Quiet window**: a window whose dB is strictly under the **silence threshold**. One comparison per window.
- **Gap**: a maximal run of consecutive quiet windows that lasts at least the **minimum gap length**. "Maximal" means the run is as long as it can be: the windows just before and just after are not quiet. Its start is the first quiet window's start, its end is the end of the last quiet window (never past the end of the file), and its length is `end − start`.
- **Why a minimum length**: music dips. A rest between two phrases makes a short run of quiet windows, and a track boundary is a stretch, not an instant.
- **Split**: one point in time, put in the **middle of the gap**, `(start + end) / 2`. Both neighbours lose about the same fade tail or room noise, and the cut is as far as it can be from either track's sound. The user moves it if the ear disagrees.
- **Edge gaps propose no split**: a gap that starts at window 0 is a lead-in, one that includes the last window is a run-out. There is no track on the other side, so cutting there would only make an empty first or last track. `sample1.m4a` has both: it fades in from digital silence, and ends in 7.6 s of quiet.
- **Track**: the stretch between two neighbouring splits, or between a split and the start or end of the file. N splits make N + 1 tracks. A **track name** belongs to the split where the track starts (the first one to the start of the file).

## The two settings

- **Silence threshold**: too high and ordinary music counts as quiet, so quiet passages inside a track become gaps and real gaps stretch and merge with their neighbours. Too low and the gaps never get under it, so they disappear. It is a hard line through a continuous curve, so a window that sits on it can go either way.
- **Minimum gap length**: too short and every breath counts. Too long and the real, short gaps between tracks are dropped, and two tracks are exported as one.
- **The default threshold** is the median minus an offset ([note 03](03-loudness.md)), computed once when the file opens and rounded to the Slider's 0.1 dB step (−34.72 dB starts as −34.7 dB). From then on it is a plain value: moving it recomputes nothing from the median.
- **A change re-runs gap finding, not the decoding**: the scan walks the stored curve once, in milliseconds, and moves only the gaps shown, never a split. "Find splits" then puts a split in the middle of each gap, one per boundary.
- **The defaults**, offset **18 dB** and minimum gap length **2 s**, were chosen by ear: of 15 dB / 1 s, 15 dB / 2 s, 18 dB / 2 s and 20 dB / 2 s, only 18 dB / 2 s split at every track change heard and nowhere else, with the same 33 splits on `sample1.m4a`, `.mp3` and `.opus`.

## Worked example: `samples/sample1.m4a` at 15 dB / 1 s

Measured with native ffmpeg 8.1 through the app's own downmix and loudness builder: 73,725 windows, median **−16.72 dB**.

**Threshold.** Offset 15 dB gives −16.72 − 15 = **−31.72 dB**. 7,876 windows are under it, in 436 runs. 369 runs are under 1 s, rests between phrases; 67 reach 1 s, of which two are the edge gaps.

**One gap, walked through.** The run from 5:25.25 to 5:32.85:

| Window             | Index | Time    | dB                |
| ------------------ | ----- | ------- | ----------------- |
| Just before        | 6,504 | 5:25.20 | −31.42, not quiet |
| First quiet window | 6,505 | 5:25.25 | −33.47            |
| Quietest window    | –     | inside  | −54.93            |
| Last quiet window  | 6,656 | 5:32.80 | −40.11            |
| Just after         | 6,657 | 5:32.85 | −25.19, not quiet |

That is 152 quiet windows: 152 × 0.05 = **7.60 s**, far over the minimum of 1 s, so it is a gap. Start 6,505 × 0.05 = 325.25 s; end (6,656 + 1) × 0.05 = 332.85 s; middle (325.25 + 332.85) / 2 = 329.05 s, so the split lands at **5:29.05**, and the tracks on either side get 3.8 s of quiet each.

## Where it lives in the code

- [`src/entities/split/lib/find-gaps.ts`](../../src/entities/split/lib/find-gaps.ts): the scan, the strict comparison, the minimum length and the edge gaps.
- [`src/entities/split/lib/propose-splits.ts`](../../src/entities/split/lib/propose-splits.ts): `middleOf`, the middle of a gap as its split.
- [`src/entities/split/config/defaults.ts`](../../src/entities/split/config/defaults.ts): the default offset and minimum gap length.
- [`src/entities/split/model/split.ts`](../../src/entities/split/model/split.ts): the default threshold, median minus offset, and the tracks derived from the splits.
