# 08 · Listening to a range

The audition ([note 06](06-seeking-compressed-audio.md)) plays 8 s across a split. A range is any stretch the user drags out, up to 10 min, to pause, jump around in and listen to. The method is the same: ffmpeg decodes the stretch to a WAV and the page plays that, never the compressed file. What changes is the size. Eight seconds is 1.4 MB; ten minutes is 106 MB, and that is where the limit comes from. A track can be longer than a range may be, so a long track is heard through a moving window.

## The words

- **Sample frame** (PCM): one sample for each channel, taken at the same instant. Stereo 16-bit is 2 channels × 2 bytes = 4 bytes per sample frame. (Not the same as a compressed frame in note 06, which is 1,024 to 1,152 samples.)
- **Byte rate**: sample rate × bytes per sample frame. In a WAV a time is a byte: second `t` starts at `44 + t × byte rate`.
- **Range**: the stretch of the source file the user drags out, 1 s to 10 min. **Playhead**: the line that shows where playback is, or where it will resume.
- **Window**: the part of a stretch decoded to one WAV, at most 10 min. A stretch of 10 min or less is one window; a longer one is heard through a window that moves along it.

## Worked example: `samples/sample1`

**Why a WAV grows with its length.** At 44,100 samples per second, 2 channels, 2 bytes each, one second is 44,100 × 2 × 2 = **176,400 bytes**. A 10 min range is 600 × 176,400 + 78 = **105,840,078 bytes** (the 44-byte header and a 34-byte tag ffmpeg writes after it), about 106 MB, held in memory as one blob until the range changes. `.opus` decodes at 48,000 per second, so its 10 min is 115,200,078 bytes. The same range in the compressed file is 8 to 15 MB. The 10 min limit keeps the memory to one blob of about 100 MB and the wait short: the slowest decode, a late MP3 in a 3 h file, takes about 2 s in Chrome, and `.m4a` about 0.65 s.

**Why pausing and seeking are exact.** Note 06's `.mp3` has no formula from time to byte, so Chrome's `<audio>` lands 2 to 10 s off. In the WAV there is one: the user pauses 42.5 s into the range, the element's `currentTime` is 42.5, and that is sample frame 42.5 × 44,100 = 1,874,250, at byte 44 + 1,874,250 × 4 = **7,497,044**. Playing again reads from that byte, and a drag of the playhead is the same multiplication. A compressed decoder cannot start inside a frame, but every PCM sample frame stands alone, so the app keeps the WAV and resumes without calling ffmpeg again.

## A track longer than 10 min: a moving window

**The arithmetic.** Take a track of the 3 h MP3 at 10,159.45 s, 764 s long (it ends at 10,923.40 s). The playhead starts at the track's start, so the first window is 10,159.45 s to 10,759.45 s: 600 s, a WAV of 105,840,078 bytes. The next window is due when the playhead is **30 s** from the end of the first, at 10,729.45 s. It starts where the first ends and runs to the track's end: 163.95 s, about 29 MB. The two are held together only around the hand-over, at most 2 × 105.8 MB = 212 MB; when the first ends, its WAV is let go.

**A seek.** Inside the held window it is the same multiplication: `currentTime = x`, exact and immediate. Outside it there is no WAV to read from, so the player lets the windows go and decodes a new one that starts at the seek point and runs 10 min, or to the track's end. The wait is a decode, as for a new range.

**The hand-over.** The window ahead is asked for once, when the playhead is 30 s from the end, so a decode that takes 2 s has 28 s to spare. When the first window ends, the element is pointed at the second's WAV and played. Nothing is decoded then, but the element has to load the new source: a break of about **59 ms** in all three formats. So it is not gapless: a user can hear a short drop-out once per 10 min window. The app keeps one element; the break is about 0.01 % of the time.

## Where it lives in the code

- [`src/entities/source-file/api/decode-clip.ts`](../../src/entities/source-file/api/decode-clip.ts): the clip command for a start and a length, to WAV.
- [`src/entities/split/config/range-limits.ts`](../../src/entities/split/config/range-limits.ts) and [`src/entities/split/lib/range-between.ts`](../../src/entities/split/lib/range-between.ts): the 1 s and 10 min limits, and the range a drag makes.
- [`src/widgets/split-zoom/lib/decode-window.ts`](../../src/widgets/split-zoom/lib/decode-window.ts): which window to decode for a playhead, whether a time is inside one, and when the next is due.
- [`src/widgets/split-zoom/model/player.ts`](../../src/widgets/split-zoom/model/player.ts): the one player, which keeps the WAV so a pause and a seek decode nothing, and plays on into the window ahead.
