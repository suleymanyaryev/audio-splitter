# 03 · Loudness

A gap is not a sample, it is a stretch of time that is quiet. So the splitter turns the samples into one number per instant of the file, how loud it is, and draws those numbers as a curve. Gap finding reads that curve and never the samples again.

## The words

- **Window**: a short run of samples whose loudness is measured as one number. The app uses **50 ms**, which is `Math.round(rate * 0.05)` samples: 2,205 at 44.1 kHz, 2,400 at 48 kHz, and 1,103 at 22.05 kHz (22,050 × 0.05 = 1,102.5, and JavaScript rounds .5 up). The windows are counted on the **mono downmix** ([note 01](01-sound-is-numbers.md)), one after another, with no overlap.
- **Why 50 ms**: long enough to hold two cycles of a low bass note (40 Hz is 25 ms per cycle), or the measure would wobble with the waveform; short enough to place a gap to a twentieth of a second.
- **RMS** (root mean square): how much energy a window holds, in the sample's own units (0 to 1). Square every sample (which makes them all positive), take the mean, take the square root. A full-scale sine wave (swinging between −1 and 1) has an RMS of 1/√2 ≈ 0.7071; a constant 0 has 0.
- **Decibel (dB)**: the ear hears ratios, not differences, so loudness is written on a log scale: `20 * Math.log10(rms)`. **dBFS** says that 0 dB is full scale (RMS 1), so every real value is negative. A full-scale sine is −3.01 dB. Every **−6.02 dB halves** the amplitude, every **−20 dB divides it by ten**, so −40 dB is a hundredth.
- **Digital silence**: samples that are exactly 0. `Math.log10(0)` is `-Infinity`, which cannot be drawn or compared, so the curve has a floor: an RMS under 1e-5 (−100 dB) is stored as **−100 dB**.
- **"Silence" is rarely zero**: the quiet between two tracks is a fade tail, a room's noise or a decoder's rounding, not zeros. In real music it sits at −30 to −60 dB, nowhere near the floor. That is why the silence threshold is a setting and not a constant.
- **Loudness curve**: one value in dB per window, kept as a `Float32Array`. Its **median**, the middle value when all are sorted, is the file's typical loudness: a few very quiet or very loud windows cannot drag it. So the default silence threshold is this median minus an offset: a fixed level such as −50 dB would fit a file mastered at one loudness and find nothing in `sample1.m4a`, whose fade tails cross −31.7 dB on the way down.
- **Energy mean**: a mean of loudness is taken over energy, not over dB. Each dB value goes back to a power, `10 ** (dB / 10)`, the powers are averaged, and the mean goes back to dB. The loud windows weigh the most in it: this curve's energy mean is −16.01 dB, above its median.
- **Leftover**: a window crossing a slice border carries its sum of squares and sample count into the next slice, as a bucket does in [note 02](02-long-files.md). Only the very last window of the file may be shorter than the rest, and it is kept.

## Worked example: `samples/sample1.m4a`

Measured with native ffmpeg 8.1: decoded to `f32le` at 44.1 kHz stereo, downmixed `(L+R)/2` as 32-bit floats, 2,205-frame windows, floor at −100 dB.

**How many.** 162,562,048 frames (note 02) are 73,724 whole windows plus a last one of 628 samples (14 ms): **73,725 values**, 20 per second. At 4 bytes each the whole curve is **294,900 bytes** (0.29 MB), a tenth of the peaks. Three hours are 216,000 windows, 0.9 MB.

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

**The curve overall**: median **−16.72 dB**. Only 12 % of the windows are under −30 dB, and the real gaps bottom out much lower: the three longest reach −54 to −63 dB.

**The floor.** Of 73,725 windows, **9** are at −100 dB: the first and the last 8 (the final 0.36 s of the file). The first window is not zeros: the decoder outputs values around 1e-12, an RMS of 3.8e-7 (−128.5 dB), and the floor turns it into −100. Nowhere else does the curve touch −100.

## Where it lives in the code

- [`src/shared/lib/audio/loudness-builder.ts`](../../src/shared/lib/audio/loudness-builder.ts): RMS and dB per 50 ms window, fed slice by slice, with the −100 dB floor.
- [`src/shared/lib/audio/median.ts`](../../src/shared/lib/audio/median.ts): the median of the curve.
- [`src/widgets/loudness-curve/lib/merge-loudness.ts`](../../src/widgets/loudness-curve/lib/merge-loudness.ts): one value per pixel column, the loudest window, so no loud moment disappears.
- [`src/widgets/loudness-curve/lib/decibels-to-y.ts`](../../src/widgets/loudness-curve/lib/decibels-to-y.ts): dB to canvas height, linear, with everything under −60 dB on the bottom edge.
