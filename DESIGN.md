---
name: Audio Splitter
description: Silence is the material. Every gap is one sea-mist field, audio is graphite on it, slate is for what you press, and rust marks only the cuts.
colors:
  ink: '#1B2326'
  muted: '#55615E'
  ground: '#E3E8E6'
  surface: '#FAFBFA'
  hairline: '#D2D9D6'
  edge: '#7F8B88'
  wave: '#2C3639'
  track: '#3B4F57'
  on-track: '#F2F5F4'
  land: '#BCD2CD'
  split: '#B83E0B'
  on-split: '#FFFFFF'
  fill: '#26343A'
  fill-hover: '#3B4F57'
  on-fill: '#F2F5F4'
  band: '#26343A'
  on-band: '#E6EEEC'
  on-band-muted: '#A3B5B2'
  band-edge: '#3A4A51'
  mark: '#BCD2CD'
  ink-dark: '#E2E9E7'
  muted-dark: '#98A6A3'
  ground-dark: '#101618'
  surface-dark: '#182023'
  hairline-dark: '#263033'
  edge-dark: '#6B7977'
  wave-dark: '#B4C0BD'
  track-dark: '#4C6670'
  on-track-dark: '#F0F4F3'
  land-dark: '#24403D'
  split-dark: '#F28A4E'
  on-split-dark: '#101618'
  fill-dark: '#8FB0BA'
  fill-hover-dark: '#A8C5CE'
  on-fill-dark: '#101618'
  band-dark: '#0B1012'
  on-band-dark: '#E2E9E7'
  on-band-muted-dark: '#8FA19E'
  band-edge-dark: '#263033'
typography:
  display:
    fontFamily: '"Albert Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: '32px'
    fontWeight: 600
    lineHeight: '36px'
  headline:
    fontFamily: '"Albert Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: '20px'
    fontWeight: 700
    lineHeight: '28px'
  title:
    fontFamily: '"Albert Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 600
    lineHeight: '24px'
  body:
    fontFamily: '"Albert Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: '20px'
  label:
    fontFamily: '"Albert Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 600
    lineHeight: '20px'
  caption:
    fontFamily: '"Albert Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: '16px'
  caption-strong:
    fontFamily: '"Albert Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 600
    lineHeight: '16px'
rounded:
  control: '3px'
  panel: '4px'
  full: '9999px'
spacing:
  xxs: '4px'
  xs: '6px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  page: '32px'
components:
  button-primary:
    backgroundColor: '{colors.fill}'
    textColor: '{colors.on-fill}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '36px'
  button-primary-hover:
    backgroundColor: '{colors.fill-hover}'
    textColor: '{colors.on-fill}'
  button-primary-lg:
    backgroundColor: '{colors.fill}'
    textColor: '{colors.on-fill}'
    typography: '{typography.title}'
    rounded: '{rounded.control}'
    padding: '0 20px'
    height: '40px'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '36px'
  button-secondary-hover:
    backgroundColor: 'color-mix(in srgb, #BCD2CD 40%, #FAFBFA)'
    textColor: '{colors.ink}'
  button-danger:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.split}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '36px'
  button-danger-hover:
    backgroundColor: '{colors.split}'
    textColor: '{colors.on-split}'
  button-inverse:
    backgroundColor: '{colors.on-band}'
    textColor: '{colors.band}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '36px'
  button-sm:
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '32px'
  button-inverse-hover:
    backgroundColor: '#FFFFFF'
    textColor: '{colors.band}'
  icon-button:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    size: '36px'
  icon-button-sm:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    size: '32px'
  icon-button-primary:
    backgroundColor: '{colors.fill}'
    textColor: '{colors.on-fill}'
    rounded: '{rounded.control}'
    size: '32px'
  tooltip:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
    typography: '{typography.caption-strong}'
    rounded: '{rounded.control}'
    padding: '4px 8px'
  text-field:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 10px'
    height: '36px'
  text-field-inline:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 6px'
    height: '24px'
  slider-track:
    backgroundColor: '{colors.hairline}'
    rounded: '{rounded.full}'
    height: '4px'
  slider-range:
    backgroundColor: '{colors.ink}'
    rounded: '{rounded.full}'
    height: '4px'
  slider-thumb:
    backgroundColor: '{colors.ink}'
    rounded: '{rounded.full}'
    size: '16px'
  slider-thumb-hover:
    backgroundColor: '{colors.ink}'
    size: '20px'
  progress-track:
    backgroundColor: '{colors.land}'
    rounded: '{rounded.full}'
    height: '6px'
  progress-indicator:
    backgroundColor: '{colors.ink}'
    rounded: '{rounded.full}'
    height: '6px'
  panel:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '16px'
  dialog-overlay:
    backgroundColor: '{colors.ground}'
  dialog:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '16px'
    width: '448px'
  header-band:
    backgroundColor: '{colors.band}'
    textColor: '{colors.on-band}'
    padding: '0 32px'
    height: '56px'
  track-block:
    backgroundColor: '{colors.track}'
    textColor: '{colors.on-track}'
    rounded: '{rounded.control}'
    padding: '0 12px'
  split-chip:
    backgroundColor: '{colors.split}'
    textColor: '{colors.on-split}'
    typography: '{typography.caption-strong}'
    rounded: '{rounded.full}'
    size: '20px'
---

# Design System: Audio Splitter

## Overview

**Creative North Star: "Next to Silence"**

On an ECM sleeve, quiet is the field the music sits on. Audio Splitter draws a source file that way: every gap is one sea-mist field in every view, tracks are graphite waveforms and slate blocks laid on it, and a split reads as a rust line you can see before you read a number. The world refuses the dark audio editor with a bright blue waveform, the studio-gear look, the grey screen with one accent, decoration that competes with the waveforms, and dense tiny technical type.

