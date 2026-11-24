# 02: Clear splits

**What to build:** a "Clear splits" button beside Find gaps puts the source file back to one track, as it was when it opened, so the user can start over without loading the file again. It asks first only when hand-made work or pending splits would be lost.

**Blocked by:** 01 (Gaps on request)

**Status:** ready-for-agent

Spec: `.scratch/cutting-tool-base/spec.md` (stories 25–31; Implementation Decisions, "Split slice", Clear splits).

- [ ] What it clears and what it keeps:
  - It deletes every split and every track name, and brings back every left-out track if ticket 04 has landed.
  - It clears the edits and the pending splits.
  - It keeps the track name prefix, the range and the settings.
- [ ] Afterwards track 1 is selected and the Track view shows, unless the Range view is on show.
- [ ] With edits or pending splits, it asks first and says what would be lost, in the existing loss wording. With neither, it runs at once.
- [ ] It is disabled when there are no splits.
- [ ] `CHANGELOG.md` has its line under Unreleased.
