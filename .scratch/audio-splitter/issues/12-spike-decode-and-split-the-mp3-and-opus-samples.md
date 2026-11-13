# Spike: decode and split the .mp3 and .opus samples

Type: task
Status: resolved
Blocked by: 10

## Question

Do `.mp3` and `.opus` pass the supported-format bar from [What v1 claims for .mp3 and .opus](10-what-v1-claims-for-mp3-and-opus.md)? AFK: the agent runs this alone.

Repeat [Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md) (same throwaway page shape, pinned `@ffmpeg/ffmpeg@0.12.15` and single-thread `@ffmpeg/core@0.12.10`, installed Google Chrome through Playwright, 20-call reload budget) on these inputs, read-only from the main checkout's `/Users/suleyman/Projects/misc/audio-splitter/samples/` (git-ignored, absent from worktrees):

- `sample1.mp3`: variable bitrate, LAME header, a conversion of `sample1.m4a`.
- `sample1.opus`: Opus in Ogg, a conversion of `sample1.m4a`.
- Two variants made from `sample1.mp3` with native ffmpeg into the scratchpad, never into `samples/`: a constant-bitrate `.mp3`, and an `.mp3` with an embedded cover image. Real files do not all come from one encoder.

For each input, check and record:

1. The probe reports container, codec, duration, sample rate and channel count, as the decode path in [Decode path and hand-written steps](07-decode-path-and-hand-written-steps.md) needs. For `.opus` this is the first time Opus is decoded in the published core: does the sliced `f32le` decode run to the end, at what time and memory, and do the slice borders join without a jump?
2. The loudness curve from the hand-written downmix and RMS shows the same seven gaps as `sample1.m4a`.
3. Cut with the per-format command from [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md) (output seeking, tags) at the m4a run's gap midpoints (231.55, 877.1, 1413.45, 2059.0, 2595.7, 3241.3 and 3549.35 s, shifted if a conversion's timeline is offset): each cut lands within one frame (26 ms MP3 at 44.1 kHz, one packet for Opus), and each output's reported duration matches its decoded length. Note the time per cut, since output seeking reads from the start of the file.
4. Clean starts, measured instead of listened to: decode the first 300 ms of every cut track and compare it with the same stretch of the source; flag any track whose start carries energy above the gap's level. The user listens only to flagged tracks.
5. Tags: title, track `N/TOTAL` and album are really written (for Opus, really replaced on the stream), and the cover image is dropped.
6. MP3 last-track quirk: confirm whether the last track gets the wrong encoder delay, and that the roughly 93 ms a player skips is silence.
7. Confirm that Opus input seeking starts early, so it stays excluded.
8. Added 2026-11-13 for [Playback for auditioning a split](14-playback-for-auditioning-a-split.md): how accurately Chrome's `<audio>` element seeks in each input (`sample1.m4a` too, as the reference), playing from a blob URL of the source file. At each gap midpoint (and a few mid-track points), set `currentTime`, capture what actually plays (for example through a `MediaElementAudioSourceNode` into a recording node), cross-correlate it with ffmpeg-decoded PCM around that time, and record the offset in ms. Note whether VBR MP3 (LAME header with a TOC) seeks to within 50 ms.

Resolved when the measurements are recorded under `## Answer` with a pass or fail per format, and the spike code is deleted. A format that fails leaves v1 and goes to the map's Out of scope, unless the fix is a change to the ffmpeg command line only.

## Answer

Resolved 2026-11-13 by the agent alone. `.mp3` passes ticket 10's bar. `.opus` passes every measured check, but 6 of its 7 cut tracks are flagged for a listening check (check 4). Chrome's `<audio>` seeks VBR MP3 seconds off, so MP3 playback reopens as ticket 14 foresaw.

### How it was run

