# Audio Splitter: Learning Milestones

A local-first, browser-only web app that takes a long audio file (1h, 2h or more) made of concatenated tracks with gaps between them, and proposes split timestamps. Nothing is uploaded; all processing happens in the browser.

The goal is to learn the underlying audio and signal-processing concepts while building. Each milestone teaches one idea and produces something visible.

## Scope and assumptions

- Input: long audio files where tracks are concatenated with gaps (silence or near-silence) between them.
- Goal: find split-point candidates, let the user review and adjust them, and export the result.
- Non-goal: identifying track names (no fingerprint database, no backend).
- Everything runs client-side, with heavy work in a Web Worker.

## Suggested stack

- Vite + TypeScript
- Plain Canvas for drawing (consider `wavesurfer.js` only after Milestone 1 is understood)
- Web Worker for analysis
- WebCodecs `AudioDecoder` or ffmpeg.wasm for decoding and splitting
- Essentia.js only at Milestone 6, if needed

Write Milestones 1-4 by hand without audio libraries; that is where most of the understanding comes from.

---

## Milestone 1: See the sound (waveform)

**Concepts**
- Digital audio is a list of numbers (PCM samples)
- Sample rate (for example 44,100 samples per second)
- Amplitude, normally in the range -1 to 1
- Channels (mono vs. stereo)
- Decoding compressed formats (mp3, flac, etc.) into raw samples

**Build**
Load a file, decode it, and draw the waveform on a canvas.

**Key lesson**
You can't draw 100 million samples. For each pixel column, compute the min and max of the samples that fall into it and draw a vertical line between them. Every waveform viewer works this way. This is the first "peaks overview" idea.

---

## Milestone 2: Handle huge files

**Concepts**
- Memory math: 2h of stereo float32 at 44.1 kHz is about 2.5 GB
- Downmixing to mono
- Downsampling (11-16 kHz is enough for gap detection)
- Chunked or streaming decode
- Web Workers, so the UI stays responsive

**Build**
A worker that decodes the file in chunks and sends back a compact summary instead of raw samples.

**Key lesson**
Work on features (a few numbers per 50 ms) instead of raw samples.

---

## Milestone 3: Measure loudness over time

This is the heart of the app.

**Concepts**
- Windowing and hop size (for example 50 ms windows)
- RMS energy
- Decibels (a log scale, which matches how hearing works)
- Silence vs. quiet noise

**Build**
An RMS-in-dB curve, one value per window, plotted under the waveform.

**Key lesson**
"Silence" is rarely digital zero. Real gaps contain tape hiss, room noise, or fade tails, so you need a dB threshold (for example -50 dBFS) rather than an exact zero check.

---

## Milestone 4: Turn the loudness curve into split candidates

**Concepts**
- Thresholding
- Minimum duration (ignore gaps shorter than about 1 s)
- Hysteresis: separate enter and exit thresholds to avoid flicker
- Adaptive threshold: relative to the file's noise floor, not a fixed number

**Build**
Find each quiet region and propose a split at its midpoint. Add sliders for threshold, minimum duration and window size so you can tune parameters live and watch the markers move.

**Key lesson**
The hard part is false positives, such as a quiet intro or a breakdown inside a track. That motivates Milestone 6.

---

## Milestone 5: Review UI and export

**Concepts**
- A confidence score per candidate
- Snapping cuts to zero-crossings so splits don't click
- The CUE sheet format

**Build**
- Click a marker to play about ±3 s around it
- Drag or delete markers, or add new ones
- Export a CUE file, or split into separate files with ffmpeg.wasm

---

## Milestone 6 (only if needed): Add spectral features

**Concepts**
- The Fourier transform and the spectrogram
- Spectral flux
- MFCC as a "timbre fingerprint"
- Optionally: audio embeddings (for example CLAP) via Transformers.js or onnxruntime-web

**Build**
A score for how much the sound changes across a candidate gap, used to rank or reject the Milestone 4 candidates. Real track boundaries tend to change timbre; quiet passages inside a track usually don't.

**Key lesson**
This is where ML would slot in, but you may find you don't need it for gapped, concatenated tracks.

---

## Working approach

For each milestone: a short concept explanation, a small exercise, then implementation. Optionally, a throwaway prototype of Milestones 1-4 can be built first to validate the idea on a real file before going deep on each concept.

## Open questions

- How tight are the gaps in the real files (digital silence, hiss, fade-outs)?
- What are typical track lengths and the shortest expected track?
- Preferred export: CUE sheet, split files, or both?
- Which browsers must be supported (WebCodecs availability varies)?
