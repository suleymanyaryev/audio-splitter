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
