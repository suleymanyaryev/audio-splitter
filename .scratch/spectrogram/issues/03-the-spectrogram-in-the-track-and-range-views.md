# 03: The spectrogram in the Track view and the Range view

**What to build:** the same strip in the other two zoom panel views. It is drawn across the whole selected track or the whole range, on the view's stretch axis. When a stretch has more columns than pixels, each band keeps its loudest value, so a short drum hit stays visible in a 10 min range.

**Blocked by:** 02.

**Status:** ready-for-agent

Spec: `.scratch/spectrogram/spec.md` (Implementation Decisions, "Where it lives" and "How the views change"; User Stories 2, 3, 8, 10, 12, 27 and 28).

- [ ] Merging the spectrogram's columns to the pixels on show keeps each band's loudest value, in its spec.
- [ ] The Track view and the Range view hold the strip under their waveform, as tall as it, with the same axis, labels and shade as the Split view.
- [ ] Split lines, pending splits, the mark and the playhead cross the strip; the gap shading stays on the waveform.
- [ ] The Track view's strip follows the selected track's ends when a split at one of them moves.
- [ ] A click on the strip sets the mark and seeks, and a double click does what it does on the waveform, in each view's spec; no key changes.
- [ ] Checked by hand in the browser: a 5 min track and a 10 min range of `sample-crossfade.m4a`, in both themes.
- [ ] `CHANGELOG.md`'s line covers the two views, in the same commit.
