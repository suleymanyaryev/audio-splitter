# 03: Unnamed tracks export under the prefixed name

**What to build:** An unnamed track is written under the name the list shows, in export all and single export alike: `dreamscape-01.m4a`, or `01.m4a` when the prefix is empty. Renamed tracks keep today's `NN name` form until ticket 04.

- The file name of an unnamed track is the prefix and number made safe as one string, so a separator at the prefix's end is not trimmed off. When it would pass the 100-character cap, the prefix is cut so the number stays whole.
- The title tag of an unnamed track is its default name, so the bare number when the prefix is empty. The album tag stays the source stem and the track tag `n/count`.
- The single export dialog offers the track's shown name (`dreamscape-01`, or `01` with an empty prefix) instead of today's `<stem> NN`. Confirming the offer unchanged leaves the track unnamed, so a later prefix change still renames it.

**Blocked by:** 02 (The prefix field and the names on screen)

**Status:** resolved

- [x] Full export spec: unnamed tracks are written as the prefix plus the padded number; an empty prefix gives plain numbers; unsafe characters in the prefix become `-`; a 100-character prefix is cut and the number survives; title tags are the default names
- [x] Single export spec: the dialog offers the shown name; confirming it writes that file name and leaves the track unnamed; an empty prefix offers and writes `01`
- [x] Track file name and track tags specs updated to the new forms
- [x] The Playwright export spec expects the prefixed names (`bursts-01`) for files and titles in all three formats, and `pnpm test:e2e` passes
- [x] Changelog line, in the same commit
- [x] Shown in the browser: export all and a single export, and the files match the list

## Comments

- `pnpm test:e2e` as configured reuses whatever listens on port 5173, and another worktree's vite held it (every spec failed at `page.goto`). I left that server alone and ran the same specs from a throwaway config on this worktree's own ports (5199 for the dev server, 4173 for the production build): 11 of 11 passed. The throwaway config is deleted.
- The first e2e run on the new code failed the range drag in the single-export spec: the "Prefix" field at the kit's default `h-9` made the Track list header 12 px taller, which pushed `Select track 2` to the viewport's bottom edge and made Playwright scroll the whole-file waveform off screen. Measured on the base commit: the button sat at y=708 with a 17 px scroll. `UiTextField` gained a `compact` variant (`h-6`, as tall as the title line, in DESIGN.md) and the field uses it, so the layout is as it was.
- `trackFileName` and `trackTags` take the prefix as an input, and both stores snapshot `trackNamePrefix` when the export or the dialog starts, so typing in the field while an export runs changes nothing.
- A renamed track whose name is empty once made safe still falls back to the plain number (`02.m4a`), as before; ticket 04 moves it to the prefixed name.
- `MAX_FILE_NAME_LENGTH` is now exported from `sanitise-file-name.ts`, so the cut of an over-long prefix uses the same cap.
- Browser check: export all, a new prefix, a single export of tracks 2 and 3 (the offered names were `live_02` and `03`) and a renamed first track all wrote the files the list showed.
