# 11 · Finding repeats

A playlist played two or three times gives every track two or three times. This milestone adds a button, **Find duplicates**, that finds the repeats. The button is small. The idea under it is not: to ask "is this the same recording?" without listening, the app **slides** one track's loudness curve along another's and scores how well the two agree at each offset. This note does that by hand on the user's own file, and measures how well it tells a repeat from a different track.

## The words

- **Loudness curve**: one value in dB per 50 ms window, as in note 03. A track's stretch of it is the track's shape: where it is loud, where it dips.
- **Offset**: how far one stretch is slid against the other. At offset 0 their first windows meet; at offset 12.0 s the first window of the shorter meets the window 12.0 s into the longer.
- **Overlap**: the windows that meet at an offset. Slid by an offset, two stretches only overlap on part of their length, and the score uses only that part.
- **Pearson's r**: one number for how much two lists of numbers rise and fall together. 1 means they move in step, 0 means nothing in common, −1 means one rises exactly when the other falls. It is explained below.
- **Cross-correlation**: scoring two signals at every offset. The best offset says where they line up, and its score says how well. This note's version, Pearson's r at each offset, is a loop over the offsets; the FFT is a faster way of getting the same table (see "Time").
- **Match, kept copy, duplicate, partial match** (GLOSSARY.md): what the app calls the result. A **duplicate** is a track whose match with the **kept copy** covers the whole of both. A **partial match** covers only part, at least 30 s.

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

For `c`: the products are −10.94, −10.94, −42.19 and −42.19, which sum to −106.25. Both spreads are the sum of squares, 218.75, so r = −106.25 / 218.75 = −0.486.

**Why a louder copy still scores 1.** The curve is in dB, and a gain is a multiplication that a log turns into an addition (note 09). A copy 6 dB louder is the same curve with 6 added to every value, which is `b` above. Subtracting the mean removes any added constant, and dividing by the spread removes any scale. So the score ignores how loud each copy is and keeps only its shape. On the sample, track 01 against its copy track 12 scores 0.99161 as it is, with 6 dB added to one of them, and with 20 dB taken off it. The three agree to the twelfth decimal. (The −60 dB floor below breaks this a little where a quiet copy runs into it.)

A plain difference between the curves would not do this: a copy 6 dB louder would be 6 dB away from its original at every window, and look like a different track.

## Sliding

Pearson's r compares two stretches of the same length. Two tracks are never exactly the same length, and their splits do not fall in the same place. So the shorter stretch is slid along the longer one, one window at a time, and r is computed at every offset over the overlap.

The best r over all offsets is the pair's score, and the offset where it happens says where in the longer track the shorter one sits. This is also how a split mistake shows up (below): a track that is the first 92 s of a longer one scores best at offset 0, and one that starts 100 s into it scores best at 100 s.

**Reading one slide.** Track 01 (122.2 s of music) against track 12 (122.0 s), the first two copies in `samples/sample1.m4a`. Best r at each offset around the peak:

| Offset  | Overlap | r     |
| ------- | ------- | ----- |
| 0.15 s  | 122.0 s | 0.992 |
| 0.20 s  | 122.0 s | 0.984 |
| 0.25 s  | 122.0 s | 0.946 |
| 0.35 s  | 121.9 s | 0.901 |
| 1.15 s  | 121.1 s | 0.858 |
| 5.15 s  | 117.1 s | 0.791 |
| 20.15 s | 102.1 s | 0.255 |

The peak is sharp. One window (0.05 s) off the best offset costs 0.008, two windows cost 0.05 and slid by a second the same two tracks score 0.86. That is why the scan has to try every offset. It is also why the score is trustworthy: two tracks that merely both have a loud verse and a quiet bridge do not stay in step at any offset.

**A small overlap scores by chance.** With 2 windows, any two stretches have r of exactly 1 or −1; with 10 they are noisy. So the slide ignores every offset where the overlap is under a minimum. The app's is 30 s, 600 windows.

## What is compared

The curve is not used as it is. Three changes, each for a reason:

- **The quiet ends of every track are left off.** Every track fades in and out, and every fade has the same shape: down to the silence threshold. Compared as they are, two different tracks share that shape and look more alike. On the sample the closest different pair rises from r = 0.831 to **0.909** with the ends on, while the weakest duplicate rises only from 0.987 to 0.993: the gap between the two groups halves. Left off, a track is the stretch from its first window at or above the silence threshold to its last.
- **Values under −60 dB count as −60.** Digital silence is −100 dB (note 03). A track with a few windows of it would have a spread dominated by them, and r would be about the silence and not the music. On `sample1.m4a` this changes no score: the nine windows at −100 dB are at the file's ends, outside every track. It is there for the file where they are not.
- **A tenth of the windows.** Four 50 ms windows are averaged into one of 200 ms. Why is in "Time".

## Worked example: `samples/sample1.m4a`

