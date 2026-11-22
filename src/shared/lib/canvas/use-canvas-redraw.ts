import { onBeforeUnmount, onMounted, type ShallowRef, watch } from 'vue'

import { useTheme } from '@/shared/lib/theme/theme.ts'

import { redrawWhenFontsLoad } from './canvas-text.ts'

/*
Keeps a canvas painted: `draw` runs once the canvas is mounted, whenever it is resized, whenever
the theme in effect changes (the colour tokens differ, and a canvas does not repaint itself; the
theme module has already set `data-theme` by then) and once the fonts have loaded (canvas text
needs Albert Sans). The observer goes when the component unmounts, and the watcher with it. What else
makes the canvas stale (its data) is for the widget to watch.
*/
export function useCanvasRedraw(
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
  draw: () => void,
) {
  const resizeObserver = new ResizeObserver(draw)
  const { themeInEffect } = useTheme()

  watch(themeInEffect, () => {
    draw()
  })

  onMounted(() => {
    if (canvas.value) resizeObserver.observe(canvas.value)
    draw()
    redrawWhenFontsLoad(draw)
  })

  onBeforeUnmount(() => {
    resizeObserver.disconnect()
  })
}
