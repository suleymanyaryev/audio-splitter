# 06: Contrast in the default settings

**What to build:** "Save as default" also saves whether contrast is on and its threshold, and every source file opened after starts with them. Default settings saved before this change still load, with contrast off at 5.4 dB.

**Blocked by:** 04.

**Status:** ready-for-agent

Spec: `.scratch/crossfade-changes/spec.md`, user stories 11, 23 and 24; Implementation Decisions "The default settings".

- [ ] The default settings gain contrast on/off and the contrast threshold; the stored shape moves from version 2 to version 3.
- [ ] Versions 1 and 2 are read with contrast off at 5.4 dB.
- [ ] Version 3 is validated like the others: the threshold on the 0.1 dB grid and inside its range, on/off a boolean; an invalid entry falls back to the built-in settings.
- [ ] Opening a source file starts contrast from the default settings; "Save as default" and the check for unsaved changes include it.
- [ ] The default settings' spec covers version 3 saved and read back, versions 1 and 2, and an invalid threshold; the store's spec covers a file opening with saved contrast.
- [ ] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [ ] `CHANGELOG.md` gains its line under Unreleased.
