/*
A time in seconds, rounded to the millisecond: 0.1 + 0.2 is 0.30000000000000004 in floats, and
329.05 - 4 is 325.04999999999995, which would go on an ffmpeg command line as it is.
*/
export const roundToMillisecond = (seconds: number) => Math.round(seconds * 1000) / 1000
