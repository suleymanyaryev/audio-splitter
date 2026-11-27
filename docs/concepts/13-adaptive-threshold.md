# 13 · The adaptive threshold

[Note 04](04-gaps-become-splits.md) judged every window against one line. A window under the line was quiet, and a long enough run of quiet windows was a gap. That works when the tracks are separated by silence. It fails when they are not: a short silence is under the minimum gap length, and a crossfade only dips a few dB. So here a point is judged against the loudness **around** it instead. The line follows the music, and how far a point falls under it is a number in dB. That number is also how sure the app can be about the split.

## The words

- **Smoothed level**: the loudness of a window averaged over the second around it, in dB.
- **The loudness around**: the typical loudness of the 40 s around a window, a median of the curve.
- **Depth**: the loudness around minus the smoothed level, in dB. 0 means the point is as loud as its surroundings, 20 means it is 20 dB under them.
- **Dip**: a point whose depth reaches the depth setting and is the deepest within 15 s on either side (GLOSSARY.md). It can be short, and it need not get under the silence threshold.
- **Confidence**: how sure a detected split is that one track ends there, in three bands read from its depth: sure, likely, doubtful (GLOSSARY.md).

## A fixed line and a line that follows the music

The silence threshold of note 04 is the median minus 18 dB: −34.72 dB for `sample1.m4a`. It is one number for the whole file, a fair judge only when the music stays near its median. A quiet track at −30 dB is 5 dB from the line all the way through, and a 1.5 s silence at −45 dB is a boundary that the 2 s minimum drops.

A **moving line** asks a different question: not "is this window under −34.7 dB?" but "is this window far under what is playing around it?". In a loud passage at −15 dB a line 15 dB down sits at −30 dB; in a quiet one at −30 dB it sits at −45 dB. The same drop counts as a boundary in both, and a quiet track is not mistaken for a gap. The line has two ingredients, and the raw curve gives neither.

## The smoothed level

The curve has a value per 50 ms. A drum hit is a few windows loud and the space between hits a few windows quiet, so a beat dips 10 or 20 dB every half second, one or two windows wide. None of them is a boundary. Averaging over 1 s, the window and 10 on either side, makes a beat vanish and keeps a real quiet stretch.

The average is the energy mean of [note 03](03-loudness.md), in which the loud windows weigh the most. So a short quiet stretch hardly moves it. On a flat curve, a drop of 20 dB reads 0.2 dB deep when it lasts 50 ms (one drum hit), 2.8 dB when it lasts 0.5 s, and its full 20 dB only when it lasts 1 s or more. Every value under −60 dB counts as −60 first, so the −100 dB floor of digital silence cannot pull a mean down by itself.

## The loudness around: a median

The loudness around is the median (note 03) of the curve over the 20 s before and the 20 s after a point, 801 windows, worked out every 0.5 s. A median, because a **mean** follows a silence and a **median** ignores it.

A made-up check: a track at −15 dB with a 10 s silence at −60 dB inside the 40 s. The silence is 200 of 801 windows. The mean of the dB values is (601 × −15 + 200 × −60) / 801 = **−26.2 dB**, so the line would sink into the gap it is meant to measure. The median is still **−15 dB**: the silence fills a quarter of the sorted list, and the middle is still in the music. Only when more than half the windows are quiet does the median fall into the silence. That limit comes back below.

## Depth and dips

Depth is the loudness around minus the smoothed level. A point is a **dip** when its depth reaches the **depth setting** and it is the deepest point within ±15 s. The second rule gives one point per boundary: a 5 s fade-out has a hundred deep windows, and only the deepest one is proposed. The first and last 10 s of a file are skipped, as an edge gap is in note 04: a fade-in is not a track change.

The smoothed level and the loudness around depend on no setting, so they are computed once per file. A new depth setting only compares them again.

## Worked example: `samples/sample1.m4a`

The app's own loudness curve: 73,725 windows, median −16.72 dB. The 33 splits of note 04, chosen by ear, are the truth.

