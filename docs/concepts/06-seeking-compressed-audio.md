# 06 · Seeking compressed audio

Milestone 5 lets the user move a split. This milestone lets them hear it. The obvious way is a hidden `<audio>` element on the source file: set `currentTime` to the split minus 4 s and press play. For `.m4a` and `.opus` that works to the sample. For a variable-bitrate MP3 Chrome starts seconds away from the time it was given, so the user would hear a different place than the one on the screen. The fix is to not seek in the file at all: decode the 8 s around the split with ffmpeg, wrap them in a WAV and play that.

## The words

- **Frame** (MP3, AAC) and **packet** (what ffmpeg calls one frame of any codec, Opus included): the smallest piece a compressed file stores and a decoder can start from. An MP3 frame is 1,152 samples (26.12 ms at 44.1 kHz), an AAC frame 1,024 (23.22 ms), an Opus packet 20 ms. A frame has a size in bytes; a loud, busy stretch needs more bytes than a quiet one.
- **Bitrate**: bytes per second of audio, written in kilobits (kb/s). In a **constant-bitrate (CBR)** file every frame has the same size, so byte = time × bitrate and a seek is a multiplication. In a **variable-bitrate (VBR)** file the frame sizes differ, so no formula gives the byte where a time starts.
- **TOC** (table of contents): what a VBR MP3 carries instead, in its Xing/LAME header: 100 entries, entry _n_ being the byte where _n_ % of the duration starts. A player reads between two entries by drawing a straight line. `.m4a` has a full table of every frame's time and byte, and Ogg pages carry their own sample position, so those two seek exactly.
- **PCM** (note 01): the samples themselves, as numbers. **WAV**: PCM behind a **header**, 44 bytes that say "16-bit, 2 channels, 44,100 per second, this many bytes". Every browser plays it, and a time in it is just a byte: second `t` starts at `44 + t × rate × channels × 2`.

## Worked example: `samples/sample1.mp3`

The file is 71,755,972 bytes for 3,686.21 s: 155.7 kb/s on average, 19,466 bytes per second, in 141,114 frames. One frame is as small as 104 bytes (32 kb/s) and as large as 1,044 (320 kb/s); averaged over one second the rate runs from 79 to 193 kb/s. So "byte = time × bitrate" cannot work.

**The split at 329.05 s** (note 05; the frame holding it starts at 329.038 s). ffprobe says that frame is at byte **6,752,229**. Two ways to guess it:

| Guess                                            | Byte      | Off by     | Plays from             |
| ------------------------------------------------ | --------- | ---------- | ---------------------- |
| 329.05 × 19,466 B/s (constant rate)              | 6,405,613 | −346,616 B | 310.78 s (−18.3 s)     |
| The TOC, entry 8 (22) to 9 (24), 93 % of the way | 6,685,907 | −66,322 B  | 325.46 s (**−3.59 s**) |

The TOC does better but is still not close: its 100 entries are whole numbers out of 256 (one unit is 280,296 bytes, 14.4 s of audio), so each entry is rounded by up to ±7 s. Entry 8 (294.9 s) holds 22 where the file has 21.70. The straight line between two entries cannot undo that. The spike measured Chrome's `<audio>` on 11 points of this file: **2 to 10 s off**, the CBR re-encode within 39 ms, `.m4a` and `.opus` exactly (ticket 12). Chrome's own recipe is not the same as the plain one above, so only the size of the error carries over, not its sign.

**The clip.** Decode 8 s with 1 s of pre-roll (note 02), from 325.05 to 333.05 s:

`-ss 324.05 -i input -ss 1 -t 8 -map 0:a:0 -c:a pcm_s16le -f wav clip.wav`

The `-ss` before `-i` jumps near the spot; the one after is exact. Compared with the same stretch of a one-pass decode, the `.mp3` and `.opus` clips are identical sample for sample (705,600 and 768,000 samples), and the `.m4a` clip differs in 212 of 705,600 samples by at most 15 of 32,768 (−66.8 dBFS). Without the pre-roll the MP3 clip starts wrong: 5,702 samples differ, the worst by 2,769 (−21.5 dBFS), for the first 67 ms.

| Format  | Rate, channels | 8 s as WAV (44-byte header)         | Frame / packet (bytes)  |
| ------- | -------------- | ----------------------------------- | ----------------------- |
| `.m4a`  | 44,100, 2      | 8 × 44,100 × 2 × 2 + 44 = 1,411,244 | 23.22 ms (6 to 1,356)   |
| `.mp3`  | 44,100, 2      | 1,411,244                           | 26.12 ms (104 to 1,044) |
| `.opus` | 48,000, 2      | 8 × 48,000 × 2 × 2 + 44 = 1,536,044 | 20 ms (3 to 494)        |

That is 1.4 to 1.5 MB, dropped when the next press replaces it. (ffmpeg writes a 34-byte tag after the header by default, 78 bytes in all; the player does not care.)

**What it costs.** Native ffmpeg 8.1, one clip, median of 7 runs, only to compare formats; the browser's ffmpeg.wasm is slower, and the milestone expects up to about 1 s near the end of a long MP3:

| Clip centred at | `.m4a` | `.mp3` | `.opus` |
| --------------- | ------ | ------ | ------- |
| 10 s            | 42 ms  | 35 ms  | 43 ms   |
| 1,800 s         | 41 ms  | 95 ms  | 43 ms   |
| 3,600 s         | 42 ms  | 155 ms | 43 ms   |

`.m4a` and `.opus` jump straight to the spot; ffmpeg finds an MP3 spot by reading from the start, so the wait grows with position (note 02, "Decode times").

**Near the ends of the file.** The clip starts at `max(0, S − 4)` and the pre-roll is whatever room is left before that (up to 1 s, none at 0 s). A split at 4.5 s gives a clip of 0.5 to 8.5 s, and a split at 3,685 s gives 5.21 s, because the file ends. Both are identical to the one-pass decode in all three formats, so the playhead only needs the clip's real start time: `t = start + currentTime`.

## Where it lives in the code

- [`src/entities/source-file/api/decode-clip.ts`](../../src/entities/source-file/api/decode-clip.ts): the clip command above, for a split time: start at `max(0, S − 4)`, up to 1 s of pre-roll, `-t 8`, `pcm_s16le` to WAV. It returns the bytes and the clip's start time.
- [`src/entities/source-file/model/source-file.ts`](../../src/entities/source-file/model/source-file.ts): keeps the ffmpeg session open after the load, so a press does not load the core again. Each clip is one call and counts toward the 20-call reload budget (note 02).
- [`src/widgets/split-zoom/model/audition.ts`](../../src/widgets/split-zoom/model/audition.ts): the hidden `<audio>` element on the clip's blob URL; play, stop by itself at the end, and stop when the split moves, is deselected or another is selected.
- [`src/widgets/split-zoom/ui/SplitZoom.vue`](../../src/widgets/split-zoom/ui/SplitZoom.vue): Space in the Split view plays and stops, wherever the focus is; the 1 px ink playhead, drawn from `currentTime` on each animation frame.
- [`src/pages/review/ui/ReviewPage.vue`](../../src/pages/review/ui/ReviewPage.vue): the "Play across split" button, reading "Stop" while it plays.
