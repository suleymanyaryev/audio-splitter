import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'

import viteConfig from './vite.config.ts'
import {
  FULL_TEST_FALLBACK_PATTERNS,
  IGNORED_DIRECTORIES,
  SPEC_FILE_GLOB,
} from './scripts/check-scope.ts'

const ROOT_DIRECTORY = fileURLToPath(new URL('.', import.meta.url))

// Glob-escaped so a checkout path containing `(`, `[`, `*` and similar stays literal.
const ROOT_GLOB = ROOT_DIRECTORY.replaceAll(/[!()*+?@[\]{}]/g, String.raw`\$&`)

// Vitest matches these globs against absolute paths, so the repository-relative fallback patterns
// are anchored at the root. Setting the option replaces Vitest's defaults (`**/package.json`,
// `**/{vitest,vite}.config.*`); both are in the list. `pnpm test:changed` stays the authoritative
// local-work command; this only aligns watch and `--changed` mode with it.
const FORCE_RERUN_TRIGGERS = FULL_TEST_FALLBACK_PATTERNS.map((pattern) =>
  path.join(ROOT_GLOB, pattern),
)

const testConfig = defineConfig({
  test: {
    environment: 'jsdom',
    include: [SPEC_FILE_GLOB],
    exclude: [
      ...configDefaults.exclude,
      'e2e/**',
      ...IGNORED_DIRECTORIES.map((directory) => `**/${directory}/**`),
    ],
    root: ROOT_DIRECTORY,
    setupFiles: ['vitest.setup.ts'],
    forceRerunTriggers: FORCE_RERUN_TRIGGERS,
  },
})

const config = mergeConfig(viteConfig, testConfig)

export default config
