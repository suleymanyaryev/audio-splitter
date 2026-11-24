# 01: Gaps on request

**What to build:** a loaded source file opens as one track with no splits, on track 1 in the Track view, with the gaps of the built-in settings already shown on every view. Moving either setting, by slider or by dragging the threshold line, changes only the gaps shown. A "Find gaps (N)" button turns the shown gaps into splits, adding only where no split is yet, and asks nothing unless it would discard pending splits. The edit count runs from when the file opened, so "New file" asks only when hand-made work would be lost.

**Blocked by:** None (can start immediately)

**Status:** resolved

Spec: `.scratch/cutting-tool-base/spec.md` (stories 1–3, 6–22, 24 and 68; Implementation Decisions, "Split slice" and "Loudness-curve widget"). Default settings are ticket 03: until then the file opens at the built-in 18 dB under the median and 2 s.

- [x] Opening:
  - A freshly loaded source file shows one track and no splits.
  - Track 1 is selected in the Track view.
  - The gaps for the built-in settings show on the whole-file view, the loudness curve and the zoom panel's views.
- [x] Moving either slider, or dragging the threshold line on the loudness curve, changes the gaps shown and nothing else: splits, names, edits, pending splits, the selection and the view stay. No question is asked; the "Replace your edits?" question and its guard are gone.
- [x] Find gaps is in the loudness panel's title row. It adds a detected split at the middle of each inner gap that:
  - holds no split, and
  - has room: 1 s from every split, from the file's ends and from the other middles it adds.
    Lead-in and run-out gaps get none.
- [x] Its count:
  - The button shows how many splits a press would add, updated live as the sliders move.
  - The count is exactly what a press adds.
  - It is disabled at 0.
- [x] Find gaps keeps every existing split and name, and leaves the selection, the zoom window and the view where they are.
- [x] With pending splits in the selected track, Find gaps asks "Discard N pending splits?" (Apply first, Discard, Cancel) only when one of its splits would land inside that track. The room is checked again when the held action runs.
- [x] Edits:
  - They count from the file's opening.
  - The splits Find gaps adds are not edits; moving or deleting one is.
  - "New file" asks after a hand edit and not after Find gaps alone.
- [x] Docs:
  - `CHANGELOG.md` has the user-visible lines under Unreleased.
  - `docs/architecture.md` describes the review page's new opening call.
  - Concept note 04's "tune first, edit after" paragraph describes the preview and Find gaps.
  - The README's "What it does" and its "Not in v1" order line match.

## Comments

- Store names: `open` replaces `detect`; `gapSplitSeconds` is the list Find gaps would add (its length is the button's count) and `addGapSplits` is the press. The pure walk is `gapSplitTimes` in `lib/find-gaps.ts`, which replaces `splitsOf`; the 1 s room constants moved to `config/split-room.ts` so the store and that walk share them.
- A gap "holds a split" when a split's time is inside the gap, ends included.
- The replace guard, its spec and `ReplaceEditsDialog.vue` are deleted here, since knip fails on an unused file. Ticket 02 builds Clear splits' own confirmation from the same loss wording (`formatLoss`).
- Specs that needed splits now call `open` then `addGapSplits`; `ReviewPage.spec.ts` does it right after the page opens, through `mountPage` (`mountOpenedPage` is the page as a file opens it).
- The user's staged planning files (spec, tickets, `GLOSSARY.md`, v2 milestones) went into this commit, so the tree is clean.
