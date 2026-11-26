# Changes of sound at crossfades: first analysis

Status: measured

GitHub issue #18 and [milestone 8](../audio-splitter-v2/milestones.md#milestone-8-changes-of-content-for-crossfaded-tracks). It proposes splits where the sound before a point differs from the sound after it, even when the loudness never dips. Nothing in `src/` changes until the concept note is confirmed.

## Where it starts

- **The spectrum is there.** The source-file store keeps one spectrum per 50 ms loudness window: 128 log bands of one byte, 50 Hz to half the sample rate ([note 14](../../docs/concepts/14-the-spectrum.md)). No second decode is needed.
- **Find splits has two detectors.** Gaps and dips, one split per boundary within 15 s, and a confidence per split in three bands ([note 13](../../docs/concepts/13-adaptive-threshold.md), `src/entities/split/lib/propose-splits.ts`).
- **No real crossfaded file has an answer key.** `sample-crossfade.mp3` has no chapters and no surviving track list, and no other crossfaded file with track times was found. #16's ear check of its 22 dips of 15 dB and more was never done, so the 15 and 9 dB cut-offs are untuned on a crossfade.
- **Splits are not stored across a reload.** #15 was closed as not planned, so the new confidence has nothing to store.

## Decisions

Grilled with the user on 2026-11-27.

1. **Scope.** Lo-fi compilations whose tracks overlap, ambient mixes with a bed of sound, and gapless joins (one track starts as the last stops). Beat-matched DJ mixes are not a target.
2. **The answer key is made, not found.** Tracks cut from the user's gapped playlists at their known boundaries, trimmed to their sound, set to one loudness and joined with equal-power crossfades of 0, 5, 10 and 20 s. One set takes each mix from one playlist, so the tracks sound alike (the hard case); the other mixes playlists. A boundary is the middle of its crossfade. Mixotic and UnmixDB are skipped unless these results look too good to trust.
3. **One listening session on the real file.** The new detector's 15 strongest proposals in `sample-crossfade.mp3` and #16's 22 dips of 15 dB and more, merged within 15 s, each called a track change or not. It comes after the measurement and before the concept note, and also tunes #16's cut-offs.
4. **The pass mark.** At some setting: on the one-playlist mixes with 10 s crossfades, at least 80 % of the boundaries found within 5 s, with no more false proposals than real ones; and on `sample1.m4a` with its gaps masked, at most about one false proposal per 10 minutes.
5. **If nothing passes,** the concept note and the change curve still ship, and nothing is proposed.
6. **The track count.** A file's description often lists titles without times, so a "top N − 1" version is scored beside a threshold.
7. **What is measured.** Built from the 128-band spectrogram, bands over 15 kHz dropped, windows under the silence threshold left out: the level removed from each column or kept; 128 bands, about 20 grouped bands, or MFCCs; 10, 20 and 30 s before and after each point. Foote's checkerboard kernel only if all of these fail.
8. **Where the split goes.** At the peak of the curve, about the middle of the crossfade.
9. **One split per boundary.** Gap, then dip, then change of sound: a change proposes a split only where no gap, dip or split is within 15 s.
10. **Agreement.** Whether a dip and a change at one boundary predict a real one better than the dip alone is measured. If it does, such a dip goes up one band.
11. **One setting.** The user tunes a threshold, or the track count; the window and the bands are fixed by the measurement. The setting joins the default settings, and an entry saved before starts at the built-in value.
12. **Confidence.** The same three bands. The cut-offs come from the one-playlist set: sure where about 90 % of proposals were real, likely where at least half were. The tooltip shows the detector's own measure, in its own unit. The listening session may move them.
13. **The change curve** is a lane under the loudness curve, in the whole-file panel, with its own scale.

Grilled again on 2026-11-27, after the measurement:

14. **The measure that passed replaces decision 7's list.** The power mean of each band back in dB, each column's level removed, all bands up to 15 kHz, 60 s before against 60 s after. Tracks under about a minute, and the file's first and last minute, are found poorly.
15. **Two bands for a contrast proposal.** Sure from 6.5 dB, doubtful from 5.4 to 6.5 dB; never likely. This replaces decision 12's three.
16. **Agreement raises a dip one band** (decision 10 holds): a dip with a contrast proposal within 5 s.
17. **The word is contrast** (`GLOSSARY.md`), and its curve is the contrast curve.
18. **A threshold, from 5.4 dB.** A track count may come later as a second way to set it.
19. **Inside Find splits, behind a setting.** Contrast is the third detector, after gaps and dips. Whether the setting starts on or off waits for the gapped playlists' count.
20. **Nothing within 60 s of the file's ends.** It removes both false proposals on `sample1.m4a`.
21. **`sample-crossfade.mp3` is left out.** The user listened: everything blends, so no boundary can be heard. Decision 3's listening session is dropped. It also drops #16's planned ear check of its 22 dips, so the 15 and 9 dB cut-offs stay as note 13 set them.
22. **Issue #18's first acceptance criterion** now reads: on crossfaded mixes built from the user's playlists, with 10 s crossfades, at least 80 % of the boundaries proposed within 5 s, with no more false proposals than real ones. Edited on GitHub with the reason.
23. **What was checked is what is claimed.** Lo-fi compilations whose tracks overlap, and gapless joins. Ambient mixes are untested, so the concept note and `CHANGELOG.md` say "crossfaded compilations".
24. **The file stays in `samples/`, unused.** Note 13's planned listening, the comment in `confidence-bands.ts` and #16's ticket 07 each get a line saying the check was dropped, in the milestone's commit.
25. **One glossary word.** Only the measure, Contrast, is defined. A split found this way is "a split at a contrast peak".
26. **The contrast setting starts off.** This settles decision 19. The user can save it on as a default.
27. **A contrast split alone is never sure.** Likely from 6.5 dB, doubtful from 5.4 to 6.5 dB. This replaces decision 15; decision 16 still lifts a dip.
28. **Decision 4's second half is missed, and accepted.** It holds on `sample1.m4a`, not across the 19 playlists (1.7 per 10 min). The note says contrast also hears changes inside a track.
29. ~~The user listens to the added splits in long split-less stretches.~~ Replaced by decision 34.
30. **The contrast curve always shows**, under the loudness curve. Moving the contrast threshold previews what Find splits would add, as for dips. With the setting off, the threshold line and its marks are hidden.
31. **The lift of decision 16 needs the setting on.** A switched-off detector changes no confidence.
32. **60 s of room.** A contrast split is proposed only 60 s or more from every gap or dip proposal and every split. Gaps and dips keep their 15 s. This replaces decision 9 for contrast.
33. **Decision 28 is dropped.** With 60 s of room, both halves of decision 4 pass.
34. **The user listens to what contrast adds to the playlists.** The 22 proposals are 10 moments, since the loops repeat them. One 30 s clip each, 15 s on either side, in [`listening-list.md`](listening-list.md).
35. **The listening decides the start and the top band.** If at least half of the 10 are track changes, the setting starts on, and a contrast split from 6.5 dB is sure. If fewer, it starts off, and a contrast split is never sure (decision 27). **Settled by the listening: 3 of 10, so the setting starts off, and a contrast split is likely from 6.5 dB, doubtful under it, never sure.**
36. **No room rule between two contrast splits.** They keep the shared 15 s. Keeping the stronger of a close pair would have kept the wrong one at clips 02 and 03, and the same rule lost 31 test boundaries.

## Open

- **The room around a boundary.** 170 of the 192 splits contrast adds to the gapped playlists are within 60 s of an existing split. A 60 s window makes a wide hump around a real boundary, and the ±15 s peak rule lets its shoulders through. Two fixes were measured (scratchpad, `gapped-playlists.md`, "Wider peak spacing"):

| Rule                                                    | Added to the playlists | Per 10 min | ≥ 6.5 dB | Hard 10 s, all detectors: found / false | Boundaries lost |
| ------------------------------------------------------- | ---------------------- | ---------- | -------- | --------------------------------------- | --------------- |
| As measured (±15 s peaks, 15 s room)                    | 192                    | 1.66       | 149      | 39 / 8                                  | 0               |
| A: peaks the highest within ±60 s                       | 73                     | 0.63       | 67       | 35 / 4 (fails at 79.5 %)                | 31              |
| B: ±15 s peaks, no contrast within 60 s of a gap or dip | 22                     | 0.19       | 14       | 39 / 6                                  | 1               |

- **B passes both halves of decision 4.** 13 of its 22 fall in the long split-less stretches (f12 9, f14 3, f18 1).
- A loses boundaries to higher peaks inside a neighbouring track.
- B lost one boundary: the only pair of boundaries under 60 s apart (52.6 s) in the test mixes.
- **Two contrast splits can still be close.** B keeps 60 s from gaps and dips, not from another contrast peak. Clips 02 and 03 are 21.5 s apart, and 06 and 07 are 22.5 s.

The key to [`listening-list.md`](listening-list.md), rule B at 5.4 dB. "Repeats" counts the same moment in the later loops.

