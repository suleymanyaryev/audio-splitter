// The pointer's horizontal position in the element's own pixels: what the axis maps to a time.
export function pointerX(event: MouseEvent) {
  const { left } = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return event.clientX - left
}
