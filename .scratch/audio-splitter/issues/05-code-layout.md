# Code layout

Type: grilling
Status: resolved

## Question

The user wants Feature-Sliced Design, Reka UI and Tailwind, and also wants no abstraction that exists only for a possible future. Full FSD has six layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`); this app has two screens and one pipeline. Which subset of FSD fits, and where does each kind of code live?

Decide:

- Which layers exist from the first milestone, and which are added only when a second consumer appears.
- The slices: what is a page, a widget, a feature and an entity here (load screen, review screen, waveform, loudness curve, split list, export; source file, split, track).
- Where the hand-written signal-processing modules live, given that AGENTS.md requires worker entries to stay thin and analysis logic to sit in plain modules that specs import directly.
- Where the ffmpeg.wasm wrapper lives.
- Whether `vue-router` and `pinia`, already installed, earn their place: two screens could be routes or one component switching on state; shared state could be a store or plain refs.
- How Tailwind and Reka UI are added (Tailwind version and Vite integration, class sorting, any lint or Prettier change, which needs the user's explicit approval per AGENTS.md).
- Whether FSD import rules are enforced by a lint rule or by convention.

## Answer

Resolved 2026-11-13, grilled with the user.

**Layers.** `app`, `pages`, `widgets`, `entities`, `shared`; no `features` layer. Adding, moving and deleting a split are operations of the split entity's model, not separate features; a `features` slice appears only when an action needs its own UI that a second widget reuses. The departures from full FSD are recorded in [ADR 0001](../../../docs/adr/0001-fsd-subset.md).

**Slices.**

- `pages/load`: file picker and load progress, page-local UI.
- `pages/review`: lays out the five panels.
- `widgets/`: `source-waveform`, `loudness-curve`, `split-zoom`, `split-list`, `track-strip`.
- `entities/source-file`: the loaded `File`, its format and duration, and the analysis results (loudness curve, peaks); replaced on "New file".
- `entities/split`: the splits, each split's track name, the two detection settings (silence threshold, minimum gap length), and the tracks derived from them. There is no `track` entity: a track has no state of its own (see **Track name** in `GLOSSARY.md`).

**Conventions.** Slice folders kebab-case, `.vue` files PascalCase; segments `ui`, `model`, `lib`, `api`, `config`, created only when they hold a file. No `index.ts` public APIs: import the file itself. Cross-slice imports use `@/`, imports inside a slice are relative.

**Signal code.** Domain-free math (downmix, downsample, RMS, dB, min/max peaks) in `shared/lib/audio/`, one small file per idea with its spec beside it. Gap finding speaks the domain, so it lives in `entities/split/lib/find-gaps.ts`. The analysis worker entry is `entities/source-file/api/analysis.worker.ts` and only routes messages to plain modules. What the worker keeps and sends is [Decode path and hand-written steps](07-decode-path-and-hand-written-steps.md).

**ffmpeg.wasm.** Generic machinery in `shared/api/ffmpeg/`: load the pinned self-hosted core, mount the source file with WORKERFS, a timeout on every call, a fresh worker about every 20 calls. The two command shapes live in `entities/source-file/api/` (`decode-slice.ts`, `cut-track.ts`); they take numbers, not splits, so `source-file` never imports `split`. The export loop lives in `widgets/track-strip/model/`, the only widget with an Export button; delivery and filenames are [Export delivery and filenames](08-export-delivery-and-filenames.md).

**State and routing.** `vue-router` and `src/router/` are removed; `App.vue` switches between the two pages on whether a source file is loaded (a route would only add a broken deep link, since state dies on reload). Pinia stays, one setup store (`defineStore('split', () => { … })`) per entity: DevTools shows state changes, and specs reset state with `setActivePinia(createPinia())`.

**Tailwind and Reka UI.** `tailwindcss` 4 through `@tailwindcss/vite`, CSS-first config, one CSS entry in `src/app/styles/`. `prettier-plugin-tailwindcss` sorts classes (lint-policy change approved by the user); no other Tailwind lint rule. `reka-ui` 2. Versions checked 2026-11-13: `tailwindcss` 4.3.5, `reka-ui` 2.11.0, `prettier-plugin-tailwindcss` 0.8.1.

**`shared/ui` from day one** (user's call: the kit is the backbone of the UI): `Button` (primary, secondary, danger), `IconButton`, `Slider`, `TextField`, `Panel` (titled frame for each panel), `ProgressBar`; each Reka plus Tailwind. Canvas views are hand-drawn inside their widgets, not part of the kit. The look is decided first in [Visual direction for the UI kit](11-visual-direction-for-the-ui-kit.md).

**Import rules.** Enforced by `eslint-plugin-boundaries` (7.4.3 on 2026-11-13) inside `pnpm lint`: layer direction, and no imports between slices of one layer. Lint-policy change approved by the user.

**Where it is written down.** The ADR now. A short "Code layout" section in `AGENTS.md` is written by the setup step that creates the folders, so it never describes folders that do not exist yet.

**Passed on.** The day-one setup (Tailwind, Reka, the kit, boundaries rule, Prettier plugin, router removal) teaches no audio concept; whether it becomes a "milestone 0" without a concept note is left to [Milestone sequence](09-milestone-sequence.md).
