// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  FULL_LINT_FALLBACK_PATTERNS,
  FULL_TEST_FALLBACK_PATTERNS,
  PLAYWRIGHT_INPUT_PATTERNS,
} from '../check-scope.ts'
import {
  assertSafeRepositoryPath,
  classifyCandidates,
  collectLocalChanges,
  filterLintResultsToChangedLines,
  formatPlaywrightNotice,
  isEslintEligible,
  isInIgnoredDirectory,
  isSpecFile,
  matchesAnyPattern,
  normalizeAndDedupe,
  parseChangedLineRanges,
  parseNullDelimited,
  resolveRepositoryRoot,
  runGit,
  runnableTargets,
  type GitResult,
  type GitRunner,
  type LintResult,
} from '../run-changed-check.ts'

const REPO_ROOT = '/repo'

const UNSTAGED_COMMAND = 'diff --name-only -z --diff-filter=ACMRD --no-renames'
const STAGED_COMMAND = 'diff --cached --name-only -z --diff-filter=ACMRD --no-renames'
const UNTRACKED_COMMAND = 'ls-files --others --exclude-standard -z'

const NO_FALLBACK = { triggered: false, reason: null }

// A Git runner keyed by the joined argument list; unknown commands succeed with empty output.
function makeGitRunner(responses: Record<string, Partial<GitResult>> = {}) {
  const calls: string[][] = []
  const runner: GitRunner = (_repositoryRoot, commandArguments) => {
    calls.push([...commandArguments])

    return { stdout: '', stderr: '', status: 0, ...responses[commandArguments.join(' ')] }
  }

  return { runner, calls }
}

function existingFiles(files: readonly string[]) {
  const present = new Set(files)

  return (absolutePath: string) => present.has(absolutePath.replace(`${REPO_ROOT}/`, ''))
}

describe('parseNullDelimited', () => {
  it('returns an empty list for empty output', () => {
    expect(parseNullDelimited('')).toEqual([])
  })

  it('splits NUL-delimited entries and drops empty entries', () => {
    expect(parseNullDelimited('a.ts\0\0b.ts\0')).toEqual(['a.ts', 'b.ts'])
  })

  it('preserves spaces and newlines inside file names', () => {
    expect(parseNullDelimited('with space.ts\0new\nline.ts\0')).toEqual([
      'with space.ts',
      'new\nline.ts',
    ])
  })
})

describe('normalizeAndDedupe', () => {
  it('collapses duplicates while preserving first-seen order', () => {
    expect(normalizeAndDedupe(['b.ts', 'a.ts', 'b.ts', 'c.ts', 'a.ts'])).toEqual([
      'b.ts',
      'a.ts',
      'c.ts',
    ])
  })
})

describe('assertSafeRepositoryPath', () => {
  it('accepts repository-relative paths', () => {
    expect(assertSafeRepositoryPath('src/App.vue')).toBe('src/App.vue')
    expect(assertSafeRepositoryPath('src/..hidden/x.ts')).toBe('src/..hidden/x.ts')
  })

  it('rejects absolute paths', () => {
    expect(() => assertSafeRepositoryPath('/etc/passwd')).toThrow(/absolute or empty/)
  })

  it('rejects paths escaping the repository', () => {
    expect(() => assertSafeRepositoryPath('src/../../outside.ts')).toThrow(/escapes/)
  })

  it('rejects empty paths', () => {
    expect(() => assertSafeRepositoryPath('')).toThrow(/absolute or empty/)
  })
})

describe('isSpecFile', () => {
  it('matches the Vitest include contract', () => {
    expect(isSpecFile('src/__tests__/App.spec.ts')).toBe(true)
    expect(isSpecFile('src/audio/__tests__/nested/peaks.spec.ts')).toBe(true)
    expect(isSpecFile('scripts/__tests__/run-changed-check.spec.ts')).toBe(true)
  })

  it('rejects non-spec and misplaced spec names', () => {
    expect(isSpecFile('src/App.spec.ts')).toBe(false)
    expect(isSpecFile('src/__tests__/helpers.ts')).toBe(false)
    expect(isSpecFile('src/__tests__/App.test.ts')).toBe(false)
    expect(isSpecFile('e2e/vue.spec.ts')).toBe(false)
  })
})

