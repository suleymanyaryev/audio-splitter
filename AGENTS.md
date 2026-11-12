# Audio Splitter

Browser-only Vue 3 + Vite + TypeScript app that proposes split points in long audio files; nothing is uploaded. Scope and milestones: `docs/audio-splitter-milestones.md`. pnpm only, Node 24 via `mise.toml`. `README.md` is create-vue boilerplate: use this file.

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

## Lint

ESLint with `eslint:recommended`, typescript-eslint, Vue recommended, SonarJS, Unicorn and Prettier. Formatting findings are lint errors; `pnpm lint:fix` applies them.

- Green comes from fixing code. The rules and tuning in `eslint.config.ts` change only when the user asks; when a finding looks impossible to fix, ask the user.
- Every finding is fixed at its source: the project has no suppressions baseline and stays without one (no `--suppress-all` or `--suppress-rule`).
- An `eslint-disable` comment is a last resort for a real contract (CLI console output, `git` from PATH) and carries its reason on the line above, as in `scripts/run-changed-check.ts`.
- Comment style follows Unicorn 77: `//` for one-liners, multi-line `/* ... */` blocks without `*` line prefixes.

## Knip

Fix a `pnpm knip` finding by removing the unused file, export or dependency after checking every consumer: grep the name and the file stem, including strings and dynamic imports. A `knip.json` ignore needs a reason comment.

## Testing

- Vitest + jsdom + `@vue/test-utils`. Specs are `__tests__/*.spec.ts` next to the code they cover; a spec anywhere else is not collected. Import `describe`/`it`/`expect` from `vitest` (globals are off).
- Specs for Node-side code start with `// @vitest-environment node`. Playwright specs live in `e2e/`.
- `scripts/*.ts` run directly under Node type stripping: erasable syntax only (no enums, namespaces or parameter properties) and `.ts` extensions on relative imports. `tsconfig.node.json` enforces both.
