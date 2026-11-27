---
name: canvas-view
description: How the app's waveform and loudness canvases are drawn and handled. Use when drawing on a canvas, adding pointer or keyboard interaction to one, or adding a whole-file, zoom or range view.
---

The canvases (`widgets/source-waveform`, `widgets/loudness-curve`, `widgets/split-zoom`) share one shape: a thin `.vue` component that measures, draws and wires events, and plain `lib/` functions that hold all the maths (layout, position, hit tests, pointer to value), so specs cover the maths without a canvas (`widgets/split-zoom/lib/dragged-time.ts`). Reuse the helpers in `@/shared/lib/canvas/` before writing a new one.

## Drawing

- Start each draw with `prepareCanvas`, and keep it painted with `useCanvasRedraw(canvas, draw)`, which redraws on mount, resize, theme change and font load. The widget watches the state it draws itself (`SplitZoom.vue`).
- Map time to x with a shared axis, so every view agrees on where a time is: `time-axis.ts` for the whole file, `zoom-axis.ts` for a window around a time, `stretchAxis` for the range or a track (`widgets/split-zoom/lib/stretch-axis.ts`).
- Draw with the shared drawers, which own the widths, so a split line looks the same in every view (`draw-lands-and-splits.ts`).
- Colours come from the `--color-*` tokens, and sizes and layering from DESIGN.md's canvas drawing rules, so every canvas looks one way. Read them before drawing anything new.
- Draw back to front: bars, lands, overlays, split lines, playhead, then the frame, so the frame stays outermost (`draw()` in `SplitZoom.vue`).
- Anything that moves without Vue seeing it, such as the audio's `currentTime`, redraws once per frame through `usePlayheadSlider(draw)` (`widgets/split-zoom/lib/use-playhead-slider.ts`).

## Pointer

- A drag is a `use-*-drag.ts` composable the component spreads onto the element. What a press or a double-click means belongs to the view, which asks the drag first with `tryGrab` (`widgets/split-zoom/lib/use-playhead-drag.ts`).
- A drag captures the pointer on press, so it carries on past the canvas edge, and ends on `lostpointercapture` too. It keeps the offset it was grabbed at, so the line doesn't jump (`use-playhead-drag.ts`).
- A press that barely moves is a click, and a click near a split line hits it, so a shaky hand still selects (`@/shared/lib/canvas/hit-test-split.ts`).
- When one press can mean several things, test them in a fixed order and take the first match, so the outcome is predictable (`onPointerDown` in `TrackView.vue`).

## Keyboard

Keys belong to the view on show, not to a focused element (`docs/adr/0002-keys-belong-to-the-view-on-show.md`).

- Register them with `usePageKeys(isKeyActedOn, { root: () => frame.value })`. `isKeyActedOn` does the key's work and returns `true` only when the key was the view's, so every other key stays the browser's (`isKeyActedOn` in `RangeView.vue`).
- Arrow keys step by a small amount, and with Shift by a larger one. A key that adds, deletes or toggles ignores `event.repeat`, so holding it does one thing.
- A control a mouse press lands on takes `@mousedown="releaseFocus"`, so the keys stay with the view.
- Focus stays where the user put it. A view that must tell the page a key was used emits `acted`.

## Specs

Spec every `lib/` file directly, in `lib/__tests__/`. Component specs check wiring (what a click or key does to the store), not pixel maths.
