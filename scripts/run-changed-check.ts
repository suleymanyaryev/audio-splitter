/*
Local Git-aware changed-quality runner.

Collects the developer's current local work (unstaged tracked edits, staged tracked edits,
untracked non-ignored files, deleted files) and runs the project's lint or test command over the
eligible subset. It never compares against `main`, a remote branch, a merge base, or any other
revision.

Usage:
  node scripts/run-changed-check.ts lint [--changed-lines]
  node scripts/run-changed-check.ts test

The scope lists live in `scripts/check-scope.ts`, shared with `eslint.config.ts` and
`vitest.config.ts`. The pure classification helpers are exported for unit coverage; the Git and
process boundaries are injectable so tests never depend on machine worktree state.
*/
// The runner is a CLI whose contract is status output; console.log is the intended progress
// channel, so the project-wide console policy is waived here.
/* eslint-disable no-console */
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'

import {
  PLAYWRIGHT_INPUT_PATTERNS,
  FULL_LINT_FALLBACK_PATTERNS,
  FULL_TEST_FALLBACK_PATTERNS,
  IGNORED_DIRECTORIES,
  SOURCE_EXTENSIONS,
} from './check-scope.ts'

export type GitResult = { stdout: string; stderr: string; status: number | null }

export type GitRunner = (repositoryRoot: string, commandArguments: readonly string[]) => GitResult

export type FallbackState = { triggered: boolean; reason: string | null }

export type Classified = {
  lintTargets: string[]
  directSpecs: string[]
  relatedSources: string[]
  fullLint: FallbackState
  fullTest: FallbackState
  playwrightEvidence: FallbackState
}

export type ClassifyOverrides = {
  fullLintPatterns?: readonly string[]
  fullTestPatterns?: readonly string[]
  playwrightPatterns?: readonly string[]
}

export type LintMessage = {
  line?: number
  column?: number
  fatal?: boolean
  severity: number
  message: string
  ruleId?: string | null
}

export type LintResult = { filePath: string; messages: LintMessage[] }

type RunnableTargets = Pick<Classified, 'lintTargets' | 'directSpecs' | 'relatedSources'>

const MAX_BUFFER_BYTES = 64 * 1024 * 1024

const ESLINT_SEVERITY_ERROR = 2

const SOURCE_EXTENSION_SET: ReadonlySet<string> = new Set(SOURCE_EXTENSIONS)

const IGNORED_DIRECTORY_SET: ReadonlySet<string> = new Set(IGNORED_DIRECTORIES)

const SPEC_FILE_PATTERN = /\.spec\.ts$/

const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/

// Glob wildcards and their regex bodies: `**/` spans zero or more directories, `**` anything,
// `*` stays within one segment.
const GLOB_TOKEN_PATTERN = /(\*\*\/|\*\*|\*)/
const GLOB_TOKEN_REGEX = new Map([
  ['**/', '(?:.*/)?'],
  ['**', '.*'],
  ['*', '[^/]*'],
])
const REGEX_SPECIAL_CHARACTER_PATTERN = /[$()+.?[\\\]^{|}]/g

const patternCache = new Map<string, RegExp>()

/*
Converts a repository-relative glob into an anchored matcher, for example `src/**` or
`tsconfig.*.json`.
*/
function patternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split(GLOB_TOKEN_PATTERN)
    .map(
      (token) =>
        GLOB_TOKEN_REGEX.get(token) ??
        token.replaceAll(REGEX_SPECIAL_CHARACTER_PATTERN, String.raw`\$&`),
    )
    .join('')

  return new RegExp(`^${body}$`)
}

function getPatternRegExp(pattern: string): RegExp {
  let matcher = patternCache.get(pattern)

  if (!matcher) {
    matcher = patternToRegExp(pattern)
    patternCache.set(pattern, matcher)
  }

  return matcher
}

