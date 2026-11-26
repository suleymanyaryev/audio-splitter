# 05: The shared keys

**What to build:** `useStretchKeys()` in split-zoom lib, returning `isStretchKeyActedOn(event)`:

- Space toggles the player; a held key is taken but ignored.
- Home takes the playhead back to the start.
- Left and Right seek 1 s, with Shift 10 s, rounded to the millisecond, from the player's playhead.
- Every other key returns false.

The Range view's and the Track view's key handlers ask it first, then their own keys. Each view still registers its page keys and emits `acted`. Enter, Shift+Enter, the track steps, Delete, Backspace, Escape, `X` and `C` stay in the views. The Split view keeps its own keys. Nothing changes for the user.

**Blocked by:** None (can start immediately).

Status: open

Spec: `.scratch/shared-stretch-view-for-the-Range-and-Track-views/spec.md` (Implementation Decisions: the shared keys; Testing Decisions).

- [ ] A spec, written red first, in a host component with spied player verbs: Space and its auto-repeat, Home, both arrows with and without Shift, no drift over ten steps, other keys returning false.
- [ ] Neither view handles Space, Home, Left or Right itself, or keeps its own step constants.
- [ ] The Space, Home and arrow cases leave the Range and Track view specs, except one wiring case each ("Space plays the range", "Space plays the track"). The "a key the view acts on" and "Ctrl, Cmd or Alt" cases stay, since they test each view's registration.
- [ ] The canvas-view skill's keyboard reference (`isKeyActedOn` in the Range view) still holds.
- [ ] No changelog line.
