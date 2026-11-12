# Add sample files

Type: task
Status: resolved

## Question

Research and the spike need the user's real audio, not synthetic tones. This is a HITL task, and the user does the file part: the agent never creates, generates, downloads or copies a sample file.

1. The user puts one or two representative source files in the repo, at a location they choose: ideally one `.mp3` and one `.m4a` or `.opus`, each at least an hour long.
2. The user tells the agent where the files are. The agent then proposes a `.gitignore` entry for that location, so files of several hundred megabytes are not committed, and adds it only if the user agrees.
3. Record the facts later tickets depend on: the location, and for each file its format, codec, duration, size, bitrate, sample rate and channel count, plus what the user knows about it (how many tracks it should split into, shortest track, what the gaps sound like).

Resolved when the files are in place and the facts are written into the answer.

## Comments

### 2026-11-13: first sample measured (ticket still open)

The user added `samples/sample1.m4a`. Still needed before resolving: the user's decision on a `.gitignore` entry for `samples/`, and what the user knows about the file (expected number of tracks, shortest track). All measurements below were taken read-only with native `ffprobe` and `ffmpeg` (`silencedetect`, `volumedetect`); nothing was written.

**File facts**

| Property | Value |
| --- | --- |
| Container | MP4 audio (`.m4a`), written by ffmpeg's muxer (`Lavf62.12.100`), original handler "ISO Media file produced by Google Inc." |
| Codec | AAC-LC |
| Sample rate, channels | 44,100 Hz, stereo |
| Duration | 3686.2 s (1 h 01 min 26 s) |
| Size | 89,309,403 bytes (89 MB) |
| Bitrate | about 192 kb/s |
| AAC frames | 158,753 (one frame is 1024 samples, about 23 ms) |
| Chapters, title tags | none |
| Level | mean −14.8 dB, peak 0.0 dB |

**Quiet stretches inside the file** (the 1.2–1.8 s at the start and the 3.5–5 s at the end are left out)

| Threshold | Minimum length | Found |
| --- | --- | --- |
| −60 dB | 1 s | 0 |
| −50 dB | 1 s | 0 |
| −45 dB | 1 s | 1 |
| −40 dB | 1 s | 7 (1.3–2.7 s long) |
| −40 dB | 0.5 s | 13 |
| −35 dB | 1 s | 17 (1.2–4.3 s long) |
| −35 dB | 0.5 s | 23 |
| −30 dB | 1 s | 33 (1.1–6.1 s long) |
| −30 dB | 0.5 s | 47 |

**What this shows**

- The gaps in this file are not near digital silence. The draft's example threshold of −50 dBFS finds nothing; the gaps sit around −30 to −40 dB, which is what a fade tail or a quiet lead-in looks like. The default silence threshold has to be much higher than −50 dB, or chosen relative to the file.
- The pattern of quiet stretches repeats with a period of about 1182 s (19 min 42 s): at −35 dB the stretches start at 230.6, 328.5, 422.5, 874.9, 974.6, 1183.0 s, then again at 1412.4, 1510.3, 1604.4, 2056.8, 2156.5, 2365.2 s, then again from 2594.7 s. This suggests the file is one playlist of about 20 minutes played roughly three times. It is inferred from the timing only; the audio of the repeats was not compared.
- At −30 dB the stretches are mostly 95–130 s apart, so tracks are probably 1.5–2 minutes long, about ten per repeat. One stretch of about 5.5 minutes (422–755 s) has no quiet point at any tested threshold.
- At −30 dB some gaps come in pairs a fraction of a second apart (755.4 and 758.4 s; 870.3 and 873.1 s). Splitting at the middle of each would produce a track well under a second long. The map rules out a minimum track length, so the user would delete one split of each pair by hand.

## Answer

Resolved 2026-11-13.

- **Location:** `samples/sample1.m4a`, placed by the user. `samples/` is in `.gitignore` with the user's agreement.
- **File facts and gap measurements:** in the comment above (AAC-LC in `.m4a`, 44.1 kHz stereo, about 192 kb/s, 1 h 01 min 26 s, 89 MB; gaps sit around −30 to −40 dB, none under −50 dB).
- **What the user knows about the file:** it might be a loop of the same tracks, but the user is not sure and does not know the number of distinct tracks. The timing evidence for a loop of about 19 min 42 s stands as an inference only.
- **Only one format is available.** The user has no `.mp3` or `.opus` source, so the spike can check `.m4a` only; the other two formats stay unverified on real audio.
- **Repeated tracks:** helping with repeats is out of scope for v1 and recorded on the map as a candidate for a later iteration.
