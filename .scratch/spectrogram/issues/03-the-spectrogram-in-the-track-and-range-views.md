# 03: The spectrogram in the Track view and the Range view

**What to build:** the same strip in the other two zoom panel views. It is drawn across the whole selected track or the whole range, on the view's stretch axis. When a stretch has more columns than pixels, each band keeps its loudest value, so a short drum hit stays visible in a 10 min range.

**Blocked by:** 02.

**Status:** resolved

Spec: `.scratch/spectrogram/spec.md` (Implementation Decisions, "Where it lives" and "How the views change"; User Stories 2, 3, 8, 10, 12, 27 and 28).

- [x] Merging the spectrogram's columns to the pixels on show keeps each band's loudest value, in its spec.
- [x] The Track view and the Range view hold the strip under their waveform, as tall as it, with the same axis, labels and shade as the Split view.
- [x] Split lines, pending splits, the mark and the playhead cross the strip; the gap shading stays on the waveform.
- [x] The Track view's strip follows the selected track's ends when a split at one of them moves.
- [x] A click on the strip sets the mark and seeks, and a double click does what it does on the waveform, in each view's spec; no key changes.
- [x] Checked by hand in the browser: a 5 min track and a 10 min range of `sample-crossfade.m4a`, in both themes.
- [x] `CHANGELOG.md`'s line covers the two views, in the same commit.

## Comments

- `mergeSpectrogram` (`widgets/split-zoom/lib/merge-spectrogram.ts`) replaced ticket 02's `columnsUnderPixels`. A pixel keeps each band's loudest value over the columns that start in it, and a pixel narrower than a column shows the column under its middle. A small tolerance stops float noise moving a column's start into the next pixel.
- The strip drawer now draws the line between the waveform and the strip itself, and takes a spectrogram that may be null. Each of the three views makes one call before its split lines.
- Read conservatively: "a click on the strip sets the mark and seeks" was taken as "does what a click on the waveform does". In both views a press places the mark, and a double-click seeks or selects a split. No behaviour was added.
- The Track view's strip follows the track's ends through the same `player.extent` watch the waveform uses; no new wiring was needed.
- The canvas labels became "Waveform and spectrogram of the track" and "… of the range"; both views are 320 px tall, as the Split view is.
- Hand check on `sample-crossfade.m4a` (loaded in 16.1 s): no track came out at 5 min, so track 2 (6:39) was used, along with a 10 min range from 30:00. In the light and the dark theme, the split lines and the mark cross the strip, the lead-in land stays on the waveform, and the sound visibly changes at the splits.

