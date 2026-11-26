/*
The depth, in dB, from which a detected split is sure and from which it is likely; under the second
it is doubtful. Calibrated on gapped files of one channel (docs/concepts/13-adaptive-threshold.md,
"Depth as a confidence"), so "likely" means "check this", not "probably real". The planned ear check
on `sample-crossfade.mp3` was dropped: that file blends throughout, so no boundary can be heard.
*/
export const SURE_DEPTH_DB = 15
export const LIKELY_DEPTH_DB = 9

/*
The contrast, in dB, from which a contrast split is likely; under it, doubtful. It is never sure:
contrast also hears a change of sound inside a track. On 10 s crossfades a peak from 6.5 dB was real
87 % of the time, one from 5.4 to 6.5 dB 36 % (docs/concepts/15-contrast.md, "Contrast as a
confidence").
*/
export const LIKELY_CONTRAST_DB = 6.5

/*
A dip with a contrast peak within this many seconds goes up one band while contrast is on: two
detectors agree on the boundary. On the test mixes a 9 to 15 dB dip with a peak was real 88 % of the
time, as often as a 15 dB dip alone (docs/concepts/15-contrast.md, "Contrast as a confidence").
*/
export const CONTRAST_AGREEMENT_SECONDS = 5
