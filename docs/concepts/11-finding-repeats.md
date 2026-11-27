# 11 · Finding repeats

A playlist played two or three times gives every track two or three times. To ask "is this the same recording?" without listening, the app **slides** one track's loudness curve along another's and scores how well the two agree at each offset. This note does that on a real file, and measures how well it tells a repeat from a different track.

## The words

- **Loudness curve**: one value in dB per 50 ms window ([note 03](03-loudness.md)). A track's stretch of it is the track's shape: where it is loud, where it dips.
- **Offset**: how far one stretch is slid against the other. At offset 12.0 s the first window of the shorter meets the window 12.0 s into the longer.
- **Overlap**: the windows that meet at an offset. The score uses only that part.
- **Pearson's r**: one number for how much two lists of numbers rise and fall together. 1 means they move in step, 0 nothing in common, −1 one rises exactly when the other falls.
- **Cross-correlation**: scoring two signals at every offset. The best offset says where they line up, and its score says how well.
- **Match, kept copy, duplicate, partial match** (GLOSSARY.md): a **duplicate** is a track whose match with the **kept copy** covers the whole of both. A **partial match** covers only part, at least 30 s.

## Pearson's r

Take two stretches of the same length, `a` and `b`, one value per window. Subtract each one's mean, then multiply them window by window and add up:

```
r = Σ (a − mean a) · (b − mean b) / √( Σ (a − mean a)² · Σ (b − mean b)² )
```

The top is large and positive when both are above their own mean together and below it together. The bottom is the two spreads multiplied, and it scales the top into −1 to 1. Four windows, to check by hand:

| Stretch               | Values (dB)        | Deviations from its own mean  | r against `a` |
| --------------------- | ------------------ | ----------------------------- | ------------- |
| `a`                   | −30, −20, −25, −10 | −8.75, 1.25, −3.75, 11.25     | 1             |
| `b`, `a` plus 6 dB    | −24, −14, −19, −4  | the same (its mean is −15.25) | 1             |
| `c`, another ordering | −20, −30, −10, −25 | 1.25, −8.75, 11.25, −3.75     | −0.486        |

For `c`: the products are −10.94, −10.94, −42.19 and −42.19, which sum to −106.25. Both spreads are 218.75, so r = −106.25 / 218.75 = −0.486.

**Why a louder copy still scores 1.** The curve is in dB, and a gain is a multiplication that a log turns into an addition ([note 09](09-volume-is-gain.md)). A copy 6 dB louder is the same curve with 6 added to every value, which is `b` above. Subtracting the mean removes any added constant, and dividing by the spread removes any scale. So the score keeps only the shape. On the sample, track 01 against its copy track 12 scores 0.99161 as it is, with 6 dB added to one of them, and with 20 dB taken off it, to the twelfth decimal. A plain difference of the curves would put that louder copy 6 dB away at every window, and call it a different track.

## Sliding

Two tracks are never exactly the same length, and their splits do not fall in the same place. So the shorter stretch is slid along the longer one, one window at a time, and r is computed at every offset over the overlap. The best r is the pair's score, and its offset says where in the longer track the shorter one sits.

The peak is sharp. Track 01 against track 12 scores 0.992 at its best offset, 0.984 one window (0.05 s) off, 0.946 two windows off and 0.86 a second off. So the scan has to try every offset, and the score is trustworthy: two tracks that merely both have a loud verse and a quiet bridge do not stay in step at any offset.

**A small overlap scores by chance.** With 2 windows any two stretches have r of exactly 1 or −1, and with 10 they are noisy. So the slide ignores every offset whose overlap is under **30 s**: a 30 s stretch of track 07 scored at least 0.946 against its own copy and at most 0.880 against any different track, and under 30 s the two nearly meet.

## What is compared

The curve is not used as it is:

- **The quiet ends of every track are left off.** Every fade has the same shape, down to the silence threshold, so two different tracks share it and look more alike. On the sample the closest different pair rises from r = 0.831 to 0.909 with the ends on. A track is the stretch from its first window at or above the silence threshold to its last.
- **Values under −60 dB count as −60.** A track with a few windows of digital silence (−100 dB, note 03) would have a spread dominated by them, and r would be about the silence and not the music.
- **Four windows are averaged into one of 200 ms.** The average is in dB, so a louder copy is still the same curve plus a constant. See "Time" for why.

