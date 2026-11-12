// @vitest-environment node
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const HELPER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../run-changed-check.ts',
)

// Records the exact argv the runner passes, prints optional stdout and exits with a chosen code.
const ESLINT_STUB = [
  'const fs = require("node:fs");',
  'fs.writeFileSync(process.env.CHANGED_STUB_LOG, JSON.stringify(process.argv.slice(2)));',
  'process.stdout.write(process.env.CHANGED_STUB_STDOUT || "");',
  'process.exit(Number(process.env.CHANGED_STUB_EXIT || "0"));',
].join('\n')

const VITEST_STUB = [
  'import fs from "node:fs";',
  'fs.writeFileSync(process.env.CHANGED_STUB_LOG, JSON.stringify(process.argv.slice(2)));',
  'process.exit(Number(process.env.CHANGED_STUB_EXIT || "0"));',
].join('\n')

type StubOptions = { exitCode?: number; stdout?: string }

function runGitCommand(repositoryRoot: string, commandArguments: readonly string[]) {
  // Invoking the developer's `git` through PATH is the intended contract of this test harness;
  // the arguments come from this module's constants.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync('git', commandArguments, { cwd: repositoryRoot, encoding: 'utf8' })

  if (result.status !== 0) {
    throw new Error(`git ${commandArguments.join(' ')} failed: ${result.stderr}`)
  }
}

/*
An isolated Git worktree whose `node_modules` hold argv-recording ESLint and Vitest stubs, so Git
collection, classification, argument passing, fallback decisions and exit propagation are
exercised without the real tools or the machine's worktree state.
*/
function createScaffold() {
  const worktreeRoot = mkdtempSync(path.join(os.tmpdir(), 'changed-check-int-'))
  const stubLogPath = path.join(worktreeRoot, '.cache', 'stub-arguments.json')

  runGitCommand(worktreeRoot, ['init', '-b', 'main', '-q'])
  runGitCommand(worktreeRoot, ['config', 'user.email', 'test@example.com'])
  runGitCommand(worktreeRoot, ['config', 'user.name', 'Changed Check Test'])
  runGitCommand(worktreeRoot, ['config', 'commit.gpgsign', 'false'])

  writeFileAt(worktreeRoot, '.gitignore', 'node_modules\n.cache\n')
  writeFileAt(worktreeRoot, 'eslint.config.ts', '// lint policy\n')
  writeFileAt(worktreeRoot, 'src/main.ts', 'export {}\n')
  writeFileAt(worktreeRoot, 'node_modules/eslint/bin/eslint.js', ESLINT_STUB)
  writeFileAt(worktreeRoot, 'node_modules/vitest/vitest.mjs', VITEST_STUB)
  mkdirSync(path.dirname(stubLogPath), { recursive: true })

  runGitCommand(worktreeRoot, ['add', '-A'])
  runGitCommand(worktreeRoot, ['commit', '-m', 'scaffold', '-q'])

  return { worktreeRoot, stubLogPath }
}

function writeFileAt(root: string, relativePath: string, contents = 'export {}\n') {
  const absolutePath = path.join(root, relativePath)

  mkdirSync(path.dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, contents)
}

function runHelper(
  cwd: string,
  stubLogPath: string,
  helperArguments: readonly string[],
  { exitCode = 0, stdout = '' }: StubOptions = {},
) {
  return spawnSync(process.execPath, [HELPER_PATH, ...helperArguments], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHANGED_STUB_LOG: stubLogPath,
      CHANGED_STUB_EXIT: String(exitCode),
      CHANGED_STUB_STDOUT: stdout,
    },
  })
}