describe('isInIgnoredDirectory', () => {
  it('matches ignored directory names at any depth', () => {
    expect(isInIgnoredDirectory('dist/index.js')).toBe(true)
    expect(isInIgnoredDirectory('src/nested/coverage/x.ts')).toBe(true)
    expect(isInIgnoredDirectory('.claude/agents/a.md')).toBe(true)
  })

  it('does not match names that only contain an ignored name', () => {
    expect(isInIgnoredDirectory('src/distance.ts')).toBe(false)
    expect(isInIgnoredDirectory('src/dist.ts')).toBe(false)
  })
})

describe('isEslintEligible', () => {
  it.each(['a.js', 'a.cjs', 'a.mjs', 'a.jsx', 'a.ts', 'a.cts', 'a.mts', 'a.tsx', 'src/App.vue'])(
    'accepts %s',
    (filePath) => {
      expect(isEslintEligible(filePath)).toBe(true)
    },
  )

  it.each(['README.md', 'src/style.css', 'package.json', 'public/favicon.ico', 'Makefile'])(
    'rejects %s',
    (filePath) => {
      expect(isEslintEligible(filePath)).toBe(false)
    },
  )

  it('rejects source files in ignored directories', () => {
    expect(isEslintEligible('dist/assets/index.js')).toBe(false)
    expect(isEslintEligible('.agents/skills/x/script.ts')).toBe(false)
  })
})

describe('matchesAnyPattern', () => {
  it('matches subtree patterns at any depth, including directly inside the root', () => {
    expect(matchesAnyPattern(['src/**/*.worker.ts'], 'src/decode.worker.ts').matched).toBe(true)
    expect(matchesAnyPattern(['src/**/*.worker.ts'], 'src/a/b/decode.worker.ts').matched).toBe(true)
    expect(matchesAnyPattern(['e2e/**'], 'e2e/nested/vue.spec.ts').matched).toBe(true)
  })

  it('keeps a single star within one segment', () => {
    expect(matchesAnyPattern(['tsconfig.*.json'], 'tsconfig.app.json').matched).toBe(true)
    expect(matchesAnyPattern(['tsconfig.*.json'], 'tsconfig.json').matched).toBe(false)
    expect(matchesAnyPattern(['src/*.ts'], 'src/a/b.ts').matched).toBe(false)
  })

  it('treats regex metacharacters literally and anchors both ends', () => {
    expect(matchesAnyPattern(['package.json'], 'packageXjson').matched).toBe(false)
    expect(matchesAnyPattern(['package.json'], 'sub/package.json').matched).toBe(false)
    expect(matchesAnyPattern(['(a)+?.ts'], '(a)+?.ts').matched).toBe(true)
  })

  it('reports the first matching pattern', () => {
    expect(matchesAnyPattern(['x.ts', 'src/**', 'src/a.ts'], 'src/a.ts')).toEqual({
      matched: true,
      pattern: 'src/**',
    })
    expect(matchesAnyPattern(['x.ts'], 'src/a.ts')).toEqual({ matched: false, pattern: null })
  })
})

