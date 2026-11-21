# 03: Next to Silence colours and font

**What to build:** the whole app takes the Next to Silence palette and Albert Sans, in both themes: fog ground, graphite audio, sea-mist gaps, rust splits, a slate header band with a sea-mist mark, and slate filled buttons. Layout, spacing and radii stay as they are; that is 04. Build it through the `impeccable` skill, code-led, against the direction contract in `.impeccable/surfaces/src-pages-review.md`.

**Blocked by:** 01

**Status:** ready-for-agent

Spec: `.scratch/ui-polish/spec.md` (stories 16–18, 21, 24–30; Implementation Decisions, "Issue 2")

- [ ] The `--color-*` tokens take the spec's mapping in both themes; the header band's tokens gain dark values.
- [ ] New tokens: a slate fill for pressable things (primary button, Play, Export) with its on-colour in both themes; the header's mark becomes sea-mist instead of the rust dot.
- [ ] Albert Sans bundled locally (variable, Latin subset, licence beside it) replaces Manrope and its files; the canvas font constant is renamed to follow, and the redraw on font load stays.
- [ ] Canvas drawing changes only through tokens and the font constant.
- [ ] The contrast spec passes on the new values, with the new pairs added (the slate fill and its text, the header mark on the band).
- [ ] Every existing spec stays green; a spec checking a class this changes is updated to the new class, not loosened.
- [ ] Checked by hand in Chrome (`playwright-cli` skill) with a sample loaded, in both themes: the load screen, the review screen in all three views, the dialogs.
- [ ] `DESIGN.md`'s overview, colours (with measured contrast) and typography describe Next to Silence; CHANGELOG line under Unreleased (Changed).
