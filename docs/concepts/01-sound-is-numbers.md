# 01 · Sound is numbers

A speaker cone moves back and forth, and that movement is the sound. Digital audio writes down where the cone should be, many times a second, as plain numbers. Everything the splitter does (loudness, gaps, splits) is arithmetic on those numbers.

## The words

- **Sample**: one number saying where the cone is at one instant. In the format the app decodes to (`f32le`, 32-bit floating point), a sample lies between **−1 and 1**; 0 is the cone at rest, ±1 the loudest the format can hold. The distance from 0 is the **amplitude**.
- **Sample rate**: how many samples per second, in hertz. 44,100 Hz (CD, most `.m4a` and `.mp3`) or 48,000 Hz (always for Opus).
- **Channel**: one stream of samples per speaker. Stereo has two, left and right.
- **Frame**: one sample of every channel at the same instant. A stereo second at 44.1 kHz is 44,100 frames, 88,200 samples.
- **PCM** (pulse-code modulation): audio stored as exactly this list of samples, uncompressed. ffmpeg's `-f f32le` writes PCM as raw 32-bit floats, interleaved: `L R L R …`.
- **Codec**: the method that compresses PCM into far fewer bytes and back (AAC, MP3, Opus, Vorbis). **Decoding** turns the compressed data back into PCM.
- **Container**: the file format that wraps the compressed data with its timing and tags (MP4 for `.m4a`, Ogg for `.opus` and `.ogg`; an `.mp3` is MP3 frames with little wrapping). The same codec can sit in different containers, and one container can hold different codecs, so the extension alone cannot tell a **supported format**: the app asks ffmpeg for both. A FLAC file is readable but not supported.
- **Downmix**: turning several channels into one by averaging them per frame: `(L + R) / 2`. The splitter only needs to know how loud the file is, not where the sound comes from. (ffmpeg's own `-ac 1` would come out 3.01 dB louder than this plain average.)
- **Min/max peaks**: a screen has a few thousand pixels, a file has millions of frames. So the frames are cut into **buckets** of 10 ms, and each bucket keeps only its lowest and highest sample. A waveform draws a vertical bar from min to max for each bucket, or for many buckets merged into one bar. Because the extremes are kept, no loud moment can vanish from the picture.

## Worked example: `samples/sample1.m4a`

ffmpeg reports: MP4 container, AAC codec, **44,100 Hz, stereo**, duration **1:01:26.21** (3,686.21 s). The file is 89 MB.

At 1:00.000, in the middle of a track, the first decoded frames are:

| Frame | Left   | Right   | Downmix `(L+R)/2` |
| ----- | ------ | ------- | ----------------- |
| 0     | 0.0712 | 0.0049  | 0.0381            |
| 1     | 0.0679 | 0.0027  | 0.0353            |
| 2     | 0.0646 | 0.0005  | 0.0325            |
| 3     | 0.0615 | −0.0016 | 0.0300            |

The 10 ms bucket starting there is 441 frames (44,100 × 0.01). Its downmix lies between **−0.2170 and 0.1907**: that pair is the bucket's peak. The same bucket at 3:52.000, inside the first gap between tracks, lies between **−0.0022 and 0.0029**, about 75 times smaller: quiet, but not zero.

How big is the whole file as numbers? 3,686.21 s × 44,100 = 162,561,861 frames × 2 channels × 4 bytes ≈ **1.3 GB** of PCM, from an 89 MB file. The peaks of the downmix are 368,622 buckets × 2 values × 4 bytes ≈ **2.9 MB**. So the app keeps the peaks and never the samples.

## Where it lives in the code

- [`src/entities/source-file/api/probe.ts`](../../src/entities/source-file/api/probe.ts): reads duration, rate, channels, container and codec from ffmpeg's log, and decides the supported format.
- [`src/entities/source-file/api/decode-slice.ts`](../../src/entities/source-file/api/decode-slice.ts): the `f32le` decode at the file's own rate.
- [`src/shared/lib/audio/downmix.ts`](../../src/shared/lib/audio/downmix.ts): the channel average.
- [`src/shared/lib/audio/peaks-builder.ts`](../../src/shared/lib/audio/peaks-builder.ts): min and max per 10 ms bucket.
