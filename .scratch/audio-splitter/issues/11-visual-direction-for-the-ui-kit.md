# Visual direction for the UI kit

Type: prototype
Status: open
Blocked by: 05

## Question

[Code layout](05-code-layout.md) puts a `shared/ui` kit in place from day one (`Button`, `IconButton`, `Slider`, `TextField`, `Panel`, `ProgressBar`, each Reka UI plus Tailwind 4). What does it look like, so that no milestone has to invent the look mid-build?

Run with `impeccable`, starting from the wireframe in `docs/screens/2.png`, and decide:

- The visual direction: colour (including the split marker and the gap/threshold highlight the canvas widgets draw), type, spacing, radius, light and dark.
- The tokens as a Tailwind `@theme` block for `src/app/styles/`, and `DESIGN.md` at the repo root.
- The variants and states of each kit component (the three `Button` variants, focus, disabled, hover).

The prototype is throwaway: it is deleted once the tokens and `DESIGN.md` are recorded.
