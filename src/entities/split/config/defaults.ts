/*
The starting points of gap finding, calibrated by ear on sample1.m4a, sample1.mp3 and sample1.opus.
The candidates and what the ear decided are in docs/concepts/04-gaps-become-splits.md.
*/

// The silence threshold starts this many dB under the loudness curve's median.
export const DEFAULT_OFFSET_DB = 18

// The minimum gap length starts here, in seconds.
export const DEFAULT_MINIMUM_GAP_SECONDS = 2

/*
The two settings' sliders: the threshold covers the loudness curve's drawn range, −60 to 0 dB, and
the minimum gap length runs from a few windows to a long pause, both in tenths. A saved default
settings is held to them.
*/
export const THRESHOLD_MIN_DB = -60
export const THRESHOLD_MAX_DB = 0
export const MINIMUM_GAP_MIN_SECONDS = 0.2
export const MINIMUM_GAP_MAX_SECONDS = 5
export const SETTING_STEP = 0.1

// Where the user's default settings are kept between visits: one key, with a version in its value.
export const DEFAULT_SETTINGS_STORAGE_KEY = 'audio-splitter:default-settings'
