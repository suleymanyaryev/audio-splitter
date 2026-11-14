# Default silence threshold

Type: grilling
Status: resolved
Blocked by: 01, 07

## Question

What silence threshold and minimum gap length does detection start with? `sample1.m4a`'s gaps are fade tails at −30 to −40 dB under a music level of about −14.8 dB, so the draft's fixed −50 dB proposes nothing ([Add sample files](01-add-sample-files.md)). Decide whether the default is a fixed value or derived from the file's own loudness curve, and when its number is calibrated.

## Answer

Resolved 2026-11-13 by grilling; the user accepted every recommendation.

- **Relative default.** The silence threshold starts at the loudness curve's median minus a fixed offset in dB, computed once per file when analysis ends, and the Slider starts there. On `sample1.m4a` (music around −14.8 dB, gaps at −30 to −40 dB) an offset of about 15 dB lands near −30 dB. A fixed default would only suit files mastered at one loudness.
- **The numbers are calibrated in the detection milestone**, with the user, on `sample1.m4a`, `sample1.mp3` and `sample1.opus`, comparing the proposed splits with what the user hears. That calibration is part of the lesson. Starting points: offset about 15 dB, minimum gap length about 1 s.
- After the first detection the Slider is a plain value; moving it does not re-derive anything.

## Comments

### 2026-11-14: measured by the loudness milestone

The "music around −14.8 dB" above is ffmpeg's `volumedetect` mean (`mean_volume`), not the curve's median. Measured on `sample1.m4a` with the app's own curve (50 ms windows of the mono downmix, [note 03](../../../docs/concepts/03-loudness.md)): median **−16.72 dB**, so an offset of 15 dB starts the threshold near **−31.7 dB**. The "−30 to −40 dB" is where the curve crosses on its way into a gap; the long gaps bottom out at −54 to −63 dB. The decision is unchanged; the numbers are still calibrated in the detection milestone.

### 2026-11-15: calibrated by the detection milestone

Calibrated with the user, listening to clips of `sample1.m4a` around every split the candidates disagreed on: **offset 18 dB (threshold −34.72 dB) and minimum gap length 2 s**. They give 33 splits on all three formats, every track 93 to 139.5 s. 15 dB / 1 s (65 splits) was too eager, with splits in shallow fade dips and 2.7 s tracks; 20 dB / 2 s (30 splits) merged two real tracks into one of 194 s. Details and numbers in [note 04](../../../docs/concepts/04-gaps-become-splits.md). The decision itself is unchanged: relative default, computed once.
