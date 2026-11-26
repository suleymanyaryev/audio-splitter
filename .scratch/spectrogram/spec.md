# Spectrogram: the tones under the waveform

Status: ready-for-agent

From GitHub issue #17, milestone 7 of the [v2 milestones](../audio-splitter-v2/milestones.md#milestone-7-spectrum-view). The decisions come from a grilling on 2026-11-26, listed under [Further Notes](#further-notes). The grilling added **Spectrum** and **Spectrogram** to the glossary. No ADR: concept note 14 records why the spectrum is built in the load loop and kept as bands.

## Problem Statement

The app shows me two pictures of the sound: the waveform and the loudness curve. Both say how loud the source file is, and neither says what it sounds like. A bass line, a voice and a cymbal can be equally loud. I can't see where one track's sound ends and the next one's begins unless the level dips, so a crossfade looks like one long track.

I also want to learn what frequency is. "Any sound is a sum of tones" is something I've read, not something I've seen on my own files.

## Solution

Each of the zoom panel's three views (the Split view, the Track view and the Range view) gets a **spectrogram** strip under its waveform. Time runs across, on the same axis as the waveform above, so a split, the mark and the playhead sit at the same x in both. Frequency runs up on a logarithmic axis, from 50 Hz to half the file's sample rate, labelled at 100 Hz, 1 kHz and 10 kHz. Strength is shade: loud is the theme's text colour and quiet is its background, over the 80 dB below the file's loudest point.

The strip is part of the view's surface. A click or drag on it does what it does on the waveform. Hovering shows the frequency and level under the pointer, as "1.0 kHz · −32 dB".

The spectrogram is worked out while the file loads, from the same slices as the peaks and the loudness curve, so it draws at once in every view. It costs some load time (about +6 s on a 3 h m4a that takes 19.2 s today) and about 28 MB for 3 h.

Before any code, concept note 14 explains the idea. It covers the plain DFT first, the FFT as the same answer found faster, and why the bass looks blocky.

## User Stories

### Seeing the spectrogram

1. As a user, I want a spectrogram under the waveform in the Split view, so that I can see what the sound is like on both sides of the selected split.
2. As a user, I want a spectrogram under the waveform in the Track view, so that I can see the whole selected track's sound from its first split to its last.
3. As a user, I want a spectrogram under the waveform in the Range view, so that I can see the sound of the stretch I dragged out.
4. As a user, I want the spectrogram there as soon as the review screen opens, with no wait and no button, so that looking at it costs me nothing.
5. As a user, I want the spectrogram always on, so that I never have to look for a setting to bring it back.
6. As a user, I want the strip as tall as the waveform, so that the frequency detail is readable.
7. As a user, I want the strip to follow the zoom window when it moves, so that the two pictures never show different stretches.
8. As a user, I want the strip to follow the selected track's ends when a split at one of them moves, so that it always shows the track as it now is.
9. As a user, I want the strip blank before the source file's start and after its end, as the waveform is, so that nothing is drawn where there is no sound.
10. As a user, I want a long track or range drawn with each band's loudest value over the time a pixel covers, so that a short drum hit doesn't vanish when the stretch is squeezed.

### In step with the waveform

11. As a user, I want a split to sit at the same x on the spectrogram as on the waveform, so that I can read a split against the sound.
12. As a user, I want the split lines, the pending splits, the mark and the playhead drawn across the strip too, so that I can follow them down into the spectrogram.
13. As a user, I want the gap shading kept on the waveform only, so that it doesn't tint the spectrogram's shades.
14. As a user, I want each column of the spectrogram placed at the middle of the moment it describes, so that a sound doesn't appear a few milliseconds early.

### Reading it

