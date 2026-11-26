# 04: The readout under the pointer

**What to build:** hovering the spectrogram strip in any of the three views shows the frequency and the level under the pointer, as "1.0 kHz · −32 dB". It lets the user read a tone or the encoder's wall off the picture instead of guessing.

**Blocked by:** 02, 03.

**Status:** resolved

Spec: `.scratch/spectrogram/spec.md` (Implementation Decisions, "How the views change"; User Stories 22 to 24). Prior art: the loudness curve's readout.

- [x] Height to frequency is the inverse of frequency to height on the strip's log axis, at its ends and at its labels, in its spec.
- [x] The readout text is formatted as "1.0 kHz · −32 dB" (and "250 Hz" below 1 kHz), in its spec.
- [x] Hovering the strip shows the readout in the Split view, the Track view and the Range view; leaving the strip hides it.
- [x] It reads the band and column under the pointer before any merge, so a merged stretch still reports the moment under the pointer.
- [x] Hovering the waveform above shows no readout, and the pointer's other actions are unchanged.
- [x] Checked by hand in the browser: the 1 kHz tone file reads about 1.0 kHz, and the samples read below −95 dB above 16 kHz.
- [x] `CHANGELOG.md` gains its line under `[Unreleased]` in the same commit.

## Comments

- The readout is an HTML plate (`ui/SpectrogramReadout.vue`) beside the pointer, not canvas text, so a view spec can read it. It is `aria-hidden`, since it repeats the picture and changes on every move. Past the view's middle it sits left of the pointer.
- It shows the frequency at the pointer's height (`yToFrequency`), not the band's centre, and the dB of the band holding it in the column holding the pointer's time (`lib/read-spectrogram.ts`), read before any merge.
- `lib/use-spectrogram-readout.ts` is shared by the three views. Each view's frame now sends `pointermove` to both the drag and the readout, and `pointerleave` hides it. The drags are unchanged.
- The level is rounded to the dB with `Math.round`, so −7.5 reads "−7 dB". "kHz" starts where the whole-Hz figure would reach 1000.
- Hand check in Chrome, Split view: on `samples/tone-1khz.m4a` the loudest reading was "973 Hz · −30 dB", in band 62 (955–1001 Hz). The level fits the ffmpeg `sine` source's 1/8 amplitude, halved. On `sample1.m4a` every reading above 16 kHz was −100 dB. No readout over the waveform.