- **Every one of the 33 boundaries is at least 20.2 dB deep.** No other dip reaches 12.8 dB. Any setting in the empty stretch between the two gives the 33 splits.
- **At 15 dB, the dips are exactly the 33 splits of the gaps**, from depth alone, with no silence threshold and no minimum length.
- The deepest false dips are 12.7 to 12.8 dB, at 4:10.0, 23:51.9 and 43:34.2: one place, once per loop.

**On the user's playlists**, gapped loops of one channel with 57 known boundaries, the boundaries gap finding misses are silences of 1.25 to 1.95 s, under the 2 s minimum. A 0.5 s minimum finds them all with 60 false splits; dips at 15 dB find 52 of 57 with 1 false. And where a short sound cuts a gap in two, dips still give one split per ±15 s.

## Depth as a confidence

The deeper the dip, the surer it is, so the depth is its own confidence, with no second score to explain. On the playlists' first passes, dips of 15 dB and more were 52 true and 1 false, dips of 9 to 15 dB 2 true and 14 false, and dips under 9 dB 1 true and 53 false. So 15 dB and 9 dB cut three bands: **sure**, **likely** and **doubtful**. "Likely" means "check this", not "probably real". The bands come from gapped files of one channel, and on two of the playlists, where real boundaries are only 8 to 14 dB deep, they do not hold.

## Why dips are not enough: a long silence

The median needs more than half its 801 windows to be music. In a silence longer than about 20 s, the loudness around is the silence itself, and nothing falls under it. Stretching the 7.6 s gap at 5:25 of `sample1.m4a` with −60 dB: at 17.6 s it is still a 29.5 dB dip, at 27.6 s there is none. Gap finding finds such a silence at any length.

So the two detectors cover each other: gaps find the long silences, dips the short silences and the shallow dips. **Find splits runs both**, one split per boundary. A gap's split stays at its middle, as in note 04, so a gapped file gets the same 33 splits. A dip proposes its deepest point only where no gap is within 15 s.

**A gap's depth** leaves the gap's own windows out of its surroundings, or a long gap would look shallow: the median of the 20 s before the gap's start and the 20 s after its end, minus the gap's quietest smoothed level. A 60 s silence between two loud stretches is then 40 dB deep or more, not 0.

## Crossfades

Where no silence separates the tracks, the level only dips. The first loop of `sample1.m4a`, 11 tracks joined with 4 s linear crossfades: gap finding proposes 1 split, and dips at 6 dB find all 10 boundaries with 1 false. The boundaries are 7.9 dB deep and more, under the 15 dB setting. With 10 s crossfades they are 4.3 to about 10 dB deep, real and false dips overlap, and no setting separates them.

## What it does not find

- **A change with no dip**: a crossfade that keeps the level up, or a new track that starts as the last one stops. Only the sound changes.
- **Two boundaries within 15 s**: they give one split. The closest pair in the files measured is 80 s apart.
- **For the dips, a silence longer than about 20 s**: the gaps catch it.

## Where it lives in the code

- [`src/shared/lib/audio/depth.ts`](../../src/shared/lib/audio/depth.ts): `buildDepth`, the smoothed level, the loudness around and the depth; `gapDepth`, a gap's depth from the 20 s either side.
- [`src/entities/split/lib/find-dips.ts`](../../src/entities/split/lib/find-dips.ts): `findDips`, the windows at least as deep as the setting and the deepest within ±15 s.
- [`src/entities/split/lib/propose-splits.ts`](../../src/entities/split/lib/propose-splits.ts): `proposeSplits`, one split per boundary, a gap's middle first.
- [`src/entities/split/lib/confidence-band.ts`](../../src/entities/split/lib/confidence-band.ts): `bandOf`, the band of a depth, from the 15 dB and 9 dB of [`confidence-bands.ts`](../../src/entities/split/config/confidence-bands.ts).
- [`src/entities/split/model/split.ts`](../../src/entities/split/model/split.ts): `open` builds the depth profile once per file, and `setDepthSetting` changes only what Find splits would add.
