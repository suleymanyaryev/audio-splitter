import { describe, expect, it } from 'vitest'

import { pointerX } from '../pointer-x.ts'

describe('pointerX', () => {
  it('is the pointer’s distance from the left edge of the element it is over', () => {
    const event = {
      clientX: 356,
      currentTarget: { getBoundingClientRect: () => ({ left: 100 }) },
    } as unknown as MouseEvent

    expect(pointerX(event)).toBe(256)
  })
})
