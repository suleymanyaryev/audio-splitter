# 12 · Streams in a container

A video download is one file, but it holds at least two separate things: a picture and a sound. The app opens MP4, MOV, WebM and MKV files and splits their sound. The idea under it: a file is a **container** of **streams**, and the sound is one stream that can be lifted out whole. Lifting it into another container changes no sample. This note measures that on a one-hour video.

## The words

- **Container** ([note 01](01-sound-is-numbers.md)): the file format, the box. It keeps the streams apart, labels each one, and says when each piece plays. ffmpeg calls its reader a **demuxer** (`mov,mp4,m4a,3gp,3g2,mj2`, `matroska,webm`, `ogg`, `mp3`).
- **Stream**: one track of data inside the box: a picture, a sound, subtitles, a chapter list. ffmpeg numbers them in the order they sit in the file (`0:0`, `0:1`), and `0:a:0` means the first audio one.
- **Codec** (note 01): how one stream's data is compressed. AAC, Opus and Vorbis are audio codecs; H.264 and VP9 are video codecs. The two are separate choices: AAC lives in MP4, MOV and `.m4a`, and Opus in Ogg, WebM and MKV.
- **Packet** ([note 06](06-seeking-compressed-audio.md)): the unit a container stores. In an MP4 the packets of all streams are mixed in one block of data, and an index says where each one starts.
- **Stream copy** ([note 07](07-cutting-without-re-encoding.md)): the same packets written into another container, which is what "moving the audio into another container" means.
- **Track format** (GLOSSARY.md): the container and extension the exported tracks get, set by the codec. AAC becomes `.m4a`, Opus `.opus`, Vorbis `.ogg`.

## Worked example: a one-hour MP4 with `samples/sample1.m4a` inside

The stand-in is built the way a downloader builds its files: a 320×180 picture, H.264 at 2.5 Mb/s, joined to the real sample's AAC by `-c copy`. The picture is noise, so its bitrate holds. The file is 1,243,254,297 bytes, and ffprobe lists two streams: H.264 video (3,686.32 s, 92,158 packets) and AAC audio at 44.1 kHz (3,686.214 s, 158,753 packets).

**How much of the file is the sound.** Adding up the packet sizes of each stream:

| Part                     | Bytes         | Share of the file |
| ------------------------ | ------------- | ----------------- |
| Video packets            | 1,152,218,881 | 92.68 %           |
| Audio packets            | 88,672,306    | **7.13 %**        |
| The rest: index, headers | 2,363,110     | 0.19 %            |

Seven bytes in a hundred are what the splitter needs. The share belongs to this stand-in: the sound is a fixed 192 kb/s, and the picture is whatever its encoder chose.

**Lifting the sound out.** One command, no decoding:

```
ffmpeg -i mp4-aac.mp4 -map 0:a:0 -c copy -movflags +faststart out.m4a
```

`out.m4a` is 89,309,403 bytes, exactly the size of `sample1.m4a`, yet 88,827,161 of its bytes differ. The layout is the cause: `sample1.m4a` keeps its index behind the audio and `out.m4a` puts it in front, so every packet sits at another offset. The packets themselves are the same: a checksum over all 158,753 of them, in order (`-f framecrc`), is equal for both.

**Decoded, bit for bit.** `sample1.m4a`, the MP4 and `out.m4a`, each decoded to 16-bit stereo PCM, give the same **162,562,048 frames** with the same MD5, `3f879065886e6181bfb1ee2b7df4805c`. Nothing was decoded on the way, so there was nothing to lose: the container is a wrapper, and the wrapper does not touch the audio. That is why the app can take a video and export plain audio files that sound exactly like it.

## Three things the container decides

**Which stream the app reads.** A video usually lists its picture first (`Stream #0:0 Video`, `#0:1 Audio`). The app asks for `0:a:0`, the first audio stream, and never decodes the picture. A file with two languages gets the first; a file with no audio stream is refused.

**How long the file is.** The container reports one duration, the longest stream's. Here that is the picture's 3,686.32 s against the sound's 3,686.214 s. When the picture runs on after the sound, the length the app needs is the sound's. A WebM or MKV log gives every stream its own `DURATION` line, and the app reads the audio stream's. An MP4 or MOV log gives only the container's, so there the app shows the longest stream's length.

**How a cut seeks.** [Note 07](07-cutting-without-re-encoding.md) showed that the seek follows the container's index, not the codec. An MP4 or MOV lists every packet, so one jump lands exactly, whether the sound is alone or beside a video. A WebM or MKV stamps time only now and then, like Ogg, so it seeks twice. For Opus in WebM a single jump is worse than early: ffmpeg writes a file with negative timestamps that ffprobe reads as "Unsupported huge granule pos". So the container picks the seek method, and the codec picks the extension.

**The picture still costs time.** ffmpeg.wasm's demuxer reads through the picture's bytes between the sound's packets, so the hour decodes in 11.1 s against 4.7 s for the `.m4a` alone. Lifting the sound out first would take 6 to 7 s, so the app reads the video as it is.

## Where it lives in the code

- [`src/entities/source-file/api/probe.ts`](../../src/entities/source-file/api/probe.ts): `readProbeLog` picks the track format and the seek method from the container and codec, and the length from the audio stream's `DURATION` line where there is one.
- [`src/entities/source-file/api/cut-track.ts`](../../src/entities/source-file/api/cut-track.ts): the seek method picks the command, and the track format picks the extension and where the tags go.
