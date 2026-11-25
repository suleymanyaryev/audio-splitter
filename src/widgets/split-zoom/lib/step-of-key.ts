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

/*
`{` and `}` are the same two keys with Shift, and step through the splits by confidence instead:
-1 for `{` and 1 for `}`, or null for another key, one without Shift, or a repeat. They are matched
by the physical key like `[` and `]`, so a layout that types another character on them still works,
except one that types `?` there (Dvorak): `?` opens the shortcuts dialog, which keeps it.
*/
export function confidenceStepOfKey(event: KeyboardEvent): -1 | 1 | null {
  const isOther = !event.shiftKey || event.repeat || event.key === '?'
  return isOther ? null : (STEP_BY_CODE[event.code] ?? null)
}
