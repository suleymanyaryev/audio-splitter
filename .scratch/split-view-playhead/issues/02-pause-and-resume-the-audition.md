# 02: Pause and resume the audition

**What to build:** In the Split view, Space and the play button pause the audition and resume it from the same point. After it has played to its end, the next press starts it from the top. The playhead is always drawn: at the audition's start before the first play, where it was paused, and back at the start after the end (spec: Solution, user stories 1–6, 28–30, 39–42, 48).

- The audition gets a paused state beside idle, loading and playing. A pause keeps the decoded WAV, so resuming sets the place in it and plays at once, with no decode.
- The audition's extent is the selected split ± 4 s, held to the file's start and end, worked out from the split each time.
- The playhead position the view draws is never empty while a split is selected: the sound while playing, else the resting place, else the extent's start.
- The play button reads "Play across split" when idle or paused, "Pause" while playing (pause icon), and "Stop" while the clip decodes (stop icon). A press while decoding takes it back.
- Moving the split, selecting another or deselecting still ends the audition here. Ticket 05 changes what a move does.
- A view switch, the export, and playing a range or track still stop the audition. Failures still say "Couldn't play this split".

**Blocked by:** 01 (Prefactor: shared player core).

**Status:** resolved

- [x] Space while playing pauses; Space again resumes from the same time without a new decode
- [x] After the audition plays to its end, the playhead is at its start and Space plays from there
- [x] A press while the clip decodes takes it back, and a clip arriving afterwards never starts sound
- [x] The playhead is drawn before the first play, while paused and after the end
- [x] The play button shows the three labels and icons above
- [x] Audition store spec and review page spec cover the above
- [x] The shortcuts dialog's Split view Space row reads "Play or pause the audition"
- [x] `docs/architecture.md`'s player section gives the audition's states; `CHANGELOG.md` has the line under Unreleased

## Comments

- Readings taken: a move of the same split ends the audition (as the ticket says) but keeps the resting place, held into the moved extent; only another split, none, deleting or playing to the end clears it. A view switch, the export and a stretch that takes over stop the audition, keep its place and release its WAV, so the next press decodes again. Ticket 05 reworks what a move does.
- The decode request still reaches 4 s past the split even where the file ends sooner; only the playhead's extent is held to the file.
- `isActive` now means loading or playing (not paused). The "Back to audition start" button is left to the later tickets.
- Left for later: a redraw watch on the resting place (tickets 03/04 move it while paused), and a drawn-canvas check for "after the end" (covered in the store spec).
- Checks: `pnpm test` -> pass (1703, before the last doc-only edits); `pnpm test:changed`, `pnpm lint:changed`, `pnpm typecheck` -> pass; after the doc fixes `pnpm vitest run src/widgets/split-zoom src/pages/review -> pass` (480) and `pnpm lint:changed -> pass`. Code-review fixes: doc wording about what a pause keeps, and the loading edge in the state diagram.
