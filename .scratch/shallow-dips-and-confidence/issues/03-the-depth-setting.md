# 03: The depth setting

**What to build:** a depth slider beside the silence threshold and the minimum gap length, starting at 15 dB. Moving it shows what Find splits would add, with a small mark on the loudness curve at each dip no gap covers, and changes no split. The depth is saved with the default settings.

**Blocked by:** 02.

**Status:** ready-for-agent

Spec: user stories 14 to 19 and 22; Implementation Decisions "The split store" (depth setting, default settings) and "Loudness-curve widget" (settings row, dip marks).

- [ ] The slider runs from 3 to 30 dB in tenths, after the minimum gap length; its limits live with the other two settings'.
- [ ] Moving any of the three settings updates the button's count and the dip marks, and changes no split, name or selection.
- [ ] The default settings store the depth in a version 2 shape. A version 1 entry is still read, with the depth at 15 dB. A saved depth outside the range or off the 0.1 grid is ignored like the other settings.
- [ ] Saving and resetting the default settings include the depth.
- [ ] Store specs: the preview count changes with the depth; a version 1 entry gives 15 dB; a saved depth is used by the next source file. The loudness settings spec covers the slider.
- [ ] In the browser: lowering the depth on f16 adds the in-track dips the analysis lists, raising it removes them, and no split moves until the press.
- [ ] `CHANGELOG.md` gains its line under Unreleased.
