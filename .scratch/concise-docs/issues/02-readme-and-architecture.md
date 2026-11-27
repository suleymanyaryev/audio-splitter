# 02: README and architecture describe the app as it is

**What to build:** README.md reads as the released app for people, and docs/architecture.md holds the structure and nothing else. See the spec's "README.md and architecture.md".

**Blocked by:** 01 (the doc contract)

**Status:** resolved

- [x] README "What it does" is one line per step, without feature detail.
- [x] README has no section saying v2 is still to be planned, nor a "Not in v1" list of things 2.x shipped.
- [x] README's concept-note list names each note in a phrase, and has one line per note in `docs/concepts/`.
- [x] architecture.md covers the layers, the stores and how they connect, the ffmpeg session, and the main flows with their statuses.
- [x] Each flow in architecture.md has one diagram.
- [x] The player section says who owns playing and gives its statuses and states, without tuned durations or edge cases.
- [x] The theme and the core download are a few lines each, with links to their ADR or code.
- [x] The store table's cells are phrases.
- [x] Matches and the edit ledger are each named in one line as modules inside the split store.
- [x] The wording says "Find duplicates", not "search", and the stores intro no longer calls the theme an exception among the stores.
- [x] The rule against late async results (a result for an older press is dropped) is still stated once, in architecture.md or in `store-wiring`. Ticket 03 depends on which.
- [x] Every file, function, store and status either doc names exists in `src/`.
- [x] README is near 700 words and architecture.md near 1,100.

## Comments

- **Late-result rule.** It is now stated in architecture.md "The stores" ("A late result is dropped"). Ticket 03 cuts `store-wiring`'s copy down to a pointer there.
- **One diagram per flow.** Each flow keeps its state diagram, because the statuses are what architecture.md holds. The load and Find duplicates sequence diagrams went, and each was replaced by a sentence. The audition's and the stretch's state diagrams became one, for the one status they share.
- **README "Not supported".** This replaces "Not in v1". It lists only what is still unsupported: CUE sheets, snapping to the quietest point, re-encoded or sample-accurate cuts, other browsers, and keeping splits across a reload. The link to the v1 map's out-of-scope list went, because that list is out of date (it names the adaptive threshold and crossfades).
- **Sizes.** README is 770 words and architecture.md about 1,190 with the mermaid text, close to the ~700 and ~1,100 targets.
