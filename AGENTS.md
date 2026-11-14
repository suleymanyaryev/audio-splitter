# Audio Splitter

Browser-only Vue 3 + Vite + TypeScript app that proposes split points in long audio files; nothing is uploaded. Scope and milestones: `docs/audio-splitter-milestones.md`. pnpm only, Node 24 via `mise.toml`. `README.md` points here.

## Checks

The baseline is green: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm knip` and `pnpm build` exit 0 on a clean tree. A failure in any of them is caused by the current work: fix it.

| Tier           | When                                           | Run                                                             |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| **Task**       | After each edit loop                           | `pnpm vitest run <touched specs or dirs>` + `pnpm lint:changed` |
| **Checkpoint** | End of a task-list section, or before a commit | `pnpm test:changed`, `pnpm lint:changed`, `pnpm typecheck`      |
| **Final**      | Once, before handover or PR                    | `pnpm verify`, `pnpm lint`, `pnpm knip`                         |

- Run Checkpoint and Final only at their points, and skip a check whose inputs haven't changed since it last passed.
- `pnpm test:e2e` runs in Final only when the plan names a real browser flow that unit tests can't cover. The `test:changed` suggestion for changed e2e inputs is a hint, not a gate.
- Browser work (checking a flow by hand, debugging a failing e2e spec with `--debug=cli`) goes through the `playwright-cli` skill. Playwright runs the installed Google Chrome (`channel: 'chrome'`); the project needs no `playwright install` browser download.
- `lint:fix`, `knip:fix` and `format` rewrite files; `verify` writes `dist/`. The other scripts are read-only.
- Report one line per command actually run (`pnpm typecheck -> pass`, `pnpm test:changed -> fail: 2 in peaks.spec.ts, fixed`).

### Changed checks

`lint:changed` and `test:changed` (`scripts/run-changed-check.ts`) select local work only: staged, unstaged, untracked and deleted paths, never a branch or merge base.

- `lint:changed` fails only on findings in lines the work added or modified (every line of an untracked file).
- `test:changed` runs changed specs plus the `vitest related` tests of changed sources.
- Inputs that affect every file (dependencies, tsconfigs, lint policy, Vite/Vitest config) fall back to the full run and print the reason: `full test fallback: pattern <p> matches <path>`. The lists live in `scripts/check-scope.ts`, shared with `eslint.config.ts` and `vitest.config.ts`: change scope there.
- Worker and worklet entries (`*.worker.ts`, `*.worklet.ts`) always trigger the full suite, because `new Worker(new URL(...))` and `audioWorklet.addModule()` are invisible to the import graph. Keep entries thin: analysis logic lives in plain modules that specs import directly.

## Code layout

A subset of Feature-Sliced Design ([ADR 0001](docs/adr/0001-fsd-subset.md)): layers `app` → `pages` → `widgets` → `entities` → `shared`, no `features`. A layer imports only the layers after it, and two slices of one layer never import each other. `eslint-plugin-boundaries` enforces both inside `pnpm lint` (`app/boundaries` in `eslint.config.ts`).

| Folder                         | Holds                                                                                                                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`                     | `main.ts` (the Vite entry), `App.vue` (the header band with the file chip; switches between the two pages on the `source-file` store's status, no router) and `styles/main.css` (DESIGN.md's token block; the Manrope woff2 and its OFL licence in `styles/fonts/`) |
| `src/pages/load/ui/`           | `LoadPage.vue`: "Choose file…", drop anywhere, the loading line and the failure message                                                                                                                                                                             |
| `src/pages/review/ui/`         | `ReviewPage.vue`: the five panels in their grid                                                                                                                                                                                                                     |
| `src/widgets/source-waveform/` | The whole-file waveform: `ui/SourceWaveform.vue` draws the canvas, `lib/merge-peaks.ts` merges 10 ms buckets into bars                                                                                                                                              |
| `src/entities/source-file/`    | `model/source-file.ts` (the store: file, format, duration, peaks, load failure), `api/probe.ts` (reads ffmpeg's log, decides the supported format) and `api/decode-whole-file.ts`                                                                                   |
| `src/shared/api/ffmpeg/`       | `ffmpeg.ts`: loads the pinned ffmpeg.wasm core, mounts the source file with WORKERFS, a watchdog on every call. `__tests__/fake-ffmpeg.ts` stands in for it in specs                                                                                                |
| `src/shared/lib/audio/`        | Hand-written signal maths, one file per idea: `downmix.ts`, `min-max-peaks.ts`                                                                                                                                                                                      |
| `src/shared/lib/time/`         | `format-duration.ts`: `m:ss` and `h:mm:ss`                                                                                                                                                                                                                          |
| `src/shared/ui/`               | The kit, `Ui<Name>.vue`: `UiButton`, `UiIconButton`, `UiTextField`, `UiSlider`, `UiPanel`, `UiProgressBar`, `UiDialog`. Their look is DESIGN.md's; read it before touching one                                                                                      |
| `e2e/fixtures/`                | The committed 30 s test files (three tone bursts, two 2 s silences) per supported format plus a Vorbis `.ogg`, and `make-fixtures.sh`, the native-ffmpeg script that made them                                                                                      |

- Slice folders are kebab-case, `.vue` files PascalCase. A segment folder (`ui`, `model`, `lib`, `api`, `config`) exists only when it holds a file.
- No `index.ts` public APIs: import the file itself, with its extension (`@/shared/ui/UiButton.vue`).
- Imports across slices or layers use `@/`; imports inside a slice are relative.
- A new layer or slice gets its row here when its first file lands.

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
- Specs for Node-side code start with `// @vitest-environment node`. Playwright specs live in `e2e/`; the folder has no spec and no tsconfig yet, so the first spec adds `e2e/tsconfig.json` (extending `@tsconfig/node24`) and its reference in `tsconfig.json`.
- `scripts/*.ts` run directly under Node type stripping: erasable syntax only (no enums, namespaces or parameter properties) and `.ts` extensions on relative imports. `tsconfig.node.json` enforces both.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