| Clip | File | Time    | Contrast (dB) | Depth (dB) | To the nearest split | Repeats |
| ---- | ---- | ------- | ------------- | ---------- | -------------------- | ------- |
| 01   | f03  | 15:18.0 | 7.4           | 8.5        | 62 s                 | 2       |
| 02   | f12  | 10:50.0 | 6.3           | 7.7        | 121 s                | 2       |
| 03   | f12  | 11:11.5 | 6.6           | 2.9        | 143 s                | 2       |
| 04   | f12  | 12:27.5 | 6.4           | 4.2        | 116 s                | 2       |
| 05   | f14  | 10:16.0 | 7.0           | 1.3        | 62 s                 | 2       |
| 06   | f14  | 32:52.0 | 7.7           | 8.1        | 126 s                | 0       |
| 07   | f14  | 33:14.5 | 8.5           | 2.8        | 103 s                | 1       |
| 08   | f14  | 58:06.0 | 8.9           | 12.4       | 94 s                 | 0       |
| 09   | f16  | 18:42.0 | 5.8           | 6.2        | 84 s                 | 1       |
| 10   | f18  | 41:04.0 | 8.6           | 14.1       | 111 s                | 0       |

f03 is one of the four files whose Find splits matches the published track times, so clip 01 is expected to be no track change.

**Heard by the user on 2026-11-27:** 3 of the 10 are track changes (02, 08, 10), 6 are not, and 07 is unsure. Counted with the loops' repeats, 5 of the 22 proposals are real (23 %).

- **Two of the real ones dip the most.** 08 and 10 are 12.4 and 14.1 dB deep: dips that the 15 dB depth setting leaves out. 02 is 7.7 dB deep, and the false ones 1.3 to 8.5 dB.
- **Contrast alone doesn't sort them.** The real ones score 6.3, 8.6 and 8.9 dB; the false ones 5.8 to 7.7 dB.
- **Keeping the stronger of a close pair would be wrong once.** 02 (6.3 dB) is a track change and 03 (6.6 dB), 21.5 s later, is not.
- So on gapped files, what contrast adds is mostly wrong. Where it helps is where a shallow dip agrees with it, which decision 16's lift already uses.

## Method

Measured on 2026-11-27. Nothing in `src/` changed. The scripts are in the session scratchpad, under `crossfade-spike/`; `lib.ts`, `change.ts` and `score.ts` hold the shared parts, and `s1-*` to `s4-*` are the steps. They import the app's modules unedited; `hooks.mjs` resolves the `@/` alias for `find-matches.ts`.

- **Analysis.** Native ffmpeg 8.1 decodes to float PCM at the file's own rate. The app's `downmix.ts`, `loudness-builder.ts` and `spectrogram-builder.ts` build the loudness curve and the spectrogram, as the load does. All five sources are 44.1 kHz.
- **Sources.** Five clean playlists: `sample1.m4a`, f03 `4am`, f04 `distant memories.`, f05 `is this real` and f11 `play this before december ends`. Find splits at the defaults cuts each (33, 29, 28, 23 and 30 splits).
- **The first pass.** The app's `find-matches.ts` on those tracks. The first track that is a full duplicate of an earlier one starts the second pass. That gives 11, 10, 9, 8 and 11 tracks: **49 tracks**, 72.5 s to 3:41 long.
- **Trim and level.** Each track runs from its first to its last window at or over its source's silence threshold. One gain moves its loudness-curve median to −18 dB (the sources' medians were −22.7 to −10.0 dB).
- **Crossfades.** Equal power: the outgoing track fades with cos(πt/2), the incoming with sin(πt/2). Against ffmpeg `acrossfade` (`qsin`, 10 s) on two real tracks: same length, at most 6 × 10⁻⁸ apart. A boundary is the middle of its crossfade. Lengths 0, 5, 10 and 20 s.
- **Hard set.** One mix per playlist, its tracks in order: 5 mixes, **44 boundaries**, 88 min at 10 s.
- **Easy set.** The 49 tracks shuffled with a fixed seed, no two neighbours from one playlist, cut into mixes of 10, 10, 10, 10 and 9: **44 boundaries**. All 49 tracks come from one channel, so "easy" means another playlist of the same style.
- **The change curve.** Every 0.5 s, the mean spectrum of the N s before against the N s after. Bands whose top edge is over 15 kHz are dropped: 119 of 128 kept at 44.1 kHz, 118 at 48 kHz. Windows under the silence threshold (median − 18 dB) count in neither mean. A point needs 2 s of sound on each side, or it scores 0. The means come from prefix sums of 0.5 s blocks.
- **Decision 7's variants.** The mean of each band's dB. Level: each column's mean dB subtracted (shape), or kept. Bands: all 119; 20 groups of neighbouring bands (equal counts, so log-spaced), each the mean of its dB; or MFCCs, an orthonormal DCT-II of the 119 dB values, coefficients 1–13 (shape) or 0–13 (kept). N = 10, 20, 30 s.
- **The distance.** The root mean square, over the dimensions, of the after mean minus the before mean. For bands it is in dB; for MFCCs in dB per coefficient.
- **Extras, beyond decision 7.** Tried because the whole grid failed (below):
  - **Energy mean**: each band's mean is a mean of power, back in dB, as note 13's smoothed level. A track's quiet fade then counts little. For the shape, the mean dB of the mean spectrum is removed.
  - **Standardized distance**: each band's difference divided by the pooled standard deviation of the two sides, so bands that swing with the beat count less.
  - **Longer windows**: 45 and 60 s, and 75 to 120 s for the best family.
  - Foote's checkerboard kernel was not tried: the extras passed first.
