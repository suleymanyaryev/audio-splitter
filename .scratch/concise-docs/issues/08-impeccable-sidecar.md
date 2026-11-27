# 08: The impeccable sidecar matches DESIGN.md

**What to build:** `.impeccable/design.json` is regenerated from the trimmed DESIGN.md through the `impeccable` skill's document flow, so the impeccable tools read the same design the doc states.

**Blocked by:** 07 (DESIGN.md is the design system only)

**Status:** resolved

- [x] The sidecar was produced by the impeccable document flow, not edited by hand.
- [x] Its `narrative` block (north star, rules, dos, don'ts) matches the trimmed DESIGN.md.
- [x] Its tokens match the main stylesheet.
- [x] If the regeneration rewrote DESIGN.md, the rewrite still meets every criterion of ticket 07. Otherwise it is reverted.
- [x] Any question the flow asks goes to the user.
- [x] Final tier passes.

## Comments

- **Which path of the flow.** `document.md` Step 4b says that when only the sidecar is to be refreshed, DESIGN.md is preserved and only `.impeccable/design.json` is written. That is this ticket, so DESIGN.md was not rewritten and the flow's refresh/overwrite/merge question and its qualitative-language rounds did not apply. No question arose for the user. The launcher has no verb that writes the sidecar: in the flow the agent writes it by following Step 4b, here a subagent briefed with that step. The rewrite was then checked by script, as below.
- **Checks on the sidecar.**
  - It is valid JSON.
  - All 39 `colorMeta` canonicals equal `main.css`, and the frontmatter colours equal `main.css` too.
  - Every narrative string (the North Star, the overview paragraphs, the 11 rule bodies, the one Do and the one Don't) occurs verbatim in DESIGN.md.
  - Every `refersTo` names a frontmatter component.
- **`keyCharacteristics` is `[]`.** Ticket 07 cut DESIGN.md's "Key Characteristics" list, because its bullets restated the Named Rules (Do's and Don'ts that restate a Named Rule were cut on the same ground). Ticket 07's Comments do not record this, so it is recorded here. The flow maps the field from that list only, so it is left empty rather than invented.
- **The frontmatter's `components` block stays.** The spec trims it only if the sidecar does not need it, and every sidecar component with a `refersTo` points into it.
- **Components.**
  - There are 13: four buttons, the icon button, the tooltip, the text field, the slider, the segmented control, the panel, the header band, the track strip and the dialog.
  - The segmented control has no `refersTo`, since the frontmatter has no key for it. The tooltip is new.
  - The snippets follow the kit as it is: hover and pressed rules gated on enabled, disabled at 40%, and the selected left-out block's dashed ink border.
- **Code-review (step 5)** ran once over the whole feature, from `0f977c0` with this sidecar uncommitted, on two axes.
  - **Fixed, in two `fix` commits:**
    - Five test names and the spectrogram readout's comment cited a note by number or for a fact it no longer states.
    - DESIGN.md said a selected left-out block's border turns solid; the code keeps it dashed, in ink.
    - Four skill lines lacked their reason or example file.
    - ffmpeg-session pointed at numbers it no longer quotes.
    - The sidecar had dropped the segmented control.
  - **Left, with the reason:**
    - History wording and ticket numbers in code comments (`cut-track.ts`, `confidence-bands.ts`, `SplitZoom.vue`, `player.ts`): the spec rules out rewriting comments beyond their citations.
    - AGENTS.md's Changelog line: it is the one pointer line the spec asked for.
    - README's "Gaps become splits" node: it names note 04.
    - The sidecar's `album.flac`: FLAC is a supported input.
    - Notes 13 and 15 keep their measured tables and counts: they are the worked examples that anchor each idea, and ticket 05 kept them on that ground.
  - **Open for the user:** note 15's worked example is measured on one of the user's playlists, not on a file in `samples/` as the concept-note contract asks. Replacing it would mean a new measurement and a new lesson example, which is the user's call.
- **Final tier** (after the last code change, `98223d1`): `pnpm verify` → pass (typecheck, 137 files / 2,634 tests, build); `pnpm lint` → pass; `pnpm knip` → pass; `pnpm depcruise` → pass (326 modules, no violations). The review fix to `src` ran the Task tier first: the five touched specs and `src/widgets/split-zoom` → pass (38 files, 658 tests); `pnpm lint:changed` → pass.
