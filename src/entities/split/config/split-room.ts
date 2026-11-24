// A split stays at least this far from its neighbours and from the file's start and end.
export const MINIMUM_DISTANCE_SECONDS = 1

/*
Distances are compared with a hair of tolerance, because a split a step away from its limit can
sit an ulp off it.
*/
export const LIMIT_TOLERANCE = 1e-9
