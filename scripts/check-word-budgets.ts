/*
Fails when a doc, AGENTS.md or a project skill grows past its word budget.
Agents update docs by adding, so growth is the first sign of sediment; a budget makes it a
deliberate edit to this file that shows in the diff. Words are counted as `wc -w` counts them.
*/
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// The contract and the docs: about 10% above their size after the concise-docs cleanup.
const BUDGETS: Record<string, number> = {
  'AGENTS.md': 1100,
  'README.md': 850,
  'GLOSSARY.md': 1450,
  'DESIGN.md': 4900,
  'docs/architecture.md': 1350,
  '.agents/skills/canvas-view/SKILL.md': 650,
  '.agents/skills/ffmpeg-session/SKILL.md': 450,
  '.agents/skills/store-wiring/SKILL.md': 800,
  '.agents/skills/finish-feature/SKILL.md': 750,
  '.agents/skills/github-prs/SKILL.md': 650,
  '.agents/skills/github-issues/SKILL.md': 550,
}

// A concept note is a fixed lesson, so its budget is its own size rounded up to the next 50.
const CONCEPT_NOTE_BUDGETS: Record<string, number> = {
  '01-sound-is-numbers.md': 650,
  '02-long-files.md': 1050,
  '03-loudness.md': 900,
  '04-gaps-become-splits.md': 900,
  '05-time-on-screen.md': 950,
  '06-seeking-compressed-audio.md': 850,
  '07-cutting-without-re-encoding.md': 1250,
  '08-listening-to-a-range.md': 850,
  '09-volume-is-gain.md': 850,
  '10-speed-without-pitch.md': 1100,
  '11-finding-repeats.md': 1700,
  '12-streams-in-a-container.md': 950,
  '13-adaptive-threshold.md': 1550,
  '14-the-spectrum.md': 1700,
  '15-contrast.md': 1650,
}

// A new note has this budget until it is written and listed above.
const NEW_CONCEPT_NOTE_BUDGET = 1200
const CONCEPT_NOTES_DIR = 'docs/concepts'

function countWords(path: string): number {
  return readFileSync(path, 'utf8').split(/\s+/).filter(Boolean).length
}

const budgets = new Map(Object.entries(BUDGETS))
for (const name of readdirSync(CONCEPT_NOTES_DIR)) {
  if (!name.endsWith('.md')) continue
  budgets.set(`${CONCEPT_NOTES_DIR}/${name}`, CONCEPT_NOTE_BUDGETS[name] ?? NEW_CONCEPT_NOTE_BUDGET)
}

const failures: string[] = []
for (const [path, budget] of budgets) {
  if (!existsSync(path)) {
    failures.push(`${path}: listed in scripts/check-word-budgets.ts but missing`)
    continue
  }
  const words = countWords(path)
  if (words > budget) failures.push(`${path}: ${words} words, budget ${budget}`)
}

if (failures.length > 0) {
  console.error(
    [
      'Doc budgets exceeded. Replace or cut text rather than add it (finish-feature skill);',
      'raise a budget in scripts/check-word-budgets.ts only when the user agrees.',
      ...failures.map((failure) => `  ${failure}`),
    ].join('\n'),
  )
  process.exitCode = 1
} else {
  process.stdout.write(`Doc budgets: ${budgets.size} files within budget.\n`)
}
