# 02: Play speed, heard in every view

**What to build:** a play speed slider just before volume in the zoom panel's title row, 0.5× to 2.0× in 0.1 steps, with a button on its left that shows the play speed (`1.5×`) and resets it to 1.0. The player plays at the play speed with the pitch kept, in the audition, the range and the selected track. A change takes effect at once while playing, and the play speed holds across pauses, seeks and the window hand-over of a long track. It isn't saved yet: a reload starts at 1.0.

**Blocked by:** 01 (the note must be confirmed before any code)

**Status:** resolved

Spec: `.scratch/play-speed-control/spec.md` (stories 1–23 and 28–35; Implementation Decisions, "Tickets 02 and 03"; Testing Decisions)

- [x] The audition store holds the play speed beside the volume, with its limits in the player's configuration: 0.5–2.0, step 0.1, default 1.0. Its setter clamps, rounds to the grid and ignores a value that isn't a number.
- [x] The one element plays at the play speed with pitch preservation on, from when it is made and as soon as the play speed changes.
- [x] The play speed survives a new source: a new clip, releasing the held one, a seek outside the held window, the window hand-over. The element's default rate is set as well as its current rate (ADR 0004).
- [x] A play speed control sits just before the volume control in all three views' title rows. It has a reset button showing the play speed (U+00D7), always enabled, and a compact slider named "Play speed" with the value text `1.5×`. There is no new key, and the shortcuts dialog doesn't change.
- [x] Audition store spec, through its public interface, with its fake element resetting the rate to the default rate on a new source or a load, as Chrome does. It covers:
  - the default;
  - the setter's clamping, rounding and NaN;
  - applying at creation and mid-play, with pitch preservation on;
  - the audition, the range and the track;
  - surviving a new clip, a seek to a new window and the hand-over;
  - play speed and volume independent.
- [x] Review page spec: a play speed block like the volume's, across the Split, Track and Range views. It checks the control's place before volume, the slider's name and value text, the slider setting the play speed, the button resetting to 1.0, and the view's keys still working after the slider is used.
- [x] Checked by hand in Chrome (browser automation skill) with a sample loaded:
  - the audition, the range and a track at 0.5× and 2.0×, with the pitch kept;
  - a change mid-play with no restart;
  - a track over 10 min at 2.0× across a window hand-over, with the play speed and the playhead recorded.

  The numbers go in note 10's Chrome section.

- [x] Docs:
  - an Added line in the changelog;
  - a paragraph on the play speed in the audition store's header comment, beside the volume's;
  - the architecture doc's audition row and its element-only rule, which now covers the volume and the play speed and links note 10 and ADR 0004.
- [x] Stop: the user confirms the milestone in the browser.

## Comments

- 2026-11-22: the reset button's accessible name is `Reset play speed, now 1.5×` (it names the action and contains the visible text); its tooltip is `Reset play speed to 1.0×`. The ticket fixed no name.
- The reset button has a text label, so the review page spec's title-row position assertions moved by one and the Track view's button list gained it.
- DESIGN.md gained a "Play speed" subsection and updated sentences (finish-feature rule for a changed look), beyond the ticket's docs list.
- `sonarjs/no-floating-point-equality` forbids `toBe(1.3)`, so speeds off the binary grid are asserted with `toBeCloseTo(x, 10)`; the setter divides by the step and back by its inverse so 1.3 stays 1.3.
- Chrome hand check passed (numbers in note 10's "In Chrome"). One thing to settle at the milestone stop: at 1440 px the zoom panel is 875 px wide, and the new 134 px control makes the Track and Range view headings wrap onto two lines (row 28 → 56 px). The Split view heading stays on one line. Nothing is truncated. The volume's design avoided a visible readout for the same reason. Not changed: it is a look decision for the user.
- The user kept the layout as it is (wrap in windows under about 1500 px accepted, option 1) and said to continue, 2026-11-22; taken as the milestone confirmation.
- 2026-11-22, option 2 tried (user's choice): button `min-w-11 px-1.5`, slider `w-16`; the control went from 134 to 119 px. Measured at 1440 px: the Track and Range headings still wrap (38 and 54 px short, row 56 px); Split does not (36 px). At 1280 px Track wraps to 4 lines (112 px) and Range to 3 (84 px); at 1920 px none wrap. The narrowing is kept as a small gain. A real fix is a layout decision beyond this ticket and is put to the user.
