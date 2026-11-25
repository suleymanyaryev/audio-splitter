# 06: Going through by confidence

**What to build:** `}` selects the next split that still has a confidence, least sure first, and `{` the one before, from anywhere on the review screen, opening the Split view on it. `K` in the Split view marks the selected split as checked: its confidence goes and it leaves the queue, which counts as an edit.

**Blocked by:** 05.

**Status:** ready-for-agent

Spec: user stories 34 to 41; Implementation Decisions "The split store" (`markChecked`, the confidence order) and "Split lines, the track list and the keys" (the keys, the shortcuts dialog).

- [ ] The order: splits with a confidence, least deep first, ties by time. From no selection or a split with none, `}` goes to the first and `{` to the last. With no split in the order, the keys do nothing.
- [ ] `{` and `}` are matched by the physical bracket keys with Shift, as page keys; `[` and `]` keep working without Shift.
- [ ] `K` is a Split view key, active while the selected split has a confidence. A checked split counts as one edit, in its own set beside the moved, added and renamed ones.
- [ ] Clear splits and New file clear the checked set; the questions before them count it.
- [ ] The shortcuts dialog lists `{ / }` and `K` in the Split view's section.
- [ ] Store specs: the order, its ties and both ends; `markChecked` clears the confidence and counts one edit. Specs beside step-of-key cover Shift with the brackets; the shortcuts dialog spec covers the entries.
- [ ] In the browser: on f16 at a lower depth, `}` walks the doubtful splits before the likely ones, and `K` takes each out of the walk.
- [ ] `CHANGELOG.md` gains its line under Unreleased.
