# 03: Drag a range on the whole-file view

**What to build:** pressing on the whole-file view and dragging left or right makes a range. The overlay (ink at about 10 %, 1 px edges, under the split lines) follows the pointer live, and stays after the drop. A press that moves less than 4 px, or a drag shorter than 1 s, is still today's click (select a split within 6 px, else move the zoom window). A drag that starts on a split's line makes a range too. A new drag replaces the range.

**Blocked by:** 01 (Concept note and glossary), 02 (Clip by start and length), which settles the 10 min limit.

**Status:** ready-for-agent

Spec: `.scratch/select-section-and-play/spec.md` (stories 1–12)

- [ ] The split store holds the range (start and end, or none): setting one holds it to the file's ends and to at most 10 min from where the press began, and refuses one under 1 s; `reset` clears it; a setting change keeps it. The 1 s and 10 min limits live in the split slice's config.
- [ ] A pointer composable on the whole-file view tells a click from a drag (4 px), captures the pointer so a drag past the canvas edge keeps working, reports the live range for the overlay and commits it on release.
- [ ] The whole-file view draws the overlay after the lands and before the split lines, live during the drag and after it.
- [ ] The loudness view's drag is unchanged.
- [ ] Specs: the split store's range rules; the drag composable's threshold, click versus drag, pointer capture and live range (prior art: the split drag spec).
- [ ] CHANGELOG line under Unreleased; AGENTS.md rows for the split store and the whole-file view.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or concept note each part rests on.
