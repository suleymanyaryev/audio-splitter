interface ShortcutRow {
  // The key or the pointer gesture, as the user does it.
  input: string
  // What it does.
  does: string
}

export interface ShortcutSection {
  // `split`, `track` and `range` are the panel's views, so the dialog can put the one on show first.
  id: 'split' | 'track' | 'range' | 'whole-file' | 'track-list'
  title: string
  rows: ShortcutRow[]
}

/*
Every key and pointer gesture of the review screen, written out by hand: the dialog describes the
screen and does not read it, so a change to a key or a gesture changes its row here, in the same
commit. The order is the order of the screen's panels, with the panel's three views first.
*/
export const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    id: 'split',
    title: 'Split view',
    rows: [
      { input: 'Drag the split’s line or handle', does: 'Move the selected split' },
      { input: 'Click', does: 'Move the playhead there' },
      {
        input: 'Drag',
        does: 'Move the playhead along the audition; a playing audition pauses while it is held',
      },
      { input: 'Left / Right', does: 'Move the selected split 10 ms (Shift: 100 ms)' },
      { input: 'Delete / Backspace', does: 'Delete the selected split' },
      { input: 'Space', does: 'Play or pause the audition' },
      { input: ', / .', does: 'Move the playhead 100 ms back or forward (Shift: 1 s)' },
      { input: 'Home', does: 'Go back to the audition’s start' },
    ],
  },
  {
    id: 'track',
    title: 'Track view',
    rows: [
      { input: 'Click', does: 'Place the mark, the dashed line' },
      { input: 'Double-click', does: 'Move the playhead there' },
      {
        input: 'Double-click an end split’s line',
        does: 'Select that split and open the Split view',
      },
      {
        input: 'Drag the playhead',
        does: 'Move the playhead along the track; a playing track pauses while it is held',
      },
      {
        input: 'Click a pending split',
        does: 'Select it; click anywhere else to let go of it',
      },
      { input: 'Left / Right', does: 'Move the playhead 1 s (Shift: 10 s)' },
      { input: 'Enter', does: 'Add a pending split at the mark and select it' },
      {
        input: 'Shift+Enter',
        does: 'Add a pending split at the playhead, without selecting it or stopping the sound',
      },
      { input: 'Delete / Backspace', does: 'Delete the selected pending split' },
      { input: 'Escape', does: 'Let go of the selected pending split' },
      { input: 'Space', does: 'Play or pause the track' },
      { input: 'Home', does: 'Go back to the track’s start' },
    ],
  },
  {
    id: 'range',
    title: 'Range view',
    rows: [
      { input: 'Click', does: 'Place the mark, the dashed line' },
      { input: 'Double-click', does: 'Move the playhead there' },
      {
        input: 'Double-click a split’s line',
        does: 'Select that split and open the Split view',
      },
      {
        input: 'Drag the playhead',
        does: 'Move the playhead along the range; a playing range pauses while it is held',
      },
      { input: 'Left / Right', does: 'Move the playhead 1 s (Shift: 10 s)' },
      { input: 'Enter', does: 'Add a split at the mark' },
      {
        input: 'Shift+Enter',
        does: 'Add a split at the playhead, without stopping the sound',
      },
      { input: 'Space', does: 'Play or pause the range' },
      { input: 'Home', does: 'Go back to the range’s start' },
    ],
  },
  {
    id: 'whole-file',
    title: 'Whole-file view',
    rows: [
      { input: 'Click a split’s line', does: 'Select that split' },
      { input: 'Click elsewhere', does: 'Move the zoom window there' },
      {
        input: 'Drag across the waveform',
        does: 'Mark out a range of 1 s to 10 min and open the Range view',
      },
    ],
  },
  {
    id: 'track-list',
    title: 'Track list',
    rows: [
      { input: 'Click a row', does: 'Select that track or split' },
      { input: 'Type in a name', does: 'Name the track' },
      { input: 'Enter in a name', does: 'Save the name' },
      { input: 'Escape in a name', does: 'Put the old name back' },
      {
        input: 'Merge button on a track',
        does: 'Remove the track, merging it with its neighbours',
      },
      { input: 'Trash button on a split', does: 'Delete the split' },
    ],
  },
]