- **Peaks.** The highest point within ±15 s (the earlier of equals), not in the first or last 10 s.
- **Scoring.** A proposal finds a boundary within 5 s (3 s also reported). A proposal with no boundary within 5 s is false.
  - **Best threshold (decision 4)**: the most boundaries found with no more false proposals than real ones. It passes at 80 % found.
  - **Ranking**: average precision (AP) over all peaks, each boundary matched once; and how many of the top 44 are real.
  - **Top N − 1**: the N − 1 highest peaks of each mix, N being its track count.
- **False alarms on `sample1.m4a`.** The file as it is: its gaps are masked by the silence threshold. A proposal more than 15 s from each of its 33 splits is false.

## Results

### The answer key: depth at each boundary

The depth is #16's, the deepest point within 5 s of the boundary. Find splits at the defaults (gaps, then dips of 15 dB and more):

| Set  | Crossfade | Boundaries ≥ 15 dB | 9–15 dB | < 9 dB | Median depth | Find splits: found / false |
| ---- | --------- | ------------------ | ------- | ------ | ------------ | -------------------------- |
| Hard | 0 s       | 26                 | 18      | 0      | 15.7 dB      | 30 / 3                     |
| Hard | 5 s       | 11                 | 17      | 16     | 12.3 dB      | 11 / 3                     |
| Hard | 10 s      | 9                  | 15      | 20     | 9.5 dB       | 7 / 2                      |
| Hard | 20 s      | 1                  | 11      | 32     | 5.6 dB       | 0 / 2                      |
| Easy | 0 s       | 21                 | 19      | 4      | 14.8 dB      | 24 / 3                     |
| Easy | 5 s       | 9                  | 23      | 12     | 12.6 dB      | 8 / 3                      |
| Easy | 10 s      | 6                  | 17      | 21     | 9.6 dB       | 6 / 2                      |
| Easy | 20 s      | 1                  | 7       | 36     | 5.1 dB       | 1 / 2                      |

- Even a butt joint is not a step: the tracks keep their own fades, so it dips 6.3 dB or more, 15 dB at the median.
- At 10 s about half the boundaries dip under 9 dB, and at 20 s three quarters. Only a spectral detector can find those.

### Decision 7's grid fails

AP on the hard and easy 10 s sets, and the top N − 1 found on the hard 10 s set (of 44):

| Variant         | N 10 s           | N 20 s           | N 30 s           |
| --------------- | ---------------- | ---------------- | ---------------- |
| Shape, all      | 0.16 / 0.18 / 13 | 0.23 / 0.19 / 15 | 0.23 / 0.20 / 19 |
| Shape, grouped  | 0.13 / 0.17 / 11 | 0.19 / 0.18 / 13 | 0.19 / 0.16 / 16 |
| Shape, MFCC     | 0.16 / 0.17 / 12 | 0.19 / 0.18 / 13 | 0.19 / 0.15 / 16 |
| Level kept, all | 0.12 / 0.16 / 11 | 0.13 / 0.16 / 13 | 0.17 / 0.17 / 17 |
| Kept, grouped   | 0.11 / 0.15 / 11 | 0.13 / 0.15 / 13 | 0.17 / 0.14 / 15 |
| Kept, MFCC      | 0.11 / 0.15 / 11 | 0.12 / 0.15 / 12 | 0.17 / 0.12 / 15 |

- **None of the 18 passes, at any threshold, on any set or crossfade length.** On the hard 10 s set none even finds 2 boundaries with as few false as real.
- The best AP anywhere is 0.35, on the 20 s crossfades.
- Shape beats level kept, and the bands barely matter: all, grouped and MFCC are within 0.04.
- **Why it fails.** A mean of dB counts a quiet fade as much as the track's body, so a fade is a "sound" of its own. Example: `sample1`'s tracks butt-jointed, shape, all bands, 20 s. The highest peak is 13:46.0, 5.2 s after the boundary. It is the far edge of the next track's fade-in, which climbs from −38.9 to −17.7 dB over 9 s.
- And the tracks change inside: an intro without drums is as far from the beat that follows as one track is from the next.

### Two fixes: an energy mean and a longer window