function useScaffold() {
  const scaffold = { worktreeRoot: '', stubLogPath: '' }

  beforeEach(() => {
    Object.assign(scaffold, createScaffold())
  })

  afterEach(() => {
    rmSync(scaffold.worktreeRoot, { recursive: true, force: true })
  })

  return {
    write: (relativePath: string, contents?: string) =>
      writeFileAt(scaffold.worktreeRoot, relativePath, contents),
    commit: (relativePath: string, contents?: string) => {
      writeFileAt(scaffold.worktreeRoot, relativePath, contents)
      runGitCommand(scaffold.worktreeRoot, ['add', relativePath])
      runGitCommand(scaffold.worktreeRoot, ['commit', '-m', `add ${relativePath}`, '-q'])
    },
    git: (commandArguments: readonly string[]) =>
      runGitCommand(scaffold.worktreeRoot, commandArguments),
    run: (helperArguments: readonly string[], options?: StubOptions) =>
      runHelper(scaffold.worktreeRoot, scaffold.stubLogPath, helperArguments, options),
    readArguments: (): string[] | null =>
      existsSync(scaffold.stubLogPath)
        ? (JSON.parse(readFileSync(scaffold.stubLogPath, 'utf8')) as string[])
        : null,
    root: () => scaffold.worktreeRoot,
  }
}

