# 05: Brand assets

**What to build:** everything that shows the app outside its own page matches Next to Silence: the link preview image and its alt text, the tab icon, the touch and installed-app icons, the manifest's colours and the page's `theme-color`. Use the `impeccable` skill (its asset producer for rasters).

**Blocked by:** 04

**Status:** ready-for-agent

Spec: `.scratch/ui-polish/spec.md` (stories 41–42; Implementation Decisions, "Issue 2", brand assets)

- [ ] The link preview image shows the new look (both the image and the `og:image:alt` and Twitter alt text, which today say "red split lines").
- [ ] The SVG favicon, the ICO, the touch icon and the 192 and 512 app icons carry the new mark and colours.
- [ ] The manifest's `background_color` and `theme_color` and the page's `theme-color` match the header band.
- [ ] Each new raster records where it came from (source file or script, and how it was made), as the direction contract's finish line asks.
- [ ] Checked by hand: the tab icon in both themes, and the preview image at its real size.
- [ ] CHANGELOG line under Unreleased (Changed) only if 03's or 04's line doesn't already cover it.
