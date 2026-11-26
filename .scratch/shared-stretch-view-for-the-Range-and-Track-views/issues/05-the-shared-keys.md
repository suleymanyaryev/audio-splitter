# 05: The shared keys

**What to build:** `useStretchKeys()` in split-zoom lib, returning `isStretchKeyActedOn(event)`:

- Space toggles the player; a held key is taken but ignored.
- Home takes the playhead back to the start.
- Left and Right seek 1 s, with Shift 10 s, rounded to the millisecond, from the player's playhead.
- Every other key returns false.

The Range view's and the Track view's key handlers ask it first, then their own keys. Each view still registers its page keys and emits `acted`. Enter, Shift+Enter, the track steps, Delete, Backspace, Escape, `X` and `C` stay in the views. The Split view keeps its own keys. Nothing changes for the user.

**Blocked by:** None (can start immediately).

Status: resolved

Spec: `.scratch/shared-stretch-view-for-the-Range-and-Track-views/spec.md` (Implementation Decisions: the shared keys; Testing Decisions).

- [x] A spec, written red first, in a host component with spied player verbs: Space and its auto-repeat, Home, both arrows with and without Shift, no drift over ten steps, other keys returning false.
- [x] Neither view handles Space, Home, Left or Right itself, or keeps its own step constants.
- [x] The Space, Home and arrow cases leave the Range and Track view specs, except one wiring case each ("Space plays the range", "Space plays the track"). The "a key the view acts on" and "Ctrl, Cmd or Alt" cases stay, since they test each view's registration.
- [x] The canvas-view skill's keyboard reference (`isKeyActedOn` in the Range view) still holds.
- [x] No changelog line.
- [x] Final tier passes: code-review, the grouped fixes, then `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.

## Comments

- Status was `open`; taken as ready, as in ticket 01.
- This ticket had no `Final tier passes` box; it is added above because the goal asks for it on the final ticket.
- `isStretchKeyActedOn` is asked first in both views. The Range view's `isKeyActedOn` is then `Enter` alone; the Track view keeps its step, `X`, `C`, Enter, Delete, Backspace and Escape keys.
- The views keep one wiring case each ("Space plays the range" and "…the track"); the Ctrl, Cmd and Alt cases and the "a key the view acts on" cases stay, as they test each view's registration. The canvas-view skill's keyboard section names `useStretchKeys`.
- Code review (Standards and Spec axes, since `c9695d2`) found no hard violation and no behaviour change. Grouped fixes: concept note 08's stale lines on the axis, the keys and `trackExtent`; the Range view's re-wrapped header comment; one tautological spec case (`FRAME_WIDTH` equals 1.5) dropped, as the frame's spec already asserts the width. Left as is, by the spec: the repeated `draw()` set-up and template of the two views (a `pnpm cpd` triage), and the drawers' argument order (the spec fixes the interfaces).
- Final tier: `pnpm verify` (typecheck, 2457 tests, build), `pnpm lint`, `pnpm knip`, `pnpm depcruise` all exit 0.