15. As a user, I want frequency on a logarithmic axis, so that each octave gets the same height, as pitch is heard.
16. As a user, I want the axis to run from 50 Hz to half the file's sample rate, so that I see everything the file can hold, including where the encoder cut the top off.
17. As a user, I want labels at 100 Hz, 1 kHz and 10 kHz at the strip's left edge, so that I know which height is which tone.
18. As a user, I want a file holding one steady tone to show one horizontal line at that tone's height, so that I can trust the picture.
19. As a user, I want strength as shade over the 80 dB below the file's loudest point, so that the quiet detail of a quiet file still shows.
20. As a user, I want the shade to run from the theme's background to its text colour, so that loud is what stands out in both themes.
21. As a user, I want the shade redrawn when I switch theme, so that the strip is never drawn in the other theme's colours.
22. As a user, I want the frequency and level under the pointer as a readout, "1.0 kHz · −32 dB", so that I can read a tone off the picture instead of guessing.
23. As a user, I want the readout in all three views, so that it works wherever the strip is.
24. As a user, I want the readout gone when the pointer leaves the strip, so that it never shows a stale value.

### Using the pointer on the strip

25. As a user, I want a click on the strip in the Split view to do what a click on its waveform does, so that the lower half of the view is not dead.
26. As a user, I want to drag the selected split from the strip in the Split view, so that I can place it while looking at the sound change.
27. As a user, I want a click on the strip in the Track view to set the mark and seek as a click on its waveform does, so that I can place a pending split where the spectrogram changes.
28. As a user, I want a click on the strip in the Range view to set the mark and seek as on its waveform, so that I can put a split where the spectrogram changes.
29. As a user, I want the keys of each view to work exactly as before, so that the new strip changes nothing I already know.

### Loading

30. As a user, I want the spectrogram worked out during the same load as the waveform and the loudness curve, so that the file is read only once.
31. As a user, I want the load's progress shown as before, in slices, so that the screen I know doesn't change.
32. As a user, I want a cancelled or replaced load to leave no spectrogram behind, so that a new file never shows the old one's sound.
33. As a user loading a 3 h file, I want the extra load time kept to a few seconds, so that the spectrogram isn't a reason to dread long files.
34. As a user loading a 3 h file, I want the spectrogram kept small enough to sit beside everything else in memory, so that long files still load.
35. As a user loading a file at 22.05, 44.1 or 48 kHz, I want the spectrogram in step with the waveform at every rate, so that nothing drifts over a long file.

### Learning

36. As a learner, I want concept note 14 to explain the spectrum in chat before any code, with numbers measured on my samples, so that I understand what the strip shows before it exists.
37. As a learner, I want the note to show the plain DFT first, one comparison against a tone per frequency, so that I see the idea without the speed-up.
38. As a learner, I want the note to then show the FFT as the same answer found faster, with both timed per spectrum, so that I see why the speed-up matters.
39. As a learner, I want the note to explain the trade between time and frequency (46 ms frames, ~22 Hz steps, a blocky bottom octave), so that the blocky bass reads as a lesson, not a bug.
40. As a learner, I want the note to show the 16 kHz wall measured on every sample, so that I can spot an encoder's lowpass in my own files.
41. As a learner, I want the FFT and the band grouping hand-written in plain modules, so that I can read every step that turns samples into shades.

## Implementation Decisions

### What is computed

- **One spectrum per loudness window.** Each column is one spectrum, taken in the same window the loudness curve uses, with the same sample count. The spectrogram therefore has exactly as many columns as the loudness curve, and column `i` belongs to the same time.
- **The frame.** 2048 samples of the mono downmix, with a Hann window, centred on the middle of its loudness window. The column is stamped at the window's middle.
- **The edges.** A frame that reaches before the file's start or past its end is filled with zeros there.
- **Slice borders.** A frame that crosses a slice border takes the samples it needs from the next slice. The builder carries samples over, as the peaks and loudness builders carry leftovers (concept note 02), so the slice size never changes the result.
- **The FFT** is a hand-written radix-2 transform in shared audio maths. It has no dependency.
- **The bands.** The power spectrum becomes 128 bands, spaced logarithmically from 50 Hz to half the sample rate.
  - A band holds the summed power of the steps whose centres fall in it.
  - A band too narrow to hold any step's centre (the bass, below ~440 Hz at 44.1 kHz) takes the power of the one step it lies in. That repeat is the blocky bass.
