# UI polish: a theme switch and the Next to Silence look

Status: ready-for-agent

GitHub issue #1. A minor release outside the milestone sets (CHANGELOG.md's version rules: the theme switch is a new capability; nothing the export writes changes). Two parts, the switch, then the new look, built as six tickets under `issues/` (01–02 the switch, 03–06 the look). The "Issue 1" and "Issue 2" headings below name the parts. The look was chosen on 2026-11-22 in impeccable's direction round. Its contract is in `.impeccable/surfaces/src-pages-review.md`, and its sketch is `.impeccable/mocks/decision/assigned.html`. A palette-only spike on the real app confirmed the colours in both themes.

## Problem Statement

- The app follows my OS theme and I cannot override it. When my OS is dark and I want to review in light (or the other way round), I have to change the whole computer.
- The current look, "Side of an LP", bothers me in two ways:
  - The palette is grey on grey with one red. Nothing on screen has a colour of its own, and the gaps between tracks, which are what I am looking for, are only a lighter grey than the tracks.
  - The spacing is tight and flat. The panels sit close together, and the number I check most (the split's time) is the same size as everything else.

## Solution

- **A theme switch**: System, Light and Dark, in the header on both screens. The choice is remembered across a reload and applied before the page first paints, so the wrong theme never flashes. On System the app follows the OS live. Every waveform and curve follows the theme in effect, not only the OS.
- **The Next to Silence look** (ECM sleeves: silence is the material):
  - Fog ground, sleeve-white panels, graphite text and audio.
  - A slate header band, slate track blocks and slate filled buttons. Only pressable things are slate.
  - Every gap is one sea-mist field in every view, so the file reads as music laid on quiet.
  - Rust marks splits, the silence threshold, danger and invalid states, and nothing else.
  - Albert Sans replaces Manrope, with tabular figures.
  - More room: 32 px page margins, 24 px gutters, a 56 px header.
  - The split's time in the zoom panel is one large 32 px figure.
  - Selecting a split lights the same rust in the whole-file view, the track list and the strip at once.
  - At night the same world turns slate-black, with deep-sea gaps and a lighter orange rust.

## User Stories

### Theme switch

1. As a user, I want a System / Light / Dark switch in the header, so that I can pick the theme without changing my OS.
2. As a user, I want the switch on the load screen as well as the review screen, so that I can set it before loading a file.
3. As a user, I want System to be the default, so that nothing changes until I choose.
4. As a user, I want all three choices visible at once, each one click away, so that I never open a menu to change the theme.
5. As a user, I want each choice to carry an icon and a tooltip naming it, so that I know what each one does.
6. As a keyboard user, I want to reach the switch with Tab and change it with the arrow keys, so that it works like the other segmented controls.
7. As a screen-reader user, I want the switch announced as a named group of three radio options with the chosen one checked, so that I know the current setting.
8. As a user, I want my choice remembered across a reload, so that I set it once.
9. As a user, I want the chosen theme applied before the page first paints, so that a dark page never flashes white on load (or the other way round).
10. As a user on System, I want the app to follow my OS live when it switches between light and dark, so that I never reload to catch up.
11. As a user on Light or Dark, I want an OS theme change to leave the app alone, so that my choice holds.
12. As a user, I want the whole-file waveform, the loudness curve and the zoom panel's three views to redraw in the new theme the moment it changes, so that no canvas is left in the old colours.
13. As a user, I want the native parts of the page (scrollbars, text fields, the file picker button) to follow the chosen theme, so that they don't stay in the OS theme.
14. As a user whose browser blocks storage, I want the switch to still work for the session and fall back to System on reload, so that a privacy setting never breaks the app.
15. As a user, I want changing the theme to leave my splits, track names, selection and playback alone, so that I can switch mid-review.

### The look: colour

16. As a user, I want every gap drawn as the same sea-mist field in every view, so that I see where the silences are before I read anything.
17. As a user, I want audio drawn in graphite, never coloured, so that the waveform stays quiet and readable.
18. As a user, I want rust to mean a split, the silence threshold, a danger or an invalid value and nothing else, so that rust always means "look here, this is a cut".
19. As a user, I want selecting a split to light it in rust in the whole-file view, the track list and the strip at once, so that I see the same split in three places.
20. As a user, I want the track blocks in the strip to be slate on the sea-mist ground, with a rust rule at each split, so that the strip reads like the whole-file view.
21. As a user, I want filled buttons to be slate and everything else plain, so that I can tell what is pressable at a glance.
22. As a user, I want only one filled control in the zoom panel (Play), so that the panel has one obvious action.
23. As a user, I want "Export to folder…" to be the strongest button on the screen, so that the last step is easy to find.
24. As a user, I want a slate header band with a sea-mist mark, so that the app has an identity without a loud colour.
25. As a user in dark, I want the same world at night (slate-black ground, deep-sea gaps, a lighter orange rust), so that the two themes feel like one app.
26. As a user, I want every text and control to meet WCAG AA in both themes, so that I can read the screen in daylight and at night.
27. As a user, I want the split's rust line to stand out on a gap at 3:1 or better in both themes, so that a split crossing silence is never lost.
28. As a keyboard user, I want the focus ring visible on every ground and surface in both themes, so that I always know where I am.

### The look: type, spacing and shape

29. As a user, I want Albert Sans everywhere, canvas labels included, so that the app reads as one piece.
30. As a user, I want tabular figures everywhere, so that times and durations line up in columns.
31. As a user, I want the split's time in the zoom panel shown as one large 32 px figure, so that the number I check most is the easiest to read.
32. As a user, I want 32 px page margins and 24 px between panels, so that the screen has room to breathe.
33. As a user, I want a 56 px header, so that the band has the weight of a sleeve's title bar.
34. As a user, I want small, consistent corners (3 px on controls, 4 px on panels), so that the screen looks precise rather than soft.
35. As a user, I want hover, focus, active and disabled to look the same on every control, so that the kit behaves predictably.
36. As a user, I want colour changes on controls and on split selection to ease over about 120 ms, so that changes feel smooth but never slow.
37. As a user who prefers reduced motion, I want those transitions off, so that nothing moves that I didn't ask for.
38. As a user, I want the load screen in the same world (ground, panel, type, spacing), so that the first screen I see matches the rest.
39. As a user, I want the dialogs (shortcuts, confirmations, the name dialog) in the same world, so that nothing looks left over from the old look.
40. As a user, I want nothing smaller than 12 px, so that the screen stays readable.

### The look: beyond the page

41. As a user sharing the app's link, I want the link preview image to show the new look, so that it matches what people will open.
42. As a user who installed the app, I want the icon, the tab icon and the window colour to match the new look, so that the app looks like itself outside the browser tab.

## Implementation Decisions

### Issue 1: the theme switch

- **A theme module in the shared layer owns the theme.** It is the one place that knows the choice and the OS.
  - It holds the choice (`system`, `light`, `dark`) and the theme in effect (`light`, `dark`), both reactive.
  - The theme in effect is the choice, or the OS's scheme while the choice is `system`. It listens to the OS's `prefers-color-scheme` only for that.
  - Setting the choice saves it to `localStorage` and applies it at once. Each read and write is wrapped, so a blocked storage leaves `system` (the same pattern as the saved volume).
  - Applying sets a `data-theme` attribute (`light` or `dark`) on `<html>`, always to the theme in effect, never to `system`, and sets the root's `color-scheme` to match. The CSS therefore has one dark block, keyed on the attribute.
- **The dark tokens move from the media query to the attribute.** The light values stay in the theme block; the dark values override the same variables under `[data-theme="dark"]` only. Nothing in the kit or the canvases reads the media query any more.
- **A small inline script in the page head applies the saved choice before first paint.** It reads the same storage key, resolves `system` against the OS, and sets the attribute and `color-scheme`. It is plain and dependency-free, and wrapped so a blocked storage falls back to System. The theme module takes over once the app starts, from the same state, so nothing changes visibly on mount.
- **Canvases redraw on the theme in effect.** The canvas redraw helper drops its own `prefers-color-scheme` listener and redraws when the theme module's theme in effect changes. That covers the switch and the OS while on System.
- **The segmented control gains an inverse variant** for the header band, like the button and the icon button already have. It also takes an optional icon per option, with the option's label as its tooltip and accessible name.
- **The header shows the switch on both screens**, before "Local only · nothing is uploaded". The icons are monitor (System), sun (Light) and moon (Dark), from `lucide-vue-next`.
- `DESIGN.md` loses "Don't add a theme toggle or a `data-theme` switch" and "follow the system theme through `prefers-color-scheme` alone", and gains the switch and the attribute-keyed dark block. Its canvas rule ("redraw when the colour scheme changes") names the theme in effect instead of the media query.
- `docs/architecture.md` gains the theme module as app-wide state, read by the header and the canvases.
- CHANGELOG: Added, the switch.

### Issue 2: the Next to Silence look

- **The direction contract is the brief.** `.impeccable/surfaces/src-pages-review.md` (thesis, own world, first viewport, the three raises, the signature interaction) and the chosen sketch govern every choice. It is built through the `impeccable` skill, code-led, Operate mode, and ends with impeccable's finish review.
- **Every colour stays a `--color-*` token**, and the roles keep their names where the role survives (ground, surface, ink, muted, hairline, edge, wave, track, on-track, land, split, on-split, and the header band's tokens). The spike's mapping, confirmed by the user in the browser:

  | Token | Light | Dark |
  | --- | --- | --- |
  | ground | #E3E8E6 | #101618 |
  | surface | #FAFBFA | #182023 |
  | ink | #1B2326 | #E2E9E7 |
  | muted | #55615E | #98A6A3 |
  | hairline | #D2D9D6 | #263033 |
  | edge | #7F8B88 | #6B7977 |
  | wave | #2C3639 | #B4C0BD |
  | track | #3B4F57 | #4C6670 |
  | on-track | #F2F5F4 | #F0F4F3 |
  | land (gaps) | #BCD2CD | #24403D |
  | split | #B83E0B | #F28A4E |
  | on-split | #FFFFFF | #101618 |
  | header band | #26343A | #0B1012 |
  | on header band | #E6EEEC | #E2E9E7 |
  | on header band, muted | #A3B5B2 | #8FA19E |
  | header band edge | #3A4A51 | #263033 |

  The header band now has dark values. The old rule that it is the same in both themes goes.
- **New tokens the spike could not show:** a slate fill for pressable things (the primary button, Play, Export) with its on-colour, and its dark pair. The header's mark becomes sea-mist, because rust on slate is 2.28:1. The build fixes the exact values and checks them against the contrast table.
- **The font becomes Albert Sans**, bundled locally (variable, Latin subset, OFL licence file beside it), replacing Manrope and its files. The canvas font is one shared constant, renamed to Albert Sans, so canvas labels follow. The "redraw once the fonts have loaded" behaviour stays.
- **Radii become 3 px (controls) and 4 px (panels).** Spacing becomes 32 px page margins, 24 px gutters, 16 px inside a panel, and a 56 px header. The 4 px base unit stays.
- **The split's time in the Split view's title area becomes a 32 px figure**, the one large figure on the screen. A new text size token carries it.
- **Selection speaks rust in three places at once:** the whole-file view (already), the track list's selected-split row and the strip's split item. Colour-only transitions of about 120 ms on controls and on selection are switched off under `prefers-reduced-motion`.
- **Canvas drawing code changes only through tokens** and the canvas font constant. No drawing logic, hit-testing or layout inside a canvas changes.
- **Brand assets follow the look:** the link preview image (and its alt text, which today says "red split lines"), the favicon and touch icons, the manifest colours and the page's `theme-color`. Each new raster records where it came from, as the finish contract asks.
- `DESIGN.md` is rewritten for Next to Silence (overview, colours with measured contrast, typography, layout, components, do's and don'ts, token block), and `.impeccable/design.json` is regenerated from the shipped result.
- CHANGELOG: Changed, the new look.

## Testing Decisions

- A good test drives a module through its public interface and checks what a user or a caller sees: the theme in effect, the attribute on `<html>`, what is saved, a component's ARIA and the choice it sets. It never reaches into private variables or canvas pixels. Canvas drawing stays untested beyond its pure helpers, as today.
- **Theme module** (prior art: the saved-volume spec for storage, the canvas-redraw spec for a stubbed `matchMedia`):
  - default `system`, resolved from the OS;
  - each choice sets the attribute and `color-scheme`, and is saved;
  - a saved choice is read back;
  - on `system`, an OS change updates the theme in effect and the attribute;
  - on `light` or `dark`, an OS change does nothing;
  - blocked or garbage storage falls back to `system` without throwing.
  - The shared `matchMedia` stub in the Vitest setup gains a way to fire a change, or the spec supplies its own.
- **Canvas redraw** (prior art: its spec): a mounted canvas redraws when the theme in effect changes, and stops listening on unmount.
- **Segmented control** (prior art: its spec): the inverse variant's look classes, an icon per option with its tooltip, and the accessible name staying the label.
- **App** (prior art: its spec): the switch in the header on the load screen and the review screen, and choosing an option sets the theme module's choice.
- **e2e, one new spec** (prior art: `e2e/export.spec.ts` for the setup; Playwright's `emulateMedia` for the OS scheme), because first paint and the OS can only be checked in a real browser:
  - with Dark saved under a light OS, the attribute and the ground colour are dark at the first check after navigation, before the app mounts;
  - on System, emulating a change of the OS scheme changes the attribute live;
  - the choice survives a reload.
  `pnpm test:e2e` runs in Final for the switch (ticket 02).
- **Contrast, one new Node spec** (prior art: the scripts' Node specs). It reads the `--color-*` values for both themes from the CSS entry and asserts each pair in `DESIGN.md`'s contrast table:
  - 4.5:1 for text pairs (ink and muted on ground and surface, on-track on track, on-split on split, the header band's text, the slate fill's text);
  - 3:1 for non-text pairs (split on land and on surface, edge on surface, the focus ring on ground and surface, wave on surface and on land).
  It lands with the theme plumbing (ticket 01), on today's values, so the look must keep it green on the new ones.
- **Issue 2 adds no behaviour seams.** Every existing spec stays green; specs that check a class name the look changed are updated to the new class, never loosened. The proof is impeccable's finish review plus a check by hand in Chrome (`playwright-cli` skill), with a sample loaded, in both themes: the load screen, the review screen in all three views, the dialogs, and the focus ring on every control.

## Out of Scope

- More than three choices (a high-contrast theme, a per-screen theme, a scheduled switch).
- Syncing the choice across devices, or keeping it anywhere but this browser.
- A keyboard shortcut for the switch.
- Changing what a canvas draws, how it is laid out, or how it is hit-tested. Only its colours and font change.
- New features, new controls or changed behaviour on either screen, beyond the switch and the split's time getting larger.
- Mobile or narrow layouts (the app stays desktop Chrome only).
- Colouring audio by track, or any colour per track.
- Changing the README beyond what is stale after the switch, if anything.

## Further Notes

- **No glossary changes.** Theme, palette and the look's colour names are UI words, not domain terms, so they stay in `DESIGN.md`.
- **No ADR.** The switch is easy to remove, and the reasons for both changes live in this spec and in `DESIGN.md`.
- **Not a learning milestone.** No audio idea is taught, so there is no concept note. The stops are: the switch working in the browser (end of ticket 02), and the new look working in the browser in both themes (end of ticket 06).
- **The spike's notes:** a colour-only swap left the primary buttons graphite and the header's mark rust. Both are handled by the new tokens above, not bugs in the mapping. The spike pointed the old font name at the Albert Sans file to reach the canvases; the build renames the font properly instead.
