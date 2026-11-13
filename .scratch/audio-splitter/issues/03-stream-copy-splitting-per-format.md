# Stream-copy splitting per format

Type: research
Status: resolved

## Question

Export cuts the source file into tracks without re-encoding (`-c copy`). For each of `.mp3`, `.m4a` (AAC) and `.opus` (Ogg), how does ffmpeg behave when cutting at arbitrary timestamps, and what is the simplest reliable command shape?

Find, with sources and, where a local `ffmpeg` is installed, a small experiment on generated audio:

- Cut granularity per codec (frame duration) and where the cut actually lands relative to the requested time.
- Artefacts at the start of a cut track: MP3 bit reservoir, AAC priming samples and edit lists, Opus pre-skip and pre-roll. Which are audible when the cut sits inside a silent gap, and which only matter for gapless playback.
- Whether each output reports a correct duration and seeks correctly in common players (VBR MP3 without a Xing header, `.m4a` `moov` placement).
- One ffmpeg run with the segment muxer (`-f segment -segment_times`) versus one run per track (`-ss`/`-to`): accuracy, speed, and control over output filenames.
- Input seeking (`-ss` before `-i`) versus output seeking with `-c copy`.
- What it costs to write a title and track number tag into each output during the same run, per format.
- Differences to expect between a current native ffmpeg and the older ffmpeg version inside ffmpeg.wasm.

Answer with a recommended command shape per format and the risks the spike must check on the user's real files.

## Answer

### What this answer rests on

- **Measured (m4a only).** A native ffmpeg 8.1 cut the real sample `samples/sample1.m4a` (AAC-LC, 44.1 kHz stereo, 61 min 26 s, 89 MB) with `-c copy` at the middle of its seven quiet stretches (231.55, 877.1, 1413.45, 2059.0, 2595.7, 3241.3 and 3549.35 s), giving eight tracks. The sample was only read. Each cut file was decoded in memory and matched sample for sample against the decoded source, so the positions below are exact, not estimated. The cut files were deleted afterwards.
- **No experiment was run for `.mp3` and `.opus`.** No real sample exists for them, so everything said about those two formats comes from documentation and from reading the ffmpeg source code. The spike must check them when the owner supplies such files.
- From discarded synthetic audio (not a finding): an earlier run on generated MP3 and Opus files, since deleted, pointed the same way as the source reading below (cut errors of about one frame, Opus input seeking starting up to about 1 s early, the MP3 last-track quirk).
- **Not confirmed anywhere:** how real players (Chrome, Safari, VLC, Windows, phones) show and seek the cut files, and how the ffmpeg 5.1.4 inside ffmpeg.wasm behaves. Only ffmpeg itself and Apple's `afinfo` read the cut files. The FFmpeg wiki "Seeking" page refused automated access, so it is not used as a source.

Each statement below is marked **measured**, **source** (a document or the ffmpeg code says so) or **inferred** (my reasoning from the two).

### Terms used

- **Container** and **codec**: the codec is the compression method for the sound (MP3, AAC, Opus). The container is the file structure that wraps the compressed sound and adds timing and tags (`.m4a` is an MP4 container holding AAC, `.opus` is an Ogg container holding Opus, `.mp3` is both at once).
- **Frame** (Opus calls it a packet): the codec compresses sound in small fixed blocks, each a few hundredths of a second. `-c copy` copies whole frames without decoding them, so a file can only be cut between two frames. That is the cut granularity.
- **Stream copy** (`-c copy`): ffmpeg moves the compressed frames from one file to another unchanged. There is no quality loss and it is fast.
- **Input seeking** and **output seeking**: `-ss` written before `-i` makes ffmpeg jump into the input file. `-ss` written after `-i` makes ffmpeg read the input from the beginning and throw frames away until the time is reached.
- **Priming**: an AAC encoder puts some extra silent samples at the very beginning of a file (1024 in this sample, 2112 from Apple encoders), because the decoder needs a running start. The **edit list** is a small table in an `.m4a` file that tells the player which samples to skip.
- **Bit reservoir**: an MP3 frame may store part of its data inside earlier frames, so a frame taken alone can be incomplete.
- **Pre-skip** and **pre-roll**: the Opus counterparts of priming. Pre-skip is a number in the file header saying how many samples to drop at the start. Pre-roll is the 80 ms a decoder should decode and discard after a jump so that its internal state settles.
- **Xing header** (also called Info or LAME header): an extra silent first frame in an MP3 file that states the number of frames, so a player knows the duration without reading the whole file.
- **`moov`**: the index of an `.m4a` file. Without it the file cannot be played. It sits at the end or at the start of the file.
- **dBFS**: loudness relative to the loudest value a file can hold. 0 dBFS is the maximum, -40 dBFS is very quiet.

