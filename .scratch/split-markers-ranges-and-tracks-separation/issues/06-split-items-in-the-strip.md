# 06: Split items in the strip

**What to build:** the strip shows a narrow split item between every two track blocks. Clicking one selects that split and shows the zoom view centred on it, as selecting a split does today. A split item is drawn as land at rest and vermilion when hovered, focused or selected (DESIGN.md: one vermilion marks splits). A very short track keeps a block wide enough to click.

**Blocked by:** 03 (Select a track and see it in the Track view)

**Status:** resolved

Spec: `.scratch/split-markers-ranges-and-tracks-separation/spec.md` (stories 32–35)

- [ ] Each split item is an 8 px button with an accessible name naming the split and its time, marked current when its split is selected.
- [ ] The block layout reserves the split items' widths, gives every block a minimum clickable width and shares the rest in proportion.
- [ ] Specs: the block layout (prior art: its existing spec); the strip's split items, their names, current state and the select-split call.
- [ ] DESIGN.md gains the strip's split item; CHANGELOG line under Unreleased.
- [ ] Checked by hand in Chrome with the `playwright-cli` skill, light and dark, against DESIGN.md.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or spec decision each part rests on.
