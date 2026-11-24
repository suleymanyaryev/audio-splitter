# 04: Leaving a track out, from the track list, and the export

**What to build:** the user leaves a track out of the export from its row in the track list, and brings it back the same way. The track stays in the review and is muted in the list. "Export to folder…" writes no file for it, and numbers the files it writes 1 to K with no holes. A left-out track can still be heard and exported alone.

**Blocked by:** None (can start immediately). It changes the same split store as 01, so working the two in parallel means a merge there.

**Status:** ready-for-agent

Spec: `.scratch/cutting-tool-base/spec.md` (stories 44, 45, 47–51, 56 and 58–67; Implementation Decisions, "Split slice", left-out state and track fields, and "Export"). How the state follows the splits is ticket 05; the Track view key and the strip are ticket 06.

- [ ] The state:
  - It sits on the split where the track starts, or on the file's start for track 1.
  - It is a reason (`included` or left out `by-hand`), so milestone 2 can add one.
- [ ] The row button:
  - Each track row has a button beside "Remove track", reading "Leave out track N" or "Bring back track N".
  - It can be reached with Tab.
  - A left-out row is muted; its look is settled in the browser.
- [ ] Leaving a track out changes no split and no name. "Remove track" still merges as today.
- [ ] Leaving a track out is one edit for that track, and bringing it back takes the edit away; "New file" asks accordingly.
- [ ] Numbering:
  - An unnamed track's default name uses its export number, 1…K among the tracks not left out, padded to K.
  - A left-out track's default name is the bare prefix.
  - "Track N" (number column, Track view title, `[` / `]`, screen-reader labels) stays the track's place in the file.
- [ ] The full export:
  - It writes no file for a left-out track.
  - Names, padding and the `N/K` tag use the export numbers.
  - The summary counts the files written.
  - "Export to folder…" is disabled when every track is left out.
- [ ] Single exports:
  - "Export track…" works on a left-out track.
  - For an unnamed left-out track it proposes the prefix and the track's place in the file (`dreamscape-03`).
  - "Export range…" is unchanged.
- [ ] `GLOSSARY.md` already holds Left-out track; `CHANGELOG.md` has the user-visible lines under Unreleased.
