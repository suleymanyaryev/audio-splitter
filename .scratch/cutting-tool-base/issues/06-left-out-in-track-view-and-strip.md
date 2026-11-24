# 06: Left-out tracks in the Track view and the strip

**What to build:** while listening in the Track view, the user presses `X` to leave the selected track out or bring it back. The track strip shows left-out tracks differently, so the whole file's choice is visible at a glance. The shortcuts dialog lists both ways.

**Blocked by:** 04 (Leaving a track out)

**Status:** resolved

Spec: `.scratch/cutting-tool-base/spec.md` (stories 46, 48 and 57; Implementation Decisions, "Track list, track strip and review page").

- [x] `X` in the Track view toggles the selected track, following ADR 0002: it does nothing while focus is in a text field, while a dialog is open or while a modifier is held.
- [x] A left-out block in the track strip looks different, and stays a button that selects its track. The look is settled with the user in the browser, through `DESIGN.md`.
- [x] The shortcuts dialog has a Track view row for `X` and a Track list row for the leave-out button.
- [x] Stop: the user confirms the milestone in the browser.
- [x] `CHANGELOG.md` has its lines under Unreleased.

## Comments

- Built: `X` in the Track view (`TrackView.vue`), a hollow dashed block for a left-out track in the strip (`TrackStrip.vue`, `DESIGN.md`), and the two shortcut rows. The user looked at it in the browser and confirmed the look and the milestone. The user's first remark was that the leave-out button's eye icon was inverted: it now shows the track's state (open eye = in the export, crossed-out = left out), and its name says what a click does.
- Ticket 05's reading stands, since the user did not object to it: removing a track merges it with its neighbours, and the merged track keeps the earlier track's state.
- The loudness panel's title row overflowed at 1440 px with four new buttons, so the two sliders went from `w-96` to `w-80`.
