# 04: Renamed tracks export under the typed name, and clashes become `name (2)`

**What to build:** A renamed track is written under its name as typed, made safe, with no number in front (`Intro.m4a`). Without the number, two files in one export can share a name, so export all gets the same free-name rule single export has. Both ship together: either one alone would let a file be written over another.

- Export all keeps the names it has written in this run and passes each new name through the free-name rule, in track order, ignoring case: the later track gets `name (2)`. That covers two tracks typed the same, a typed name equal to another track's default name, and names that differ only in capital letters.
- A typed name that is empty once made safe (`...`) is written under the track's default name; its title tag keeps the typed name.
- Single export already avoids names in its folder; a renamed track there is now written under its typed name too.

**Blocked by:** 03 (Unnamed tracks export under the prefixed name)

**Status:** ready-for-agent

- [ ] Full export spec: a renamed track is written as its typed name only; two tracks named "Intro" give `Intro` and `Intro (2)`; a track renamed `dreamscape-02` next to unnamed track 2 gives the plain name to the earlier track; `intro` and `Intro` clash; a name like `...` falls back to the default name while its title tag stays `...`
- [ ] Single export spec: a renamed track is written as its typed name, `name (2)` when the folder already has it
- [ ] Track file name spec updated; the `NN name` form is gone
- [ ] Changelog line under Changed ("a renamed track's file no longer starts with its number"), in the same commit
- [ ] Final tier green: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`, and `pnpm test:e2e` for the export flow
