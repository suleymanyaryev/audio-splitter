# Handoff: concise-docs

Where the work stopped, for the next agent. The base before this feature was `0f977c0`. The plan is `spec.md`, and the tickets are in `issues/`.

## State

| Ticket | Status | Commit |
| --- | --- | --- |
| 01 The doc contract | resolved | `5fd75ad` |
| 02 README and architecture | resolved | `16b31e0` |
| 03 The six skills | resolved | `ff42c23` |
| 04 Concept notes 01 to 08 | resolved | `d615607` |
| 05 Concept notes 09 to 15 | resolved | `c45b11d` |
| 06 The glossary | resolved | `b72e3c9` |
| 07 DESIGN.md | resolved | this file's commit |
| 08 The impeccable sidecar | **ready-for-agent**, unblocked | — |

Each resolved ticket's `## Comments` holds its decisions and its check output.

## How the tickets were run

- `/implement` can't be invoked through the Skill tool (`disable-model-invocation`), so its `SKILL.md` was followed by hand. That file is five lines: tdd where possible, typecheck and tests, code-review, commit. It has no Risk tiers, and no ticket has a Risk line.
- Per ticket: edit (the heavy rewrites in a subagent, briefed with pointers to the spec and the ticket), then a read-only audit by a second subagent against the ticket's checkboxes and the old text, then the fixes it found. The Task and Checkpoint tiers ran wherever `src/` changed. Then boxes ticked, `**Status:** resolved` set and one commit made.
- Code-review, its grouped fixes (as separate `fix` commits) and the Final tier run once, on ticket 08: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`. No ticket has a "Final tier passes" box, so add one to ticket 08 and tick it when the Final tier passes.
- The status lines are bold (`**Status:** resolved`), so the check is `grep -H '^\*\*Status:' .scratch/concise-docs/issues/*`.

## For ticket 07 (DESIGN.md)

- The heavy rewrite goes to a subagent (spec "Delivery"), then an independent audit, as for tickets 04 and 05.
- These cite DESIGN.md, so whatever they rely on must survive:
  - `src/widgets/source-waveform/ui/SourceWaveform.vue` cites DESIGN.md for the range overlay (ink at about 10 %, 1 px edges).
  - `.agents/skills/canvas-view/SKILL.md` points at "DESIGN.md's canvas drawing rules".
  - AGENTS.md says to read DESIGN.md before touching a kit component.
  - DESIGN.md links `docs/architecture.md#the-theme`, which exists.
- Find every code comment that cites a DESIGN.md bullet (`grep -rn "DESIGN.md" src`) and re-point it at a Named Rule or the doc.
- The doc-sync rule that the token block tracks `main.css` is already gone (ticket 01), so the token block can become a pointer.

## For ticket 08 (the impeccable sidecar)

- Regenerate `.impeccable/design.json` with the `impeccable` skill's document flow, never by hand. Any question the flow asks goes to the user.
- Then do the final-ticket steps above.

## Open issues

- **Word targets missed, with every concept and rule kept.** AGENTS.md 964 (~700), the six skills 3,330 (~2,400), notes 01–08 7,273 (~6,400), notes 09–15 9,264 (~8,400), GLOSSARY.md 1,300 (~1,050). The reasons are in each ticket's Comments; the user may want to set the targets again.
- **History wording left in a comment.** `src/entities/split/config/confidence-bands.ts` still says "The planned ear check on `sample-crossfade.mp3` was dropped". The spec puts rewriting comments beyond their citations out of scope.
