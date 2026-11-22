# 02: Play speed, heard in every view

**What to build:** a play speed slider just before volume in the zoom panel's title row, 0.5× to 2.0× in 0.1 steps, with a button on its left that shows the play speed (`1.5×`) and resets it to 1.0. The player plays at the play speed with the pitch kept, in the audition, the range and the selected track. A change takes effect at once while playing, and the play speed holds across pauses, seeks and the window hand-over of a long track. It isn't saved yet: a reload starts at 1.0.

**Blocked by:** 01 (the note must be confirmed before any code)

**Status:** blocked

Spec: `.scratch/play-speed-control/spec.md` (stories 1–23 and 28–35; Implementation Decisions, "Tickets 02 and 03"; Testing Decisions)

- [ ] The audition store holds the play speed beside the volume, with its limits in the player's configuration: 0.5–2.0, step 0.1, default 1.0. Its setter clamps, rounds to the grid and ignores a value that isn't a number.
- [ ] The one element plays at the play speed with pitch preservation on, from when it is made and as soon as the play speed changes.
- [ ] The play speed survives a new source: a new clip, releasing the held one, a seek outside the held window, the window hand-over. The element's default rate is set as well as its current rate (ADR 0004).
- [ ] A play speed control sits just before the volume control in all three views' title rows. It has a reset button showing the play speed (U+00D7), always enabled, and a compact slider named "Play speed" with the value text `1.5×`. There is no new key, and the shortcuts dialog doesn't change.
- [ ] Audition store spec, through its public interface, with its fake element resetting the rate to the default rate on a new source or a load, as Chrome does. It covers:
  - the default;
  - the setter's clamping, rounding and NaN;
  - applying at creation and mid-play, with pitch preservation on;
  - the audition, the range and the track;
  - surviving a new clip, a seek to a new window and the hand-over;
  - play speed and volume independent.
- [ ] Review page spec: a play speed block like the volume's, across the Split, Track and Range views. It checks the control's place before volume, the slider's name and value text, the slider setting the play speed, the button resetting to 1.0, and the view's keys still working after the slider is used.
- [ ] Checked by hand in Chrome (browser automation skill) with a sample loaded:
  - the audition, the range and a track at 0.5× and 2.0×, with the pitch kept;
  - a change mid-play with no restart;
  - a track over 10 min at 2.0× across a window hand-over, with the play speed and the playhead recorded.

  The numbers go in note 10's Chrome section.
- [ ] Docs:
  - an Added line in the changelog;
  - a paragraph on the play speed in the audition store's header comment, beside the volume's;
  - the architecture doc's audition row and its element-only rule, which now covers the volume and the play speed and links note 10 and ADR 0004.
- [ ] Stop: the user confirms the milestone in the browser.

## Comments
