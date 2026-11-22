// DESIGN.md: canvas text is Albert Sans Bold at 12 px.
export const CANVAS_FONT = '700 12px "Albert Sans"'

/*
Canvas text needs Albert Sans loaded, and a canvas does not repaint itself when the font arrives, so
the widgets that draw text call this once after their first draw.
*/
export function redrawWhenFontsLoad(draw: () => void) {
  void document.fonts.ready.then(draw)
}
