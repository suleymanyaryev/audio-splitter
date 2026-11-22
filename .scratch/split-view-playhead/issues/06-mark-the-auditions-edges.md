# 06: Mark the audition's edges

**What to build:** The Split view's canvas shows where the audition's 8 s starts and ends inside the 20 s zoom window, so a click outside it is no surprise. The mark must not read as the ground drawn before 0 s and past the file's end, which means "outside the file" (spec: user stories 15–16).

- The look (a light tint outside the 8 s, or short ticks at the frame, or another option) is chosen against DESIGN.md, using its tokens, and works in the light and dark themes. Read DESIGN.md before choosing.
- Where the audition is held at a file's edge, the mark follows the held edge.
- The mark sits under the split lines and the playhead, and the frame stays the outermost line.
- Moving the split moves the mark with it.

**Blocked by:** 02 (Pause and resume the audition), for the audition's extent.

**Status:** ready-for-agent

- [ ] The audition's edges are visible in the Split view, distinct from the outside-file ground
- [ ] The mark follows the split when it moves, and the file's edges when the audition is held at them
- [ ] Checked in the browser in both themes (playwright-cli), with a screenshot shown to the user for confirmation
- [ ] DESIGN.md records the new mark if it adds a token or a rule
- [ ] Split view spec covers where the edges are drawn, if the existing canvas cases allow it; `CHANGELOG.md` line updated
