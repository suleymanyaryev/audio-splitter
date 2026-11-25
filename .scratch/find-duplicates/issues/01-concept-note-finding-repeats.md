# 01: Concept note 11, finding repeats

**What to build:** the concept note for milestone 2, `docs/concepts/11-finding-repeats.md`, shaped like the notes before it. It teaches cross-correlation on the user's own sample: sliding one loudness curve along another to find where they agree. Per `AGENTS.md`, "Learning first", no code for this milestone starts until the user confirms the note.

**Blocked by:** None (can start immediately).

**Status:** resolved

Spec: `.scratch/find-duplicates/spec.md` (Implementation Decisions, "Docs that this changes"). Every number is in `.scratch/find-duplicates/measurement.md`.

- [x] The idea comes before the numbers:
  - sliding one stretch along another, one offset at a time;
  - Pearson's r over the overlap, and why a louder copy still scores 1;
  - why the quiet ends are left off, and why the curve is floored at −60 dB.
- [x] The worked numbers from `sample1.m4a`:
  - the curve against itself, best at 1182.3 s (19:42.3), r = 0.957;
  - the 11 groups of the 34 tracks;
  - copies 0.987 to 0.997 against different tracks 0.831 at most, and the closest different pair (08 and 11);
  - the table of stretch lengths behind the 30 s minimum;
  - the made-up split mistakes and where their partial matches land.
- [x] The thresholds (0.95, 30 s, 2 s) and why, with the caveat that they come from one soundtrack and one master.
- [x] Time: 1.6 s and 15 s at 50 ms against 0.10 s and 0.95 s at 200 ms, the square of the length, and why the FFT waits for the spectrum milestone.
- [x] What it does not find: a stretch shared in the middle of both tracks.
- [x] A "Where it lives in the code" section, filled in when the build is done.
- [x] The README's concept-note list gains note 11.
- [x] The user has confirmed the note.

## Comments

Written 2026-11-25. The note is `docs/concepts/11-finding-repeats.md`; README's concept-note list has note 11. Waiting for the user's confirmation, so the last box stays open and the status stays `ready-for-agent`. The "Where it lives in the code" section is a stub until ticket 08.

Numbers re-measured against `samples/sample1.m4a` with the app's own `downmix.ts`, `loudness-builder.ts` and `find-gaps.ts` (73,725 windows, 33 splits, 34 tracks); they match `measurement.md` except where listed:

- **Reproduced:** the loop at 1182.3 s with r = 0.957; the 36 duplicate pairs at 0.987 to 0.997; the different pairs at 0.831 at most; the 30 s table (all four rows); the missing-split mistake (0.995 and 0.991, 03 at 1:40.5); the 30 s late split's track 25 (0.996, 03 from 0:30.0 for 60.2 s); the 200 ms copy keeping the groups (0.983 and up, 0.865 and under, against `measurement.md`'s 0.982 and 0.866); the 0.65 s worst alignment.
- **Differs, `measurement.md` says 122.0 s:** the made-up late split at 24/25 gives a track 24 of 130.5 s, not 122.0 s (92.0 s of music, the 8.5 s gap, then 30.0 s of track 25). The note uses 130.5 s.
- **Differs, "best at 1182.3 s":** at two loops (2364.15 s) the whole curve scores 0.959 on a shorter overlap. The note says so.
- **Differs, "0.43 to 0.831":** the lowest different pair here is 0.416. The note gives only the top.
- **Not re-run:** `sample3h.m4a` (0.998 at 3686.25 s, the 102 tracks and the times of 15 s and 0.95 s) and the 1.6 s and 0.10 s times; they are `measurement.md`'s.
- **New in the note, made up here:** the effect of the quiet ends (closest different pair 0.831 with them off, 0.909 on; weakest duplicate 0.987 against 0.993); the −60 dB floor changes no score on this sample (the nine −100 dB windows are at the file's ends); a copy 6 dB louder or 20 dB quieter scores the same to 12 decimals; r by offset around the peak for tracks 01 and 12; 30 s of one track pasted into the middle of another scores 0.798 over the whole overlap (1.000 on those 30 s).

Raised for the user:

- **The worst copy of a 30 s stretch scores 0.946, under the 0.95 cut.** A 30 s partial match can be missed, while the best different track at 30 s is 0.880. The note says so and keeps 0.95.
- **Why 0.95 and why 2 s are the note's reasoning, not the spec's.** The note says 0.95 leans to the duplicates because a wrong match costs a track and a miss costs a listen, and 2 s is the minimum gap length with 0.65 s the measured worst. Veto either.
- **The 200 ms copy: mean of dB or of power?** The spec says "four windows averaged" without saying which. Both keep the groups (0.983 and 0.865 against 0.982 and 0.863). Ticket 02 has to pick one; the note does not say.

GLOSSARY or ADR candidates (not written):

- GLOSSARY: **Offset** (the slide between two stretches, in seconds) and **Overlap** (the windows that meet at an offset). The note uses both, with the plain meaning. **Cross-correlation** and **Pearson's r** are audio terms that belong to the note, not the glossary.
- No ADR candidate: the thresholds are cheap to reverse, as the spec says.
