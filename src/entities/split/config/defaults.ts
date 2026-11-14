/*
The starting points of gap finding, calibrated by ear on sample1.m4a, sample1.mp3 and sample1.opus.
The candidates and what the ear decided are in docs/concepts/04-gaps-become-splits.md.
*/

// The silence threshold starts this many dB under the loudness curve's median.
export const DEFAULT_OFFSET_DB = 18

// The minimum gap length starts here, in seconds.
export const DEFAULT_MINIMUM_GAP_SECONDS = 2
