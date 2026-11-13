# Export delivery and filenames

Type: grilling
Status: resolved
Blocked by: 03, 06

## Question

Once the splits are reviewed, how do the tracks reach the user's disk, and what are they called?

Decide, using [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md) and the measurements from [Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md):

- Delivery: write each track into a folder the user picks (File System Access API) or build one zip download. The wireframe shows "Split into files (.zip)"; a folder avoids holding every track in memory at once.
- The filename pattern for a numbered track and for a renamed track, including zero-padding and characters that are unsafe in filenames.
- Whether export runs one ffmpeg command for all tracks or one per track, and what the user sees while it runs.
- Whether tags (title, track number) are written. The research measured the cost on `.m4a` as about 63 bytes per file and no extra time.

## Answer

Resolved 2026-11-13 by grilling. The user accepted every recommendation.

**Delivery: a folder, not a zip.** Export opens Chrome's folder picker (`showDirectoryPicker`, File System Access API) on every export, with a fixed picker `id` so Chrome reopens it where the user last chose. The app stores no folder handle. Inside the picked folder it creates a subfolder named after the source file's stem (`evening-set-vol3/`) and writes each track there as soon as ffmpeg has produced it, then frees it. Only one track is in memory at a time, and no zip dependency is needed. The zip was rejected because it holds every track in memory (about the source size, ~700 MB for 3 h), and already-compressed audio gains nothing from zipping. One browser download per track was rejected because it triggers Chrome's multiple-download prompt and scatters files. Cancelling the picker cancels the export.

**Never overwrite, never delete.** If the subfolder name is already taken, the app creates `evening-set-vol3 (2)/`, then `(3)`, and so on. A re-export after edits would otherwise leave stale files (an old `03.m4a` next to `03 Sunrise.m4a`, or a `09.m4a` from a deleted split). The user deletes old folders by hand.

**Filenames.** `<NN>.<ext>` for a numbered track and `<NN> <track name>.<ext>` for a renamed one:

- `NN` is zero-padded to the width of the track count, with at least 2 digits (`01`–`08`, `001`–`120`). The prefix keeps files in order and keeps two tracks with the same name apart.
- `<ext>` is the source file's own extension, in lower case.
- Sanitising applies to the filename and the subfolder name only: `/ \ : * ? " < > |` and control characters become `-`, leading and trailing spaces and dots are trimmed, and the name is capped at about 100 characters. A track name that is empty after this falls back to the plain number.

**One ffmpeg run per track**, with the per-format command from [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md) and the same 20-call reload budget proved in [Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md). The segment muxer and the single run with several outputs stay rejected (no per-track tags; lost priming; all tracks in memory).

**What the user sees.** An overlay locks the review screen. It shows a bar with "Track 3 of 8" (progress can only be counted per call) and a **Cancel** button that terminates the ffmpeg worker. A track appears on disk only once it is complete (a File System Access writable commits on close), so cancelling or a failure leaves only whole tracks. On a failure, export stops and names the track that failed. Either way, the overlay says how many tracks were saved and where (for example "8 tracks saved to `evening-set-vol3/`").

**Tags**, written in the same run (about 63 bytes, no extra time):

- title: the track name if the track was renamed, otherwise `<source stem> NN` (for example `evening-set-vol3 03`), so a track heard in shuffle still says where it came from. The tag keeps the name exactly as typed, unsanitised.
- track: `N/TOTAL`.
- album: the source file's stem, overriding any album tag in the source.
- The source's other tags (such as artist) are copied unchanged. The cover image is dropped by `-map 0:a:0`.

**Scope.** Every export writes all tracks. There is no per-track skip in v1; duplicates from a looped playlist are deleted from disk after export.

**Wording.** The button is "Export to folder…", not the wireframe's "Split into files (.zip)", because a split is a point in time in `GLOSSARY.md`. **Export** was added to the glossary.

**For later tickets.** The folder picker cannot be driven by Playwright without stubbing `showDirectoryPicker`; this belongs to the testing-approach fog. The CUE sheet, if kept, would naturally be written into the same export subfolder.
