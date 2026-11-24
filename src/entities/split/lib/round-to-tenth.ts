// The value on the sliders' 0.1 grid nearest to it. Divided by ten rather than multiplied by 0.1, so 18.3 comes out as 18.3.
export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}