## Worked example: `samples/sample1.m4a`

The app's own loudness curve at the default settings (18 dB, 2 s): 73,725 windows and 33 splits, so 34 tracks. The file is three passes of an 11-track loop and a fourth begun: the whole curve slid against itself scores best at **1182.3 s**, r = 0.957.

All 561 pairs of the 34 tracks, each scored at its best offset:

| Pairs            | Count | Best r                       |
| ---------------- | ----- | ---------------------------- |
| Known duplicates | 36    | 0.987 to 0.997, median 0.995 |
| Different tracks | 525   | 0.831 at most                |

A pair is a known duplicate when its two tracks are a whole number of loops apart. There are 36 because 10 recordings are in three copies (3 pairs each) and one is in four (6 pairs).

- **A cut at 0.95** puts the 34 tracks into exactly the **11 groups** of the loop: `01 12 23 34`, `02 13 24`, … `11 22 33`. One kept copy per group leaves 11 tracks and 23 duplicates. `samples/sample3h.m4a`, the same file three times over, gives the same 11 groups from 102 tracks.
- Every duplicate lines up within 0.65 s of where the loop says.
- **The closest different pair is 08 and 11**, at r = 0.831. No different pair scores between 0.9 and 0.95.

**A split mistake shows as a partial match.** Delete the split between tracks 13 and 14, and the long track that results matches 02 over its first 92.0 s and 03 from 1:40.5 on. "03 from 1:40.5" says the missing split goes about 1:40 into the long track.

**The thresholds.** r ≥ **0.95** for a match sits in the empty space between duplicates (0.987 up) and different tracks (0.831 down) on these two files of one soundtrack in one master, nearer the duplicates because a wrong match leaves a track out of the export while a missed one costs one listen. A full match may fall **2 s** short of either track's end: a split can land anywhere in a gap of the 2 s minimum length (note 04), so two cuts of one track can differ by about that. The copies measured differ by 0.65 s at most.

## Time

The pairs grow with the square of the number of tracks, and each pair's work (offsets times overlap) with about the square of a track's length. So `sample3h.m4a`, three times `sample1.m4a`, takes 15 s with a plain loop at 50 ms against 1.6 s: nine times the pairs.

- **A quarter of the windows is a sixteenth of the time**: at 200 ms the 15 s becomes 0.95 s, with the same 11 groups, because the shape r reads plays out over seconds.
- **Running totals.** The score needs five sums over the overlap. With n windows meeting, the top of the formula is Σab − Σa·Σb / n, and each spread is Σa² − (Σa)² / n. Σa, Σb, Σa² and Σb² are totals of a run of windows, so a running total of each stretch gives any run's total as one subtraction. Only Σab needs both stretches, so the inner loop does one multiplication per window: 0.84 s on `sample3h.m4a`, against 2.7 s with all five sums in the loop.
- **Slide, multiply, add is a convolution.** The FFT ([note 14](14-the-spectrum.md)) gets the score at every offset in far fewer steps; one second on a 3 h file does not need it.

## What it does not find

- **A stretch shared in the middle of both tracks**, such as a medley that quotes another piece. The score is r over the whole overlap, so it finds a track inside another and two tracks whose ends overlap, but not a shared middle: 30 s of track 02 pasted into track 06 scores 1.000 on those 30 s and **0.798** over the best overlap, under the cut.
- **A remix or a re-recording.** And it reads only loudness, not sound: two different tracks with the same rise and fall would match.

## Where it lives in the code

- [`src/shared/lib/audio/sliding-correlation.ts`](../../src/shared/lib/audio/sliding-correlation.ts): `slidingCorrelation`, Pearson's r at every offset from running totals, with the best offset and its overlap.
- [`src/entities/split/lib/coarse-curve.ts`](../../src/entities/split/lib/coarse-curve.ts): `coarseCurve`, the 200 ms copy floored at −60 dB.
- [`src/entities/split/lib/find-matches.ts`](../../src/entities/split/lib/find-matches.ts): `findMatches`, each track's stretch without its quiet ends, every pair slid, and the duplicates and partial matches.
- [`src/entities/split/config/match-thresholds.ts`](../../src/entities/split/config/match-thresholds.ts): 0.95, 30 s, 2 s, 200 ms and −60 dB.
