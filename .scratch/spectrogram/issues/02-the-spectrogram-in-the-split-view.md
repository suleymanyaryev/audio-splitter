# 02: The spectrogram in the Split view

**What to build:** the first complete path. Loading a source file works out its spectrogram alongside the peaks and the loudness curve, and the Split view shows it as a strip under its waveform. The strip is on the same time axis, so the selected split sits at the same x in both. A file holding one steady tone shows one horizontal line at that tone's height.

**Blocked by:** 01.

**Status:** resolved

Spec: `.scratch/spectrogram/spec.md` (Implementation Decisions, "What is computed", "Where it lives" and "How the views change"; Testing Decisions). Use the `canvas-view` skill for the drawing and `store-wiring` for the new summary.

- [x] A hand-written radix-2 FFT matches a plain DFT, written in its spec, on a frame of irregular samples, to within float rounding.
- [x] A spectrum builder, shaped like the peaks and loudness builders, gives one column of 128 log bands (one byte each, −100 to 0 dB) per loudness window.
  - Its column count matches the loudness builder's at 22.05, 44.1 and 48 kHz.
- [x] Each frame is 2048 samples of the mono downmix with a Hann window, centred on its window's middle.
  - Frames at the file's start and end are padded with zeros.
  - The same signal cut into different slice sizes gives the same columns.
- [x] In the builder's spec, a sine of a known frequency peaks in the band holding it, a full-scale sine reads about 0 dB, and silence reads −100 dB.
- [x] The source-file store keeps the spectrogram as a third summary.
  - It is set when the load is ready.
  - `reset`, `cancel` and a replaced load leave none.
  - In its spec, a 1 kHz sine loads to a spectrogram whose strongest band holds 1 kHz.
- [x] The Split view's frame holds the strip under the waveform, as tall as it, and the panel grows by that height.
- [x] The strip draws:
  - a logarithmic axis from 50 Hz to half the sample rate, labelled at 100 Hz, 1 kHz and 10 kHz;
  - a one-hue shade from the theme's background to its text colour over the 80 dB below the file's loudest band value;
  - nothing outside the source file.
- [x] Split lines and the playhead cross the strip; the gap shading stays on the waveform.
- [x] The strip follows the zoom window, and is redrawn on a theme change.
- [x] A press, click or drag on the strip does what it does on the waveform, in the view's spec; no key changes.
- [x] Checked by hand in the browser with a 1 kHz tone file generated into `samples/`: one line at 1 kHz, in both themes.
- [x] `CHANGELOG.md` gains its line under `[Unreleased]` in the same commit.

## Comments

- The Split view is one canvas twice as tall (`h-80`, 320 px): the waveform in the top half, the strip in the bottom half, with a 1.5 px `ink` line between. The frame already took the pointer, so a press on the strip needed no new wiring. The canvas's label became "Zoomed waveform and spectrogram of the split".
- `Spectrogram` is `{ bands, bandCount, topHz }`: `topHz` (half the sample rate) is carried because the store keeps no sample rate, and the strip's axis needs it.
- Kept on the waveform only: the lands and the confidence marks. Across both halves: the split lines, the playhead, the ground outside the file and the audition's brackets (at the canvas's top and bottom).
- A pixel shows the column under its middle; ticket 03 turns this into the loudest-value merge.
- The shade runs from `surface` to `ink`; the labels are `muted` on a `surface` plate, like the threshold's label. DESIGN.md gained a "Spectrogram strip" rule.
- The last, shorter window's frame is centred on a full window's middle, as every other one is.
- The real builder took about 30 ms per 60 s slice in Node (26–31 µs a column), the cost the spec accepts.
- Hand check: `samples/tone-1khz.m4a` (made with ffmpeg: 50 s of 1 kHz at −6 dB, 4 s of silence, 50 s more, so Find splits gives one split). One sharp line at the 1 kHz label, blank in the gap, in the light and the dark theme.

