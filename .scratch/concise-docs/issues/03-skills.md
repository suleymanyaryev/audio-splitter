# 03: The six skills hold only live, reusable rules

**What to build:** `canvas-view`, `ffmpeg-session`, `store-wiring`, `finish-feature`, `github-issues` and `github-prs` point only at code that exists, carry no one-feature lines, and say each rule once across themselves and AGENTS.md. See the spec's "The skills".

**Blocked by:** 01 (the doc contract), 02 (README and architecture)

**Status:** ready-for-agent

- [ ] `canvas-view`: the replace-guard drag line is gone (`set` no longer returns false), and so are the one-feature lines (the failure line, the title-row key rule, the stretch-view keys) and constants the code owns.
- [ ] `store-wiring` points at the split store's discard guard instead of the deleted replace-guard file, and names `split.open` instead of `split.detect`.
- [ ] `store-wiring`'s Web Worker bullet is the rule plus one reference.
- [ ] `store-wiring` drops a rule only when architecture.md, as left by ticket 02, states it.
- [ ] `ffmpeg-session`: the worker-entry rule and the analysis-builder sentence are gone.
- [ ] `github-issues` and `github-prs` drop what repeats AGENTS.md and are otherwise unchanged.
- [ ] `finish-feature` is left as ticket 01 made it, apart from removing duplication with the other five.
- [ ] Every skill line reads as the rule, why it holds, and one example file.
- [ ] Every file and symbol the six skills name exists in `src/` or the repo.
- [ ] Each skill's description still triggers on its branches.
- [ ] The six together are near 2,400 words.
