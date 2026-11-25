# Video and more formats: first analysis

Status: grilled

A first look at GitHub issue #13, and the decisions grilled from it on 2026-11-25 ([Decisions](#decisions)) and [milestone 3](../audio-splitter-v2/milestones.md#milestone-3-containers-video-and-more-audio-formats), before any grilling. Measured on 2026-11-25 with **native ffmpeg 8.1**, not the pinned core (ffmpeg 5.1.4) in Chrome. So these numbers are a guide: each one still has to pass the v1 bar in the browser. Nothing in `src/` changed.

## Method

- **Inputs.** The first 10 min of `sample1.m4a` and `sample1.opus` (main checkout's `samples/`). Native ffmpeg made from them: WAV (s16), FLAC, Vorbis in Ogg, and video files. The video files hold a small H.264 or VP8 test picture with a keyframe every 5 s: AAC in MP4 and in MOV, Opus in MKV and in WebM. The audio is copied, so it equals the samples'.
- **Cuts.** Three tracks per input, at 100.0, 231.55, 377.3 and 512.77 s. Two commands, both from `cut-track.ts`:
  - **Input seek:** `-ss START -to END -i in -map 0:a:0 -c copy` (today's `.m4a` command).
  - **Two seeks:** `-ss START-2 -i in -ss 2 -t LENGTH -map 0:a:0 -c copy` (today's `.mp3` and `.opus` command).
- **Where a cut lands.** Two ways. The packets: the cut's first and last packet, found in the source's packet list by size and CRC (`-f framecrc`). What is heard: 50 ms of the decoded cut, found bit-exact in the decoded source.
- **The core.** Its configure line has no `--disable-demuxers` or `--disable-muxers`, and it enables libvorbis and libopus. So the MOV/MP4, Matroska/WebM, WAV, FLAC and Ogg demuxers and muxers should all be in it. This is inferred from the line, not run.

## Results

### What ffmpeg calls each file

| File             | `Input #0,` container     | `Audio:` codec | Packet length          |
| ---------------- | ------------------------- | -------------- | ---------------------- |
| MP4, MOV         | `mov,mp4,m4a,3gp,3g2,mj2` | `aac`          | 23.2 ms                |
| MKV, WebM        | `matroska,webm`           | `opus`         | 20 ms                  |
| WAV              | `wav`                     | `pcm_s16le`    | 92.9 ms (16 KB)        |
| FLAC             | `flac`                    | `flac`         | 104.5 ms (4608 samples) |
| Vorbis           | `ogg`                     | `vorbis`       | 2.9 or 23.2 ms         |

- MP4 and MOV are one demuxer, and so are MKV and WebM. The probe cannot tell them apart, and does not need to.
- In a video file the video stream comes first (`Stream #0:0 Video`, `#0:1 Audio`). The probe's regex already takes the first `Audio:` line.

### Where each cut lands

| Source → export            | Command    | First heard sample   | Notes |
| -------------------------- | ---------- | -------------------- | ----- |
| AAC in `.m4a` (reference)  | input seek | exact                | |
| AAC in MP4 or MOV + video → `.m4a` | input seek | exact        | Copies about 1 s of extra packets, which the edit list hides. Decoded length exact. |
| AAC in MP4 + video → `.m4a` | two seeks | +1 to +23 ms        | Within one frame, no edit list. |
| Opus in WebM or MKV → `.opus` | two seeks | +4 to +14 ms (packets) | Not bit-exact at 377.3 s: the cold-start burst v1 found in Ogg Opus. |
| Opus in WebM → `.opus`     | input seek | broken               | "Unsupported huge granule pos": the Ogg file gets negative timestamps. |
| WAV → `.wav`               | input seek | exact                | The end runs 71 ms over (one packet). |
| FLAC → `.flac`             | input seek | −1 to −92 ms (early) | Within one frame. |
| FLAC → `.flac`             | two seeks  | +13 to +104 ms       | Within one frame. |
| Vorbis in Ogg → `.ogg`     | two seeks  | +34 to +41 ms        | Within one long block (46 ms). |

### A copied FLAC reports the wrong length

The cut `.flac` of 145.75 s keeps the source's STREAMINFO: 26,460,160 samples, the whole 600 s source. Its MD5 is the source's too. So it fails the v1 bar's "each cut file reports the right duration". No command-line fix was found.

## What it means

- **An MP4 or MOV with AAC works today, cut for cut.** The `.m4a` command lands exactly, thanks to the edit list. The issue's "probably loads today" holds for the cuts natively. Not run in the browser.
- **WebM and MKV need the two-seek command,** as Ogg does. The command follows the container's index, not the codec. Today one `SupportedFormat` value picks both the seek and the extension, so that type splits: the container picks the seek, the codec picks the export file.
- **FLAC is the hard one.** A copy is up to one 93–105 ms frame off and reports the wrong length. FLAC is lossless, though: decoding and encoding it again changes no sample. So "export stays stream copy" (the v2 decision) has no reason to hold for FLAC, or WAV, where its reason was the quality loss. Re-encoding a lossless codec would give sample-exact cuts and a right header. This needs the user's call.
- **Opus from WebM inherits v1's Opus start burst.** Same pre-skip, same cold decoder. Whatever v1 accepted for `.opus` applies here.

## Not measured yet

- **Everything in the browser**, against the v1 bar, with the pinned core.
- **Decode and cut time on a real video file.** A 1080p video is 20–40 times the bytes of its audio. Whether the demuxer skips the video bytes through WORKERFS or reads them is unknown, and it differs between MP4 (an index of every sample) and Matroska (blocks interleaved in clusters).
- **Files over 2 GB.** Video makes them likely. One hour of 1080p from YouTube is about 0.7–1.8 GB, so a 3 h mix can pass 2 GB. A 3 h WAV at 44.1 kHz/16 bit is 1.9 GB. Whether WORKERFS in the core reads past 2 GB is unknown.
- **A real yt-dlp file.** Its cues, its audio start time, and whether the container's duration equals the audio's.
- **The ffmpeg 5.1.4 differences:** WAV packet size, and whether its FLAC muxer writes the same wrong STREAMINFO.

## Decisions

Grilled on 2026-11-25. The user accepted every recommendation.

**Scope.**

- Five supported formats: AAC in MP4 (`.m4a`, `.mp4`, `.mov`), MP3, Opus in Ogg, Opus in WebM or Matroska, Vorbis in Ogg. These need no export method beyond the two cut commands that exist.
- Out until each passes the bar: Vorbis in WebM, AAC in Matroska, FLAC, WAV, ALAC and AC-3. FLAC would need re-encoding (see [Results](#a-copied-flac-reports-the-wrong-length)).
- Only the first audio stream is used, with no choice and no word about others. A file with no audio keeps today's message.
- Tracks are audio-only, copied, in the codec's track format (`GLOSSARY.md`): `.m4a`, `.mp3`, `.opus`, `.ogg` (not `.oga`).

**How.**

- The video file is read directly. Taking the audio out on load (one `-map 0:a:0 -c copy` run, the file kept by the page and mounted instead) is the fallback, used only if a 1 h video decodes more than three times as slowly as its audio alone.
- A source file's length is its first audio stream's, not the container's `Duration`.
- If the core cannot read past 2 GB, the probe refuses a larger file with a plain message ("This file is 2.6 GB; the splitter reads files up to 2 GB.").
- The unsupported message lists the five pairs: "This file is FLAC in FLAC; the splitter supports AAC in .m4a, .mp4 or .mov, MP3, Opus in .opus, .webm or .mkv, and Vorbis in .ogg."
- The file input's `accept` list is `.m4a,.mp4,.m4v,.mov,.mp3,.opus,.ogg,.oga,.webm,.mkv`, a convenience only.

**Proof.**

- A browser spike, run by the agent alone, on each pair against the v1 bar (`.scratch/audio-splitter/issues/12-spike-decode-and-split-the-mp3-and-opus-samples.md`), plus: tracks hold no video stream, decode time against the audio alone, and a file over 2 GB.
- No real download exists. The stand-ins are built the way yt-dlp builds its files, by an ffmpeg copy that joins a video stream to a real audio sample, in the scratchpad, never in `samples/`:
  - 1 h MP4: H.264 at about 2.5 Mb/s on a small noisy picture, `sample1.m4a`'s AAC, a keyframe every 2 s, chapters at the seven gaps.
  - 1 h WebM: VP9 at the same rate, `sample1.opus`'s Opus, a keyframe every 5 s, chapters.
  - MOV and MKV copies of those two.
  - 3 h MP4 from `sample3h.m4a`, about 2.6 GB: full-length timing and the 2 GB check.
  - One stand-in with video 3 s longer than the audio.
  - Vorbis in Ogg from `sample1`.
- Accepted risk: YouTube's own audio quirks and keyframe spacing are not copied. The first real download that misbehaves is a bug.
- Concept note `docs/concepts/12-streams-in-a-container.md`, confirmed before code, with two numbers from the 1 h MP4: the audio's share of its bytes, and the copied audio decoding bit-identical.
- New e2e fixtures from `e2e/fixtures/make-fixtures.sh`: `bursts.ogg`, `bursts-video.mp4` and `bursts-video.webm` (160×90 picture). `unsupported.flac` replaces `unsupported-vorbis.ogg`, which is now supported.

**Order.** The spike, then the concept note, then the spec and tickets. No ADR: each decision is easy to reverse.

The scripts ran from the session scratchpad and were not kept; the method above is enough to rebuild them.
