# Audio Splitter

Browser-only Vue 3 + Vite + TypeScript app that proposes split points in long audio files; nothing is uploaded. pnpm only, Node 24 via `mise.toml`. `README.md` is for people and links here for the detail.

## Learning first

The app is also how the user learns digital audio, so the learnable parts stay hand-written and visible: the probe's log parsing, the slice loop, downmix, RMS and dB, peaks, gap finding and all canvas drawing. A library is fine only where nothing learnable hides behind it (ffmpeg.wasm for containers, Reka UI and Tailwind for the kit).

A milestone teaches one audio idea, concept before code:

1. Explain the idea in chat, with a number measured on a real sample (`samples/`, git-ignored).
2. Write `docs/concepts/NN-<slug>.md`, shaped like the notes already there.
3. Stop until the user confirms the note; no code before that.
4. Build, show it in the browser, then stop again for the user's confirmation of the milestone.

## Changelog

A user-visible change adds its line under `## [Unreleased]` in `CHANGELOG.md`, in the same commit. The version rules and the release steps are at the top of that file.

## Docs

Each doc has one job, and describes the app as it is now. A change touches a doc only when it changes what that doc is about.

- `README.md` is for people: what the app does, how to run it, and links to the rest. "What it does" keeps one line per step; it changes when what the user can do changes.
- `docs/architecture.md` is the structure: layers, stores and how they connect, the ffmpeg session, the main flows and their statuses. It changes with a store, a connection, a flow or a status; edge cases, keys and buttons stay in the code.
- What a feature does lives in the code, its specs and comments, and `CHANGELOG.md`.
- Write simply: short sentences with one idea each, a bullet of one or two sentences, a table cell of a phrase. Name the file rather than a private variable, and link to the ADR, concept note or code comment rather than repeat it.
- An update replaces text rather than adding to it, and removes what it makes stale.

## Checks

