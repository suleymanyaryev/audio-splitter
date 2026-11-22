# 03: Step the playhead with the keys

**What to build:** In the Split view, `,` and `.` step the playhead back and forward 100 ms, or 1 s with Shift, and keep stepping while held. Home, and a new "Back to audition start" button (hint: Home), take it back to the audition's start. A step while playing jumps the sound and plays on; a step while paused or idle only moves the playhead. The Split view's frame becomes a slider for the playhead, so a screen reader hears where it is (spec: user stories 17–27, 43–45).

- The keys are matched by physical key (the keys where `,` and `.` sit on a US layout), so Shift and a Russian or Turkmen layout don't change them. They are page keys, per ADR 0002, with no Alt binding.
- A step is rounded to the millisecond and held to the audition's extent.
- Home goes to the audition's start even when the split handle has focus.
- Left/Right still move the split 10 ms (Shift: 100 ms); Delete/Backspace still delete it.
- The store gains a seek for the audition (held to the extent; while playing it sets the place in the held WAV) and a back-to-start. Ticket 04 uses the same seek.
- The playhead slider is focusable but not a Tab stop, as in the Track view. Its value is the playhead's time, to the whole second while playing and to the hundredth otherwise. The split handle stays the split's own slider.

**Blocked by:** 02 (Pause and resume the audition).

**Status:** resolved

- [x] `.` / `,` step 100 ms, Shift 1 s, by physical key; a held key repeats
- [x] A step never passes the audition's edges, at the file's start and end too
- [x] A step while playing jumps the sound and keeps playing; while paused it only moves the playhead
- [x] Home and "Back to audition start" go to the audition's start, also with the split handle focused
- [x] Left/Right and Delete/Backspace behave as before
- [x] The frame is a playhead slider with the right value and range, not a Tab stop
- [x] Audition store spec, Split view spec and review page spec cover the above
- [x] Shortcuts dialog rows for `,` / `.` (Shift) and Home; `CHANGELOG.md` line updated

## Comments

- The slider is a sibling of the split handle, not its parent (a slider's children are skipped by a screen reader). Its `role` and `tabindex` are dropped while no split is selected, since a slider with no value is invalid.
- Home matches `event.key` like the Track and Range views (a numpad Home works); `,` and `.` match `event.code`. Home and the step keys are left to the browser while no split is selected.
- Stepping forward to the extent's very end while playing sets `currentTime` to the clip's end, which ends the audition and puts the playhead back at the start. The Track view behaves the same, so it is left as is.
- `auditionExtent` is exported from the store so the view can set the slider's range. Moving it to `lib/` is a possible later tidy.
- Left alone from the code-review: the slider/step code repeats TrackView and RangeView (a shared composable is a refactor candidate, no documented rule asks for it) and `aria-valuenow` while playing is floored, as in those views.
- Fixed from the code-review: the changelog line split into Added and Changed bullets, a ragged comment, a leaky test cleanup moved into `afterEach`, and Home matched by key.
- Checks: `pnpm test` -> pass (1736, before the fixes); after the fixes `pnpm test:changed -> pass` (464), `pnpm lint:changed -> pass`, `pnpm typecheck -> pass`.
