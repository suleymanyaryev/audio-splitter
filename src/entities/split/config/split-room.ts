// A split stays at least this far from its neighbours and from the file's start and end.
export const MINIMUM_DISTANCE_SECONDS = 1

/*
Distances are compared with a hair of tolerance, because a split a step away from its limit can
sit an ulp off it.
*/
export const LIMIT_TOLERANCE = 1e-9

/*
Proposals closer than this are one boundary and give one split: two gaps around a short sound, a
dip beside a gap, a proposal beside a split that exists. It is also how far a dip must be the
deepest point either way. A track under this long can only be added by hand.
*/
export const BOUNDARY_SPACING_SECONDS = 15

// A dip is never proposed this close to the file's start or end: a fade-in is not a track change.
export const DIP_EDGE_SECONDS = 10

/*
A contrast split keeps this far from every gap, dip and split, and from the file's ends: a minute
either side is the stretch that contrast compares, and the slopes of a real boundary's contrast peak
again 15 to 60 s from it (docs/concepts/15-contrast.md).
*/
export const CONTRAST_ROOM_SECONDS = 60
