# 03: Unnamed tracks export under the prefixed name

**What to build:** An unnamed track is written under the name the list shows, in export all and single export alike: `dreamscape-01.m4a`, or `01.m4a` when the prefix is empty. Renamed tracks keep today's `NN name` form until ticket 04.

- The file name of an unnamed track is the prefix and number made safe as one string, so a separator at the prefix's end is not trimmed off. When it would pass the 100-character cap, the prefix is cut so the number stays whole.
- The title tag of an unnamed track is its default name, so the bare number when the prefix is empty. The album tag stays the source stem and the track tag `n/count`.
- The single export dialog offers the track's shown name (`dreamscape-01`, or `01` with an empty prefix) instead of today's `<stem> NN`. Confirming the offer unchanged leaves the track unnamed, so a later prefix change still renames it.

**Blocked by:** 02 (The prefix field and the names on screen)

**Status:** ready-for-agent

- [ ] Full export spec: unnamed tracks are written as the prefix plus the padded number; an empty prefix gives plain numbers; unsafe characters in the prefix become `-`; a 100-character prefix is cut and the number survives; title tags are the default names
- [ ] Single export spec: the dialog offers the shown name; confirming it writes that file name and leaves the track unnamed; an empty prefix offers and writes `01`
- [ ] Track file name and track tags specs updated to the new forms
- [ ] The Playwright export spec expects the prefixed names (`bursts-01`) for files and titles in all three formats, and `pnpm test:e2e` passes
- [ ] Changelog line, in the same commit
- [ ] Shown in the browser: export all and a single export, and the files match the list
