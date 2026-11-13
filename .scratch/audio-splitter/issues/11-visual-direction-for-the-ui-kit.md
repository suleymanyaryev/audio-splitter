# Visual direction for the UI kit

Type: prototype
Status: resolved
Blocked by: 05

## Question

[Code layout](05-code-layout.md) puts a `shared/ui` kit in place from day one (`Button`, `IconButton`, `Slider`, `TextField`, `Panel`, `ProgressBar`, each Reka UI plus Tailwind 4). What does it look like, so that no milestone has to invent the look mid-build?

Run with `impeccable`, starting from the wireframe in `docs/screens/2.png`, and decide:

- The visual direction: colour (including the split marker and the gap/threshold highlight the canvas widgets draw), type, spacing, radius, light and dark.
- The tokens as a Tailwind `@theme` block for `src/app/styles/`, and `DESIGN.md` at the repo root.
- The variants and states of each kit component (the three `Button` variants, focus, disabled, hover).

The prototype is throwaway: it is deleted once the tokens and `DESIGN.md` are recorded.

## Answer

Resolved 2026-11-13 with the user, through `impeccable` (decision page, then a throwaway prototype, a fresh-context finish review, and a documenter pass).

**Direction: "Side of an LP".** On a record you can see where a track ends: groove bands stop and a smooth land runs between them. The screen draws the source file the same way. Tracks are dense waveform bands, and every gap is a flat land with no waveform, so a split can be seen before its number is read. The user picked it on the decision page over four other cards: the roll's assigned "Departure Timetable", "Monochrome Product" (a developer-tool look), the category standard (a dark editor with a blue waveform), and five declined catalogue worlds.

**What was decided** (the detail lives in [DESIGN.md](../../../DESIGN.md); this is the gist):

- **Scene and theme.** Light and dark, following the system setting, with no toggle. By day the ground is sleeve white with white panels; at night it is vinyl black with near-black panels. The header band is vinyl black in both themes.
- **Colour.** Ink, muted text, hairline and control edge. Groove grey for the waveform and the track blocks, and sheen grey for lands (gaps). One centre-label vermilion, reserved for split markers, the silence threshold, danger and invalid states (plus the small centre-label dot in the header). Flat colour only: no gradients, no shadows. Every text pair passes WCAG AA in both themes. The split marker on a dark land is 3.69:1, above the 3:1 non-text minimum.
- **Type.** Manrope with tabular figures everywhere. Sizes 12/14/16/20 px, nothing below 12 px. Shipped as one committed variable woff2 in `src/app/styles/fonts/`, with no network fetch (user's choice).
- **Shape and spacing.** Radius 6 px on controls and 8 px on panels. Spacing steps of 4/6/8/12/16/24 px. Panels are flat frames with a 1 px hairline.
- **Tokens.** A ready-to-paste Tailwind 4 block for `src/app/styles/main.css` is in DESIGN.md's "Token block": `@theme static` with the light values, and the dark values in `@media (prefers-color-scheme: dark)`. `static` is needed because the canvases read every `--color-…` variable through `getComputedStyle` and redraw when the colour scheme changes. The machine-readable sidecar is `.impeccable/design.json`.
- **Kit.**
  - `Button`: primary, secondary, danger and inverse (inverse is for the header). Size `lg` is used only for Export, the strongest action.
  - `IconButton`.
  - `TextField`, plus an inline variant for renaming inside a track block.
  - `Slider` (Reka; focus and ARIA sit on the thumb).
  - `Panel`.
  - `ProgressBar`: determinate, with labels that count calls, such as "38 / 62 slices".
  - States: hover darkens the border to ink and tints the fill; keyboard focus is a 2 px ink outline at 2 px offset; disabled is 40% opacity; invalid gives a vermilion border, a vermilion outline and a message.
- **Icons.** `lucide-vue-next` (1.0.0, ISC, checked 2026-11-13; user's choice): 16 px, 2 px stroke. Unicode glyphs are never icons.
- **Canvas rules** (the signature):
  - A land is drawn at least 12 px wide in whole-file views, because a 2 s gap is narrower than a pixel there.
  - Split lines are 1.5 px. The selected split is 3 px, with its number in a filled vermilion chip. Split numbers sit in a band above the whole-file waveform.
  - The silence threshold is a dashed vermilion line with a drag handle. Its label sits on a plate in the panel colour.
  - The loudness curve has a 14% fill under it.
  - In the zoom view, a flat run-out line crosses the land, and a 1.5 px ink zoom-window outline matches the zoom view's frame.

**Passed on.**

- To the review-screen interaction design (still in **Not yet specified**):
  - Panel arrangement and heights.
  - Zoom window width.
  - Whether the kit needs a small (32 px) button size; the prototype used one for "New file" and "Add split".
  - The invalid state of the inline rename field.
- To the setup step in [Milestone sequence](09-milestone-sequence.md):
  - Add `lucide-vue-next` and commit the Manrope woff2.
  - Paste the token block.
  - Build the kit to DESIGN.md.

**Assets.**

- [PRODUCT.md](../../../PRODUCT.md): the product record impeccable loads in later UI sessions.
- [DESIGN.md](../../../DESIGN.md) and `.impeccable/design.json`.
- The direction contract in `.impeccable/surfaces/src-pages-review.md`.

The prototype (`.impeccable/mocks/prototype/kit.html`) was git-ignored and has been deleted. The decision-page sketches remain under the git-ignored `.impeccable/mocks/decision/`.
