import { onBeforeUnmount, onMounted, type ShallowRef } from 'vue'

import { redrawWhenFontsLoad } from './canvas-text.ts'

/*
Keeps a canvas painted: `draw` runs once the canvas is mounted, whenever it is resized, whenever
the colour scheme changes (the colour tokens differ, and a canvas does not repaint itself) and once
the fonts have loaded (canvas text needs Manrope). The observer and the listener go when the
component unmounts. What else makes the canvas stale (its data) is for the widget to watch.
*/
export function useCanvasRedraw(
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
  draw: () => void,
) {
  const resizeObserver = new ResizeObserver(draw)
  const darkScheme = globalThis.matchMedia('(prefers-color-scheme: dark)')

  onMounted(() => {
    if (canvas.value) resizeObserver.observe(canvas.value)
    darkScheme.addEventListener('change', draw)
    draw()
    redrawWhenFontsLoad(draw)
  })

  onBeforeUnmount(() => {
    resizeObserver.disconnect()
    darkScheme.removeEventListener('change', draw)
  })
}