### Recommended command shape per format

Run ffmpeg once per track. `START` and `END` are seconds with decimals (for example `231.55`). Leave out `-ss START` for the first track and `-to END` for the last track. In ffmpeg.wasm each word is one element of the argument array, without quotes.

**`.m4a` (measured):** input seeking, with both times before `-i`.

```
ffmpeg -ss START -to END -i input.m4a -map 0:a:0 -c copy -map_chapters -1 -metadata title=TITLE -metadata track=N/TOTAL -movflags +faststart out.m4a
```

**`.mp3` (documentation only, not run):** output seeking, with both times after `-i`.

```
ffmpeg -i input.mp3 -ss START -to END -map 0:a:0 -c copy -map_chapters -1 -metadata title=TITLE -metadata track=N/TOTAL out.mp3
```

**`.opus` (documentation only, not run):** output seeking, and the tags set on the audio stream.

```
ffmpeg -i input.opus -ss START -to END -map 0:a:0 -c copy -map_chapters -1 -metadata:s:a:0 title=TITLE -metadata:s:a:0 track=N/TOTAL out.opus
```

What the arguments do:

- `-map 0:a:0` copies only the first audio stream. An embedded cover image counts as a video stream in ffmpeg and would otherwise be carried along (source: mp3 muxer documentation; inferred that dropping it is the simplest choice).
- `-c copy` is the stream copy.
- `-map_chapters -1` stops ffmpeg from copying a chapter list from the source into every track (source: ffmpeg documentation: "Use a negative file index to disable any chapter copying"). The sample has no chapters, so this was run but had nothing to remove.
- `-movflags +faststart` moves the `moov` index to the start of each `.m4a`. It is optional: see the duration and seeking finding.
- The output-seeking shape also works for `.m4a` (measured). If one code path for all three formats is preferred, use it everywhere. It costs up to one frame of delay at the start and more reading time.

Do not write `-ss START -i input -to END`. Measured: that produced an 877.11 s file where 645.55 s was wanted, because after input seeking the output clock restarts at zero and `-to` then means "stop at END seconds of output". Keep `-ss` and `-to` on the same side of `-i`.

Do not use input seeking for `.opus`: see the input versus output seeking finding.

### Cut granularity and start-of-track behaviour

| Format | Frame length | Where the start lands | Where the end lands | Start of the cut track | Evidence |
| --- | --- | --- | --- | --- | --- |
| `.m4a` AAC-LC 44.1 kHz, input seeking | 1024 samples = 23.2 ms | exactly at the requested time, 0.0 ms error on all 7 cuts | 5.8 to 22.6 ms late (end of the frame in progress) | at most the first 21.5 ms differ from the source | measured |
| `.m4a` AAC-LC 44.1 kHz, output seeking | 23.2 ms | 5.8 to 22.6 ms late (next frame boundary) | 5.8 to 22.6 ms late | at most the first 22.3 ms differ from the source | measured |
| `.mp3` | 1152 samples = 26.1 ms at 44.1 kHz, 24 ms at 48 kHz (576 samples for sample rates of 24 kHz and below) | expected 0 to 1 frame late, plus 12 ms that ffmpeg-based players skip | expected 0 to 1 frame late | first frame, possibly a few frames, can be corrupt because of the bit reservoir | source and inferred, not run |
| `.opus` | usually 20 ms (2.5 to 60 ms allowed, up to 120 ms per packet) | expected 0 to 1 packet late, plus the pre-skip (a few ms) that the player drops again | expected 0 to 1 packet late | decoder starts cold and settles within about 80 ms | source and inferred, not run |

