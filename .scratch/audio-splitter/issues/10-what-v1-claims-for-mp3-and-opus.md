# What v1 claims for .mp3 and .opus

Type: grilling
Status: open

## Question

The spike verified the whole path on `.m4a` only ([Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md)). `.mp3` and `.opus` rest on documentation alone, and [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md) flags one risk for each: input seeking in Opus can start up to about 1 s early, and the last MP3 track can get a start offset that is about 93 ms wrong. Decoding Opus in the published core was never run, and its 64 KB stack is known to break Opus encoding.

Decide what v1 accepts:

- `.m4a` only until a real sample of each other format has been checked; or
- all three, with `.mp3` and `.opus` marked as untested; or
- all three, with a check against a real file added as an early step of the build milestones.

Also decide whether the file input filters by extension, what the app says about a format it was not tested with, and who provides a real `.mp3` or `.opus` sample, and when, if one is needed.
