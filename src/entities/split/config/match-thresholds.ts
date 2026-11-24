/*
The fixed numbers of Find duplicates, measured on sample1.m4a and sample3h.m4a. What each one means,
the table behind it and the caveat (one soundtrack, one master) are in
docs/concepts/11-finding-repeats.md.
*/

// Pearson's r at or above this is a match: duplicates scored 0.987 up, different tracks 0.831 down.
export const MATCH_MINIMUM_R = 0.95

// A track under this is never compared, and no overlap under it is scored.
export const MINIMUM_COMPARED_SECONDS = 30

// A match is full when it falls short of either track's ends by no more than this.
export const FULL_MATCH_TOLERANCE_SECONDS = 2

// The compared curve has one value per this long, the mean of the windows inside it.
export const COMPARED_STEP_SECONDS = 0.2

// Values under this count as this, so digital silence does not swamp a track's spread.
export const COMPARED_FLOOR_DB = -60
