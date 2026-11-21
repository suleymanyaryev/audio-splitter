/*
Cuts a release on `main`, following the rules at the top of `CHANGELOG.md`.

Usage:
  node scripts/release.ts <patch|minor|major> [--dry-run]

It turns `## [Unreleased]` into `## [X.Y.Z] - YYYY-MM-DD` under a fresh `## [Unreleased]`, updates
the compare links at the bottom, sets `version` in `package.json`, commits `chore: release X.Y.Z`
and tags `vX.Y.Z`. It never pushes: pushing the tag publishes to GitHub Pages, so it prints the
command instead. `--dry-run` prints what would change and touches nothing.

The level stays your choice; the script only warns when the changelog's groups suggest another
one. The pure helpers are exported for unit coverage.
*/
// The script is a CLI whose contract is status output, so the project-wide console policy is
// waived here.
/* eslint-disable no-console */
import { spawnSync } from 'node:child_process'
import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export type Level = 'patch' | 'minor' | 'major'

const LEVELS = new Set<string>(['patch', 'minor', 'major'])

const UNRELEASED_HEADING = '## [Unreleased]'

// The heading on a line of its own; the intro of CHANGELOG.md mentions it in backticks.
const UNRELEASED_LINE = /^## \[Unreleased\]$/m

// Keep a Changelog groups that hold only fixes; any other group is a capability change.
const PATCH_GROUPS = new Set(['Fixed', 'Security'])

export function isLevel(value: string | undefined): value is Level {
  return value !== undefined && LEVELS.has(value)
}

export function bumpVersion(current: string, level: Level): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current)

  if (!match) {
    throw new Error(`package.json version "${current}" is not X.Y.Z`)
  }

  const [major, minor, patch] = match.slice(1).map(Number) as [number, number, number]

  const bumped = {
    major: [major + 1, 0, 0],
    minor: [major, minor + 1, 0],
    patch: [major, minor, patch + 1],
  }[level]

  return bumped.join('.')
}

