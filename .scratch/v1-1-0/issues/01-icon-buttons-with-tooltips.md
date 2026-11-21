# 01: Icon buttons with tooltips

**What to build:** every button in the zoom panel's title row, in all three views, becomes an icon button whose tooltip says what it does and, where there is one, its key ("Add split (Enter)", "Play (Space)", "Delete split (Delete)"). The tooltip opens on hover and on keyboard focus. Play's icon and tooltip follow its state (Play, Pause, Stop; "Play across split" and "Stop" in the Split view). The Track list's merge and trash buttons show their tooltips ("Remove track N", "Delete split at …"). The `Split | Track | Range` control, "Export to folder…" and "New file" keep their words.

**Blocked by:** None (can start immediately)

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 44–51)

- [ ] The kit gains a tooltip in DESIGN.md's look, built on Reka's tooltip, opening on hover and on keyboard focus and closing on Escape and blur.
- [ ] The kit's icon button always shows its label as a tooltip and takes an optional key hint, shown after the label; its accessible name stays the label alone.
- [ ] Split view title row: Add split, Delete split (Delete), Play across split / Stop (Space), as icon buttons with today's enabled states.
- [ ] Track view and Range view title rows: Add split (Range only, Enter), Back to track/range start (Home), Play / Pause / Stop (Space), as icon buttons with today's enabled states.
- [ ] The Track list's merge and trash buttons show their existing labels as tooltips.
- [ ] Specs: the tooltip on hover and focus; the icon button's key hint and accessible name; the review page's title-row buttons per view, their names, tooltips and enabled states, Play's state; the Track list's tooltips. Existing specs that find buttons by name still pass.
- [ ] DESIGN.md gains the tooltip; CHANGELOG line under Unreleased (Changed).