export function matchesAnyPattern(
  patterns: readonly string[],
  filePath: string,
): { matched: boolean; pattern: string | null } {
  for (const pattern of patterns) {
    if (getPatternRegExp(pattern).test(filePath)) {
      return { matched: true, pattern }
    }
  }

  return { matched: false, pattern: null }
}

/*
Splits NUL-delimited Git output (`-z`) into repository-relative paths. Empty entries are dropped,
so trailing and duplicated NULs are harmless.
*/
export function parseNullDelimited(output: string): string[] {
  return output.split('\0').filter((entry) => entry.length > 0)
}

/*
Deduplicates paths while preserving first-seen order, so overlap between the staged, unstaged and
untracked Git sources collapses.
*/
export function normalizeAndDedupe(filePaths: readonly string[]): string[] {
  return [...new Set(filePaths)]
}

/*
Rejects paths Git must never hand a tool: empty, absolute, or containing a `..` segment. Git only
emits repository-relative paths, so this is defense in depth; an unsafe path is a real command
failure, never a silently skipped file.
*/
export function assertSafeRepositoryPath(filePath: string): string {
  if (filePath.length === 0 || path.isAbsolute(filePath) || filePath.startsWith('/')) {
    throw new Error(`unsafe changed-file path (absolute or empty): ${JSON.stringify(filePath)}`)
  }

  if (filePath.split('/').includes('..')) {
    throw new Error(`unsafe changed-file path escapes the repository: ${JSON.stringify(filePath)}`)
  }

  return filePath
}

// Whether any path segment is a directory ignored by ESLint and Vitest (`IGNORED_DIRECTORIES`).
export function isInIgnoredDirectory(filePath: string): boolean {
  return filePath.split('/').some((segment) => IGNORED_DIRECTORY_SET.has(segment))
}

// The Vitest test-file contract (`SPEC_FILE_GLOB`): a `__tests__` segment and a `.spec.ts` basename.
export function isSpecFile(filePath: string): boolean {
  return filePath.split('/').includes('__tests__') && SPEC_FILE_PATTERN.test(filePath)
}

// Whether ESLint lints the path: a source extension outside the ignored directories.
export function isEslintEligible(filePath: string): boolean {
  return (
    SOURCE_EXTENSION_SET.has(path.extname(filePath).slice(1)) && !isInIgnoredDirectory(filePath)
  )
}

/*
Records the first fallback trigger for a state bucket. Once triggered, later matches are ignored,
so the reason stays deterministic.
*/
function triggerFallback(state: FallbackState, patterns: readonly string[], filePath: string) {
  if (state.triggered) {
    return
  }

  const match = matchesAnyPattern(patterns, filePath)

  if (!match.matched) {
    return
  }

  state.triggered = true
  state.reason = `pattern ${match.pattern} matches ${filePath}`
}

/*
Classifies repository-relative paths for the runner. Removed paths take part in classification
(fallback triggers) but are filtered from tool targets by `runnableTargets`.

Precedence:
1. Paths in an ignored directory are excluded from everything.
2. Playwright inputs (`PLAYWRIGHT_INPUT_PATTERNS`) are lint targets only: never Vitest inputs, never a fallback.
   They record `playwrightEvidence` for the optional `pnpm test:e2e` suggestion.
3. Spec files are directly changed tests (and lint targets) and never trigger a fallback.
4. A non-spec file matching a fallback pattern triggers the complete command, with the first
   matching pattern recorded as the reason.
5. Remaining ESLint-eligible files are both lint targets and `vitest related` inputs.
6. Everything else (assets, docs, other extensions) is excluded.
*/
export function classifyCandidates(
  filePaths: readonly string[],
  overrides: ClassifyOverrides = {},
): Classified {
  const fullLintPatterns = overrides.fullLintPatterns ?? FULL_LINT_FALLBACK_PATTERNS
  const fullTestPatterns = overrides.fullTestPatterns ?? FULL_TEST_FALLBACK_PATTERNS
  const playwrightPatterns = overrides.playwrightPatterns ?? PLAYWRIGHT_INPUT_PATTERNS
  const classified: Classified = {
    lintTargets: [],
    directSpecs: [],
    relatedSources: [],
    fullLint: { triggered: false, reason: null },
    fullTest: { triggered: false, reason: null },
    playwrightEvidence: { triggered: false, reason: null },
  }

  for (const filePath of filePaths) {
    if (isInIgnoredDirectory(filePath)) {
      continue
    }

    const isPlaywrightInput = matchesAnyPattern(playwrightPatterns, filePath).matched
    const isSource = !isPlaywrightInput && !isSpecFile(filePath)

    if (isPlaywrightInput) {
      triggerFallback(classified.playwrightEvidence, playwrightPatterns, filePath)
    } else if (isSource) {
      triggerFallback(classified.fullLint, fullLintPatterns, filePath)
      triggerFallback(classified.fullTest, fullTestPatterns, filePath)
    } else {
      classified.directSpecs.push(filePath)
    }

    if (!isEslintEligible(filePath)) {
      continue
    }

    if (!isSource || !classified.fullLint.triggered) {
      classified.lintTargets.push(filePath)
    }

    if (isSource && !classified.fullTest.triggered) {
      classified.relatedSources.push(filePath)
    }
  }

  return classified
}

