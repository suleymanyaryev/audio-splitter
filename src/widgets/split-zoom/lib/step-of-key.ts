/*
`[` and `]` step to the previous and next track or split. They are matched by the physical key, to
the right of P, not by the character it types: on a German or similar layout `[` and `]` need AltGr
or Option, and the page keys leave a key with Alt to the browser, so a match on `event.key` would
never arrive.
*/
const STEP_BY_CODE: Record<string, -1 | 1> = { BracketLeft: -1, BracketRight: 1 }

/*
The step the key asks for, -1 or 1, or null when it is not one: another key, or one with Shift,
which is left free, or a repeat (the views' headers say why).
*/
export function stepOfKey(event: KeyboardEvent): -1 | 1 | null {
  return event.shiftKey || event.repeat ? null : (STEP_BY_CODE[event.code] ?? null)
}
