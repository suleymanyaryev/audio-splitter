# Audio Splitter

Browser-only Vue 3 + Vite + TypeScript app that proposes split points in long audio files; nothing is uploaded. Scope and milestones: `docs/audio-splitter-milestones.md`. pnpm only, Node 24 via `mise.toml`. `README.md` is for people (why the project exists, how v1 works) and links here for the detail.

## Changelog

A user-visible change adds its line under `## [Unreleased]` in `CHANGELOG.md`, in the same commit. The version rules and the release steps are at the top of that file.

## Checks

The baseline is green: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm knip`, `pnpm depcruise` and `pnpm build` exit 0 on a clean tree. A failure in any of them is caused by the current work: fix it.

| Tier | When | Run |
| **Task** | After each edit loop | `pnpm vitest run <touched specs or dirs>` + `pnpm lint:changed` |
| **Checkpoint** | End of a task-list section, or before a commit | `pnpm test:changed`, `pnpm lint:changed`, `pnpm typecheck` |
| **Final** | Once, before handover or PR | `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise` |

- Run Checkpoint and Final only at their points, and skip a check whose inputs haven't changed since it last passed.
- `pnpm test:e2e` runs in Final only when the plan names a real browser flow that unit tests can't cover. The `test:changed` suggestion for changed e2e inputs is a hint, not a gate.
- Browser work (checking a flow by hand, debugging a failing e2e spec with `--debug=cli`) goes through the `playwright-cli` skill. Playwright runs the installed Google Chrome (`channel: 'chrome'`); the project needs no `playwright install` browser download.
- `pnpm cpd` (jscpd, config in `.jscpd.json`) is an audit, not a gate: run it on request or when planning a refactor, never in the tiers. It lists duplicated blocks in `src/` (specs excluded) and exits 0 whatever it finds; the report goes to `.cache/jscpd/`. Triage each clone as extract, leave or a misplaced slice boundary.
- `pnpm depcruise` (dependency-cruiser, config in `.dependency-cruiser.mjs`) fails on an import cycle in `src/`; type-only imports never count. It reads the whole graph, so it belongs to Final alone. A finding prints its fix.
- `lint:fix`, `knip:fix` and `format` rewrite files; `verify` writes `dist/`; `cpd` writes `.cache/jscpd/`; `depcruise` keeps its cache in `.cache/dependency-cruiser/`. The other scripts are read-only.
- Report one line per command actually run (`pnpm typecheck -> pass`, `pnpm test:changed -> fail: 2 in peaks.spec.ts, fixed`).

### Changed checks

`lint:changed` and `test:changed` (`scripts/run-changed-check.ts`) select local work only: staged, unstaged, untracked and deleted paths, never a branch or merge base.

- `lint:changed` fails only on findings in lines the work added or modified (every line of an untracked file).
- `test:changed` runs changed specs plus the `vitest related` tests of changed sources.
- Inputs that affect every file (dependencies, tsconfigs, lint policy, Vite/Vitest config) fall back to the full run and print the reason: `full test fallback: pattern <p> matches <path>`. The lists live in `scripts/check-scope.ts`, shared with `eslint.config.ts` and `vitest.config.ts`: change scope there.
- Worker and worklet entries (`*.worker.ts`, `*.worklet.ts`) always trigger the full suite, because `new Worker(new URL(...))` and `audioWorklet.addModule()` are invisible to the import graph. Keep entries thin: analysis logic lives in plain modules that specs import directly.

## Code layout

A subset of Feature-Sliced Design ([ADR 0001](docs/adr/0001-fsd-subset.md)): layers `app` → `pages` → `widgets` → `entities` → `shared`, no `features`. A layer imports only the layers after it, and two slices of one layer never import each other. `eslint-plugin-boundaries` enforces both inside `pnpm lint` (`app/boundaries` in `eslint.config.ts`).

The list below says where, not what: one line per slice on what it is for, never what it does. It changes only when a slice is added, removed or renamed; a new file or behaviour inside a slice leaves it as it is, and lives in specs, code comments, `CHANGELOG.md` and `docs/architecture.md`.

- `src/app/`: `main.ts` (the Vite entry), `App.vue` (the header band; switches between the two pages on the `source-file` store's status, no router) and `styles/main.css` (DESIGN.md's tokens, the Manrope font)
- `src/pages/load/`: `LoadPage.vue`: choosing a file and the analysis that follows
- `src/pages/review/`: `ReviewPage.vue`: the review screen's panels and actions, and the wiring between stores
- `src/widgets/source-waveform/`: The whole-file waveform and what the pointer does on it
- `src/widgets/loudness-curve/`: The loudness curve, its settings, and the replace-your-edits guard
- `src/widgets/split-zoom/`: The zoom panel's two views, `SplitZoom` and `RangeView`, and `model/audition.ts`, the one player
- `src/widgets/track-list/`: The tracks as a table
- `src/widgets/track-strip/`: The tracks as proportional blocks, and the export to a folder
- `src/entities/source-file/`: The loaded file, its analysis and its open ffmpeg session; `api/` holds one ffmpeg command per job
- `src/entities/split/`: The splits and what derives from them (gaps, tracks, selection, range); tuned constants in `config/`
- `src/shared/api/ffmpeg/`: The ffmpeg.wasm session (`ffmpeg.ts`) and `__tests__/fake-ffmpeg.ts`, its stand-in in specs
- `src/shared/lib/audio/`: Hand-written signal maths, one file per idea: downmix, peaks, loudness, median
- `src/shared/lib/time/`: Time formatting (`h:mm:ss`, `h:mm:ss.cc`) and millisecond rounding for ffmpeg command lines
- `src/shared/lib/canvas/`: Drawing the canvases share: axes, split hit test, lands, split lines, bars, dashes, font, canvas setup and redraw
- `src/shared/ui/`: The kit, `Ui<Name>.vue`; the look is DESIGN.md's, read it before touching one
- `e2e/`: Playwright: `export.spec.ts` exports each supported format and reads the files back
- `e2e/fixtures/`: The committed 30 s fixtures per supported format plus a Vorbis `.ogg`, and `make-fixtures.sh`, which made them

- Slice folders are kebab-case, `.vue` files PascalCase. A segment folder (`ui`, `model`, `lib`, `api`, `config`) exists only when it holds a file.
- No `index.ts` public APIs: import the file itself, with its extension (`@/shared/ui/UiButton.vue`).
- Imports across slices or layers use `@/`; imports inside a slice are relative.

## Lint

ESLint with `eslint:recommended`, typescript-eslint, Vue recommended, SonarJS, Unicorn and Prettier. Formatting findings are lint errors; `pnpm lint:fix` applies them.

- Green comes from fixing code. The rules and tuning in `eslint.config.ts` change only when the user asks; when a finding looks impossible to fix, ask the user.
- Every finding is fixed at its source: the project has no suppressions baseline and stays without one (no `--suppress-all` or `--suppress-rule`).
- An `eslint-disable` comment is a last resort for a real contract (CLI console output, `git` from PATH) and carries its reason on the line above, as in `scripts/run-changed-check.ts`.
- Comment style follows Unicorn 77: `//` for one-liners, multi-line `/* ... */` blocks without `*` line prefixes.

