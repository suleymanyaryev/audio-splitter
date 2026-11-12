# Export delivery and filenames

Type: grilling
Status: open
Blocked by: 03, 06

## Question

Once the splits are reviewed, how do the tracks reach the user's disk, and what are they called?

Decide, using [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md) and the measurements from [Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md):

- Delivery: write each track into a folder the user picks (File System Access API) or build one zip download. The wireframe shows "Split into files (.zip)"; a folder avoids holding every track in memory at once.
- The filename pattern for a numbered track and for a renamed track, including zero-padding and characters that are unsafe in filenames.
- Whether export runs one ffmpeg command for all tracks or one per track, and what the user sees while it runs.
- Whether tags (title, track number) are written. The research measured the cost on `.m4a` as about 63 bytes per file and no extra time.