// Invoking the developer's `git` through PATH is the intended contract of this local CLI
// (Homebrew/mise installs have no fixed binary path); the arguments come from this module's
// constants, never from user input.
const defaultGitRunner: GitRunner = (repositoryRoot, commandArguments) =>
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  spawnSync('git', [...commandArguments], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER_BYTES,
  })

/*
Runs a Git command and turns a failed invocation into a hard error. A non-Git directory or a
failed Git command is a real failure, never a successful empty change set.
*/
export function runGit(
  commandArguments: readonly string[],
  options: { repositoryRoot: string; gitRunner?: GitRunner },
): string {
  const { repositoryRoot, gitRunner = defaultGitRunner } = options
  const result = gitRunner(repositoryRoot, commandArguments)

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    const detailSuffix = detail ? `: ${detail}` : ''

    throw new Error(`git ${commandArguments.join(' ')} failed${detailSuffix}`)
  }

  return result.stdout
}

// Resolves the repository root from the current directory; throws outside a Git worktree.
export function resolveRepositoryRoot(options: { gitRunner?: GitRunner } = {}): string {
  const { gitRunner = defaultGitRunner } = options
  const result = gitRunner(process.cwd(), ['rev-parse', '--show-toplevel'])

  if (result.status !== 0) {
    const detail = (result.stderr || '').trim()
    const detailSuffix = detail ? `: ${detail}` : ''

    throw new Error(`not a Git worktree${detailSuffix}`)
  }

  return result.stdout.trim()
}

/*
Collects local work as repository-relative paths, split into paths that still exist (`present`)
and paths that were deleted or renamed away (`removed`). Renames are split into add + delete with
`--no-renames`, so both sides stay classifiable. Removed paths take part in fallback
classification only; commands never target them.
*/
export function collectLocalChanges(
  options: {
    repositoryRoot?: string
    gitRunner?: GitRunner
    exists?: (absolutePath: string) => boolean
  } = {},
): { present: string[]; removed: string[] } {
  const { gitRunner = defaultGitRunner, exists = existsSync } = options
  const repositoryRoot = options.repositoryRoot ?? resolveRepositoryRoot({ gitRunner })
  const gitOptions = { repositoryRoot, gitRunner }
  const unstaged = runGit(
    ['diff', '--name-only', '-z', '--diff-filter=ACMRD', '--no-renames'],
    gitOptions,
  )
  const staged = runGit(
    ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMRD', '--no-renames'],
    gitOptions,
  )
  const untracked = runGit(['ls-files', '--others', '--exclude-standard', '-z'], gitOptions)
  const collected = normalizeAndDedupe([
    ...parseNullDelimited(unstaged),
    ...parseNullDelimited(staged),
    ...parseNullDelimited(untracked),
  ])
  const present: string[] = []
  const removed: string[] = []

  for (const filePath of collected) {
    assertSafeRepositoryPath(filePath)

    if (exists(path.join(repositoryRoot, filePath))) {
      present.push(filePath)
    } else {
      removed.push(filePath)
    }
  }

  return { present, removed }
}

