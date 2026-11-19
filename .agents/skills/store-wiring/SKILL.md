---
name: store-wiring
description: Where state and new code go, and how the stores connect. Use when adding a store or state to one, adding a slice or file, wiring two stores together, or adding something that changes the user's edits or plays sound.
---

The import rules are in AGENTS.md "Code layout" and enforced by `pnpm lint`; this is the judgement behind them. The four stores, what each holds and who calls whom are in `docs/architecture.md` "The stores": read it before adding state.

## Placing state

- **Entity store** (`entities/source-file`, `entities/split`): state that more than one widget reads, about the file or the splits.
- **Widget-owned store** (`widgets/split-zoom/model/audition.ts`, `widgets/track-strip/model/export-tracks.ts`): state that belongs to one behaviour, which the page and other widgets only start or stop.
- Pinia setup stores, in memory only.
- The store owns its state and changes it only through actions. Widgets call `selectSplit`, `moveZoomTo` and `setRange`, never assign. An action given out-of-range input refuses quietly and keeps the state it had (an unknown id, a range under 1 s, `addSplit` with no room).
- Put a tuned constant in its own `config/` file, imported by the store and the widgets (`entities/split/config/range-limits.ts`).
- Put pure maths in `lib/` with its own spec, and have the store call it. When a live preview and the store compute the same thing, they share one function, so the two agree: `entities/split/lib/range-between.ts` serves both the waveform's drag overlay and `setRange`.

## Wiring stores together

- Two slices of one layer never import each other, so `split` can't read `source-file`. The page wires them: `ReviewPage.vue` hands the loudness curve to `split.detect` on mount and resets `split` on unmount. Wire a new cross-store need the same way, in the page, not in either store.
- `App.vue` switches pages on the `source-file` store's status; there is no router.
- Buttons enable on store getters (`canAddSplit`, `canAddSplitAtMark`) and take their labels from store status.
- Selection views (`TrackList.vue`, `TrackStrip.vue`): a click calls `split.selectTrack`, and the selected item carries `aria-current="true"`. The strip's split items and the list's split rows do the same with `split.selectSplit`; a button inside a row stops the click (`@click.stop`) so it does only what it says.

## The user's edits

- `split.editCount` counts changes since the last detection. Anything that would replace the user's edits goes through the replace guard: `widgets/loudness-curve/lib/use-replace-guard.ts` with `ReplaceEditsDialog.vue`, and "New file" in `App.vue`. The guard holds the change back and asks; "Replace" applies it. `entities/split/lib/format-edits.ts` words the count.
- A change counts as an edit only when the value really changed: `TrackNameField.vue` saves nothing for an unchanged name.

## Sound

There is one player, `widgets/split-zoom/model/audition.ts`, with one hidden `<audio>`. Its two modes (the audition clip and a stretch: the range or the selected track) stop each other. Anything new that plays goes through it. Anything that should silence it calls `stop()`: the page does so on a view change, before the export and on unmount.

An async result can arrive after the user has moved on. The audition guards against this: every press takes a number, a result for an older number is dropped, and `flush: 'sync'` watchers on the split store stop the player at once. Use the same guard for any new async work started by a user action. Work the player starts by itself, such as the window decoded ahead of a long track (`fetchAhead`), is not a press: it keeps its own token, which releasing the held windows forgets, so what arrives late is dropped.

## Jobs and browser APIs

- A long-running job is a store with a `status` (idle, running, done, cancelled, failed), its counts, a `failure` and `dismiss`. A `UiDialog` opened from that status ignores Escape while the job runs (`export-tracks.ts` with `ExportDialog.vue`).
- A browser API the DOM lib lacks gets a minimal typed slice in the widget's `api/` (`api/export-folder.ts`). Its in-memory fake lives in `model/__tests__/` and copies Chrome's behaviour (`fake-folder.ts`).

## Specs

A store spec creates a fresh Pinia in `beforeEach` (`setActivePinia(createPinia())`), builds its input from small helpers (`entities/split/model/__tests__/split.spec.ts`'s `curveOf`), and tests through the store's actions and getters.
