# 07 · Cutting without re-encoding

Once the splits are decided, they become files. The obvious way is to decode each track to PCM ([note 01](01-sound-is-numbers.md)) and compress it again. That takes a while, and it makes the sound a little worse every time. The way this app does it: the file is already a row of compressed frames, so ffmpeg copies the frames that fall inside a track into a new file and leaves them as they are. The price is that a cut can only fall between two frames, and a few things at the start of the new file need care.

## The words

- **Re-encoding**: decode to PCM, compress again. Slow, and lossy a second time (the source is already compressed). **Stream copy** (`-c copy`): ffmpeg reads the frames ([note 06](06-seeking-compressed-audio.md)) out of one container and writes the same bytes into another. Nothing is decoded, so nothing is lost and it runs at disk speed.
- **Cut grain**: a cut lands on a frame boundary, so it is off by up to one frame: 23.22 ms for AAC (1,024 samples at 44.1 kHz), 26.12 ms for MP3 (1,152), 20 ms for Opus. Inside a gap ([note 04](04-gaps-become-splits.md)) that is silence either way.
- **Priming** and **edit list** (AAC): an AAC frame is decoded together with the frame before it, so the encoder puts 1,024 silent samples of "prior frame" at the start of the file, and an **edit list**, a small table in the `.m4a`, tells the player to skip them. MP3 and Opus do the same with a number in the header: MP3's **encoder delay** (here 576 samples, plus the 529 every decoder drops itself) and Opus's **pre-skip** (312 samples, 6.5 ms).
- **Bit reservoir** (MP3, [note 02](02-long-files.md)): a frame may keep part of its data in the frames before it, so the first frame or two of a cut file are decoded without what they need.
- **Input seek** and **output seek**: `-ss` before `-i` jumps into the file; `-ss` after `-i` reads from the start and throws frames away until the time is reached. After a jump, ffmpeg's clock restarts at 0.
- **Tag**: title, track number and album, stored in the file's header and written in the same run.

## Worked example: `samples/sample1.m4a`

The file is 89,309,403 bytes for 3,686.21 s: 192 kb/s, in 158,753 frames of 1,024 samples, with 1,024 priming samples (edit list "start at sample 1,024").

**A split at 231.55 s**, in a gap, where track 2 of 8 starts (seven splits cut this file into eight tracks). In samples that is 10,211,355. ffprobe lists the frames around it:

| Frame starts at                | Relative to 231.55 s |
| ------------------------------ | -------------------- |
| 231.5262 s (sample 10,210,304) | −23.8 ms             |
| 231.5494 s (sample 10,211,328) | −0.6 ms (27 samples) |
| 231.5726 s (sample 10,212,352) | +22.6 ms             |

The split sits 27 samples into a frame. The command for track 2, 231.55 to 877.1 s, is `-ss 231.55 -to 877.1` before `-i`, and ffmpeg copies the frame that holds 231.55 and writes an edit list "skip 27 samples". So the track starts at 231.55 exactly, not on a frame boundary. At the other end, 877.1 s is 558 samples into its frame, and that frame is copied whole, so the track ends **10.6 ms** late, and the next track starts in that same frame: a few milliseconds of the gap play twice.

**What the frame without a predecessor costs.** Decoded, the cut file matches the source sample for sample except in the first **22.4 ms**, where it is off by at most **−45.4 dBFS**. The gap's own noise peaks at −42.1 dBFS, so the damage is no louder than the gap. That is why the splits go in gaps: the same cut inside music is off by −9.2 dBFS, a click.

**Copy against re-encode**, the same 645.55 s track, native ffmpeg 8.1: `-c copy` takes **0.20 s** and is identical after the first 22.4 ms; a 192 kb/s AAC re-encode takes **8.1 s**, 40 times slower, for a file the same size whose error sits at −65.6 dBFS. Nobody would hear that error, but it is a second generation of loss for nothing.

**Why `-ss` and `-to` both go before `-i`.** With output seeking the same cut starts at the next frame boundary, 231.5726 s (22.6 ms late), and the file carries a 22 ms empty edit at its front. And `-ss 231.55 -i input -to 877.1` gives a file 877.11 s long: after the jump the clock restarts at 0, and `-to` then counts from there.

**Tags.** Three `-metadata` flags in the same run: title, track `N/TOTAL` and album, so track 2 of 8 reads back `track=2/8`, `album=sample1`. `.opus` and `.ogg` put them on the stream (`-metadata:s:a:0`), where Opus and Vorbis keep tags.

## `.mp3` and `.opus`: why the cut seeks twice

Which seek a cut uses follows the container, not the codec. `.m4a` has an index of every frame, so one jump lands on the frame that holds the time and the edit list trims the rest. MP3 and Ogg have no index that exact, and each plain choice is wrong in its own way:

- **One jump before `-i`** lands on an Ogg page boundary, since an Ogg file stamps a time once per page (about a second of sound): at 877.1 s the decoded track begins at 877.000 s, and at other splits up to 700 ms early. That puts the end of the previous track into this one.
- **Reading from the start** (`-ss` after `-i`) is exact, but its time grows with the position.

So the jump goes 2 s early on purpose, which covers the worst early landing, and a second `-ss 2` after `-i` discards the extra 2 s exactly: `-ss START-2 -i input -ss 2 -t LENGTH`. After the jump the clock restarts at 0, so the length is `-t`, never `-to`. The first track needs no seek, and a track that starts under 2 s has no jump.

For track 2 with this command, decoded and compared with the source:

- **`.mp3`** starts 12.4 ms late: ffmpeg writes a fresh header with delay 0, and the decoder still drops its own 529 samples. The bit reservoir spoils the first 36.1 ms, at −43.8 dBFS, under the gap's −42.0.
- **`.opus`** starts 10.0 ms late: a packet (3.5 ms) plus the 6.5 ms pre-skip played again. The decoder starts cold, since a crop wants 80 ms of pre-skip and the file keeps 6.5, and peaks 3.5 dB above the gap's noise. By ear nothing was heard.

**The MP3 last-track quirk.** The last track holds the source's final frame, and ffmpeg then writes a delay of 0 − 529 into a 12-bit header field, which wraps to **3,567** (4,096 − 529): a player drops 92.9 ms at the start, silence only because the split is in a gap.

## Where it lives in the code

- [`src/entities/source-file/api/cut-track.ts`](../../src/entities/source-file/api/cut-track.ts): the ffmpeg arguments for one track, by seek method, with its tags.
- [`src/entities/source-file/api/probe.ts`](../../src/entities/source-file/api/probe.ts): the seek method each container gets.
- [`src/widgets/track-strip/lib/track-tags.ts`](../../src/widgets/track-strip/lib/track-tags.ts): the title, track and album of one track.
- [`src/widgets/track-strip/model/export-tracks.ts`](../../src/widgets/track-strip/model/export-tracks.ts): the export loop, one cut and one file write at a time.