On the 10 s crossfades (AP hard / easy; the hard set's best threshold by decision 4; top N − 1 on the hard set):

| Mean   | Distance     | Level | Bands   | N    | AP          | Hard 10 s, best | Pass | Top N − 1 |
| ------ | ------------ | ----- | ------- | ---- | ----------- | --------------- | ---- | --------- |
| dB     | RMS          | shape | all     | 30 s | 0.23 / 0.20 | none            | no   | 19 / 25   |
| dB     | RMS          | shape | all     | 60 s | 0.45 / 0.38 | 32 / 23 false   | no   | 28 / 16   |
| dB     | standardized | kept  | all     | 30 s | 0.55 / 0.58 | 34 / 25 false   | no   | 29 / 15   |
| dB     | standardized | kept  | all     | 60 s | 0.73 / 0.61 | 36 / 14 false   | yes  | 35 / 9    |
| dB     | standardized | kept  | grouped | 60 s | 0.73 / 0.63 | 35 / 15 false   | no   | 34 / 10   |
| energy | RMS          | shape | all     | 30 s | 0.55 / 0.52 | 37 / 19 false   | yes  | 33 / 11   |
| energy | RMS          | shape | all     | 60 s | 0.72 / 0.70 | 39 / 12 false   | yes  | 37 / 7    |
| energy | RMS          | kept  | all     | 60 s | 0.67 / 0.70 | 36 / 13 false   | yes  | 33 / 11   |
| energy | RMS          | shape | grouped | 60 s | 0.44 / 0.48 | 30 / 22 false   | no   | 27 / 17   |

- The energy mean lifts AP on the hard set from 0.23 to 0.55 at 30 s. The 60 s window lifts it from 0.23 to 0.45 with the dB mean. Together they reach 0.72.
- With the energy mean, all 119 bands beat the 20 groups clearly (0.72 against 0.44 at 60 s).

The window length, energy mean, shape, all bands, 10 s crossfades:

| N        | 30 s | 45 s | 60 s | 75 s | 90 s | 120 s |
| -------- | ---- | ---- | ---- | ---- | ---- | ----- |
| AP, hard | 0.55 | 0.54 | 0.72 | 0.75 | 0.66 | 0.48  |
| AP, easy | 0.52 | 0.58 | 0.70 | 0.63 | 0.51 | 0.46  |

The best window is about the shortest track (72.5 s here). A longer one reaches over the next boundary.

### The best variant

**Energy mean, shape, all bands up to 15 kHz, 60 s before and after.** Its distance is in dB: how far apart the two minutes' spectral shapes are, band by band.

Threshold sweep on the hard 10 s set, with `sample1.m4a`'s false alarms:

| Threshold | Found (5 s) | Found (3 s) | False | Decision 4  | `sample1`: false | Per 10 min |
| --------- | ----------- | ----------- | ----- | ----------- | ---------------- | ---------- |
| 5.0 dB    | 39 / 44     | 29          | 13    | pass        | 2                | 0.33       |
| 5.4 dB    | 38 / 44     | 28          | 12    | pass        | 2                | 0.33       |
| 6.0 dB    | 37 / 44     | 27          | 9     | pass        | 2                | 0.33       |
| 6.5 dB    | 35 / 44     | 25          | 5     | no (79.5 %) | 1                | 0.16       |
| 7.1 dB    | 30 / 44     | 22          | 5     | no          | 0                | 0          |
| 7.8 dB    | 19 / 44     | 12          | 4     | no          | 0                | 0          |
| 8.9 dB    | 14 / 44     | 9           | 4     | no          | 0                | 0          |

**It passes decision 4.** At 5.4 dB: 38 of 44 (86 %) found within 5 s, 12 false, and 2 false on `sample1.m4a` in 61 min (0.33 per 10 min). Both halves hold from about 2.5 to 6.0 dB.

At 5.4 dB, on every set:

| Set  | Crossfade | Found (5 s) | Found (3 s) | False | Pass | AP   | Top N − 1: found / false | From the middle: median / max |
| ---- | --------- | ----------- | ----------- | ----- | ---- | ---- | ------------------------ | ----------------------------- |
| Hard | 0 s       | 32          | 23          | 20    | no   | 0.46 | 29 / 15                  | 1.4 / 4.8 s                   |
| Hard | 5 s       | 37          | 33          | 14    | yes  | 0.67 | 35 / 9                   | 1.0 / 3.8 s                   |
| Hard | 10 s      | 38          | 28          | 12    | yes  | 0.72 | 37 / 7                   | 1.5 / 4.4 s                   |
| Hard | 20 s      | 31          | 20          | 17    | no   | 0.47 | 30 / 14                  | 2.6 / 4.8 s                   |
| Easy | 0 s       | 37          | 28          | 18    | yes  | 0.55 | 30 / 14                  | 1.3 / 4.7 s                   |
| Easy | 5 s       | 38          | 35          | 15    | yes  | 0.59 | 33 / 11                  | 1.5 / 4.8 s                   |
| Easy | 10 s      | 40          | 27          | 12    | yes  | 0.70 | 36 / 8                   | 2.0 / 4.9 s                   |
| Easy | 20 s      | 26          | 13          | 22    | no   | 0.31 | 24 / 20                  | 2.9 / 4.7 s                   |

- **One threshold fits both sets.** Each set's own best is 4.7 to 5.6 dB.
- **The easy set is not easier.** The tracks are all from one channel, so another playlist sounds alike.
- **Butt joints and 20 s crossfades are harder than 10 s.** At a butt joint the peak lands on either track's own fade. At 20 s the change is spread over 20 s. On the hard butt joints, 8 of the 20 false proposals are 5 to 15 s from a boundary.
- **Placement (decision 8).** The peak sits close to the crossfade's middle: median 1.5 s, at most 4.4 s on the hard 10 s set, and no lean either way (signed median −0.4 s). At 3 s, 28 of 44 are found instead of 38.
- **Top N − 1 (decision 6)** is cleaner than the threshold: 37 found with 7 false on the hard 10 s set, against 38 with 12.
- **What only it finds.** At 10 s crossfades, both sets: 41 boundaries dip under 9 dB, and the change curve finds 37 of them.
- **The highest peaks are not the surest.** The 5 highest on the hard 10 s set hold 2 false ones (11.9 and 11.8 dB). Both are in f05, 16 and 23 s from a boundary: the boundary, misplaced.
- **Edges.** Of the 79 proposals more than 15 s from any boundary in all 40 mixes, 24 are in a mix's first or last 60 s, where one side's minute is cut short.

### False alarms on `sample1.m4a` (decision 4, second half)

- At 5.4 dB: 35 proposals, 2 false: 0:10.5 and 0:33.5. Both are edge effects: the minute before is cut by the file's start. **0.33 per 10 min.**
- Every one of the 33 splits has a proposal within 15 s, but only 18 within 5 s and 32 within 10 s. A gap's windows count in neither mean, so the curve is flat across the gap and the peak sits at its edge. By decision 9 the gap's own split wins there anyway.

### Agreement (decision 10)

Every dip of 3 dB and more in all 40 mixes. A dip is real when a boundary is within 5 s; "with a change" means a change proposal at 5.4 dB within 5 s.

| Depth   | Dips | Real, dip alone | With a change  | Without a change |
| ------- | ---- | --------------- | -------------- | ---------------- |
| ≥ 15 dB | 93   | 83 %            | 56 / 62, 90 %  | 21 / 31, 68 %    |
| 9–15 dB | 186  | 59 %            | 90 / 102, 88 % | 19 / 84, 23 %    |
| 3–9 dB  | 368  | 20 %            | 62 / 81, 77 %  | 11 / 287, 4 %    |

- **A dip with a change is about one band surer.** A 9–15 dB dip with a change (88 %) is as sure as a 15 dB dip alone (83 %). A 3–9 dB dip with a change (77 %) beats a 9–15 dB dip alone (59 %).
- Each set alone agrees: 9–15 dB goes from 62 to 92 % on the hard set, and from 56 to 85 % on the easy set.
- A dip without a change is weaker than its band: 9–15 dB falls to 23 %.

### Confidence (decision 12)

Every change peak on the hard 10 s set, by its distance:

| Distance | < 5.4 dB | 5.4–6.5 | 6.5–7 | 7–8     | 8–9   | 9–10  | ≥ 10   |
| -------- | -------- | ------- | ----- | ------- | ----- | ----- | ------ |
| Real     | 1 / 7    | 4 / 11  | 2 / 2 | 14 / 15 | 5 / 5 | 5 / 6 | 8 / 11 |

- **No cut reaches 90 %.** From 6.5 dB up, 34 of 39 are real (87 %), the most of any cut. The top 5 are 60 % real, the top 20 80 %, the top 40 88 %.
- **Under 6.5 dB no band reaches half.** 5.4 to 6.5 dB is 36 % real.
- So two bands, not three: **sure from 6.5 dB** (about 90 %), **doubtful from 5.4 to 6.5 dB**. No change proposal is "likely".

The cut-offs on the other sets:

| Set  | Crossfade | From 6.5 dB: real | 5.4–6.5 dB: real |
| ---- | --------- | ----------------- | ---------------- |
| Hard | 0 s       | 29 / 42, 69 %     | 3 / 10           |
| Hard | 5 s       | 33 / 40, 83 %     | 4 / 11           |
| Hard | 10 s      | 34 / 39, 87 %     | 4 / 11           |
| Hard | 20 s      | 27 / 37, 73 %     | 4 / 11           |
| Easy | 0 s       | 35 / 50, 70 %     | 2 / 5            |
| Easy | 5 s       | 35 / 48, 73 %     | 3 / 5            |
| Easy | 10 s      | 37 / 47, 79 %     | 3 / 5            |
| Easy | 20 s      | 22 / 42, 52 %     | 4 / 6            |

"Sure" holds best at 5 and 10 s crossfades. On butt joints and 20 s it is 52 to 73 % real, mostly from misplaced peaks.

### The gapped playlists, with the edge rule

All 19 playlists in `~/Desktop/samples/` (`sample1.m4a` once), 19.28 h. Contrast at 5.4 dB, nothing within 60 s of the ends, and nothing within 15 s of a gap or dip proposal (decision 9). The scratchpad's `gapped-playlists.md` lists every proposal.

- **It adds 192 splits to Find splits' 562: 10 per hour.** 149 of them reach 6.5 dB, the "sure" cut. 148 are under 5 dB deep, so they are changes of sound, not dips.
- **`sample1.m4a` adds none.** The edge rule drops its two false proposals.
- **On the four files whose Find splits matches the published track times** (f03, f04, f05, f11), every added split is false: 20, 3, 12 and 3, so 38 in 4 h. Most are "sure".
- So `sample1.m4a` was the kind case. Over all 19 files the rate is 1.7 per 10 min, over decision 4's 1. Inside a track, the sound changes by 6.5 dB and more about once every 6 minutes.
- **It may find what gaps miss.** 18 added splits fall in stretches of more than 4 min with no split: 12 on f12, 5 on f14, 1 on f18. Those can be real boundaries with a short silence. They are unheard, and two of f12's would make tracks of 21 and 28 s.
- The loops repeat each proposal 2 to 3 times, so 192 are not 192 separate errors.

### Time

On `sample3h.m4a` (3:04:19, 221,175 columns), from the loudness curve and spectrogram the load already builds: **447 ms** in Node (median of 5 runs). The block sums take 350 ms, the curve 92 ms, the peaks 2 ms. The sums are 22,119 points × 119 bands of float64: **21.1 MB**. The spike also summed squares, which this variant doesn't need, so the real cost is a little lower. Not timed in Chrome.

### The real file, `sample-crossfade.mp3`

- At 48 kHz, 118 bands are kept. The silence threshold is −40.5 dB.
- The change curve has 106 peaks; **32 reach 5.4 dB**, about 3 per 10 min. The 15th strongest is 6.4 dB.
- #16's dips of 15 dB and more are 22, with the four deepest #16 named.
- **The two rarely meet.** Of the 15 strongest change peaks, one is within 15 s of a deep dip (0:53:59.5 and 0:54:11.1). Either most deep dips are quiet passages inside tracks, or most changes are inside tracks, or both. Only the ear can tell.
- Merged within 15 s, they make **36 points** to hear: [`listening-list.md`](listening-list.md), times only. The key:

| #   | Time      | Source                     | Distance (dB) | Depth (dB) |
| --- | --------- | -------------------------- | ------------- | ---------- |
| 1   | 0:06:59.1 | dip                        |               | 17.0       |
| 2   | 0:14:28.1 | dip                        |               | 17.8       |
| 3   | 0:17:36.2 | dip                        |               | 19.7       |
| 4   | 0:18:27.3 | dip                        |               | 18.3       |
| 5   | 0:20:05.7 | dip                        |               | 16.3       |
| 6   | 0:20:49.5 | dip                        |               | 24.5       |
| 7   | 0:22:31.0 | change                     | 6.4           | 6.9        |
| 8   | 0:25:17.0 | change                     | 6.4           | 10.3       |
| 9   | 0:27:44.7 | dip                        |               | 15.7       |
| 10  | 0:30:37.0 | change                     | 6.8           | 14.7       |
| 11  | 0:31:27.0 | dip                        |               | 19.0       |
| 12  | 0:32:11.5 | change                     | 7.8           | 5.1        |
| 13  | 0:33:47.5 | dip                        |               | 20.1       |
| 14  | 0:34:26.0 | change                     | 7.0           | 9.6        |
| 15  | 0:36:17.9 | dip                        |               | 16.0       |
| 16  | 0:38:32.0 | change                     | 7.3           | 9.8        |
| 17  | 0:42:47.5 | dip                        |               | 16.6       |
| 18  | 0:48:24.0 | change                     | 7.8           | 12.7       |
| 19  | 0:54:11.1 | both (change at 0:53:59.5) | 7.6           | 15.6       |
| 20  | 0:54:48.2 | dip                        |               | 16.3       |
| 21  | 0:55:12.5 | dip                        |               | 22.1       |
| 22  | 0:56:32.0 | change                     | 8.1           | 6.0        |
| 23  | 0:57:14.5 | dip                        |               | 18.1       |
| 24  | 0:57:57.1 | dip                        |               | 18.6       |
| 25  | 0:58:25.4 | dip                        |               | 15.9       |
| 26  | 1:03:31.0 | dip                        |               | 15.1       |
| 27  | 1:13:04.0 | dip                        |               | 26.4       |
| 28  | 1:16:02.0 | change                     | 6.8           | 9.0        |
| 29  | 1:17:28.0 | change                     | 8.0           | 2.7        |
| 30  | 1:19:36.5 | change                     | 7.8           | 5.8        |
| 31  | 1:24:14.0 | change                     | 6.7           | 5.5        |
| 32  | 1:24:43.0 | change                     | 7.4           | 12.4       |
| 33  | 1:29:52.0 | dip                        |               | 17.7       |
| 34  | 1:37:10.5 | change                     | 7.3           | 6.5        |
| 35  | 1:42:10.4 | dip                        |               | 16.7       |
| 36  | 1:44:16.5 | dip                        |               | 16.1       |

A "change" row's depth is the deepest point within 5 s of it. A "both" row sits at the dip, the sharper of the two.

## What it means for the open questions

### Find splits, a button of its own, or a setting off by default

- **Recommended: a setting, off by default, inside Find splits.** Decision 9 already puts a change last, so on a gapped file only its false alarms get through: 2 in 61 min on `sample1.m4a`.
- Off by default because the pass comes from synthetic mixes of one channel's lo-fi. On the real ambient file its 15 strongest proposals barely meet the deep dips, and nobody has heard either yet. The listening session can turn the default on.
- A button of its own would bring back the double splits that #16 removed by having one Find splits.
- The measure is not decision 7's. The agreed grid failed; what passed is the energy mean and a 60 s window. That needs the user's yes, and the concept note teaches it: why a mean of power, why a minute.
- The two false alarms on `sample1.m4a` are in its first 34 s. Not proposing a change within N (60 s) of the ends would remove both, and would hide a first or last track under a minute. To decide in the build.

### A threshold or a track count

- **Recommended: a threshold, starting at 5.4 dB.** One value fits both sets (each set's own best is 4.7 to 5.6 dB) and keeps `sample1.m4a` at 0.33 false per 10 min.
- Top N − 1 is cleaner: 37 found with 7 false, against 38 with 12, on the hard 10 s set. But it needs every boundary counted, the gaps' and dips' included, and a description's track list is often wrong by a track or two. It can come later as a second way to set the same threshold.
- The window (60 s) and the bands (all up to 15 kHz) are fixed, as decision 11 says.

### Confidence

- **Sure from 6.5 dB, doubtful from 5.4 to 6.5 dB.** Sure is 87 % real on the hard 10 s set. No band under 6.5 dB reaches half, so a change proposal is never "likely".
- The highest distances are not the surest: a misplaced peak 16 to 23 s from a boundary can score 11.9 dB.
- **Agreement goes up one band** (decision 10): a dip with a change within 5 s is about as sure as the next band up of dips alone.

### The word

- `GLOSSARY.md` rules out "change", and "score" (under Confidence).
- A first try: **Contrast**, how far apart the sound of the minute before a point and the minute after it are, in dB. A proposal of this kind is a **contrast**, as a dip is a dip. The curve is the **contrast curve**.
- The unit is dB, like depth, but it measures a different thing. The tooltip can say "contrast 7.2 dB" beside "depth 15.6 dB".

### Files that are not music

- Not measured: no talk or video file was tried. A speaker or a scene changes the spectrum as a track does, so it would propose splits there.
- With the setting off by default, no guard is needed yet.

## Not measured yet

- **The ear check** on `sample-crossfade.mp3` (decision 3). Until then, no real crossfaded boundary has been scored.
- **The real file's precision.** 32 proposals at 5.4 dB in 105 min, against about 1.4 false per 10 min on the synthetic hard 10 s set.
- **Other music.** Every synthetic track is lo-fi from one channel. Ambient mixes, and tracks under 60 s, were not in the answer key.
- **Finer placement.** A second look with a short window around each peak could move it nearer the middle. At 3 s, 28 of 44 are found instead of 38.
- **Foote's checkerboard kernel**, Mixotic and UnmixDB: skipped, since the extras passed.
- **Chrome.** The 447 ms is Node.
- **The other formats** (`.mp3`, `.opus`) agreeing on the change curve, as note 04 checked for gaps.
- **A 75 s window.** It was better on the hard set (AP 0.75) and worse on the easy set (0.63) than 60 s. Not worth a second setting.
