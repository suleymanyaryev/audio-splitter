# 09 · Volume is gain

Until now the app played sound at whatever level the computer was set to. This note is about the volume slider that sets how loud the audition, the range and the track are heard, from inside the app. The slider is a small thing to build, and the one idea under it is worth getting right first: volume is a number the sound is **multiplied** by, and the slider steps in **decibels** because that is how we hear.

## The words

- **Amplitude**: how far a sample is from zero, on the scale of notes 01 and 03: −1 to 1, where ±1 is the loudest the format can hold ("full scale").
- **Gain**: a number every sample is multiplied by. Gain 1 changes nothing, 0.5 halves the amplitude, 0 is silence, 2 would double it (and a sample at 0.7 would then ask for 1.4, which the format cannot hold: it clips). This is all a volume control is. It is **linear gain**: a plain multiplication.
- **Decibel (dB)**: the same quantity on a log scale, as in note 03: `20 * Math.log10(gain)`. The other way round, `gain = 10 ** (dB / 20)`. 0 dB is gain 1; every **−6.02 dB halves** the amplitude and every **−20 dB divides it by ten**, so −40 dB is a hundredth. A gain below 1 is a negative number of dB, and the dB of 0 is `-Infinity`, which is why mute is its own switch and not "the lowest dB".
- **Linear slider** versus **dB slider**: a slider is a number between its two ends. If that number is the gain, the left tenth of the slider holds everything from −20 dB down to silence, and the right half is only 6 dB wide. The ear hears ratios (a drop of about 10 dB sounds roughly half as loud), so on a linear slider the first nudge from the right end changes almost nothing and the last few millimetres at the left change everything. If the number on the slider is the dB, one step is the same change in loudness wherever it is. That is why this slider runs from −40 dB to 0 dB in 1 dB steps, and why the app turns the number into a gain only at the last moment.
- **`HTMLMediaElement.volume`**: the `<audio>` element's own gain, between 0 and 1. It is linear (checked below), and a value outside 0 to 1 throws. So the loudest the app can be is gain 1, 0 dB: the slider cannot boost, which means it cannot clip. `muted` is a second switch on the element that silences it without touching `volume`.

## Worked example: `samples/sample1.m4a`

The window of note 03 at 1:00.000 (2,205 samples after the downmix) has a peak of **0.2170** (−13.27 dB) and an RMS of **0.12378** (−18.15 dB). Native ffmpeg 8.1 on the whole file (`volumedetect`, 2026-11-21) says it peaks at **0.0 dB**: somewhere it reaches full scale, so at 0 dB on the slider that sample passes untouched, and no setting can push it over.

| Slider | Gain (`10 ** (dB / 20)`) | That peak becomes    | That RMS becomes      | As 16-bit |
| ------ | ------------------------ | -------------------- | --------------------- | --------- |
| 0 dB   | 1                        | 0.2170 (−13.27 dB)   | 0.12378 (−18.15 dB)   | 7,111     |
| −6 dB  | 0.5012                   | 0.1088 (−19.27 dB)   | 0.06204 (−24.15 dB)   | 3,564     |
| −20 dB | 0.1                      | 0.02170 (−33.27 dB)  | 0.012378 (−38.15 dB)  | 711       |
| −40 dB | 0.01                     | 0.002170 (−53.27 dB) | 0.0012378 (−58.15 dB) | 71        |

Two things to read off it. The dB column of "becomes" is the old dB **plus the slider's dB**: −13.27 − 6 = −19.27, −13.27 − 20 = −33.27. Gain is a multiplication, and a log turns a multiplication into an addition: that is the whole reason decibels exist. And the bottom of the slider is not silence: at −40 dB the loudest bit of that window peaks at −53.27 dB, about where the gap between two tracks sits (−54.42 dB RMS in note 03), so the music is as quiet as the space between songs, and no quieter. Silence is mute's job.

A handful of the 41 steps, so the slider has a feel: −1 dB is 0.8913, −3 dB 0.7079, −6 dB 0.5012, −10 dB 0.3162, −20 dB 0.1, −30 dB 0.03162, −40 dB 0.01. Mute does not appear: it is a flag, so unmuting returns to the dB that was set, not to a number that was lost on the way down.

**Checked in Chrome (2026-11-21).** A 440 Hz tone at amplitude 0.5 in a 16-bit WAV, played by an `<audio>` element and measured after the element with an analyser node: the peak read 0.5000 at `volume = 1`, 0.0500 at `0.1` and 0.0050 at `0.01`. Chrome's `volume` is a plain multiplier, so the table above is what is heard.

## Where gain happens, and where it does not

**Playback only.** ffmpeg decodes a stretch to a WAV and the player holds it (note 08). The WAV is the sound at its original level; the element multiplies it as it plays. That has three consequences, and they are the spec's:

- A change applies to sound that is already playing: the element's `volume` is set and the next samples it hands out are scaled. Nothing is decoded again.
- The decoded WAV is never touched, so a window held for a pause or a replay plays at whatever the slider says now.
- An exported file is the compressed frames copied from the source (note 07). Export does not use the player, so no volume setting can reach a file.

**Remembered across a reload.** The level and the mute flag are saved to `localStorage` on every change and read when the player is made. The first time (nothing saved), or when the browser blocks storage, it is 0 dB and unmuted: the app sounds as the file does until the user changes it. A saved value that is not a whole number from −40 to 0, or a mute flag that is not a boolean, is ignored and the default is used.

## Where it lives in the code

- [`src/shared/lib/audio/decibels-to-gain.ts`](../../src/shared/lib/audio/decibels-to-gain.ts): `10 ** (dB / 20)`, one line, with its spec: the table above, from outside the function. It sits beside `loudness-builder.ts`, which does the other direction.
- [`src/widgets/split-zoom/model/audition.ts`](../../src/widgets/split-zoom/model/audition.ts): the one player. It owns the level in dB (`volumeDecibels`) and the mute flag (`isMuted`), changed by `setVolume` (whole dB, held to the range) and `toggleMute`. A synchronous watcher applies them to the element as `volume` and `muted` and saves them; `audioElement()` applies them when the element is made.
- [`src/widgets/split-zoom/lib/saved-volume.ts`](../../src/widgets/split-zoom/lib/saved-volume.ts): reads and writes the one `localStorage` entry, a JSON object with the level and the flag. A value that is not what it writes, or storage that throws, gives 0 dB and unmuted.
- [`src/widgets/split-zoom/config/volume.ts`](../../src/widgets/split-zoom/config/volume.ts): −40, 0 and 1, the slider's range and step, and the storage key.
- [`src/widgets/split-zoom/ui/VolumeControl.vue`](../../src/widgets/split-zoom/ui/VolumeControl.vue): the mute button ("Mute" / "Unmute") and the slider (named "Volume", reading its level in dB through `lib/format-volume.ts`), which [`ReviewPage.vue`](../../src/pages/review/ui/ReviewPage.vue) puts at the end of the zoom panel's title row, in all three views.
- [`DESIGN.md`](../../DESIGN.md) and [`docs/architecture.md`](../architecture.md): the control's look, and the player's volume state.
