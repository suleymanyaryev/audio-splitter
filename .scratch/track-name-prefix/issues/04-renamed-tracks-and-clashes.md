# 04: Renamed tracks export under the typed name, and clashes become `name (2)`

**What to build:** A renamed track is written under its name as typed, made safe, with no number in front (`Intro.m4a`). Without the number, two files in one export can share a name, so export all gets the same free-name rule single export has. Both ship together: either one alone would let a file be written over another.

- Export all keeps the names it has written in this run and passes each new name through the free-name rule, in track order, ignoring case: the later track gets `name (2)`. That covers two tracks typed the same, a typed name equal to another track's default name, and names that differ only in capital letters.
- A typed name that is empty once made safe (`...`) is written under the track's default name; its title tag keeps the typed name.
- Single export already avoids names in its folder; a renamed track there is now written under its typed name too.

**Blocked by:** 03 (Unnamed tracks export under the prefixed name)

**Status:** resolved

- [x] Full export spec: a renamed track is written as its typed name only; two tracks named "Intro" give `Intro` and `Intro (2)`; a track renamed `dreamscape-02` next to unnamed track 2 gives the plain name to the earlier track; `intro` and `Intro` clash; a name like `...` falls back to the default name while its title tag stays `...`
- [x] Single export spec: a renamed track is written as its typed name, `name (2)` when the folder already has it
- [x] Track file name spec updated; the `NN name` form is gone
- [x] Changelog line under Changed ("a renamed track's file no longer starts with its number"), in the same commit
- [x] Final tier passes: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`, and `pnpm test:e2e` for the export flow

## Comments

- Final-ticket review (code-review against base `16b8d7b`, Standards and Spec axes): no hard violation and no wrong behaviour. Applied: the stale comment in `export-tracks.ts`, comment paragraphs re-wrapped, DESIGN.md's `compact` and `muted` notes, the changelog wording ("changes the names shown", not "renames"), a story 40 spec (an unnamed track fails as "Track 2" under a non-empty prefix) and one `defaultTrackName` helper in `entities/split/lib/`, which the split store and the title tag now share. The file name still builds the same text itself, because it cuts the prefix before joining.
- Not applied, as judgement calls: renaming `Track.name` to `shownName` (the interface comment says what each holds), an unpadded number on strip blocks (kept as the strip looked), and extra e2e checks for a renamed track and a `(2)` clash (the unit specs drive the real stores and fake folder; the spec's Testing Decisions ask only for updated e2e expectations).
- A renamed track whose typed name is empty once made safe (`...`) is written under the prefixed name in both exports, and its title tag keeps the typed text.
- `pnpm test:e2e` reuses whatever listens on 5173, and another worktree's vite holds it, so the Final tier ran the same 11 specs from a throwaway config on this worktree's own ports (5199 dev server, 4173 build): 11 of 11 passed. The config and the test output are deleted.
- The release that ships this changes exported file names, which `CHANGELOG.md`'s own rules call a major version (2.0.0).
