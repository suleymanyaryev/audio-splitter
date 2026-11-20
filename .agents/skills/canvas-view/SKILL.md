---
name: canvas-view
description: How the app's waveform and loudness canvases are drawn and handled. Use when drawing on a canvas, adding pointer or keyboard interaction to one, or adding a whole-file, zoom or range view.
---

The canvases (`widgets/source-waveform`, `widgets/loudness-curve`, `widgets/split-zoom`) share one shape: a thin `.vue` component that draws and wires events, and plain `lib/` functions that hold every bit of maths. Build a new view or interaction in that shape, reusing the shared helpers before writing a new one.

## Drawing

- Start each draw with `prepareCanvas` (`@/shared/lib/canvas/prepare-canvas.ts`): it clears the canvas at the screen's pixel density and gives the context and CSS size.
- Keep it painted with `useCanvasRedraw(canvas, draw)` (`use-canvas-redraw.ts`). It covers mount, resize, colour-scheme change and font load. The widget adds its own `watch` on the state it draws.
- Map time to x with `time-axis.ts` (the whole file) or `zoom-axis.ts` (a window centred on a time). The Range view reuses the zoom helpers by expressing the range as a centre and a length (`widgets/split-zoom/lib/range-window.ts`).
- Draw with the shared drawers in `@/shared/lib/canvas/`:
  - `drawPeakBars` for the waveform
  - `drawLands` and `drawSplitLines` for the lands and split lines, with their widths owned by `draw-lands-and-splits.ts`
  - `landSpans` for the gaps' extents
  - `DASH_PATTERN` for dashed lines
  - `CANVAS_FONT` for text
- Read colours from the `--color-*` tokens. Sizes and layering follow DESIGN.md "Canvas drawing rules": read it before drawing anything new.
- Draw in layers, back to front: bars, lands, overlays, split lines, playhead, then the frame or outline last, so the frame stays outermost. `SplitZoom.vue`'s `draw()` is the reference.
- Put layout maths in its own `lib/` file with a spec (`zoom-outline.ts`, `place-split-numbers.ts`, `widgets/track-strip/lib/layout-track-blocks.ts`). The component only measures and paints.
- Use `usePlayheadFrames(isPlaying, draw)` (`widgets/split-zoom/lib/use-playhead-frames.ts`) for anything that moves without Vue seeing it, such as the audio's `currentTime`.
- Show a view's failure as a one-line `role="status"` at the bottom centre, as `SplitZoom.vue` and `RangeView.vue` do.

## Pointer

- Pure maths goes in `lib/`: position, hit test, pointer-to-value. Examples are `widgets/loudness-curve/lib/threshold-line.ts` and `widgets/split-zoom/lib/dragged-time.ts`, which rounds to the 10 ms grid.
- Pointer handlers go in a `use-*-drag.ts` (or `use-*-press.ts`) composable that the component spreads onto the element. Examples are `use-threshold-drag.ts`, `use-split-drag.ts`, `widgets/source-waveform/lib/use-range-drag.ts` and `widgets/split-zoom/lib/use-range-press.ts`.
- A drag captures the pointer on press, so it goes on past the canvas's edge, and wires `lostpointercapture` to its end handler, so a lost release still lets go.
- A drag keeps the distance it was grabbed at, so the line doesn't jump. The resize cursor shows only within reach of the line.
- A press that moves under 4 px is a click (`use-range-drag.ts`).
- A click within 6 px of a split line hits it: `hitTestSplit` (`@/shared/lib/canvas/hit-test-split.ts`).
- When one press can mean several things, test them in a fixed order and take the first match. `use-range-press.ts` checks the playhead, then places the mark; a split line is reached by double-click only. The Range view and the Track view both use it, each with its own mark in the split store.
- A drag that goes through the replace guard ends when the change is held back (its `set` returns false). See `LoudnessCurve.vue`.

## Keyboard

- The keyboard goes to a focusable element with `role="slider"` over the canvas.
  - Arrow keys step by a small amount, and with Shift by a larger one.
  - Handled keys call `preventDefault`, so the page doesn't scroll.
  - Space, and any key that adds or toggles, ignores `event.repeat`.
  - The reference is `SplitZoom.vue`'s `onKeydown`.
- When a page button should hand the keyboard to the view, the view exposes it: `defineExpose({ focusHandle })` in `SplitZoom.vue`, called from `ReviewPage.vue`'s "Add split".

## Specs

Spec every `lib/` file directly, in `lib/__tests__/`. Component specs check wiring (what a click or key does to the store), not pixel maths.
