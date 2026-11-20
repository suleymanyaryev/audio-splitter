// The volume slider runs from the quietest level to full, one decibel a step: a step sounds like
// the same change in loudness wherever it is (docs/concepts/09-volume-is-gain.md). 0 dB is the
// most the element can play, so the slider cannot boost and cannot clip.
export const MIN_VOLUME_DB = -40
export const MAX_VOLUME_DB = 0
export const VOLUME_STEP_DB = 1

// Where the level and the mute flag are kept between visits.
export const VOLUME_STORAGE_KEY = 'audio-splitter:volume'
