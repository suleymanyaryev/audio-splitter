# 02: Clear splits

**What to build:** a "Clear splits" button beside Find gaps puts the source file back to one track, as it was when it opened, so the user can start over without loading the file again. It asks first only when hand-made work or pending splits would be lost.

**Blocked by:** 01 (Gaps on request)

**Status:** resolved

Spec: `.scratch/cutting-tool-base/spec.md` (stories 25–31; Implementation Decisions, "Split slice", Clear splits).

- [x] What it clears and what it keeps:
  - It deletes every split and every track name, and brings back every left-out track if ticket 04 has landed.
  - It clears the edits and the pending splits.
  - It keeps the track name prefix, the range and the settings.
- [x] Afterwards track 1 is selected and the Track view shows, unless the Range view is on show.
- [x] With edits or pending splits, it asks first and says what would be lost, in the existing loss wording. With neither, it runs at once.
- [x] It is disabled when there are no splits.
- [x] `CHANGELOG.md` has its line under Unreleased.

## Comments

- The question is the new `ClearSplitsDialog.vue` ("Clear splits?", with "Keep splits" focused first and a danger "Clear splits"), built on `formatLoss` like the New file dialog. The asking lives in `LoudnessSettings.vue`: `hasEdits` or pending splits ask, otherwise it runs at once.
- `clearSplits` is the part of `open` that starts a file over, so `open` calls it. "Brings back every left-out track" is for ticket 04 to add to it.
