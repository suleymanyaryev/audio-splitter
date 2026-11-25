# 07 · Cutting without re-encoding

The splits are decided; this milestone turns them into files. The obvious way is to decode each track to PCM (note 01) and compress it again. That takes a while, and it makes the sound a little worse every time. The way this app does it: the file is already a row of compressed frames, so ffmpeg copies the frames that fall inside a track into a new file and leaves them as they are. The price is that a cut can only fall between two frames, and a few things at the start of the new file need care.

## The words

- **Re-encoding**: decode to PCM, compress again. Slow, and lossy a second time (the source is already compressed). **Stream copy** (`-c copy`): ffmpeg reads the frames (note 06) out of one container and writes the same bytes into another. Nothing is decoded, so nothing is lost and it runs at disk speed.
- **Cut grain**: a cut lands on a frame boundary, so it is off by up to one frame: 23.22 ms for AAC (1,024 samples at 44.1 kHz), 26.12 ms for MP3 (1,152), 20 ms for Opus. Inside a gap (note 04) that is silence either way.
- **Priming** and **edit list** (AAC): an AAC frame is decoded together with the frame before it, so the encoder puts 1,024 silent samples of "prior frame" at the start of the file, and an **edit list**, a small table in the `.m4a`, tells the player to skip them. MP3 and Opus do the same with a number in the header: MP3's **encoder delay** (here 576 samples, plus the 529 every decoder drops itself) and Opus's **pre-skip** (312 samples, 6.5 ms).
- **Bit reservoir** (MP3, note 02): a frame may keep part of its data in the frames before it, so the first frame or two of a cut file are decoded without what they need.
- **Input seek** and **output seek**: `-ss` before `-i` jumps into the file; `-ss` after `-i` reads from the start and throws frames away until the time is reached. After a jump, ffmpeg's clock restarts at 0.
- **Tag**: title, track number and album, stored in the file's header. They are written in the same run.

## Worked example: `samples/sample1.m4a`

The file is 89,309,403 bytes for 3,686.21 s: 192 kb/s, in 158,753 frames of 1,024 samples, with 1,024 priming samples (edit list "start at sample 1,024").

**The first split, 231.55 s**, the middle of the first of the file's seven gaps (note 04). In samples that is 10,211,355. ffprobe lists the frames around it:

| Frame starts at                | Relative to 231.55 s |
| ------------------------------ | -------------------- |
| 231.5262 s (sample 10,210,304) | −23.8 ms             |
| 231.5494 s (sample 10,211,328) | −0.6 ms (27 samples) |
| 231.5726 s (sample 10,212,352) | +22.6 ms             |

The split sits 27 samples into a frame. The command for track 2 is `-ss 231.55 -to 877.1` before `-i`, and ffmpeg does this: it copies the frame that holds 231.55, and writes an edit list "skip 27 samples" (`media time: 27`). So the track starts at 231.55 exactly, not on a frame boundary. At the other end, 877.1 s is 558 samples into the frame that starts at 877.0873 s, and that frame is copied whole, so the track ends 10.6 ms late.

| Track 2 (231.55 to 877.1 s) | Value                                                         |
| --------------------------- | ------------------------------------------------------------- |
| Asked for                   | 645.5500 s                                                    |
| Reported by the file        | 28,469,240 samples = 645.5610 s                               |
| Decoded                     | 28,469,221 samples = 645.5606 s (466 samples, 10.6 ms longer) |
| Start time ffprobe shows    | 0.000 s                                                       |

**What the frame without a predecessor costs.** Decoded and compared with the source, the cut file matches sample for sample except in the first 22.4 ms: 1,862 of 56,938,442 values differ, by at most 176 of 32,768 (−45.4 dBFS). The gap's own noise peaks at 258 (−42.1 dBFS), so the damage is no louder than the gap. That is why the splits go in gaps: the same cut inside music, just after a frame boundary (599.981 s, 27 samples in), is off by 11,409 (−9.2 dBFS), a click. How loud the click is depends on how much of the frame is left after the cut: at 600.000 s, 864 samples in, the damage is 3.6 ms at −37.9 dBFS.

**Copy against re-encode**, the same 645.55 s track, native ffmpeg 8.1, 192 kb/s AAC for the re-encode:

| Method               | Time                  | Size       | Decoded against the source                                      |
| -------------------- | --------------------- | ---------- | --------------------------------------------------------------- |
| `-c copy`            | 0.20 s (5 runs)       | 15,642,278 | identical after the first 22.4 ms                               |
| `-c:a aac -b:a 192k` | 8.1 to 8.2 s (3 runs) | 15,657,636 | 12,450 of 441,000 values equal; error −65.6 dBFS (signal −14.5) |

