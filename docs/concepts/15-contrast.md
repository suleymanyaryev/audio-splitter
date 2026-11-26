# 15 · Contrast

Note 13 found the track changes that dip: the loudness falls under the loudness around it. A crossfade that keeps the level up doesn't dip. What changes there is the sound: the new track has other instruments, another key, another mix. Note 14 made that visible as the spectrogram. This milestone turns it into a number. Compare the sound of the minute before a point with the minute after it. Where the two are far apart, a new track has probably begun.

## The words

- **The stretch before, the stretch after**: the 60 s on each side of a point, without the windows under the silence threshold.
- **Mean spectrum**: each band's power averaged over a stretch, then back in dB. It says what the stretch sounds like as a whole.
- **Shape**: a mean spectrum with its overall level taken out. Two stretches with the same instruments, one louder, have the same shape.
- **Contrast**: how far apart the shapes of the stretch before and the stretch after are, in dB (GLOSSARY.md).
- **Contrast curve**: the contrast of every point, every 0.5 s.
- **Contrast peak**: a point whose contrast reaches the contrast setting and is the highest within 15 s on either side.

## Two stretches, one number

Every 50 ms window of the spectrogram holds 128 bands (note 14). Each band is the power of the tones in it, in dB. Over a stretch, each band gets one mean, so a stretch becomes one column of 128 numbers: its mean spectrum.

The bands over 15 kHz are left out. Every sample's encoder cut them away (note 14, "The 16 kHz wall"), so they hold noise. That leaves 119 bands at 44.1 kHz and 118 at 48 kHz.

Then, band by band, the mean after minus the mean before. A band that got 6 dB louder reads +6, one that got quieter reads a negative number. Contrast is how **unevenly** the bands changed:

1. Take the change of every band, in dB.
2. Take away the mean change. What is left is the change of the shape, not of the level.
3. Square what is left, take the mean over the bands, and the square root (the RMS, note 03).

A made-up check with three bands:

| Before (dB)   | After (dB)    | Change     | Less the mean change | Contrast |
| ------------- | ------------- | ---------- | -------------------- | -------- |
| −30, −40, −50 | −24, −34, −44 | +6, +6, +6 | 0, 0, 0              | 0 dB     |
| −30, −40, −50 | −24, −46, −50 | +6, −6, 0  | +6, −6, 0            | 4.9 dB   |

The first row is the same music, 6 dB louder: contrast 0. The second has the low band up and the middle band down, another sound: √((36 + 36 + 0) / 3) = 4.9 dB.

## Why the level is taken out

A loudness change is what dips already find (note 13). A quiet verse before a loud chorus is a loudness change inside one track. Taking the level out leaves contrast to the one thing dips can't see: the sound itself. The measure (all on the same test mixes, below) agrees: with the level kept, every version scored lower.

## A mean of power, not of dB

A mean of dB counts every window the same, quiet or loud. Then a fade counts as much as the body of the track. A made-up check, one band, a stretch of 60 s: 50 s of the track at −40 dB, and a 10 s fade-in at −70 dB.

| Mean of | Sum                          | Mean     | Pulled down by the fade |
| ------- | ---------------------------- | -------- | ----------------------- |
| dB      | (50 × −40 + 10 × −70) / 60   | −45.0 dB | 5.0 dB                  |
| Power   | (50 × 10⁻⁴ + 10 × 10⁻⁷) / 60 | −40.8 dB | 0.8 dB                  |

A power is 10^(dB/10), as in note 13's smoothed level. In a mean of power, the loud windows weigh the most, so 10 s of fade hardly moves it.

**On a real file.** `sample1.m4a`'s tracks, joined end to end with no crossfade, with a mean of dB over 20 s: the highest peak is 5.2 s after a boundary, not at it. It is the far edge of the next track's fade-in, which climbs from −38.9 to −17.7 dB over 9 s. To a mean of dB, a fade-in is a sound of its own.

## Why a minute