- Ticket 06's page shape, in a throwaway worktree: `spike.html` and `spike/main.ts` served by the project's Vite config, `@ffmpeg/ffmpeg@0.12.15` and `@ffmpeg/core@0.12.10` installed exactly, `optimizeDeps.exclude`. A Node 24 script drove it through Playwright in installed headless Google Chrome 157.0.8103.51 (`channel: 'chrome'`, `--autoplay-policy=no-user-gesture-required`, `--mute-audio`) on an Apple M4 Pro, 24 GB. The core reports ffmpeg 5.1.4. Every run used the restart loop with a budget of 20 calls and a watchdog: 0 failures and 0 timeouts in all runs (a decode is 64 calls with 3 reloads).
- Inputs, read-only from `samples/`: `sample1.mp3` (VBR, Xing/LAME header with TOC), `sample1.opus` (Ogg, 48 kHz, pre-skip 312) and `sample1.m4a` (reference). Made with native ffmpeg 8.1 into the scratchpad: a CBR `.mp3` (192 kb/s re-encode of `sample1.mp3`, `Info` header), an `.mp3` with an embedded 600×600 JPEG plus source tags (title, album, artist, track 9/9; audio stream-copied), and an `.opus` with source stream tags (to test tag replacement).
- Cut tracks and slices came back to Node and were checked with native ffmpeg 8.1: each was decoded and matched sample for sample against a one-pass decode of the whole source. Results that depend on a decoder were also checked with libopus: same numbers.
- Timings are rough. Other heavy processes ran on the machine (load average 4–7), and the same `.m4a` decode took 12 s here against 4.8 s in ticket 06. Compare formats with each other, not with ticket 06.

### Results per check

**1. Probe and sliced decode (measured).** The probe reads every field from the log: `mp3` / `mp3`, 3686.24 s, 44100 Hz, stereo; `ogg` / `opus`, 3686.22 s, 48000 Hz, stereo. The cover variant also lists `Video: mjpeg ... (attached pic)`, so the probe must take the first audio stream. Opus decodes to the end in the published core. The 60 s `f32le` slices give exactly as many frames as a one-pass decode (162,562,048 for every MP3, 176,938,284 for Opus), so borders have no jump.

| Input | Decode, 1 h | Slice `exec` time | Peak memory |
| --- | --- | --- | --- |
| `.m4a` (reference, same session) | 12.0–12.3 s | 420 ms falling to 70 ms | +605–617 MB |
| VBR `.mp3` | 17.1 s | 90 ms rising to 430 ms | +378–442 MB |
| CBR `.mp3` | 19.1 s | 85 ms rising to 490 ms | +428 MB |
| `.mp3` with cover | 17.8 s | 90 ms rising to 445 ms | +403 MB |
| `.opus` | 8.8–9.1 s | about 130 ms, flat | +389–424 MB |

- MP3 slice time grows linearly with position, because ffmpeg seeks an MP3 by reading from the start. Inferred: 3 h of MP3 costs about 100 s in this session (quadratic), against about 27 s for Opus. Longer slices for MP3 would cut this; not measured.
- The decoder restarts cold at each slice border. MP3 decodes the first 50–80 ms after a border wrong (one 50 ms window up to 16.6 dB too quiet). Opus takes more than 250 ms to settle (windows up to 9.4 dB off). In Opus this once shortened a gap at −35 dB: 2154.7–2160.0 s instead of 2154.7–2160.8 s, because 2160 s is a border. `.m4a` has the same effect, smaller (max 1.9 dB).
- **Fix, command line only:** start each slice 1 s early and trim it after decoding: `-ss S-1 -i input -ss 1 -t 60` (the first slice as before). Measured on all three formats: every border is bit-exact (error below −120 dBFS for MP3 and Opus, −74 dBFS for AAC), and the loudness curve equals the one-pass curve in every window. It costs about 1/60 more decoding. Recommended for the decode path in ticket 07.

**2. Loudness curve and the seven gaps (measured).** With the hand-written downmix and 50 ms RMS, every input shows the same seven gaps as `sample1.m4a` (below −40 dB for at least 5 s). Gap edges agree within 0.05 s, 0.35 s for the CBR re-encode. Nine threshold and length pairs give `sample1.m4a` exactly its seven gaps (from −47 dB / 2.5 s to −31 dB / 11.5 s). The VBR `.mp3` matches at all nine, the `.opus` at eight (at −31 dB / 11.5 s it finds six), and the CBR re-encode at five (elsewhere it finds one to three more). Thresholds near a gap's level are fragile for every format; the default threshold is ticket 16's business. The conversions keep m4a's timeline: no shift was needed.

**3. Cut positions, durations and time (measured).** Ticket 03's commands (output seeking, tags; `-metadata:s:a:0` for Opus) at the seven unshifted midpoints, 8 tracks per input:

| Input | Start late by | End late by | Reported − decoded duration | Body after the start | Time per cut |
| --- | --- | --- | --- | --- | --- |
| VBR, CBR, cover `.mp3` | 0.5–24.7 ms (one frame is 26.1 ms), plus 12.0 ms the decoder skips | 0.5–24.7 ms | 12.0 ms (track 8: 0) | bit-exact | 45–66 ms (track 1) to 780–940 ms (track 8) |
| `.opus` | 3.5–13.5 ms (one packet is 20 ms), plus the 6.5 ms pre-skip played again | 3.5–13.5 ms | 16.5–26.5 ms (track 1: 6.5) | bit-exact | 95 ms to 1300 ms |

- MP3: every cut file starts with a Xing (VBR) or Info (CBR) header with a frame count, so the header rewrite works in ffmpeg.wasm. The 12.0 ms is the 529 samples that ffmpeg-based decoders skip when the header says delay 0 (ticket 03). Chrome's `duration` equals ffprobe's on every track. ffmpeg 5.1.4 reports up to 100 ms more on the last track (it counts the padding).
- Opus: the reported duration counts from the requested time, while audio starts up to a packet later. Inferred: harmless. `-avoid_negative_ts make_zero` removes only 3.5 ms natively, so it is not worth adding.
- **Faster cut, command line only:** `-ss START-2 -i input -ss 2 -t LENGTH` (rough input seek, then exact output seek; `-t`, never `-to`). Measured: the same start and end positions on all 8 tracks of every input, MP3 files byte-identical. Opus cuts take 18–102 ms each, flat, instead of growing to 1.3 s. MP3 cuts take about half the time (34–477 ms) and still grow. Recommended for both formats.

**4. Clean starts (measured).** The first 300 ms of each cut track were compared with the same stretch of the source. A track is flagged when its start peaks more than 1 dB above the gap's own peak, or differs from the source by more than that peak.

- `.m4a` (reference, input seeking): 0 of 7 flagged.
- `.mp3`, all three: 0 of 7 flagged. The start differs for 17–44 ms (bit reservoir) at −43 to −48 dBFS, no louder than the gap (peak −42 to −47 dBFS).
- `.opus`: 6 of 7 flagged (tracks 2 and 4–8). Each start carries a short burst of 35–55 ms peaking at −36.8 to −40.7 dBFS, 5–11 dB above the gap's peak (gap RMS is about −54 to −63 dBFS). libopus decodes the same burst, so it is in the file, not in one decoder. Cause, inferred: the decoder starts cold, and the cut file keeps the source's 312-sample pre-skip, far below the 3840 samples RFC 7845 recommends after cropping. ffmpeg copies that header unchanged, so no command-line fix was found.
- **The user listens to these tracks:** cut points 231.55, 1413.45, 2059.0, 2595.7, 3241.3 and 3549.35 s of `sample1.opus`. If the burst is audible, `.opus` fails, because the fix is not a command-line change. The six tracks cut by ffmpeg.wasm are kept, until the temporary folder is cleared, in `/private/tmp/claude-501/-Users-suleyman-Projects-misc-audio-splitter/b6c68e19-1718-409c-9a56-bd236994b33d/scratchpad/opus-flagged/` (`track2.opus` … `track8.opus`).

**5. Tags (measured).** Every track of every input has title `Track N`, track `N/8` and album as written. In Opus they are on the stream as `title`, `TRACKNUMBER` and `album`, and they replace the source's own title, album and track 9/9 (no duplicates in the comment header). The cover variant's tracks hold only the audio stream and no `APIC`, and their tags replace the source's (the source artist is carried along). Ogg tracks also carry the source's encoder and brand stream tags (harmless).

**6. MP3 last-track quirk (measured).** Track 8 gets LAME delay 3567 and padding 704, so decoders skip 4096 samples (92.9 ms). Its decoded start is 105.6 ms late: 92.9 ms quirk plus 12.7 ms of frame offset. The skipped stretch peaks at −55.8 dBFS (VBR) and −56.1 dBFS (CBR), quieter than the gap (−51.7 dBFS peak): silence, as ticket 10 accepted.

**7. Opus input seeking (measured).** With `-ss` and `-to` before `-i`, Opus tracks started 0, 100, 300, 350, 450, 550 and 700 ms early. It stays excluded. For comparison, MP3 input seeking started within a frame (1–26 ms early, at the start of the frame holding the time) but saved only half the time.

