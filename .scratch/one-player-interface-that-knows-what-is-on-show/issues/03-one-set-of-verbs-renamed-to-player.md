# 03: One set of verbs, renamed to `player`

**What to build:** the store becomes `player` (`usePlayerStore`, Pinia id `player`, its own file in the split-zoom widget's model segment). It reads the subject on show from the split store: the audition of the selected split in the Split view, the selected track in the Track view, the range in the Range view, or nothing. Its interface is one set of verbs for that subject:

| Member                                                                           | What it does                                                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `status`, `isActive`, `failure`                                                  | of the subject on show; the failure is worded "split", "track" or "range"                            |
| `extent`                                                                         | the playhead's span: the audition's 8 s, the track's ends or the range; null when nothing is on show |
| `playheadSeconds()`                                                              | null when nothing is on show                                                                         |
| `toggle()`, `seek(seconds)`, `backToStart()`, `grabPlayhead()`, `dropPlayhead()` | the verbs                                                                                            |
| `stop()`, volume and play speed                                                  | as today                                                                                             |

Every caller moves over. The page drops its stretch computation, its `toggleStretch`, its `backToStart` branch and one of its two play-button blocks; the label text per view stays in the page. The Split view and the Track view read `extent` for their slider bounds, and keep their own canvas span for drawing. `carryOver` is ticket 06, so the three "wasOn" sequences keep their shape for now, calling the new verbs.

The player spec is regrouped as one suite per verb, run over the three subjects with `describe.each`, with subject-only suites kept apart.

**Blocked by:** 02.

Status: resolved

Spec: `.scratch/one-player-interface-that-knows-what-is-on-show/spec.md` (Implementation Decisions: name, the subject on show, the public interface, the page, the views; Testing Decisions).

- [x] The store and its file are named `player`; no `useAuditionStore` remains.
- [x] `auditionExtent`, `stretchStatus`, `stretchPlayheadSeconds`, `toggleStretch`, `seekStretch`, `backToStretchStart`, `seekAudition`, `backToAuditionStart`, `grabAuditionPlayhead` and `dropAuditionPlayhead` leave the interface.
- [x] With nothing on show, every verb does nothing and `extent` and `playheadSeconds()` are null.
- [x] The page plays and goes back to start with one call each, and has one play-button block whose label and icon follow `status` and the view.
- [x] No view or page builds a stretch to pass to the player.
- [x] The player spec has one suite per verb (toggle, pausing, the resting place, moving the playhead, back to start, grab and drop, failures) run for the audition, the track and the range; moving the split, the long track's windows and the resets stay their own suites; volume and play speed are unchanged.
- [x] A mirrored case covered by a per-verb suite is removed; no case is in two suites.
- [x] The view and page specs change only the store's and the verbs' names.
- [x] `docs/architecture.md` (stores table, diagram, Player section), the store-wiring skill and the ffmpeg-session skill name the player's file.
- [x] No changelog line.

## Comments

- `status` stays a writable computed (the view specs assign it): a write takes the status for what is on show, and `idle` only ends it when that owns it. It reads idle while the other owner holds the status or nothing is on show.
- The view and page specs changed in names and in the stretch argument the verbs no longer take (`toggle()`, `seek(seconds)`, `playheadSeconds()`).
- `SplitZoom` draws the audition's edges only with a split selected, besides `player.extent` being non-null: a spec mounts it on a Track view with no split.
- `dropPlayhead` plays on only for the owner that was grabbed (`grabbedOwner`), so a range drawn and played during an audition drag is not resumed by the drop. The old audition-only drop gave this for free; one player spec case covers it.
- The player spec went from 191 to 151 declarations (240 tests) by merging the audition, range and track mirrors into `describe.each` suites; the removed mirrors are covered by the merged cases.
- The page's view-change stop still lives in the page (ticket 04).