describe('classifyCandidates', () => {
  it('produces a successful no-op classification for no files', () => {
    expect(classifyCandidates([])).toEqual({
      lintTargets: [],
      directSpecs: [],
      relatedSources: [],
      fullLint: NO_FALLBACK,
      fullTest: NO_FALLBACK,
      playwrightEvidence: NO_FALLBACK,
    })
  })

  it('treats ordinary source files as lint targets and related-test inputs', () => {
    const classified = classifyCandidates(['src/App.vue', 'src/audio/peaks.ts', 'scripts/x.ts'])

    expect(classified.lintTargets).toEqual(['src/App.vue', 'src/audio/peaks.ts', 'scripts/x.ts'])
    expect(classified.relatedSources).toEqual(classified.lintTargets)
    expect(classified.directSpecs).toEqual([])
    expect(classified.fullLint.triggered).toBe(false)
    expect(classified.fullTest.triggered).toBe(false)
  })

  it('runs directly changed spec files and lints them, without a related-source entry', () => {
    const classified = classifyCandidates(['src/__tests__/App.spec.ts'])

    expect(classified.directSpecs).toEqual(['src/__tests__/App.spec.ts'])
    expect(classified.lintTargets).toEqual(['src/__tests__/App.spec.ts'])
    expect(classified.relatedSources).toEqual([])
  })

  it('never treats a spec file as a fallback trigger', () => {
    const classified = classifyCandidates(['src/__tests__/App.spec.ts'], {
      fullLintPatterns: ['src/**'],
      fullTestPatterns: ['src/**'],
    })

    expect(classified.fullLint.triggered).toBe(false)
    expect(classified.fullTest.triggered).toBe(false)
    expect(classified.directSpecs).toEqual(['src/__tests__/App.spec.ts'])
  })

  it.each(['package.json', 'pnpm-lock.yaml', 'tsconfig.app.json', 'scripts/check-scope.ts'])(
    'triggers full lint and full test for the shared input %s',
    (filePath) => {
      const classified = classifyCandidates([filePath])

      expect(classified.fullLint).toEqual({
        triggered: true,
        reason: expect.stringContaining(filePath),
      })
      expect(classified.fullTest.triggered).toBe(true)
      expect(classified.relatedSources).toEqual([])
    },
  )

  it.each(['eslint.config.ts', '.prettierrc.json'])(
    'triggers only the full-lint fallback for the lint-policy input %s',
    (filePath) => {
      const classified = classifyCandidates([filePath])

      expect(classified.fullLint.triggered).toBe(true)
      expect(classified.fullTest.triggered).toBe(false)
    },
  )

  it.each([
    'vite.config.ts',
    'vitest.config.ts',
    'environment.d.ts',
    'src/audio/decode.worker.ts',
    'src/audio/meter.worklet.ts',
  ])('triggers only the full-test fallback for the discovery input %s', (filePath) => {
    const classified = classifyCandidates([filePath])

    expect(classified.fullTest).toEqual({
      triggered: true,
      reason: `pattern ${matchesAnyPattern(FULL_TEST_FALLBACK_PATTERNS, filePath).pattern} matches ${filePath}`,
    })
    expect(classified.fullLint.triggered).toBe(false)
    expect(classified.lintTargets).toEqual([filePath])
    expect(classified.relatedSources).toEqual([])
  })

  it('drops source lint targets after a full-lint fallback but keeps changed specs', () => {
    const classified = classifyCandidates([
      'eslint.config.ts',
      'src/App.vue',
      'src/__tests__/App.spec.ts',
    ])

    expect(classified.fullLint.reason).toBe('pattern eslint.config.ts matches eslint.config.ts')
    expect(classified.lintTargets).toEqual(['src/__tests__/App.spec.ts'])
  })

  it('records the first matching path as the fallback reason', () => {
    const classified = classifyCandidates(['vite.config.ts', 'vitest.config.ts'])

    expect(classified.fullTest.reason).toBe('pattern vite.config.ts matches vite.config.ts')
  })

  it.each(['e2e/vue.spec.ts', 'e2e/fixtures/long.ts', 'playwright.config.ts'])(
    'treats the Playwright input %s as lint-only with a smoke suggestion',
    (filePath) => {
      const classified = classifyCandidates([filePath])

      expect(classified.lintTargets).toEqual([filePath])
      expect(classified.directSpecs).toEqual([])
      expect(classified.relatedSources).toEqual([])
      expect(classified.fullLint.triggered).toBe(false)
      expect(classified.fullTest.triggered).toBe(false)
      expect(classified.playwrightEvidence).toEqual({
        triggered: true,
        reason: `pattern ${matchesAnyPattern(PLAYWRIGHT_INPUT_PATTERNS, filePath).pattern} matches ${filePath}`,
      })
    },
  )

  it('records Playwright evidence for a non-lintable Playwright file', () => {
    const classified = classifyCandidates(['e2e/fixtures/sample.mp3'])

    expect(classified.playwrightEvidence.triggered).toBe(true)
    expect(classified.lintTargets).toEqual([])
  })

  it('does not let Playwright evidence change the unit or lint scope of other files', () => {
    const classified = classifyCandidates(['e2e/vue.spec.ts', 'src/App.vue'])

    expect(classified.lintTargets).toEqual(['e2e/vue.spec.ts', 'src/App.vue'])
    expect(classified.relatedSources).toEqual(['src/App.vue'])
  })

  it('excludes assets, docs and ignored directories from every bucket', () => {
    const classified = classifyCandidates([
      'README.md',
      'docs/architecture.md',
      'public/favicon.ico',
      'src/style.css',
      'dist/index.js',
      '.claude/agents/x.ts',
      '.agents/skills/x/__tests__/a.spec.ts',
      '.agents/skills/x/package.json',
    ])

    expect(classified).toEqual(classifyCandidates([]))
  })

  it('classifies special file names as ordinary sources', () => {
    const classified = classifyCandidates(['src/with space.ts', 'src/-dash.ts'])

    expect(classified.relatedSources).toEqual(['src/with space.ts', 'src/-dash.ts'])
  })

  it('honors custom fallback and Playwright pattern overrides', () => {
    const classified = classifyCandidates(['src/special.ts', 'tests/smoke.ts'], {
      fullLintPatterns: [],
      fullTestPatterns: ['src/special.ts'],
      playwrightPatterns: ['tests/**'],
    })

    expect(classified.fullTest.reason).toBe('pattern src/special.ts matches src/special.ts')
    expect(classified.fullLint.triggered).toBe(false)
    expect(classified.playwrightEvidence.reason).toBe('pattern tests/** matches tests/smoke.ts')
  })

  it('keeps every lint fallback a test fallback unless it is a lint-policy file', () => {
    const lintOnly = new Set(['eslint.config.ts', '.prettierrc.json'])
    const testPatterns: ReadonlySet<string> = new Set(FULL_TEST_FALLBACK_PATTERNS)
    const unexpected = FULL_LINT_FALLBACK_PATTERNS.filter(
      (pattern) => !lintOnly.has(pattern) && !testPatterns.has(pattern),
    )

    expect(unexpected).toEqual([])
  })
})

