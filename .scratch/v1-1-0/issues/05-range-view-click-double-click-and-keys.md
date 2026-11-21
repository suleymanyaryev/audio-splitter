# 05: Range view: click, double-click and keys

**What to build:** in the Range view a single click places the mark wherever it lands, even next to a split line, and never leaves the view. A double-click moves the playhead there, or, within 6 px of a split line, selects that split and opens the Split view. A press within 6 px of the playhead still drags it. Left and Right move the playhead 1 s, with Shift 10 s, as in the Track view; the mark has no keys. Enter adds a split at the mark as today, and Shift+Enter adds one where the playhead is, while the range plays, without stopping the sound or leaving the view.

**Blocked by:** 02 (Shortcuts dialog)

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 58–69)

- [ ] Prefactor: the press helper takes a double-click: within 6 px of a split line it selects that split, elsewhere it moves the playhead. A single press no longer hits split lines: playhead drag, else the mark.
- [ ] The split store adds a split at a given time for the Range view: on the 10 ms grid, refused within 1 s of a split or the file's ends, without selecting it; a held key adds one only.
- [ ] The Range view's keys: Left/Right 1 s, Shift 10 s on the playhead; Space, Home and Enter as today; Shift+Enter at the playhead; auto-repeat ignored for Space, Enter and Shift+Enter.
- [ ] The Range view is a slider on the playhead (accessible name "Playhead in the range", value text in hundredths).
- [ ] The shortcuts dialog's Range view section follows.
- [ ] Specs: the press helper's order and double-click; the split store's add at a time; the Range view's keys and slider ARIA.
- [ ] Concept note 08's Range view description and `docs/architecture.md` follow; CHANGELOG lines under Unreleased (Changed, Added).