**8. Seek accuracy of Chrome's `<audio>` (measured).** A blob URL of the whole source, `MediaElementAudioSourceNode` into an AudioWorklet recorder (gain 0 to the output), AudioContext at the file's rate. At each point: pause, set `currentTime`, wait for `seeked`, play, record 3 s, strip the leading zeros, and cross-correlate 2.5 s with ffmpeg-decoded PCM within ±30 s (correlation 0.998–1.000). Offset = time actually heard − requested time.

| Point (s) | `.m4a` | `.opus` | CBR `.mp3` | VBR `.mp3` |
| --- | --- | --- | --- | --- |
| 231.55 | 0.00 ms | 0.00 ms | +0.5 ms | −5141 ms |
| 877.1 | 0.00 | 0.00 | −11.6 | +6108 |
| 1413.45 | 0.00 | 0.00 | +10.7 | −3638 |
| 2059.0 | 0.00 | 0.00 | +24.8 | −5686 |
| 2595.7 | 0.00 | 0.00 | +36.6 | −2240 |
| 3241.3 | 0.00 | 0.00 | +13.7 | −4497 |
| 3549.35 | 0.00 | 0.00 | +38.8 | +2027 |
| 100 | 0.00 | 0.00 | −2.2 | −2436 |
| 600 | 0.00 | 0.00 | +7.6 | +9608 |
| 1800 | 0.00 | 0.00 | +20.7 | −4955 |
| 3000 | 0.00 | 0.00 | +33.7 | −7400 |

- **VBR MP3 does not seek within 50 ms: it is off by 2 to 9.6 s, with the LAME header and TOC present.** The cover variant (same audio, larger ID3 tag) gives the same offsets within 26 ms, so the result is repeatable. Chrome's `currentTime` still reads the requested time, so the element believes it is at the split while playing other audio. Inferred: Chrome places a VBR seek by the TOC's 100 coarse byte entries.
- `.m4a` and `.opus` seek sample-exact. CBR MP3 stays within 39 ms in 1 h. Inferred: the error grows with position, so a 3 h CBR file may pass 50 ms.

### Pass or fail against ticket 10's bar

| Format | Decode to the end and gaps | Cuts within one frame | Duration right | Clean start | Verdict |
| --- | --- | --- | --- | --- | --- |
| `.mp3` (VBR, CBR, cover) | pass | pass | pass (12 ms decoder skip) | pass, none flagged | **pass** |
| `.opus` | pass | pass | pass (within 26.5 ms) | 6 of 7 flagged | **pass, pending the user's listen**; fails if the burst is audible |

### For later tickets

- [Playback for auditioning a split](14-playback-for-auditioning-a-split.md): its condition is met. VBR MP3 seeks seconds off, so MP3 playback reopens as a ticket. `.m4a` and `.opus` are exact. Inferred option: play MP3 from PCM that ffmpeg decodes around the split, which is exact by check 1.
- [Decode path and hand-written steps](07-decode-path-and-hand-written-steps.md): use the 1 s pre-roll per slice (`-ss S-1 -i input -ss 1 -t 60`) on every format, so sliced and one-pass curves are identical, which also helps the tests. MP3 decode time grows with the square of the length: 3 h needs a longer slice or a measured alternative.
- Export: use `-ss START-2 -i input -ss 2 -t LENGTH -c copy` for `.mp3` and `.opus` (same cuts, much faster). `.m4a` keeps input seeking.
- Format identification: `Input #0, mp3` with `Audio: mp3`, and `Input #0, ogg` with `Audio: opus`. An attached picture shows as a `Video:` stream.
- Not checked: a 3 h file, other MP3 encoders than LAME via ffmpeg, Opus from yt-dlp, and Safari or phone players.

The spike code (`spike.html`, `spike/`, the temporary `vite.config.ts` line and the two ffmpeg packages) has been deleted.

## Comments

### 2026-11-13: the user listened to the flagged Opus tracks

The user listened to the six flagged tracks (cut points 231.55, 1413.45, 2059.0, 2595.7, 3241.3 and 3549.35 s) and heard no artefact at their starts. **`.opus` passes**, so v1 supports all three formats. Follow-ups decided in [MP3 playback](19-mp3-playback.md): ffmpeg-decoded clips for playback, the 1 s slice pre-roll, the faster cut for `.mp3` and `.opus`, and accepting the slow decode of long MP3 files.
