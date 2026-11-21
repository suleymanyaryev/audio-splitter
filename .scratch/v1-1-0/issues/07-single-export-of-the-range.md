# 07: Single export of the range

**What to build:** an "Export range…" icon button in the Range view's title row opens the same name dialog, filled in with `<source stem> <start>–<end>` (the range's times as `h.mm.ss`, dots in place of colons). Confirming writes `<name>.ext` with no track number, tagged with the name as its title and the source stem as its album and no track tag, into the remembered folder, with the same ` (2)`, progress, cancel, failure and saved line as a track. A range renames nothing.

**Blocked by:** 06 (Single export of a track)

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 25–29)

- [ ] The single-export store opens with the range as its subject; a pure helper gives the range's default name.
- [ ] The range's file name and tags as above; no track is renamed.
- [ ] The review page shows the button in the Range view and the saved line there.
- [ ] Specs: the default-name helper (under and over an hour); the store with a range end to end, tags without a track number, no rename. Review page: the button and the dialog's default.
- [ ] e2e: per supported format, one range exported, read back and decoded.
- [ ] CHANGELOG line under Unreleased (Added).
