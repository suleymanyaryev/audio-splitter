# 03: Step the playhead with the keys

**What to build:** In the Split view, `,` and `.` step the playhead back and forward 100 ms, or 1 s with Shift, and keep stepping while held. Home, and a new "Back to audition start" button (hint: Home), take it back to the audition's start. A step while playing jumps the sound and plays on; a step while paused or idle only moves the playhead. The Split view's frame becomes a slider for the playhead, so a screen reader hears where it is (spec: user stories 17–27, 43–45).

- The keys are matched by physical key (the keys where `,` and `.` sit on a US layout), so Shift and a Russian or Turkmen layout don't change them. They are page keys, per ADR 0002, with no Alt binding.
- A step is rounded to the millisecond and held to the audition's extent.
- Home goes to the audition's start even when the split handle has focus.
- Left/Right still move the split 10 ms (Shift: 100 ms); Delete/Backspace still delete it.
- The store gains a seek for the audition (held to the extent; while playing it sets the place in the held WAV) and a back-to-start. Ticket 04 uses the same seek.
- The playhead slider is focusable but not a Tab stop, as in the Track view. Its value is the playhead's time, to the whole second while playing and to the hundredth otherwise. The split handle stays the split's own slider.

**Blocked by:** 02 (Pause and resume the audition).

**Status:** ready-for-agent

- [ ] `.` / `,` step 100 ms, Shift 1 s, by physical key; a held key repeats
- [ ] A step never passes the audition's edges, at the file's start and end too
- [ ] A step while playing jumps the sound and keeps playing; while paused it only moves the playhead
- [ ] Home and "Back to audition start" go to the audition's start, also with the split handle focused
- [ ] Left/Right and Delete/Backspace behave as before
- [ ] The frame is a playhead slider with the right value and range, not a Tab stop
- [ ] Audition store spec, Split view spec and review page spec cover the above
- [ ] Shortcuts dialog rows for `,` / `.` (Shift) and Home; `CHANGELOG.md` line updated
