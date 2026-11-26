# 01: The element module

**What to build:** the `<audio>` plumbing leaves the player store for an internal module in the split-zoom widget's api segment, beside the saved volume and play speed. The module:

- makes the element on first use;
- holds a clip and releases it, with `removeAttribute('src')` + `load()`;
- plays (a promise) and pauses;
- reads and sets the position in file seconds, clamped to the clip;
- applies volume and play speed (`preservesPitch`, `defaultPlaybackRate`, `playbackRate`) on creation, on every hold and on change;
- reports `ended` and `timeupdate`.

The press number, the window ahead, the hand-over and the resting places stay in the store. Nothing changes for the user, for any widget or for the store's interface.

**Blocked by:** None (can start immediately).

Status: resolved

Spec: `.scratch/one-player-interface-that-knows-what-is-on-show/spec.md` (Implementation Decisions: the element module; Testing Decisions).

- [x] The module exists, as a plain module with one implementation, not an injected seam.
- [x] The store no longer touches `src`, `currentTime`, `volume`, `muted`, `playbackRate` or the element's listeners directly. The hand-over (pointing the element at the window ahead) goes through the module too.
- [x] `offsetOf` and `soundPosition` live in the module as its position in file seconds.
- [x] The module knows nothing about presses, windows or stretches.
- [x] A new spec for the module covers position mapping and clamping (including a `currentTime` a hair past the end), volume and speed applied on creation and on every hold, and the release.
- [x] The store spec passes unchanged, with its `HTMLMediaElement.prototype` spies.
- [x] Every view and page spec passes unchanged.
- [x] No changelog line.

## Comments

- The goal's frontier rule names `Status: ready-for-agent`; these tickets carry `Status: open`, the repo tracker's pickable state (`docs/agents/issue-tracker.md`), so `open` was read as ready.
- The module is `api/audio-element.ts`, a factory (`createAudioElement({ ended, timeUpdate })`) so each pinia store owns its element. It also owns the object URLs: `prepare(clip)` makes a `ReadyClip` for the window ahead, `discard` lets one go, `handOver(next, seconds)` points the element at it. The store keeps the press number, windows and resting places.
