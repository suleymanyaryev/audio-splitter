# 13 · The adaptive threshold

Note 04 judged every window against one line. A window under the line was quiet, and a long enough run of quiet windows was a gap. That works when the tracks are separated by silence. It fails when they are not: a short silence is under the minimum gap length, and a crossfade only dips a few dB. This milestone judges a point against the loudness **around** it instead. The line is no longer straight, it follows the music, and how far a point falls under it is a number in dB. That number is also how sure the app can be about the split.

## The words

- **Smoothed level**: the loudness of a window averaged over the second around it. It is in dB, like the curve it comes from.
- **The loudness around**: the typical loudness of the 40 s around a window, a median of the curve.
- **Depth**: the loudness around minus the smoothed level, in dB. 0 means the point is as loud as its surroundings, 20 means it is 20 dB under them.
- **Dip**: a point whose depth reaches the depth setting and is the deepest within 15 s on either side (GLOSSARY.md). It can be short, and it need not get under the silence threshold.
- **Confidence**: how sure a detected split is that one track ends there, in three bands read from its depth: sure, likely, doubtful (GLOSSARY.md).

## A fixed line and a line that follows the music

The silence threshold of note 04 is the median minus 18 dB: −34.72 dB for `sample1.m4a`. It is one number for the whole file, and it is a fair judge only when the music stays near its median. A quiet track at −30 dB is 5 dB from the line all the way through, and a silence of −45 dB that lasts 1.5 s is a boundary that the 2 s minimum drops.

A **moving line** answers a different question: not "is this window under −34.7 dB?" but "is this window far under what is playing around it?". In a loud passage at −15 dB the line sits 15 dB under that, at −30 dB. In a quiet one at −30 dB it sits at −45 dB. The same drop of 20 dB counts as a boundary in both, and a quiet track is not mistaken for a gap.

The line has two ingredients, each of which has to be built, because the raw curve gives neither.

## The smoothed level

The curve has a value per 50 ms. A drum hit is a few windows loud and the gap between hits a few windows quiet, so a beat dips 10 or 20 dB every half second, and each dip is 1 or 2 windows wide. None of them is a boundary. Averaging over 1 s (the window itself and 10 on either side, 21 in all) makes a beat vanish and keeps a real quiet stretch.

The average is of **energy**, not of dB, as in note 03: the dB values go back to powers, the powers are averaged, and the mean goes back to dB. A power is 10^(dB/10). Three made-up checks on a flat curve, with 21 windows in each average:

| A drop of 20 dB that lasts | Windows | Smoothed level at its middle      | Depth   |
| -------------------------- | ------- | --------------------------------- | ------- |
| 50 ms (one drum hit)       | 1       | (20 × 1 + 1 × 0.01) / 21 → −0.21  | 0.2 dB  |
| 0.5 s                      | 10      | (11 × 1 + 10 × 0.01) / 21 → −2.77 | 2.8 dB  |
| 2 s                        | 40      | all 21 at 0.01 → −20              | 20.0 dB |

(The middle column is the mean power relative to the flat level, in dB.) The loud windows weigh the most in an energy mean, which is why a short quiet stretch hardly moves it: a half-second drop of 20 dB reads 2.8 dB deep. Only a stretch as long as the average, a second or more, shows its full depth. Every value under −60 dB counts as −60 first, so digital silence (−100 dB, note 03) cannot pull a mean of dB down by itself.

## The loudness around: a median

For the loudness around, the app takes the median of the curve over the 20 s before and the 20 s after a point (801 windows), every 0.5 s. The median is the middle value of the sorted list (note 04 used it for the whole file). It is used here for the same reason, and one more: a **mean** follows a silence, a **median** ignores it.

A made-up check: a track at −15 dB with a 10 s silence at −60 dB inside the 40 s. The silence is 200 of 801 windows. The mean of the dB values is (601 × −15 + 200 × −60) / 801 = **−26.2 dB**, 11 dB under the music, so the line would sink into the gap it is meant to measure and the gap would look shallow. The median is still **−15 dB**, because the silence fills a quarter of the sorted list and the middle is still in the music. Only when more than half the windows are quiet does the median fall into the silence. That limit comes back below.

## Depth and dips

