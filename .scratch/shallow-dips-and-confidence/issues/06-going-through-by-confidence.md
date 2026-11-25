# 06: Going through by confidence

**What to build:** `}` selects the next split that still has a confidence, least sure first, and `{` the one before, from anywhere on the review screen, opening the Split view on it. `K` in the Split view marks the selected split as checked: its confidence goes and it leaves the queue, which counts as an edit.

**Blocked by:** 05.

**Status:** resolved

Spec: user stories 34 to 41; Implementation Decisions "The split store" (`markChecked`, the confidence order) and "Split lines, the track list and the keys" (the keys, the shortcuts dialog).

- [x] The order: splits with a confidence, least deep first, ties by time. From no selection or a split with none, `}` goes to the first and `{` to the last. With no split in the order, the keys do nothing.
- [x] `{` and `}` are matched by the physical bracket keys with Shift, as page keys; `[` and `]` keep working without Shift.
- [x] `K` is a Split view key, active while the selected split has a confidence. A checked split counts as one edit, in its own set beside the moved, added and renamed ones.
- [x] Clear splits and New file clear the checked set; the questions before them count it.
- [x] The shortcuts dialog lists `{ / }` and `K` in the Split view's section.
- [x] Store specs: the order, its ties and both ends; `markChecked` clears the confidence and counts one edit. Specs beside step-of-key cover Shift with the brackets; the shortcuts dialog spec covers the entries.
- [x] In the browser: on f16 at a lower depth, `}` walks the doubtful splits before the likely ones, and `K` takes each out of the walk.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- **A sure split is in the walk.** "Still has a confidence" is read as the GLOSSARY has it: every detected split carries one until it is moved or checked, sure ones included, so they come last (deepest). Only a manual, moved or checked split is out of it.
- **The order has no array sort.** `entities/split/lib/confidence-queue.ts` inserts each split after the last no deeper one, so ties keep time order. `unicorn/no-array-sort` forbids `sort`, and `toSorted` is not in the specs' TS lib (ES2022).
- **`{` and `}` are the page's keys, in `ReviewPage.vue`**, so they work from any panel and open the Split view (`selectSplit` does). `confidenceStepOfKey` (beside `stepOfKey`) matches the physical bracket keys with Shift, ignores repeats, and leaves a key that types `?` alone: on Dvorak Shift+BracketLeft types `?`, which belongs to the shortcuts dialog (an existing spec says so). The old ReviewPage spec "with Shift held leaves `]` alone" is now "…selects a split instead", since Shift+`]` is `}`.
- **`K` lives in `SplitZoom.vue`**, matched by `event.code` (`KeyK`, no Shift), so it works on any layout. It returns false for a split with no confidence, leaving the key to the browser, and a held key marks once.
- **`markChecked`** clears the confidence and adds the id to `checkedIds`, which `editCount` counts, `clearEdits` empties (Clear splits, New file) and `removeSplit` takes the id out of. A checked split that is then moved counts two edits (checked and moved); that is two things the user did.
- **At the ends of the walk nothing happens**, as with `[` and `]` at the ends of the splits. From a split that has left the queue (just checked), `}` goes to the first and `{` to the last, as the ticket says for a split with none.
- **In the browser** (`sample1.m4a`, depth 3 dB, Find splits): `Shift+]` walked splits 1, 44, 23, 65, doubtful ones first and not in time order; `K` on 65 took its "doubtful" band from the track list (32 bands to 31); `Shift+[` then went to 40, the last of the queue. No f16 file is among the samples here.
- **Code review:** not run on this ticket. Checkpoint tier run: `pnpm test:changed` (1389 passed), `pnpm lint:changed`, `pnpm typecheck`.
