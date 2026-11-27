# 02: README and architecture describe the app as it is

**What to build:** README.md reads as the released app for people, and docs/architecture.md holds the structure and nothing else. See the spec's "README.md and architecture.md".

**Blocked by:** 01 (the doc contract)

**Status:** ready-for-agent

- [ ] README "What it does" is one line per step, without feature detail.
- [ ] README has no section saying v2 is still to be planned, nor a "Not in v1" list of things 2.x shipped.
- [ ] README's concept-note list names each note in a phrase, and has one line per note in `docs/concepts/`.
- [ ] architecture.md covers the layers, the stores and how they connect, the ffmpeg session, and the main flows with their statuses.
- [ ] Each flow in architecture.md has one diagram.
- [ ] The player section says who owns playing and gives its statuses and states, without tuned durations or edge cases.
- [ ] The theme and the core download are a few lines each, with links to their ADR or code.
- [ ] The store table's cells are phrases.
- [ ] Matches and the edit ledger are each named in one line as modules inside the split store.
- [ ] The wording says "Find duplicates", not "search", and the stores intro no longer calls the theme an exception among the stores.
- [ ] The rule against late async results (a result for an older press is dropped) is still stated once, in architecture.md or in `store-wiring`. Ticket 03 depends on which.
- [ ] Every file, function, store and status either doc names exists in `src/`.
- [ ] README is near 700 words and architecture.md near 1,100.
