# 01: Concept note 14, the spectrum

**What to build:** the concept note for milestone 7, shaped like the notes before it. It teaches that any stretch of sound is a sum of tones, and how the app finds how much of each, using the user's own samples. Per `AGENTS.md` ("Learning first"), the idea is explained in chat first, with a number measured on a real sample. No code for this milestone starts until the user confirms the note.

**Blocked by:** None (can start immediately).

**Status:** resolved

Spec: `.scratch/spectrogram/spec.md` (Implementation Decisions, "What is computed"; Further Notes, "Measured before the spec").

- [x] The idea is explained in chat before the note is written, with a number measured on a real sample.
- [x] The idea comes before the numbers:
  - a sound as a sum of tones;
  - one spectrum as how strong each tone is in one short moment;
  - the spectrogram as spectra side by side over time.
- [x] The plain DFT comes first, as one comparison against a tone per frequency, timed per spectrum on a real frame.
- [x] The FFT follows, as the same answer found faster, timed per spectrum (about 26 µs measured in Node; measured again in the browser).
- [x] The Hann window, and why a frame is not cut off square.
- [x] The time–frequency trade:
  - 2048 samples is 46 ms, with steps of about 22 Hz;
  - why the bottom octave draws as blocks;
  - what 4096 samples would cost.
- [x] The bands:
  - 128 on a log axis from 50 Hz to half the sample rate;
  - a band holds the summed power of its steps, and one too narrow for any step takes the step it lies in;
  - the dB scale, where a full-scale sine reads 0 dB, and −100 dB is the floor.
- [x] The 16 kHz wall measured on every sample, and what an encoder's lowpass is.
- [x] The cost of building it in the load loop:
  - one spectrum per 50 ms loudness window;
  - the extra load time for 1 h and 3 h;
  - about 28 MB for 3 h.
- [x] Why it is built in the load loop and kept as bands, rather than decoded again on demand. This stands in for an ADR.
- [x] A "Where it lives in the code" section is in place, filled in by ticket 05.
- [x] The README's concept-note list gains note 14.
- [x] The user has confirmed the note.

## Comments

- Measured on 2026-11-26 (Node 24.22, Chrome 158 via Playwright), scripts kept out of the repo. The FFT with its twiddles worked out once is 18.4 µs (Node) and 15.9 µs (Chrome). The spec's 26 µs was a different FFT; one that works out cos/sin inside the loop is 124 µs. Ticket 02 should precompute twiddles per frame size.
- A full-scale sine reads exactly 0 dB only where a band holds the whole Hann spike (5 kHz, 15 kHz). At 1 kHz and in the one-step bands under 446 Hz it reads −2 to −2.8 dB. Ticket 02's "reads about 0 dB" case should use a sine of a few kHz, or allow 3 dB.
- The scale's reference is the one-sided power of a full-scale sine through the Hann window, N · Σw² / 4 (393,216 at N = 2048).
- "The step it lies in" is read as the step nearest the band's middle.
- One column (window, FFT, 128 bands, bytes) is 17.3 µs in Chrome: about 3.7 s of compute for 3 h, against the spec's inferred 6 s. Ticket 05 measures the real load.

