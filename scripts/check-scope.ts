/**
Single source of truth for the backpressure scope. `eslint.config.ts`, `vitest.config.ts` and
`scripts/run-changed-check.ts` all import these lists, so the lint scope, the Vitest contract
and the changed-check runner cannot drift apart.

Patterns are repository-relative. `**` matches any number of segments, `*` one segment.
*/

/**
File extensions ESLint lints.
*/
export const SOURCE_EXTENSIONS = [
  'js',
  'cjs',
  'mjs',
  'jsx',
  'ts',
  'cts',
  'mts',
  'tsx',
  'vue',
] as const

/**
Directory names ignored anywhere in the tree by ESLint and by the changed-check runner.
*/
export const IGNORED_DIRECTORIES = [
  'dist',
  'dist-ssr',
  'coverage',
  '.cache',
  'playwright-report',
  'test-results',
  'blob-report',
  '.agents',
  '.claude',
  '.dsh',
  '.opencode',
  '.impeccable',
] as const

/**
Vitest test-file contract: a `__tests__` segment and a `.spec.ts` basename.
*/
export const SPEC_FILE_GLOB = '**/__tests__/**/*.spec.ts'

/**
Dependency and compiler inputs that change both the lint and the test result for every file.
*/
const SHARED_FALLBACK_PATTERNS = [
  'scripts/check-scope.ts',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'tsconfig.*.json',
] as const

/**
Lint-policy inputs. A change here runs the full `eslint .` instead of the changed files.
Prettier runs through ESLint, so its config is a lint input.
*/
export const FULL_LINT_FALLBACK_PATTERNS = [
  ...SHARED_FALLBACK_PATTERNS,
  'eslint.config.ts',
  '.prettierrc.json',
] as const

/**
Test-discovery inputs. A change here runs the full `vitest run`.

Worker and worklet entries are loaded through `new Worker(new URL(...))` and
`audioWorklet.addModule()`, which the Vitest import graph cannot follow, so `vitest related`
would select nothing for them.
*/
export const FULL_TEST_FALLBACK_PATTERNS = [
  ...SHARED_FALLBACK_PATTERNS,
  'vite.config.ts',
  'vitest.config.ts',
  'vitest.setup.ts',
  'environment.d.ts',
  'src/**/*.worker.ts',
  'src/**/*.worklet.ts',
] as const

/**
Playwright inputs: linted, never sent to Vitest, never a fallback trigger. A change prints an
optional `pnpm test:e2e` suggestion in test mode.
*/
export const PLAYWRIGHT_INPUT_PATTERNS = ['e2e/**', 'playwright.config.ts'] as const
