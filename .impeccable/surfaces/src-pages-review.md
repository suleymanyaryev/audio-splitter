---
version: 1
slug: "src-pages-review"
primary_target: "src/pages/review"
related_targets: ["src/shared/ui"]
---

# Review screen (and the shared/ui kit)

Scope: the review screen of Audio Splitter and the `shared/ui` kit every screen uses. Mode: Operate. Built code-first.

Audience and task: the single user reviews proposed splits in a 1–3 h source file, fixes them by hand, renames tracks and exports. Daylight and evening use; the theme follows the system setting. Ruled out by the user: a studio-gear look, decoration that competes with the waveforms, dense tiny technical type.

Chosen direction: Side of an LP (the user's pick from the decision round of 2026-11-13). Composition reference: the LP-side decision sketch.

Interaction (drag, zoom window, renaming, the warning before a setting change) is settled in .scratch/audio-splitter/issues/13-review-screen-interaction-design.md.

## Direction contract

THESIS: On an LP you can see where one track ends: the textured groove bands stop and a smooth land runs between them. The screen draws a source file the same way, tracks as dense waveform bands and every gap as a flat land, so a split reads as something you can see before you read a number. It refuses the dark audio-editor with a bright blue waveform.

OWN-WORLD: Sleeve white ground and white panels by day; vinyl black ground and near-black panels by night. Ink is vinyl black (inverted at night), waveforms and track blocks in groove grey, gap lands in sheen grey, and one centre-label vermilion that only marks splits and the threshold. Manrope with tabular figures. Flat colour: no gradients, no shadows, panels separated by a hairline and the ground.

STORY: The user sees the whole file banded into tracks at a glance, sees why each split is there (the loudness curve dips under the vermilion threshold inside each land), checks one split up close, fixes it, and exports.

FIRST VIEWPORT: Vinyl-black header with a vermilion centre-label dot, the product name, the file chip, "Local only" and "New file". Full-width whole-file waveform with lands and numbered vermilion split markers and an outlined zoom window; full-width loudness curve on the same time axis with the dashed vermilion threshold and the minimum-gap slider in its header; zoom view (left, about two thirds) with the split's time as the panel's largest type and "Play across split" as the primary button; track list (right) with an inline name field per row; "Add split" in the zoom view's title row; track strip at the bottom with groove blocks separated by lands and "Export to folder…" as the strongest button. Behaviour: .scratch/audio-splitter/issues/13-review-screen-interaction-design.md.

FORM: Side of an LP, position 1 on my ordered list (IMPECCABLE'S PICK; the roll assigned position 3, Departure Timetable). seed:1810f64224c6b8e7

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