The baseline is green: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm knip`, `pnpm depcruise` and `pnpm build` exit 0 on a clean tree. A failure in any of them is caused by the current work: fix it.

| Tier           | When                                           | Run                                                             |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| **Task**       | After each edit loop                           | `pnpm vitest run <touched specs or dirs>` + `pnpm lint:changed` |
| **Checkpoint** | End of a task-list section, or before a commit | `pnpm test:changed`, `pnpm lint:changed`, `pnpm typecheck`      |
| **Final**      | Once, before handover or PR                    | `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`       |

- Run Checkpoint and Final only at their points, and skip a check whose inputs haven't changed since it last passed.
- `pnpm test:e2e` runs in Final only when the plan names a real browser flow that unit tests can't cover. The `test:changed` hint about changed e2e inputs is not a gate.
- `pnpm depcruise` reads the whole import graph (it fails on a cycle in `src/`; type-only imports don't count), so it belongs to Final alone.
- `pnpm cpd` is an audit, never a tier: run it on request or when planning a refactor, and triage each clone as extract, leave or a misplaced slice boundary.
- Browser work (checking a flow by hand, debugging an e2e spec) goes through the `playwright-cli` skill. Playwright runs the installed Google Chrome; no `playwright install`.
- `lint:fix`, `knip:fix` and `format` rewrite files; the others write only build output, reports and caches.
- Report one line per command actually run (`pnpm typecheck -> pass`, `pnpm test:changed -> fail: 2 in peaks.spec.ts, fixed`).

### Changed checks

`lint:changed` and `test:changed` (`scripts/run-changed-check.ts`) see local work only (staged, unstaged, untracked, deleted), never a branch. `lint:changed` fails only on lines the work added or modified; `test:changed` runs changed specs plus the `vitest related` tests of changed sources.

- Inputs that affect every file fall back to the full run and print the reason. The lists live in `scripts/check-scope.ts`: change scope there.
- `*.worker.ts` and `*.worklet.ts` entries always trigger the full suite, because the import graph can't see them. Keep entries thin, with the logic in plain modules that specs import.

## Code layout

A subset of Feature-Sliced Design ([ADR 0001](docs/adr/0001-fsd-subset.md)): layers `app` → `pages` → `widgets` → `entities` → `shared`, no `features`. A layer imports only the layers after it, and two slices of one layer never import each other; `pnpm lint` enforces both.

The list says where, not what: one line per slice on what it is for. It changes only when a slice is added, removed or renamed. What a slice does lives in its specs, code comments, `CHANGELOG.md` and `docs/architecture.md`.

- `src/app/`: The entry, the page switch and the global styles
- `src/pages/load/`: Choosing a file and the analysis that follows
- `src/pages/review/`: The review screen, and the wiring between stores
- `src/widgets/source-waveform/`: The whole-file waveform
- `src/widgets/loudness-curve/`: The loudness curve and its settings
- `src/widgets/shortcuts-dialog/`: The list of the review screen's keys and gestures
- `src/widgets/split-zoom/`: The zoom panel's views and the one player
- `src/widgets/track-list/`: The tracks as a table
- `src/widgets/track-strip/`: The tracks as proportional blocks, and the export
- `src/entities/source-file/`: The loaded file, its analysis and its ffmpeg session
- `src/entities/split/`: The splits and what derives from them
- `src/shared/api/ffmpeg/`: The ffmpeg.wasm session
- `src/shared/lib/audio/`: Hand-written signal maths
- `src/shared/lib/theme/`: The theme choice and the theme in effect
- `src/shared/lib/time/`: Time formatting and rounding
- `src/shared/lib/keyboard/`: Page-level keys
- `src/shared/lib/canvas/`: Drawing the canvases share
- `src/shared/ui/`: The kit, `Ui<Name>.vue`; read DESIGN.md before touching one
- `e2e/`: Playwright specs and their committed fixtures

- Slice folders are kebab-case, `.vue` files PascalCase. A segment folder (`ui`, `model`, `lib`, `api`, `config`) exists only when it holds a file.
- No `index.ts` public APIs: import the file itself, with its extension (`@/shared/ui/UiButton.vue`).
- Imports across slices or layers use `@/`; imports inside a slice are relative.

## Lint

ESLint (typescript-eslint, Vue, SonarJS, Unicorn, Prettier); formatting findings are lint errors that `pnpm lint:fix` applies.

- Green comes from fixing the code at the finding's source. `eslint.config.ts` changes only when the user asks; when a finding looks impossible to fix, ask. No suppressions baseline (`--suppress-all`, `--suppress-rule`).
- An `eslint-disable` is a last resort for a real contract, with its reason on the line above (`scripts/run-changed-check.ts`).
- Comments: `//` for one-liners, multi-line `/* ... */` blocks without `*` line prefixes.

## Knip

Fix a finding by removing the unused file, export or dependency after checking every consumer: grep the name and the file stem, including strings and dynamic imports. A `knip.json` ignore needs a reason comment.

## Testing

- Vitest + jsdom + `@vue/test-utils`; `vitest.setup.ts` fills the browser APIs jsdom lacks. Specs are `__tests__/*.spec.ts` next to the code they cover (nowhere else is collected) and import `describe`/`it`/`expect` from `vitest`.
- Specs for Node-side code start with `// @vitest-environment node`.
- Playwright specs live in `e2e/`, typed by `e2e/tsconfig.json`: `export.spec.ts` and `theme.spec.ts` run on the dev server, `stored-core.spec.ts` on a production build (`playwright.config.ts`). Each spec's header says what it checks and how.
- `scripts/*.ts` run under Node type stripping: erasable syntax only and `.ts` extensions on relative imports (`tsconfig.node.json` enforces both).

## Agent skills

- Issues and specs live as local markdown under `.scratch/<feature>/`: `docs/agents/issue-tracker.md`.
- Domain docs are single-context, one `GLOSSARY.md` and `docs/adr/` at the root: `docs/agents/domain.md`.