// Filters tool targets down to files that still exist on disk.
export function runnableTargets(
  classified: RunnableTargets,
  present: readonly string[],
): RunnableTargets {
  const presentFiles = new Set(present)
  const isPresent = (filePath: string) => presentFiles.has(filePath)

  return {
    lintTargets: classified.lintTargets.filter((filePath) => isPresent(filePath)),
    directSpecs: classified.directSpecs.filter((filePath) => isPresent(filePath)),
    relatedSources: classified.relatedSources.filter((filePath) => isPresent(filePath)),
  }
}

// The inclusive new-side line range of a hunk header that adds lines, otherwise null.
function parseHunkRange(line: string): [number, number] | null {
  const hunk = HUNK_HEADER_PATTERN.exec(line)

  if (!hunk) {
    return null
  }

  const start = Number(hunk[1])
  const count = hunk[2] === undefined ? 1 : Number(hunk[2])

  return count > 0 ? [start, start + count - 1] : null
}

/*
Parses `git diff -U0 --src-prefix=a/ --dst-prefix=b/` output into the line ranges each file
gained or modified. A file with only deletions maps to an empty list; files absent from the diff
(untracked) are absent from the map. Quoted (unusual-character) paths stay unmatched, so their
findings are conservatively kept.
*/
export function parseChangedLineRanges(diffOutput: string): Map<string, Array<[number, number]>> {
  const changedLines = new Map<string, Array<[number, number]>>()
  let currentRanges: Array<[number, number]> | null = null

  for (const line of diffOutput.split('\n')) {
    if (line.startsWith('+++ ')) {
      const target = line.slice(4)

      currentRanges = target.startsWith('b/') ? [] : null

      if (currentRanges) {
        changedLines.set(target.slice(2), currentRanges)
      }

      continue
    }

    const range = currentRanges ? parseHunkRange(line) : null

    if (currentRanges && range) {
      currentRanges.push(range)
    }
  }

  return changedLines
}

/*
Keeps only ESLint messages on changed lines. Files absent from `changedLines` (untracked) keep
every message; fatal and line-less messages are always kept.
*/
export function filterLintResultsToChangedLines(
  results: readonly LintResult[],
  changedLines: ReadonlyMap<string, ReadonlyArray<readonly [number, number]>>,
  toRelative: (absolutePath: string) => string,
): { results: LintResult[]; hiddenCount: number } {
  let hiddenCount = 0
  const filtered = results.map((result) => {
    const ranges = changedLines.get(toRelative(result.filePath))

    if (ranges === undefined) {
      return result
    }

    const messages = result.messages.filter(
      ({ fatal, line }) =>
        fatal === true ||
        line === undefined ||
        ranges.some(([start, end]) => line >= start && line <= end),
    )

    hiddenCount += result.messages.length - messages.length

    return { ...result, messages }
  })

  return { results: filtered, hiddenCount }
}

// Optional smoke suggestion for Playwright inputs; it never changes the lint or unit scope.
export function formatPlaywrightNotice(reason: string): string {
  return `[changed-check] optional Playwright smoke: consider \`pnpm test:e2e\` (${reason})`
}

function resolveToolBin(repositoryRoot: string, mode: 'lint' | 'test'): string {
  return mode === 'lint'
    ? path.join(repositoryRoot, 'node_modules', 'eslint', 'bin', 'eslint.js')
    : path.join(repositoryRoot, 'node_modules', 'vitest', 'vitest.mjs')
}

