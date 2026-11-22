// The speed as the slider and its button read it: one decimal and the multiplication sign (U+00D7).
export function formatPlaySpeed(speed: number): string {
  return `${speed.toFixed(1)}×`
}
