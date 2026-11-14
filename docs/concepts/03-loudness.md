# 03 · Loudness

Milestone 1 turned sound into a list of samples; milestone 2 let us read an hour of them. But a gap is not a sample, it is a stretch of time that is quiet. So the splitter turns the samples into one number per instant of the file, how loud it is, and draws those numbers as a curve. Everything milestone 4 does (gaps, splits) reads that curve and never the samples again.

## The words

- **Window**: a short run of samples whose loudness is measured as one number. The app uses **50 ms**, which is `Math.round(rate * 0.05)` samples: 2,205 at 44.1 kHz, 2,400 at 48 kHz, and 1,103 at 22.05 kHz (22,050 × 0.05 = 1,102.5, and JavaScript rounds .5 up). A window is a whole number of samples, and where it sits in time comes from counting samples, so odd rates work. The windows are counted on the **mono downmix** (note 01), one after another, with no overlap.
- **Why 50 ms**: long enough to hold several cycles of a low bass note (40 Hz is 25 ms per cycle, so two cycles), or the measure would wobble as the waveform goes up and down; short enough to place a gap to a twentieth of a second. The 10 ms buckets of the waveform are fine for drawing and too short for this.
- **RMS** (root mean square): how much energy a window holds, in the sample's own units (0 to 1). Square every sample (which makes them all positive), take the mean, take the square root. A full-scale sine wave (swinging between −1 and 1) has an RMS of 1/√2 ≈ 0.7071; a constant 0 has 0.
- **Decibel (dB)**: the ear hears ratios, not differences, so loudness is written on a log scale: `20 * Math.log10(rms)`. **dBFS** says that 0 dB is full scale (RMS 1), so every real value is negative. A full-scale sine is −3.01 dB. Every **−6.02 dB halves** the amplitude, every **−20 dB divides it by ten**, so −40 dB is a hundredth.
- **Digital silence**: samples that are exactly 0. `Math.log10(0)` is `-Infinity`, which cannot be drawn or compared, so the curve has a floor: an RMS under 1e-5 (−100 dB) is stored as **−100 dB**.
- **"Silence" is rarely zero**: the quiet between two tracks is a fade tail, a room's noise or a decoder's rounding, not zeros. In real music it sits at −30 to −60 dB, nowhere near the floor. That is why the **silence threshold** (milestone 4) is a number to tune and not a constant.
- **Loudness curve**: one value in dB per window, kept as a `Float32Array`. A **gap** is a stretch where it stays under the silence threshold for at least the minimum gap length. Its **median** (the middle value when all are sorted, which a few very quiet or very loud windows cannot drag) is the file's typical loudness; milestone 4 starts the threshold at the median minus an offset (ticket 16).
- **Leftover**: as in note 02, a window crossing a slice border carries the samples it already has into the next slice and closes there. Only the very last window of the file may be shorter than the rest, and it is kept.

## Worked example: `samples/sample1.m4a`

Measured with native ffmpeg 8.1 (`8.1-tessus`) on 2026-11-14: decoded to `f32le` at 44.1 kHz stereo, downmixed `(L+R)/2` as 32-bit floats, 2,205-frame windows, floor at −100 dB.

**How many.** 162,562,048 frames (the count of note 02) are 73,724 whole windows plus a last one of 628 samples (14 ms): **73,725 values**, 20 per second. At 4 bytes each the whole curve is **294,900 bytes** (0.29 MB), a tenth of the peaks (2.95 MB). One hour is 72,000 windows (288,000 bytes), three hours 216,000 (864,000 bytes, the 0.9 MB of ticket 07). At 44.1 kHz a 60 s slice is 2,646,000 / 2,205 = **1,200 windows exactly**, and at 48 kHz 2,880,000 / 2,400 also; at 22.05 kHz it is 1,323,000 / 1,103 = 1,199 windows and **503 samples left**. A builder that closed a short window at each slice end would be 600 samples too early per border, and 1.66 s off after the 61 borders.

**One window in music**, at 1:00.000 (window 1,200 = 60 × 44,100 / 2,205): its first frames are the ones in note 01.

