# Load progress, cancel and failure

Type: grilling
Status: resolved
Blocked by: 07, 10

## Question

What does the load screen show and do from picking a file until the review screen opens? Facts: progress can only be counted per ffmpeg call (one probe, then one call per 60 s slice), cancelling means `terminate()` on ffmpeg's worker, every call has a timeout, and the worker is reloaded about every 20 calls ([Decode path and hand-written steps](07-decode-path-and-hand-written-steps.md)). A readable but unsupported file already gets a message naming what it is ([What v1 claims for .mp3 and .opus](10-what-v1-claims-for-mp3-and-opus.md)).

Decide: how a file is picked, what the progress shows, what Cancel does, and what the user sees when ffmpeg cannot read the file at all or fails mid-decode (including near the memory limit, a failure mode not yet seen).

## Answer

Resolved 2026-11-13 by grilling; the user accepted every recommendation.

- **Picking a file.** A "Choose file…" button (native file input) and dropping a file anywhere on the load screen; both call the same handler.
- **While decoding.** The file chip (name, then duration once the probe returns), the kit `ProgressBar` counting calls ("38 / 62 slices", the probe not counted), and a secondary "Cancel" button. No time estimate.
- **Cancel.** Terminates ffmpeg's worker and returns to the empty load screen. Nothing is kept.
- **Failure.** Any failure (ffmpeg cannot read the file, a call fails or times out, a crash near the memory limit) ends on the load screen with one message: the file's name, the step that failed ("probe" or "slice 41 of 62"), ffmpeg's last log line as the reason, and "Choose another file". No retry button, no partial review screen. A readable but unsupported file keeps its own message from [What v1 claims for .mp3 and .opus](10-what-v1-claims-for-mp3-and-opus.md).
- **No size or duration limit** up front; a file too big for memory fails into the message above.
