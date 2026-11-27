---
name: store-wiring
description: Where state and new code go, and how the stores connect. Use when adding a store or state to one, adding a slice or file, wiring two stores together, adding something that changes the user's edits or plays sound, or adding a long-running job, a Web Worker or a browser API.
---

The import rules are in AGENTS.md "Code layout" and enforced by `pnpm lint`; this is the judgement behind them. Read `docs/architecture.md` "The stores" before adding state.

## Placing state

- **Entity store**: state that more than one widget reads, about the file or the splits (`entities/split/model/split.ts`).
- **Widget-owned store**: state that belongs to one behaviour, which the page and other widgets only start or stop (`widgets/track-strip/model/export-tracks.ts`).
- A setting kept between visits stays in its store, which reads and writes `localStorage` through an `api/` module beside it (`widgets/split-zoom/api/saved-volume.ts`).
- A concept large enough to crowd its store becomes a plain composable in the store's `model/`, called once in the store's setup and kept private, so widgets still go through the store. It is fed refs and getters, so its spec feeds it plain refs (`entities/split/model/matches.ts`).
- A store changes its state only through actions, which widgets call. An action given out-of-range input refuses quietly and keeps its state; a slider's setting is held to the slider's range instead (`widgets/split-zoom/model/player.ts`).
- A tuned constant goes in its own `config/` file, so the store and the widgets import one value (`entities/split/config/range-limits.ts`).
- Pure maths goes in `lib/` with its own spec. A live preview and the store share one function, so the two agree (`entities/split/lib/range-between.ts`).

## Wiring stores together

- Two slices of one layer never import each other, so the page wires them. Wire a new cross-store need in the page too (`ReviewPage.vue`, which hands `split.open` its inputs on mount and resets `split` on unmount).
- Buttons enable on store getters and take their labels from store status, so a button never disagrees with the store (`canAddSplit`).
- A click on a list or strip item selects through the store, and the selected item carries `aria-current="true"`. A button inside an item stops the click (`@click.stop`), so it does only what it says (`TrackList.vue`).

## The user's edits

- A new `split` action that would drop the user's work goes through the discard guard, so it asks first like the others (`unlessItDiscards` in `entities/split/model/split.ts`).
- A change counts as an edit only when the value really changed, so retyping a name asks nothing later (`TrackNameField.vue`).
- A new kind of edit is an operation of the edit ledger, which keeps the count; an action reports it there and never writes the edits itself (`entities/split/model/edit-ledger.ts`).

## Sound

- There is one player (`widgets/split-zoom/model/player.ts`). Anything new that plays goes through it, and anything that should silence it calls `stop()`.
- New async work a user action starts drops a late result, as architecture.md "The stores" says. The player's `flush: 'sync'` watchers on the split store stop or pause the sound at once, before a stale clip can start.
- Work the player starts by itself (`fetchAhead`) keeps its own token and aborts its `AbortSignal` on release, so its ffmpeg call stops holding the queue.

## Jobs and browser APIs

- A long-running job is a store with a `status`, its counts, a `failure` and `dismiss`. A `UiDialog` opened from that status ignores Escape while the job runs, so a stray key cannot hide it (`export-tracks.ts` with `ExportDialog.vue`).
- Work that would freeze the page runs in a Web Worker behind a small client in `api/`. The client sends one request and terminates the worker with its answer, or early through an `AbortSignal`, so stale work stops using the CPU. The caller's spec swaps in a fake client that copies the request with `structuredClone`, because a worker refuses a Vue proxy, and runs the same function in-process (`entities/split/model/__tests__/fake-find-matches-client.ts`).
- A browser API the DOM lib lacks gets a minimal typed slice in the widget's `api/`, and an in-memory fake in `model/__tests__/` that copies Chrome's behaviour (`widgets/track-strip/api/export-folder.ts`).

## Specs

A store spec creates a fresh Pinia in `beforeEach`, builds its input from small helpers, and tests through the store's actions and getters (`entities/split/model/__tests__/split.spec.ts`).
