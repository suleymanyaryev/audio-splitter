---
name: store-wiring
description: Where state and new code go, and how the stores connect. Use when adding a store or state to one, adding a slice or file, wiring two stores together, or adding something that changes the user's edits or plays sound.
---

The import rules are in AGENTS.md "Code layout" and enforced by `pnpm lint`; this is the judgement behind them. The stores, what each holds and who calls whom are in `docs/architecture.md` "The stores": read it before adding state.

## Placing state

- **Entity store** (`entities/source-file`, `entities/split`): state that more than one widget reads, about the file or the splits.
- **Widget-owned store** (`widgets/split-zoom/model/audition.ts`, `widgets/track-strip/model/export-tracks.ts`): state that belongs to one behaviour, which the page and other widgets only start or stop.
- Pinia setup stores, in memory only. The exceptions are `widgets/split-zoom/api/saved-volume.ts` and the theme (`shared/lib/theme/theme.ts`): plain module state, because the kit and the canvases in `shared` read it and a store would belong to a slice above them.
- The store changes its state only through actions; widgets call them, never assign. An action given out-of-range input refuses quietly and keeps the state it had.
- A tuned constant goes in its own `config/` file, imported by the store and the widgets (`entities/split/config/range-limits.ts`).
- Pure maths goes in `lib/` with its own spec. When a live preview and the store compute the same thing, they share one function, so the two agree (`entities/split/lib/range-between.ts`).

## Wiring stores together

- Two slices of one layer never import each other, so the page wires them: `ReviewPage.vue` hands the loudness curve to `split.detect` and the track name prefix to `split.setTrackNamePrefix` on mount, and resets `split` on unmount. Wire a new cross-store need the same way, in the page.
- Buttons enable on store getters (`canAddSplit`) and take their labels from store status.
- A click on a list or strip item selects through the store, and the selected item carries `aria-current="true"`. A button inside an item stops the click (`@click.stop`) so it does only what it says. Reference: `TrackList.vue`.

## The user's edits

- Anything that would drop the user's work asks first: replacing edits goes through the replace guard (`widgets/loudness-curve/lib/use-replace-guard.ts`), and a `split` action that would drop pending splits goes through `unlessItDiscards` in `entities/split/model/split.ts`.
- A change counts as an edit only when the value really changed (`TrackNameField.vue`).

## Sound

There is one player, `widgets/split-zoom/model/audition.ts`. Anything new that plays goes through it, and anything that should silence it calls `stop()`.

An async result can arrive after the user has moved on. Every press takes a number and a result for an older number is dropped; `flush: 'sync'` watchers on the split store stop the player at once. Use the same guard for any new async work a user action starts. Work the player starts by itself (`fetchAhead`) keeps its own token and aborts its `AbortSignal` on release, so its ffmpeg call stops holding the queue.

## Jobs and browser APIs

- A long-running job is a store with a `status` (idle, running, done, cancelled, failed), its counts, a `failure` and `dismiss`. A `UiDialog` opened from that status ignores Escape while the job runs (`export-tracks.ts` with `ExportDialog.vue`).
- A browser API the DOM lib lacks gets a minimal typed slice in the widget's `api/` (`api/export-folder.ts`). Its in-memory fake lives in `model/__tests__/` and copies Chrome's behaviour (`fake-folder.ts`).

## Specs

A store spec creates a fresh Pinia in `beforeEach` (`setActivePinia(createPinia())`), builds its input from small helpers (`curveOf` in `entities/split/model/__tests__/split.spec.ts`), and tests through the store's actions and getters.
