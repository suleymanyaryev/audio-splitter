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

// jsdom has no matchMedia; canvases listen to it to redraw when the colour scheme changes.
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
}))

// jsdom draws nothing and logs "not implemented" for a canvas context; canvases are not tested,
// and drawing code returns early without a context. Node-environment specs have no DOM at all.
if ('HTMLCanvasElement' in globalThis) HTMLCanvasElement.prototype.getContext = () => null