// Runs a Node tool with inherited stdio and returns its exit code; a signal crash is exit 1.
function runTool(repositoryRoot: string, command: readonly string[]): number {
  const result = spawnSync(process.execPath, [...command], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`[changed-check] failed to launch ${command[0]}: ${result.error.message}`)

    return 1
  }

  if (result.status === null) {
    console.error(`[changed-check] ${command[0]} was terminated by a signal`)

    return 1
  }

  return result.status
}

/*
Prefixes a repository-relative path with `./` so a target can never be parsed as a tool flag,
while ESLint and Vitest still match it as a filter.
*/
function asTargetArgument(filePath: string): string {
  return `./${filePath}`
}

/*
Prints filtered ESLint results as `path` / `line:col severity message rule` and returns the gate's
exit code: 1 when an error-severity or fatal message remains on a changed line, otherwise 0.
*/
function reportChangedLineResults(
  results: readonly LintResult[],
  toRelative: (absolutePath: string) => string,
  hiddenCount: number,
): number {
  let errorCount = 0
  let warningCount = 0

  for (const result of results) {
    if (result.messages.length === 0) {
      continue
    }

    console.log(`\n${toRelative(result.filePath)}`)

    for (const message of result.messages) {
      const isError = message.fatal === true || message.severity === ESLINT_SEVERITY_ERROR

      if (isError) {
        errorCount += 1
      } else {
        warningCount += 1
      }

      const location = `${message.line ?? 0}:${message.column ?? 0}`
      const detail = `${message.message}  ${message.ruleId ?? ''}`.trimEnd()

      console.log(`  ${location}  ${isError ? 'error' : 'warning'}  ${detail}`)
    }
  }

  console.log(
    `\n[changed-check] ${errorCount} error(s), ${warningCount} warning(s) on changed lines; ` +
      `${hiddenCount} pre-existing finding(s) on unchanged lines hidden`,
  )

  return errorCount > 0 ? 1 : 0
}

/*
Lints the changed files with ESLint's JSON formatter and reports only findings on lines the local
work added or modified (untracked files: every line). Debt on untouched lines never fails the gate.
*/
function runChangedLinesLint(
  repositoryRoot: string,
  toolBin: string,
  lintTargets: readonly string[],
): number {
  let changedLines: Map<string, Array<[number, number]>>

  try {
    changedLines = parseChangedLineRanges(
      runGit(
        [
          'diff',
          'HEAD',
          '-U0',
          '--no-color',
          '--no-ext-diff',
          '--no-renames',
          '--src-prefix=a/',
          '--dst-prefix=b/',
          '--',
          ...lintTargets,
        ],
        { repositoryRoot },
      ),
    )
  } catch (error) {
    console.error(`[changed-check] ${error instanceof Error ? error.message : String(error)}`)

    return 1
  }

  const result = spawnSync(
    process.execPath,
    [
      toolBin,
      '--format',
      'json',
      '--',
      ...lintTargets.map((filePath) => asTargetArgument(filePath)),
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER_BYTES,
      stdio: ['inherit', 'pipe', 'inherit'],
    },
  )

  // ESLint exits 0 (clean) or 1 (lint errors) with JSON output; anything else is a crash.
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    process.stdout.write(result.stdout ?? '')
    console.error('[changed-check] eslint failed before producing lint results')

    return result.status || 1
  }

  let results: LintResult[]

  try {
    results = JSON.parse(result.stdout) as LintResult[]
  } catch {
    process.stdout.write(result.stdout)
    console.error('[changed-check] could not parse eslint JSON output')

    return 1
  }

  const toRelative = (absolutePath: string) => path.relative(repositoryRoot, absolutePath)
  const filtered = filterLintResultsToChangedLines(results, changedLines, toRelative)

  return reportChangedLineResults(filtered.results, toRelative, filtered.hiddenCount)
}

