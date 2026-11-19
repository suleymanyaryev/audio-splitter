---
name: Audio Splitter
description: A long source file drawn like the side of an LP, grey groove bands for tracks, smooth lands for gaps, one vermilion for splits.
colors:
  ink: '#121212'
  muted: '#5E6066'
  ground: '#F7F7F5'
  surface: '#FFFFFF'
  hairline: '#E2E3E0'
  edge: '#8A8D93'
  wave: '#3A3A3A'
  track: '#3A3A3A'
  on-track: '#FFFFFF'
  land: '#C9CCD1'
  split: '#C8341F'
  on-split: '#FFFFFF'
  vinyl: '#121212'
  on-vinyl: '#EDEDEA'
  on-vinyl-muted: '#A3A5AA'
  vinyl-edge: '#3A3A3A'
  ink-dark: '#EDEDEA'
  muted-dark: '#A3A5AA'
  ground-dark: '#0E0E0E'
  surface-dark: '#171717'
  hairline-dark: '#2A2B2D'
  edge-dark: '#6E7076'
  wave-dark: '#B9BCC1'
  track-dark: '#5C5E63'
  on-track-dark: '#EDEDEA'
  land-dark: '#383A3E'
  split-dark: '#FF5A43'
  on-split-dark: '#0E0E0E'
typography:
  headline:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '20px'
    fontWeight: 700
    lineHeight: '28px'
    fontFeature: 'tnum'
  title:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 600
    lineHeight: '24px'
    fontFeature: 'tnum'
  body:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: '20px'
    fontFeature: 'tnum'
  label:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 600
    lineHeight: '20px'
    fontFeature: 'tnum'
  caption:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: '16px'
    fontFeature: 'tnum'
  caption-strong:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 600
    lineHeight: '16px'
    fontFeature: 'tnum'
rounded:
  control: '6px'
  panel: '8px'
  full: '9999px'
spacing:
  xxs: '4px'
  xs: '6px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 14px'
    height: '36px'
  button-primary-hover:
    backgroundColor: '{colors.wave}'
    textColor: '{colors.surface}'
  button-primary-lg:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.surface}'
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
    backgroundColor: 'color-mix(in srgb, #C9CCD1 40%, #FFFFFF)'
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
    backgroundColor: '{colors.on-vinyl}'
    textColor: '{colors.vinyl}'
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
    textColor: '{colors.vinyl}'
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
    backgroundColor: '{colors.vinyl}'
    textColor: '{colors.on-vinyl}'
    padding: '0 16px'
    height: '48px'
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

**Creative North Star: "Side of an LP"**

On a record you can see where one track ends: the textured groove bands stop and a smooth land runs between them. Audio Splitter draws a source file the same way. Tracks are dense grey waveform bands, every gap is a flat land, and a split reads as something you can see before you read a number. The world refuses the dark audio editor with a bright blue waveform, the studio-gear look, decoration that competes with the waveforms, and dense tiny technical type.

By day the ground is sleeve white and the panels are white; by night the ground is vinyl black and the panels near-black. Ink is vinyl black, inverted at night. Waveforms and track blocks are groove grey, lands are sheen grey, and one centre-label vermilion marks splits and the silence threshold. Colour is flat: no gradients, no shadows. Panels separate by a hairline and the ground between them. The theme follows the system setting; there is no theme toggle.

The waveforms and the loudness curve are the content, so the chrome is quiet: one face (Manrope) with tabular figures, two radii, a 16 px rhythm, and controls that carry state through ink and border rather than colour. Motion is limited to a 100 ms colour transition on controls.

**Key Characteristics:**

- Groove grey for everything that is audio; sheen-grey lands for every gap.
- One reserved vermilion: splits, the silence threshold, danger and invalid states, and the centre-label mark in the header.
- A vinyl-black header band in both themes.
- Flat colour throughout; depth comes from ground versus surface and a 1 px hairline.
- Manrope everywhere, tabular figures everywhere, nothing smaller than 12 px.
- Hand-drawn canvas views read the same colour tokens as the kit.

## Colors

