# 01: Concept note 13, the adaptive threshold

**What to build:** the concept note for milestone 6, `docs/concepts/13-adaptive-threshold.md`, shaped like the notes before it. It teaches judging a dip against the loudness around it instead of one fixed line, on the user's own samples. Per `AGENTS.md`, "Learning first", no code for this milestone starts until the user confirms the note.

**Blocked by:** None (can start immediately).

**Status:** resolved

Spec: `.scratch/shallow-dips-and-confidence/spec.md` (Implementation Decisions, "Depth" and "Docs that this changes"). Every number is in `.scratch/shallow-dips-and-confidence/analysis.md`.

- [x] The idea comes before the numbers:
  - the fixed line of note 04 against a line that follows the music;
  - the smoothed level (1 s of energy) and why the beat would otherwise make dips;
  - the loudness around as a median of ±20 s, and why a median and not a mean;
  - depth, and a dip as the deepest point within ±15 s.
- [x] The worked numbers:
  - `sample1.m4a`: every gap 20.2 dB deep or more, every other dip 12.8 dB at most, and dips at 15 dB giving its 33 splits exactly;
  - the playlists: the pooled table (Find gaps at 2, 1.5, 1 and 0.5 s against dips at 10 and 15 dB) and the short silences that Find gaps drops;
  - the depth histogram behind the 15 and 9 dB bands, with the caveat that it comes from gapped files of one channel.
- [x] Why dips go blind in a long silence (the stretched-gap table), and so why Find splits runs both detectors.
- [x] A gap's depth against the 20 s on either side, marked as the one rule not yet measured.
- [x] The crossfaded file: dips everywhere, no track list, and the ear check that calibrates it.
- [x] A "Where it lives in the code" section, filled in when the build is done (ticket 07).
- [x] The README's concept-note list gains note 13.
- [x] The user has confirmed the note.

## Comments

- The "Where it lives in the code" section exists as a placeholder ("Filled in when the milestone's build is done"); ticket 07 fills it. Its box is ticked for the section being in place.
- The three small tables in "The smoothed level" and "The loudness around" are hand arithmetic (made-up checks), not measurements. Every measured number comes from `analysis.md`; there is no `samples/` folder in this worktree.
- The user confirmed the note.
