/*
Where the waveform and the spectrogram strip sit in a zoom panel view, from the view's height in
CSS pixels: the waveform takes the top half and the strip, as tall as it, the bottom half. The
three views draw by it, and the readout reads the pointer by it.
*/
export function zoomLayout(height: number) {
  const waveHeight = height / 2
  return { waveHeight, stripTop: waveHeight, stripHeight: height - waveHeight }
}
