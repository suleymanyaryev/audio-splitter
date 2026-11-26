---
name: canvas-view
description: How the app's waveform and loudness canvases are drawn and handled. Use when drawing on a canvas, adding pointer or keyboard interaction to one, or adding a whole-file, zoom or range view.
---

The canvases (`widgets/source-waveform`, `widgets/loudness-curve`, `widgets/split-zoom`) share one shape: a thin `.vue` component that draws and wires events, and plain `lib/` functions that hold every bit of maths. Build a new view or interaction in that shape, reusing the shared helpers in `@/shared/lib/canvas/` before writing a new one.

## Drawing

- Start each draw with `prepareCanvas` and keep it painted with `useCanvasRedraw(canvas, draw)`, which covers mount, resize, a change of the theme in effect and font load. The widget adds its own `watch` on the state it draws.
- Map time to x with `time-axis.ts` (the whole file) or `zoom-axis.ts` (a window centred on a time). A stretch (the range or a track) maps through `stretchAxis(player.extent, width)` (`widgets/split-zoom/lib/stretch-axis.ts`), built when it is needed, which also gives the centre and length the zoom helpers take.
- Draw with the shared drawers; `draw-lands-and-splits.ts` owns the land and split-line widths.
- Colours come from the `--color-*` tokens; sizes and layering follow DESIGN.md "Canvas drawing rules". Read it before drawing anything new.
- Draw back to front: bars, lands, overlays, split lines, playhead, then the frame last so it stays outermost. `drawPlayhead` and `drawFrame` (`@/shared/lib/canvas/draw-playhead-and-frame.ts`) draw the last two. Reference: `draw()` in `SplitZoom.vue`.
- Layout maths goes in its own `lib/` file with a spec (`zoom-outline.ts`); the component only measures and paints.
- Anything that moves without Vue seeing it, such as the audio's `currentTime`, redraws through `usePlayheadSlider(draw)` (`widgets/split-zoom/lib/use-playhead-slider.ts`), which wraps `usePlayheadFrames` and returns the slider's value.
- A view's failure shows through `<PlayerFailure />` (`widgets/split-zoom/ui/PlayerFailure.vue`), a one-line `role="status"` at the bottom centre of the `relative` view.

## Pointer

- Position, hit test and pointer-to-value are pure maths in `lib/` (`widgets/split-zoom/lib/dragged-time.ts`, which rounds to the 10 ms grid).
- Pointer handlers go in a `use-*-drag.ts` or `use-*-press.ts` composable that the component spreads onto the element (`widgets/source-waveform/lib/use-range-drag.ts`).
- A drag captures the pointer on press, so it carries on past the canvas edge, and ends on `lostpointercapture` too. It keeps the offset it was grabbed at, so the line doesn't jump.
- A press that moves under 4 px is a click. A click within 6 px of a split line hits it (`hitTestSplit`).
- When one press can mean several things, test them in a fixed order and take the first match (`widgets/split-zoom/lib/use-range-press.ts`).
- A drag through the replace guard ends when its `set` returns false (`LoudnessCurve.vue`).

## Keyboard

Keys belong to the view on show, not to a focused element (ADR 0002).

- Register them with `usePageKeys(isKeyActedOn, { root: () => frame.value })` (`@/shared/lib/keyboard/use-page-keys.ts`). `isKeyActedOn` does the key's work and returns `true` only when the key was the view's; `false` leaves it to the browser.
- Arrow keys step by a small amount, and with Shift by a larger one. A key that adds, deletes or toggles ignores `event.repeat`.
- A control a mouse press lands on takes `@mousedown="releaseFocus"`, so the keys stay with the view.
- Focus stays where the user put it. A view that must tell the page a key was used emits `acted`.
- Reference: `isKeyActedOn` in `RangeView.vue`.

## Specs

Spec every `lib/` file directly, in `lib/__tests__/`. Component specs check wiring (what a click or key does to the store), not pixel maths.