function runLintMode(
  repositoryRoot: string,
  toolBin: string,
  { lintTargets, fullLint }: Pick<Classified, 'lintTargets' | 'fullLint'>,
  isChangedLinesOnly: boolean,
): number {
  if (fullLint.triggered) {
    console.log(`[changed-check] full lint fallback: ${fullLint.reason}`)
    console.log('[changed-check] running eslint .')

    return runTool(repositoryRoot, [toolBin, '.'])
  }

  if (lintTargets.length === 0) {
    console.log('[changed-check] no eligible changed files; nothing to lint')

    return 0
  }

  if (isChangedLinesOnly) {
    console.log(`[changed-check] linting changed lines of ${lintTargets.length} file(s)`)

    return runChangedLinesLint(repositoryRoot, toolBin, lintTargets)
  }

  console.log(`[changed-check] linting ${lintTargets.length} changed file(s)`)

  return runTool(repositoryRoot, [
    toolBin,
    '--',
    ...lintTargets.map((filePath) => asTargetArgument(filePath)),
  ])
}

function runTestMode(
  repositoryRoot: string,
  toolBin: string,
  {
    directSpecs,
    relatedSources,
    fullTest,
  }: Pick<Classified, 'directSpecs' | 'relatedSources' | 'fullTest'>,
): number {
  if (fullTest.triggered) {
    console.log(`[changed-check] full test fallback: ${fullTest.reason}`)
    console.log('[changed-check] running vitest run')

    return runTool(repositoryRoot, [toolBin, 'run'])
  }

  if (directSpecs.length === 0 && relatedSources.length === 0) {
    console.log('[changed-check] no directly changed or related tests; nothing to run')

    return 0
  }

  // One `vitest related` call over the union of changed specs and changed sources: Vitest matches
  // a spec against itself and its reverse dependencies, so each spec runs exactly once.
  // `--passWithNoTests` keeps the no-op contract when changed sources have no related tests.
  const targets = [...directSpecs, ...relatedSources].map((filePath) => asTargetArgument(filePath))

  console.log(
    `[changed-check] running ${directSpecs.length} directly changed test file(s) and ` +
      `tests related to ${relatedSources.length} changed source file(s)`,
  )

  return runTool(repositoryRoot, [toolBin, 'related', '--passWithNoTests', ...targets])
}

/*
CLI entry point. `lint` runs ESLint over eligible changed files (or the full scope when a
lint-policy input changed); `--changed-lines` limits reported findings to lines the local work
touched. `test` runs directly changed specs plus statically related tests, or the full suite when
a discovery input changed. Empty eligible sets are a successful no-op; tool and Git failures
propagate their exit codes.
*/
function main(): number {
  const [mode, ...flags] = process.argv.slice(2)
  const isChangedLinesOnly = mode === 'lint' && flags[0] === '--changed-lines'
  const hasUnknownFlags = flags.length !== (isChangedLinesOnly ? 1 : 0)

  if (hasUnknownFlags || (mode !== 'lint' && mode !== 'test')) {
    console.error('Usage: node scripts/run-changed-check.ts <lint [--changed-lines]|test>')

    return 2
  }

  let repositoryRoot: string
  let localChanges: { present: string[]; removed: string[] }

  try {
    repositoryRoot = resolveRepositoryRoot()
    localChanges = collectLocalChanges({ repositoryRoot })
  } catch (error) {
    console.error(`[changed-check] ${error instanceof Error ? error.message : String(error)}`)

    return 1
  }

  const classified = classifyCandidates([...localChanges.present, ...localChanges.removed])
  const targets = runnableTargets(classified, localChanges.present)
  const toolBin = resolveToolBin(repositoryRoot, mode)

  if (mode === 'lint') {
    return runLintMode(repositoryRoot, toolBin, { ...classified, ...targets }, isChangedLinesOnly)
  }

  if (classified.playwrightEvidence.reason) {
    console.log(formatPlaywrightNotice(classified.playwrightEvidence.reason))
  }

  return runTestMode(repositoryRoot, toolBin, { ...classified, ...targets })
}

// `realpathSync` keeps the entry check correct when the script is reached through a symlink
// (for example macOS `/tmp` -> `/private/tmp`).
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(import.meta.filename)) {
  process.exitCode = main()
}
