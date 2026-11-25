# Find duplicates: the measurement

Status: grilled

The throwaway spike that [milestone 2](../audio-splitter-v2/milestones.md#milestone-2-duplicate-tracks) and GitHub issue #12 ask for before any grilling: is `sample1.m4a` a loop, and can the loudness curve tell its repeats from different tracks? Measured on 2026-11-24. Nothing in `src/` changed.

## Method

- **Curve.** Native ffmpeg decodes the sample to stereo float PCM at 44.1 kHz. The app's own `downmix.ts` and `loudness-builder.ts` turn it into the loudness curve: 73,725 windows of 50 ms, median −16.72 dB, as in [note 04](../../docs/concepts/04-gaps-become-splits.md).
- **Tracks.** The app's `findGaps` and `gapSplitTimes` at the default settings (18 dB, 2 s) give 33 splits, so 34 tracks.
- **What is compared.** Each track's stretch of the curve, with two changes. Values under −60 dB count as −60, so digital silence (−100 dB) doesn't swamp the score. The quiet windows at both ends of the track (under the silence threshold) are left off, so the shared shape of every fade in and fade out doesn't count as a match.
- **The score.** The shorter stretch slides along the longer one, 50 ms at a time. At each offset the score is Pearson's r of the two over the part where they overlap, if that part is at least 20 s. A pair's score is its best r, with that offset and that overlap. r is 1 when the two curves rise and fall together, whatever their loudness. It is 0 when they have nothing in common.
- **The truth.** The whole curve against itself, shifted. A pair is a known duplicate when the two tracks' music starts one loop length apart, within 3 s.

The scripts were run with Node 24 from the session scratchpad and not kept. Each is under 60 lines; the method above is enough to rebuild them.

## Results

**It is a loop.** The curve matches itself best when shifted by **1182.3 s (19:42.3)**, r = 0.957. The file is three full passes of 11 tracks, plus the start of a fourth: track 34 is track 01 again. The second pass plays the tracks in the same order. `sample3h.m4a` is `sample1.m4a` three times over: shifted by 3686.25 s, r = 0.998.

**The loudness curve separates them, with room to spare.** Over all 561 pairs of `sample1.m4a`:

| Pairs            | Count | Best r                       |
| ---------------- | ----- | ---------------------------- |
| Known duplicates | 36    | 0.987 to 0.997, median 0.995 |
| Different tracks | 525   | 0.43 to 0.831                |

- A cut at r = 0.95 puts the 34 tracks into exactly the 11 groups the loop has: `01 12 23 34`, `02 13 24`, …, `11 22 33`. The same cut on `sample3h.m4a` (102 tracks) gives the same 11 groups.
- Every duplicate lines up within 0.65 s (track 04 against 26). Most line up at 0.00 s.
- The closest different pair is **08 and 11** (12:36.6 and 17:51.5): r = 0.831 at 2.85 s. Worth one listen: if the ear calls them variations of one piece, the issue's "no track the user hears as a different one" still holds at 0.95, but the margin is the number to watch on other files.
- 15 different pairs score 0.8 to 0.9, none 0.9 to 0.95.

**Partial matches are found and placed.** Made-up split mistakes on the second pass:

| Mistake                                   | Against | r     | Where                               |
| ----------------------------------------- | ------- | ----- | ----------------------------------- |
| Split 13/14 missing: one track of 190.6 s | 02      | 0.995 | 02 is its first 92.0 s              |
|                                           | 03      | 0.991 | 03 starts at 1:40.5 of it           |
| Split 24/25 placed 30 s late              | 02      | 0.997 | 02 is its first 92.0 s of 122.0 s   |
| The same, the shortened track 25          | 03      | 0.996 | it matches 0:30.0 of 03, for 60.2 s |

**How short a shared stretch can be.** A stretch of track 07, slid along each different track of the first pass and along its own copy 18:

| Stretch | Best r in a different track | Worst r in its own copy |
| ------- | --------------------------- | ----------------------- |
| 10 s    | 0.879                       | 0.907                   |
| 20 s    | 0.899                       | 0.935                   |
| 30 s    | 0.880                       | 0.946                   |
| 60 s    | 0.821                       | 0.963                   |

Under 30 s the two columns nearly meet. From 30 s they are apart, so 30 s is a fair shortest partial match.

**Time** (Node 24 on this Mac, a plain loop, one thread):

| Curve                      | `sample1.m4a`, 34 tracks, 561 pairs | `sample3h.m4a`, 102 tracks, 5,151 pairs |
| -------------------------- | ----------------------------------- | --------------------------------------- |
| 50 ms, as stored           | 1.6 s                               | 15.0 s                                  |
| 200 ms, 4 windows averaged | 0.10 s                              | 0.95 s                                  |

At 200 ms the groups are the same, and the gap barely narrows: duplicates 0.982 and up, different tracks 0.866 and under. The cost grows with the square of the file's length.

## What this answers

- **Measure first.** Yes, it is a loop, and the loudness curve tells repeats apart: 0.987 against 0.831. The milestone stays second; it does not wait for the spectrum (#17).
- **What is compared.** The loudness curve already in memory. No new decode.
- **Time.** A 200 ms copy of the curve makes a 3 h file take about a second, with no FFT. The plain sliding loop stays the lesson, and the FFT is left to the spectrum milestone, which teaches it. One second still freezes the page, so it runs in a worker or in chunks with progress.
- **What counts** (proposed from one sample): a match is r ≥ 0.95. It is a full duplicate when the shared stretch covers both tracks to within about 2 s. It is a partial match when the shared stretch is at least 30 s.

## What this does not answer

- **One kind of music.** Both samples are one game soundtrack, one master. Unmeasured: a different master or edit of the same piece; quiet tracks with a flat curve, where r has little to work with; tracks that share a loop or a stem.
- **Any order.** Each pair is compared on its own, so a reordered pass is found the same way. No sample shows it. A fixture made by concatenating sample tracks in shuffled order would.
- **A stretch shared in the middle of both tracks**, such as a medley quoting another track. The score uses the whole overlap at each offset, so it finds a track inside another, or two tracks whose ends overlap, which is what a split mistake makes. A shared middle needs another method.

## Decisions from the grilling

Agreed with the user on 2026-11-24. The words are in `GLOSSARY.md`: Match, Kept copy, Duplicate, Partial match, and the two reasons of a Left-out track.

**What is found**

- Every track of 30 s or more, quiet ends left off, is compared with every earlier one. Shorter tracks are never compared.
- Fixed thresholds in `entities/split/config/`, with no slider: r ≥ 0.95 is a match, a full one when it covers both tracks to within 2 s at each end, and a partial one from 30 s of shared stretch.
- The kept copy is the earliest copy not left out by hand. Every other copy names it. Every copy left out by hand means no match.
- A track can have several partial matches, always against an earlier track that is not a duplicate. A duplicate shows only its full match, and no match names a duplicate.

**What it does to the export**

- A duplicate is left out as a duplicate. A track already left out by hand keeps that reason and only gains the words, so dismissing its match leaves it out.
- A partial match stays in the export.
- Leaving the kept copy out by hand afterwards is allowed and changes nothing else.
- A duplicate can still be exported alone.

**After the press**

- A split at either end of a matched track that moves, is deleted or is added inside it (by hand or by Find gaps) drops that track's matches and the matches naming it. A duplicate that loses its match is included again. The duplicate reason never carries through a split or a merge.
- Clear splits and New file drop every match. Pending splits are kept, and nothing is asked.
- A second press replaces every match. A dismissal is remembered for its pair while neither track's ends change.
- Finding matches is no edit. Dismissing one is one edit.

**What the user sees and does**

- "Find duplicates" sits beside "Find gaps". It is disabled with fewer than two tracks of 30 s or more, busy while it runs, not cancellable, and says what it found ("3 duplicates, 1 partial match", "No duplicates found").
- The track list row gives the words and a dismiss button: "duplicate of 01", or a partial "03 from 1:40" (this track holds 03 from there) or "part of 03 from 0:30", with both ranges in a tooltip. The live track number is used, followed by the track's own name when it has one.
- The track strip shows a duplicate as left out, with the words in its tooltip; a partial match changes nothing there. The Track view title gives the words. The kept copy has no words.
- The words are a link that selects the other track. `C` in the Track view swaps to the same moment in the other track of the match under the playhead, or to the start of the nearest shared stretch.

**How it is built and checked**

- The sliding match runs in a Web Worker on a 200 ms copy of the curve, with a thin `*.worker.ts` entry and the logic in `shared/lib/audio/`.
- Unit specs on a made-up curve with a reordered pass. A by-hand check on a shuffled file made from `sample1.m4a` in `samples/`, with two tracks cut 30 s short. No e2e spec.
- Concept note `docs/concepts/11-finding-repeats.md` comes first, then a stop for the user's confirmation.
- No ADR: every decision is cheap to reverse, and the choice of the loudness curve is explained in the milestones file and the concept note.