| Step                     | Value                      |
| ------------------------ | -------------------------- |
| Sum of the 2,205 squares | 33.784                     |
| Mean (÷ 2,205)           | 0.015321                   |
| RMS (square root)        | 0.12378                    |
| `20 * log10(0.12378)`    | **−18.15 dB**              |
| Peak of the 10 ms bucket | 0.2170, which is −13.27 dB |

The RMS sits under the peak, because most samples are smaller than the biggest one.

**One window in a gap**, at 3:52.000 (window 4,640), the same steps: sum of squares 0.0079747, mean 0.0000036167, RMS 0.0019018, **−54.42 dB**. That is 65 times less amplitude than the music window, 36.3 dB lower, and not −100.

**The curve overall**: median **−16.72 dB**; the middle half of the windows lie between −20.95 and −14.53 dB, the loudest window is −8.85 dB. Only 12 % of the windows (9,135) are under −30 dB, 5 % under −39.5 dB.

**Gaps are deeper than −40 dB.** Runs of at least 1 s under −30 dB, the first six, with the quietest window of each:

| Run under −30 dB   | Length | Quietest window   |
| ------------------ | ------ | ----------------- |
| 0:00.00 to 0:08.95 | 9.0 s  | −100.00 (start)   |
| 0:09.65 to 0:12.05 | 2.4 s  | −37.43 at 0:09.90 |
| 0:14.25 to 0:16.90 | 2.7 s  | −35.99 at 0:14.50 |
| 0:17.65 to 0:19.95 | 2.3 s  | −35.93 at 0:18.55 |
| 2:09.65 to 2:17.55 | 7.9 s  | −53.77 at 2:12.80 |
| 3:40.55 to 3:59.70 | 19.2 s | −62.59 at 3:51.15 |

Under −30 dB the file has 61 such runs, under −40 dB 37, under −45 dB 20 and under −50 dB 11. The 3:52 window above sits in the long run at 3:40 to 3:59. The "−30 to −40 dB" of ticket 16 is where the curve crosses a threshold on its way down; the real gaps bottom out lower, at −54 to −63 dB for the three longest above.

**The floor.** Of 73,725 windows, **9** are at −100 dB: the first and the last 8 (the final 0.36 s of the file, from 61:25.85). The first window is not zeros: the decoder outputs values around 1e-12, an RMS of 3.8e-7 (−128.5 dB), and the floor turns it into −100. The next windows are −85 to −72 dB: this file fades in. Nowhere else does the curve touch −100 (the next quietest are −98 dB, in the fade-out just before the final zeros).

**Median against "−14.8 dB".** Tickets 04 and 16 call the music "about −14.8 dB". That figure is ffmpeg's `volumedetect` mean (a mean of squares over every stereo sample, `mean_volume: -14.8 dB`), not a median. Averaging the energy of the app's own curve gives −16.01 dB. The median is the one the app uses: −16.72 dB.

## Where it lives in the code

- [`src/shared/lib/audio/downmix.ts`](../../src/shared/lib/audio/downmix.ts): the mono signal the windows are made of.
- [`src/shared/lib/audio/loudness-builder.ts`](../../src/shared/lib/audio/loudness-builder.ts): RMS and dB per 50 ms window, fed slice by slice; the sum of squares and the sample count of an open window are carried across a border, the last shorter window is kept, and an RMS under 1e-5 is stored as −100 dB.
- [`src/entities/source-file/model/source-file.ts`](../../src/entities/source-file/model/source-file.ts): the store keeps the loudness curve next to the peaks; the slice loop feeds both builders from the same downmix.
- [`src/widgets/loudness-curve/ui/LoudnessCurve.vue`](../../src/widgets/loudness-curve/ui/LoudnessCurve.vue): the loudness panel below the whole-file view, on the same time axis; −60 dB at the bottom edge to 0 dB at the top, the curve in groove grey with its 14 % fill.
- [`src/widgets/loudness-curve/lib/merge-loudness.ts`](../../src/widgets/loudness-curve/lib/merge-loudness.ts): merges the 50 ms windows into one value per pixel column, keeping the loudest window so no loud moment disappears.
- [`src/widgets/loudness-curve/lib/decibels-to-y.ts`](../../src/widgets/loudness-curve/lib/decibels-to-y.ts): dB to canvas height, linear, with everything under −60 dB (the −100 dB floor included) on the bottom edge.
