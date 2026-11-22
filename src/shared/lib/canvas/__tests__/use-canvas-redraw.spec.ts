import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { defineComponent, h, nextTick, shallowRef } from 'vue'

import { useTheme } from '@/shared/lib/theme/theme.ts'

import { useCanvasRedraw } from '../use-canvas-redraw.ts'

type Watching = {
  observed: Element[]
  onResize: (() => void) | undefined
  disconnect: () => void
}

// Stands in for the browser's resize observer and records what the composable registers with it.
function stubBrowserWatchers(): Watching {
  const watching: Watching = {
    observed: [],
    onResize: undefined,
    disconnect: vi.fn(),
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
  return watching
}

const renderEmpty = () => h('div')

// The first draw is followed by one more when the fonts are ready; wait it out before counting.
async function mountSettledCanvas(draw: Mock<() => void>) {
  const mounted = mountCanvas(draw)
  await document.fonts.ready
  await nextTick()
  draw.mockClear()
  return mounted
}

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
  useTheme().setThemeChoice('system')
})

describe('useCanvasRedraw', () => {
  it('draws once on mount and watches the canvas for a resize', () => {
    const watching = stubBrowserWatchers()
    const draw = vi.fn()

    const { element } = mountCanvas(draw)

    expect(draw).toHaveBeenCalledOnce()
    expect(watching.observed).toEqual([element])
  })

  it('draws again once the fonts are ready', async () => {
    stubBrowserWatchers()
    const draw = vi.fn()
    mountCanvas(draw)
    draw.mockClear()

    await document.fonts.ready

    expect(draw).toHaveBeenCalledOnce()
  })

  it('draws again on a resize', async () => {
    const watching = stubBrowserWatchers()
    const draw = vi.fn()
    await mountSettledCanvas(draw)

    watching.onResize?.()

    expect(draw).toHaveBeenCalledOnce()
  })

  it('draws again when the theme in effect changes', async () => {
    stubBrowserWatchers()
    const draw = vi.fn()
    await mountSettledCanvas(draw)

    useTheme().setThemeChoice('dark')
    await nextTick()

    expect(draw).toHaveBeenCalledOnce()
  })

  it('does not draw again for a choice that leaves the theme in effect as it was', async () => {
    stubBrowserWatchers()
    const draw = vi.fn()
    await mountSettledCanvas(draw)

    useTheme().setThemeChoice('light')
    await nextTick()

    expect(draw).not.toHaveBeenCalled()
  })

  it('stops watching when the component unmounts', async () => {
    const watching = stubBrowserWatchers()
    const draw = vi.fn()
    const { wrapper } = await mountSettledCanvas(draw)

    wrapper.unmount()
    useTheme().setThemeChoice('dark')
    await nextTick()

    expect(watching.disconnect).toHaveBeenCalledOnce()
    expect(draw).not.toHaveBeenCalled()
  })
})
