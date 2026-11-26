# 02: The spectrogram in the Split view

**What to build:** the first complete path. Loading a source file works out its spectrogram alongside the peaks and the loudness curve, and the Split view shows it as a strip under its waveform. The strip is on the same time axis, so the selected split sits at the same x in both. A file holding one steady tone shows one horizontal line at that tone's height.

**Blocked by:** 01.

**Status:** ready-for-agent

Spec: `.scratch/spectrogram/spec.md` (Implementation Decisions, "What is computed", "Where it lives" and "How the views change"; Testing Decisions). Use the `canvas-view` skill for the drawing and `store-wiring` for the new summary.

- [ ] A hand-written radix-2 FFT matches a plain DFT, written in its spec, on a frame of irregular samples, to within float rounding.
- [ ] A spectrum builder, shaped like the peaks and loudness builders, gives one column of 128 log bands (one byte each, −100 to 0 dB) per loudness window.
  - Its column count matches the loudness builder's at 22.05, 44.1 and 48 kHz.
- [ ] Each frame is 2048 samples of the mono downmix with a Hann window, centred on its window's middle.
  - Frames at the file's start and end are padded with zeros.
  - The same signal cut into different slice sizes gives the same columns.
- [ ] In the builder's spec, a sine of a known frequency peaks in the band holding it, a full-scale sine reads about 0 dB, and silence reads −100 dB.
- [ ] The source-file store keeps the spectrogram as a third summary.
  - It is set when the load is ready.
  - `reset`, `cancel` and a replaced load leave none.
  - In its spec, a 1 kHz sine loads to a spectrogram whose strongest band holds 1 kHz.
- [ ] The Split view's frame holds the strip under the waveform, as tall as it, and the panel grows by that height.
- [ ] The strip draws:
  - a logarithmic axis from 50 Hz to half the sample rate, labelled at 100 Hz, 1 kHz and 10 kHz;
  - a one-hue shade from the theme's background to its text colour over the 80 dB below the file's loudest band value;
  - nothing outside the source file.
- [ ] Split lines and the playhead cross the strip; the gap shading stays on the waveform.
- [ ] The strip follows the zoom window, and is redrawn on a theme change.
- [ ] A press, click or drag on the strip does what it does on the waveform, in the view's spec; no key changes.
- [ ] Checked by hand in the browser with a 1 kHz tone file generated into `samples/`: one line at 1 kHz, in both themes.
- [ ] `CHANGELOG.md` gains its line under `[Unreleased]` in the same commit.
