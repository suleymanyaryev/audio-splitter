# 03: Next to Silence colours and font

**What to build:** the whole app takes the Next to Silence palette and Albert Sans, in both themes: fog ground, graphite audio, sea-mist gaps, rust splits, a slate header band with a sea-mist mark, and slate filled buttons. Layout, spacing and radii stay as they are; that is 04. Build it through the `impeccable` skill, code-led, against the direction contract in `.impeccable/surfaces/src-pages-review.md`.

**Blocked by:** 01

**Status:** resolved

Spec: `.scratch/ui-polish/spec.md` (stories 16–18, 21, 24–30; Implementation Decisions, "Issue 2")

- [x] The `--color-*` tokens take the spec's mapping in both themes; the header band's tokens gain dark values.
- [x] New tokens: a slate fill for pressable things (primary button, Play, Export) with its on-colour in both themes; the header's mark becomes sea-mist instead of the rust dot.
- [x] Albert Sans bundled locally (variable, Latin subset, licence beside it) replaces Manrope and its files; the canvas font constant is renamed to follow, and the redraw on font load stays.
- [x] Canvas drawing changes only through tokens and the font constant.
- [x] The contrast spec passes on the new values, with the new pairs added (the slate fill and its text, the header mark on the band).
- [x] Every existing spec stays green; a spec checking a class this changes is updated to the new class, not loosened.
- [x] Checked by hand in Chrome (`playwright-cli` skill) with a sample loaded, in both themes: the load screen, the review screen in all three views, the dialogs.
- [x] `DESIGN.md`'s overview, colours (with measured contrast) and typography describe Next to Silence; CHANGELOG line under Unreleased (Changed).

## Comments

- QUESTION for the user: Albert Sans has no tabular figures. The Latin file from `@fontsource-variable/albert-sans` 5.3.0 has no `tnum` feature (only `ccmp`, `frac`, `liga`, `locl`), and nor does the static build; a `1` is 306 units wide and a `0` 629. Spec story 30 ("tabular figures everywhere") and "Albert Sans ... with tabular figures" cannot be met by the font, so times, gaps and counts are proportional and shift as they change. `font-variant-numeric: tabular-nums` stays on `body` and does nothing for now; `DESIGN.md` says so. Options: accept it, pick another face with `tnum`, or give the digits a tabular fallback face.
- Dark theme: a track block (`#4C6670`) on the strip's deep-sea ground (`#24403D`) is 1.83:1. The mapping is the user's confirmed spike, so it is kept; `DESIGN.md` notes it. The names and the split items between blocks tell them apart.
- New token names: the header band is `band`, `on-band`, `on-band-muted`, `band-edge` (was `vinyl`...); the slate fill is `fill`, `fill-hover`, `on-fill`; the mark is `mark` (sea-mist in both themes). Dark values: fill `#8FB0BA` (hover `#A8C5CE`, text `#101618`), a light slate-blue so the primary button reads on a dark surface (7.16:1).
- Only the primary button, Play and Export take the slate fill. Slider range and thumb, progress fill and the tooltip stay ink; the tooltip, thumb and progress are not pressable fills, and the slider is left for 04 to judge.
- The canvas font constant `CANVAS_FONT` was already font-neutral in name, so only its value (`700 12px "Albert Sans"`) and the comments that named Manrope changed.
- `DESIGN.md`'s Layout, Shapes (6 and 8 px radii) and spacing still describe today's values; they are ticket 04's. The `design.json` regeneration is 06's.
- Open after review: the favicon, `theme-color` and manifest colours still show the old look; they are ticket 05's. The concept note `03-loudness.md` said "groove grey" and now says graphite.
- GLOSSARY candidate: none. ADR candidate: none.
- By hand (Chrome, `samples/sample1.m4a`, 1 h 01 min, 34 tracks): the load screen, the review screen in the Split, Track and Range views, the shortcuts dialog and the discard dialog, each in light and dark; the focus ring on Export in dark; the Albert Sans face loads and the canvas labels use it.