By day the ground is fog and the panels are sleeve white; by night the ground is slate-black, the panels a step lighter and the gaps deep-sea. Ink and audio are graphite, inverted at night. Slate is the colour of what you press (the filled buttons) and of the header band and the track blocks; only a pressable thing is a slate fill. Rust marks splits and the silence threshold, and nothing else. Colour is flat: no gradients, no shadows. Panels separate by a hairline and the ground between them. A `data-theme` attribute on `<html>` carries the theme in effect; how it is set is in [docs/architecture.md](docs/architecture.md#the-theme).

The waveforms and the loudness curve are the content, so the chrome is quiet: one face (Albert Sans), two small radii, 32 px page margins and 24 px gutters, and controls that carry state through ink and border rather than colour. Motion is limited to a 120 ms colour transition on controls and on selection, off under `prefers-reduced-motion`.

**Key Characteristics:**

- Graphite for everything that is audio; one sea-mist field for every gap.
- One reserved rust: splits, the silence threshold, danger and invalid states.
- Slate only for pressable fills, the header band and the track blocks; a sea-mist mark in the header.
- A slate header band by day and a near-black one by night.
- Flat colour throughout; depth comes from ground versus surface and a 1 px hairline.
- Albert Sans everywhere, nothing smaller than 12 px.
- Hand-drawn canvas views read the same colour tokens as the kit.

## Colors

Next to Silence: fog, sleeve white and graphite, one sea-mist for every gap, slate for what you press, and one rust that means "cut here". `src/app/styles/__tests__/contrast.spec.ts` reads both themes from the CSS entry and holds the text pairs to 4.5:1 and the rest (lines, borders, the focus ring) to 3:1. Ratios below are light, then dark.

### Primary

- **Rust** (`split`; dark: `split-dark`, a lighter orange): split lines, split numbers and the selected split's chip, the dashed silence threshold and its label and handle, the danger button, and invalid field borders and messages. Measured 5.42:1 on the surface and 6.71:1 on the dark surface, 3.55:1 on a land and 4.54:1 on a dark land, so 1.5 px lines stay visible where they cross a gap.
- **On Rust** (`on-split`): numbers and labels set on a filled rust (the selected split chip, the danger button's hover). 5.63:1 and 7.41:1.
- **Slate Fill** (`fill`, `fill-hover`, `on-fill`; dark: a light slate-blue with near-black text): the primary button, Play and Export, the only filled controls. The text is 11.71:1 (hover 7.84:1) in light and 7.90:1 (hover 10.04:1) in dark; the fill against the surface is 12.38:1 and 7.16:1, so its edge needs no border.

### Neutral

- **Graphite Ink** (`ink`; dark: `ink-dark`): body text, panel titles, the slider range and thumb, progress fill, the tooltip's fill, the zoom window and zoom frame outlines, the selected track's outline on the whole-file view, the Range view's and the Track view's playhead and marks and the Track view's pending splits, and the keyboard focus ring. 15.39:1 on the surface, 12.89:1 on the ground.
- **Label Grey** (`muted`; dark: `muted-dark`): secondary text, axis times, table headings, field labels and idle progress counts. 6.21:1 on the surface and 5.20:1 on the ground (6.55:1 and 7.23:1 in dark).
- **Fog Ground** (`ground`; dark: `ground-dark`): the page behind the panels.
- **Sleeve Surface** (`surface`; dark: `surface-dark`): panels, inputs, secondary/danger/icon button fills, the plate behind the threshold label, and the tooltip's text.
- **Hairline** (`hairline`; dark: `hairline-dark`): panel borders, table row rules, the empty slider track. Decorative separation only, never the sole boundary of a control.
- **Control Edge** (`edge`; dark: `edge-dark`): borders of inputs, secondary buttons and icon buttons; 3.40:1 (light) and 3.64:1 (dark) against the surface, enough for a component boundary.
- **Graphite Wave** (`wave`; dark: `wave-dark`): waveform bars, the loudness curve and its 14% fill, and the flat run-out line in a land. 11.95:1 on the surface and 7.82:1 on a land (8.83:1 and 5.98:1 in dark).
- **Slate Track** (`track`; dark: `track-dark`): track blocks in the track strip. The name on it is `on-track`, 7.84:1 (5.50:1 in dark). At night a block against the strip's ground is only 1.83:1: the blocks are told apart by their names and the split items between them.
- **On Track** (`on-track`; dark: `on-track-dark`): track names and durations on a track block, and the focus ring on a block.
- **Sea-Mist Land** (`land`; dark: `land-dark`, deep-sea): every gap (the band with no waveform) in every view, the track strip's ground between blocks, the empty progress track, text selection, and as a tint for hover (40%), the selected table row (50%) and, whole, a pressed plain control.

### Header band

- **Band** (`band`; dark: `band-dark`): the header band's fill, slate by day and near-black by night.
- **On Band** (`on-band`): the product name and file chip text; also the fill of the inverse button and its focus ring. 10.89:1 (15.54:1 in dark).
- **On Band Muted** (`on-band-muted`): quiet header text such as "Local only". 6.00:1 (7.07:1 in dark).
- **Band Edge** (`band-edge`): the band's bottom rule and the file chip's border.
- **Mark** (`mark`): the header's mark, a sea-mist disc with a hole, the same in both themes. 8.10:1 on the band (12.07:1 in dark). Rust on slate would be 2.28:1, which is why the mark is not rust.

### Named Rules

**The Rust Rule.** Rust marks a split, the silence threshold, a destructive action or an invalid value, and nothing else: not hover, not selection, not links, not emphasis, not a progress fill, not the brand mark. A split item in the track strip is a split, so it takes rust when it is hovered, focused or selected.

**The Slate Fill Rule.** Only a pressable thing is a slate fill: the primary button, Play and Export. Panels, tooltips, sliders and progress are never slate.

**The Silence Rule.** A gap is one sea-mist field in every view, never a grey, never a second colour.

**The Graphite Rule.** Audio is drawn in graphite. A waveform or curve is never coloured, never blue, never rust. A track block is slate, as the one block-shaped thing.

## Typography

**Display Font:** none (no display face)
**Body Font:** Albert Sans (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** none

**Character:** One clean geometric sans at four weights (400, 500, 600, 700). It reads calm and exact rather than technical.

Albert Sans ships as one committed variable woff2 file in `src/app/styles/fonts/` (SIL OFL, licence in `OFL.txt` beside it), loaded by the `@font-face` rule in the token block below. The file is the Latin subset (from `@fontsource-variable/albert-sans` 5.3.0): Basic Latin, Latin-1, the minus sign, the ellipsis and general punctuation. Characters outside it fall back to the system face. Nothing is fetched from the network at runtime.

Figures are proportional: Albert Sans has no `tnum` feature, so a `1` is half as wide as a `0` and times and counts shift as they change. That was accepted over swapping the face, and nothing sets `font-variant-numeric`.

### Hierarchy

- **Display** (600, 32px, 36px): the selected split's time in the zoom panel's Split view, the one large figure on the screen (`text-display`). The Track and Range views and the no-split messages keep Headline in the same row height, so a view switch moves nothing.
- **Headline** (700, 20px, 28px): the product name in the header and the Track and Range views' panel titles.
- **Title** (600, 16px, 24px): panel titles (an `h2` per panel) and the large Export button's label.
- **Body** (400, 14px, 20px): default text, table cells, field values, panel metadata.
- **Label** (600, 14px, 20px): button labels, slider value readouts, an in-progress count, the selected table row.
- **Caption** (400, 12px, 16px): axis times under a canvas, table headings (500 weight there), track durations, quiet header text.
- **Caption Strong** (600 or 700, 12px, 16px): the file chip, an invalid field's message, split numbers and chips (700).

### Named Rules

**The Twelve-Pixel Floor.** Nothing is set below 12 px, and nothing is uppercased or letter-spaced to look technical.

**The Full-Strength Text Rule.** Text hierarchy comes from size, weight and the `muted` token, never from opacity on text.

## Layout

Desktop Chrome only. The page is the ground with panels laid on it: 32px (`page`) side margins and 24px (`xl`) above the first panel and below the last, 24px gutters between panels, 16px padding inside each panel. The header band is 56px tall with the same 32px side padding. The review screen stacks the whole file and the loudness curve at full width, then the zoom panel (8 of 12 columns) beside the track list (4 of 12), then the track strip at full width. With 34 tracks the page is about 980px tall at 1440px wide, so a 900px window shows the strip at its fold, with its Export button in view.

Spacing uses Tailwind's default 4 px unit. Reused steps: 4px (axis labels under a canvas, the strip's inner gaps), 6px (table row padding), 8px (icon-to-label and between buttons in a group, the strip's split items), 12px (panel title row to content, label to control), 16px (panel padding, header gaps), 24px (gutters, between a panel title and a control in the same header row), 32px (page margins).

Inside a panel the title row comes first: the title on the left, metadata or the panel's action on the right, baseline-aligned for text and centre-aligned when it holds a control. Canvas views run the full content width of their panel; their time axis sits directly underneath as three to five caption-size times spread edge to edge.

## Elevation & Depth

The system is flat. There are no shadows and no gradients anywhere, in either theme. Depth is two layers only: the ground and the surface on it, separated by a 1 px hairline border. Interactive state is shown by a change of fill or border (ink, slate, a land tint) and by the focus ring, never by lift.

### Named Rules

**The Flat Sleeve Rule.** No `box-shadow`, no `drop-shadow`, no gradient, no blur, no translucency over content. If something needs to stand apart, it gets the surface colour, a hairline, or ground around it.

## Shapes

Two small radii, so the screen reads precise rather than soft. Controls (buttons, icon buttons, fields, the file chip, track blocks and the track strip) have `control` corners, 3px. Panels have `panel` corners, 4px. Pills (`full`) are reserved for things that are round by nature: the slider track, range and thumb, progress bars, split number chips and the header's mark.

Borders are 1px: hairline for panels and row rules, control edge for controls, rust for danger and invalid. Canvas outlines (zoom window, zoom frame) are 1.5px ink with square corners.

### Named Rules

**The Two Radii Rule.** 3 px for anything you press or type into, 4 px for a panel, fully round only for tracks, thumbs, bars and chips. No other radius.

## Components

Every kit component lives in `src/shared/ui/` as `Ui<Name>.vue` (`UiButton`, `UiIconButton`, `UiTextField`, `UiSlider`, `UiSegmentedControl`, `UiPanel`, `UiProgressBar`, `UiDialog`, `UiPlainDialog`, `UiTooltip`; the prefix keeps a kit component from reading like a native element) and is a Reka UI 2 primitive (or a native element) styled with Tailwind 4 utilities on the tokens below. Classes are given exactly; `focus-ring` is the custom utility defined in the token block.

**Focus.** Every interactive element shows `focus-visible:focus-ring`: a 2px solid ink outline at 2px offset. On the header band the ring uses `on-band`. On a track block (clicking one selects its track) it uses `on-track`. A mouse press takes no focus from a button, an icon button, a segmented-control option, a slider thumb or the track list's and the track strip's buttons, so the next key goes to the view on show (ADR 0002); Tab still focuses them, with the ring and their own keys. The `releaseFocus` handler on `mousedown` (`src/shared/lib/keyboard/release-focus.ts`) does it, and lets go of a text field being edited too, as a click elsewhere would; the slider lets go of its thumb each time Reka focuses it during a pointer drag, not only when the drag ends, because a dialog the drag opens would give the focus back to the thumb when it closes.

**States.** Every kit control answers the same way. Hover is a step toward the control's own look (slate fill to `fill-hover`, a land tint on a plain control, ink border on an outlined one). Active, while pressed, is one step further (`ink` on a slate fill, a full `land` on a plain control); danger is already filled rust on hover, so pressed keeps it. A slider thumb has no fill to change: it grows on hover and shows the grabbing cursor while pressed. Focus is the ring and never changes the fill. Disabled is opacity 40% on the whole control and `cursor-not-allowed`, with no colour change and no hover or active response (those utilities are gated by `enabled:`). A text field has the same four.

**Motion.** `tint-transition` (colour, background and border, 120 ms ease-out, none under `prefers-reduced-motion`) on buttons, icon buttons, segmented options, text fields, track-list rows and the strip's blocks and split items, so selection eases like a press. The focus ring appears at once. Nothing else animates.

**Icons.** `lucide-vue-next`, 16 px (`size-4`), stroke width 2, round caps and joins, `shrink-0`, coloured `currentColor`. Play, Pause and Square (stop) are drawn filled (`fill="currentColor"`, no stroke). Icons used so far: Play, Pause, Square, SkipBack (back to range start), ChevronsLeft, ChevronsRight (step 3 s), Trash2 (delete split), Merge (remove track), Plus (add split), Download (export to folder), FileDown (single export), CircleQuestionMark (keyboard shortcuts), BookmarkPlus (add pending split), Check (apply), BookmarkMinus (delete pending split), Monitor, Sun, Moon (the theme switch). Unicode glyphs are never icons; typographic separators such as the middle dot and the minus sign are text.

### Buttons

Character: firm and quiet; ink does the talking, colour only for danger.

- **Base:** `inline-flex h-9 cursor-pointer items-center gap-2 rounded-control px-3.5 text-sm font-semibold whitespace-nowrap tint-transition disabled:cursor-not-allowed disabled:opacity-40`. Icon before the label, except a "forward" step where it follows. Every variant but inverse adds `focus-visible:focus-ring`.
- **Primary:** `bg-fill text-on-fill enabled:hover:bg-fill-hover enabled:active:bg-ink`. One per panel at most; it is the panel's main action.
  The zoom panel's title row holds no labelled button: its actions are icon buttons (see IconButton), and the panel's one primary action, Play, is the filled one. After the `Split | Track | Range` control the zoom view has "Add split" (Plus), "Delete split" (Trash2, disabled with no split selected) and the primary "Play across split", which reads "Stop" with a filled Square in place of the Play icon while a clip is loading or playing. The Range view has "Add split", "Back to range start" (SkipBack, always enabled) and the primary "Play", which reads "Stop" (filled Square) while the range is decoded and "Pause" (filled Pause) while it plays. The Track view has no "Add split": after the control it has "Add pending split" (BookmarkPlus, key Enter, disabled with no mark, no room at the mark or a pending split selected), "Apply" (Check, disabled with no pending split), "Delete pending split" (BookmarkMinus, key Delete, there only while a pending split is selected), then "Back to track start" and "Play". Both views end with their single export, "Export track…" or "Export range…" (FileDown, secondary, disabled while the full export runs, and "Export track…" also while the track has pending splits, with the tooltip "Apply or delete pending splits first"); it opens the name dialog (see Plain dialog) and its tooltip has no key. Every view's row then ends with the volume control (see Slider, Volume). Only "Export to folder…", "New file" and the dialogs' actions keep their words.
- **Primary lg:** primary plus `h-10 px-5 text-base`. Reserved for the Export action; no other button is large.
- **Small (`sm`):** base with `h-8 px-3` in place of `h-9 px-3.5`. For actions in a panel title row and in table rows (for example "Add split").
- **Secondary:** `border border-edge bg-surface text-ink enabled:hover:border-ink enabled:hover:bg-land/40 enabled:active:bg-land`.
- **Danger:** `border border-split bg-surface text-split enabled:hover:bg-split enabled:hover:text-on-split enabled:active:bg-split enabled:active:text-on-split`. Outlined at rest, filled rust on hover and while pressed.
- **Inverse:** `bg-on-band text-band enabled:hover:bg-white enabled:active:bg-on-band-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-band`. Only on the header band. The ring is spelled out rather than `focus-ring` plus a colour, because those two outline colours have no stable winner: the dev server and the build order the rules differently.
- **States:** as in States above.

### IconButton

- `inline-flex size-9 cursor-pointer items-center justify-center rounded-control border border-edge bg-surface text-ink tint-transition enabled:hover:border-ink enabled:hover:bg-land/40 enabled:active:bg-land focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40`.
- A 36 px square styled like a secondary button, holding one 16 px icon. The `label` is required: it is the button's accessible name (`aria-label`) and its tooltip, so the icon costs a screen reader nothing and a sighted user never has to guess. An optional `hint` names the button's key, and the tooltip says it after the label ("Add split (Enter)"); the accessible name stays the label alone. An optional `reason` says why the button is off ("Apply or delete pending splits first"): while it is set the tooltip says it in place of the label and the key.
- **Small (`sm`):** `size-8` in place of `size-9`, for table rows and title rows.
- **Primary:** `bg-fill text-on-fill enabled:hover:bg-fill-hover enabled:active:bg-ink` in place of the secondary fill and border: a title row's one main action, Play, as the filled button is elsewhere. One per panel at most.
- **Inverse:** the inverse button's fill and spelled-out ring (`bg-on-band text-band enabled:hover:bg-white enabled:active:bg-on-band-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-band`), 36 px, only on the header band: the `?` button. Its tooltip is the ordinary one, which flips below the button because the band is at the top of the page.
- A caller's `class` and listeners go to the button, not to the tooltip around it.

### Tooltip

Reka `TooltipProvider` / `TooltipRoot` / `TooltipTrigger` / `TooltipContent`, wrapped as `UiTooltip` (a `label`, an optional `hint` and a `disabled` switch); the icon button and an icon option of the segmented control use it. The trigger is the control itself, so it keeps its own focus and click.

- **Opens** on hover after 400 ms and on keyboard focus at once; **closes** on pointer leave, on blur, on Escape and on a press. A disabled button takes no keyboard focus, so only hover shows its tooltip (Chrome does).
- **Content:** `z-50 rounded-control bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-surface`, above the trigger with a 6 px gap: an inverted chip in Caption-strong, the same ink and surface as the primary button, so it holds in both themes. Text only, "Label (Key)". No arrow, no shadow, no animation: the Flat Sleeve Rule applies here as to everything that lies over the page.
- Reka keeps a visually hidden copy of the text in a `role="tooltip"` element that the trigger's `aria-describedby` names.

### TextField

- **Default:** native `input`: `tint-transition h-9 w-full max-w-56 rounded-control border border-edge bg-surface px-2.5 text-sm text-ink enabled:hover:border-ink focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40`.
- **Hover:** border goes to ink. **Focus:** ink ring. **Disabled:** 40% opacity and `cursor-not-allowed`.
- **Invalid:** set `aria-invalid="true"` and the field takes `aria-invalid:border-split aria-invalid:outline-split` (rust border at rest, rust ring when focused). The message sits directly below: `mt-1 text-xs font-semibold text-split`, linked with `aria-describedby`, written as a plain sentence. The single export's name field uses it for a failed export's reason; a track name is never invalid.
- **Wide variant** (the name in the single export's dialog): the default's look across the whole width, without `max-w-56`.
- **Inline variant** (rename a track inside its track-list row): `tint-transition -mx-1.5 h-6 w-[calc(100%+12px)] rounded-control border border-transparent bg-transparent px-1.5 text-sm text-ink enabled:hover:border-edge focus-visible:focus-ring`. It reads as the row's text until hovered (edge border) or focused (ink ring). It has no invalid state: export sanitises filenames, so no track name is wrong. `muted` swaps `text-ink` for `text-muted`: a track with no name of its own shows its prefixed number so, until the user starts editing it.

### Slider

Reka `SliderRoot` / `SliderTrack` / `SliderRange` / `SliderThumb`; focus and ARIA live on the thumb (`aria-label` names the setting, `aria-valuetext` is the readout).

- **Root:** `relative flex h-5 min-w-32 flex-1 items-center`; the width comes from the context, set on the component (`class="w-72"`) and shared by name, track and readout; disabled: `data-disabled:opacity-40`.
- **Track:** `relative h-1 w-full rounded-full bg-hairline`. **Range:** `absolute h-1 rounded-full bg-ink` (Reka sets its ends).
- **Thumb:** `block size-4 cursor-grab rounded-full border-2 border-surface bg-ink not-data-disabled:hover:size-5 focus-visible:focus-ring not-data-disabled:active:cursor-grabbing data-disabled:cursor-not-allowed` (Reka positions the thumb; no manual translate). Hover grows it from 16 to 20 px; keyboard focus adds the ink ring.
- **Compact** (the zoom panel's volume): no visible name or readout, so a title row keeps room for its title; the thumb still carries `aria-label`, and `aria-valuetext` is the readout in every slider. No `min-w-32`: the width comes from the caller (`w-20`).
- **Readout:** the current value sits to the right in Label style (`w-18 text-right font-semibold whitespace-nowrap text-ink`, e.g. "1.0 s", "−31.7 dB"; 72 px keeps "−31.7 dB" on one line and stops the track from shifting as the value changes); the setting's name sits to the left in `muted`, `whitespace-nowrap`.

#### Volume

The end of the zoom panel's title row, in all three views: a `size-8` icon button, "Mute" (Volume2) or "Unmute" (VolumeX, shown while muted), then a compact Slider (`w-20`) named "Volume" from −40 to 0 in steps of 1. It shows no number: a screen reader hears whole dB with a real minus sign ("−12 dB", "0 dB"), and the Range view's long title would otherwise wrap. The two sit `gap-1` apart in one `flex items-center` group. Muting changes only the icon and the tooltip: the slider keeps showing the level that returns on unmute.

### SegmentedControl

Reka `RadioGroupRoot` / `RadioGroupItem`: a choice of one among a few views, such as the zoom panel's `Split | Track | Range`. Exactly one option is always chosen; arrow keys move between options, and a disabled option cannot be chosen.

- **Root:** `inline-flex h-8 items-center gap-0.5 rounded-control border border-edge bg-surface p-0.5`, `aria-label` names the control. 32 px tall, as a small button, for a panel's title row.
- **Option:** `inline-flex h-full cursor-pointer items-center justify-center rounded-control border border-transparent px-3 text-sm font-semibold whitespace-nowrap text-ink tint-transition focus-visible:focus-ring enabled:hover:bg-land/40 enabled:active:bg-land disabled:cursor-not-allowed disabled:opacity-40`.
- **Chosen:** `aria-checked:border-ink aria-checked:bg-land/50`: state carried by ink and border, as the selected track block is, never by a filled button, so the panel's one primary button stays the one filled control. It keys on `aria-checked`, not `data-state`, because the tooltip around an icon option sets its own `data-state` on the same button.
- **Icon option:** an option given an `icon` shows the 16 px icon alone (`px-2` in place of `px-3`); its label is its tooltip and its `aria-label`, so the icon costs a screen reader nothing.
- **Inverse:** `variant="inverse"`, only on the header band: the root is `border-band-edge` with no fill, an option is `text-on-band` with `enabled:hover:bg-on-band/15`, the chosen one `border-on-band bg-on-band/20`, pressed `bg-on-band/30`, and the ring is spelled out as the inverse button's is (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-band`).
- **Theme switch:** the one use of both, in the header band on both screens (see Header band).

### Panel

A titled frame (`section` with an `h2`).

- **Frame:** `rounded-panel border border-hairline bg-surface p-4`.
- **Title row:** `mb-3 flex items-baseline justify-between gap-6` (`items-center` when the row holds a control). Title `text-base font-semibold` (Headline `text-lg font-bold` for the panel's one big reading, the Track and Range views' title, and Display `text-display font-semibold` for the Split view's time; both keep the row at `min-h-9`); on the right, metadata in `text-muted` or the panel's controls, grouped `flex items-center gap-2`. A title-row button is `sm` (secondary, or primary for the panel's one main action) and, in the zoom panel, an icon button; Export is primary `lg` and keeps its words.

### ProgressBar

Determinate only; Reka `ProgressRoot` / `ProgressIndicator`, with the count as a visible label.

- **Track:** `h-1.5 rounded-full bg-land`. **Indicator:** `h-full rounded-full bg-ink`, width = done / total.
- **Count label:** right-aligned beside the bar, saying the progress in words: "38 / 62 slices", "Track 3 of 8", "Downloading ffmpeg… 38%". While running: `font-semibold` ink. Idle or done: `text-muted`.

### Dialog

Reka `AlertDialog`: the confirm before a setting change or "New file" replaces edits or pending splits, the discard question, and export's locking overlay. Focus starts on the first button; Escape closes it, except while the export runs: its overlay ignores Escape until the run ends and then closes like "Close". The actions are plain kit buttons, so the caller closes the dialog itself through `v-model:open`.

- **Overlay:** `fixed inset-0 z-40 bg-ground`, opaque. The Flat Sleeve Rule forbids a dimmed or blurred page, so the dialog does not float over the screen: the screen gives way to the ground, and the dialog is the one panel lying on it.
- **Frame:** the panel frame, centred: `fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-1/2 rounded-panel border border-hairline bg-surface p-4 focus:outline-none` (focus moves to the first button, which shows the ring). No shadow.
- **Content:** title in Title (`text-base font-semibold`), the description below it in Body (`mt-1`), optional content (`mt-4`, e.g. a `ProgressBar`), then the actions right-aligned (`mt-4 flex justify-end gap-2`): a secondary button first that keeps things as they are ("Keep edits", or "Cancel"), the action last (danger when it discards edits: "Replace", "New file"). The discard question before an action that would lose pending splits has three buttons, "Apply first" (first, so it takes the focus), "Discard" (danger) and "Cancel", and Escape cancels.

### Plain dialog

Reka `Dialog` (`UiPlainDialog`): a dialog that gives information or asks for a name, where the alert dialog asks a yes-or-no question. It looks like the alert dialog (the same opaque ground and panel frame, no shadow) and differs in what closes it: Escape and a press outside it both close it, where the alert dialog ignores a press outside. The keyboard shortcuts dialog is the first, and the single export's name dialog the second.

- **Frame:** the alert dialog's frame as a flex column with `max-h-[calc(100vh-32px)]`, so the dialog never leaves the screen: the title and description stay put, the content (`min-h-0 overflow-y-auto`) scrolls, and the actions stay pinned below it, so "Close" is always in view. `md` is `max-w-md` (448 px); `lg` is `max-w-2xl` (672 px), for a dialog that holds a list.
- **Content:** title in Title, the description below it in Body (`mt-1`), the content (`mt-4`), then the actions, right-aligned, only when there are any (`mt-4 flex justify-end gap-2`). The shortcuts dialog's one action is a secondary "Close".
- **Shortcut list:** one `section` per area (`mt-4`, none above the first), its `h3` in Label with a hairline rule below (`border-b border-hairline pb-1 text-sm font-semibold`), then a two-column `dl` (`grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm`): the key or gesture in `font-semibold` ink, what it does in `text-muted`. The view on show is the first section.

- **Name dialog** (single export, `SingleExportDialog`): `md`, titled "Export track" or "Export range", its description one plain sentence. The content is a Label `Name` over a wide TextField (selected on focus, so typing replaces the default and Enter keeps it), then one `mt-3 text-sm text-muted` line: "You choose a folder when you confirm." or "Saves into **folder**." (the folder name `font-semibold` ink) with an underlined "Change folder" button after it. A failure sits under the field as the field's invalid message ("Export failed: reason"). The actions are a secondary "Cancel" and a primary "OK", off while the name is empty. While the file is written the field and the folder line give way to one `text-sm font-semibold` line, "Cutting and saving “name”…", and the one action is "Cancel"; Escape and a press outside do not close it then.
- **Saved line** (under the Track view or the Range view, after a single export): `mt-2 text-sm text-muted`, "Saved **file** in **folder**" with the two names in `font-semibold` ink, `role="status"`. It goes at the next press or key in the view, a view switch, a selection change or a new range.

### Header band

`flex h-14 items-center gap-4 border-b border-band-edge bg-band px-8 text-on-band`, slate by day and near-black by night. Left to right: the mark (a 20px sea-mist `mark` disc with a 6px `band` hole, `aria-hidden`), the product name in Headline, the file chip (`rounded-control border border-band-edge px-2.5 py-1 text-xs font-semibold`), the theme switch pushed right (an inverse segmented control named "Theme": System (Monitor), Light (Sun), Dark (Moon), bound to the theme module's choice), quiet text in `text-xs text-on-band-muted`, and inverse buttons: the `?` icon button ("Keyboard shortcuts (?)", review screen only), then "New file".

### Track strip and track blocks

- **Strip:** `flex h-14 rounded-control bg-land`, with no gap: a split item sits between every two blocks, and the land shows through it at rest, with a rust rule down its middle.
- **Split item:** an `li` 8px wide (`SPLIT_ITEM_PX`, the whole height of the strip) holding one `button`, `tint-transition relative block size-full cursor-pointer rounded-control after:absolute after:inset-y-0 after:left-[3px] after:w-0.5 after:bg-split hover:bg-split focus-visible:z-10 focus-visible:bg-split focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink`: a 2px `split` rule over the land at rest, the whole 8px item `split` when hovered, focused or selected (`bg-split`), so a split reads as a split here as everywhere else. Rust on the land is 3.55:1 in light and 4.54:1 in dark. Focus adds the ink ring on top of the fill, so a focused item never reads as a selected one. `aria-label` and `title` "Split N, h:mm:ss.cc" (N is the number the whole-file view shows), `aria-current="true"` while the split is selected. A click selects the split and shows the zoom view centred on it. None before the first block or after the last.
- **Block:** an `li`, `tint-transition min-w-0 flex-none rounded-control border-2 bg-track text-on-track`, with an inline pixel width from `layoutTrackBlocks`: proportional to the track's duration, after the 8px split items between blocks, and never under 12px (a very short track keeps a block that can be clicked, and the others share what is left; on a strip with so many tracks that the minimums do not fit, the blocks are equal and narrower). Every block carries its name and length in `title` and `aria-label`. The `li` holds one inner element, `flex size-full min-w-0 flex-col justify-center gap-0.5 text-left`, which lays out the text.
- **Selected:** the selected track's block (a click on a block selects its track) has `aria-current="true"` and a 2px `on-track` border; every other block has a 2px transparent one, so nothing shifts.
- **Button:** every block, the first included, has a `button` as its inner element, with `cursor-pointer` and the on-track focus ring inside the block (`focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-on-track`).
- **Text by width:** from 32px a block shows its name in Label (`truncate font-semibold`, `text-sm`); from 72px it also shows the duration below in Caption (`truncate text-xs`), both in full `on-track`. Padding on the `li` follows what the block shows: `px-2.5` with name and duration, `px-1` with the name only, none for a sliver, which is a plain `track` block with no text.

### Split number and selected row

- The selected split's number is a filled rust chip wherever it appears: `inline-flex size-5 items-center justify-center rounded-full bg-split text-xs font-bold text-on-split`. In the track list an unselected split row has an empty number cell, and its name reads "Split N" in `text-muted`.
- Table rows are separated by `border-b border-hairline` with 6px vertical padding; the selected row takes `bg-land/50 font-semibold`. Selecting a split lights rust in three places at once: its number chip and line in the whole-file view, the chip in its track-list row, and its item in the strip.
- **Track-list rows:** the list holds a track row for each track and a split row between every two, in time order. A row is clickable (`tint-transition cursor-pointer hover:bg-land/40`) and a track row's number cell holds a button (`size-5 rounded-control text-muted focus-visible:focus-ring`, `aria-label` "Select track N, starts at …"); the selected row, a track row or a split row, is `aria-current="true"` with `bg-land/50` and weight 600. The number is the track's, so a selected track row is marked by its tint and weight only, and a selected split row also takes the rust chip.
- **Track-list table:** `w-full border-separate border-spacing-0 text-left text-sm` inside a 160px (`h-40`) box that scrolls inside itself. The heading row is Caption in weight 500 and `muted` (`text-xs font-medium text-muted`); each `th` is `sticky top-0 border-b border-hairline bg-surface py-1` (`pr-2` except the last, `w-12` for the number column), so the headings stay in view over the scrolling rows. Cells are `border-b border-hairline py-1.5` (`pr-2` except the last).
- **Track-list columns:** number (`w-12`), name (the one flexible column, `w-full` with the inline `TextField` in a `max-w-0` cell so a long name is cut off, not wrapped), start and length (`whitespace-nowrap`, start `pr-4`), and a last cell holding the `sm` `IconButton` "Remove track N" with the Merge icon (`py-0.5`, so the 32px button sets the row height at 36px), left out when there is only one track. A name field is `aria-label` "Name of track N"; focusing it or clicking it selects the track, like the row.
- **Split row:** the same cells, with the track row's classes. The number cell is empty, except while the row is selected: then it holds the split's number in the filled rust chip, as the whole-file view draws it (`aria-hidden`, the name beside it already says which split), the name cell reads `Split N` in `muted`, in `ink` while the row is selected (no field), the start cell holds the split's time, the length cell is empty, and the last cell holds the `sm` trash `IconButton` "Delete split at …" (`py-0.5`, so the 32px button sets the row height at 36px). The button stops the row's click, so it deletes without selecting; so does the track row's merge button. The two icons differ (Trash2 for a split, Merge for a track) so one is never taken for the other.

### Canvas drawing rules (signature)

The whole-file waveform, the loudness curve and the zoom view are hand-drawn canvases inside their widgets, not kit components. They read colours from the same tokens with `getComputedStyle(document.documentElement).getPropertyValue('--color-…')`, scale by `devicePixelRatio`, draw once `document.fonts.ready` resolves, and redraw on resize and when the theme in effect changes (`useCanvasRedraw`). Canvas text is `700 12px "Albert Sans"` (`CANVAS_FONT`).

- **Wave:** graphite (`wave`) vertical bars, 2px wide on a 3px pitch, symmetric about the centre line.
- **Whole-file canvas:** 120px tall in all: a 22px split-number band above a 98px wave area. Lands and split lines cover the wave area only. The loudness curve's canvas is also 120px, with lands and split lines over its full height.
- **Land:** a gap is a `land` band with no waveform in it. In whole-file views a 2 s gap is sub-pixel, so a land is drawn at least 12px wide, centred on its split. A land that is widened shifts inwards only as far as the canvas edge needs. A lead-in or run-out land has no split, so it grows from its canvas edge (a lead-in from the left, a run-out from the right). Widened neighbours may overlap: lands are one flat colour, so overlapping ones read as one band, and each split line stays at its own time.
- **Split line:** `split`, 1.5px wide, the full height of the wave area. The selected split is 3px wide.
- **Split numbers (whole-file view):** a 22px band above the waveform carries each split's number, centred on its line, in `split`. The selected split's number sits in a filled rust circle (20px) with the number in `on-split`.
- **Zoom window (whole-file view):** the stretch shown in the zoom view, outlined in 1.5px `ink`, the height of the wave area. It matches the zoom view's own frame. In the Track view the same outline is drawn on the selected track's stretch instead.
- **Loudness curve:** a 1.5px `wave` line, with the area under it filled in `wave` at 14% alpha; lands run the full canvas height behind it.
- **Silence threshold:** a dashed line (5px dash, 4px gap, 1.5px) in `split` across the full width. Its label ("−35 dB") is drawn in `split` on a `surface`-coloured plate (text width + 8px, 17px tall) above the line at the left, for contrast where it crosses the fill and lands. A drag handle (18 × 10 px, `split`) sits on the line at the right edge.
- **Track view:** the zoom panel's view of the selected track, the same 160 px frame in 1.5px `ink` and drawn as the Range view is, with the track stretched across the whole canvas: `wave` bars, `land` bands at their true width, and the track's two end splits as 1.5px `split` lines on its edges. The track's own mark is drawn as the Range view's is: a 1px `ink` line dashed like the silence threshold, full height, under the playhead. The track's pending splits are drawn over the split lines and under the mark in a look no split, mark or playhead has: a 2px solid `ink` line, full height, with an 8px `ink` diamond centred on it at the top and at the bottom edge (never `split` red, which belongs to splits); the selected one is a 4px line with 12px diamonds. They are pressed within 6 px (the playhead wins when both are in reach), and no other view draws them. A 1px `ink` playhead marks where the track is heard or resumes (its start for a new track), drawn at all times over the split lines, the pending splits and the mark and under the frame, snapped to a whole pixel, and dragged by a press within 6 px of it (`cursor-ew-resize` over it and while it is held); a press within 6 px of a pending split selects it, any other press places the mark and lets go of the selected pending split, and a double-click moves the playhead there. A failure to play is one line of `text-muted` status at the bottom centre, as in the Range view.
- **Range view:** the zoom panel's other view, the same 160 px frame in 1.5px `ink`. The range is stretched across the whole canvas, whatever its length, in `wave` bars on the same pitch; each gap is a `land` band at its true width (the Land Rule's 12 px minimum is for whole-file views) over the bars, with split lines through the full height, the selected split 3px. No run-out line. The mark, where "Add split" puts a split, is a 1px `ink` line dashed like the silence threshold (5px dash, 4px gap), full height, under the playhead, snapped to a whole pixel, and never `split` red, which belongs to the split lines. A 1px `ink` playhead marks where the range is heard or resumes, drawn at all times over the split lines and under the frame, snapped to a whole pixel, and dragged by a press within 6 px of it (the pointer is `cursor-ew-resize` over it and while it is held); a failure to play is one line of `text-muted` status at the bottom centre, as in the zoom view.
- **Range overlay (whole-file view):** `ink` at 10% alpha over the wave area, with 1px `ink` edges, drawn over the lands and under the split lines. It stays in all three views of the zoom panel; the zoom window's outline is drawn only while the zoom view is shown.
- **Zoom view:** the gap is one `land` band; through it runs a flat 1px `wave` run-out line at the centre (near-silence, not nothing). The split is a 3px `split` line with a 14 × 10 px drag handle at its top. The whole canvas is framed in 1.5px `ink`. While a clip plays, a 1px `ink` playhead marks the audio's place, drawn over the split lines and under the frame. A failure to play is one line of `text-muted` status at the bottom centre, in the style of the empty-state status.

### Named Rules

**The Land Rule.** A gap is always drawn as land, never as waveform, and never narrower than 12 px in a whole-file view.

**The Shared Token Rule.** Canvas code never hard-codes a colour; it reads the `--color-…` variables, so canvases and kit change theme together.

**The Ink Focus Rule.** Keyboard focus is always a 2 px outline at 2 px offset in the ink of its ground (`ink`, `on-band` on the header band, `on-track` on a track block, `split` on an invalid field).

## Do's and Don'ts

### Do:

- **Do** take every colour, radius and text size from the token block; add a token before adding a one-off value.
- **Do** key the dark values on `[data-theme='dark']`, set only by the theme module and the head script in `index.html` before it; nothing in CSS, the kit or a canvas reads `prefers-color-scheme`.
- **Do** draw every gap as a land, at least 12 px wide in whole-file views, and keep audio in graphite.
- **Do** keep rust for splits, the silence threshold, danger and invalid states, and slate fills for what is pressed.
- **Do** read canvas colours from the `--color-…` variables and redraw when the theme in effect changes.
- **Do** give every control a visible keyboard focus ring (2 px outline, 2 px offset) and every icon button an `aria-label`.
- **Do** use `lucide-vue-next` icons at 16 px with a 2 px round stroke.
- **Do** keep text at 12 px or larger.
- **Do** reserve the large button size for the Export action.

### Don't:

- **Don't** use gradients, shadows, blur or translucency over content.
- **Don't** draw a bright blue (or any coloured) waveform, or dress the screen as studio gear.
- **Don't** use rust for hover, selection, links, emphasis, progress or branding, and don't fill anything slate that is not pressable.
- **Don't** fetch fonts or any other asset from the network at runtime.
- **Don't** use Unicode glyphs as icons.
- **Don't** dim text with opacity to make hierarchy; use `muted`, size or weight.
- **Don't** set text below 12 px, or uppercase and letter-space labels to look technical.
- **Don't** introduce a third radius or a second typeface.

## Token block

Paste into the app's single CSS entry (`src/app/styles/main.css`). Light values live in `@theme`; dark values override the same variables in one `[data-theme='dark']` block only, and the theme module sets `color-scheme` on `<html>` beside the attribute. `@theme static` makes Tailwind emit every variable even when no utility uses it, which the canvases need. The font file name below is the committed file's name; keep the two in step.

```css
@import 'tailwindcss';

@font-face {
  font-family: 'Albert Sans';
  src: url('./fonts/albert-sans-variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@theme static {
  --font-sans: 'Albert Sans', ui-sans-serif, system-ui, sans-serif;

  --color-ground: #e3e8e6; /* fog: page behind the panels */
  --color-surface: #fafbfa; /* sleeve white: panels, inputs, secondary buttons */
  --color-ink: #1b2326; /* graphite: text, focus ring */
  --color-muted: #55615e; /* secondary text, axis labels */
  --color-hairline: #d2d9d6; /* panel borders, row rules, slider track */
  --color-edge: #7f8b88; /* control borders: 3:1 against surface */
  --color-wave: #2c3639; /* waveform and loudness curve: graphite */
  --color-track: #3b4f57; /* track blocks in the strip: slate */
  --color-on-track: #f2f5f4;
  --color-land: #bcd2cd; /* gaps: one sea-mist field in every view */
  --color-split: #b83e0b; /* rust: splits, threshold, danger, invalid */
  --color-on-split: #ffffff;
  --color-fill: #26343a; /* slate fill of the pressable things: primary button, Play, Export */
  --color-fill-hover: #3b4f57;
  --color-on-fill: #f2f5f4;
  --color-band: #26343a; /* header band */
  --color-on-band: #e6eeec;
  --color-on-band-muted: #a3b5b2;
  --color-band-edge: #3a4a51;
  --color-mark: #bcd2cd; /* the header's mark: sea-mist, the same in both themes */

  --radius-control: 3px;
  --radius-panel: 4px;

  --text-xs: 12px;
  --text-xs--line-height: 16px;
  --text-sm: 14px;
  --text-sm--line-height: 20px;
  --text-base: 16px;
  --text-base--line-height: 24px;
  --text-lg: 20px;
  --text-lg--line-height: 28px;
  --text-display: 32px; /* the split's time: the one large figure */
  --text-display--line-height: 36px;
}

[data-theme='dark'] {
  --color-ground: #101618;
  --color-surface: #182023;
  --color-ink: #e2e9e7;
  --color-muted: #98a6a3;
  --color-hairline: #263033;
  --color-edge: #6b7977;
  --color-wave: #b4c0bd;
  --color-track: #4c6670;
  --color-on-track: #f0f4f3;
  --color-land: #24403d;
  --color-split: #f28a4e;
  --color-on-split: #101618;
  --color-fill: #8fb0ba;
  --color-fill-hover: #a8c5ce;
  --color-on-fill: #101618;
  --color-band: #0b1012;
  --color-on-band: #e2e9e7;
  --color-on-band-muted: #8fa19e;
  --color-band-edge: #263033;
}

@layer base {
  body {
    @apply bg-ground font-sans text-sm text-ink antialiased;
  }
  ::selection {
    background: var(--color-land);
    color: var(--color-ink);
  }
}

@utility focus-ring {
  @apply outline-2 outline-offset-2 outline-ink;
}

/*
Colour-only easing for controls and for selection, off under reduced motion. One utility so every
kit component and every selected row eases the same way.
*/
@utility tint-transition {
  transition-property: color, background-color, border-color;
  transition-duration: 120ms;
  transition-timing-function: ease-out;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```