describe('run-changed-check integration (lint mode)', () => {
  const scaffold = useScaffold()
  const lint = (options?: StubOptions) => scaffold.run(['lint'], options)

  it('succeeds as a no-op when no local changes exist', () => {
    const result = lint()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('no eligible changed files')
    expect(scaffold.readArguments()).toBeNull()
  })

  it('succeeds as a no-op when only non-lintable files changed', () => {
    scaffold.write('README.md', '# notes\n')
    scaffold.write('src/style.css', 'h1 {}\n')

    const result = lint()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('no eligible changed files')
    expect(scaffold.readArguments()).toBeNull()
  })

  it('lints an untracked file with an argument-safe target', () => {
    scaffold.write('src/new.ts')

    const result = lint()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('linting 1 changed file(s)')
    expect(scaffold.readArguments()).toEqual(['--', './src/new.ts'])
  })

  it('lints staged tracked edits', () => {
    scaffold.write('src/staged.ts')
    scaffold.git(['add', 'src/staged.ts'])

    expect(lint().status).toBe(0)
    expect(scaffold.readArguments()).toEqual(['--', './src/staged.ts'])
  })

  it('lints unstaged tracked edits', () => {
    scaffold.write('src/main.ts', 'export const value = 2\n')

    expect(lint().status).toBe(0)
    expect(scaffold.readArguments()).toEqual(['--', './src/main.ts'])
  })

  it('lints the destination path of a renamed file', () => {
    scaffold.git(['mv', 'src/main.ts', 'src/renamed.ts'])

    expect(lint().status).toBe(0)
    expect(scaffold.readArguments()).toEqual(['--', './src/renamed.ts'])
  })

  it('excludes deleted paths from lint targets', () => {
    scaffold.git(['rm', '-q', 'src/main.ts'])

    const result = lint()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('no eligible changed files')
    expect(scaffold.readArguments()).toBeNull()
  })

  it('excludes ignored directories at root and nested depths', () => {
    scaffold.write('dist/assets/index.js')
    scaffold.write('src/nested/coverage/report.ts')
    scaffold.write('.claude/skills/x/script.js')
    scaffold.write('.dsh/run.mjs')

    const result = lint()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('no eligible changed files')
    expect(scaffold.readArguments()).toBeNull()
  })

  it.each([
    ['eslint.config.ts', '// changed policy\n'],
    ['.prettierrc.json', '{}\n'],
    ['package.json', '{}\n'],
    ['tsconfig.app.json', '{}\n'],
  ])('runs the complete lint scope when the lint input %s changed', (file, contents) => {
    scaffold.write(file, contents)

    const result = lint()

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(
      new RegExp(String.raw`full lint fallback: pattern \S+ matches ${file}`),
    )
    expect(scaffold.readArguments()).toEqual(['.'])
  })

  it('retains the full lint fallback for a deleted lint policy', () => {
    scaffold.git(['rm', '-q', 'eslint.config.ts'])

    const result = lint()

    expect(result.stdout).toContain('full lint fallback')
    expect(scaffold.readArguments()).toEqual(['.'])
  })

  it('lints only the changed Vite configuration instead of the complete scope', () => {
    scaffold.write('vite.config.ts')

    const result = lint()

    expect(result.stdout).not.toContain('full lint fallback')
    expect(scaffold.readArguments()).toEqual(['--', './vite.config.ts'])
  })

  it('lints a Playwright input without a fallback or a smoke suggestion', () => {
    scaffold.write('e2e/vue.spec.ts')

    const result = lint()

    expect(result.stdout).not.toContain('optional Playwright smoke')
    expect(scaffold.readArguments()).toEqual(['--', './e2e/vue.spec.ts'])
  })

  it('passes file names with spaces and leading dashes as single safe arguments', () => {
    scaffold.write('src/with space.ts')
    scaffold.write('src/-dash.ts')

    expect(lint().status).toBe(0)
    expect(scaffold.readArguments()).toEqual(['--', './src/-dash.ts', './src/with space.ts'])
  })

  it('propagates ESLint failure exit codes', () => {
    scaffold.write('src/bad.ts')

    expect(lint({ exitCode: 1 }).status).toBe(1)
  })

  function lintResult(file: string, lines: readonly number[]) {
    const filePath = path.join(realpathSync(scaffold.root()), file)
    const messages = lines.map((line) => ({
      line,
      column: 1,
      severity: 2,
      message: `finding on ${line}`,
      ruleId: 'stub/rule',
    }))

    return JSON.stringify([{ filePath, messages }])
  }

  const lintChangedLines = (stdout: string, exitCode = 1) =>
    scaffold.run(['lint', '--changed-lines'], { stdout, exitCode })

  describe('--changed-lines', () => {
    beforeEach(() => {
      scaffold.commit('src/a.ts', 'one\ntwo\nthree\n')
      scaffold.write('src/a.ts', 'one\nTWO\nthree\n')
    })

    it('fails only for findings on changed lines and hides pre-existing ones', () => {
      const result = lintChangedLines(lintResult('src/a.ts', [1, 2]))

      expect(result.status).toBe(1)
      expect(scaffold.readArguments()).toEqual(['--format', 'json', '--', './src/a.ts'])
      expect(result.stdout).toContain('2:1  error  finding on 2  stub/rule')
      expect(result.stdout).not.toContain('finding on 1')
      expect(result.stdout).toContain('1 pre-existing finding(s) on unchanged lines hidden')
    })

    it('passes when every finding is on an unchanged line', () => {
      const result = lintChangedLines(lintResult('src/a.ts', [1, 3]))

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('0 error(s), 0 warning(s) on changed lines')
    })

    it('reports every finding of an untracked file', () => {
      scaffold.write('src/new.ts', 'x\ny\n')

      const result = lintChangedLines(lintResult('src/new.ts', [1, 2]))

      expect(result.status).toBe(1)
      expect(result.stdout).toContain('finding on 1')
      expect(result.stdout).toContain('finding on 2')
    })

    it('propagates an ESLint crash', () => {
      expect(lintChangedLines('', 2).status).toBe(2)
    })

    it('fails when ESLint output is not JSON', () => {
      const result = lintChangedLines('not json', 0)

      expect(result.status).toBe(1)
      expect(result.stderr).toContain('could not parse eslint JSON output')
    })
  })

  it('exits with usage code 2 for an unknown flag', () => {
    const result = scaffold.run(['test', '--changed-lines'])

    expect(result.status).toBe(2)
    expect(result.stderr).toContain('Usage:')
  })

  it('exits with usage code 2 for an invalid mode', () => {
    const result = scaffold.run(['audit'])

    expect(result.status).toBe(2)
    expect(result.stderr).toContain('Usage:')
  })

  it('fails when run outside a Git worktree', () => {
    const outside = mkdtempSync(path.join(os.tmpdir(), 'changed-check-outside-'))

    try {
      const result = runHelper(outside, path.join(outside, 'log.json'), ['lint'])

      expect(result.status).toBe(1)
      expect(result.stderr).toContain('not a Git worktree')
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  })
})

describe('run-changed-check integration (test mode)', () => {
  const scaffold = useScaffold()
  const test = (options?: StubOptions) => scaffold.run(['test'], options)

  it('succeeds as a no-op when no local changes exist', () => {
    const result = test()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('no directly changed or related tests')
    expect(scaffold.readArguments()).toBeNull()
  })

  it('succeeds as a no-op when only non-source files changed', () => {
    scaffold.write('docs/notes.md', '# notes\n')
    scaffold.write('src/style.css', 'h1 {}\n')

    expect(test().status).toBe(0)
    expect(scaffold.readArguments()).toBeNull()
  })

  it('runs an untracked spec file directly', () => {
    scaffold.write('src/__tests__/new.spec.ts')

    const result = test()

    expect(result.stdout).toContain('running 1 directly changed test file(s)')
    expect(scaffold.readArguments()).toEqual([
      'related',
      '--passWithNoTests',
      './src/__tests__/new.spec.ts',
    ])
  })

  it('combines direct specs and changed sources in one related invocation', () => {
    scaffold.write('src/__tests__/a.spec.ts')
    scaffold.write('src/main.ts', 'export const changed = true\n')

    const result = test()

    expect(result.stdout).toContain('tests related to 1 changed source file(s)')
    expect(scaffold.readArguments()).toEqual([
      'related',
      '--passWithNoTests',
      './src/__tests__/a.spec.ts',
      './src/main.ts',
    ])
  })

  it.each([
    'vite.config.ts',
    'vitest.config.ts',
    'environment.d.ts',
    'package.json',
    'src/audio/decode.worker.ts',
  ])('runs the complete suite and reports the reason when %s changed', (file) => {
    scaffold.write(file)

    const result = test()

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(
      new RegExp(String.raw`full test fallback: pattern \S+ matches ${file}`),
    )
    expect(scaffold.readArguments()).toEqual(['run'])
  })

  it('keeps the full fallback for a deleted fallback input', () => {
    scaffold.commit('vite.config.ts')
    scaffold.git(['rm', '-q', 'vite.config.ts'])

    expect(test().stdout).toContain('full test fallback')
    expect(scaffold.readArguments()).toEqual(['run'])
  })

  it('treats a lint-only policy file as an ordinary related source', () => {
    scaffold.write('eslint.config.ts', '// changed policy\n')

    const result = test()

    expect(result.stdout).not.toContain('full test fallback')
    expect(scaffold.readArguments()).toEqual(['related', '--passWithNoTests', './eslint.config.ts'])
  })

  it('prints the Playwright suggestion and runs nothing for a changed e2e spec', () => {
    scaffold.write('e2e/vue.spec.ts')

    const result = test()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain(
      'optional Playwright smoke: consider `pnpm test:e2e` (pattern e2e/** matches e2e/vue.spec.ts)',
    )
    expect(scaffold.readArguments()).toBeNull()
  })

  it('prints the Playwright suggestion once and still runs related tests for sources', () => {
    scaffold.write('playwright.config.ts')
    scaffold.write('e2e/vue.spec.ts')
    scaffold.write('src/main.ts', 'export const changed = true\n')

    const result = test()

    expect(result.stdout.split('optional Playwright smoke')).toHaveLength(2)
    expect(scaffold.readArguments()).toEqual(['related', '--passWithNoTests', './src/main.ts'])
  })

  it('prints no suggestion for an ordinary source', () => {
    scaffold.write('src/main.ts', 'export const changed = true\n')

    expect(test().stdout).not.toContain('optional Playwright smoke')
  })

  it('targets only the surviving path of a renamed source', () => {
    scaffold.git(['mv', 'src/main.ts', 'src/entry.ts'])

    expect(test().status).toBe(0)
    expect(scaffold.readArguments()).toEqual(['related', '--passWithNoTests', './src/entry.ts'])
  })

  it('runs nothing for a deleted spec', () => {
    scaffold.commit('src/__tests__/old.spec.ts')
    scaffold.git(['rm', '-q', 'src/__tests__/old.spec.ts'])

    expect(test().stdout).toContain('no directly changed or related tests')
    expect(scaffold.readArguments()).toBeNull()
  })

  it('propagates Vitest failure exit codes', () => {
    scaffold.write('src/__tests__/a.spec.ts')

    expect(test({ exitCode: 1 }).status).toBe(1)
  })

  it('propagates a full-suite Vitest failure exit code', () => {
    scaffold.write('vitest.config.ts')

    expect(test({ exitCode: 1 }).status).toBe(1)
    expect(scaffold.readArguments()).toEqual(['run'])
  })
})
