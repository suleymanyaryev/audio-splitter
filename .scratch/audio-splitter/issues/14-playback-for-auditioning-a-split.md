# Playback for auditioning a split

Type: grilling
Status: resolved
Blocked by: 13

## Question

How does the user hear a split before trusting it? [Review-screen interaction design](13-review-screen-interaction-design.md) places "Play across split" as the zoom view's primary button but not its behaviour.

Decide: what plays the audio (a plain `<audio>` element on the source file, or something decoded), what stretch "Play across split" plays and how it stops, whether playback shows a playhead, whether anything else starts playback (track-list rows, keyboard), and what happens if seeking in a variable-bitrate `.mp3` proves inaccurate (measured in [Spike: decode and split the .mp3 and .opus samples](12-spike-decode-and-split-the-mp3-and-opus-samples.md), item 8).

## Answer

Resolved 2026-11-13 by grilling; the user accepted every recommendation.

- **What plays.** One hidden `<audio>` element on a blob URL of the source file (`URL.createObjectURL(file)`). Chrome plays AAC in `.m4a`, MP3 and Opus in Ogg natively, so playback needs no ffmpeg call and holds nothing extra in memory.
- **"Play across split".** Plays from 4 s before the selected split to 4 s after it, then stops by itself. While it plays the button reads "Stop" and stops it. Moving the split, deselecting it or selecting another stops playback.
- **Playhead.** A 1 px `ink` line moves across the zoom view while audio plays, driven by `currentTime` on each animation frame.
- **Other ways to start.** Space on the focused split handle in the zoom view does the same as the button. Nothing else plays: no play buttons on track-list rows, no whole-file transport.
- **If MP3 seeking is inaccurate.** [Spike: decode and split the .mp3 and .opus samples](12-spike-decode-and-split-the-mp3-and-opus-samples.md) item 8 measures `<audio>` seek accuracy per format. If VBR MP3 lands more than 50 ms off, playback for `.mp3` reopens as its own ticket; `.m4a` and `.opus` keep this design either way.

## Comments

### 2026-11-13: amended by MP3 playback

The spike measured VBR MP3 seeking 2 to 10 s off, so the condition above was met. [MP3 playback](19-mp3-playback.md) replaces "a blob URL of the source file": every format now plays an 8 s WAV clip decoded by ffmpeg around the split, in the same hidden `<audio>` element. Everything else here stands.
