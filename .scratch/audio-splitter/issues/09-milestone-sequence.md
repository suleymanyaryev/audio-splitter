# Milestone sequence

Type: grilling
Status: resolved
Blocked by: 05, 07, 08, 10, 11, 12, 13, 14, 15, 16, 18, 19

## Question

With the decode path, export path and code layout locked, what is the milestone sequence that replaces the draft in `docs/audio-splitter-milestones.md`?

For each milestone decide: the one concept it teaches, the concept note it adds to `docs/concepts/`, the visible result the user can try in the browser, and what is deliberately left for a later milestone. Constraints from the map: one milestone per session, concept before code, a stop for confirmation after each, export of real files last (the CUE sheet is out of scope).

Resolving this ticket writes the destination: the rewritten milestones document. Any item still under "Not yet specified" on the map must be ticketed and resolved, or ruled out of scope, before this ticket is taken.

From [Code layout](05-code-layout.md): the day-one setup (Tailwind 4, Reka UI, the `shared/ui` kit styled per [Visual direction for the UI kit](11-visual-direction-for-the-ui-kit.md), `eslint-plugin-boundaries`, `prettier-plugin-tailwindcss`, removing `vue-router`, and the "Code layout" section in `AGENTS.md`) teaches no audio concept. Decide whether it is a "milestone 0" with no concept note, or folded into the first milestone.

## Answer

Resolved 2026-11-13 by grilling; the user accepted every recommendation. The result is the rewritten [docs/audio-splitter-milestones.md](../../../docs/audio-splitter-milestones.md), which this answer only gists.

- **Milestone 0, "Setup and UI kit"**, is its own milestone with no concept note: router removal, FSD folders, Tailwind 4 and tokens, the whole `shared/ui` kit including the `Dialog`'s look, the two lint plugins, a refreshed `.impeccable/design.json`, and the "Code layout" section in `AGENTS.md`.
- **The spine**:
  - M1 Sound is numbers: a short file decoded in one call, PCM, downmix and min/max peaks.
  - M2 Long files: 60 s slices with pre-roll, progress, Cancel and failure. It opens by watching M1's code fail on the 1 h sample.
  - M3 Loudness: RMS, dB and the curve panel.
  - M4 Gaps become splits: gap finding, the relative default calibrated with the user on all three samples, the Sliders, and a read-only track list and strip.
  - M5 Editing splits: the zoom view, move, add, delete, rename and the confirm dialog.
  - M6 Auditioning: the ffmpeg WAV clip and the playhead.
  - M7 Export: stream-copy cuts, the folder, filenames, tags, and the e2e specs.
- **Seams** if a milestone outgrows one session: 5a (zoom, selection, move) / 5b (add, delete, rename, edited state); 7a (`.m4a` export) / 7b (`.mp3` and `.opus` commands, e2e specs).
- **Testing**: the synthetic fixtures are made in M1; the Playwright specs are written in M7.
- **M2's done-bar**: 3 h files in all three formats (sample1 ×3, local), with decode times recorded in its note.
- **Session ritual**: read, explain, write `docs/concepts/NN-<slug>.md`, Stop 1, build with specs, show in browser, Stop 2, commit on `milestone/NN-<slug>` and merge. M0 has only Stop 2.
- **The document links to tickets rather than restating them.** It replaces the draft entirely (its Milestone 6, hysteresis, confidence score, zero-crossing snapping, CUE sheet, in-app worker and open questions are gone) and ends with "Not in v1".
