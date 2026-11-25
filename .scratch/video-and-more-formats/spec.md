# Video files and more audio formats

Status: ready-for-agent

From GitHub issue #13, milestone 3 of the [v2 milestones](../audio-splitter-v2/milestones.md#milestone-3-containers-video-and-more-audio-formats). Vocabulary is in the glossary. While this was grilled, **Source file** and **Supported format** changed, **Track format** was added, and **Export** and **Single export** now say "track format". The decisions and the first measurements are in [analysis.md](analysis.md#decisions). No ADR: each decision is easy to reverse.

## Problem Statement

My music often arrives as a video download, MP4 or WebM, or in an audio format the app turns away. Before I can split it, I have to convert it myself with another tool. That is a step I don't want, and it can lose quality if I do it wrong.

The app accepts three supported formats: AAC in `.m4a`, MP3 and Opus in `.opus`. An `.mp4` with AAC audio probably loads already, but nobody has checked. A WebM, an MKV or a Vorbis `.ogg` gets the "unsupported" message.

## Solution

I load an MP4, MOV, WebM or MKV video, or a Vorbis `.ogg`, the same way I load an `.m4a` today. The review screen works as it does for audio. The splitter uses the video's first audio stream and ignores the picture.

The export writes audio-only tracks in the source file's track format, set by the codec: AAC becomes `.m4a`, Opus becomes `.opus`, Vorbis becomes `.ogg`. The audio is copied, never re-encoded, so it sounds exactly like the source, and cuts land within one frame as they do today.

A file the splitter can't take gets a message naming what it is and listing the five supported formats.

## User Stories

1. As a user, I want to load an MP4 video with AAC audio, so that I can split a video download without converting it first.
2. As a user, I want to load a MOV video with AAC audio, so that files from Apple devices and editors load too.
3. As a user, I want to load a WebM video with Opus audio, so that a YouTube download in its usual form loads.
4. As a user, I want to load an MKV video with Opus audio, so that a download merged into Matroska loads.
5. As a user, I want to load an audio-only WebM with Opus, so that an audio download from YouTube loads as it is.
6. As a user, I want to load a Vorbis `.ogg` file, so that older Ogg music loads.
7. As a user, I want a video file to give the same review screen as an audio file, so that I don't have to learn anything new.
8. As a user, I want the loudness curve of a video file to show the gaps between its tracks, so that splitting works as it does for audio.
9. As a user, I want Find gaps to work on a video file, so that I get proposed splits on request.
10. As a user, I want to hear auditions, tracks and ranges of a video file, so that I can check splits by ear.
11. As a user, I want Find duplicates to work on a video file, so that repeats in a video mix are found too.
12. As a user, I want the tracks of an MP4 or MOV source exported as `.m4a`, so that any music player opens them.
13. As a user, I want the tracks of a WebM or MKV source with Opus exported as `.opus`, so that I get audio files, not videos.
14. As a user, I want the tracks of a Vorbis source exported as `.ogg`, so that players and file managers know them.
15. As a user, I want exported tracks to hold no video stream, so that they are small and play in a music player.
16. As a user, I want exported tracks copied without re-encoding, so that they sound exactly like the source.
17. As a user, I want cuts in the new formats to land within one frame of the split, so that a cut sounds as clean as it does in `.m4a`.
18. As a user, I want each exported track to report its right length in a player, so that players show and seek it correctly.
19. As a user, I want each exported track to start cleanly, so that no click or burst comes from the cut.
20. As a user, I want a track's title, number and album written into its file in the new formats, so that my music library shows them.
21. As a user, I want a single export of a track or a range of a video file to be audio-only in its track format, so that a single export behaves like the full export.
22. As a user, I want the export folder named after the video file, so that I find the tracks next to their source.
23. As a user, I want the first audio stream used when a video has several, so that loading never stops to ask me.
24. As a user, I want a video with no audio stream to get the message it gets today, so that I know why it does not load.
25. As a user, I want the source file's length to be its audio's length, so that a video that runs on after its audio adds no empty time to the last track.
26. As a user, I want an unsupported file to get a message naming its codec and container, so that I know what it is.
27. As a user, I want that message to list the five supported formats in the words I know (".m4a, .mp4 or .mov", ".opus, .webm or .mkv", ".ogg"), so that I know what to convert to.
28. As a user, I want a FLAC, a WAV, a Vorbis WebM or an AAC MKV to get that message, so that I am not offered a file the splitter can't cut well.
29. As a user, I want the file picker to show video files and `.ogg` files, so that I don't have to switch it to "All files".
30. As a user, I want a file with a misleading extension judged by its contents, so that an `.mp4` holding something else gets the message rather than a broken load.
31. As a user, I want a file larger than the splitter can read refused at once with its size in the message, so that a decode does not fail halfway through.
32. As a user, I want a 3 h video file to load in a time close to its audio alone, so that video is not a slow path.
33. As a user, I want cancelling the load of a video file to work as it does for audio, so that I can stop a long load.
34. As a learner, I want a concept note on streams in a container, measured on a real sample, so that I understand why moving the audio changes no sound.
35. As a learner, I want the note to show what share of a video file is audio, so that I see how little of the file the splitter needs.
36. As a learner, I want the note to show that the copied audio decodes to the same samples as the source, so that "changes no sound" is a measured fact.
37. As a developer, I want each new pair checked against the v1 bar in the browser before it is offered, so that "supported" keeps its meaning.
38. As a developer, I want a committed fixture for each new pair, so that the end-to-end export spec covers it.

