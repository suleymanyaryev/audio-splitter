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

  describe('clearing', () => {
    it('forgets every edit, the deletions included', () => {
      const ledger = useEditLedger()
      ledger.splitAdded(1)
      ledger.splitMoved(2)
      ledger.splitChecked(3)
      ledger.splitDeleted(4)
      expect(ledger.count.value).toBe(4)

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
