// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/*
Pins what DESIGN.md says about the shapes and the motion in the CSS entry: the two radii, the one
large figure, and the 120 ms colour easing that switches off under reduced motion.
*/

const css = readFileSync(path.resolve(import.meta.dirname, '../main.css'), 'utf8')

describe('main.css', () => {
  it('has 3 px controls, 4 px panels and a 32 px display size', () => {
    expect(css).toMatch(/--radius-control:\s*3px/)
    expect(css).toMatch(/--radius-panel:\s*4px/)
    expect(css).toMatch(/--text-display:\s*32px/)
  })

  it('eases colours over 120 ms and not at all under reduced motion', () => {
    const start = css.indexOf('@utility tint-transition')
    expect(start).toBeGreaterThan(-1)
    const block = css.slice(start)

    expect(block).toMatch(/transition-duration:\s*120ms/)
    expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{\s*transition:\s*none/)
  })

  it('sets no tabular figures: Albert Sans has none', () => {
    expect(css).not.toMatch(/tabular-nums|tnum/)
  })
})
