# What v1 claims for .mp3 and .opus

Type: grilling
Status: resolved

## Question

The spike verified the whole path on `.m4a` only ([Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md)). `.mp3` and `.opus` rest on documentation alone, and [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md) flags one risk for each: input seeking in Opus can start up to about 1 s early, and the last MP3 track can get a start offset that is about 93 ms wrong. Decoding Opus in the published core was never run, and its 64 KB stack is known to break Opus encoding.

Decide what v1 accepts:

- `.m4a` only until a real sample of each other format has been checked; or
- all three, with `.mp3` and `.opus` marked as untested; or
- all three, with a check against a real file added as an early step of the build milestones.

Also decide whether the file input filters by extension, what the app says about a format it was not tested with, and who provides a real `.mp3` or `.opus` sample, and when, if one is needed.

## Answer

Resolved 2026-11-13 by grilling. The user accepted every recommendation.

**Samples now exist.** The user added `sample1.mp3` and `sample1.opus` next to `sample1.m4a` in the main checkout's `samples/` (git-ignored, so a worktree does not see them). Both are conversions of `sample1.m4a` made with a current ffmpeg (`Lavc62.28`), same content and duration (1 h 01 min 26 s): the `.mp3` is variable bitrate around 156 kb/s, 44.1 kHz stereo, with a LAME header; the `.opus` is Opus in Ogg, 48 kHz stereo, about 100 kb/s. Real source files come mostly from YouTube through tools like yt-dlp, but not only from there.

**v1 claims three supported formats, and only these container and codec pairs:** AAC in `.m4a`, MP3 in `.mp3`, Opus in Ogg (`.opus`). Opus in `.webm` (yt-dlp's usual Opus download) is out of v1: a fourth container with its own export command and its own risks; the user converts such a file before loading it.

**What "supported" means.** A format is supported once it passes the bar `.m4a` passed in [Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md): the sliced decode with the pinned core runs to the end in Chrome and the loudness curve shows the gaps; each cut lands within one frame of the requested time; each cut file reports the right duration; and the start of each cut track is clean. There is no "untested" tier: a format that has not passed is not offered.

**The check is its own ticket.** [Spike: decode and split the .mp3 and .opus samples](12-spike-decode-and-split-the-mp3-and-opus-samples.md) is an AFK task the agent runs alone; it blocks [Milestone sequence](09-milestone-sequence.md). The user asked the agent to check the files, so "listen to the first second" becomes a measurement, and the user listens only to tracks the measurement flags.

**If a format fails the check,** it leaves v1 and is recorded under the map's Out of scope, unless the fix is a change to the ffmpeg command line only. A second decode path (such as Chrome's `AudioDecoder` for Opus) is not added for one format; the user can convert to `.m4a` instead.

**The probe identifies the format, not the extension.** The file input's `accept` list names the three extensions as a convenience only. The probe call that already opens the decode path ([Decode path and hand-written steps](07-decode-path-and-hand-written-steps.md)) also reads the container and codec, and that pair decides: it selects the per-format export command (Opus writes its tags on the stream) and rejects anything else. An extension can lie (an `.m4a` holding ALAC, an `.ogg` holding Vorbis), so a rejected file gets a plain message naming what the file is and what is supported, for example "This file is Vorbis in Ogg; the splitter supports AAC in .m4a, MP3 and Opus in .opus."

**The MP3 last-track quirk is accepted with no workaround.** A source with a LAME header gives its last cut track a wrong encoder delay, so players skip about 93 ms at its start. Every split sits in the middle of a gap of at least about 1 s, so the skipped stretch is silence. Turning off the Xing header would break the duration of a variable-bitrate MP3, which is worse. The task ticket confirms the skipped stretch is silent on the sample.

**Wording.** **Supported format** was added to `GLOSSARY.md`.
