import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSplitStore } from '@/entities/split/model/split.ts'
import { useReplaceGuard } from '../use-replace-guard.ts'

// 20 s at 50 ms per window: loud, a 2 s silence from 10 s, loud again.
function curveWithOneGap() {
  const curve = new Float32Array(400).fill(-10)
  curve.fill(-70, 200, 240)
  return curve
}

function setup({ edited }: { edited: boolean }) {
  const split = useSplitStore()
  split.detect(curveWithOneGap(), { windowSeconds: 0.05, durationSeconds: 20 })
  if (edited) split.renameTrack(null, 'Opener')
  return { split, guard: useReplaceGuard() }
}

describe('useReplaceGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lets a change through at once while nothing was edited', () => {
    const { guard } = setup({ edited: false })
    const apply = vi.fn()

    guard.change(apply)

    expect(apply).toHaveBeenCalledOnce()
    expect(guard.asking.value).toBe(false)
  })

  it('holds a change back and asks once edits exist', () => {
    const { guard } = setup({ edited: true })
    const apply = vi.fn()

    guard.change(apply)

    expect(apply).not.toHaveBeenCalled()
    expect(guard.asking.value).toBe(true)
  })

  it('counts the edits the question is about', () => {
    const { split, guard } = setup({ edited: true })
    split.renameTrack(split.splits[0]?.id ?? null, 'Closer')

    expect(guard.editCount.value).toBe(2)
  })

  it('applies the held change when the edits are given up, and closes the question', () => {
    const { guard } = setup({ edited: true })
    const apply = vi.fn()
    guard.change(apply)

    guard.replace()

    expect(apply).toHaveBeenCalledOnce()
    expect(guard.asking.value).toBe(false)
  })

  it('keeps asking about the first change while the question is open, and ignores later ones', () => {
    const { guard } = setup({ edited: true })
    const first = vi.fn()
    const later = vi.fn()
    guard.change(first)

    guard.change(later)
    guard.replace()

    expect(first).toHaveBeenCalledOnce()
    expect(later).not.toHaveBeenCalled()
  })

  it('drops the held change when the question is closed another way, and asks again next time', () => {
    const { guard } = setup({ edited: true })
    const dropped = vi.fn()
    const next = vi.fn()
    guard.change(dropped)

    // The dialog's own close (Escape, "Keep edits") sets this through its v-model.
    guard.asking.value = false
    guard.change(next)
    guard.replace()

    expect(dropped).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledOnce()
  })

  it('runs changes freely once replacing has cleared the edits', () => {
    const { split, guard } = setup({ edited: true })
    guard.change(() => split.setMinimumGapLength(3))
    guard.replace()
    const apply = vi.fn()

    guard.change(apply)

    expect(apply).toHaveBeenCalledOnce()
    expect(guard.asking.value).toBe(false)
  })
})