// The text between `## [Unreleased]` and the next `## ` heading or link reference.
export function unreleasedBody(changelog: string): string {
  const heading = UNRELEASED_LINE.exec(changelog)

  if (!heading) {
    throw new Error(`CHANGELOG.md has no "${UNRELEASED_HEADING}" heading`)
  }

  const rest = changelog.slice(heading.index + heading[0].length)
  const end = rest.search(/^(## |\[unreleased\]:)/m)

  return (end === -1 ? rest : rest.slice(0, end)).trim()
}

// Minor when a group other than Fixed or Security is present, otherwise patch. Major is a
// milestone decision no changelog can make, so it is never suggested.
export function suggestLevel(body: string): Level {
  const hasCapability = body
    .matchAll(/^### (.+)$/gm)
    .some((match) => !PATCH_GROUPS.has(match[1]!.trim()))

  return hasCapability ? 'minor' : 'patch'
}

export function cutChangelog(
  changelog: string,
  { previous, next, date }: { previous: string; next: string; date: string },
): string {
  const linkMatch = /^\[unreleased\]: (\S+)\/compare\/v\d+\.\d+\.\d+\.\.\.HEAD$/m.exec(changelog)

  if (!linkMatch) {
    throw new Error('CHANGELOG.md has no "[unreleased]: <repo>/compare/vX.Y.Z...HEAD" link')
  }

  const repository = linkMatch[1]!

  // Replacer functions, so a `$` in the inserted text is never read as a pattern.
  return changelog
    .replace(UNRELEASED_LINE, () => `${UNRELEASED_HEADING}\n\n## [${next}] - ${date}`)
    .replace(
      linkMatch[0],
      () =>
        `[unreleased]: ${repository}/compare/v${next}...HEAD\n` +
        `[${next}]: ${repository}/compare/v${previous}...v${next}`,
    )
}

// Replaces only the version string, so the rest of package.json keeps its formatting.
export function setPackageVersion(
  packageJson: string,
  { previous, next }: { previous: string; next: string },
): string {
  const field = `"version": "${previous}"`

  if (!packageJson.includes(field)) {
    throw new Error(`package.json has no ${field} to replace`)
  }

  return packageJson.replace(field, () => `"version": "${next}"`)
}

// Today as YYYY-MM-DD in local time, the date the person releasing sees.
export function localDate(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function git(repositoryRoot: string, commandArguments: readonly string[]): string {
  // Running the developer's `git` through PATH is the contract of this local CLI (Homebrew and
  // mise installs have no fixed path); the arguments come from this module, never from input.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync('git', commandArguments, { cwd: repositoryRoot, encoding: 'utf8' })

  if (result.status !== 0) {
    throw new Error(`git ${commandArguments.join(' ')} failed: ${result.stderr.trim()}`)
  }

  return result.stdout.trim()
}

function assertReadyToRelease(repositoryRoot: string, tag: string): void {
  const branch = git(repositoryRoot, ['branch', '--show-current'])

  if (branch !== 'main') {
    throw new Error(`releases are cut on main, not "${branch}"`)
  }

  if (git(repositoryRoot, ['status', '--porcelain']) !== '') {
    throw new Error('the working tree has uncommitted changes; commit or stash them first')
  }

  if (git(repositoryRoot, ['tag', '--list', tag]) !== '') {
    throw new Error(`tag ${tag} already exists`)
  }
}

function main(): number {
  const [levelArgument, ...flags] = process.argv.slice(2)
  const isDryRun = flags.length === 1 && flags[0] === '--dry-run'

  if (!isLevel(levelArgument) || (!isDryRun && flags.length > 0)) {
    console.error('Usage: pnpm release <patch|minor|major> [--dry-run]')

    return 2
  }

  try {
    const repositoryRoot = git(process.cwd(), ['rev-parse', '--show-toplevel'])
    const changelogPath = path.join(repositoryRoot, 'CHANGELOG.md')
    const packagePath = path.join(repositoryRoot, 'package.json')
    const changelog = readFileSync(changelogPath, 'utf8')
    const packageJson = readFileSync(packagePath, 'utf8')

    const previous = (JSON.parse(packageJson) as { version: string }).version
    const next = bumpVersion(previous, levelArgument)
    const tag = `v${next}`
    const body = unreleasedBody(changelog)

    if (body === '') {
      throw new Error(`"${UNRELEASED_HEADING}" is empty; there is nothing to release`)
    }

    const suggested = suggestLevel(body)

    if (levelArgument !== 'major' && levelArgument !== suggested) {
      console.warn(
        `[release] warning: the changelog's groups suggest ${suggested}, not ${levelArgument}`,
      )
    }

    const date = localDate(new Date())

    if (isDryRun) {
      console.log(`[release] dry run: ${previous} -> ${next} (${tag}), dated ${date}`)
      console.log(`[release] would release:\n\n${body}\n`)

      return 0
    }

    assertReadyToRelease(repositoryRoot, tag)

    writeFileSync(changelogPath, cutChangelog(changelog, { previous, next, date }))
    writeFileSync(packagePath, setPackageVersion(packageJson, { previous, next }))
    git(repositoryRoot, ['add', 'CHANGELOG.md', 'package.json'])
    git(repositoryRoot, ['commit', '--quiet', '-m', `chore: release ${next}`])

    // A message makes the tag annotated, which `tag.gpgSign` needs, and names the release.
    try {
      git(repositoryRoot, ['tag', '-m', `Release ${next}`, tag])
    } catch (error) {
      console.error(
        `[release] committed ${next} but could not tag it. Fix the cause, then run ` +
          `git tag -m "Release ${next}" ${tag}, or undo with git reset --hard HEAD~1`,
      )
      throw error
    }

    console.log(`[release] committed and tagged ${tag}. Push it to publish to GitHub Pages:`)
    console.log(`  git push --atomic origin main ${tag}`)

    return 0
  } catch (error) {
    console.error(`[release] ${error instanceof Error ? error.message : String(error)}`)

    return 1
  }
}

// `realpathSync` keeps the entry check correct when the script is reached through a symlink.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(import.meta.filename)) {
  process.exitCode = main()
}
