# 02: Theme switch

**What to build:** a System / Light / Dark switch in the header on the load screen and the review screen. Picking a choice applies it at once, every canvas redraws, and the choice survives a reload with no flash. On Light or Dark an OS change leaves the app alone; on System it follows the OS live. This is the user's first stop.

**Blocked by:** 01

**Status:** ready-for-agent

Spec: `.scratch/ui-polish/spec.md` (stories 1–8, 11, 14; Implementation Decisions, "Issue 1")

- [ ] The segmented control gains an inverse variant for the header band and an optional icon per option, with the option's label as its tooltip and accessible name.
- [ ] The header shows the switch (monitor, sun, moon) on both screens, before "Local only · nothing is uploaded", bound to the theme module's choice.
- [ ] Specs: the segmented control's inverse variant, icons, tooltips and accessible names; App showing the switch on both screens and choosing an option setting the theme module's choice.
- [ ] An e2e spec: Dark saved under a light OS is dark before the app mounts; on System an emulated OS change applies live; on Light it does not; the choice survives a reload. `pnpm test:e2e` runs in Final.
- [ ] Checked by hand in Chrome (`playwright-cli` skill) with a sample loaded: each choice, a reload in each, and an OS change on System, with every canvas redrawn; keyboard use (Tab, arrows) and the tooltips.
- [ ] `DESIGN.md` drops "Don't add a theme toggle or a `data-theme` switch" and "follow the system theme through `prefers-color-scheme` alone", and describes the switch; CHANGELOG line under Unreleased (Added).
