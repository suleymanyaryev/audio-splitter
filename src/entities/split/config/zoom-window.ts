/*
The zoom view shows a fixed stretch of the source file, centred on a time (ticket 13). Peaks are
10 ms buckets, so 20 s is 2000 of them. The split store limits moves to it, the zoom view draws it
and the whole-file view outlines it.
*/
export const ZOOM_WINDOW_SECONDS = 20
