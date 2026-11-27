# 03: The six skills hold only live, reusable rules

**What to build:** `canvas-view`, `ffmpeg-session`, `store-wiring`, `finish-feature`, `github-issues` and `github-prs` point only at code that exists, carry no one-feature lines, and say each rule once across themselves and AGENTS.md. See the spec's "The skills".

**Blocked by:** 01 (the doc contract), 02 (README and architecture)

**Status:** resolved

- [x] `canvas-view`: the replace-guard drag line is gone (`set` no longer returns false), and so are the one-feature lines (the failure line, the title-row key rule, the stretch-view keys) and constants the code owns.
- [x] `store-wiring` points at the split store's discard guard instead of the deleted replace-guard file, and names `split.open` instead of `split.detect`.
- [x] `store-wiring`'s Web Worker bullet is the rule plus one reference.
- [x] `store-wiring` drops a rule only when architecture.md, as left by ticket 02, states it.
- [x] `ffmpeg-session`: the worker-entry rule and the analysis-builder sentence are gone.
- [x] `github-issues` and `github-prs` drop what repeats AGENTS.md and are otherwise unchanged.
- [x] `finish-feature` is left as ticket 01 made it, apart from removing duplication with the other five.
- [x] Every skill line reads as the rule, why it holds, and one example file.
- [x] Every file and symbol the six skills name exists in `src/` or the repo.
- [x] Each skill's description still triggers on its branches.
- [x] The six together are near 2,400 words. (3,330: see Comments)

## Comments

- **Word target.** The six skills come to 3,330 words (wc), against ~2,400. finish-feature (655) grew in ticket 01, when it took over the doc rules. github-issues and github-prs (1,059) are to stay otherwise unchanged. That leaves ~690 words for canvas-view, store-wiring and ffmpeg-session together, which now hold 1,618 with every live rule written as rule, reason and one example. Keeping each live rule came first.
- **Late-result guard.** architecture.md "The stores" now states it, and store-wiring points there. store-wiring keeps two player rules that architecture.md does not hold: the player's `flush: 'sync'` watchers, and `fetchAhead`'s own token.
- **Dropped as one-feature lines.** From canvas-view: the `PlayerFailure` line, the title-row key rule and the stretch-view keys, as the spec says. They were not rewritten as general rules.
- **Constants.** The 4 px click, the 6 px hit, the 10 ms grid and "every 20 calls" became wording without the number. The code owns the number.
- **ffmpeg-session description.** It keeps "adding a worker entry": the core-preloader rule (a worker entry never fetches the core) still applies.
- **store-wiring description.** It gains triggers for long-running jobs, Web Workers and browser APIs, which its body covers.
