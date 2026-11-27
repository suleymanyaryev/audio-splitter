# 06 · Seeking compressed audio

To hear a split, the obvious way is a hidden `<audio>` element on the source file: set `currentTime` to the split minus 4 s and press play. For `.m4a` and `.opus` that works to the sample. For a variable-bitrate MP3 Chrome starts seconds away from the time it was given, so the user would hear a different place than the one on the screen. The fix is to not seek in the file at all: decode the 8 s around the split with ffmpeg, wrap them in a WAV and play that.

## The words

- **Frame** (MP3, AAC) and **packet** (what ffmpeg calls one frame of any codec, Opus included): the smallest piece a compressed file stores and a decoder can start from. An MP3 frame is 1,152 samples (26.12 ms at 44.1 kHz), an AAC frame 1,024 (23.22 ms), an Opus packet 20 ms. A frame has a size in bytes; a loud, busy stretch needs more bytes than a quiet one.
- **Bitrate**: bytes per second of audio, written in kilobits (kb/s). In a **constant-bitrate (CBR)** file every frame has the same size, so byte = time × bitrate and a seek is a multiplication. In a **variable-bitrate (VBR)** file the frame sizes differ, so no formula gives the byte where a time starts.
- **TOC** (table of contents): what a VBR MP3 carries instead, in its Xing/LAME header: 100 entries, entry _n_ being the byte where _n_ % of the duration starts. A player reads between two entries by drawing a straight line. `.m4a` has a full table of every frame's time and byte, and Ogg pages carry their own sample position, so those two seek exactly.
- **PCM** ([note 01](01-sound-is-numbers.md)): the samples themselves, as numbers. **WAV**: PCM behind a **header**, 44 bytes that say "16-bit, 2 channels, 44,100 per second, this many bytes". Every browser plays it, and a time in it is just a byte: second `t` starts at `44 + t × rate × channels × 2`.

## Worked example: `samples/sample1.mp3`

The file is 71,755,972 bytes for 3,686.21 s: 155.7 kb/s on average, 19,466 bytes per second, in 141,114 frames. One frame is as small as 104 bytes (32 kb/s) and as large as 1,044 (320 kb/s); averaged over one second the rate runs from 79 to 193 kb/s. So "byte = time × bitrate" cannot work.

**The split at 329.05 s** ([note 05](05-time-on-screen.md); the frame holding it starts at 329.038 s). ffprobe says that frame is at byte **6,752,229**. Two ways to guess it:

| Guess                                            | Byte      | Off by     | Plays from             |
| ------------------------------------------------ | --------- | ---------- | ---------------------- |
| 329.05 × 19,466 B/s (constant rate)              | 6,405,613 | −346,616 B | 310.78 s (−18.3 s)     |
| The TOC, entry 8 (22) to 9 (24), 93 % of the way | 6,685,907 | −66,322 B  | 325.46 s (**−3.59 s**) |

The TOC does better but is still not close: its 100 entries are whole numbers out of 256 (one unit is 280,296 bytes, 14.4 s of audio), so each entry is rounded by up to ±7 s. Entry 8 (294.9 s) holds 22 where the file has 21.70, and the straight line between two entries cannot undo that. Chrome's `<audio>`, measured on 11 points of this file, starts **2 to 10 s off**; a CBR re-encode lands within 39 ms, and `.m4a` and `.opus` exactly.

**The clip.** Decode 8 s with 1 s of pre-roll ([note 02](02-long-files.md)), from 325.05 to 333.05 s:

`-ss 324.05 -i input -ss 1 -t 8 -map 0:a:0 -c:a pcm_s16le -f wav clip.wav`

The `-ss` before `-i` jumps near the spot; the one after is exact. The `.mp3` and `.opus` clips are identical to a one-pass decode, sample for sample; without the pre-roll the MP3 clip starts wrong for its first 67 ms.

**The WAV.** 8 s at 44,100 Hz stereo is 8 × 44,100 × 2 × 2 + 44 = **1,411,244 bytes**, and the `.opus` at 48,000 Hz is 1,536,044: about 1.4 MB, dropped when the next press replaces it. The wait is a decode: about 40 ms natively, except that an MP3 clip grows with its position, because ffmpeg finds an MP3 spot by reading from the start.

**Near the ends of the file** the clip is held to the file (a split at 4.5 s gives 0.5 to 8.5 s) and the pre-roll to the room before it, so the playhead needs the clip's real start: `t = start + currentTime`.

## Where it lives in the code

- [`src/entities/source-file/api/decode-clip.ts`](../../src/entities/source-file/api/decode-clip.ts): the clip command, up to 1 s of pre-roll, `pcm_s16le` to WAV. It returns the bytes and the clip's start time.
- [`src/entities/source-file/model/source-file.ts`](../../src/entities/source-file/model/source-file.ts): keeps the ffmpeg session open after the load, so a clip does not load the core again.
- [`src/widgets/split-zoom/model/player.ts`](../../src/widgets/split-zoom/model/player.ts): the one hidden `<audio>` element on the clip's WAV, and the playhead from `startSeconds + currentTime`.
