---
version: 1
slug: "src-pages-review"
primary_target: "src/pages/review"
related_targets: ["src/shared/ui","src/pages/load"]
---

# Review screen, load screen and the shared/ui kit

Scope: the review screen of Audio Splitter, the load screen, the header band, the dialogs and the `shared/ui` kit every screen uses. Mode: Operate. Built code-first. Canvas drawing code changes only through the `--color-*` tokens.

Audience and task: the single user reviews proposed splits in a 1–3 h source file, fixes them by hand, renames tracks and exports. Daylight and evening use. Light and dark themes both ship, with a System/Light/Dark switch in the header (GitHub #1). Ruled out by the user: a studio-gear look, a coloured or blue "dark audio editor" waveform, gradients or shadows over the waveforms, decoration that competes with the waveforms, text below 12 px.

Chosen direction: Next to Silence (the user's pick from the decision round of 2026-11-22, a full redesign replacing Side of an LP). Composition reference: the chosen decision sketch, `.impeccable/mocks/decision/assigned.html`.

Interaction (drag, zoom window, renaming, the warning before a setting change) is settled in .scratch/audio-splitter/issues/13-review-screen-interaction-design.md.

## Direction contract

THESIS: Silence is the material. As on an ECM sleeve, quiet is the field the music sits on: every gap is drawn as one sea-mist field in every view, so the file reads as music laid on quiet and a split shows before its number. It refuses the dark audio editor with a blue waveform and the grey screen with one accent.

OWN-WORLD: Fog ground #E3E8E6, sleeve surface #FAFBFA, graphite ink #1B2326 and audio #2C3639, slate header band #26343A, slate track blocks #3B4F57, sea-mist gaps #BCD2CD, rust #B83E0B only for splits, threshold, danger and invalid. Night: ground #101618, surface #182023, deep-sea gaps #24403D, rust #F28A4E. Albert Sans, bundled, proportional figures (the face has no `tnum`). Radii 3 px controls, 4 px panels; flat, hairlines. Raise (Warm Consumer App): only pressable things are slate. Raise (Terminal Yellow): the split's time is the one 32 px figure. Raise (Datamatics): no third grey.

STORY: The user sees the whole file banded into graphite tracks on sea-mist gaps, sees each gap dip under the rust threshold, checks one split up close, fixes it, and exports.

FIRST VIEWPORT: 56 px slate header (mist mark, name, file chip, theme switch, "Local only · nothing is uploaded", ?, New file). 32 px margins, 24 px gutters. Full-width whole file, then loudness with threshold and min-gap sliders. Zoom view at 8/12, its split time at 32 px, slate Play the only filled control; track list at 4/12. Strip: slate blocks on mist, a rust rule at each split, "Export to folder…" the strongest button; it starts inside a 900 px window and its end sits just below the fold (the page is about 980 px tall with a 34-track file). Signature interaction: selecting a split lights the same rust in the whole file, the list and the strip at once; motion is colour only, about 120 ms.

FORM: Next to Silence (ECM sleeve world), position 4 on my ordered list (the roll's assignment; my top-ranked, Chart Datum, was shown as the pick). seed:0449f7c74468ccff

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
