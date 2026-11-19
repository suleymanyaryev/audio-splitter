# 09: Review follow-ups (rule breaches and smells)

**What to do:** the code review of tickets 01–08 (`git diff e9e7542...a1a0f77`) found the breaches of documented rules and the possible smells below. Its bugs were fixed in the same pass; this ticket holds what was left: the rule breaches to fix, the smells to decide on one by one (each is a judgement call: fix, or leave with a reason), and one open decision.

**Blocked by:** none

**Status:** needs-triage

## Rule breaches

- [ ] **Multi-line `//` comments.** AGENTS.md, Lint: "`//` for one-liners, multi-line `/* ... */` blocks without `*` line prefixes". `eslint.config.ts` has no rule for it, so lint passes.
  - `src/widgets/split-zoom/ui/TrackView.vue`, in the `seconds:` callback of `useRangePress` ("Without a track there is nothing to point at … Range view's times are, so a click and a drag land on the same grid."), copied from `RangeView.vue`.
  - `src/pages/review/ui/ReviewPage.vue:92-93`, a two-line `//` comment this diff edited.
- [ ] **Over-long lines in the top comment of `src/entities/split/model/split.ts`** ("…only deleting that split moves the key). The zoom window is", "…which never follows the move. A split", "…Every change of a setting replaces all splits and all names."): re-wrap to the block's width.
- [ ] **AGENTS.md is out of date.** Its `src/widgets/split-zoom/` line still reads "The zoom panel's two views, `SplitZoom` and `RangeView`"; there are three now, with `TrackView`. AGENTS.md says the slice list changes only when a slice is added, removed or renamed, so it may be enough to drop the count ("The zoom panel's views…") and not name every view.
- [ ] **Glossary entries the code cites are not committed.** Code comments cite GLOSSARY.md for "Selected track", "Track view" and "Removing a track", which exist only in the uncommitted `GLOSSARY.md` change. Commit that change. Its "Playhead" entry also still says "in the zoom view during an audition, and in the Range view always", without the Track view.

## Possible smells (judgement calls)

- [ ] **Duplicated Code / Data Clumps: a track's end.** `startSeconds + lengthSeconds` is worked out in four places: `src/widgets/split-zoom/lib/track-extent.ts`, `src/widgets/split-zoom/lib/track-title.ts`, `shownOutline` in `src/widgets/source-waveform/ui/SourceWaveform.vue`, and the selected-track watch key in `src/widgets/split-zoom/model/audition.ts`. `tracks` in `split.ts` already has `endSeconds` locally. Adding `endSeconds` to `Track` would make `trackExtent` nearly nothing.
- [ ] **Duplicated Code: `TrackView.vue` and `RangeView.vue`.** Near-identical parts:
  - the bars, lands, split lines, snapped playhead and frame in `draw()`;
  - `onKeydown` (only Enter and the step function differ);
  - the failure `<p>`;
  - the `role="slider"` frame.

  A shared stretch-canvas draw and key handler in `split-zoom/lib/` would remove them. Weigh this against the learning-first rule that each view stays readable on its own.
- [ ] **Data Clumps / Middle Man: the stretch handed in on every call.** `toggleStretch`, `seekStretch`, `backToStretchStart`, `dropPlayhead` and `stretchPlayheadSeconds` all take the stretch. That gives about 12 guards of the form `if (x !== null) audition.f(x, …)` across `ReviewPage`, `RangeView` and `TrackView`. `ReviewPage`'s `stretch` computed also repeats `TrackView`'s `extent`. The player already reads `splitStore.view` (`stretchSubject`) and watches the range and the selected track, so one `currentStretch` computed inside it would remove the clump and the guards. This is a design change to `docs/concepts/08-listening-to-a-range.md`'s "the caller hands in the stretch", so it needs a decision first.
- [ ] **Three ways to ask "is this selected?"** `TrackList.vue` has a local `isSplitSelected`, and `TrackStrip.vue` inlines `split.selectedSplit?.id === …`. The split store offers `isTrackSelected` but no split counterpart. An `isSplitSelected(id)` in the store would make them one.

## Open decision

- [ ] **A view switch and the export pause the player and keep its WAV.**
  - Ticket 04 says: "Playback stops and the held audio is released when … on a view switch, on the export and on unmount."
  - `ReviewPage` calls `audition.stop()`, which pauses and keeps the playing window: up to about 106 MB for a long `.opus` track, held while the export's cuts run.
  - `audition.spec.ts` asserts the keeping on purpose, since it lets playing again resume at once.
  - The window ahead is now let go of on `stop()` (fixed in the review pass), so at most one window stays.
  - Either `stop()` releases the held window too, or ticket 04's line changes to match the code.

## Fixed in the review pass (for the record)

- `sourceFile.clip` takes an `AbortSignal`. When the player forgets the window ahead (a seek outside the held window, a new stretch, `stop()`), it now aborts that window's decode: a queued one never runs, and a running one is interrupted. A seek's window or the export's cuts no longer wait behind it.
- `stop()` lets go of a window ahead that was already decoded. Playing on decodes it again, 30 s before the window ends.
- A split added at the mark in the Range view no longer stops the range when it shortens the selected track. The selected-track watch leaves the Range view's stretch alone.
- `selectTrack` refuses a stale `Track` (its start split is gone), or any track before detection, as the store-wiring skill asks of an action given out-of-range input.
- A track block in the strip names its button, not its `<li>`, so a block too narrow for text is a named button.
- The Track view's `aria-valuenow`/`aria-valuetext` follow the sound while the track plays, updated once a second.
- `removeTrack`'s comment now says where a selected split lands. The old comment said "falls back once", but a selected end split that was the last split falls back twice.
