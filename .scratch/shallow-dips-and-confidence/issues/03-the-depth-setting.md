# 03: The depth setting

**What to build:** a depth slider beside the silence threshold and the minimum gap length, starting at 15 dB. Moving it shows what Find splits would add, with a small mark on the loudness curve at each dip no gap covers, and changes no split. The depth is saved with the default settings.

**Blocked by:** 02.

**Status:** resolved

Spec: user stories 14 to 19 and 22; Implementation Decisions "The split store" (depth setting, default settings) and "Loudness-curve widget" (settings row, dip marks).

- [x] The slider runs from 3 to 30 dB in tenths, after the minimum gap length; its limits live with the other two settings'.
- [x] Moving any of the three settings updates the button's count and the dip marks, and changes no split, name or selection.
- [x] The default settings store the depth in a version 2 shape. A version 1 entry is still read, with the depth at 15 dB. A saved depth outside the range or off the 0.1 grid is ignored like the other settings.
- [x] Saving and resetting the default settings include the depth.
- [x] Store specs: the preview count changes with the depth; a version 1 entry gives 15 dB; a saved depth is used by the next source file. The loudness settings spec covers the slider.
- [x] In the browser: lowering the depth on f16 adds the in-track dips the analysis lists, raising it removes them, and no split moves until the press.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- **In the browser** (dev server, Chrome driven with `playwright-cli`): on f16 `what it feels like to be alone (playlist)` the button reads "Find splits (33)" at 15 dB, (69) at 3 dB and (29) at 30 dB, and back to (33) at 15 dB; the file stays one track throughout, so no split moves until the press. The dip marks (diamonds on the curve) go from 4 at 15 dB to dozens at 3 dB. On `sample-crossfade.m4a`: (25) at 15 dB and (158) at 3 dB, the 158 matching the analysis's dips of 3 dB or more.
- **`setDepth` holds the value to 3 to 30 dB** (the slider's range), as a slider's setting is held to it; it does not round to a tenth, as the other two setters do not.
- **A proposal has a `kind`** (`'gap'` or `'dip'`), which the curve uses to mark only the dips. Ticket 05 reads the same proposals for the confidence.
- **A version 1 entry is read with the depth at 15 dB; a version 2 entry with a missing, off-grid or out-of-range depth is ignored whole**, as an off-grid length is. A version 1 entry's other values are checked as before.
- **The mark is an 8 px `ink` diamond ringed in `surface`, over the split lines** (never rust: DESIGN.md's Rust Rule). DESIGN.md's loudness-curve line and the title-row paragraph are updated; `ink` is the colour the pending splits and marks already use, but in a shape (a small diamond on the curve) that none of them has.
- **Code review:** not run on this ticket (see ticket 02): the goal puts it on the last ticket. Checkpoint tier run: `pnpm test:changed` (1413 passed), `pnpm lint:changed`, `pnpm typecheck`, and the whole `pnpm vitest run` (2323 passed).