Inside a track the sound changes too: an intro without drums, a break, a solo. A short stretch hears each of them as a new track. A long one averages them into the track's whole sound. But a stretch longer than a track reaches over the next boundary and blurs it.

The test mixes (below) ranked by how well the real boundaries rise above everything else. The score is the average precision: 1 when every real boundary outranks every false peak, near 0 when they are lost among them. Mean of power, 10 s crossfades:

| Stretch  | 30 s | 45 s | 60 s     | 75 s | 90 s | 120 s |
| -------- | ---- | ---- | -------- | ---- | ---- | ----- |
| Hard set | 0.55 | 0.54 | **0.72** | 0.75 | 0.66 | 0.48  |
| Easy set | 0.52 | 0.58 | **0.70** | 0.63 | 0.51 | 0.46  |

The best stretch is about the shortest track, 72.5 s in these mixes. 60 s is the one that does well on both sets.

## Worked example: `distant memories.`

One of the user's playlists: its first 9 tracks, each at one loudness, joined with 10 s equal-power crossfades. That makes 8 boundaries. Only one of them dips 15 dB (16.0 dB); the others dip 3.0 to 12.8 dB. So Find splits at its defaults proposes one split. Measured on 2026-11-27, every peak of 5.4 dB and more:

| Mean of | Stretch | Peaks | Real | False | Boundaries found |
| ------- | ------- | ----- | ---- | ----- | ---------------- |
| dB      | 20 s    | 12    | 5    | 7     | 5 / 8            |
| Power   | 20 s    | 9     | 7    | 2     | 7 / 8            |
| dB      | 60 s    | 9     | 5    | 4     | 5 / 8            |
| Power   | 60 s    | 8     | 8    | 0     | **8 / 8**        |

- With a mean of dB over 20 s, the highest peak of all, 25.2 dB at 5:07.5, is false. It is 18.6 s into a track, where its intro ends. Every real boundary is lower.
- A mean of power over a minute finds all 8, each within 5 s, and nothing else.
- On `sample1.m4a`'s tracks the four versions do about as well as each other. Its tracks change little inside, so it doesn't show the difference.

## Peaks, and room around a boundary

A contrast peak is the highest point within ±15 s, as for a dip. Then three rules:

- **Nothing within 60 s of the file's ends.** There, one stretch is cut short.
- **Nothing within 60 s of a gap, a dip or a split.** A minute-long stretch makes a wide hump around a real boundary, and its shoulders peak again 15 to 60 s from it. On the user's 19 gapped playlists, contrast added 192 splits with the ±15 s rule alone. 170 of them were within 60 s of a split that already existed. With the 60 s of room it adds 22.
- **Gaps and dips come first.** Where one of them marks the boundary, it sets the split's place and confidence.

The split goes at the peak. On the test mixes it lands a median 1.5 s from the middle of the crossfade, and at most 4.4 s.

## The test mixes

No crossfaded file with known track times was found. `samples/sample-crossfade.mp3` blends throughout: by ear, no boundary can be heard in it. So the answer key is made: tracks cut from the user's gapped playlists, where every boundary is known, and joined again.

- **The tracks.** Five playlists, first pass only: 49 tracks, 72.5 s to 3:41 long. Each is trimmed to its sound and set to one loudness.
- **The joins.** Equal-power crossfades of 0, 5, 10 and 20 s. The outgoing track fades as cos(πt/2) and the incoming as sin(πt/2), so their powers always add up to one. A boundary is the middle of the crossfade.
- **Two sets of 44 boundaries.** Hard: each mix from one playlist, so neighbours sound alike. Easy: neighbours from different playlists. They come from one channel, so "easy" is not much easier.

Find splits at the defaults, then with contrast added at 5.4 dB, found / false:

| Crossfade | Hard: Find splits | Hard: with contrast | Easy: Find splits | Easy: with contrast |
| --------- | ----------------- | ------------------- | ----------------- | ------------------- |
| 0 s       | 30 / 3            | 39 / 6              | 24 / 3            | 40 / 8              |
| 5 s       | 11 / 3            | 38 / 7              | 8 / 3             | 37 / 13             |
| 10 s      | 7 / 2             | **39 / 6**          | 6 / 2             | 41 / 9              |
| 20 s      | 0 / 2             | 29 / 15             | 1 / 2             | 25 / 20             |

- At 10 s crossfades, Find splits finds 7 of 44. With contrast it finds 39, with 6 false.
- At 20 s the change is spread over 20 s, and a third of a minute's stretch is crossfade. It finds less, and less surely.

## On the user's playlists, by ear

On gapped files the gaps already mark the boundaries, so whatever contrast adds is either a boundary the gaps missed or a change inside a track. On the 19 playlists (19.3 h) it adds 22 splits, about one an hour. The loops repeat them, so they are 10 moments. The user heard each: **3 are track changes**, 6 are not, 1 is unsure.

- Two of the three real ones dip 12.4 and 14.1 dB: shallow dips that the 15 dB setting leaves out. The third dips 7.7 dB, and the false ones 1.3 to 8.5 dB.
- Contrast alone does not sort them: 6.3 to 8.9 dB for the real ones, 5.8 to 7.7 dB for the false.

So **the contrast setting starts off**. It is for files the user knows are crossfaded.

## Contrast as a confidence

On the hard 10 s mixes, a contrast peak of 6.5 dB or more is real 34 times in 39 (87 %). From 5.4 to 6.5 dB, 4 times in 11 (36 %). By ear on the playlists, 3 in 10. A contrast split is therefore never sure:

| Contrast      | Confidence |
| ------------- | ---------- |
| 6.5 dB and up | Likely     |
| 5.4 to 6.5 dB | Doubtful   |

**Agreement.** A dip with a contrast peak within 5 s is surer than a dip alone. On the test mixes:

| Dip depth | Real, the dip alone | Real, with a contrast peak | Real, without one |
| --------- | ------------------- | -------------------------- | ----------------- |
| 15 dB +   | 83 %                | 90 %                       | 68 %              |
| 9–15 dB   | 59 %                | 88 %                       | 23 %              |
| 3–9 dB    | 20 %                | 77 %                       | 4 %               |

A 9–15 dB dip with contrast is as sure as a 15 dB dip alone. So, while the contrast setting is on, such a dip goes up one band (note 13's bands).

## Time

The contrast curve needs only the spectrogram the load already builds. Running sums over 0.5 s blocks give each stretch's mean without adding up a minute again at every point. On `sample3h.m4a` (3:04:19) that takes **447 ms** in Node, and the sums take 21.1 MB.

## Why a mean over a minute

This stands in for an ADR.

- **It can be checked by hand.** Two means, a difference and an RMS. The textbook way, a self-similarity matrix with a checkerboard kernel (Foote), compares every moment with every other near it. It was not needed: the simple one passed first.
- **Fewer bands were worse, not better.** Grouping the 119 bands into 20, or into 13 MFCCs (a DCT of the bands), scored within 0.04 of all bands with a mean of dB, and 0.44 against 0.72 with a mean of power.
- **Not by pitch.** A key change is a strong sign of a new track. But under 446 Hz the bands repeat the same steps (note 14, "Why the bass draws as blocks"), so notes can't be told apart there.
- **A threshold, not a track count.** Taking the N − 1 highest peaks of a file with N tracks was cleaner on the test mixes. But it needs every boundary counted, the gaps' and dips' too, and a video's track list is often off by one or two. It can come later as a second way to set the threshold.

## What it does not find

- **A track under about a minute.** A stretch then holds two boundaries, and its peak blurs.
- **A change of track with the same sound.** Two tracks with the same instruments and mix have little contrast.
- **Ambient mixes**: not tested. The only one, `sample-crossfade.mp3`, has no boundary the ear can find.

It also hears what is not a boundary: a change of sound inside a track. That is why it starts off, and why a contrast split is never sure.

## Where it lives in the code

Filled in when the milestone's build is done.