## Knip

Fix a `pnpm knip` finding by removing the unused file, export or dependency after checking every consumer: grep the name and the file stem, including strings and dynamic imports. A `knip.json` ignore needs a reason comment.

## Testing

- Vitest + jsdom + `@vue/test-utils`. `vitest.setup.ts` fills browser APIs jsdom lacks (`ResizeObserver`, which Reka's slider uses). Specs are `__tests__/*.spec.ts` next to the code they cover; a spec anywhere else is not collected. Import `describe`/`it`/`expect` from `vitest` (globals are off).
- Specs for Node-side code start with `// @vitest-environment node`. Playwright specs live in `e2e/`, typed by `e2e/tsconfig.json` (extends `@tsconfig/node24`, adds the DOM library for the functions handed to `page.evaluate`, referenced from `tsconfig.json`). `e2e/export.spec.ts` loads a fixture per format and exports it; an init script replaces `showDirectoryPicker` with `navigator.storage.getDirectory()` (the origin-private file system), so the real File System Access writes land in a real directory and no picker opens, and the spec reads the folder back through the same API and decodes each file. It is the browser flow `pnpm test:e2e` runs in Final when the plan names the export.
- `scripts/*.ts` run directly under Node type stripping: erasable syntax only (no enums, namespaces or parameter properties) and `.ts` extensions on relative imports. `tsconfig.node.json` enforces both.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
