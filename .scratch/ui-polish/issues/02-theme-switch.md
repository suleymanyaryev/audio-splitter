# 02: Theme switch

**What to build:** a System / Light / Dark switch in the header on the load screen and the review screen. Picking a choice applies it at once, every canvas redraws, and the choice survives a reload with no flash. On Light or Dark an OS change leaves the app alone; on System it follows the OS live. This is the user's first stop.

**Blocked by:** 01

**Status:** resolved

Spec: `.scratch/ui-polish/spec.md` (stories 1–8, 11, 14; Implementation Decisions, "Issue 1")

- [x] The segmented control gains an inverse variant for the header band and an optional icon per option, with the option's label as its tooltip and accessible name.
- [x] The header shows the switch (monitor, sun, moon) on both screens, before "Local only · nothing is uploaded", bound to the theme module's choice.
- [x] Specs: the segmented control's inverse variant, icons, tooltips and accessible names; App showing the switch on both screens and choosing an option setting the theme module's choice.
- [x] An e2e spec: Dark saved under a light OS is dark before the app mounts; on System an emulated OS change applies live; on Light it does not; the choice survives a reload. `pnpm test:e2e` runs in Final.
- [x] Checked by hand in Chrome (`playwright-cli` skill) with a sample loaded: each choice, a reload in each, and an OS change on System, with every canvas redrawn; keyboard use (Tab, arrows) and the tooltips.
- [x] `DESIGN.md` drops "Don't add a theme toggle or a `data-theme` switch" and "follow the system theme through `prefers-color-scheme` alone", and describes the switch; CHANGELOG line under Unreleased (Added).

## Comments

- GLOSSARY candidate: none. ADR candidate: none.
- `UiTooltip` gained a `disabled` prop: every option of the segmented control sits in a tooltip, and only icon options show it.
- The chosen look of a segmented option now keys on `aria-checked`, not Reka's `data-state`. The tooltip's trigger overwrites `data-state` (closed, open) on the same button, so the old key would never match. This also applies to the zoom panel's text options; the default variant's look is unchanged.
- `DESIGN.md` had already lost its "Don't add a theme toggle" lines in 01, so this ticket added the switch, the inverse variant and the icon option instead.
- The e2e spec blocks `src/app/main.ts` to prove the inline head script alone themes the page; it runs on the dev server only. The Playwright config reuses a server on port 5173, which another worktree was holding, so it was run once with a temporary config on its own port (scratchpad, removed); `pnpm test:e2e` still runs in Final.
- Arrow keys on the switch were checked with a held key (Reka checks the radio on a focus that arrives while an arrow is down); a zero-length key press in a script does not select.
- By-hand checks used `e2e/fixtures/bursts.m4a` (30 s, three tracks) in Chrome, light OS: each choice applied and redrew all three canvases; reload kept Dark, Light and System; on System an OS change redrew, on Light it did not; Tab, arrows and tooltips (below the band) worked.
- The e2e spec checks the attribute and `color-scheme` before mount, not the ground colour: the dev server loads the CSS from `main.ts`, which the test blocks. The spec's Testing Decisions mention the ground colour; a production-build variant could read it.
