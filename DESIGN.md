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

By day the ground is fog and the panels are sleeve white; by night the ground is slate-black, the panels a step lighter and the gaps deep-sea. Ink and audio are graphite, inverted at night. Slate is the colour of what you press, of the header band and of the track blocks. Rust marks splits and the silence threshold, and nothing else. A `data-theme` attribute on `<html>` carries the theme in effect; how it is set is in [docs/architecture.md](docs/architecture.md#the-theme).

The waveforms and the loudness curve are the content, so the chrome is quiet: one face, two small radii, flat colour, and controls that carry state through ink and border rather than colour.

## Colors

Every token has a dark value (`*-dark` in the frontmatter) except `mark`.

**Contrast.** In both themes text holds 4.5:1 against what it sits on, and what is not text but must be seen (a line, a control's border, the focus ring, a fill's edge) holds 3:1. `src/app/styles/__tests__/contrast.spec.ts` checks the pairs the app uses against this rule.

### Primary

- **Rust** (`split`; a lighter orange at night): what the Rust Rule names. It holds 3:1 on a land, so a split line stays visible across a gap.
- **On Rust** (`on-split`): text on a filled rust.
- **Slate Fill** (`fill`, `fill-hover`, `on-fill`; at night a light slate-blue with near-black text): the primary button and primary icon button, the only filled controls. It stands out from the surface without a border.

### Neutral

- **Graphite Ink** (`ink`): text, the slider, the progress fill, the tooltip, the focus ring, and on the canvases what is derived from the audio rather than the audio itself.
- **Label Grey** (`muted`): secondary text, axis times, table headings, field labels, idle counts.
- **Fog Ground** (`ground`): the page behind the panels, and the dialog overlay.
- **Sleeve Surface** (`surface`): panels, inputs, unfilled button fills, the plates behind canvas labels.
- **Hairline** (`hairline`): panel borders, row rules, the empty slider track. Decoration only, never the sole boundary of a control.
- **Control Edge** (`edge`): borders of inputs, outlined buttons and the segmented control; 3:1 on the surface.
- **Graphite Wave** (`wave`): waveform bars, the loudness curve and its fill, the run-out line.
- **Slate Track** (`track`, with `on-track` on it): track blocks. At night a block is close to the strip's land, so blocks are told apart by their names and the split items between them.
- **Sea-Mist Land** (`land`; deep-sea at night): every gap in every view, the track strip's ground, the empty progress track, text selection; as a tint, hover (40%), a chosen option or selected row (50%) and, whole, a pressed plain control.

### Header band

- **Band** (`band`): the header's fill, slate by day and near-black by night.
- **On Band** (`on-band`): header text; the fill and focus ring of the inverse controls.
- **On Band Muted** (`on-band-muted`): quiet header text.
- **Band Edge** (`band-edge`): the band's bottom rule and the file chip's border.
- **Mark** (`mark`): the header's sea-mist mark, the same in both themes; never rust, which falls short of 3:1 on slate.

### Named Rules

**The Rust Rule.** Rust marks a split, the silence threshold, a destructive action or an invalid value, and nothing else: not hover, not selection, not links, not emphasis, not a progress fill, not the brand mark. A split item in the track strip is a split, so it takes rust when it is hovered, focused or selected.

**The Slate Fill Rule.** Only a pressable thing is a slate fill. Panels, tooltips, sliders and progress are never slate.

**The Silence Rule.** A gap is one sea-mist field in every view, never a grey, never a second colour.

**The Graphite Rule.** Audio is drawn in graphite. A waveform or curve is never coloured, never blue, never rust. A track block is slate, as the one block-shaped thing.

## Typography

Albert Sans (with ui-sans-serif, system-ui, sans-serif) at four weights (400, 500, 600, 700), and no other face: calm and exact rather than technical. It ships as one committed variable woff2, the Latin subset, in `src/app/styles/fonts/` (SIL OFL, `OFL.txt` beside it), and is never fetched from the network. Figures are proportional, since Albert Sans has no `tnum`, so nothing sets `font-variant-numeric`. A negative number takes the real minus sign (U+2212, "−35 dB"), never a hyphen.

### Hierarchy

- **Display** (600, 32/36px, `text-display`): the selected split's time, the one large figure on the screen.
- **Headline** (700, 20/28px): the product name and a panel's one big reading. It wraps rather than being cut.
- **Title** (600, 16/24px): panel and dialog titles, the large button's label.
- **Body** (400, 14/20px): default text, table cells, field values.
- **Label** (600, 14/20px): button labels, slider readouts, a running count, the selected row.
- **Caption** (400, 12/16px): axis times, table headings (500), durations, quiet header text.
- **Caption Strong** (600, or 700 for split numbers, 12/16px): the tooltip, the file chip, an invalid field's message.

### Named Rules

**The Twelve-Pixel Floor.** Nothing is set below 12 px, and nothing is uppercased or letter-spaced to look technical.

**The Full-Strength Text Rule.** Text hierarchy comes from size, weight and the `muted` token, never from opacity on text.

## Layout

Desktop Chrome only. The page is the ground with panels laid on it: 32px (`page`) side margins, 24px (`xl`) above the first panel, below the last and between panels, 16px padding inside a panel. Spacing uses Tailwind's 4 px unit, in the frontmatter's `spacing` steps.

A panel's title row comes first: the title on the left, metadata or controls on the right, baseline-aligned for text and centred when it holds a control. Canvas views run the panel's full content width, with three to five Caption times spread edge to edge underneath.

## Elevation & Depth

Flat in both themes. Depth is two layers, the ground and the surface on it, split by a 1 px hairline. State shows as a change of fill or border and the focus ring, never as lift.

### Named Rules

**The Flat Sleeve Rule.** No `box-shadow`, no `drop-shadow`, no gradient, no blur, no translucency over content. If something needs to stand apart, it gets the surface colour, a hairline, or ground around it.

## Shapes

Controls (buttons, fields, the file chip, the track strip and its blocks) have `control` corners, 3px; panels and dialogs `panel` corners, 4px; `full` is for what is round by nature: the slider, progress bars, split chips and the header's mark. Borders are 1px: hairline for panels and rows, control edge for controls, rust for danger and invalid. Canvas outlines are 1.5px ink with square corners.

### Named Rules

**The Two Radii Rule.** 3 px for anything you press or type into, 4 px for a panel, fully round only for tracks, thumbs, bars and chips. No other radius.

## Components

Every kit component lives in `src/shared/ui/` as `Ui<Name>.vue`: a Reka UI 2 primitive or a native element, styled with Tailwind 4 utilities on the tokens. A new look is a prop or variant of the kit component, not a class string at the call site.

**Focus.** Every interactive element shows `focus-visible:focus-ring`, per the Ink Focus Rule. A mouse press takes no focus from a button, a segmented option, a slider thumb or a row's button, so the next key goes to the view on show ([ADR 0002](docs/adr/0002-keys-belong-to-the-view-on-show.md)); Tab still focuses them.

**States.** Every kit control answers the same way:

- Hover is a step toward the control's own look: `fill-hover` on a slate fill, a 40% land tint on a plain control, an ink border on an outlined one.
- Pressed is one step further: `ink` on a slate fill, a full land on a plain control; danger stays filled rust.
- A slider thumb shows the grab cursor at rest, grows on hover and shows the grabbing cursor while pressed.
- Focus is the ring and never changes the fill.
- Disabled is 40% opacity and `cursor-not-allowed`, with no hover or pressed response (those utilities are gated by `enabled:`).

**Motion.** `tint-transition` (colour, background and border, 120 ms ease-out, none under `prefers-reduced-motion`) on controls, table rows and the strip's blocks and split items. The focus ring appears at once. Nothing else animates.

**Icons.** `lucide-vue-next`, 16 px, stroke 2, round caps and joins, `currentColor`; Play, Pause and Square are filled. The set: Play, Pause, Square (stop), SkipBack (back to the start), Plus (add split), Trash2 (delete split), Merge (remove track), Eye and EyeOff (leave out, bring back), X (dismiss), Volume2 and VolumeX (mute, unmute), Download (export to folder), FileDown (single export), BookmarkPlus, Check and BookmarkMinus (add, apply, delete a pending split), CircleQuestionMark (shortcuts), Monitor, Sun and Moon (the theme). Two actions that could be confused never share an icon. Unicode glyphs are never icons; the middle dot and the minus sign are text.

### Buttons

`UiButton`: firm and quiet; ink does the talking, colour only for danger. An icon goes before the label, after it on a "forward" step.

- **Primary:** the slate fill. One per panel at most: the panel's main action.
- **Secondary** (default): `surface` with an `edge` border.
- **Danger:** rust outline and text at rest, filled rust with `on-split` text on hover and pressed. For an action that throws work away.
- **Inverse:** `on-band` fill with `band` text, white on hover, `on-band-muted` while pressed, only on the header band. Its ring is spelled out (`focus-visible:outline-on-band`), not `focus-ring` plus a colour.
- **Sizes:** `md` 36px, `sm` 32px for title rows and table rows, `lg` 40px with Title text for the Export action alone.

A crowded title row uses icon buttons; a button keeps its words where the action needs them (Export, New file, a dialog's actions).

### IconButton

`UiIconButton`: a square holding one icon, styled as a secondary button; `md` 36px, `sm` 32px. The `primary` variant is a title row's one main action; `inverse` is for the header band.

- `label` is required: it is the accessible name and the tooltip.
- `hint` names the key, which the tooltip says after the label ("Add split (Enter)"); the accessible name stays the label.
- `reason` says why the button is off ("Apply or delete pending splits first"), and while set the tooltip says it instead.
- A caller's `class` and listeners go to the button, not to the tooltip around it.

### Tooltip

`UiTooltip`: a `label`, an optional `hint`, and `disabled` for a control whose own text says what it does.

- Opens on hover after 400 ms and on keyboard focus at once; closes on leave, blur, Escape and a press. A disabled button gets its tooltip on hover only.
- An `ink` chip with `surface` Caption Strong text, 4 × 8 px padding, 6 px above the trigger (below it where there is no room). Text only, "Label (Key)": no arrow, no shadow, no animation.

### TextField

`UiTextField`, a native `input`: ink border on hover, the ink ring on focus, 40% when disabled.

- **Default:** 36px tall, `edge` border on `surface`, at most 224px wide. **Wide:** the same across the whole width, for a dialog.
- **Compact:** 24px tall and 176px wide, as tall as a title line, so the header holding it does not grow; its visible label sits 12px to its left in `muted` Caption at weight 500. No invalid state.
- **Inline:** reads as its row's text, transparent until hovered (`edge` border) or focused. No invalid state.
- **Invalid:** `error` sets `aria-invalid`, a rust border and a rust ring; the message sits below in rust Caption Strong, a plain sentence linked by `aria-describedby`.
- **Muted:** `muted` sets the text in `muted`, for a value the user has not typed.

### Slider

`UiSlider`. Focus and ARIA live on the thumb: `aria-label` names the setting and `aria-valuetext` is the readout.

- A 4px `hairline` track with an `ink` range; a 16px `ink` thumb with a 2px `surface` border, 20px on hover.
- The caller sets the width, shared by name, track and readout; a non-compact slider is at least 128px.
- The name sits left in `muted`; the readout right in Label, in a 72px box so the track never shifts as the value changes. Neither wraps.
- **Compact:** no visible name or readout, for a title row.

### SegmentedControl

`UiSegmentedControl`: one choice among a few views; one option is always chosen, and arrow keys move between options. `label` names it.

- 32px tall, `edge` border on `surface`, 2px inner padding; options in Label with 12px side padding.
- **Chosen:** an ink border and a 50% land tint, never a slate fill, so the panel's primary stays its one filled control.
- **Icon option:** an `icon` alone with 8px side padding, its label the tooltip and accessible name.
- **Inverse:** for the header band: a `band-edge` border, `on-band` text and `on-band` tints (15% hover, 20% chosen with an `on-band` border, 30% pressed), and the inverse button's ring.

### Panel

`UiPanel`: a `section` with an `h2`, `panel` corners, a `hairline` border, `surface`, 16px padding. The title row sits 12px above the content; its title is Title, or Headline (`headline`) or Display (`display`) for the panel's one big reading, both holding the row at 36px so switching moves nothing. The right side is `muted` metadata or controls 8px apart, at least 24px from the title; a title-row button is `sm`.

### ProgressBar

`UiProgressBar`: determinate only. A 6px `land` track and an `ink` indicator, with the count in words beside it ("38 / 62 slices"): Label ink while `running`, `muted` otherwise.

### Dialog

`UiDialog`, the alert dialog: a yes-or-no question before losing work. Escape closes it, a press outside does not.

- The overlay is opaque `ground` (the Flat Sleeve Rule): the dialog is the one panel on it.
- The panel frame, centred, 448px wide and never wider than the window less 32px.
- Title, description in Body, optional content, then the actions right-aligned: the choice that keeps things as they are first, so it takes the focus, and the action last, as danger when it discards work.

### Plain dialog

`UiPlainDialog`: information, or a value to enter. It looks like the alert dialog, but Escape and a press outside both close it. `md` is 448px, `lg` 672px for a list. It never exceeds the window less 32px: the content scrolls between the fixed title and the pinned actions.

### Header band

56px tall, 32px side padding. It holds the mark (a 20px `mark` disc with a 6px `band` hole), the product name in Headline, the file chip (Caption Strong), quiet text, and inverse controls only, the theme switch among them.

### Track strip and track blocks

- **Strip:** a 56px `land` ground with `control` corners.
- **Split item:** 8px wide (`SPLIT_ITEM_PX`), full height, only between two blocks: land with a 2px rust rule at rest, wholly rust when hovered, focused or selected. Focus adds the ink ring, so a focused item never reads as selected.
- **Block:** `track` with `on-track` text, its width proportional to the track's length, never under 12px; when the minimums do not fit, the blocks are equal.
- **Selected:** a 2px `on-track` border; the others have a transparent 2px one, so nothing shifts.
- **Left out:** hollow, a dashed `track` border on the land with `ink` text; selected, the dashed border turns `ink`; an ink focus ring.
- **Focus:** the `on-track` ring, inside the block.
- **Text:** the name in Label from 32px wide (4px side padding), the length below in Caption from 72px (10px); narrower, a sliver with no text or padding. Both are always in the `title` and accessible name.

### Split chip and selected row

- The selected split's number is a 20px filled rust disc, Caption Strong `on-split`, wherever it appears.
- Table rows are split by `hairline` rules with 6px vertical padding; a clickable row takes the 40% land tint on hover, the selected one the 50% tint and weight 600.
- A link is underlined in `hairline`, darker on hover, never rust.

### Canvas drawing rules

The whole-file waveform, the loudness curve, the contrast lane and the zoom panel's views are hand-drawn canvases in their widgets. Canvas text is Albert Sans Bold at 12 px (`CANVAS_FONT`). Sizes are CSS pixels.

**Shared marks**

- **Wave:** `wave` vertical bars, 2px wide on a 3px pitch, symmetric about the centre line.
- **Land:** a `land` band with no waveform (the Land Rule). In a whole-file view it is at least 12px wide, centred on its split; a widened land shifts inwards only as far as the canvas edge needs, a lead-in or run-out grows from its edge, and overlapping lands read as one band with each split line at its own time. The zoom panel's views draw lands at their true width.
- **Split line:** `split`, 1.5px wide, the full height of the wave area; the selected split 3px.
- **Confidence mark:** on a split Find splits was less than sure of, 7px up from the foot of its line, in `split` with a 1.5px stroke: a likely split a hollow ring 6.5px across, filled with `surface`; a doubtful one a filled disc 8px across. A sure split, or one the user placed or moved, has none. The track list repeats it at 8px.
- **Dashed line:** 5px dash, 4px gap (`DASH_PATTERN`): the silence threshold, the moving line, the contrast threshold and the mark.
- **Diamond:** where Find splits would add a split (a dip with no gap beside it on the loudness curve, a peak on the contrast lane), an 8px `ink` diamond ringed in 1.5px `surface`, over the split lines; no split, so never rust.
- **Plate:** canvas text over a drawing sits on a `surface` plate 17px tall and the text width + 8px wide.

**Whole-file view**

- 120px tall: a 22px split-number band over a 98px wave area. Lands and split lines cover the wave area only.
- Each split's number is centred on its line in the band, in `split`; the selected one sits in a filled rust circle 20px across, in `on-split`.
- **Zoom window:** in the Split view only, the stretch it shows, outlined in 1.5px `ink` over the wave area, matching the Split view's frame. The Track view outlines its track's stretch the same way.
- **Range overlay:** `ink` at 10% alpha over the wave area with 1px `ink` edges, over the lands and under the split lines, in all three zoom panel views.

**Loudness curve and contrast lane**

- The loudness canvas is 120px; lands and split lines run its full height behind the curve, a 1.5px `wave` line over its area filled in `wave` at 14% alpha.
- **Silence threshold:** a dashed 1.5px `split` line across the width; its label ("−35 dB") is `split` text on a plate above the line at the left, and its handle an 18 × 10px `split` block on the line at the right edge.
- **Moving line:** the loudness around minus the depth, a dashed 1.5px `ink` line, one point per pixel column, left out under the −60 dB floor, under the threshold line.
- **Contrast lane:** its own 80px canvas under the curve, on the same time axis, drawn as the curve is but in `ink`: a 1.5px line over its area at 14% alpha, 0 dB at the bottom to 15 dB at the top, each column holding the highest contrast it covers, with lands and split lines full height. Its label is `muted` text on a plate at the top left. While contrast is on, it adds its threshold, a dashed 1.5px `ink` line with an 18 × 10px `ink` handle at the right edge and no label, and its diamonds; while it is off, neither is drawn.

**Zoom panel views (Split, Track and Range)**

- **Frame:** a 320px canvas framed in 1.5px `ink`, the bars inside it, the waveform in the top half and the spectrogram strip, as tall, under a 1.5px `ink` line.
- **Split view:** the gap is one `land` band with a flat 1px `wave` run-out line at its centre (near-silence, not nothing), and flat `ground` before 0 s and past the file's end. The split is a 3px `split` line with a 14 × 10px handle at its top. The audition's edges are `ink` brackets, never a tint: at each edge a 2px stem, 16px long, down from the top and up from the bottom, each ending in an 8px foot pointing inward; over the ground, under the split lines.
- **Track and Range views:** the stretch fills the canvas, bars on the same pitch, lands at true width over them, split lines full height; the Track view draws its track's end splits on its edges. No run-out line.
- **Mark:** a dashed 1px `ink` line, full height, on a whole pixel, under the playhead; never rust.
- **Pending split:** a solid 2px `ink` line, full height, with an 8px `ink` diamond at the top and bottom edge; selected, 4px with 12px diamonds. Over the split lines, under the mark. Never rust, and no split line, mark or playhead has diamonds.
- **Playhead:** a 1px `ink` line on a whole pixel, always drawn, over the split lines, pending splits and mark, under the frame.
- **Spectrogram strip:** a log frequency axis from 50 Hz to half the sample rate. One hue, from `surface` (80 dB under the file's loudest band value, or quieter) to `ink` (the loudest); a pixel keeps each band's loudest value over its time. Blank outside the file. "100 Hz", "1 kHz" and "10 kHz" are `muted` text on plates at the left edge. Split lines, pending splits, the mark and the playhead cross it; lands and confidence marks stay on the waveform. The pointer's readout ("1.0 kHz · −32 dB") is `ink` Caption on a `surface` plate.
- **Failure:** a failure to play is one line of `muted` text at the bottom centre.

### Named Rules

**The Land Rule.** A gap is always drawn as land, never as waveform, and never narrower than 12 px in a whole-file view.

**The Shared Token Rule.** Canvas code never hard-codes a colour; it reads the `--color-…` variables, so canvases and kit change theme together.

**The Ink Focus Rule.** Keyboard focus is always a 2 px outline at 2 px offset in the ink of its ground (`ink`, `on-band` on the header band, `on-track` on a track block, `split` on an invalid field).

## Do's and Don'ts

### Do:

- **Do** take every colour, radius and text size from a token; add a token before a one-off value.

### Don't:

- **Don't** read `prefers-color-scheme` in CSS, the kit or a canvas. Dark values key on `[data-theme='dark']`, which only the theme module and the head script in `index.html` set.

## Tokens

The tokens live in `src/app/styles/main.css`, the one CSS entry; the frontmatter holds the same values for the design tools. Light values sit in `@theme static`, which emits every variable for the canvases; dark values override them in one `[data-theme='dark']` block. It also defines the `focus-ring` and `tint-transition` utilities.