A near-monochrome palette of ink, paper and groove greys with one hot accent that means "cut here".

### Primary

- **Centre-Label Vermilion** (`split`; dark: `split-dark`): split lines, split numbers and the selected split's chip, the dashed silence threshold and its label and handle, the danger button, invalid field borders and messages, and the centre-label mark in the header. Measured 5.29:1 on white and 5.80:1 on the dark surface (6.25:1 on the dark ground), 3.69:1 on a dark land, so 1.5 px lines stay visible where they cross a land.
- **On Vermilion** (`on-split`; dark: `on-split-dark`): numbers and labels set on a filled vermilion (the selected split chip, the danger button's hover).

### Neutral

- **Vinyl Ink** (`ink`; dark: `ink-dark`): body text, panel titles, the primary button, the slider range and thumb, progress fill, the zoom window and zoom frame outlines, the selected track's outline on the whole-file view, the Range view's and the Track view's playhead and the Range view's mark, and the keyboard focus ring. 18.7:1 on white.
- **Label Grey** (`muted`; dark: `muted-dark`): secondary text, axis times, table headings, field labels and idle progress counts. Measured 6.29:1 (light) and 7.27:1 (dark).
- **Sleeve Ground** (`ground`; dark: `ground-dark`): the page behind the panels.
- **Sleeve Surface** (`surface`; dark: `surface-dark`): panels, inputs, secondary/danger/icon button fills, the plate behind the threshold label, and the primary button's text.
- **Hairline** (`hairline`; dark: `hairline-dark`): panel borders, table row rules, the empty slider track. Decorative separation only, never the sole boundary of a control.
- **Control Edge** (`edge`; dark: `edge-dark`): borders of inputs, secondary buttons and icon buttons; 3.33:1 (light) and 3.62:1 (dark) against the surface, enough for a component boundary.
- **Groove Grey** (`wave`; dark: `wave-dark`): waveform bars, the loudness curve and its 14% fill, the flat run-out line in a land, and the primary button's hover fill.
- **Track Grey** (`track`; dark: `track-dark`): track blocks in the track strip. Same as the wave in light; a step darker than the wave at night so the white-ish name sits on it at 5.53:1.
- **On Track** (`on-track`; dark: `on-track-dark`): track names and durations on a track block, and the focus ring on a block.
- **Sheen Land** (`land`; dark: `land-dark`): every gap (the band with no waveform), the track strip's ground between blocks, the empty progress track, text selection, and as a tint for hover (40%) and the selected table row (50%).

### Header band (fixed in both themes)

- **Vinyl** (`vinyl`): the header band's fill, identical by day and night.
- **On Vinyl** (`on-vinyl`): the product name and file chip text; also the fill of the inverse button and its focus ring.
- **On Vinyl Muted** (`on-vinyl-muted`): quiet header text such as "Local only" (7.6:1).
- **Vinyl Edge** (`vinyl-edge`): the band's bottom rule and the file chip's border.

### Named Rules

**The Centre-Label Rule.** Vermilion marks a split, the silence threshold, a destructive action, an invalid value, or the centre-label mark in the header, and nothing else: not hover, not selection, not links, not emphasis, not a progress fill.

**The Vinyl Band Rule.** The header band is vinyl black with on-vinyl text in both themes; its tokens never take dark-mode overrides.

**The Groove Grey Rule.** Audio is drawn in groove grey. A waveform, curve or track block is never coloured, never blue, never vermilion.

## Typography

**Display Font:** none (no display face)
**Body Font:** Manrope (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** none; numbers use Manrope's tabular figures

**Character:** One humanist-geometric sans at four weights (400, 500, 600, 700). It reads friendly rather than technical, and its tabular figures keep times, gaps and counts aligned in columns and steady while they change.

Manrope ships as one committed variable woff2 file in `src/app/styles/fonts/` (SIL OFL, licence in `OFL.txt` beside it), loaded by the `@font-face` rule in the token block below. The file is the Latin subset (from `@fontsource-variable/manrope` 5.3.0): Basic Latin, Latin-1, the minus sign, the ellipsis and general punctuation. Characters outside it fall back to the system face. Nothing is fetched from the network at runtime.

### Hierarchy

- **Headline** (700, 20px, 28px): the product name in the header and the single most important reading on a panel (the selected split's number, time and gap in its panel header).
- **Title** (600, 16px, 24px): panel titles (an `h2` per panel) and the large Export button's label.
- **Body** (400, 14px, 20px): default text, table cells, field values, panel metadata.
- **Label** (600, 14px, 20px): button labels, slider value readouts, an in-progress count, the selected table row.
- **Caption** (400, 12px, 16px): axis times under a canvas, table headings (500 weight there), track durations, quiet header text.
- **Caption Strong** (600 or 700, 12px, 16px): the file chip, an invalid field's message, split numbers and chips (700).

### Named Rules

**The Tabular Rule.** `font-variant-numeric: tabular-nums` is set once on `body` and is never switched off; every time, gap, count and dB value is tabular.

**The Twelve-Pixel Floor.** Nothing is set below 12 px, and nothing is uppercased or letter-spaced to look technical.

**The Full-Strength Text Rule.** Text hierarchy comes from size, weight and the `muted` token, never from opacity on text.

## Layout

Desktop Chrome only. The page is the ground with panels laid on it: 16px (`lg`) outer padding, 16px gutters between panels, 16px padding inside each panel. Panels span the width in a 12-column grid; how the review screen arranges its panels is decided by its own ticket, not by this system.

Spacing uses Tailwind's default 4 px unit. Reused steps: 4px (axis labels under a canvas, the strip's inner gaps), 6px (land gaps between track blocks, table row padding), 8px (icon-to-label and between buttons in a group), 12px (panel title row to content, label to control), 16px (panel padding, gutters, header gaps), 24px (between a panel title and a control in the same header row).

Inside a panel the title row comes first: the title on the left, metadata or the panel's action on the right, baseline-aligned for text and centre-aligned when it holds a control. Canvas views run the full content width of their panel; their time axis sits directly underneath as three to five caption-size times spread edge to edge.

## Elevation & Depth

The system is flat. There are no shadows and no gradients anywhere, in either theme. Depth is two layers only: the ground and the surface on it, separated by a 1 px hairline border. Interactive state is shown by a change of fill or border (ink, groove grey, a 40% land tint) and by the focus ring, never by lift.

### Named Rules

**The Flat Sleeve Rule.** No `box-shadow`, no `drop-shadow`, no gradient, no blur, no translucency over content. If something needs to stand apart, it gets the surface colour, a hairline, or ground around it.

## Shapes

Two radii. Controls (buttons, icon buttons, fields, the file chip, track blocks and the track strip) have gently softened corners (`control`, 6px). Panels have slightly rounder corners (`panel`, 8px). Pills (`full`) are reserved for things that are round by nature: the slider track, range and thumb, progress bars, split number chips and the header's centre-label mark.

Borders are 1px: hairline for panels and row rules, control edge for controls, vermilion for danger and invalid. Canvas outlines (zoom window, zoom frame) are 1.5px ink with square corners.

### Named Rules

**The Two Radii Rule.** 6 px for anything you press or type into, 8 px for a panel, fully round only for tracks, thumbs, bars and chips. No other radius.

## Components

Every kit component lives in `src/shared/ui/` as `Ui<Name>.vue` (`UiButton`, `UiIconButton`, `UiTextField`, `UiSlider`, `UiSegmentedControl`, `UiPanel`, `UiProgressBar`, `UiDialog`; the prefix keeps a kit component from reading like a native element) and is a Reka UI 2 primitive (or a native element) styled with Tailwind 4 utilities on the tokens below. Classes are given exactly; `focus-ring` is the custom utility defined in the token block.

**Focus.** Every interactive element shows `focus-visible:focus-ring`: a 2px solid ink outline at 2px offset. On the vinyl band the ring uses `on-vinyl`. On a track block (clicking one selects its track) it uses `on-track`.

**Disabled.** Opacity 40% on the whole control and `cursor-not-allowed`; no colour change, no hover response (hover utilities are gated by `enabled:`).

**Motion.** `transition-colors duration-100` on buttons and icon buttons; nothing else animates.

**Icons.** `lucide-vue-next`, 16 px (`size-4`), stroke width 2, round caps and joins, `shrink-0`, coloured `currentColor`. Play, Pause and Square (stop) are drawn filled (`fill="currentColor"`, no stroke). Icons used so far: Play, Pause, Square, SkipBack (back to range start), ChevronsLeft, ChevronsRight (step 3 s), Trash2 (delete split), Plus (add split), Download (export). Unicode glyphs are never icons; typographic separators such as the middle dot and the minus sign are text.

### Buttons

Character: firm and quiet; ink does the talking, colour only for danger.

- **Base:** `inline-flex h-9 cursor-pointer items-center gap-2 rounded-control px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40`. Icon before the label, except a "forward" step where it follows. Every variant but inverse adds `focus-visible:focus-ring`.
- **Primary:** `bg-ink text-surface enabled:hover:bg-wave`. One per panel at most; it is the panel's main action.
  The zoom panel's "Play across split" reads "Stop", with a filled Square in place of the Play icon, while a clip is loading or playing. The Range view's primary button is "Play"; it reads "Stop" (filled Square) while the range is decoded and "Pause" (filled Pause) while it plays. Just left of it is the small (`sm`, 32 px) icon button "Back to range start" (SkipBack, outline), always enabled.
- **Primary lg:** primary plus `h-10 px-5 text-base`. Reserved for the Export action; no other button is large.
- **Small (`sm`):** base with `h-8 px-3` in place of `h-9 px-3.5`. For actions in a panel title row and in table rows (for example "Add split").
- **Secondary:** `border border-edge bg-surface text-ink enabled:hover:border-ink enabled:hover:bg-land/40`.
- **Danger:** `border border-split bg-surface text-split enabled:hover:bg-split enabled:hover:text-on-split`. Outlined at rest, filled vermilion on hover.
- **Inverse:** `bg-on-vinyl text-vinyl enabled:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-vinyl`. Only on the vinyl header band. The ring is spelled out rather than `focus-ring` plus a colour, because those two outline colours have no stable winner: the dev server and the build order the rules differently.
- **States:** default as above; hover as the `enabled:hover:` utilities; keyboard focus adds the ring without changing fill; disabled at 40% opacity.

### IconButton

- `inline-flex size-9 cursor-pointer items-center justify-center rounded-control border border-edge bg-surface text-ink transition-colors duration-100 enabled:hover:border-ink enabled:hover:bg-land/40 focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40`.
- A 36 px square styled like a secondary button, holding one 16 px icon. An `aria-label` is required.
- **Small (`sm`):** `size-8` in place of `size-9`, for table rows (the track list’s delete button).

### TextField

- **Default:** native `input`: `h-9 w-full max-w-56 rounded-control border border-edge bg-surface px-2.5 text-sm text-ink enabled:hover:border-ink focus-visible:focus-ring disabled:opacity-40`.
- **Hover:** border goes to ink. **Focus:** ink ring. **Disabled:** 40% opacity.
- **Invalid:** set `aria-invalid="true"` and the field takes `aria-invalid:border-split aria-invalid:outline-split` (vermilion border at rest, vermilion ring when focused). The message sits directly below: `mt-1 text-xs font-semibold text-split`, linked with `aria-describedby`, written as a plain sentence. No field uses it yet: track names are never invalid.
- **Inline variant** (rename a track inside its track-list row): `-mx-1.5 h-6 w-[calc(100%+12px)] rounded-control border border-transparent bg-transparent px-1.5 text-sm text-ink enabled:hover:border-edge focus-visible:focus-ring`. It reads as the row's text until hovered (edge border) or focused (ink ring). It has no invalid state: export sanitises filenames, so no track name is wrong.

### Slider

Reka `SliderRoot` / `SliderTrack` / `SliderRange` / `SliderThumb`; focus and ARIA live on the thumb (`aria-label` names the setting).

- **Root:** `relative flex h-5 min-w-32 flex-1 items-center`; the width comes from the context, set on the component (`class="w-72"`) and shared by name, track and readout; disabled: `data-disabled:opacity-40`.
- **Track:** `relative h-1 w-full rounded-full bg-hairline`. **Range:** `absolute h-1 rounded-full bg-ink` (Reka sets its ends).
- **Thumb:** `block size-4 cursor-grab rounded-full border-2 border-surface bg-ink not-data-disabled:hover:size-5 data-disabled:cursor-not-allowed focus-visible:focus-ring` (Reka positions the thumb; no manual translate). Hover grows it from 16 to 20 px; keyboard focus adds the ink ring.
- **Readout:** the current value sits to the right in Label style (`w-18 text-right font-semibold whitespace-nowrap text-ink`, e.g. "1.0 s", "−31.7 dB"; 72 px keeps "−31.7 dB" on one line and stops the track from shifting as the value changes); the setting's name sits to the left in `muted`, `whitespace-nowrap`.

### SegmentedControl

Reka `RadioGroupRoot` / `RadioGroupItem`: a choice of one among a few views, such as the zoom panel's `Split | Track | Range`. Exactly one option is always chosen; arrow keys move between options, and a disabled option cannot be chosen.

- **Root:** `inline-flex h-8 items-center gap-0.5 rounded-control border border-edge bg-surface p-0.5`, `aria-label` names the control. 32 px tall, as a small button, for a panel's title row.
- **Option:** `h-full cursor-pointer rounded-control border border-transparent px-3 text-sm font-semibold whitespace-nowrap text-ink transition-colors duration-100 focus-visible:focus-ring enabled:hover:bg-land/40 disabled:cursor-not-allowed disabled:opacity-40`.
- **Chosen:** `border-ink bg-land/50`: state carried by ink and border, as the selected track block is, never by a filled button, so the panel's one primary button stays the one filled control.

### Panel

A titled frame (`section` with an `h2`).

- **Frame:** `rounded-panel border border-hairline bg-surface p-4`.
- **Title row:** `mb-3 flex items-baseline justify-between gap-6` (`items-center` when the row holds a control). Title `text-base font-semibold` (Headline `text-lg font-bold` for the panel's one big reading, the zoom view's time); on the right, metadata in `text-muted` or the panel's controls, grouped `flex items-center gap-2`. A title-row button is `sm` (secondary, or primary for the panel's one main action), except Export, which is primary `lg`.

### ProgressBar

Determinate only; Reka `ProgressRoot` / `ProgressIndicator`, with the count as a visible label.

- **Track:** `h-1.5 rounded-full bg-land`. **Indicator:** `h-full rounded-full bg-ink`, width = done / total.
- **Count label:** right-aligned beside the bar, counting calls in words: "38 / 62 slices", "Track 3 of 8". While running: `font-semibold` ink. Idle or done: `text-muted`.

### Dialog

Reka `AlertDialog`: the confirm before a setting change or "New file" replaces edits, and export's locking overlay. Focus starts on the first button; Escape closes it, except while the export runs: its overlay ignores Escape until the run ends and then closes like "Close". The actions are plain kit buttons, so the caller closes the dialog itself through `v-model:open`.

- **Overlay:** `fixed inset-0 z-40 bg-ground`, opaque. The Flat Sleeve Rule forbids a dimmed or blurred page, so the dialog does not float over the screen: the screen gives way to the ground, and the dialog is the one panel lying on it.
- **Frame:** the panel frame, centred: `fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-1/2 rounded-panel border border-hairline bg-surface p-4 focus:outline-none` (focus moves to the first button, which shows the ring). No shadow.
- **Content:** title in Title (`text-base font-semibold`), the description below it in Body (`mt-1`), optional content (`mt-4`, e.g. a `ProgressBar`), then the actions right-aligned (`mt-4 flex justify-end gap-2`): a secondary button first that keeps things as they are ("Keep edits", or "Cancel"), the action last (danger when it discards edits: "Replace", "New file").

### Header band

`flex h-12 items-center gap-4 border-b border-vinyl-edge bg-vinyl px-4 text-on-vinyl`, in both themes. Left to right: the centre-label mark (a 20px vermilion disc with a 6px vinyl hole, `aria-hidden`), the product name in Headline, the file chip (`rounded-control border border-vinyl-edge px-2.5 py-1 text-xs font-semibold`), quiet text pushed right in `text-xs text-on-vinyl-muted`, and inverse buttons.

### Track strip and track blocks

- **Strip:** `flex h-14 gap-1.5 rounded-control bg-land`: the land shows between blocks, so each 6px gap is a land.
- **Block:** an `li`, `min-w-0 flex-none rounded-control border-2 bg-track text-on-track`, with an inline pixel width from `layoutTrackBlocks`: proportional to the track's duration, after the 6px lands between blocks, and never under 4px (a very short track stays a visible sliver, and the others share what is left). Every block carries its name and length in `title` and `aria-label`. The `li` holds one inner element, `flex size-full min-w-0 flex-col justify-center gap-0.5 text-left`, which lays out the text.
- **Selected:** the selected track's block (a click on a block selects its track) has `aria-current="true"` and a 2px `on-track` border; every other block has a 2px transparent one, so nothing shifts.
- **Button:** every block, the first included, has a `button` as its inner element, with `cursor-pointer` and the on-track focus ring inside the block (`focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-on-track`).
- **Text by width:** from 32px a block shows its name in Label (`truncate font-semibold`, `text-sm`); from 72px it also shows the duration below in Caption (`truncate text-xs`), both in full `on-track`. Padding on the `li` follows what the block shows: `px-2.5` with name and duration, `px-1` with the name only, none for a sliver, which is a plain `track` block with no text.

### Split number and selected row

- The selected split's number is a filled vermilion chip wherever it appears: `inline-flex size-5 items-center justify-center rounded-full bg-split text-xs font-bold text-on-split`. Other split numbers in lists are plain `text-muted` in the same 20px box.
- Table rows are separated by `border-b border-hairline` with 6px vertical padding; the selected row takes `bg-land/50 font-semibold`.
- **Track-list rows:** a row is clickable (`cursor-pointer hover:bg-land/40`) and its number cell holds a button (`size-5 rounded-control text-muted focus-visible:focus-ring`, `aria-label` "Select track N, starts at …"); the selected row is `aria-current="true"`. The number is the track's, so the selected row is marked by its tint and weight only, not by a chip.
- **Track-list table:** `w-full border-separate border-spacing-0 text-left text-sm` inside a 160px (`h-40`) box that scrolls inside itself. The heading row is Caption in weight 500 and `muted` (`text-xs font-medium text-muted`); each `th` is `sticky top-0 border-b border-hairline bg-surface py-1` (`pr-2` except the last, `w-12` for the number column), so the headings stay in view over the scrolling rows. Cells are `border-b border-hairline py-1.5` (`pr-2` except the last).
- **Track-list columns:** number (`w-12`), name (the one flexible column, `w-full` with the inline `TextField` in a `max-w-0` cell so a long name is cut off, not wrapped), start and length (`whitespace-nowrap`, start `pr-4`), and a last cell holding the `sm` trash `IconButton` (`py-0.5`, so the 32px button sets the row height at 36px); the first row's last cell is empty. A name field is `aria-label` "Name of track N"; focusing it or clicking it selects the track, like the row.

### Canvas drawing rules (signature)

The whole-file waveform, the loudness curve and the zoom view are hand-drawn canvases inside their widgets, not kit components. They read colours from the same tokens with `getComputedStyle(document.documentElement).getPropertyValue('--color-…')`, scale by `devicePixelRatio`, draw once `document.fonts.ready` resolves, and redraw on resize and when `matchMedia('(prefers-color-scheme: dark)')` changes. Canvas text is `700 12px Manrope`.

- **Wave:** groove-grey (`wave`) vertical bars, 2px wide on a 3px pitch, symmetric about the centre line.
- **Whole-file canvas:** 120px tall in all: a 22px split-number band above a 98px wave area. Lands and split lines cover the wave area only. The loudness curve's canvas is also 120px, with lands and split lines over its full height.
- **Land:** a gap is a `land` band with no waveform in it. In whole-file views a 2 s gap is sub-pixel, so a land is drawn at least 12px wide, centred on its split. A land that is widened shifts inwards only as far as the canvas edge needs. A lead-in or run-out land has no split, so it grows from its canvas edge (a lead-in from the left, a run-out from the right). Widened neighbours may overlap: lands are one flat colour, so overlapping ones read as one band, and each split line stays at its own time.
- **Split line:** `split`, 1.5px wide, the full height of the wave area. The selected split is 3px wide.
- **Split numbers (whole-file view):** a 22px band above the waveform carries each split's number, centred on its line, in `split`. The selected split's number sits in a filled vermilion circle (20px) with the number in `on-split`.
- **Zoom window (whole-file view):** the stretch shown in the zoom view, outlined in 1.5px `ink`, the height of the wave area. It matches the zoom view's own frame. In the Track view the same outline is drawn on the selected track's stretch instead.
- **Loudness curve:** a 1.5px `wave` line, with the area under it filled in `wave` at 14% alpha; lands run the full canvas height behind it.
- **Silence threshold:** a dashed line (5px dash, 4px gap, 1.5px) in `split` across the full width. Its label ("−35 dB") is drawn in `split` on a `surface`-coloured plate (text width + 8px, 17px tall) above the line at the left, for contrast where it crosses the fill and lands. A drag handle (18 × 10 px, `split`) sits on the line at the right edge.
- **Track view:** the zoom panel's view of the selected track, the same 160 px frame in 1.5px `ink` and drawn as the Range view is, with the track stretched across the whole canvas: `wave` bars, `land` bands at their true width, and the track's two end splits as 1.5px `split` lines on its edges. No split is selected here, and there is no mark. A 1px `ink` playhead rests at the track's start, snapped to a whole pixel, over the split lines and under the frame.
- **Range view:** the zoom panel's other view, the same 160 px frame in 1.5px `ink`. The range is stretched across the whole canvas, whatever its length, in `wave` bars on the same pitch; each gap is a `land` band at its true width (the Land Rule's 12 px minimum is for whole-file views) over the bars, with split lines through the full height, the selected split 3px. No run-out line. The mark, where "Add split" puts a split, is a 1px `ink` line dashed like the silence threshold (5px dash, 4px gap), full height, under the playhead, snapped to a whole pixel, and never `split` red, which belongs to the split lines. A 1px `ink` playhead marks where the range is heard or resumes, drawn at all times over the split lines and under the frame, snapped to a whole pixel, and dragged by a press within 6 px of it (the pointer is `cursor-ew-resize` over it and while it is held); a failure to play is one line of `text-muted` status at the bottom centre, as in the zoom view.
- **Range overlay (whole-file view):** `ink` at 10% alpha over the wave area, with 1px `ink` edges, drawn over the lands and under the split lines. It stays in all three views of the zoom panel; the zoom window's outline is drawn only while the zoom view is shown.
- **Zoom view:** the gap is one `land` band; through it runs a flat 1px `wave` run-out line at the centre (near-silence, not nothing). The split is a 3px `split` line with a 14 × 10 px drag handle at its top. The whole canvas is framed in 1.5px `ink`. While a clip plays, a 1px `ink` playhead marks the audio's place, drawn over the split lines and under the frame. A failure to play is one line of `text-muted` status at the bottom centre, in the style of the empty-state status.

