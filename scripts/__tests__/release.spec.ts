// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  bumpVersion,
  cutChangelog,
  isLevel,
  localDate,
  setPackageVersion,
  suggestLevel,
  unreleasedBody,
} from '../release.ts'

const REPO = 'https://github.com/owner/repo'

const CHANGELOG = `# Changelog

A release renames \`## [Unreleased]\` and is not a heading.

## [Unreleased]

### Fixed

- A fix.

## [1.2.0] - 2026-11-21

### Added

- A thing.

[unreleased]: ${REPO}/compare/v1.2.0...HEAD
[1.2.0]: ${REPO}/compare/v1.1.0...v1.2.0
`

describe('isLevel', () => {
  it('accepts the three levels only', () => {
    expect(['patch', 'minor', 'major'].every((level) => isLevel(level))).toBe(true)
    expect(isLevel('prerelease')).toBe(false)
    expect(isLevel(undefined)).toBe(false)
  })
})

describe('bumpVersion', () => {
  it('bumps each level and resets the lower parts', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
  })

  it('rejects a version that is not X.Y.Z', () => {
    expect(() => bumpVersion('1.2.3-beta.1', 'patch')).toThrow('not X.Y.Z')
  })
})

describe('unreleasedBody', () => {
  it('returns the text up to the next release heading', () => {
    expect(unreleasedBody(CHANGELOG)).toBe('### Fixed\n\n- A fix.')
  })

  it('is empty when nothing is unreleased', () => {
    const empty = CHANGELOG.replace('### Fixed\n\n- A fix.\n\n', '')

    expect(unreleasedBody(empty)).toBe('')
  })

  it('stops at the link references when no release follows', () => {
    const first = `## [Unreleased]\n\n### Added\n\n- New.\n\n[unreleased]: ${REPO}/commits/HEAD\n`

    expect(unreleasedBody(first)).toBe('### Added\n\n- New.')
  })

  it('throws without an Unreleased heading', () => {
    expect(() => unreleasedBody('# Changelog\n')).toThrow('no "## [Unreleased]"')
  })
})

describe('suggestLevel', () => {
  it('suggests patch when only Fixed or Security groups are present', () => {
    expect(suggestLevel('### Fixed\n\n- a\n\n### Security\n\n- b')).toBe('patch')
  })

  it('suggests minor when any other group is present', () => {
    expect(suggestLevel('### Changed\n\n- a\n\n### Fixed\n\n- b')).toBe('minor')
    expect(suggestLevel('### Added\n\n- a')).toBe('minor')
  })
})

describe('cutChangelog', () => {
  it('dates the release under a fresh Unreleased heading and updates the links', () => {
    const cut = cutChangelog(CHANGELOG, { previous: '1.2.0', next: '1.2.1', date: '2026-11-22' })

    expect(cut).toContain('## [Unreleased]\n\n## [1.2.1] - 2026-11-22\n\n### Fixed\n\n- A fix.')
    expect(cut).toContain(
      `[unreleased]: ${REPO}/compare/v1.2.1...HEAD\n` +
        `[1.2.1]: ${REPO}/compare/v1.2.0...v1.2.1\n` +
        `[1.2.0]: ${REPO}/compare/v1.1.0...v1.2.0\n`,
    )
    expect(unreleasedBody(cut)).toBe('')
  })

  it('leaves the intro text alone', () => {
    const cut = cutChangelog(CHANGELOG, { previous: '1.2.0', next: '1.2.1', date: '2026-11-22' })

    expect(cut).toContain('A release renames `## [Unreleased]` and is not a heading.')
  })

  it('throws without an unreleased compare link', () => {
    const noLinks = CHANGELOG.replaceAll(/^\[.*$/gm, '')

    expect(() =>
      cutChangelog(noLinks, { previous: '1.2.0', next: '1.2.1', date: '2026-11-22' }),
    ).toThrow('no "[unreleased]')
  })
})

describe('setPackageVersion', () => {
  it('changes only the version string', () => {
    const packageJson = '{\n  "name": "app",\n  "version": "1.2.0",\n  "private": true\n}\n'

    expect(setPackageVersion(packageJson, { previous: '1.2.0', next: '1.3.0' })).toBe(
      '{\n  "name": "app",\n  "version": "1.3.0",\n  "private": true\n}\n',
    )
  })

  it('throws when the version field does not hold the current version', () => {
    expect(() => setPackageVersion('{}', { previous: '1.0.0', next: '1.0.1' })).toThrow(
      'no "version": "1.0.0"',
    )
  })
})

describe('localDate', () => {
  it('formats the local date with padded month and day', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