Measured on 2026-11-24 with the app's own `downmix.ts`, `loudness-builder.ts` and `find-gaps.ts` at the default settings (18 dB, 2 s): 73,725 windows and 33 splits, so 34 tracks. The slide is a loop over the offsets of the curve at 50 ms, floored at −60 dB, quiet ends left off, with a 30 s minimum overlap. (The table of pairs is the same at a 20 s minimum.)

**It is a loop.** The whole curve slid against itself scores best at **1182.3 s (19:42.3)**, r = 0.957. The file is three passes of 11 tracks, and a fourth begun: track 34 is track 01 again, and the second pass plays the tracks in the same order. (Slid by two loops, 2364.15 s, it scores 0.959, on an overlap one loop shorter: two loops is the loop again.) `samples/sample3h.m4a` is the same file three times over: its best shift is 3686.25 s, r = 0.998.

**Repeats and different tracks.** All 561 pairs of the 34 tracks, each scored by its best offset:

| Pairs            | Count | Best r                       |
| ---------------- | ----- | ---------------------------- |
| Known duplicates | 36    | 0.987 to 0.997, median 0.995 |
| Different tracks | 525   | 0.831 at most                |

A pair is a known duplicate when its two tracks are a whole number of loops apart. There are 36 because 10 recordings are in three copies (3 pairs each) and one is in four (6 pairs).

- **A cut at 0.95** puts the 34 tracks into exactly the **11 groups** the loop has: `01 12 23 34`, `02 13 24`, … `11 22 33`. Each group is one recording. One kept copy per group leaves 11 tracks, and 23 duplicates. On `sample3h.m4a` (102 tracks) the same cut gives the same 11 groups.
- Every duplicate lines up within 0.65 s of where the loop says (track 04 against 26 is the furthest). Most are at 0.00 s.
- **The closest different pair is 08 and 11**: r = 0.831. If the ear calls them two versions of one piece, the cut is still right, but this margin is the one to watch on other files. 15 different pairs score 0.8 to 0.9. None scores between 0.9 and 0.95.

**How short a shared stretch can be.** A stretch of track 07 is slid along every different track of the first pass, and along its own copy, track 18. At every position the stretch can start from (every 5 s), the table keeps the worst:

| Stretch | Best r in a different track | Worst r in its own copy |
| ------- | --------------------------- | ----------------------- |
| 10 s    | 0.879                       | 0.907                   |
| 20 s    | 0.899                       | 0.935                   |
| 30 s    | 0.880                       | 0.946                   |
| 60 s    | 0.821                       | 0.963                   |

Under 30 s the two columns nearly meet: by chance, a short stretch of some other track agrees almost as well as the real copy does. From 30 s they are apart. The shorter the stretch, the less it has to agree on, and the noisier r is.

**Split mistakes.** A partial match is for a split that is missing or misplaced in one pass. Two made-up mistakes on the second pass, scored with the same loop:

| Mistake                                               | Against | r     | Where the match lands                        |
| ----------------------------------------------------- | ------- | ----- | -------------------------------------------- |
| Split 13/14 deleted: one track of 190.6 s             | 02      | 0.995 | 02 is the first 92.0 s of it                 |
|                                                       | 03      | 0.991 | 03 starts 1:40.5 into it                     |
| Split 24/25 placed 30 s after track 25's music begins | 02      | 0.997 | 02 is the first 92.0 s of track 24 (130.5 s) |
| The same, the shortened track 25 (60.2 s)             | 03      | 0.996 | track 25 is 03 from 0:30.0, for 60.2 s       |

The times are what the user needs: "03 from 1:40.5" says the missing split goes about 1:40 into the long track, and "part of 03 from 0:30" says the track starts 30 s too late.

## The thresholds

Three fixed numbers, in a config file with no slider: **r ≥ 0.95** for a match, **30 s** for the shortest partial match, and **2 s** for how far a full match may fall short of either track's ends.

- **0.95** sits in the empty space between the groups: duplicates 0.987 and up, different tracks 0.831 and down. It is closer to the duplicates because the two mistakes cost differently. A wrong match leaves a track out of the export, a missed one costs one listen. One exception is already in the table above: at 30 s, the worst copy scores 0.946. A 30 s stretch of a copy can be just missed, while no different track gets near.
- **30 s** is where the table above separates the columns.
- **2 s** is the minimum gap length (note 04). A split may fall anywhere in a gap of 2 s, so the same track cut in two passes can differ by about that. The measured copies differ by 0.65 s at most.

**These come from one soundtrack and one master.** Both samples are one game's music. Not measured: the same piece from a different master or edit; quiet tracks whose curve is nearly flat, where r has little to work with; tracks that share a loop or a stem. The numbers should be measured again when a file does not fit them.

## Time

