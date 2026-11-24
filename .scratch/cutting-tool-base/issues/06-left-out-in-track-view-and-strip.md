# 06: Left-out tracks in the Track view and the strip

**What to build:** while listening in the Track view, the user presses `X` to leave the selected track out or bring it back. The track strip shows left-out tracks differently, so the whole file's choice is visible at a glance. The shortcuts dialog lists both ways.

**Blocked by:** 04 (Leaving a track out)

**Status:** ready-for-agent

Spec: `.scratch/cutting-tool-base/spec.md` (stories 46, 48 and 57; Implementation Decisions, "Track list, track strip and review page").

- [ ] `X` in the Track view toggles the selected track, following ADR 0002: it does nothing while focus is in a text field, while a dialog is open or while a modifier is held.
- [ ] A left-out block in the track strip looks different, and stays a button that selects its track. The look is settled with the user in the browser, through `DESIGN.md`.
- [ ] The shortcuts dialog has a Track view row for `X` and a Track list row for the leave-out button.
- [ ] Stop: the user confirms the milestone in the browser.
- [ ] `CHANGELOG.md` has its lines under Unreleased.
