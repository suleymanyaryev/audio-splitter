import { describe, it, expect } from 'vitest'

import { useEditLedger } from '../edit-ledger.ts'

describe('the edit ledger', () => {
  it('starts with no edit', () => {
    expect(useEditLedger().count.value).toBe(0)
  })

  describe('a split moved', () => {
    it('is one edit, however often it moves', () => {
      const ledger = useEditLedger()

      ledger.splitMoved(4)
      ledger.splitMoved(4)
      ledger.splitMoved(4)

      expect(ledger.count.value).toBe(1)
    })

    it('counts each split on its own', () => {
      const ledger = useEditLedger()

      ledger.splitMoved(4)
      ledger.splitMoved(5)

      expect(ledger.count.value).toBe(2)
    })
  })

  describe('a split added', () => {
    it('is one edit, and moving it adds none', () => {
      const ledger = useEditLedger()

      ledger.splitAdded(7)
      expect(ledger.count.value).toBe(1)

      ledger.splitMoved(7)
      ledger.splitMoved(7)
      expect(ledger.count.value).toBe(1)
    })

    it('leaves no edit when it is deleted again, moved or not', () => {
      const ledger = useEditLedger()
      ledger.splitAdded(7)
      ledger.splitMoved(7)

      ledger.splitDeleted(7)

      expect(ledger.count.value).toBe(0)
    })
  })

  describe('a detected split deleted', () => {
    it('is one edit', () => {
      const ledger = useEditLedger()

      ledger.splitDeleted(2)

      expect(ledger.count.value).toBe(1)
    })

    it('replaces its move: moved then deleted is one edit, not two', () => {
      const ledger = useEditLedger()
      ledger.splitMoved(2)

      ledger.splitDeleted(2)

      expect(ledger.count.value).toBe(1)
    })

    it('counts each deletion', () => {
      const ledger = useEditLedger()

      ledger.splitDeleted(2)
      ledger.splitDeleted(3)

      expect(ledger.count.value).toBe(2)
    })
  })

  describe('a split checked', () => {
    it('is one edit, however often it is checked', () => {
      const ledger = useEditLedger()

      ledger.splitChecked(1)
      ledger.splitChecked(1)

      expect(ledger.count.value).toBe(1)
    })

    it('is still one edit when it is moved afterwards', () => {
      const ledger = useEditLedger()
      ledger.splitChecked(1)

      ledger.splitMoved(1)

      expect(ledger.count.value).toBe(1)
    })

    it('goes with the split when it is deleted, leaving the deletion', () => {
      const ledger = useEditLedger()
      ledger.splitChecked(1)

      ledger.splitDeleted(1)

      expect(ledger.count.value).toBe(1)
    })
  })

  describe('a track named', () => {
    it('is one edit, however often it is named', () => {
      const ledger = useEditLedger()

      ledger.trackNamed(3, true)
      ledger.trackNamed(3, true)
      expect(ledger.count.value).toBe(1)

      ledger.trackNamed(null, true)
      expect(ledger.count.value).toBe(2)
    })

    it('is no edit once the name is taken back', () => {
      const ledger = useEditLedger()
      ledger.trackNamed(3, true)
      ledger.trackNamed(null, true)

      ledger.trackNamed(3, false)
      expect(ledger.count.value).toBe(1)

      ledger.trackNamed(null, false)
      expect(ledger.count.value).toBe(0)
    })

    it('is no edit for a track that was never named', () => {
      const ledger = useEditLedger()

      ledger.trackNamed(3, false)

      expect(ledger.count.value).toBe(0)
    })
  })

  describe('a track left out toggled', () => {
    it('is one edit, and the second toggle takes it back', () => {
      const ledger = useEditLedger()

      ledger.leftOutToggled(3)
      expect(ledger.count.value).toBe(1)

      ledger.leftOutToggled(3)
      expect(ledger.count.value).toBe(0)
    })

    it('counts each track on its own, the first included', () => {
      const ledger = useEditLedger()

      ledger.leftOutToggled(null)
      ledger.leftOutToggled(3)

      expect(ledger.count.value).toBe(2)
    })
  })

  describe('a split deleted', () => {
    it('takes the rename and left-out edits of the track that starts at it, and counts the deletion', () => {
      const ledger = useEditLedger()
      ledger.trackNamed(2, true)
      ledger.leftOutToggled(2)
      ledger.trackNamed(5, true)
      expect(ledger.count.value).toBe(3)

      ledger.splitDeleted(2)

      // The deletion and the rename of the track that starts at 5.
      expect(ledger.count.value).toBe(2)
    })

    it('takes them with an added split too, leaving no edit', () => {
      const ledger = useEditLedger()
      ledger.splitAdded(2)
      ledger.trackNamed(2, true)
      ledger.leftOutToggled(2)
      expect(ledger.count.value).toBe(3)

      ledger.splitDeleted(2)

      expect(ledger.count.value).toBe(0)
    })

    it('leaves the file’s start alone', () => {
      const ledger = useEditLedger()
      ledger.trackNamed(null, true)

      ledger.splitDeleted(2)

      expect(ledger.count.value).toBe(2)
    })
  })

  describe('the start inherited', () => {
    it.each([
      { isNamed: false, isLeftOutByHand: false, edits: 0 },
      { isNamed: true, isLeftOutByHand: false, edits: 1 },
      { isNamed: false, isLeftOutByHand: true, edits: 1 },
      { isNamed: true, isLeftOutByHand: true, edits: 2 },
    ])(
      'counts $edits edit(s) when named is $isNamed and left out by hand is $isLeftOutByHand',
      ({ isNamed, isLeftOutByHand, edits }) => {
        const ledger = useEditLedger()

        ledger.startInherited(isNamed, isLeftOutByHand)

        expect(ledger.count.value).toBe(edits)
      },
    )

    it('replaces what the start was before, in both directions', () => {
      const ledger = useEditLedger()
      ledger.trackNamed(null, true)
      ledger.leftOutToggled(null)

      ledger.startInherited(false, false)
      expect(ledger.count.value).toBe(0)

      ledger.startInherited(true, true)
      expect(ledger.count.value).toBe(2)
    })

    it('leaves the other tracks’ edits as they are', () => {
      const ledger = useEditLedger()
      ledger.trackNamed(4, true)

      ledger.startInherited(true, false)

      expect(ledger.count.value).toBe(2)
    })
  })

  describe('clearing', () => {
    it('forgets every edit, the deletions included', () => {
      const ledger = useEditLedger()
      ledger.splitAdded(1)
      ledger.splitMoved(2)
      ledger.splitChecked(3)
      ledger.splitDeleted(4)
      ledger.trackNamed(null, true)
      ledger.leftOutToggled(5)
      expect(ledger.count.value).toBe(6)

      ledger.clear()

      expect(ledger.count.value).toBe(0)
    })

    it('lets the next edits count from nothing', () => {
      const ledger = useEditLedger()
      ledger.splitAdded(1)
      ledger.clear()

      // The added edit was forgotten, so deleting that split now counts a deletion.
      ledger.splitDeleted(1)

      expect(ledger.count.value).toBe(1)
    })
  })
})
