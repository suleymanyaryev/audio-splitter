/*
A range (GLOSSARY.md) is what the user drags out on the whole-file view to listen to. Under 1 s it
is no range but a click, and a range longer than 10 min is cut at 10 min from where the drag began:
playing one means decoding it to a WAV of 176 KB per second, 106 MB for 10 min
(docs/concepts/08-listening-to-a-range.md).
*/
export const MINIMUM_RANGE_SECONDS = 1
export const MAXIMUM_RANGE_SECONDS = 600
