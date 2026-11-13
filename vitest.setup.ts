import { vi } from 'vitest'

// jsdom has no ResizeObserver, and Reka components (the slider) measure themselves with it.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
