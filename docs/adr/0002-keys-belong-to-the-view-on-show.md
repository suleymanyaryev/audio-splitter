# Keys belong to the view on show, not to the focused element

The review screen's keys (Space, Enter, Shift+Enter, Left/Right, Home, Delete/Backspace, Escape) used to listen on the Split, Track and Range views' own elements, so they worked only while that element had focus, and a click anywhere else on the screen silently turned them off. They now listen on the whole page, and the view on show in the zoom panel acts on them wherever the focus is. Only one of the three views is mounted at a time, so a key never has two owners. The view stays out of the way when focus is in a text field, when a dialog is open, when Ctrl, Cmd or Alt is held, and when a control reached with Tab uses that key itself. The controls a click lands on (the `Ui*` kit and the track list's and track strip's own buttons) don't take focus from a mouse click, so a click leaves the keys with the view.

## Considered Options

- **A focused button keeps Space and Enter after a mouse click.** Rejected: after any click, Space would press that button again instead of playing, which is the original complaint.
- **The view takes Space and Enter even from a button reached with Tab.** Rejected: keyboard-only use would break.
- **A panel button gives up focus after it acts**, as `focusStretchView()` and `focusHandle()` used to do. Rejected: a keyboard user who Tabbed to a button chose to be there, and the hand-back code was what failed on every other click.
