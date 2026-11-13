# Spike: decode and split the .mp3 and .opus samples

Type: task
Status: open
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

Resolved when the measurements are recorded under `## Answer` with a pass or fail per format, and the spike code is deleted. A format that fails leaves v1 and goes to the map's Out of scope, unless the fix is a change to the ffmpeg command line only.
