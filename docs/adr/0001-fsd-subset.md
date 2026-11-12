# A subset of Feature-Sliced Design

The code follows Feature-Sliced Design, cut down for an app with two screens and one pipeline, because the project prefers simple, readable code over abstraction for a possible future. Three departures are deliberate. Don't "fix" them unless the app outgrows them.

- **No `features` layer.** The layers are `app`, `pages`, `widgets`, `entities`, `shared`. Adding, moving and deleting a split are operations of the split entity's model, shared by the three widgets that edit splits. A `features` slice appears only when an action needs its own UI that a second widget reuses.
- **No `index.ts` public APIs.** Code imports the file it needs (`@/entities/split/model/splits.ts`). Most slices have one consumer, and a barrel per slice would be ceremony. `eslint-plugin-boundaries` enforces layer direction and slice isolation, not entry points.
- **No router.** All state is in memory and lost on reload, so a `/review` URL could only open a page with no source file. `App.vue` switches between the load and review pages on state.

Decided in `.scratch/audio-splitter/issues/05-code-layout.md`.