## Implementation Decisions

- **Gated by the spike and the concept note.** The first ticket is the browser spike in [analysis.md](analysis.md#decisions), run by the agent alone. The second is concept note 12, which the user confirms before any code ticket starts. A pair that fails the spike leaves this spec, unless the fix is a change to the ffmpeg command line only.
- **The five pairs, by ffmpeg's demuxer and codec names.** The probe's list has `mov,mp4,m4a,3gp,3g2,mj2` with `aac`, `mp3` with `mp3`, `ogg` with `opus`, `matroska,webm` with `opus`, and `ogg` with `vorbis`. MP4 and MOV are one demuxer, and so are WebM and MKV. The splitter never tells them apart.
- **The probe outcome splits what one value did.** Today one supported-format value picks both the seek and the file extension. From now on the outcome carries two values:
  - the **track format** (`m4a`, `mp3`, `opus`, `ogg`), set by the codec;
  - the **seek** method, set by the container. MP4 has an index of every frame and seeks once before the input. Ogg, Matroska and MP3 seek twice: a jump 2 s early, then an exact seek after the input.

  Native measurements show input seeking alone breaks Opus from WebM: the Ogg output gets negative timestamps.
- **The track format is what the export widgets already read.** The source-file store's format value becomes the track format, so the export, the single export and their file names follow without change, and `ogg` joins the extensions they write.
- **Vorbis writes its tags on the stream,** as Opus does, because both keep them in the stream's comment header.
- **Slice length stays by codec.** MP3 keeps its longer slices. Opus, Vorbis and AAC keep 60 s slices, whatever the container.
- **The length comes from the first audio stream.** The probe reads the audio stream's own duration where ffmpeg gives one, and falls back to the container's `Duration`. The spike checks what ffmpeg 5.1.4 prints for a stand-in whose video runs 3 s past its audio, and the parsing follows that log.
- **The first audio stream only.** Every decode, clip and cut already maps the first audio stream. The probe already takes the first `Audio:` line, after any `Video:` line.
- **The unsupported message** names the file's codec and container, then lists the five pairs: "This file is FLAC in FLAC; the splitter supports AAC in .m4a, .mp4 or .mov, MP3, Opus in .opus, .webm or .mkv, and Vorbis in .ogg."
- **The file picker's `accept` list** is `.m4a,.mp4,.m4v,.mov,.mp3,.opus,.ogg,.oga,.webm,.mkv`. It is a convenience only; the probe decides.
- **The size limit is conditional.** If the spike shows the core cannot read a file past 2 GB, the source-file store refuses a larger file before probing, with a message giving its size and the limit. If the core reads it, nothing is added.
- **Taking the audio out on load is a fallback, not part of this spec.** If the spike shows a 1 h video decoding more than three times as slowly as its audio alone, this spec stops and is grilled again.

## Testing Decisions

- A good test checks what the module gives back for an input: the probe's outcome for a log, the command a cut runs, the files an export writes. It never checks how the result is built.
- **The probe** is tested through its log reader, with log lines captured from each new file type in the pinned core during the spike:
  - the five pairs and the track format and seek method of each;
  - a video stream before the audio;
  - the audio's length against the container's;
  - the new message for FLAC, WAV, Vorbis in WebM and AAC in Matroska.

  Prior art: the existing probe spec.
- **The cut** is tested through the command it gives a fake session:
  - MP4 seeks once;
  - Ogg and Matroska Opus and Vorbis seek twice;
  - Vorbis tags go on the stream;
  - the output extension is the track format.

  Prior art: the existing cut spec, with its "seek twice" group.
- **The source-file store** gets a test for the size refusal only if the spike makes that refusal needed. Prior art: the existing store spec.
- **The load page** test checks the widened `accept` list. Prior art: the existing load page spec.
- **End to end,** the export spec runs once per fixture already. Three new fixtures join its list: a Vorbis `.ogg`, a 160×90 test-picture MP4 with AAC, and the same as WebM with Opus. For each, the tracks are exported with the right extension and play. A track holding a video stream fails the check. The unsupported-file spec switches to a FLAC fixture, because Vorbis in Ogg is now supported. The fixture script makes all of them.
- These e2e specs run in the Final tier, because the flow is a real browser's.

## Out of Scope

- Vorbis in WebM, AAC in Matroska, FLAC, WAV, ALAC, AC-3 and every other pair. Each can join later, only after passing the bar. FLAC would need re-encoding: a copied `.flac` reports the whole source's length.
- Re-encoding, and sample-accurate cuts.
- Choosing an audio stream, or saying a video has more than one.
- Showing or exporting any video.
- Taking the audio out of the video on load (the fallback above).
- Chapters embedded in a video file (milestone 4), though the spike's stand-ins carry them for later.
- A real YouTube download. The stand-ins are built the way yt-dlp builds its files. The first real download that misbehaves is a bug.

## Further Notes

- The native ffmpeg 8.1 measurements, the method, and the stand-ins the spike builds are in [analysis.md](analysis.md).
- The v1 bar and its method are in v1's spike ticket, `.scratch/audio-splitter/issues/12-spike-decode-and-split-the-mp3-and-opus-samples.md`.
- Opus from WebM carries the same start burst v1 found in `.opus`, from the same pre-skip. What v1 accepted for `.opus` applies.
- The finish pass updates the README's "What it does", the architecture doc's probe and export description, and adds the CHANGELOG line.
