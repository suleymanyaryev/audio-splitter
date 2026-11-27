# Audio Splitter

Browser-only Vue 3 + Vite + TypeScript app that proposes split points in long audio files; nothing is uploaded. pnpm only, Node 24 via `mise.toml`.

## Learning first

The app is also how the user learns digital audio, so the learnable parts stay hand-written and visible: the probe's log parsing, the slice loop, downmix, RMS and dB, peaks, gap finding and all canvas drawing. A library is fine only where nothing learnable hides behind it (ffmpeg.wasm for containers, Reka UI and Tailwind for the kit).

A milestone teaches one audio idea, concept before code:

1. Explain the idea in chat, with a number measured on a real sample (`samples/`, git-ignored).
2. Write `docs/concepts/NN-<slug>.md` to the concept-note contract in the `finish-feature` skill.
3. Stop until the user confirms the note; no code before that.
4. Build, show it in the browser, then stop again for the user's confirmation of the milestone.

## Changelog

A user-visible change adds a `CHANGELOG.md` line in the same commit: the `finish-feature` skill has the rule.

## Docs

Before a commit, the `finish-feature` skill says what each doc holds, when it changes and how to write it.

## Checks

The baseline is green: `typecheck`, `test`, `lint`, `knip`, `depcruise` and `build` exit 0 on a clean tree, so a failure is caused by the current work: fix it.

| Tier           | When                                           | Run                                                                            |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| **Task**       | After each edit loop                           | `pnpm vitest run <touched specs or dirs>` + `pnpm lint:changed`                |
| **Checkpoint** | End of a task-list section, or before a commit | `pnpm test:changed`, `pnpm lint:changed`, `pnpm typecheck`, `pnpm docs:budget` |
| **Final**      | Once, before handover or PR                    | `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`                      |

- Run Checkpoint and Final only at their points; skip a check whose inputs haven't changed since it passed.
- `pnpm test:e2e` joins Final only when the plan names a browser flow unit tests can't cover; the `test:changed` e2e hint is not a gate.
- `pnpm depcruise` reads the whole import graph (`.dependency-cruiser.mjs`), so it belongs to Final alone.
- `pnpm cpd` is an audit, never a tier: run it on request or when planning a refactor, and triage each clone as extract, leave or a misplaced slice boundary.
- Browser work goes through the `playwright-cli` skill, on the installed Google Chrome; no `playwright install`.
- `lint:fix`, `knip:fix` and `format` rewrite files; the other scripts write only build output, reports and caches.
- Report one line per command run (`pnpm typecheck -> pass`, `pnpm test:changed -> fail: 2 in peaks.spec.ts, fixed`).

### Changed checks

`lint:changed` and `test:changed` (`scripts/run-changed-check.ts`) see local work only, never a branch; `lint:changed` fails only on lines the work added or changed.
An input that affects every file runs the full check; change that scope in `scripts/check-scope.ts`.

## Code layout

A subset of Feature-Sliced Design ([ADR 0001](docs/adr/0001-fsd-subset.md)): layers `app` → `pages` → `widgets` → `entities` → `shared`, no `features`. A layer imports only the layers after it, and two slices of one layer never import each other; `pnpm lint` enforces both.

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

ESLint runs Prettier too: formatting findings are lint errors that `pnpm lint:fix` applies.

- Green comes from fixing the code at the finding's source. `eslint.config.ts` changes only when the user asks; when a finding looks impossible to fix, ask. No suppressions baseline (`--suppress-all`, `--suppress-rule`).
- An `eslint-disable` is a last resort for a real contract, with its reason on the line above (`scripts/run-changed-check.ts`).
- Comments: `//` for one-liners, multi-line `/* ... */` blocks without `*` line prefixes.

## Knip

Fix a finding by removing the unused file, export or dependency, after grepping its name and file stem for consumers, strings and dynamic imports included. A `knip.json` ignore needs a reason comment.

## Testing

- `vitest.setup.ts` fills the browser APIs jsdom lacks. Specs are `__tests__/*.spec.ts` beside their code (nowhere else is collected) and import `describe`/`it`/`expect` from `vitest`.
- Specs for Node-side code start with `// @vitest-environment node`.
- Keep `*.worker.ts` and `*.worklet.ts` entries thin, with the logic in plain modules that specs import: the import graph can't see an entry, so a changed one runs the full suite.
- Playwright specs live in `e2e/`, typed by `e2e/tsconfig.json`; `playwright.config.ts` says which server each runs on.
- `scripts/*.ts` run under Node type stripping: erasable syntax and `.ts` extensions on relative imports (`tsconfig.node.json` enforces both).

## Agent skills

- Issues and specs live as local markdown under `.scratch/<feature>/`: `docs/agents/issue-tracker.md`.
- Domain docs are single-context, one `GLOSSARY.md` and `docs/adr/` at the root: `docs/agents/domain.md`.
