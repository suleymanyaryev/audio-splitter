# 04: Next to Silence layout and states

**What to build:** the screens get Next to Silence's room and rhythm, and every control behaves the same way. 32 px page margins, 24 px gutters and a 56 px header; small corners; the split's time as the one large 32 px figure; consistent hover, focus, active and disabled states; and a selected split lit in rust in the whole-file view, the track list and the strip at once. Covers the load screen, the review screen and the dialogs. Build it through the `impeccable` skill against the direction contract and the chosen sketch (`.impeccable/mocks/decision/assigned.html`).

**Blocked by:** 03

**Status:** resolved

Spec: `.scratch/ui-polish/spec.md` (stories 19–23, 31–40; Implementation Decisions, "Issue 2")

- [x] Radii 3 px on controls and 4 px on panels; 32 px page margins, 24 px gutters, 16 px panel padding, a 56 px header; the 4 px base unit stays.
- [x] The split's time in the Split view is one 32 px figure, from a new text-size token.
- [x] Only pressable things are slate: Play is the zoom panel's one filled control, and "Export to folder…" is the strongest button on the screen.
- [x] The track strip: slate blocks on the sea-mist ground with a rust rule at each split.
- [x] Selecting a split shows rust in the whole-file view, the track list's row and the strip's split item at once.
- [x] Colour transitions of about 120 ms on controls and on selection, off under `prefers-reduced-motion`.
- [x] Hover, focus, active and disabled look the same on every kit component; nothing below 12 px; the focus ring visible on every ground and surface in both themes.
- [x] Canvas drawing and layout inside a canvas unchanged.
- [x] Every existing spec stays green; a spec checking a class this changes is updated to the new class, not loosened.
- [x] Checked by hand in Chrome (`playwright-cli` skill) with a sample loaded, in both themes: the load screen, the review screen in all three views, the dialogs, and Tab through every control.
- [x] `DESIGN.md`'s layout, shapes, motion and components sections describe the result; CHANGELOG: the Changed line from 03 widened to cover the layout, or a second line.

## Comments

- DECIDED by the user, applied here: tabular figures are dropped. Albert Sans has no `tnum`, so figures are proportional. `spec.md` (story 30 and the Albert Sans line), `DESIGN.md` and the CHANGELOG line now say so, the no-op `font-variant-numeric: tabular-nums` is gone from `body`, and a spec pins that the CSS entry sets none. Nothing else relied on tabular numerals: the canvases draw text with `CANVAS_FONT` and measure it with `measureText`, and no spec checks a column of digits. `.impeccable/surfaces/src-pages-review.md` and `.impeccable/design.json` still say "tabular figures"; the first is the direction contract and the second is regenerated in 06.
- The split's time is the 32 px figure only in the Split view with a split selected (`UiPanel`'s new `display` prop, `text-display`). The Track and Range titles and the "No split selected" messages stay Headline, in a row held at `min-h-9` so a view switch moves nothing. The ticket names only the Split view; a range title at 32 px would not fit beside its controls.
- Selection in the track list: the selected split row shows its number in the same rust chip as the whole-file view (the number cell was empty before), so the three places match. Its `bg-land/50` tint stays.
- The strip's split items carry a 2 px rust rule at rest (a pseudo-element); hover, focus and selection still fill the whole 8 px item.
- Pressed state added to every kit control (`enabled:active:`), as DESIGN.md's States paragraph now says. The colour easing is one `tint-transition` utility (120 ms, colour, background and border only, none under reduced motion); the focus ring is left out so it appears at once.
- The panel padding stays 16 px (the ticket), not the sketch's 20 px.
- By hand (Chrome, `samples/sample1.m4a` from the main checkout, 1 h 01 min, 34 tracks, on a scratchpad dev server on port 5199): the load screen and the review screen in light and dark; the Split view with a selected split (rust in the whole-file chip, the track list chip and the strip item), the Track view, the Range view; the shortcuts dialog (dark) and the export name dialog (light). Measured: header 56 px, margins 32 px, gutters 24 px, panel radius 4 px, control radius 3 px, transition 0.12 s and 0 s under emulated reduced motion, smallest text 12 px. Tab went through every control on the review screen in both themes with a 2 px ring in the ink of its ground; the strip's split items and blocks take their own focus look. The discard dialog was not opened by hand; it shares `UiDialog`'s frame with the others.
- The page's vertical margin is 24 px (top and bottom), as in the sketch; the 32 px margins are the sides. The slider thumb has no fill to change, so its states are the size on hover, the ring on focus and the grabbing cursor while pressed. Danger's pressed look equals its hover (already filled rust).
- GLOSSARY candidate: none. ADR candidate: none.
