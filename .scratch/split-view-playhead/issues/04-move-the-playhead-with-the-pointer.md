# 04: Move the playhead with the pointer

**What to build:** In the Split view, a click anywhere off the split line moves the playhead there, and a drag moves it along. While the pointer is held, a playing audition pauses, and it plays on from where the pointer is let go. A paused or idle audition stays so. A press within reach of the split line still moves the split (spec: user stories 7–14).

- The time comes from the pointer, snapped to 10 ms as split drags already are, and held to the audition's extent: a click outside the 8 s lands on its nearest edge, and a drag past an edge parks there.
- Only the primary button acts. There is no double-click action and no mark in the Split view.
- A lost release (a move with no button held, or lost pointer capture) lets go as the Track view does.
- The store gains a grab and a drop for the audition: grab pauses a playing audition, and drop plays on only if it was playing and is still paused (a view switch or another sound may have taken over).
- The cursor shows a resize cursor over the split line as today.

**Blocked by:** 03 (Step the playhead with the keys), for the audition's seek and the playhead slider.

**Status:** ready-for-agent

- [ ] A click off the split line moves the playhead there, playing or not
- [ ] A drag moves the playhead along and parks it at the audition's edges
- [ ] A press near the split line still moves the split, and never moves the playhead
- [ ] Holding the pointer pauses a playing audition; letting go plays on from the drop
- [ ] A paused or idle audition is not started by a click or drag
- [ ] A lost release lets go
- [ ] Audition store spec and Split view spec cover the above
- [ ] Shortcuts dialog rows for click and drag; `CHANGELOG.md` line updated
