# 05: Brand assets

**What to build:** everything that shows the app outside its own page matches Next to Silence: the link preview image and its alt text, the tab icon, the touch and installed-app icons, the manifest's colours and the page's `theme-color`. Use the `impeccable` skill (its asset producer for rasters).

**Blocked by:** 04

**Status:** resolved

Spec: `.scratch/ui-polish/spec.md` (stories 41–42; Implementation Decisions, "Issue 2", brand assets)

- [x] The link preview image shows the new look (both the image and the `og:image:alt` and Twitter alt text, which today say "red split lines").
- [x] The SVG favicon, the ICO, the touch icon and the 192 and 512 app icons carry the new mark and colours.
- [x] The manifest's `background_color` and `theme_color` and the page's `theme-color` match the header band.
- [x] Each new raster records where it came from (source file or script, and how it was made), as the direction contract's finish line asks.
- [x] Checked by hand: the tab icon in both themes, and the preview image at its real size.
- [x] CHANGELOG line under Unreleased (Changed) only if 03's or 04's line doesn't already cover it.

## Comments

- Provenance: every raster in `public/` is made by `.impeccable/brand/make-brand-assets.sh` from `og-image.html` (the preview, in Albert Sans from `src/app/styles/fonts`, with a seeded bar generator so a rerun is identical), `mark.svg` (the favicon, copied) and `mark-bleed.svg` through `icon.html` (the touch icon, the 192 and 512 icons, and the 16, 32 and 48 px images packed into `favicon.ico`). The script renders them as Chrome screenshots through `playwright-cli`, so the PNGs have no alpha; the ICO and the app icons therefore use the full-bleed square, and the disc sits inside the central 80% so a maskable crop is safe. It was run once from the repo root to produce the committed files. The old rasters had no recorded source.
- Made by the `impeccable-asset-producer` agent from the palette in `DESIGN.md`; the mark is the header's: a sea-mist disc with a slate hole, never rust.
- `theme-color` is a pair of media-keyed tags (slate `#26343a` for a light OS, `#0b1012` for a dark one), as the header band has two values. It follows the OS, not the in-app switch, so Light under a dark OS (or the reverse) tints the browser's chrome with the other band. The manifest cannot switch, so `background_color` and `theme_color` are the light band's `#26343a`. If the switch should drive the tag, the inline head script and the theme module would set it; not done here.
- By hand (Chrome): `favicon.svg` and `favicon.ico` at 16, 32 and 48 px on a white and a `#202124` tab background, all legible; the preview at its real 1200 x 630 size (read at full size, headline and split numbers legible).
- DESIGN.md: no change; it names no asset. `.impeccable/design.json` still carries the old colours (06 regenerates it).
- GLOSSARY candidate: none. ADR candidate: none.
