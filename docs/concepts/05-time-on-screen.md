# 05 · Time on screen

Milestone 4 put splits on the whole-file views. This milestone lets the user move them, and for that the screen has to answer two questions in both directions: where on the canvas is this time, and which time is under this pixel? It also has to show the same peaks twice, once for the whole file and once for a 20 s stretch. Both are one straight line and one `min`/`max` rule.

## The words

- **Seconds per pixel**: how much time one pixel of canvas stands for. A canvas is a linear map, so one number describes it all.
- **Whole-file view**: shows 0 s to the file's duration `D` across the canvas width `W`. `x = t / D × W`, and back, `t = x / W × D`. This is `timeToX` in `time-axis.ts`; the inverse is new.
- **Zoom window**: the stretch shown in the zoom view, a **centre** time with a fixed width of 20 s (centre ± 10 s). The zoom view's own map is `x = (t − (centre − 10)) / 20 × W`, and back, `t = (centre − 10) + x / W × 20`. The centre is always at `W / 2`.
- **Bucket** (note 01): 10 ms of samples reduced to its lowest and highest sample. The peaks array holds one pair per bucket and is built once; nothing is recomputed for the zoom view.
- **Bar**: what is actually drawn on the whole-file view, 2 px wide on a 3 px pitch (DESIGN.md). Each bar takes the lowest min and the highest max of the buckets under it (`mergePeaks`), so a loud 10 ms click is still in the picture. Averaging would let it vanish into 800 quiet neighbours. The zoom view follows the same rule and the same 2 px bars on a 3 px pitch (`zoomBars`), with about seven buckets to merge instead of hundreds: a bar is 3 px of the window, and a pixel is 2.2 buckets.
- **Land** (DESIGN.md): a gap drawn as a flat band with no waveform. In the whole-file view it is never narrower than 12 px (`landSpans`), widened around its split. In the zoom view it is drawn at its true width.
- **Hit test**: whether a click counts as a click on a split. The tolerance is **6 px**, never seconds: a finger or mouse is exact to some pixels whatever the file is. 6 px is 16.1 s on this hour-long file and 0.13 s on the zoom view, so a tolerance in seconds would be unusable in one view or loose in the other.

## Worked example: `samples/sample1.m4a`

Duration `D` = 3,686.213991 s (ffprobe), which is 368,622 buckets (`ceil(D / 0.01)`, as in `peaks-builder.ts`). At a 1440 × 900 Chrome window the whole-file canvas is **1,374 px** wide (1,373.98 measured: 1,440 px less 16 px of page padding and 1 px of border plus 16 px of padding in the panel, on each side) and the zoom view, 8 of 12 grid columns, **899.3 px** (measured).

**Two resolutions of one array.**

| View       | Seconds per pixel              | Buckets per pixel | What is drawn                                  |
| ---------- | ------------------------------ | ----------------- | ---------------------------------------------- |
| Whole file | 3,686.21 / 1,374 = **2.683 s** | **268**           | 457 bars (`floor(1374 / 3)`), 807 buckets each |
| Zoom view  | 20 / 899.3 = **22.2 ms**       | **2.2**           | 300 bars (`ceil(899.3 / 3)`), 6.7 buckets each |

Ticket 13 says "about 22 ms per pixel", which is right; the milestone's "about one bucket per pixel" is right on a Retina screen only, where the canvas has twice the device pixels: 1.1 buckets per device pixel. On a plain screen a pixel is 2.2 buckets.

**One split, five numbers.** The split at 329.05 s (5:29.05), in the gap 325.25 to 332.85 s (note 04):

| Where                      | Calculation                     | Result                                            |
| -------------------------- | ------------------------------- | ------------------------------------------------- |
| Whole-file x               | 329.05 / 3,686.21 × 1,374       | **122.6 px**                                      |
| Gap on the whole-file view | 7.60 s / 2.683 s per pixel      | 2.8 px, drawn **12 px** (116.6 to 128.6)          |
| Zoom window when selected  | 329.05 ± 10 s                   | 319.05 to 339.05 s                                |
| Split's x in the zoom view | 10 s / 20 s × 899.3             | **449.7 px**, the centre                          |
| Gap on the zoom view       | 6.2 s to 13.8 s into the window | 278.8 to 620.5 px, **341.7 px** wide, no widening |

A 2 s gap, the shortest the defaults allow, is 0.75 px on the whole-file view: without the 12 px minimum it could not be seen or clicked. On the zoom view it is 44.9 px per second, so the same gap is 90 px.

