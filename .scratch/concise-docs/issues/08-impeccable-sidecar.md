# 08: The impeccable sidecar matches DESIGN.md

**What to build:** `.impeccable/design.json` is regenerated from the trimmed DESIGN.md through the `impeccable` skill's document flow, so the impeccable tools read the same design the doc states.

**Blocked by:** 07 (DESIGN.md is the design system only)

**Status:** ready-for-agent

- [ ] The sidecar was produced by the impeccable document flow, not edited by hand.
- [ ] Its `narrative` block (north star, rules, dos, don'ts) matches the trimmed DESIGN.md.
- [ ] Its tokens match the main stylesheet.
- [ ] If the regeneration rewrote DESIGN.md, the rewrite still meets every criterion of ticket 07. Otherwise it is reverted.
- [ ] Any question the flow asks goes to the user.
