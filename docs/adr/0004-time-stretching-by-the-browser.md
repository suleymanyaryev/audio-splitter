# Play speed is time-stretched by the browser, not by hand-written code

Play speed keeps the pitch, so the sound has to be time-stretched rather than resampled. The app's learnable signal maths is hand-written (AGENTS.md), but this one is done by the browser: the one `<audio>` element's `playbackRate`, with `preservesPitch` on. The idea is learned in [concept note 10](../concepts/10-speed-without-pitch.md), which time-stretches a sample with native ffmpeg and explains WSOLA, the method behind both ffmpeg's `atempo` and Chrome's stretch. A hand-written stretch would mean leaving the `<audio>` element, and with it the play, pause, seek and window hand-over that the player is built on.

## Considered Options

- **A hand-written WSOLA in an AudioWorklet, fed from the decoded WAV.** Rejected: it replaces the player rather than adding to it, and is several milestones of work for one setting. The concept note teaches the method without it.

## Consequences

- Loading a new source resets an element's `playbackRate` to its `defaultPlaybackRate`, so the player sets both. Otherwise the speed would fall back to 1.0 on every clip and at every 10 min window hand-over.
- The quality of the stretch at 0.5× and 2.0× is Chrome's, and not something the app can tune.
