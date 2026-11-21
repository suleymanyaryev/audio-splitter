# 01: Theme plumbing

**What to build:** the theme moves from the OS media query to a `data-theme` attribute on `<html>` that a new theme module owns. The module holds the choice (`system`, `light`, `dark`), saves it, follows the OS only on `system`, and is applied before first paint. Every canvas redraws on the theme in effect. There is no switch yet: the app looks and behaves as today, and a choice set by hand in `localStorage` already takes effect on reload. This is the prefactor that makes 02 and 03 easy.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Spec: `.scratch/ui-polish/spec.md` (stories 9–15; Implementation Decisions, "Issue 1")

- [ ] A theme module in the shared layer holds the choice and the theme in effect, both reactive. It saves the choice to `localStorage` with every read and write wrapped (blocked or garbage storage gives `system`), listens to the OS only on `system`, and sets `data-theme` and `color-scheme` on `<html>`.
- [ ] The CSS entry has one dark block, keyed on `[data-theme="dark"]`; nothing reads `prefers-color-scheme` from CSS or the kit.
- [ ] An inline script in the page head applies the saved choice before first paint, with the same key and fallback; the module takes over on start with no visible change.
- [ ] The canvas redraw helper redraws on a change of the theme in effect, and drops its own media-query listener.
- [ ] A Node contrast spec reads both themes' `--color-*` values from the CSS entry and asserts the pairs in `DESIGN.md`'s contrast table (4.5:1 text, 3:1 non-text). If a pair fails on today's palette, stop and report it rather than loosen the threshold.
- [ ] Specs: the theme module (default, each choice, saved and read back, an OS change on `system` and not otherwise, blocked and garbage storage); the canvas redraw on a theme change and its clean-up on unmount.
- [ ] Checked by hand in Chrome (`playwright-cli` skill) with a sample loaded: the app is unchanged under a light and a dark OS, an OS change still redraws every canvas, and a hand-set `dark` choice applies on reload with no flash.
- [ ] `DESIGN.md`'s token block and canvas rule describe the attribute-keyed dark block and the theme in effect; `docs/architecture.md` gains the theme module. No CHANGELOG line (nothing the user can do changes yet).