- **The level.** Each band is stored in dB, scaled so that a full-scale sine reads 0 dB. Values are held between −100 dB (the app's floor) and 0 dB, one byte per band (about 0.4 dB per level).
- **Size.** One column is 128 bytes. A 3 h file at 44.1 kHz has about 221,000 columns, about 28 MB.

### Where it lives

- **A spectrum builder** sits in the shared audio maths, beside the peaks and loudness builders, with the same shape: created for a sample rate, fed the mono pieces in order, finished once. It returns the columns as one flat byte array, band by band within each column, plus the band count.
- **The source-file store** feeds each slice's mono downmix to the spectrum builder in the same loop as the other two builders. It keeps the result as a new summary next to `peaks` and `loudness`. It is set when the load is ready and cleared by `reset`, `cancel` and a replaced load.
- **No new ffmpeg call and no worker.** The builder runs on the page, as the other analysis does. About 30 ms per 60 s slice (about 150 ms per 300 s MP3 slice) during loading is acceptable.
- **The drawing** goes into the split-zoom widget, which owns the three views. It uses plain functions beside the existing zoom helpers:
  - Merging columns to the pixels on show, keeping each band's loudest value.
  - Mapping frequency to height and back, on the log axis from 50 Hz to half the sample rate.
  - Mapping a band's dB to a shade over the 80 dB below the file's loudest band value, between the theme's background and text colours.
  - Formatting the readout.
- **Shared drawing** that more than one view needs goes into the shared canvas helpers, as today. The `canvas-view` skill applies.

### How the views change

- **The layout.** Each of the three views stacks the strip under its waveform, inside the same frame and on the same time map: the zoom window's map in the Split view, the stretch axis in the Track and Range views. The panel grows by the strip's height, which equals the waveform's.
- **The overlays.** The split lines, the pending splits, the mark and the playhead are drawn across both the waveform and the strip. The gap shading is drawn on the waveform only.
- **The pointer.** It is handled by the frame, not by the waveform alone, so a press, click or drag on the strip does what it does on the waveform in that view. No key changes, and the shortcuts dialog doesn't change.
- **The readout.** Hovering the strip shows the frequency and dB under the pointer; leaving the strip hides it. It reads the band and column under the pointer before any merge.
- **The frequency labels** (100 Hz, 1 kHz, 10 kHz) are drawn at the strip's left edge in the kit's small text.

## Testing Decisions

- **A good test checks what a caller sees,** not how it's computed. It checks a store's state after a load, a builder's columns for given samples, a map's numbers, or what a view does after a press. The FFT is the one internal piece tested on its own, because concept note 14 makes the DFT its reference.
- **The source-file store's load** (prior art: its spec, with the fake ffmpeg session).
  - A slice of a 1 kHz sine loads to a spectrogram whose strongest band holds 1 kHz in every full column.
  - It has the loudness curve's column count.
  - `reset`, `cancel` and a replaced load leave no spectrogram.
- **The spectrum builder** (prior art: the loudness builder's spec, with pieces of the same signal).
  - The same signal cut into different piece sizes gives the same columns.
  - A sine of a known frequency peaks in the band holding it.
  - A full-scale sine reads about 0 dB, and silence reads −100 dB.
  - Frames at the file's start and end are padded with zeros.
  - The column count matches the loudness builder's at 22.05, 44.1 and 48 kHz.
- **The FFT** (no prior art; the reference comes from concept note 14). On a frame of irregular samples it matches a plain DFT, written in the spec, to within float rounding.
- **The strip's plain maps** (prior art: the zoom-bars, merge-loudness and format-readout specs).
  - Merging keeps each band's loudest value.
  - Frequency to height and back are inverses at the axis ends and at the labels.
  - The shade map holds the 80 dB range.
  - The readout text is formatted as "1.0 kHz · −32 dB".
- **The three view specs** (prior art: the Split view, Track view and Range view specs). A press, click or drag on the strip does what it does on the waveform: seeking and dragging the selected split in the Split view, and setting the mark and seeking in the Track and Range views.
- **Not tested in jsdom:** canvas pixels, since jsdom draws nothing. The look in both themes and the steady-tone line are checked by hand in the browser with a tone file generated into `samples/` (for example ffmpeg's `sine` source at 1 kHz), through the `playwright-cli` skill. No e2e spec: a unit spec covers every flow.

## Out of Scope

- A spectrogram beside the whole-file waveform. It may come with #18 if it helps there.
- Proposing splits from the spectrum: that is #18, which reads this milestone's bands.
- A multi-hue heat map. It is a possible polish step later.
- Settings for the FFT size, the frequency range, the shade range or the strip's height.
- Hiding the strip.
- A spectrum per channel; the strip shows the mono downmix, like every other summary.
- Moving the analysis into a worker.
- Working the spectrogram out again after the load, or for a part of the file only.

## Further Notes

### Decisions of the grilling (2026-11-26)

1. The spectrogram shows in the zoom panel's three views first, not beside the whole-file waveform.
2. It is computed for the whole file so that #18 reads it, with no second decode.
3. The frequency axis is logarithmic, up to half the sample rate.
4. The words are **Spectrum** and **Spectrogram**; "Spectrum view" is avoided because it reads as a fourth panel view.
5. Shade is a one-hue ramp from background to text colour, over 80 dB below the file's loudest point.
6. The strip sits under the waveform, always on, on the same time axis.
7. It is computed inside the load loop.
8. One spectrum per loudness window.
9. The FFT size is 2048 samples, and the axis starts at 50 Hz, with the blocky bass left visible.
10. 128 log bands are kept, one byte each.
11. Concept note 14 teaches the DFT, then the FFT, with the DFT as the spec's reference.
12. The tone check is a unit spec plus a hand check with a generated tone file.
13. Pointer actions on the strip match the waveform's.
14. Split lines, pending splits, the mark and the playhead cross the strip; gap shading doesn't.
15. The strip is as tall as the waveform, with labels at 100 Hz, 1 kHz and 10 kHz.
16. A frequency and dB readout on hover.

These were assumed and not asked:
- Merged columns keep each band's loudest value.
- The strip is blank outside the file.
- The readout works in all three views.

These were decided while writing this spec:
- How a band is filled: summed power, or the one step it lies in.
- The scale, where a full-scale sine reads 0 dB.

Concept note 14 may revisit both once it is measured.

### Measured before the spec (native ffmpeg, Node, 60 s from 20:00)

| | Level at 15 kHz | Level at 16 kHz | Note |
| --- | --- | --- | --- |
| `sample-crossfade.m4a` | −70 dB | −95 dB | |
| `sample-crossfade.mp3` | −70 dB | −96 dB | |
| `sample1.m4a` | −106 dB | −120 dB | Also −67 dB at 5 kHz |
| `sample1.mp3` | −105 dB | −126 dB | |
| `sample1.opus` | −101 dB | −119 dB | |

Levels are relative to each file's loudest step.

- **The wall.** Every sample drops below −95 dB by 16 kHz. This is probably the AAC source they were made from, not their own format.
- **FFT cost.** A 2048-point FFT took 25.6 to 26.9 µs per spectrum. At one spectrum per 50 ms window, that's about 6 s more for a 3 h file (inferred), against 19.2 s for a 3 h m4a today (concept note 02). The concept note measures it in the browser.

### When the milestone ships

- `docs/architecture.md`: the source-file store gains a third summary.
- `README.md`: one "What it does" line.
- `CHANGELOG.md`: a line under `[Unreleased]`.
- The v2 milestones file: milestone 7's entry and its open questions.
- GitHub issue #17: the decisions above, and the "#12 falls back on it" line removed, since #12 shipped on the loudness curve alone. Its new text is shown to the user before it is posted.
