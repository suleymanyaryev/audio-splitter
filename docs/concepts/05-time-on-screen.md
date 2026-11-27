# 05 · Time on screen

To move a split, the screen has to answer two questions in both directions: where on the canvas is this time, and which time is under this pixel? It also has to show the same peaks twice, once for the whole file and once for a 20 s stretch. Both are one straight line and one `min`/`max` rule.

## The words

- **Seconds per pixel**: how much time one pixel of canvas stands for. A canvas is a linear map, so one number describes it all.
- **Whole-file view**: shows 0 s to the file's duration `D` across the canvas width `W`. `x = t / D × W`, and back, `t = x / W × D`.
- **Zoom window**: the stretch shown in the zoom view, a **centre** time with a fixed width of 20 s (centre ± 10 s). The zoom view's own map is `x = (t − (centre − 10)) / 20 × W`, and back, `t = (centre − 10) + x / W × 20`. The centre is always at `W / 2`.
- **Bucket** ([note 01](01-sound-is-numbers.md)): 10 ms of samples reduced to its lowest and highest sample. The peaks array holds one pair per bucket and is built once; nothing is recomputed for the zoom view.
- **Bar**: what is drawn, 2 px wide on a 3 px pitch. Each bar takes the lowest min and the highest max of the buckets under it, so a loud 10 ms click is still in the picture; averaging would let it vanish into 800 quiet neighbours.
- **Land**: a gap drawn as a flat band with no waveform. In the whole-file view it is never narrower than 12 px, widened around its split. In the zoom view it is drawn at its true width.
- **Hit test**: whether a click counts as a click on a split. The tolerance is **6 px**, never seconds: a finger or mouse is exact to some pixels whatever the file is.

## Worked example: `samples/sample1.m4a`

Duration `D` = 3,686.213991 s, which is 368,622 buckets. At a 1440 × 900 Chrome window the whole-file canvas is **1,374 px** wide (1,373.98 measured) and the zoom view **899.3 px**.

**Two resolutions of one array.**

| View       | Seconds per pixel              | Buckets per pixel | What is drawn                                  |
| ---------- | ------------------------------ | ----------------- | ---------------------------------------------- |
| Whole file | 3,686.21 / 1,374 = **2.683 s** | **268**           | 457 bars (`floor(1374 / 3)`), 807 buckets each |
| Zoom view  | 20 / 899.3 = **22.2 ms**       | **2.2**           | 300 bars (`ceil(899.3 / 3)`), 6.7 buckets each |

On a Retina screen the canvas has twice the device pixels, so the zoom view is 1.1 buckets per device pixel: about one bucket per pixel, which is why buckets are 10 ms.

**One split, five numbers.** The split at 329.05 s (5:29.05), in the gap 325.25 to 332.85 s ([note 04](04-gaps-become-splits.md)):

| Where                      | Calculation                     | Result                                            |
| -------------------------- | ------------------------------- | ------------------------------------------------- |
| Whole-file x               | 329.05 / 3,686.21 × 1,374       | **122.6 px**                                      |
| Gap on the whole-file view | 7.60 s / 2.683 s per pixel      | 2.8 px, drawn **12 px** (116.6 to 128.6)          |
| Zoom window when selected  | 329.05 ± 10 s                   | 319.05 to 339.05 s                                |
| Split's x in the zoom view | 10 s / 20 s × 899.3             | **449.7 px**, the centre                          |
| Gap on the zoom view       | 6.2 s to 13.8 s into the window | 278.8 to 620.5 px, **341.7 px** wide, no widening |

A 2 s gap, the shortest the defaults allow, is 0.75 px on the whole-file view: without the 12 px minimum it could not be seen or clicked.

**Back from a pixel to a time.**

- Whole-file click at x = 127: 127 × 2.683 = 340.7 s. The split's line is at 122.6, 4.4 px away, inside the 6 px tolerance, so the split is selected. A click at x = 140 is 17.4 px away: nothing is selected, and the window moves to 140 × 2.683 = **375.6 s** (6:15.60).
- Zoom-view pixel x = 500: 319.05 + 500 / 899.3 × 20 = **330.17 s**. This is the drag's input.
- Six pixels are **16.1 s** on the whole-file view and 0.13 s on the zoom view, so a tolerance in seconds would be unusable in one view or loose in the other. Two splits 1 s apart are 0.37 px apart on the whole-file view: one click picks one, and the zoom view is where the two are told apart.

**The zoom window on the whole-file view.** Its outline is 20 / 3,686.21 × 1,374 = **7.5 px** wide (118.9 to 126.4 px here), inside the 12 px land.

## Moving a split

All limits are in seconds; only a drag starts from pixels. A drag's x becomes a time on the zoom map and is rounded to 10 ms, a bucket border, like a key step; the store then keeps the split at least 1 s from its neighbours and from the file's ends.

## Where it lives in the code

- [`src/shared/lib/canvas/time-axis.ts`](../../src/shared/lib/canvas/time-axis.ts) and [`zoom-axis.ts`](../../src/shared/lib/canvas/zoom-axis.ts): the two maps, time to x and x to time.
- [`src/shared/lib/audio/merge-peaks.ts`](../../src/shared/lib/audio/merge-peaks.ts) and [`src/widgets/split-zoom/lib/zoom-bars.ts`](../../src/widgets/split-zoom/lib/zoom-bars.ts): the min/max merge into bars.
- [`src/shared/lib/canvas/land-spans.ts`](../../src/shared/lib/canvas/land-spans.ts): a gap widened to a minimum land width.
- [`src/shared/lib/canvas/hit-test-split.ts`](../../src/shared/lib/canvas/hit-test-split.ts): the hit test in pixels.
- [`src/widgets/split-zoom/lib/dragged-time.ts`](../../src/widgets/split-zoom/lib/dragged-time.ts): a drag's x to a time on the bucket grid.
- [`src/entities/split/config/split-room.ts`](../../src/entities/split/config/split-room.ts): the minimum distance between splits.
