# Shallow dips and confidence: first analysis

Status: grilled

A first look at GitHub issue #16 and [milestone 6](../audio-splitter-v2/milestones.md#milestone-6-shallow-dips-with-a-confidence-per-split), before any grilling. Measured on 2026-11-25. Nothing in `src/` changed.

The first measurement is a stand-in: `sample1.m4a` as it is, and its first loop crossfaded by native ffmpeg. The user then added a real crossfaded file, [`sample-crossfade.mp3`](#the-real-crossfaded-file-sample-crossfademp3). Its track boundaries are not known yet, so it is surveyed, not scored.

## Method

- **Curve.** Native ffmpeg 8.1 decodes to stereo float PCM at 44.1 kHz. The app's own `downmix.ts` and `loudness-builder.ts` make the loudness curve: 73,725 windows for `sample1.m4a`, median −16.72 dB, as in [note 03](../../docs/concepts/03-loudness.md).
- **Truth on the gapped file.** The app's `findGaps` and `gapSplitTimes` at the default settings (18 dB, 2 s): 33 splits, calibrated by ear in [note 04](../../docs/concepts/04-gaps-become-splits.md).
- **Synthetic crossfades.** The first loop's 11 tracks (0:00 to 19:42), each trimmed to its first and last window over the silence threshold, then joined with ffmpeg `acrossfade` (linear, `tri`). Once with 4 s overlaps, once with 10 s. A boundary is the middle of its crossfade.
- **The dip detector.** Four steps on the curve:
  1. **Smoothed level**: the mean energy over 1 s around each window, back in dB, so the beat makes no dips.
  2. **The loudness around**: the median of the curve over ±20 s (values under −60 dB count as −60).
  3. **Depth**: the loudness around minus the smoothed level, in dB.
  4. **Proposals**: points that are the deepest within ±15 s, away from the file's first and last 10 s, kept when their depth reaches a cut.
- **Scoring.** A proposal finds a boundary when it is within 3 s of it; otherwise it is false.

The scripts ran with Node 24 from the session scratchpad and are not kept. Each is under 60 lines; the method above is enough to rebuild them.

## Results

### The gapped file, `sample1.m4a`

| Depth cut | Proposals | Boundaries found | False |
| --------- | --------- | ---------------- | ----- |
| 3 dB      | 65        | 33 / 33          | 32    |
| 4 dB      | 45        | 33 / 33          | 12    |
| 6 dB      | 42        | 33 / 33          | 9     |
| 10 dB     | 39        | 33 / 33          | 6     |
| 15 dB     | 33        | 33 / 33          | 0     |
| 20 dB     | 33        | 33 / 33          | 0     |

- Every real boundary is at least **20.2 dB** under the loudness around it. No false dip reaches **12.8 dB**.
- At a 15 dB cut the detector gives exactly the 33 splits of "Find gaps", from depth alone.
- The deepest false dips repeat once per loop: 4:10.0, 23:51.9 and 43:34.2 (12.7 to 12.8 dB). 4:10 is 12 s after the long break that note 04 heard at 3:47.8 to 3:57.9. Worth one listen.

### Synthetic crossfades of the first loop (10 boundaries)

"Find gaps" at the default settings proposes **1 split** with 4 s crossfades and **none** with 10 s.

| Depth cut | 4 s: found | 4 s: false | 10 s: found | 10 s: false |
| --------- | ---------- | ---------- | ----------- | ----------- |
| 3 dB      | 10 / 10    | 9          | 10 / 10     | 8           |
| 4 dB      | 10 / 10    | 2          | 10 / 10     | 2           |
| 6 dB      | 10 / 10    | 1          | 9 / 10      | 1           |
| 10 dB     | 9 / 10     | 1          | 4 / 10      | 1           |
| 15 dB     | 5 / 10     | 0          | 1 / 10      | 0           |

- With 4 s crossfades the boundaries are 7.9 dB deep and more. With 10 s they are **4.3 to about 10 dB**.
- The one stubborn false dip is 10.1 dB deep in both. It is most likely the 4:10 passage of the gapped file, moved earlier by the trimmed gaps.
- So with long crossfades the depths of real and false dips overlap. No single cut separates them. That overlap is what a confidence is for.

### Caveat

A linear crossfade of two tracks that already fade out dips more than a DJ mix, which keeps the level up across the change. A real crossfaded file may be shallower, and some of its boundaries may not dip at all. Those are #18's (changes of content), not this issue's.

### The real crossfaded file, `sample-crossfade.mp3`

A 1:45:00 mix of soundtrack music and ambience: MP3 at 320 kb/s, 48 kHz stereo, no chapters. Same method, at 48 kHz: 126,001 windows. Building the curve took 6.4 s with native ffmpeg.

**Its loudness is unlike `sample1.m4a`.** The median is −22.51 dB, and the middle half of the windows lie between −28.0 and −17.5 dB. The per-minute median swings from −14 to −37 dB. It has long quiet passages, and an ambience bed keeps the floor up: only 244 windows (12 s) are under −50 dB, against 2,012 under −40 dB.

**"Find gaps" finds little.** At the defaults (18 dB, threshold −40.5 dB, 2 s) it gives 10 splits. Four are inside the quiet intro (0:08.8 to 0:25.6), and two sit 48 s apart (54:36.8 and 55:24.7). That leaves 13:38.5, 18:27.0, 1:13:03.5 and 1:20:56.3, whatever they turn out to be. Loosening it only adds noise: 46 splits at 15 dB / 1 s, 164 at 10 dB / 1 s.

**The dip detector finds dips everywhere.** About one every 40 s:

| Depth cut | Dips |
| --------- | ---- |
| 3 dB      | 158  |
| 6 dB      | 106  |
| 10 dB     | 61   |
| 15 dB     | 22   |
| 20 dB     | 4    |

- The four deepest are 1:13:04.0 (26.4 dB), 0:20:49.5 (24.5), 0:55:12.5 (22.1) and 0:33:47.5 (20.1). Only 1:13:04 is also a "Find gaps" split at the defaults.
- The 22 dips of 15 dB and more come in clusters: three within 2 min at 0:17:36 to 0:20:50, six within 4 min at 0:54:11 to 0:58:25. Then none for 17 min, from 1:13:04 to 1:29:52.
- On `sample1.m4a` the true boundaries were 20 dB deep and the music's own dips 13 dB at most. Here dips of 15 to 20 dB come every few minutes, some closer together than tracks usually are. If most of them are inside tracks, depth alone will not rank this file well. Only the track list can tell.

**An `.m4a` copy agrees.** `samples/sample-crossfade.m4a` is the MP3 re-encoded to AAC at 256 kb/s by native ffmpeg, so it is a second lossy generation. Its curve differs from the MP3's by 0.018 dB on average and 1.1 dB at most. "Find gaps" gives the same 10 splits, and the dip counts match within one.

**Without the real boundaries, nothing can be scored.** The file has no chapters, and its video publishes no track list. The video (2021, 6300 s) is gone from YouTube; its archived pages from 2023 and 2025 hold a one-sentence description with no times and no chapters. So the only truth left is the ear: marking the boundaries by listening, starting with the 22 dips of 15 dB and more.

### The user's playlists (`~/Desktop/samples/`)

18 one-hour files from one channel (Lost Sounds), surveyed by the same method on 2026-11-25. Per-file reports stayed in the session scratchpad.

- **All 18 are gapped, and all are loops.** Each is a playlist of 8 to 15 tracks played 2 to 3 times, so every boundary counts 2 to 3 times. None is crossfaded.
- **Track lists.** 9 videos list track times in their description, and only for the first pass; the times are whole seconds. 6 list names only.
- **Find gaps leaves long stretches in 5 files** (4.2 to 6.4 min with no split): f12, f13, f14, f16, f18. On the two with track times, the missed boundaries are **short silences under the 2 s minimum**, not shallow dips: lows of −43 to −67 dB, but lasting only 1.25 to 1.95 s.

| File                                         | Real boundaries (all passes) | Find gaps, defaults | Dips ≥ 10 dB      | Dips ≥ 15 dB      |
| -------------------------------------------- | ---------------------------- | ------------------- | ----------------- | ----------------- |
| f14 `quiet solitude`                         | 30                           | 18 found, 6 false   | 24 found, 3 false | 23 found, 3 false |
| f16 `what it feels like to be alone`, pass 1 | 14                           | 8 found, 9 false    | 11 found, 7 false | 10 found, 1 false |

- **Find gaps also over-splits.** A short sound inside a gap gives two or three splits a few seconds apart, and so a 5 s "track". 5 of the 6 first reports had them, 4 to 15 extra splits per file. Dips keep one point per ±15 s, so they don't.
- **Depth as a confidence, on the gapped files with track times:**

| File                                 | Shallowest real boundary | Deepest false dip |
| ------------------------------------ | ------------------------ | ----------------- |
| f03 `4am`                            | 16.6 dB                  | 11.0 dB           |
| f04 `distant memories.`              | 15.3 dB                  | 6.9 dB            |
| f05 `is this real`                   | 18.3 dB                  | 11.3 dB           |
| f11 `play this before december ends` | 17.0 dB                  | 11.1 dB           |
| f14 `quiet solitude`                 | 8.1 dB                   | 9.3 dB            |
| f16 `what it feels like to be alone` | 9.5 dB                   | 14.5 dB           |

On the clean files a 15 dB cut separates them. On the two with short silences, the two ranges overlap.

- **Where a dip's split lands.** The deepest point can sit well before the boundary: 12 s early at one f14 boundary, which counts as false within 3 s.

### Pooled over the playlists with track times

Six files (f03, f04, f05, f11, f14, f16), first pass only, so each real boundary counts once: **57 boundaries**. The track times are whole seconds from the video descriptions, so a hit is within 6 s; the 3 s numbers are in the scratchpad report. f12 was dropped: its listed times drift 1 to 8 s from the silences.

**Dips beat a shorter minimum gap length.**

| Method                   | Proposals | Found   | False |
| ------------------------ | --------- | ------- | ----- |
| Find gaps, 18 dB / 2 s   | 69        | 53 / 57 | 10    |
| Find gaps, 18 dB / 1.5 s | 82        | 56 / 57 | 14    |
| Find gaps, 18 dB / 1 s   | 106       | 56 / 57 | 23    |
| Find gaps, 18 dB / 0.5 s | 176       | 57 / 57 | 60    |
| Dips ≥ 10 dB             | 64        | 53 / 57 | 11    |
| Dips ≥ 15 dB             | 53        | 52 / 57 | 1     |

- Dips at 15 dB give `sample1.m4a`'s 33 calibrated splits exactly, and nothing else.
- **Double splits.** At the defaults, 12 of the 57 boundaries (21 %) get two or three gap splits within 15 s. Dips give one.
- **Where the split goes.** The deepest point is as good as the alternatives tried: median 0.8 s from the listed time. One f14 boundary is 12 s off with every rule.

**Depth bands.** Every dip of 3 dB or more in the first passes, true when within 6 s of a boundary:

| Depth | 3–6 | 6–9 | 9–12 | 12–15 | 15–20 | 20+ |
| ----- | --- | --- | ---- | ----- | ----- | --- |
| True  | 0   | 1   | 1    | 1     | 9     | 43  |
| False | 43  | 10  | 10   | 4     | 0     | 1   |

- **15 dB and 9 dB** make the bands: sure ≥ 15 (52 true, 1 false, the misplaced f14 boundary), likely 9–15 (2 true, 14 false), doubtful < 9 (1 true, 53 false).
- They hold on f03, f04, f05, f11 and `sample1.m4a`. They don't on f14 and f16, whose short silences give real boundaries of 8 to 14 dB, and in-track dips up to 14.5 dB.
- So "likely" means "check this", not "probably real". On this data a dip under 15 dB is more often wrong than right.
- **Gap splits** by the same measure: 13 of the 71 first-pass gap splits are under 15 dB, 7 of them on a real boundary (f14 and f16 again).

### Dips go blind in a long silence

The loudness around is a median over ±20 s. In a silence much longer than that, the loudness around is the silence itself, so nothing is deep. Measured on `sample1.m4a` by stretching the 7.6 s gap at 5:25 with −60 dB:

| Gap length        | 7.6 s   | 17.6 s  | 27.6 s | 37.6 s to 97.6 s |
| ----------------- | ------- | ------- | ------ | ---------------- |
| Dip ≥ 15 dB there | 27.2 dB | 29.5 dB | none   | none             |

- Find gaps finds every one of them, at any length.
- The longest gap between tracks in the 20 files is 23.8 s (f15), close to where dips stop seeing it.
- So dips are no replacement for gaps. Each finds what the other misses: gaps the long silences, dips the short silences and shallow dips.

## What it means for the open questions

### Measure first

- On the playlists, dips pass the pass mark (decision 3): at 15 dB, 52 of 57 boundaries with 1 false. That is a gapped result: the missed boundaries there are short silences, not crossfades.
- On the crossfaded file it can't be scored, because there is no track list. Only the ear can give one.
- The concept note can start now. `sample1.m4a` already shows the idea with real numbers: the gaps are 20 dB and more under the loudness around them, and the music's own dips 13 dB at most.

### Depth is the confidence

- One number does both jobs: a dip is proposed when it is deep enough, and the deeper it is, the surer the proposal.
- It is in dB, so it is the same unit the user already tunes. It stays explainable, as "Learning first" wants.
- Gap splits can have it too: on `sample1.m4a` each is 20 dB deep or more. Then the acceptance criterion "each proposed split shows its confidence" holds on gapped files as well.
- #18 needs a confidence from a spectral score, which is not in dB. So the shown confidence is better a few bands (for example sure, likely, doubtful) than a raw number. Each detector maps its own measure onto the bands. The bands can be settled here, and #18 only adds a mapping.

### A mode or a button

- **Recommended: its own button, "Find dips", with its own depth setting.** "Find gaps" stays untouched, so the `sample1.m4a` criterion holds by construction.
- A combined mode would add the false dips to gapped files: 6 to 12 at cuts of 4 to 10 dB on `sample1.m4a`.
- Like "Find gaps", it adds only where no split is near. So pressing "Find gaps" then "Find dips" on a mixed file fills the crossfades without touching the gaps.

### The threshold line

- The idea is that the threshold becomes a curve: the loudness around, minus the depth. The panel can draw exactly that, a dashed curve that follows the music, in place of the straight line. That picture is the lesson of the milestone.
- Dragging it up or down changes the depth, as the line changes the threshold today.
- Which one is drawn follows the button last used, or a `Gaps | Dips` switch in the panel. This is for the grilling.

### Showing confidence, and splits or something weaker

Three ways, from simplest:

| Way                                                                         | For                                              | Against                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Every proposal is a split                                                   | Same as "Find gaps"; tracks and export just work | A doubtful split is exported unless the user checks it                  |
| Only sure ones become splits                                                | Nothing doubtful reaches the export unseen       | A new kind of thing beside the pending split; more to learn and to test |
| Every proposal is a split; doubtful ones also look different and come first | The user audits a short list                     | Needs the confidence to live on the split for a while                   |

- **Recommended: the third.** The confidence shows on the split's marker and number, and in the track list. A key steps through the splits from the least sure, beside `[` and `]`.
- The glossary says a detected split and a manual one "are treated the same" once they exist. A confidence breaks that. The precedent is the match: found on request, no edit, gone when a split at either end changes. So: a split keeps its confidence until the user moves it, and a new split has none.
- #15 (splits survive a reload) is still open. If it lands first, the stored splits need the confidence too, or it is lost on reload.

### The word

"Confidence" is not in `GLOSSARY.md`. "Depth" is not either, and the curve would also need a name (the loudness around). A first try for the grilling:

- **Dip**: a stretch where the loudness falls well under the loudness around it, even if it never reaches the silence threshold.
- **Depth**: how far a dip falls under the loudness around it, in dB.
- **Confidence**: how sure a detected split is, in a few bands. It lasts until the user moves the split.

## Settings the detector needs

The spike has four numbers. Only the depth needs to be a setting; the rest can be fixed and calibrated like the defaults of note 04.

| Number                     | Spike value | Why                                                                   |
| -------------------------- | ----------- | --------------------------------------------------------------------- |
| Smoothing                  | 1 s         | Long enough that drum hits make no dips                               |
| The loudness around        | ±20 s       | Longer than a crossfade, short enough to follow a quiet track         |
| Distance between proposals | ±15 s       | Also a shortest track; fine for music, maybe not for the cutting tool |
| Depth cut                  | 4 to 6 dB   | The only one the user tunes                                           |

## Not measured yet

- The issue's measurement on `sample-crossfade.mp3`: found and false boundaries, and the boundaries that never dip. It waits for the track list.
- The other two formats (`.mp3`, `.opus`) agreeing on the dips, as note 04 checked for gaps.
- Time in the browser on a 3 h file. The spike's medians run every 0.5 s, so about 21,600 medians of 800 values for 3 h; no worker is expected to be needed, but it is not timed.
- Whether 4:10 in `sample1.m4a` is heard as a change. If it is, the 33 calibrated splits miss a boundary.

## Needs from the user

- ~~One real crossfaded source file in `samples/`~~: `sample-crossfade.mp3`, added 2026-11-25. It serves #18 too.
- The track list of `sample-crossfade.mp3`, with start times: from the video's description, or marked by ear.

## Decisions

Grilled with the user on 2026-11-25.

1. **The truth for `sample-crossfade.mp3`** comes from its track list, found by a web search on the file's title.
2. **More files.** The user gave a folder of 19 one-hour playlists (`~/Desktop/samples/`), each surveyed on its own. `Lost Sounds - wasted dreams.m4a` is `sample1.m4a`, byte for byte.
3. **The measurement decides whether dips stay in #16.** The pass mark: at some depth cut, dips find at least 80 % of the real boundaries within 3 s, with no more false proposals than real ones. If no cut passes, #16 keeps only the confidence of gap splits and going through splits by confidence, and dip finding moves into #18.
4. **Confidence is shown in three bands**, sure, likely and doubtful. Each detector maps its own measure onto them; the measure itself (the depth in dB) is in a tooltip.
5. **Every proposal becomes a split.** Doubtful ones look different and come first when going through by confidence.
6. **"Find gaps" splits get a confidence too**, from the gap's depth.
7. **#16 is about the boundaries Find gaps misses or splits twice**: short silences and shallow dips, judged on the user's playlists. Crossfades stay in scope; the crossfaded file gets an ear check of its 22 deepest dips during calibration, not a pass or fail.
8. **The depth setting starts at 15 dB.** Every dip at or over it becomes a split. The band cut-offs are 15 and 9 dB, the same for gap splits and dip splits.
9. **A split keeps its confidence until the user moves it.** A split added by hand has none, and losing it is no edit.
10. **`K` marks the selected split as checked**: its confidence goes, and that is an edit.
11. **`{` and `}` step through the splits that have a confidence, least sure first.**
12. **A sure split looks as it does today.** Likely and doubtful splits are marked on their lines and in the track list, doubtful the stronger.
13. **Confidence is measured once**, when the split is added.
14. **Confidence is stored with the splits** by whichever of #15 and #16 lands second.
15. **One button, "Find splits", runs both detectors**: a split at every gap and at every dip at least the depth setting deep. The settings are the silence threshold, the minimum gap length and the depth (from 15 dB). Find gaps and a separate "Find dips" were the alternatives: two buttons keep the double splits, and dips alone go blind in long silences.
16. **One split per boundary.** Proposals within 15 s of each other become one split, which also ends Find gaps' double splits. A track under 15 s can then only be added by hand.
17. **Where the split goes.** A gap's split stays at its middle, so `sample1.m4a` keeps its 33 splits. A dip's deepest point is used only where no gap is. Of two gaps within 15 s, the deeper one's middle wins.
18. **A gap's depth** is measured against the loudness around it without the gap's own windows, so a long silence is deep. To be checked in the build.
19. **The loudness panel** keeps the fixed threshold line and adds a dashed line that follows the music: the loudness around, minus the depth. Dragging it changes the depth; the depth slider sits beside the other two.
20. **Preview.** Moving any of the three settings shows what Find splits would add and changes no split: the gaps as today, and a mark at each dip no gap covers.
21. **The default settings hold the depth too.** A saved entry from before starts at 15 dB.
22. **Words.** The button is **Find splits**. **Dip**, **Depth** and **Confidence** are in `GLOSSARY.md`.
