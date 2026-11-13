# MP3 playback

Type: grilling
Status: resolved
Blocked by: 12, 14

## Question

[Spike: decode and split the .mp3 and .opus samples](12-spike-decode-and-split-the-mp3-and-opus-samples.md) measured Chrome's `<audio>` seeking a VBR MP3 2 to 10 s off, which meets the reopening condition in [Playback for auditioning a split](14-playback-for-auditioning-a-split.md). How does "Play across split" play an MP3, and which of the spike's command-line findings does the plan adopt?

## Answer

Resolved 2026-11-13 by grilling; the user accepted every recommendation and, after listening, passed `.opus`.

- **Playback goes through ffmpeg for every format.** Each press of "Play across split" (or Space on the split handle) runs one ffmpeg call that decodes the 8 s around the split (4 s either side, with the 1 s pre-roll below) to a small WAV, and plays that blob in the hidden `<audio>` element. The playhead and stop rules of ticket 14 stay. One code path, exact for all three formats. The wait after a press is under 0.1 s for `.m4a` and `.opus` and up to about 1 s near the end of a long MP3. The call counts toward the 20-call reload budget. Its command shape lives beside `decode-slice.ts` and `cut-track.ts` in `entities/source-file/api/`.
- **1 s pre-roll on every slice decode**: `-ss S-1 -i input -ss 1 -t 60` (the first slice without it). Sliced and one-pass loudness curves become identical, which also makes tests deterministic. About 2 % more decode time. Amends [Decode path and hand-written steps](07-decode-path-and-hand-written-steps.md).
- **Faster cut for `.mp3` and `.opus`**: `-ss START-2 -i input -ss 2 -t LENGTH -c copy` (rough input seek, then exact output seek; `-t`, never `-to`). Same cut positions as before, MP3 byte-identical; Opus cuts drop from up to 1.3 s to about 0.1 s. `.m4a` keeps its command. Amends [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md).
- **Slow decode of long MP3 files is accepted for v1.** ffmpeg seeks an MP3 by reading from the start, so decode time grows with the square of the length (inferred about 100 s for 3 h). The progress bar shows it, it happens once per file, and the 60 s slice stays one constant for all formats. Longer MP3 slices are measured only if the user's own 3 h MP3 proves too slow, in the decode milestone.
- **`.opus` passes.** The user heard nothing at the six flagged starts, so all three supported formats are in v1.
