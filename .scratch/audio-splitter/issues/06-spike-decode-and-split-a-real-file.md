# Spike: decode and split a real file

Type: prototype
Status: open
Blocked by: 01, 02, 03, 04

## Question

Do the two risky parts work on the user's real sample files in Chrome: getting analysis samples out of a 1–3 h source file without exhausting memory, and cutting it into tracks without re-encoding?

Build one rough, throwaway page (no tests, no comments, no design) that:

- Loads one of the user's sample files (location recorded in [Add sample files](01-add-sample-files.md)) through a file input and runs it through the setup recommended in [ffmpeg.wasm with long files in Chrome](02-ffmpeg-wasm-with-long-files.md).
- Decodes it by the top-ranked path from [Decoding a long file for analysis](04-decoding-a-long-file-for-analysis.md) and reports time taken and peak memory.
- Cuts it at three or four hand-typed timestamps using the command shape from [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md) and saves the tracks.

Two facts from the resolved tickets shape the spike:

- The only real sample is `samples/sample1.m4a`, so the spike checks `.m4a` only. `.mp3` and `.opus` stay unverified.
- The ffmpeg.wasm core fails after repeated calls on one worker. Decoding in slices plus one call per track goes past that budget, so the spike must run the restart loop (a fresh worker about every 20 calls, a timeout on every call) across a full decode and a full export, and report whether it holds.

The user then listens to the cut tracks in their usual player and checks start, end, duration and seeking. Record every measurement the research tickets asked for. Gap detection is not part of the spike: it is low-risk and is learned slowly in the milestones.

Resolved when the measurements are recorded and the spike code is deleted.
