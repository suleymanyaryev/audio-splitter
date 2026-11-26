# 06: Contrast in the default settings

**What to build:** "Save as default" also saves whether contrast is on and its threshold, and every source file opened after starts with them. Default settings saved before this change still load, with contrast off at 5.4 dB.

**Blocked by:** 04.

**Status:** resolved

Spec: `.scratch/crossfade-changes/spec.md`, user stories 11, 23 and 24; Implementation Decisions "The default settings".

- [x] The default settings gain contrast on/off and the contrast threshold; the stored shape moves from version 2 to version 3.
- [x] Versions 1 and 2 are read with contrast off at 5.4 dB.
- [x] Version 3 is validated like the others: the threshold on the 0.1 dB grid and inside its range, on/off a boolean; an invalid entry falls back to the built-in settings.
- [x] Opening a source file starts contrast from the default settings; "Save as default" and the check for unsaved changes include it.
- [x] The default settings' spec covers version 3 saved and read back, versions 1 and 2, and an invalid threshold; the store's spec covers a file opening with saved contrast.
- [x] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- The stored fields are `contrastOn` (a boolean) and `contrastDb`; version 3 requires both, and a version 1 or 2 entry gets contrast off at 5.4 dB.
- The unsaved-changes check compares the contrast threshold even while contrast is off, so a threshold moved with contrast off still enables "Save as default".
- The two buttons' tooltips now end with "contrast off at 5.4 dB" or "contrast on at 8 dB" (`formatContrastSetting`).
- The store spec's "another version" case moved from version 3 to version 4, the only change to an existing spec's meaning.