Depth is the loudness around minus the smoothed level. A point is a **dip** when two things hold: its depth reaches the **depth setting**, and it is the deepest point within ±15 s. The second rule gives one point per boundary. A 5 s fade-out has a hundred windows that are all deep, and only the deepest one is proposed. The first and last 10 s of a file are skipped, as an edge gap is in note 04: a fade-in is not a track change.

The smoothed level and the loudness around do not depend on any setting, so they are computed once per file. Moving the depth slider only compares them again.

## Worked example: `samples/sample1.m4a`

Measured on 2026-11-25 with the app's own `downmix.ts` and `loudness-builder.ts`: 73,725 windows, median −16.72 dB. The 33 splits of note 04 (18 dB, 2 s) are the truth, calibrated by ear. Dips at several depth settings:

| Depth setting | Proposals | Of the 33 splits found | False |
| ------------- | --------- | ---------------------- | ----- |
| 3 dB          | 65        | 33                     | 32    |
| 6 dB          | 42        | 33                     | 9     |
| 10 dB         | 39        | 33                     | 6     |
| 15 dB         | 33        | 33                     | 0     |
| 20 dB         | 33        | 33                     | 0     |

- **Every one of the 33 real boundaries is at least 20.2 dB deep.** No other dip reaches 12.8 dB. There is a wide, empty stretch between the two, from 12.8 to 20.2 dB, and a setting anywhere in it gives the 33 splits.
- **15 dB gives the 33 splits of Find gaps exactly**, from depth alone, with no silence threshold and no minimum length.
- The deepest false dips are 12.7 to 12.8 dB, at 4:10.0, 23:51.9 and 43:34.2 (once per loop). 4:10 is 12 s after the long break that note 04 heard. It is worth one listen.

## The user's playlists

The same method on 18 one-hour playlists of one channel (Lost Sounds). All are gapped, and all are loops of 8 to 15 tracks played 2 or 3 times. Six of them have track times in the video description, in whole seconds; the 57 boundaries of their first pass are the truth (a hit is within 6 s).

**Find gaps misses short silences and splits twice.** Where it leaves a long stretch with no split, the boundary is a silence of 1.25 to 1.95 s, under the 2 s minimum, at −43 to −67 dB. Lowering the minimum finds it and a lot more:

| Method                   | Proposals | Found   | False |
| ------------------------ | --------- | ------- | ----- |
| Find gaps, 18 dB / 2 s   | 69        | 53 / 57 | 10    |
| Find gaps, 18 dB / 1.5 s | 82        | 56 / 57 | 14    |
| Find gaps, 18 dB / 1 s   | 106       | 56 / 57 | 23    |
| Find gaps, 18 dB / 0.5 s | 176       | 57 / 57 | 60    |
| Dips ≥ 10 dB             | 64        | 53 / 57 | 11    |
| Dips ≥ 15 dB             | 53        | 52 / 57 | 1     |

At 0.5 s every boundary is found, and 60 splits are wrong. Dips at 15 dB find 52 with one wrong. The deepest point also lands near the listed time: a median of 0.8 s away.

**Double splits.** A short sound inside a gap splits the gap in two or three. At the defaults, 12 of the 57 boundaries (21 %) get two or three splits within 15 s, and one of the tracks is a few seconds long. Dips give one split per ±15 s. That is also the rule Find splits uses for both detectors: proposals within 15 s of each other are one boundary.

## Depth as a confidence

Every dip of 3 dB or more in the first passes, true when within 6 s of a boundary:

| Depth | 3–6 | 6–9 | 9–12 | 12–15 | 15–20 | 20+ |
| ----- | --- | --- | ---- | ----- | ----- | --- |
| True  | 0   | 1   | 1    | 1     | 9     | 43  |
| False | 43  | 10  | 10   | 4     | 0     | 1   |

The deeper the dip, the surer it is, so the depth is its own confidence, with no second score to explain. Two cut-offs make three bands:

- **Sure**, 15 dB and deeper: 52 true and 1 false (a boundary that sits 12 s from its deepest point).
- **Likely**, 9 to 15 dB: 2 true and 14 false.
- **Doubtful**, under 9 dB: 1 true and 53 false.