describe('runnableTargets', () => {
  it('filters every target bucket down to present files', () => {
    const targets = runnableTargets(
      {
        lintTargets: ['src/a.ts', 'src/gone.ts'],
        directSpecs: ['src/__tests__/gone.spec.ts', 'src/__tests__/a.spec.ts'],
        relatedSources: ['src/gone.ts', 'src/a.ts'],
      },
      ['src/a.ts', 'src/__tests__/a.spec.ts'],
    )

    expect(targets).toEqual({
      lintTargets: ['src/a.ts'],
      directSpecs: ['src/__tests__/a.spec.ts'],
      relatedSources: ['src/a.ts'],
    })
  })
})

describe('formatPlaywrightNotice', () => {
  it('names the command and the reason', () => {
    expect(formatPlaywrightNotice('pattern e2e/** matches e2e/vue.spec.ts')).toBe(
      '[changed-check] optional Playwright smoke: consider `pnpm test:e2e` ' +
        '(pattern e2e/** matches e2e/vue.spec.ts)',
    )
  })
})

describe('runGit', () => {
  it('returns stdout on success', () => {
    const { runner } = makeGitRunner({ 'status -z': { stdout: 'ok' } })

    expect(runGit(['status', '-z'], { repositoryRoot: REPO_ROOT, gitRunner: runner })).toBe('ok')
  })

  it('throws with stderr detail on failure', () => {
    const { runner } = makeGitRunner({ 'status -z': { stderr: 'fatal: broken\n', status: 128 } })

    expect(() =>
      runGit(['status', '-z'], { repositoryRoot: REPO_ROOT, gitRunner: runner }),
    ).toThrow('git status -z failed: fatal: broken')
  })

  it('treats a crashed runner (null status) as a failure', () => {
    const { runner } = makeGitRunner({ 'status -z': { status: null } })

    expect(() =>
      runGit(['status', '-z'], { repositoryRoot: REPO_ROOT, gitRunner: runner }),
    ).toThrow('git status -z failed')
  })
})

describe('resolveRepositoryRoot', () => {
  it('returns the trimmed repository root', () => {
    const { runner } = makeGitRunner({ 'rev-parse --show-toplevel': { stdout: '/repo\n' } })

    expect(resolveRepositoryRoot({ gitRunner: runner })).toBe('/repo')
  })

  it('fails when the directory is not a Git worktree', () => {
    const { runner } = makeGitRunner({
      'rev-parse --show-toplevel': { stderr: 'fatal: not a git repository', status: 128 },
    })

    expect(() => resolveRepositoryRoot({ gitRunner: runner })).toThrow(/not a Git worktree/)
  })
})

