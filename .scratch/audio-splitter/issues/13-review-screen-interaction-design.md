# Review-screen interaction design

Type: grilling
Status: resolved
Blocked by: 07, 08, 11

## Question

How do the five panels of the review screen behave, so that the milestones that build them have nothing left to decide? The look is settled in [DESIGN.md](../../../DESIGN.md) and [Visual direction for the UI kit](11-visual-direction-for-the-ui-kit.md); the starting composition is the direction contract in `.impeccable/surfaces/src-pages-review.md` and the wireframe `docs/screens/2.png` (whose settings panel, confidence column, nudge and snap buttons are gone).

Decide:

- Panel arrangement and heights for `source-waveform`, `loudness-curve`, `split-zoom`, `split-list` and `track-strip`.
- Selection: which split is selected on arrival, and how each panel changes the selection.
- The zoom window: its width (peaks are 10 ms buckets), and whether it can be moved or resized apart from selecting a split.
- Moving a split: where it can be dragged, its limits (neighbouring splits, the file's ends), and any keyboard equivalent.
- Adding and deleting a split: where, at what time a new split lands, and what happens to track names.
- Renaming a track: where it happens, and the inline field's invalid state.
- Where the silence threshold and minimum gap length are set, and whether the UI warns before a setting change replaces every split and track name ([Decode path and hand-written steps](07-decode-path-and-hand-written-steps.md)).
- Whether the kit needs a small (32 px) button size.

Out of this ticket: how playback works ("Playback for auditioning a split" in the map's fog), and what the load screen shows.

## Answer

Resolved 2026-11-13 by grilling; the user accepted every recommendation. Playback stays in the map's fog; the buttons that start it ("Play across split" in the zoom view) are placed here, their behaviour is not.

**Arrangement.** Top to bottom: the vinyl header; `source-waveform` full width; `loudness-curve` full width on the same time axis; `split-zoom` (left, about two thirds) beside `track-list` (right); `track-strip` full width. Canvas heights are fixed: whole-file 96 px, loudness curve 120 px, zoom view 160 px. The page scrolls vertically when the window is shorter than the screen (about 950–1000 px); no sticky regions.

**`split-list` becomes `track-list`.** The right-hand panel lists tracks, not splits. Each row: number, start time, length, and an inline name field. Row 1 starts at 0:00:00 and has no split; every other row's start *is* a split, so selecting the row selects that split. The panel is as tall as the zoom view and scrolls inside itself, keeping the selected row in view. [Code layout](05-code-layout.md) is amended.

**Selection and the zoom window.** At most one split is selected. The zoom window has a centre time and a fixed width of 20 s (±10 s, about 22 ms per pixel on a ~900 px canvas; no zoom controls). Selecting a split centres the window on it; nothing else moves the window except a click on empty space in the whole-file view, which moves it there with no split selected (how a missed gap is found). On arrival, and after every setting change, split 1 is selected. With no splits, the window starts at 0:00 and the zoom view says no splits were found.

**Clicks per panel.**

- Whole-file view: a click within 6 px of a split marker selects it; anywhere else moves the zoom window there. The zoom-window outline is not draggable.
- Loudness curve: only the threshold line is interactive; clicks select nothing.
- Track list and track strip: a click on a row or block selects the split where that track starts. Track 1's row offers only its name field; its block selects nothing.

**Moving a split.** Only in the zoom view: drag its handle, or focus the handle and use Left/Right (10 ms, one peaks bucket) and Shift+Left/Right (100 ms). A split stays at least 1 s from its neighbours and from the file's start and end, and a drag stops at the zoom window's edges. The window does not recentre during or after a drag.

**Adding a split.** One way: "Add split" (`sm` secondary button, Plus icon) in the zoom view's title row adds a split at the window's centre and selects it; the user then drags it into the gap. It is disabled when the centre is within 1 s of an existing split or the file's ends, which is the usual state while a split is selected. The new split's track is unnamed; unnamed tracks renumber, renamed ones keep their names.

**Deleting a split.** A `sm` trash `IconButton` on every track-list row but the first deletes the split where that track starts; the Delete key on the focused handle in the zoom view deletes the selected split. The next split is then selected (the previous one if it was the last). The deleted split's track name disappears, so the merged track keeps the earlier track's name. No undo in v1.

**Renaming.** Inline in the track-list rows (DESIGN.md's inline `TextField` variant), not in the track strip, whose blocks get too narrow on long files. The strip is a proportional overview whose blocks show name and length. Enter or blur saves, Escape reverts, an empty name falls back to the number, the field is capped at 100 characters. There is **no invalid state**: [Export delivery and filenames](08-export-delivery-and-filenames.md) already sanitises filenames and keeps the tag exact, so no name is wrong.

**Settings.** The loudness-curve panel's title row holds two kit `Slider`s, silence threshold and minimum gap length. The dashed threshold line on the canvas is a second handle on the same value; keyboard access comes from the Slider.

**Protecting edits.** The split store knows whether anything was edited since the last detection (a split moved, added or deleted, or a track renamed). Only then do a setting change and "New file" ask first, in a confirm dialog ("This replaces your 4 edits with freshly detected splits."). Confirming a setting change runs detection and clears the edited state, so further changes run freely. The kit gains a `Dialog` (Reka `AlertDialog`), which export's locking overlay reuses.

**Times.** `0:42:03.25` (hundredths) where a split's position is read: the zoom view's title (the panel's largest type) and track-list start times. `0:42:03` for axis labels and track lengths.

**Export.** The track strip's title row reads "Tracks (8)" and holds "Export to folder…" (primary `lg`, Download icon), the wording from Export delivery and filenames. With no splits, export still runs and writes the whole file as one track.

**Kit changes.** An `sm` size: 32 px `Button` (`h-8 px-3`) and 32 px `IconButton` (`size-8`), for panel title rows and table rows. A `Dialog`. No invalid state for the inline rename field.

**Updated.** [DESIGN.md](../../../DESIGN.md) (sm size, rename field), `PRODUCT.md`, the direction contract `.impeccable/surfaces/src-pages-review.md`, and [Code layout](05-code-layout.md). The sidecar `.impeccable/design.json` still shows the old "Export 8 tracks" and the invalid rename example; the next impeccable documenter pass refreshes it.

**Passed on** to the setup step in [Milestone sequence](09-milestone-sequence.md): the `Dialog`'s look is not in DESIGN.md yet; it is designed within DESIGN.md's rules (flat, hairline, no shadow) when the kit is built.
