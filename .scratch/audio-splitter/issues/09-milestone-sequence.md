# Milestone sequence

Type: grilling
Status: open
Blocked by: 05, 07, 08, 10, 11, 12, 13, 14, 15, 16, 18, 19

## Question

With the decode path, export path and code layout locked, what is the milestone sequence that replaces the draft in `docs/audio-splitter-milestones.md`?

For each milestone decide: the one concept it teaches, the concept note it adds to `docs/concepts/`, the visible result the user can try in the browser, and what is deliberately left for a later milestone. Constraints from the map: one milestone per session, concept before code, a stop for confirmation after each, export of real files last (the CUE sheet is out of scope).

Resolving this ticket writes the destination: the rewritten milestones document. Any item still under "Not yet specified" on the map must be ticketed and resolved, or ruled out of scope, before this ticket is taken.

From [Code layout](05-code-layout.md): the day-one setup (Tailwind 4, Reka UI, the `shared/ui` kit styled per [Visual direction for the UI kit](11-visual-direction-for-the-ui-kit.md), `eslint-plugin-boundaries`, `prettier-plugin-tailwindcss`, removing `vue-router`, and the "Code layout" section in `AGENTS.md`) teaches no audio concept. Decide whether it is a "milestone 0" with no concept note, or folded into the first milestone.
