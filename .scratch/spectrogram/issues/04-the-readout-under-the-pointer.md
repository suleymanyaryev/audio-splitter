# 04: The readout under the pointer

**What to build:** hovering the spectrogram strip in any of the three views shows the frequency and the level under the pointer, as "1.0 kHz · −32 dB". It lets the user read a tone or the encoder's wall off the picture instead of guessing.

**Blocked by:** 02, 03.

**Status:** ready-for-agent

Spec: `.scratch/spectrogram/spec.md` (Implementation Decisions, "How the views change"; User Stories 22 to 24). Prior art: the loudness curve's readout.

- [ ] Height to frequency is the inverse of frequency to height on the strip's log axis, at its ends and at its labels, in its spec.
- [ ] The readout text is formatted as "1.0 kHz · −32 dB" (and "250 Hz" below 1 kHz), in its spec.
- [ ] Hovering the strip shows the readout in the Split view, the Track view and the Range view; leaving the strip hides it.
- [ ] It reads the band and column under the pointer before any merge, so a merged stretch still reports the moment under the pointer.
- [ ] Hovering the waveform above shows no readout, and the pointer's other actions are unchanged.
- [ ] Checked by hand in the browser: the 1 kHz tone file reads about 1.0 kHz, and the samples read below −95 dB above 16 kHz.
- [ ] `CHANGELOG.md` gains its line under `[Unreleased]` in the same commit.
