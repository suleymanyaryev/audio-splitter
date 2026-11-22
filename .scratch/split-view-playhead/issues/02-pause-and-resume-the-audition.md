# 02: Pause and resume the audition

**What to build:** In the Split view, Space and the play button pause the audition and resume it from the same point. After it has played to its end, the next press starts it from the top. The playhead is always drawn: at the audition's start before the first play, where it was paused, and back at the start after the end (spec: Solution, user stories 1–6, 28–30, 39–42, 48).

- The audition gets a paused state beside idle, loading and playing. A pause keeps the decoded WAV, so resuming sets the place in it and plays at once, with no decode.
- The audition's extent is the selected split ± 4 s, held to the file's start and end, worked out from the split each time.
- The playhead position the view draws is never empty while a split is selected: the sound while playing, else the resting place, else the extent's start.
- The play button reads "Play across split" when idle or paused, "Pause" while playing (pause icon), and "Stop" while the clip decodes (stop icon). A press while decoding takes it back.
- Moving the split, selecting another or deselecting still ends the audition here. Ticket 05 changes what a move does.
- A view switch, the export, and playing a range or track still stop the audition. Failures still say "Couldn't play this split".

**Blocked by:** 01 (Prefactor: shared player core).

**Status:** ready-for-agent

- [ ] Space while playing pauses; Space again resumes from the same time without a new decode
- [ ] After the audition plays to its end, the playhead is at its start and Space plays from there
- [ ] A press while the clip decodes takes it back, and a clip arriving afterwards never starts sound
- [ ] The playhead is drawn before the first play, while paused and after the end
- [ ] The play button shows the three labels and icons above
- [ ] Audition store spec and review page spec cover the above
- [ ] The shortcuts dialog's Split view Space row reads "Play or pause the audition"
- [ ] `docs/architecture.md`'s player section gives the audition's states; `CHANGELOG.md` has the line under Unreleased