Every track is slid against every earlier one, and each slide tries every offset, over an overlap that is about as long as the track. Two things grow together: the pairs (the square of the number of tracks) and the work per pair (about the square of a track's length). Measured in the spike, with a plain loop, in Node 24 on one core:

| Curve                      | `sample1.m4a`: 34 tracks, 561 pairs | `sample3h.m4a`: 102 tracks, 5,151 pairs |
| -------------------------- | ----------------------------------- | --------------------------------------- |
| 50 ms, as stored           | 1.6 s                               | 15 s                                    |
| 200 ms, 4 windows averaged | 0.10 s                              | 0.95 s                                  |

- **Three times the file is nine times the pairs.** 1.6 s becomes 15 s, not 4.8 s.
- **A quarter of the windows is a sixteenth of the time.** A pair's work is offsets times overlap, and both shrink by 4: 1.6 s becomes 0.10 s, and 15 s becomes 0.95 s.
- **At 200 ms the answer is the same.** The same 11 groups, with duplicates at 0.98 and up and different tracks at 0.87 and down. Both 50 ms and 200 ms hold several cycles of a bass note, and what r reads, the shape of a track's loudness, plays out over seconds.

**As built, the loop is shorter still.** The score at an offset needs five sums over the overlap: Σa, Σb, Σa², Σb² and Σab. With n windows meeting, the top of the formula under "Pearson's r" is Σab − Σa·Σb / n, and each spread is Σa² − (Σa)² / n, and likewise for b. The first four are totals of a run of windows, so the app keeps running totals of each stretch, once, and takes any run's total as one subtraction. Only Σab needs both stretches together, so the inner loop does that one multiplication per window. On `sample3h.m4a` the search takes 0.84 s; the same function with all five sums in the inner loop took 2.7 s.

A second is still long enough to freeze the page, so the search runs in a Web Worker.

**Why not the FFT.** Slide, multiply, add: this is a convolution, and an FFT gets the score at every offset in a number of steps that grows only a little faster than the length instead of its square. That is the fast way. But the FFT is a lesson of its own, the spectrum milestone teaches it, and one second on a 3 h file does not need it. So here the loop is the point, and the FFT comes later as a speed-up of the same table.

## What it does not find

**A stretch shared in the middle of both tracks**, such as a medley that quotes another piece for a minute. The score is r over the whole overlap at each offset, so it finds a track inside another and two tracks whose ends overlap (what a split mistake makes) but not a shared middle. A made-up check: 30 s of track 02's curve pasted into the middle of track 06's. On exactly those 30 s r is 1.000. Over the whole overlap, the best the two tracks score is **0.798**, under the cut. Finding that needs another method.

It does not tell a piece from its remix or a re-recording either, and it does not look at the sound, only at loudness: two different tracks with the same rise and fall would match. On this sample none came close.

## Where it lives in the code

- [`src/shared/lib/audio/sliding-correlation.ts`](../../src/shared/lib/audio/sliding-correlation.ts): the slide, hand-written. It takes the running totals, scores Pearson's r at each offset whose overlap is at least the minimum, skips a flat side, and returns the best r with its offset and overlap. A tie goes to the earliest offset.
- [`src/entities/split/lib/coarse-curve.ts`](../../src/entities/split/lib/coarse-curve.ts): the 200 ms copy: every value floored at −60 dB, then four windows averaged in dB (so a louder copy is still the same curve plus a constant).
- [`src/entities/split/lib/find-matches.ts`](../../src/entities/split/lib/find-matches.ts): the rules, as small steps: each track's stretch without its quiet ends, every pair slid, a pair's kind from where the shared stretch falls (full, holds, part of), the recordings joined through full matches, the kept copy of each, the duplicates, then the partial matches between tracks that are not duplicates. Pure, so the store and the worker share it.
- [`src/entities/split/config/match-thresholds.ts`](../../src/entities/split/config/match-thresholds.ts): 0.95, 30 s, 2 s, 200 ms and −60 dB.
- [`src/entities/split/api/find-matches.worker.ts`](../../src/entities/split/api/find-matches.worker.ts) and [`find-matches-client.ts`](../../src/entities/split/api/find-matches-client.ts): the worker entry, which only wires, and the client that starts it for one request and terminates it with the answer.
- [`src/entities/split/model/split.ts`](../../src/entities/split/model/split.ts): the store keeps the matches of the last press and the dismissed pairs, and derives which still hold (both tracks keep their ends). `findDuplicates` sends the request and drops a late answer; `dismissMatch` rejects a pair; `swapTarget` and `swapTrack` are what `C` uses.
- [`src/entities/split/lib/match-words.ts`](../../src/entities/split/lib/match-words.ts) and [`src/shared/lib/time/format-tenths.ts`](../../src/shared/lib/time/format-tenths.ts): the words ("duplicate of 01", "03 from 1:40.5", "part of 03 from 0:30") and the tooltip's shared stretch.
- [`LoudnessSettings.vue`](../../src/widgets/loudness-curve/ui/LoudnessSettings.vue): the "Find duplicates" button and its result line. [`TrackList.vue`](../../src/widgets/track-list/ui/TrackList.vue): the words as a link, with a dismiss button. [`TrackStrip.vue`](../../src/widgets/track-strip/ui/TrackStrip.vue): a duplicate drawn as left out. [`TrackView.vue`](../../src/widgets/split-zoom/ui/TrackView.vue) and [`track-title.ts`](../../src/widgets/split-zoom/lib/track-title.ts): `C`, and the words in the title.
