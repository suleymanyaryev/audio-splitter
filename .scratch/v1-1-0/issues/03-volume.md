# 03: Volume

**What to build:** at the end of the zoom panel's title row, in all three views, a mute icon button and a volume slider set how loud the user hears the audition, the range and the track. The slider runs from −40 dB to 0 dB in 1 dB steps and reads its level in decibels; mute silences at once and unmuting returns to the same level. It applies to sound already playing, never reaches an exported file, and is remembered across a reload (0 dB and unmuted the first time).

**Blocked by:** 01 (Icon buttons with tooltips)

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 1–9)

- [ ] **Stop 1 first**: write `docs/concepts/09-volume-is-gain.md` (linear amplitude and gain, decibels, why the slider steps in dB, a worked number from `samples/sample1.m4a`, where it lives in the code) and have the user confirm it before any code.
- [ ] The player store holds the level in dB and the mute flag, applies the linear gain to the audio element when it is created and on every change, and saves both to `localStorage`; a blocked or empty storage gives the defaults.
- [ ] The review page shows the mute button ("Mute" / "Unmute" tooltip) and the slider (accessible name "Volume", value text in dB) at the end of every title row.
- [ ] Specs (audition store with a fake `Audio`): the gain on a new element and on a playing one; mute and unmute; the saved values read back; blocked storage falling back. Review page: the control in each view.
- [ ] Checked by hand in Chrome: the volume changed mid-play in each view.
- [ ] DESIGN.md gains the volume control; `docs/architecture.md` follows; CHANGELOG line under Unreleased (Added).
