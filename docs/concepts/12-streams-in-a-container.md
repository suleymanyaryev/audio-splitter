# 12 · Streams in a container

A video download is one file, but it holds at least two separate things: a picture and a sound. This milestone lets the app open such files, MP4, MOV, WebM and MKV, and split the sound. The idea under it: a file is a **container** of **streams**, and the sound is one stream that can be lifted out whole. Lifting it into another container changes no sample. This note measures that on a one-hour video.

## The words

- **Container**: the file format, the box. MP4, MOV, WebM, MKV and Ogg are containers. It keeps the streams apart, labels each one, and says when each piece plays. ffmpeg calls its reader a **demuxer** (`mov,mp4,m4a,3gp,3g2,mj2`, `matroska,webm`, `ogg`, `mp3`).
- **Stream**: one track of data inside the box: a picture, a sound, subtitles, a chapter list. A video file has at least a video stream and an audio stream. ffmpeg numbers them in the order they sit in the file (`0:0`, `0:1`) and `0:a:0` means the first audio one.
- **Codec**: how one stream's data is compressed (note 01 and 06). AAC, Opus and Vorbis are audio codecs; H.264 and VP9 are video codecs. The container and the codec are separate choices: AAC lives in MP4, MOV and `.m4a`, and Opus in Ogg, WebM and MKV.
- **Packet**: the unit a container stores, one or a few frames of one stream (note 06). In an MP4 the packets of all streams are mixed in one block of data, and an index says where each one starts.
- **Stream copy** (note 07): read a stream's packets out of one container and write the same bytes into another. This is "moving the audio into another container".
- **Track format** (GLOSSARY.md): the container and extension the exported tracks get, set by the codec. AAC becomes `.m4a`, Opus `.opus`, Vorbis `.ogg`.

## Worked example: a one-hour MP4 with `samples/sample1.m4a` inside

No real video download is among the samples. The stand-in is built the way a downloader builds its files: a 320×180 picture, H.264 at 2.5 Mb/s, one keyframe every 2 s, joined to the real sample's AAC by `-c copy` (`-map 0:v:0 -map 1:a:0`). The picture is noise, so its bitrate holds. The file is 1,243,254,297 bytes.

ffprobe lists two streams:

| Stream | Codec        | Duration   | Packets | Bytes of packets |
| ------ | ------------ | ---------- | ------- | ---------------- |
| 0 video | H.264       | 3,686.32 s | 92,158  | 1,152,218,881    |
| 1 audio | AAC, 44.1 kHz | 3,686.214 s | 158,753 | 88,672,306     |

**How much of the file is the sound.** Adding up the packet sizes of each stream:

| Part                          | Bytes         | Share of the file |
| ----------------------------- | ------------- | ----------------- |
| Video packets                 | 1,152,218,881 | 92.68 %           |
| Audio packets                 | 88,672,306    | **7.13 %**        |
| The rest: index, headers      | 2,363,110     | 0.19 %            |

Seven bytes in a hundred are what the splitter needs. This share belongs to the stand-in: the sound is a fixed 192 kb/s, and the picture is whatever its encoder chose. A one-hour 1080p download is about 0.7 to 1.8 GB (an estimate, not measured), so the same 88.7 MB of audio would be 5 to 13 % of it.

**Lifting the sound out.** One command, no decoding:

```
ffmpeg -i mp4-aac.mp4 -map 0:a:0 -c copy -movflags +faststart out.m4a
```

| File               | Bytes      | Packets (frames) | Packet checksum (`-f framecrc`)    |
| ------------------ | ---------- | ---------------- | ---------------------------------- |
| `sample1.m4a`      | 89,309,403 | 158,753          | `41c30d5d7e35c96e39f7c31b09e273a4` |
| `out.m4a`          | 89,309,403 | 158,753          | `41c30d5d7e35c96e39f7c31b09e273a4` |

The two files are the same length to the byte, and they are not the same bytes: 88,827,161 of them differ. The cause is the layout. `sample1.m4a` keeps its index behind the audio and `out.m4a` puts it in front (`+faststart`, note 07), so every packet sits at another offset. The packets themselves are the same: the checksum over all 158,753 of them, in order, is equal.

