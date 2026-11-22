# 01: Concept note 10, speed without pitch

**What to build:** no code. The milestone's audio idea, resampling against time-stretching, explained in chat with numbers measured on a real sample, then written as concept note 10. The user confirms the note before any code is written.

**Blocked by:** None (can start immediately)

**Status:** resolved

Spec: `.scratch/play-speed-control/spec.md` (stories 1–4; Implementation Decisions, "Ticket 01")

- [x] One excerpt from the samples is rendered with native ffmpeg three ways: the original, resampled (`asetrate` to twice the rate, then back to the original rate) and time-stretched (`atempo=2`). Each version's length and strongest frequency are measured. Temporary files go in the scratchpad and are removed afterwards.
- [x] The idea is explained in chat with those numbers before the note is written.
- [x] The note follows the shape of notes 01–09. It covers:
  - what resampling does to pitch, and why;
  - what time-stretching does instead;
  - WSOLA: overlapping blocks, laid down at a new spacing, each lined up with its neighbour by waveform similarity;
  - why speech and drum hits smear at 0.5× and 2.0×.
- [x] The note says the player's "stretch" (the range or the selected track) is unrelated to time-stretching, and links ADR 0004 for why the app uses Chrome's stretch.
- [x] The note has an empty Chrome section, filled in by tickets 02 and 03.
- [x] Stop: the user confirms the note.

## Comments

- 2026-11-22: `samples/` is absent from this worktree (git-ignored), so the excerpt was read, read-only, from the main checkout's `samples/sample1.m4a` (10 s at 1:00, mono). The strongest frequency was measured with a throwaway Hann-windowed FFT script in the scratchpad (no numpy installed); the script and all temp files are removed.
- The note's "Where it lives in the code" section is kept to the audition store and ADR 0004, since the code does not exist yet. Tickets 02 and 03 fill it in with the Chrome section.
- The user confirmed note 10 as written (2026-11-22). Note 10 is added to the README's concept-note list in the same commit.