"Likely" means "check this", not "probably real": on this data a dip under 15 dB was more often wrong than right. The bands hold on `sample1.m4a` and four of the playlists. They do not hold on two, `quiet solitude` and `what it feels like to be alone`, where short silences give real boundaries only 8 to 14 dB deep and music inside tracks dips up to 14.5 dB. **The bands come from gapped files of one channel.** Other music may want other cut-offs.

## Why dips are not enough: a long silence

The median needs more than half the 801 windows to be music. In a silence longer than about 20 s, the loudness around is the silence itself, so nothing falls under it. Measured on `sample1.m4a` by stretching the 7.6 s gap at 5:25 with −60 dB:

| Gap length         | 7.6 s   | 17.6 s  | 27.6 s | 37.6 s to 97.6 s |
| ------------------ | ------- | ------- | ------ | ---------------- |
| Dip ≥ 15 dB there? | 27.2 dB | 29.5 dB | none   | none             |

The longest gap between tracks in the 20 files is 23.8 s, close to where dips stop seeing. Find gaps finds every one of these, at any length. So the two detectors cover each other: gaps find the long silences, dips find the short silences and the shallow dips. **Find splits runs both** and keeps one split per boundary. A gap's split stays at its middle, as in note 04, so a gapped file gets the same 33 splits. A dip's split is at its deepest point, used only where no gap is within 15 s.

## A gap's depth: not measured yet

Gap splits get a confidence as well. The gap's own windows would pull its loudness around down, as the long silence above shows, so a gap's depth leaves them out: the **median of the 20 s before the gap's start and the 20 s after its end**, minus the gap's quietest smoothed level. A 60 s silence between two loud stretches is then 40 dB deep or more, not 0.

**This is the one rule chosen without a measurement.** The build checks it on `sample1.m4a`, `quiet solitude` and `what it feels like to be alone` before going on. If it puts any of the 33 splits under sure, the build reports it first.

## The crossfaded file

Where no silence separates the tracks, the level only dips. A made-up test: the first loop of `sample1.m4a` (11 tracks), each trimmed to its sound and joined by native ffmpeg with a linear crossfade. Find gaps at its defaults proposes 1 split with 4 s overlaps and none with 10 s. Dips find the 10 boundaries:

| Depth setting | 4 s: found | 4 s: false | 10 s: found | 10 s: false |
| ------------- | ---------- | ---------- | ----------- | ----------- |
| 4 dB          | 10 / 10    | 2          | 10 / 10     | 2           |
| 6 dB          | 10 / 10    | 1          | 9 / 10      | 1           |
| 10 dB         | 9 / 10     | 1          | 4 / 10      | 1           |
| 15 dB         | 5 / 10     | 0          | 1 / 10      | 0           |

With 4 s crossfades the boundaries are 7.9 dB deep and more; with 10 s, 4.3 to about 10 dB. The depths of real and false dips overlap, so no cut separates them, and the confidence is what is left to say. (A linear crossfade of two fading tracks dips more than a real mix, which keeps the level up, so this is a harsh test in one way and a kind one in another.)

**The real file, `samples/sample-crossfade.mp3`**: a 1:45:00 mix of soundtrack music and ambience, no chapters and no published track list. Its median is −22.51 dB, and an ambience bed keeps the floor up. Find gaps at the defaults gives 10 splits, four of them in the quiet intro. Dips are everywhere, about one every 40 s:

| Depth setting | Dips |
| ------------- | ---- |
| 3 dB          | 158  |
| 6 dB          | 106  |
| 10 dB         | 61   |
| 15 dB         | 22   |
| 20 dB         | 4    |

On `sample1.m4a` the music's own dips were 13 dB at most. Here dips of 15 to 20 dB come every few minutes, some closer than tracks usually are. They cannot be scored, because there is no track list. The only truth is the ear, so the build ends with listening to the 22 dips of 15 dB and more, one by one, and counting how many are track changes. That calibrates the bands for crossfades. It is not a pass or a fail.

## What it does not find

- **A change with no dip**: a crossfade that keeps the level up, or a new track that starts as the last one stops. Only the sound changes, and the spectrum of a later milestone is needed to see it.
- **Two boundaries within 15 s**: they give one split. The closest pair in the files measured is 80 s apart. A shorter track can be added by hand.
- **A silence longer than about 20 s, for the dips**: Find gaps catches it.

## Where it lives in the code

Filled in when the milestone's build is done.
