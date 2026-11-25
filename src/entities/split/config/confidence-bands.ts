/*
The depth, in dB, from which a detected split is sure and from which it is likely; under the second
it is doubtful. Calibrated on gapped files of one channel (docs/concepts/13-adaptive-threshold.md,
"Depth as a confidence"), so "likely" means "check this", not "probably real". The ear check on a
crossfaded file may move them.
*/
export const SURE_DEPTH_DB = 15
export const LIKELY_DEPTH_DB = 9