That is 40 times slower for a file the same size and a little worse. The re-encode error is 51 dB below the music: nobody would hear it, but it is a second generation of loss for nothing.

**All eight tracks** with the full command, tags and `+faststart` included: 1.40 s in all. The files add up to 89,319,754 bytes (10,351 more than the source, the headers) and 3,686.311 s (97 ms more): at each of the seven cuts the two neighbours both contain the frame that holds the cut, about 14 ms played twice, in the gap. Track 1 has no `-ss`, so it keeps the source's priming and ends 22.0 ms late; the last track has no `-to`.

**Why `-ss` and `-to` both go before `-i`.** With output seeking the same cut starts at the next frame boundary, 231.5726 s (22.6 ms late), and the file carries a 22 ms empty edit at its front, so ffprobe reports a start time of 0.022 s. And `-ss 231.55 -i input -to 877.1` gives a file 877.11 s long: after the jump the clock restarts at 0, and `-to` then counts from there (ticket 03).

## Tags

Three `-metadata` flags in the same run (for `.opus` and `.ogg`, `-metadata:s:a:0`, on the stream: Opus and Vorbis keep their tags in the stream's comment header, and a file-level key would not replace the ones the source's stream carries). Title is the track name if the user renamed the track, otherwise `<source stem> NN` (`sample1 02`); track is `N/TOTAL`; album is the source stem. Read back with ffprobe: `title=sample1 02`, `track=2/8`, `album=sample1`. Title and track add 66 bytes to the file, the album 31 more; a title with `Café – ¿Qué? 日本` comes back unchanged. The command also says `-map 0:a:0` (the first audio stream only, which drops an embedded cover image) and `-map_chapters -1` (copy no chapter list into every track); the sample has neither, so they change nothing here. `-movflags +faststart`, added for `.m4a` only, puts the file's index (the `moov` block) in front of the audio instead of behind it, which changes the layout of the file and not its size.

## `.mp3` and `.opus`: why the cut seeks twice

Which seek a cut uses follows the container, not the codec (concept note 12). Vorbis in Ogg and Opus in WebM or Matroska seek twice like Ogg Opus, and the measurements below are on MP3 and Opus. `.m4a` has an index of every frame, so the jump lands on the frame that holds the time and the edit list trims the rest. MP3 and Opus have no index that exact, and each plain choice is wrong in its own way (native ffmpeg 8.1, the last track, 3,549.35 s to the end):

| Command shape                    | `.mp3`                     | `.opus`                         |
| -------------------------------- | -------------------------- | ------------------------------- |
| `-ss START -i` (one jump)        | within a frame (ticket 12) | starts early: 100 ms at 877.1 s |
| `-i -ss START` (read from start) | 0.95 s                     | 1.07 s                          |
| `-ss START-2 -i -ss 2 -t LENGTH` | 0.25 s, same bytes         | 0.08 s, same cut                |

An Ogg file stamps a time once per page (about a second of sound), so a jump lands on a page boundary: at 877.1 s the decoded track begins at 877.000 s, and ticket 12 saw 0 to 700 ms early at the seven splits. That would put the end of the previous track into this one. Reading from the start is exact but the time grows with the position, and ffmpeg.wasm is slower still. So the jump goes 2 s early on purpose, which covers the worst early landing, and the second `-ss 2` discards the extra 2 s in the exact way. After the jump the clock restarts at 0, so the second `-ss` counts from the jump and the length is `-t LENGTH`, never `-to`. The first track needs neither seek; a track that starts under 2 s has no jump (it would land before 0) and seeks to its start after the input.

For the same track 2 (231.55 to 877.1 s) and the app's command, decoded and compared with the source:

| Format  | Starts   | Ends     | Reported − decoded duration | Start differs from the source for | Largest difference (gap's peak) |
| ------- | -------- | -------- | --------------------------- | --------------------------------- | ------------------------------- |
| `.m4a`  | +0.0 ms  | +10.6 ms | +0.4 ms                     | 22.4 ms                           | −45.4 dBFS (−42.1)              |
| `.mp3`  | +12.4 ms | +14.5 ms | +11.9 ms                    | 36.1 ms                           | −43.8 dBFS (−42.0)              |
| `.opus` | +10.0 ms | +13.5 ms | +16.5 ms                    | up to 396 ms, mostly tiny         | −38.9 dBFS (−42.4)              |

The MP3's 12 ms is the 529 samples a decoder drops: ffmpeg writes a fresh header with delay 0 into every cut file, and the decoder takes the 529 off the first frame. The Opus start is a packet (3.5 ms) plus the 6.5 ms pre-skip played again. The MP3 difference at the start is the bit reservoir and stays under the gap's noise. The Opus decoder starts cold (the RFC wants 80 ms of pre-skip after a crop, the file keeps 6.5), and its peak is 3.5 dB above the gap's; ticket 12 flagged six of seven Opus starts for the same reason, and the user listened and heard nothing.

**The MP3 last-track quirk.** The last track alone contains the source's final frame, which carries the end padding (704 samples), and ffmpeg then writes a wrong delay into its header (ticket 03 found the cause in ffmpeg's code). Track 2's header says delay 0; track 8's says **3,567**, which is 4,096 − 529: the 0 − 529 does not fit the header's 12-bit field and wraps. A player that obeys the header drops 3,567 + 529 = 4,096 samples (92.9 ms) at the start, and the decoded track begins 105.6 ms after the split (92.9 plus 12.7 ms of frame offset). Here that stretch peaks at 86 of 32,768 (−51.6 dBFS), the level of the gap (−50.1 dBFS). It is silence only because the split is in a gap; ticket 12 measured the same on the VBR and CBR files.

The measurements for `.mp3` and `.opus` above are on `sample1.mp3` and `sample1.opus`, native ffmpeg 8.1. Ticket 12 ran the same commands inside ffmpeg.wasm 5.1.4: the same cut positions, with the MP3 files byte for byte equal.

## Where it lives in the code

- [`src/entities/source-file/api/cut-track.ts`](../../src/entities/source-file/api/cut-track.ts): the ffmpeg arguments for one track, built from numbers (start, end, tags), not from splits. By seek method: once (`.m4a`, from MP4 and MOV) is `-ss START -to END` before `-i`, with `+faststart`; twice (MP3, Ogg and Matroska, so `.mp3`, `.opus` and `.ogg`) is `-ss START-2` before `-i`, then `-ss 2 -t LENGTH` after it; a start under 2 s drops the jump before `-i` and seeks to the start itself after it, and the first track (start 0) has no seek at all. Returns the file's bytes.
- [`src/entities/source-file/model/source-file.ts`](../../src/entities/source-file/model/source-file.ts): `cutTrack` runs one cut on the open ffmpeg session (note 06) in the same one-call-at-a-time queue as the clips; each counts toward the 20-call reload budget (note 02). `stopCuts` interrupts the running call (a cut, or an audition clip a cut waits behind) and makes every cut still in the queue reject when its turn comes, without running.
- [`src/shared/api/ffmpeg/ffmpeg.ts`](../../src/shared/api/ffmpeg/ffmpeg.ts): `interrupt()` rejects the running command and terminates the worker, the only way to stop ffmpeg.wasm; the next call starts a fresh one.
- [`src/widgets/track-strip/model/export-tracks.ts`](../../src/widgets/track-strip/model/export-tracks.ts): the export loop: picks the folder, creates the subfolder, cuts track by track, writes each file and frees it, counts "Track 3 of 8", stops on Cancel or a failure. A write goes through `api/write-file.ts`, shared with the single export: one that fails aborts its writable and removes the empty file Chrome made for it, so only whole tracks stay.
- [`src/widgets/track-strip/lib/`](../../src/widgets/track-strip/lib/): the file name (`03.m4a`, `03 Sunrise Drive.m4a`), the subfolder name and its `(2)` suffix, the tags and the closing sentence; the folder picker is in [`api/export-folder.ts`](../../src/widgets/track-strip/api/export-folder.ts).
- [`src/widgets/track-strip/ui/ExportDialog.vue`](../../src/widgets/track-strip/ui/ExportDialog.vue): the overlay with its progress, Cancel and closing summary. The "Export to folder…" button is in [`ReviewPage.vue`](../../src/pages/review/ui/ReviewPage.vue), in the Tracks panel's title row.
- [`src/widgets/track-strip/model/export-single.ts`](../../src/widgets/track-strip/model/export-single.ts): the single export of one track or of a range: the same cut and tags (a range has no track tag, so the cut writes an empty `track=`), the same writer, into one remembered folder with `(2)` names.
- [`e2e/export.spec.ts`](../../e2e/export.spec.ts): exports the 30 s fixture of each format in Chrome, whole and as single exports, and decodes the files back.
