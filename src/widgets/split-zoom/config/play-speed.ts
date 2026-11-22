// The play speed slider runs from half speed to double, a tenth a step, and starts at real time. The
// browser keeps the pitch at every speed (docs/adr/0004-time-stretching-by-the-browser.md).
export const MIN_PLAY_SPEED = 0.5
export const MAX_PLAY_SPEED = 2
export const PLAY_SPEED_STEP = 0.1
export const DEFAULT_PLAY_SPEED = 1

// Where the play speed is kept between visits, apart from the volume's.
export const PLAY_SPEED_STORAGE_KEY = 'audio-splitter:play-speed'
