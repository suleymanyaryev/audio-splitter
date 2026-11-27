# 15 · Contrast

[Note 13](13-adaptive-threshold.md) found the track changes that dip: the loudness falls under the loudness around it. A crossfade that keeps the level up doesn't dip. What changes there is the sound: the new track has other instruments, another key, another mix. [Note 14](14-the-spectrum.md) made that visible as the spectrogram. This note turns it into a number: compare the sound of the minute before a point with the minute after it. Where the two are far apart, a new track has probably begun.

## The words

- **The stretch before, the stretch after**: the 60 s on each side of a point, without the quiet windows: those under the file's median loudness minus 18 dB, the built-in silence threshold, not the user's slider. So the contrast curve depends on no setting.
- **Mean spectrum**: each band's power averaged over a stretch, then back in dB. It says what the stretch sounds like as a whole.
- **Shape**: a mean spectrum with its overall level taken out. Two stretches with the same instruments, one louder, have the same shape.
- **Contrast**: how far apart the shapes of the stretch before and the stretch after are, in dB (GLOSSARY.md).
- **Contrast curve**: the contrast of every point, every 0.5 s.
- **Contrast peak**: a point whose contrast reaches the contrast setting and is the highest within 15 s on either side.

## Two stretches, one number

Every 50 ms window of the spectrogram holds 128 bands, each the power of the tones in it, in dB. Over a stretch each band gets one mean, so a stretch becomes one column of 128 numbers: its mean spectrum. The bands over 15 kHz are left out, because the encoder cut them away (note 14) and they hold only noise. That leaves 119 bands at 44.1 kHz and 118 at 48 kHz.

Then, band by band, the mean after minus the mean before. A band that got 6 dB louder reads +6, one that got quieter a negative number. Contrast is how **unevenly** the bands changed:

1. Take the change of every band, in dB.
2. Take away the mean change. What is left is the change of the shape, not of the level.
3. Square what is left, take the mean over the bands, and the square root: the RMS of [note 03](03-loudness.md).

A made-up check with three bands:

| Before (dB)   | After (dB)    | Change     | Less the mean change | Contrast |
| ------------- | ------------- | ---------- | -------------------- | -------- |
| −30, −40, −50 | −24, −34, −44 | +6, +6, +6 | 0, 0, 0              | 0 dB     |
| −30, −40, −50 | −24, −46, −50 | +6, −6, 0  | +6, −6, 0            | 4.9 dB   |

The first row is the same music, 6 dB louder: contrast 0. The second has the low band up and the middle band down, another sound: √((36 + 36 + 0) / 3) = 4.9 dB.

**Why the level is taken out.** A loudness change is what dips already find. A quiet verse before a loud chorus is a loudness change inside one track. Taking the level out leaves contrast the one thing dips can't see: the sound itself. On the test mixes below, every version that kept the level scored lower.

**Why a mean of power.** Each band's mean is the energy mean of note 03, not a mean of dB, so a fade counts for little. One band, 60 s: 50 s of the track at −40 dB and a 10 s fade-in at −70 dB. A mean of dB gives −45.0 dB, pulled 5 dB down by the fade; a mean of power gives −40.8 dB, 0.8 dB. To a mean of dB a fade-in is a sound of its own: on `sample1.m4a`'s tracks joined end to end, a mean of dB over 20 s puts its highest peak 5.2 s after a boundary, at the far edge of a fade-in.

**Why a minute.** Inside a track the sound changes too: an intro without drums, a break, a solo. A short stretch hears each of them as a new track, a long one averages them into the track's whole sound, and one longer than a track reaches over the next boundary and blurs it. The score for a stretch is its **average precision** over the test mixes below: 1 when every real boundary outranks every false peak, near 0 when they are lost among them. 60 s was chosen because it scored best on both sets (0.72 and 0.70), about the length of their shortest track.

## Worked example: `distant memories.`

One of the user's playlists: its first 9 tracks, each at one loudness, joined with 10 s equal-power crossfades, 8 boundaries. Only one of them dips 15 dB; the others dip 3.0 to 12.8 dB, so Find splits without contrast proposes one split. Every contrast peak of 5.4 dB and more:

| Mean of | Stretch | Peaks | Real | False | Boundaries found |
| ------- | ------- | ----- | ---- | ----- | ---------------- |
| dB      | 20 s    | 12    | 5    | 7     | 5 / 8            |
| Power   | 20 s    | 9     | 7    | 2     | 7 / 8            |
| dB      | 60 s    | 9     | 5    | 4     | 5 / 8            |
| Power   | 60 s    | 8     | 8    | 0     | **8 / 8**        |

- With a mean of dB over 20 s the highest peak of all, 25.2 dB at 5:07.5, is false: it is 18.6 s into a track, where its intro ends.
- A mean of power over a minute finds all 8, each within 5 s, and nothing else.

## Peaks, and room around a boundary

A contrast peak is the highest point within ±15 s, as a dip is the deepest. A minute-long stretch makes a wide hump around a real boundary, and its shoulders peak again 15 to 60 s from it. So a contrast peak is kept only a full minute from the file's ends, where one stretch is cut short, and 60 s from any gap, dip or split, which set the split's place and confidence where they mark the boundary. On the user's 19 gapped playlists, the ±15 s rule alone let contrast add 192 splits, 170 of them within 60 s of an existing one; with the 60 s of room it adds 22.

## The test mixes

`samples/sample-crossfade.mp3` blends throughout: by ear, no boundary can be heard in it. So the answer key is made. Tracks are cut from five of the user's gapped playlists, where every boundary is known, each trimmed to its sound, set to one loudness and joined again with equal-power crossfades: the outgoing track fades as cos(πt/2) and the incoming as sin(πt/2), so their powers always add up to one. The boundary is the middle of the crossfade. The **hard** set joins tracks of one playlist, so neighbours sound alike; the **easy** set mixes playlists. Each has 44 boundaries.

At 10 s crossfades on the hard set, Find splits finds 7 of 44 without contrast, and **39 with it at 5.4 dB, with 6 false**. The split lands a median 1.5 s from the middle of the crossfade. At 20 s crossfades a third of a minute's stretch is crossfade, and it finds less, less surely.

**The threshold.** 5.4 dB was chosen as one value that fits both sets, whose own best thresholds were 4.7 to 5.6 dB, while `sample1.m4a` gets only 2 false contrast splits in its hour.

**On gapped files**, where the gaps already mark the boundaries, contrast alone does not tell a real peak from a change inside a track: the real and false peaks it adds there reach overlapping heights.

## Contrast as a confidence

Contrast also hears a change of sound inside a track, so a contrast split is never sure. On the hard 10 s mixes, a peak of 6.5 dB or more was real 87 % of the time and one from 5.4 to 6.5 dB 36 %, so 6.5 dB and up is **likely** and under it **doubtful**.

**Agreement.** A dip with a contrast peak within 5 s is surer than a dip alone. On the test mixes a 9 to 15 dB dip with a peak was real 88 % of the time, as often as a 15 dB dip alone, against 23 % without one. So such a dip goes up one of note 13's bands.

## Time

The contrast curve needs only the spectrogram the load already builds. Running sums over 0.5 s blocks give each stretch's mean as one difference, without adding up a minute again at every point. On `sample3h.m4a` (3:04:19) that takes **447 ms** in Node.

## What it does not find

- **A track under about a minute.** A stretch then holds two boundaries, and its peak blurs.
- **A change of track with the same sound.** Two tracks with the same instruments and mix have little contrast.
- **A change of key alone.** Under 446 Hz the bands repeat the same steps ([note 14](14-the-spectrum.md)), so notes can't be told apart there.

## Where it lives in the code

- [`src/shared/lib/audio/contrast.ts`](../../src/shared/lib/audio/contrast.ts): `buildContrast`, the contrast curve from running sums of each band's power over the loud windows; `findContrastPeaks`, the highest within ±15 s and a minute from both ends.
- [`src/entities/split/lib/propose-splits.ts`](../../src/entities/split/lib/propose-splits.ts): `proposeSplits`, a contrast peak kept 60 s from any other proposal or split, and a dip carrying the contrast of a peak within 5 s.
- [`src/entities/split/lib/confidence-band.ts`](../../src/entities/split/lib/confidence-band.ts): `contrastBandOf` and `confidenceOf`, the 6.5 dB cut-off and the lift of an agreeing dip, from [`confidence-bands.ts`](../../src/entities/split/config/confidence-bands.ts).
