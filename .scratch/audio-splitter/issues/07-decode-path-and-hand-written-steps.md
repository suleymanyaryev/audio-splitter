# Decode path and hand-written steps

Type: grilling
Status: open
Blocked by: 04, 06

## Question

Given the options in [Decoding a long file for analysis](04-decoding-a-long-file-for-analysis.md) and the measurements from [Spike: decode and split a real file](06-spike-decode-and-split-a-real-file.md), how does the source file become analysis samples, and which steps does the user get to see as hand-written code?

Decide:

- The decode path.
- Whether downmixing to mono and downsampling are hand-written (slower, but the concepts of the draft's Milestone 2 stay visible) or delegated to ffmpeg flags.
- The analysis sample rate.
- What the worker keeps and what it sends to the page: raw analysis samples, waveform peaks, the loudness curve, or all three.
- What can be recomputed without decoding again when the user moves the silence threshold or the minimum gap length.
