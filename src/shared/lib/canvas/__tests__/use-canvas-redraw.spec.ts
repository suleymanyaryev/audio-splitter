import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'

import { useCanvasRedraw } from '../use-canvas-redraw.ts'

type Watching = {
  observed: Element[]
  onResize: (() => void) | undefined
  disconnect: () => void
  onSchemeChange: (() => void) | undefined
  removeSchemeListener: () => void
}

// Stands in for the browser's observers and records what the composable registers with them.
function stubBrowserWatchers(): Watching {
  const watching: Watching = {
    observed: [],
    onResize: undefined,
    disconnect: vi.fn(),
    onSchemeChange: undefined,
    removeSchemeListener: vi.fn(),
  }
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = watching.disconnect

      constructor(callback: () => void) {
        watching.onResize = callback
      }

      observe(element: Element) {
        watching.observed.push(element)
      }
    },
  )
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: (_type: string, listener: () => void) => {
      watching.onSchemeChange = listener
    },
    removeEventListener: watching.removeSchemeListener,
  }))
  return watching
}

const renderEmpty = () => h('div')

function mountCanvas(draw: () => void) {
  const element = document.createElement('canvas')
  const wrapper = mount(
    defineComponent({
      setup() {
        useCanvasRedraw(shallowRef(element), draw)
        return renderEmpty
      },
    }),
  )
  return { element, wrapper }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCanvasRedraw', () => {
  it('draws once on mount and watches the canvas for a resize', () => {
    const watching = stubBrowserWatchers()
    const draw = vi.fn()

    const { element } = mountCanvas(draw)

    expect(draw).toHaveBeenCalledOnce()
    expect(watching.observed).toEqual([element])
  })

  it('draws again on a resize, a colour scheme change and once the fonts are ready', async () => {
    const watching = stubBrowserWatchers()
    const draw = vi.fn()
    mountCanvas(draw)
    draw.mockClear()

    watching.onResize?.()
    expect(draw).toHaveBeenCalledTimes(1)

    watching.onSchemeChange?.()
    expect(draw).toHaveBeenCalledTimes(2)

    await document.fonts.ready
    expect(draw).toHaveBeenCalledTimes(3)
  })

  it('stops watching when the component unmounts', () => {
    const watching = stubBrowserWatchers()
    const { wrapper } = mountCanvas(vi.fn())

    wrapper.unmount()

    expect(watching.disconnect).toHaveBeenCalledOnce()
    expect(watching.removeSchemeListener).toHaveBeenCalledWith('change', watching.onSchemeChange)
  })
})