describe('collectLocalChanges', () => {
  it('combines unstaged, staged and untracked paths and deduplicates them', () => {
    const { runner, calls } = makeGitRunner({
      [UNSTAGED_COMMAND]: { stdout: 'src/a.ts\0src/shared.ts\0' },
      [STAGED_COMMAND]: { stdout: 'src/shared.ts\0src/b.ts\0' },
      [UNTRACKED_COMMAND]: { stdout: 'src/new.ts\0' },
    })

    const changes = collectLocalChanges({
      repositoryRoot: REPO_ROOT,
      gitRunner: runner,
      exists: existingFiles(['src/a.ts', 'src/shared.ts', 'src/b.ts', 'src/new.ts']),
    })

    expect(changes).toEqual({
      present: ['src/a.ts', 'src/shared.ts', 'src/b.ts', 'src/new.ts'],
      removed: [],
    })
    expect(calls.map((call) => call.join(' '))).toEqual([
      UNSTAGED_COMMAND,
      STAGED_COMMAND,
      UNTRACKED_COMMAND,
    ])
  })

  it('keeps a rename destination present and its former path removed', () => {
    const { runner } = makeGitRunner({ [STAGED_COMMAND]: { stdout: 'src/old.ts\0src/new.ts\0' } })

    const changes = collectLocalChanges({
      repositoryRoot: REPO_ROOT,
      gitRunner: runner,
      exists: existingFiles(['src/new.ts']),
    })

    expect(changes).toEqual({ present: ['src/new.ts'], removed: ['src/old.ts'] })
  })

  it('fails on unsafe paths instead of silently shrinking the change set', () => {
    const { runner } = makeGitRunner({ [UNSTAGED_COMMAND]: { stdout: '../outside.ts\0' } })

    expect(() =>
      collectLocalChanges({ repositoryRoot: REPO_ROOT, gitRunner: runner, exists: () => true }),
    ).toThrow(/escapes the repository/)
  })

  it('propagates failed Git execution as a real failure', () => {
    const { runner } = makeGitRunner({
      [STAGED_COMMAND]: { stderr: 'fatal: bad index', status: 1 },
    })

    expect(() =>
      collectLocalChanges({ repositoryRoot: REPO_ROOT, gitRunner: runner, exists: () => true }),
    ).toThrow(/bad index/)
  })

  it('returns empty buckets for an empty change set', () => {
    const { runner } = makeGitRunner()

    expect(
      collectLocalChanges({ repositoryRoot: REPO_ROOT, gitRunner: runner, exists: () => true }),
    ).toEqual({ present: [], removed: [] })
  })
})

describe('parseChangedLineRanges', () => {
  it('maps each changed file to its added or modified line ranges', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -2 +2 @@',
      '-old',
      '+new',
      '@@ -10,0 +11,3 @@',
      '+x',
      '+y',
      '+z',
      '@@ -20,2 +23,0 @@',
      '-gone',
      '-gone',
      'diff --git a/src/b.ts b/src/b.ts',
      '--- a/src/b.ts',
      '+++ b/src/b.ts',
      '@@ -1,2 +1,2 @@',
    ].join('\n')

    expect(parseChangedLineRanges(diff)).toEqual(
      new Map([
        [
          'src/a.ts',
          [
            [2, 2],
            [11, 13],
          ],
        ],
        ['src/b.ts', [[1, 2]]],
      ]),
    )
  })

  it('ignores deleted files and empty output', () => {
    expect(parseChangedLineRanges('')).toEqual(new Map())
    expect(
      parseChangedLineRanges(['--- a/src/gone.ts', '+++ /dev/null', '@@ -1,3 +0,0 @@'].join('\n')),
    ).toEqual(new Map())
  })
})

const toRelative = (absolutePath: string) => absolutePath.replace(`${REPO_ROOT}/`, '')

function lintResult(
  filePath: string,
  lines: Array<number | undefined>,
  isFatal = false,
): LintResult {
  return {
    filePath: `${REPO_ROOT}/${filePath}`,
    messages: lines.map((line) => ({ line, fatal: isFatal, severity: 2, message: `on ${line}` })),
  }
}

describe('filterLintResultsToChangedLines', () => {
  it('keeps findings on changed lines and counts the hidden ones', () => {
    const filtered = filterLintResultsToChangedLines(
      [lintResult('src/a.ts', [1, 2, 5, 9])],
      new Map([['src/a.ts', [[2, 5]]]]),
      toRelative,
    )

    expect(filtered.results[0]?.messages.map((message) => message.line)).toEqual([2, 5])
    expect(filtered.hiddenCount).toBe(2)
  })

  it('keeps every finding for files without diff ranges (untracked)', () => {
    const filtered = filterLintResultsToChangedLines(
      [lintResult('src/new.ts', [1, 2])],
      new Map(),
      toRelative,
    )

    expect(filtered.results[0]?.messages).toHaveLength(2)
    expect(filtered.hiddenCount).toBe(0)
  })

  it('always keeps fatal and line-less findings', () => {
    const filtered = filterLintResultsToChangedLines(
      [lintResult('src/a.ts', [7], true), lintResult('src/b.ts', [undefined])],
      new Map([
        ['src/a.ts', []],
        ['src/b.ts', []],
      ]),
      toRelative,
    )

    expect(filtered.results.map((entry) => entry.messages.length)).toEqual([1, 1])
    expect(filtered.hiddenCount).toBe(0)
  })
})