**Back from a pixel to a time.**

- Whole-file click at x = 127: 127 × 2.683 = 340.7 s. The split's line is at 122.6, 4.4 px away, inside the 6 px tolerance, so the split is selected (the window centres on it). A click at x = 140 is 17.4 px away: nothing is selected, and the window moves to 140 × 2.683 = **375.6 s** (6:15.60).
- Zoom-view pixel x = 500: 319.05 + 500 / 899.3 × 20 = **330.17 s**. This is the drag's input.
- Six pixels on the whole-file view are 16.1 s. Two splits are allowed to be 1 s (0.37 px) apart, so on the whole-file view they can sit under one click: the click picks one, and the zoom view is where the two are told apart.

**The zoom window on the whole-file view.** Its outline is 20 / 3,686.21 × 1,374 = **7.5 px** wide (118.9 to 126.4 px here), narrower than the widened land (12 px): the outline sits inside it.

## Moving a split

Only in the zoom view. All limits are in seconds; only the drag starts from pixels.

- **Keyboard**: Left/Right move the split by 10 ms (one bucket, 0.45 px here); Shift+Left/Right by 100 ms (4.5 px). A step is exact: no pixel is involved.
- **Drag**: the pointer's x becomes a time with the zoom map above, and then it is limited like a key press. A pixel is 22.2 ms here, so a drag is rounded to the nearest 10 ms to land on a bucket border like the keys do.
- **Limits**: at least 1 s (45 px on the zoom view) from the neighbouring splits and from 0 s and from the duration. A drag also stops at the window's edges (319.05 s and 339.05 s here, pixels 0 and 899.3), because the window does not move while dragging.

## Where it lives in the code

- [`src/shared/lib/canvas/time-axis.ts`](../../src/shared/lib/canvas/time-axis.ts) and [`zoom-axis.ts`](../../src/shared/lib/canvas/zoom-axis.ts): the two maps, time to x and x to time, for the whole-file views and for the zoom window.
- [`src/shared/lib/canvas/hit-test-split.ts`](../../src/shared/lib/canvas/hit-test-split.ts): the 6 px hit test.
- [`src/shared/lib/audio/merge-peaks.ts`](../../src/shared/lib/audio/merge-peaks.ts): the min/max merge, over the whole array or any range of buckets, empty where the range is outside the file.
- [`src/widgets/split-zoom/`](../../src/widgets/split-zoom/): the zoom view. [`ui/SplitZoom.vue`](../../src/widgets/split-zoom/ui/SplitZoom.vue) draws the canvas and holds the focusable handle and its keys; `lib/` has the bars of the window (`zoom-bars.ts`), the lands and the empty ground in it (`zoom-spans.ts`), the drag's x to a time rounded to 10 ms (`dragged-time.ts`) and the pointer handlers (`use-split-drag.ts`), as plain functions with specs.
- [`src/widgets/source-waveform/`](../../src/widgets/source-waveform/): the zoom-window outline (`lib/zoom-outline.ts`), and the click: within 6 px of a split's line selects it, anywhere else moves the window.
- [`src/widgets/track-list/`](../../src/widgets/track-list/) and [`src/widgets/track-strip/`](../../src/widgets/track-strip/): a click on a row or a block, the first track's included, selects that track (the Track view), not a split. The list's track rows also rename the track ([`ui/TrackNameField.vue`](../../src/widgets/track-list/ui/TrackNameField.vue)) and remove it with a merge button (`removeTrack`); its split rows, between the track rows, select that split and delete it with a trash button.
- [`src/entities/split/model/split.ts`](../../src/entities/split/model/split.ts): the selection, the zoom centre and moving within the limits above, plus `addSplit` at the window's centre, `deleteSplit`, `removeTrack` (two deletes), `renameTrack` and the edited state (`editCount`, `hasEdits`). "Add split" and "Delete split" are in [`ReviewPage.vue`](../../src/pages/review/ui/ReviewPage.vue), the Delete key on the handle in `SplitZoom.vue`, and the trash button on each split row in `TrackList.vue`.
- [`src/widgets/loudness-curve/ui/ClearSplitsDialog.vue`](../../src/widgets/loudness-curve/ui/ClearSplitsDialog.vue): the confirm before "Clear splits" throws the edits away; [`src/app/App.vue`](../../src/app/App.vue) asks the same before "New file".
