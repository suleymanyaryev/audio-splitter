# 07: DESIGN.md is the design system only

**What to build:** DESIGN.md holds the design rules an agent needs to touch a kit component or draw on a canvas, plus the north star a designer reads, and no screen behaviour. See the spec's "DESIGN.md and the impeccable sidecar".

**Blocked by:** 01 (the doc contract)

**Status:** ready-for-agent

- [ ] Kept:
  - the north star and colour world
  - colour roles and the Named Rules
  - typography, layout, elevation and shapes as rules
  - the kit's rules per component (states, focus, sizes, variants, the label, hint and reason contract)
  - the canvas drawing rules (tokens, sizes, layering, dash pattern, handles, Land Rule, Graphite Rule)
- [ ] Gone:
  - the per-view button inventory
  - the volume, play-speed and loudness title rows
  - the track-list table
  - the shortcut list
  - the name dialog
  - interaction prose in the canvas rules
  - the Track view prose
- [ ] Gone: class-string dumps, contrast ratios that repeat the contrast spec, and Do's and Don'ts that restate the Named Rules.
- [ ] The token block is replaced by a pointer to the main stylesheet.
- [ ] The frontmatter stays.
- [ ] The section the `canvas-view` skill points at ("Canvas drawing rules") keeps its name.
- [ ] The icon list matches the code: no ChevronsLeft or ChevronsRight; Volume2, VolumeX, Eye, EyeOff and X are listed.
- [ ] Nothing says the Split view has no back button.
- [ ] Every code comment that cites a DESIGN.md bullet cites a Named Rule or the doc instead. Before the cut, grep `src/` for "DESIGN.md" to find them all.
- [ ] Every component, file, class and prop it names exists in `src/`.
- [ ] `pnpm lint:changed` and Checkpoint before the commit, both green.
- [ ] DESIGN.md is near 3,800 words.
