# 04: Leaving a track out, from the track list, and the export

**What to build:** the user leaves a track out of the export from its row in the track list, and brings it back the same way. The track stays in the review and is muted in the list. "Export to folder…" writes no file for it, and numbers the files it writes 1 to K with no holes. A left-out track can still be heard and exported alone.

**Blocked by:** None (can start immediately). It changes the same split store as 01, so working the two in parallel means a merge there.

**Status:** resolved

Spec: `.scratch/cutting-tool-base/spec.md` (stories 44, 45, 47–51, 56 and 58–67; Implementation Decisions, "Split slice", left-out state and track fields, and "Export"). How the state follows the splits is ticket 05; the Track view key and the strip are ticket 06.

- [x] The state:
  - It sits on the split where the track starts, or on the file's start for track 1.
  - It is a reason (`included` or left out `by-hand`), so milestone 2 can add one.
- [x] The row button:
  - Each track row has a button beside "Remove track", reading "Leave out track N" or "Bring back track N".
  - It can be reached with Tab.
  - A left-out row is muted; its look is settled in the browser.
- [x] Leaving a track out changes no split and no name. "Remove track" still merges as today.
- [x] Leaving a track out is one edit for that track, and bringing it back takes the edit away; "New file" asks accordingly.
- [x] Numbering:
  - An unnamed track's default name uses its export number, 1…K among the tracks not left out, padded to K.
  - A left-out track's default name is the bare prefix.
  - "Track N" (number column, Track view title, `[` / `]`, screen-reader labels) stays the track's place in the file.
- [x] The full export:
  - It writes no file for a left-out track.
  - Names, padding and the `N/K` tag use the export numbers.
  - The summary counts the files written.
  - "Export to folder…" is disabled when every track is left out.
- [x] Single exports:
  - "Export track…" works on a left-out track.
  - For an unnamed left-out track it proposes the prefix and the track's place in the file (`dreamscape-03`).
  - "Export range…" is unchanged.
- [x] `GLOSSARY.md` already holds Left-out track; `CHANGELOG.md` has the user-visible lines under Unreleased.

## Comments

- The state is `Inclusion = 'included' | 'by-hand'`, on `Split.inclusion` and `firstTrackInclusion` (beside the first track's name). A `Track` gains `inclusion`, `isLeftOut`, `exportNumber` (1…K or null) and `placeName` (the own name, or the prefix and the track's place in the file). `name` is the shown and exported name; for a left-out unnamed track it is the bare prefix.
- The Track view's title now uses `placeName`, so leaving a track out never renumbers what the user is reviewing. The single export proposes `placeName` for a left-out track and `name` for any other.
- A single export of an included track numbers its file by its export number among the K written; a left-out one by its place among all tracks (`dreamscape-03`, tag `3/3`).
- Inheritance on insert and removing the first track are ticket 05's, so a split added inside a left-out track is `included` until then.
- The `BOTTOM_DECIBELS` export knip flagged after ticket 03 is un-exported here: ticket 03's commit left `pnpm knip` red, and amending it would rewrite history.
