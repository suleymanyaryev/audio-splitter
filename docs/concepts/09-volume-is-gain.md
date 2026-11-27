# 09 · Volume is gain

A volume control sets how loud the audition, the range and the track are heard, from inside the app. The idea under it is worth getting right: volume is a number the sound is **multiplied** by, and the slider steps in **decibels** because that is how we hear.

## The words

- **Amplitude**: how far a sample is from zero, on the scale of [note 01](01-sound-is-numbers.md): −1 to 1, where ±1 is full scale.
- **Gain**: a number every sample is multiplied by. Gain 1 changes nothing, 0.5 halves the amplitude, 0 is silence. A gain of 2 would double it, and a sample at 0.7 would then ask for 1.4, which the format cannot hold: it **clips**. This plain multiplication is all a volume control is: **linear gain**.
- **Gain in decibels**: the dB of [note 03](03-loudness.md), `20 * Math.log10(gain)`, and the other way round `gain = 10 ** (dB / 20)`. 0 dB is gain 1, every −6.02 dB halves it and −20 dB is a tenth, so a gain below 1 is a negative number of dB. The dB of 0 is `-Infinity`, which is why mute is its own switch and not "the lowest dB".
- **Linear slider** against **dB slider**: if the slider's number is the gain, its left tenth holds everything from −20 dB down to silence, and its right half is only 6 dB wide. The ear hears ratios, so on such a slider the first nudge from the right changes almost nothing and the last millimetres at the left change everything. If the slider's number is the dB, one step is the same change in loudness wherever it is. So this slider runs from −40 dB to 0 dB in 1 dB steps, and the number becomes a gain only at the last moment.
- **`HTMLMediaElement.volume`**: the `<audio>` element's own gain, from 0 to 1. It is a plain multiplier: a tone of amplitude 0.5 measured after the element reads 0.0500 at `volume = 0.1`. A value outside 0 to 1 throws, so the loudest the app can be is 0 dB: the slider cannot boost, so it cannot clip. **`muted`** silences the element without touching `volume`, so unmuting returns to the level that was set.

## Worked example: `samples/sample1.m4a`

The window of note 03 at 1:00.000 peaks at **0.2170** (−13.27 dB) and has an RMS of **0.12378** (−18.15 dB). Native ffmpeg's `volumedetect` says the whole file peaks at 0.0 dB, full scale, so at 0 dB on the slider that sample passes untouched, and no setting can push it over.

| Slider | Gain (`10 ** (dB / 20)`) | That peak becomes    | That RMS becomes      | As 16-bit |
| ------ | ------------------------ | -------------------- | --------------------- | --------- |
| 0 dB   | 1                        | 0.2170 (−13.27 dB)   | 0.12378 (−18.15 dB)   | 7,111     |
| −6 dB  | 0.5012                   | 0.1088 (−19.27 dB)   | 0.06204 (−24.15 dB)   | 3,564     |
| −20 dB | 0.1                      | 0.02170 (−33.27 dB)  | 0.012378 (−38.15 dB)  | 711       |
| −40 dB | 0.01                     | 0.002170 (−53.27 dB) | 0.0012378 (−58.15 dB) | 71        |

Two things to read off it. The new dB is the old dB **plus the slider's dB**: −13.27 − 6 = −19.27. Gain is a multiplication, and a log turns a multiplication into an addition: that is the whole reason decibels exist. And the bottom of the slider is not silence: at −40 dB the loudest bit of that window peaks at −53.27 dB, about where the gap between two tracks sits (−54.42 dB RMS in note 03). The music is as quiet as the space between songs, and no quieter. Silence is mute's job.

A few of the 41 steps, so the slider has a feel: −1 dB is 0.8913, −3 dB 0.7079, −6 dB 0.5012, −10 dB 0.3162, −20 dB 0.1, −30 dB 0.03162, −40 dB 0.01.

## Gain happens on playback only

ffmpeg decodes a stretch to a WAV, and the player holds it ([note 08](08-listening-to-a-range.md)). The WAV is the sound at its original level, and the element multiplies it as it plays. So:

- A change applies to sound that is already playing: the next samples the element hands out are scaled. Nothing is decoded again.
- A held window plays at whatever the slider says now, because the WAV itself is never touched.
- An exported file is the source's compressed frames, copied ([note 07](07-cutting-without-re-encoding.md)). No volume setting can reach it.

## Where it lives in the code

- [`src/shared/lib/audio/decibels-to-gain.ts`](../../src/shared/lib/audio/decibels-to-gain.ts): `decibelsToGain`, `10 ** (dB / 20)`. The other direction is in `loudness-builder.ts`.
- [`src/widgets/split-zoom/api/audio-element.ts`](../../src/widgets/split-zoom/api/audio-element.ts): `setVolume` turns the level into the element's `volume`, and the mute flag into `muted`.
- [`src/widgets/split-zoom/config/volume.ts`](../../src/widgets/split-zoom/config/volume.ts): −40 dB, 0 dB and the 1 dB step.