All of this is inside the "few tens of milliseconds" the project accepts, as long as the cut sits in a quiet stretch with some room on both sides.

### Findings per question

**1. Cut granularity and where the cut lands.**

- Measured on m4a: one frame is 1024 samples (23.2 ms). With input seeking the track starts exactly at the requested time. ffmpeg copies the frame that contains the requested time and writes an edit list that skips the samples before it (in the 231.55 s cut: skip 27 samples). With output seeking ffmpeg drops every frame that starts before the requested time, so the track starts at the next frame boundary, 5.8 to 22.6 ms late. In both cases the track ends at the end of the frame in progress, 5.8 to 22.6 ms after the requested end.
- Measured on m4a: with output seeking the eight tracks together contain every sample of the source exactly once (the gap between one track's end and the next track's start was 0.00 ms at all 7 cuts). With input seeking, neighbouring tracks share 5.8 to 22.6 ms of the quiet stretch. No track lost or repeated samples in its middle.
- Source, MP3: "For MPEG1, frame_size = 1152 samples/frame", "For MPEG2, frame_size = 576 samples/frame" (https://lame.sourceforge.io/tech-FAQ.txt).
- Source, Opus: "Opus can encode frames of 2.5, 5, 10, 20, 40, or 60 ms", it can "combine multiple frames into packets of up to 120 ms", and "20 ms frames are a good choice for most applications" (https://www.rfc-editor.org/rfc/rfc6716.html, section 2.1.4). Opus time is always counted in 48 kHz samples (https://www.rfc-editor.org/rfc/rfc7845.html, section 4).
- Source, all formats: the code that drops frames before `-ss` and stops at `-to` in stream copy compares each frame's timestamp with the requested time (`check_output_constraints` and `do_streamcopy` in https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/fftools/ffmpeg.c, lines 1794 to 1856). Inferred: MP3 and Opus therefore land within one frame with output seeking, as m4a did.

**2. Artefacts at the start of a cut track.**

- Measured on m4a, cut inside the quiet stretches: the decoded track differs from the decoded source for at most 22.3 ms (less than one frame) and is identical afterwards. The largest difference was 312 on a scale of 32768 (about -40 dBFS). The quiet stretches themselves are not digital silence: they peak at 325 to 425 (-40 to -38 dBFS). So the artefact is no louder than the noise already in the gap. Inferred: it is inaudible.
- Measured on m4a, cut deliberately inside music (600, 1800 and 3000 s) for comparison: the first 23.2 ms differ by up to 11409 of 32768 (about -9 dBFS). Inferred: that can be heard as a click. A cut must therefore stay inside a quiet stretch. Cause, source: an AAC decoder needs "to see the 'prior' AAC access unit in order to correctly decode the current AAC access unit" (https://developer.apple.com/library/archive/technotes/tn2258/_index.html).
- AAC priming and edit lists, measured: the sample has 1024 priming samples and an edit list that hides them. The per-track commands keep this correct (the first track still starts at 0.0 ms). The segment muxer does not: see finding 4. Priming and edit lists otherwise matter only for gapless playback, where tracks must join without a single extra sample. Source for the usual Apple value: "the most common delay used was 2112 audio samples" (same Apple note).
- MP3 bit reservoir, source: "The MP3 data for frame N is not stored in frame N, but can be spread over several frames", up to "4088 bits back in the bitstream", and "chopping a mp3 file on a frame boundary will almost always result in the corruption of the data in that frame" (LAME tech FAQ). Inferred: 4088 bits is 511 bytes. At 128 kbit/s a frame is about 418 bytes, so one or two frames at the start of a cut track are affected (26 to 52 ms). In a quiet passage of a variable-bitrate file, frames can shrink to about 104 bytes, so up to about five frames (130 ms) can be affected. Inside a quiet stretch this is expected to be inaudible, but nobody has listened yet.
- MP3 encoder delay, source: when a cut track does not begin with the source's first frame, ffmpeg writes a Xing header with an encoder delay of 0, and ffmpeg-based readers then skip 529 samples (12 ms at 44.1 kHz) at the start (https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/libavformat/mp3enc.c lines 365 to 374, https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/libavformat/mp3dec.c lines 253 to 259). Inferred: harmless in a quiet stretch, and it only matters for gapless playback.
- MP3 last-track quirk, inferred from the same code: the last track of a source that has a LAME header gets a wrong encoder delay of 3567 samples, because `mp3->delay = FFMAX(AV_RL32(side_data) - 528 - 1, 0)` computes `0 - 529` with unsigned numbers and wraps around. Players that honour the header would skip the first 4096 samples (93 ms at 44.1 kHz) of the last track. The line is the same in ffmpeg 5.1.4 and 8.1. With at least half a second of quiet before the music this is harmless, but the spike must confirm it.
- Opus pre-skip, source: pre-skip is "the number of samples (at 48 kHz) to discard from the decoder output when starting playback", and for a cropped stream "a pre-skip of at least 3,840 samples (80 ms) is RECOMMENDED to ensure complete convergence" (RFC 7845, section 5.1). ffmpeg copies the source's header unchanged into each cut file (`ogg_build_opus_headers` in https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/libavformat/oggenc.c, lines 370 to 392). Inferred: each cut track drops the source's small pre-skip again (a few ms of real audio) and the decoder settles during the first 80 ms that are played. Both are inaudible in a quiet stretch and only matter for gapless playback.

**3. Duration and seeking in players.**

- Measured on m4a: for every cut file the duration reported by ffprobe equals the decoded length within 0.6 ms. Apple's `afinfo` reported the same durations.
- Measured on m4a: output seeking writes a small "empty edit" at the start of the file (22 ms in the 231.55 s cut), so ffprobe shows a start time of 5 to 22 ms. `afinfo` ignored it. Input seeking produces a start time of exactly 0. This is one reason to prefer input seeking for m4a.
- `moov` placement, measured: by default ffmpeg writes `moov` at the end (`ftyp, free, mdat, moov`), as in the source sample. With `-movflags +faststart` it is at the start (`ftyp, moov, free, mdat`). The eight runs took 0.99 s with it and 0.96 s without. Source: the flag means "Run a second pass to put the index (moov atom) at the beginning of the file" (ffmpeg source, `movenc.c`), and the documentation says the index "is usually written at the end of the file, but it can be moved to the start for better playback" (https://ffmpeg.org/ffmpeg-formats.html, mov muxer). Inferred: a file played from disk works either way. The flag helps when a track is later played over a network, and in ffmpeg.wasm the second pass briefly needs a second copy of one track in memory.
- VBR MP3 without a Xing header, source: the mp3 muxer writes "A Xing/LAME frame right after the ID3v2 header (if present). It is enabled by default, but will be written only if the output is seekable" and it holds "the audio duration or encoder delay" (https://ffmpeg.org/ffmpeg-formats.html, mp3 muxer). Inferred: every cut MP3 gets its own correct header, even when the source has none, provided the ffmpeg.wasm file system lets ffmpeg go back and rewrite the header. If it does not, a variable-bitrate track would show a guessed, wrong duration and seek badly. The spike must check for the header.
- Ogg Opus has no duration field. Players compute it from the last position stamp in the file (RFC 7845, section 4). Not tested.
- Not confirmed: behaviour of any real player.

**4. Segment muxer versus one run per track.**

Measured on the m4a sample (native ffmpeg 8.1, 8 tracks, 89 MB):

| Method | Total time | Start error | Per-track tags | Notes |
| --- | --- | --- | --- | --- |
| One run per track, input seeking | 0.96 s | 0.0 ms | yes | recommended for m4a |
| One run per track, output seeking | 2.85 s | 5.8 to 22.6 ms late | yes | every run reads the input from the beginning |
| One run, segment muxer (`-f segment -segment_times ... -reset_timestamps 1 out%02d.m4a`) | 0.89 s | 0.6 to 17.4 ms early | no | see problems below |
| One run, eight outputs, each with `-ss`/`-to` after `-i` | 4.22 s | same as output seeking | yes | all outputs exist at once |

Problems found with the segment muxer, all measured on m4a:

- It cannot write a different title or track number per file. Every segment got only the source's tags.
- Filenames are a numbered pattern. Inferred: this matters little, because the app reads each file out of ffmpeg's virtual file system and names the download itself.
- Without `-reset_timestamps 1` the files are misleading: the second segment claimed a duration of 877 s for 645 s of audio and a start time of 231.57 s.
- The first segment lost its edit list, so the 1024 priming samples became 23.2 ms of extra sound at the start of track 1.
- Source: its cut position depends on the ffmpeg version. Version 8.1 shifts the split times by the timestamp of the first frame, version 5.1.4 does not (compare `seg_write_packet` in https://github.com/FFmpeg/FFmpeg/blob/n8.1/libavformat/segment.c, lines 914 to 924, with https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/libavformat/segment.c).

Recommendation: do not use the segment muxer. If one run per track proves too slow in the browser, the "one run, several outputs" form uses the same per-track arguments and gave identical cut positions (measured), but it keeps all tracks in memory at the same time.

**5. Input seeking versus output seeking with `-c copy`.**

- Source: with `-ss` before `-i`, "in most formats it is not possible to seek exactly, so ffmpeg will seek to the closest seek point before position ... When doing stream copy or when -noaccurate_seek is used, it will be preserved" (https://ffmpeg.org/ffmpeg.html, `-ss`). So with stream copy, input seeking starts the track at the seek point, which can be earlier than requested.
- m4a, measured: the seek point is the frame containing the requested time, because an `.m4a` has an index of every frame. The edit list then trims to the exact sample. Result: exact start, and each run reads only its own part of the file.
- Opus, source and inferred: an Ogg file carries time stamps per page, not per packet, and ffmpeg seeks by searching pages (`ogg_read_seek` in https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/libavformat/oggdec.c, lines 930 to 954). ffmpeg writes pages of about one second ("The default is 1 second", ogg muxer documentation). Inferred: input seeking can start an Opus track up to about one second early, which could include the end of the previous song. Use output seeking for Opus.
- MP3, source: by default ffmpeg does not trust the header's rough seek table and falls back to reading frames from the start (`mp3_seek` returns to the "generic index code", https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/libavformat/mp3dec.c, lines 549 to 601). Inferred: input seeking is probably frame-accurate for MP3 too, but it is unverified, so output seeking is the safe choice.
- A faster variant, measured on m4a only: `-ss START-2 -i input -ss 2 -t LENGTH` (a rough input seek two seconds early, then an exact output seek) gave the same result as pure output seeking in a third of the time (1.03 s against 3.15 s). It is a fallback if output seeking is too slow for MP3 and Opus in the browser.

**6. Cost of writing a title and track-number tag: see the next section.**

**7. Native ffmpeg versus ffmpeg.wasm: see the section after it.**

### Cost of writing title and track-number tags

- `.m4a`, measured: `-metadata title=... -metadata track=2/8` wrote the atoms `©nam` and `trkn` (an extra `-metadata album=...` wrote `©alb`). ffprobe read them back as `title=Track 2`, `track=2/8`. Eight tagged files were 504 bytes larger in total than eight untagged ones, and the run time did not change.
- `.mp3`, source: tags go into an ID3v2 header at the start of the file in the same run. "Versions 2.3 and 2.4 are supported", the default is 2.4, and `-id3v2_version 3` selects 2.3 (ffmpeg-formats, mp3 muxer). Not run.
- `.opus`, source: tags go into the comment header at the start of the file. ffmpeg builds it from the audio stream's tags and adds the file-level tags only where the stream has no tag of that name (`av_dict_copy(&st->metadata, s->metadata, AV_DICT_DONT_OVERWRITE)`, `oggenc.c` line 524). Inferred: if the source `.opus` already has a title, a plain `-metadata title=...` would not replace it, which is why the command above uses `-metadata:s:a:0`. ffmpeg stores `track` as `TRACKNUMBER` (source: `vorbiscomment.c`). Not run.
- All formats, inferred: the tags sit in the header that ffmpeg writes anyway, so they cost a few hundred bytes and no extra pass.
- Source: ffmpeg copies the source file's own tags (album, artist) to every output unless told otherwise, and "This option overrides metadata set with -map_metadata", so a per-track title replaces a source title (https://ffmpeg.org/ffmpeg.html, `-metadata`).

### Expected differences in the older ffmpeg inside ffmpeg.wasm

- Source: the ffmpeg.wasm build file pins `FFMPEG_VERSION=n5.1.4` and says "We cannot upgrade to n6.0 as ffmpeg bin only supports multithread at the moment" (https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/Dockerfile). The current `@ffmpeg/core` package is 0.12.10 (https://registry.npmjs.org/@ffmpeg/core/latest). Its configure script does not disable any muxer, so the mp3, m4a (ipod), Ogg Opus and segment writers are present (https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/build/ffmpeg.sh).
- Source: every option in the recommended commands exists in 5.1.4 (`-ss`, `-to` and `-t` as input and output options, `-map_chapters`, `-metadata`, `faststart`, `use_editlist`, `id3v2_version`, `write_xing`).
- Source: the rules for stream copy are the same in both versions. Frames before an output `-ss` are dropped, and frames before an input `-ss` seek point are kept unless `-copypriorss 0` is given. Inferred: the per-track commands should cut at the same places in ffmpeg.wasm. This was not measured.
- Source: the MP3 header code is identical in both versions, including the last-track quirk. The Ogg position-stamp code is the same.
- Source: the segment muxer differs (see finding 4), one more reason to avoid it.
- Source: 8.1 reports an MP3's duration without the encoder padding, 5.1.4 includes it. Inferred: reported MP3 durations can differ by a few tens of milliseconds between the two versions.
- Inferred: ffmpeg 5.1.4 processes everything in one thread and WebAssembly is slower than native code, so the native timings above only show the ratio between methods, not what the browser will take.

### For the spike to verify

1. Print `ffmpeg -version` inside ffmpeg.wasm and confirm it is 5.1.4.
2. Run the recommended m4a command in ffmpeg.wasm on `sample1.m4a` at the seven cut points. Expect each track to start exactly at the requested time, end at most 23 ms late, and report a duration equal to its decoded length.
3. With a real `.mp3` (ideally one variable-bitrate and one constant-bitrate file): check that each cut lands within one frame (26 ms), that every output begins with a Xing or Info header, and that the reported duration matches the decoded length. Listen to the first second of several tracks for a blip. Check whether the last track loses about 90 ms at its start.
4. With a real `.opus`: check that output seeking lands within one packet, that the title and track number are really replaced, and that the duration shown is right. Confirm that input seeking starts early, so that it stays excluded. Listen to the first second of several tracks.
5. Open cut files of each format in Chrome, Safari or QuickTime, VLC and one phone player: correct duration, seeking to the middle and near the end, tags shown.
6. Measure time and peak memory in the browser for a 1 to 3 hour file: one output-seeking run per track (reads the file from the beginning each time), against the rough-plus-exact seek variant, against one run with several outputs.
7. Measure what `-movflags +faststart` costs in ffmpeg.wasm and decide whether to keep it.
8. Try a source file with an embedded cover image and one with chapters, and confirm that `-map 0:a:0` and `-map_chapters -1` give clean audio-only tracks.
9. Confirm that the app never places a cut closer than about 0.2 s to the edge of a quiet stretch. The worst expected start damage is one frame for AAC, about 130 ms for a quiet variable-bitrate MP3 and 80 ms for Opus.
10. If a sample turns out to be HE-AAC (ffprobe shows `profile=HE-AAC`) or 48 kHz, repeat the m4a check. Neither was tested.

## Comments

### 2026-11-13: amended by MP3 playback

[MP3 playback](19-mp3-playback.md) changes the `.mp3` and `.opus` cut to `-ss START-2 -i input -ss 2 -t LENGTH -c copy`, measured in [Spike: decode and split the .mp3 and .opus samples](12-spike-decode-and-split-the-mp3-and-opus-samples.md) to give the same cut positions much faster. `.m4a` keeps its command.
