// DESIGN.md: canvas text is Manrope Bold at 12 px.
export const CANVAS_FONT = '700 12px Manrope'

/*
Canvas text needs Manrope loaded, and a canvas does not repaint itself when the font arrives, so
the widgets that draw text call this once after their first draw.
*/
export function redrawWhenFontsLoad(draw: () => void) {
  void document.fonts.ready.then(draw)
}