**Decoded, bit for bit.** Each file decoded to 16-bit stereo PCM (`-f s16le`, note 01), and the bytes hashed:

| Decoded from        | PCM bytes   | Frames of 2 channels | MD5                                |
| ------------------- | ----------- | -------------------- | ---------------------------------- |
| `sample1.m4a`       | 650,248,192 | 162,562,048          | `3f879065886e6181bfb1ee2b7df4805c` |
| `mp4-aac.mp4`       | 650,248,192 | 162,562,048          | `3f879065886e6181bfb1ee2b7df4805c` |
| `out.m4a`           | 650,248,192 | 162,562,048          | `3f879065886e6181bfb1ee2b7df4805c` |

Reading the sound straight out of the video, reading it from the lifted-out `.m4a`, and reading the original `.m4a` give the same 162,562,048 frames, sample for sample. The `f32le` decode gives equal hashes too (`12e678433a7fde33cda693b729b913c7`). Nothing was decoded on the way, so there was nothing to lose: the container is a wrapper, and the wrapper does not touch the audio. That is the whole reason the app can accept a video and export plain audio files that sound exactly like it.

## Three things the container decides

**Which stream the app reads.** A video usually lists its picture first (`Stream #0:0 Video`, `#0:1 Audio`). The app asks for `0:a:0`, the first audio stream, and never decodes the picture. A file with several audio streams, say two languages, gets the first. A file with none gets the "no audio" message.

**How long the file is.** The container reports one duration, and it is the longest stream's. Here the picture is 3,686.32 s and the sound 3,686.214 s, so the container says 3,686.32 s: 0.1 s of nothing at the end. For a real video whose picture runs on after the sound, the difference is larger, and the length the app needs is the sound's. What ffmpeg's log offers for it was measured on a stand-in whose picture runs 3 s long (ticket 01 of this milestone). A WebM or MKV log gives every stream its own `DURATION` line, 600.021 s for the sound and 603 s for the picture, and the app reads the sound's. An MP4 or MOV log gives only the container's 603 s, so the app shows the picture's length there.

**How a cut seeks.** Note 07 showed two cut commands: one jump before the input for `.m4a`, a jump 2 s early and an exact seek after it for `.mp3` and `.opus`. The choice follows the container's index, not the codec. An MP4 or MOV lists every packet, so one jump lands exactly, whether the sound is AAC alone or beside a video. A WebM, MKV or Ogg stamps time only now and then, so a jump lands early and the second seek corrects it. For Opus in WebM a single jump is worse than early: ffmpeg writes a file with negative timestamps that ffprobe reads with "Unsupported huge granule pos". This is why the app stops using one value for both the seek and the file name: the container picks the seek, the codec picks the extension.

## What it costs to read past the picture

The splitter needs 7 % of this file, but ffmpeg.wasm reads the file through the browser, and its demuxer reads through the picture's bytes between the sound's packets. On this file in the pinned core (ticket 01 of this milestone, Chrome), decoding the hour takes 11.1 s against 4.7 s for the `.m4a` alone: 2.4 times as long. The lift-out command above takes 6 to 7 s for a file this size, so lifting the sound out on load would save nothing here. It is an idea the app does not use.

## Where it lives in the code

- [`src/entities/source-file/api/probe.ts`](../../src/entities/source-file/api/probe.ts): reads the log. Container and codec pick the track format and the seek method; the first audio stream's own `DURATION` line, or the container's `Duration`, is the length.
- [`src/entities/source-file/api/cut-track.ts`](../../src/entities/source-file/api/cut-track.ts): the seek method picks the command, the track format picks the extension and where the tags go (on the stream for `.opus` and `.ogg`).
- [`src/pages/load/ui/LoadPage.vue`](../../src/pages/load/ui/LoadPage.vue): the file dialog's `accept` list, a convenience only: the probe decides.
- [`e2e/fixtures/make-fixtures.sh`](../../e2e/fixtures/make-fixtures.sh): the 160×90 test-picture MP4 and WebM, and the check in [`e2e/export.spec.ts`](../../e2e/export.spec.ts) that a track holds no video.

## Not measured

- A real download: its picture, its bitrates, and how it ends. The stand-in is built to copy the structure, not the content.
- Files with more than one audio stream, which the app treats as one stream, the first.
