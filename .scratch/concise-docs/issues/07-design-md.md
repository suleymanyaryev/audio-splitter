# 07: DESIGN.md is the design system only

**What to build:** DESIGN.md holds the design rules an agent needs to touch a kit component or draw on a canvas, plus the north star a designer reads, and no screen behaviour. See the spec's "DESIGN.md and the impeccable sidecar".

**Blocked by:** 01 (the doc contract)

**Status:** resolved

- [x] Kept:
  - the north star and colour world
  - colour roles and the Named Rules
  - typography, layout, elevation and shapes as rules
  - the kit's rules per component (states, focus, sizes, variants, the label, hint and reason contract)
  - the canvas drawing rules (tokens, sizes, layering, dash pattern, handles, Land Rule, Graphite Rule)
- [x] Gone:
  - the per-view button inventory
  - the volume, play-speed and loudness title rows
  - the track-list table
  - the shortcut list
  - the name dialog
  - interaction prose in the canvas rules
  - the Track view prose
- [x] Gone: class-string dumps, contrast ratios that repeat the contrast spec, and Do's and Don'ts that restate the Named Rules.
- [x] The token block is replaced by a pointer to the main stylesheet.
- [x] The frontmatter stays.
- [x] The section the `canvas-view` skill points at ("Canvas drawing rules") keeps its name.
- [x] The icon list matches the code: no ChevronsLeft or ChevronsRight; Volume2, VolumeX, Eye, EyeOff and X are listed.
- [x] Nothing says the Split view has no back button.
- [x] Every code comment that cites a DESIGN.md bullet cites a Named Rule or the doc instead. Before the cut, grep `src/` for "DESIGN.md" to find them all.
- [x] Every component, file, class and prop it names exists in `src/`.
- [x] `pnpm lint:changed` and Checkpoint before the commit, both green.
- [x] DESIGN.md is near 3,800 words. (4,429: see Comments)

## Comments

- **Process.** A subagent did the rewrite from the spec and this ticket, and a second subagent audited it read-only against the old text. The audit passed every box but size. It found one wrong claim (the 128px slider minimum also covered the compact slider) and nine small kit and canvas rules that had been dropped: the inverse button pressed, the panel's 24px gap and `muted` metadata, the thumb's grab cursor, block padding by width, the compact field's 176px and label weight, segmented padding, contrast-lane diamonds only while contrast is on, the range overlay and zoom-window scope. All were restored, and the audit's ~265 words of safe cuts were applied.
- **Word target.** DESIGN.md is 4,429 words (wc), against ~3,800. The frontmatter is a fixed 492 of those. The Canvas drawing rules hold about 1,000, and every size and colour in them is a fact a `src` comment attributes to DESIGN.md. As in tickets 01 to 06, keeping every rule came first.
- **Comment citations.** Six comments that named a section or bullet now cite the doc: "Confidence mark", the "Selected" bullet, "DESIGN.md's strip", "DESIGN.md's dashed line", "DESIGN.md's handle" and DESIGN.md's "−35 dB". The other comments of the form "DESIGN.md: <fact>" cite the doc itself and were left, after checking that each fact is still stated. `contrast.spec.ts` now says it checks the pairs it lists against the rule DESIGN.md states, because DESIGN.md keeps the 4.5:1 / 3:1 rule but no longer lists the pairs.
- **Merged or moved rules.** The real minus sign is one Typography rule, which backs the readout comments. The pending-split look became a canvas rule, and the Track-view title wrap a Headline rule. The Don't "fetch no asset from the network" was wrong, since the ffmpeg core is downloaded; it became "the font is never fetched". Two Do's and Don'ts remain, the ones no Named Rule says.
- **Checks.** `pnpm lint:changed` → pass; `pnpm typecheck` → pass; `pnpm vitest run src/app/styles` → pass (57 tests); `pnpm test:changed` → pass (12 files, 611 tests).