### Named Rules

**The Land Rule.** A gap is always drawn as land, never as waveform, and never narrower than 12 px in a whole-file view.

**The Shared Token Rule.** Canvas code never hard-codes a colour; it reads the `--color-…` variables, so canvases and kit change theme together.

**The Ink Focus Rule.** Keyboard focus is always a 2 px outline at 2 px offset in the ink of its ground (`ink`, `on-vinyl` on the header band, `on-track` on a track block, `split` on an invalid field).

## Do's and Don'ts

### Do:

- **Do** take every colour, radius and text size from the token block; add a token before adding a one-off value.
- **Do** follow the system theme through `prefers-color-scheme` alone.
- **Do** draw every gap as a land, at least 12 px wide in whole-file views, and keep audio in groove grey.
- **Do** keep vermilion for splits, the silence threshold, danger, invalid states and the header's centre-label mark.
- **Do** read canvas colours from the `--color-…` variables and redraw when the colour scheme changes.
- **Do** give every control a visible keyboard focus ring (2 px outline, 2 px offset) and every icon button an `aria-label`.
- **Do** use `lucide-vue-next` icons at 16 px with a 2 px round stroke.
- **Do** keep figures tabular and text at 12 px or larger.
- **Do** reserve the large button size for the Export action.

### Don't:

- **Don't** use gradients, shadows, blur or translucency over content.
- **Don't** draw a bright blue (or any coloured) waveform, or dress the screen as studio gear.
- **Don't** use vermilion for hover, selection, links, emphasis, progress or branding beyond the centre-label mark.
- **Don't** add a theme toggle or a `data-theme` switch.
- **Don't** fetch fonts or any other asset from the network at runtime.
- **Don't** use Unicode glyphs as icons.
- **Don't** dim text with opacity to make hierarchy; use `muted`, size or weight.
- **Don't** set text below 12 px, or uppercase and letter-space labels to look technical.
- **Don't** introduce a third radius or a second typeface.

## Token block

Paste into the app's single CSS entry (`src/app/styles/main.css`). Light values live in `@theme`; dark values override the same variables in `prefers-color-scheme: dark` only. `@theme static` makes Tailwind emit every variable even when no utility uses it, which the canvases need. The font file name below is the committed file's name; keep the two in step.

```css
@import 'tailwindcss';

@font-face {
  font-family: 'Manrope';
  src: url('./fonts/manrope-variable.woff2') format('woff2');
  font-weight: 200 800;
  font-style: normal;
  font-display: swap;
}

@theme static {
  --font-sans: 'Manrope', ui-sans-serif, system-ui, sans-serif;

  --color-ground: #f7f7f5; /* sleeve white: page behind the panels */
  --color-surface: #ffffff; /* panels, inputs, secondary buttons */
  --color-ink: #121212; /* text, primary button, focus ring */
  --color-muted: #5e6066; /* secondary text, axis labels */
  --color-hairline: #e2e3e0; /* panel borders, row rules, slider track */
  --color-edge: #8a8d93; /* control borders: 3:1 against surface */
  --color-wave: #3a3a3a; /* waveform and loudness curve */
  --color-track: #3a3a3a; /* track blocks in the strip */
  --color-on-track: #ffffff;
  --color-land: #c9ccd1; /* gaps: the smooth band between tracks */
  --color-split: #c8341f; /* centre-label vermilion: splits, threshold, danger, invalid */
  --color-on-split: #ffffff;
  --color-vinyl: #121212; /* header band: the same in both themes */
  --color-on-vinyl: #ededea;
  --color-on-vinyl-muted: #a3a5aa;
  --color-vinyl-edge: #3a3a3a;

  --radius-control: 6px;
  --radius-panel: 8px;

  --text-xs: 12px;
  --text-xs--line-height: 16px;
  --text-sm: 14px;
  --text-sm--line-height: 20px;
  --text-base: 16px;
  --text-base--line-height: 24px;
  --text-lg: 20px;
  --text-lg--line-height: 28px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-ground: #0e0e0e;
    --color-surface: #171717;
    --color-ink: #ededea;
    --color-muted: #a3a5aa;
    --color-hairline: #2a2b2d;
    --color-edge: #6e7076;
    --color-wave: #b9bcc1;
    --color-track: #5c5e63;
    --color-on-track: #ededea;
    --color-land: #383a3e;
    --color-split: #ff5a43;
    --color-on-split: #0e0e0e;
  }
}

@layer base {
  html {
    color-scheme: light dark;
  }
  body {
    @apply bg-ground font-sans text-sm text-ink antialiased;
    font-variant-numeric: tabular-nums;
  }
  ::selection {
    background: var(--color-land);
    color: var(--color-ink);
  }
}

@utility focus-ring {
  @apply outline-2 outline-offset-2 outline-ink;
}
```
