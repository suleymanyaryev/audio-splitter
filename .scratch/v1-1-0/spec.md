# v1.1.0: pending splits, single export and a quieter review panel

Status: resolved

A minor release outside the milestone sets (CHANGELOG.md's version rules: new capabilities, nothing the export already writes changes). Vocabulary is in `GLOSSARY.md`; this spec adds **Pending split** and **Single export** and widens **Mark**, **Selected track**, **Track view** and **Playhead** (see Further Notes).

## Problem Statement

Reviewing a long file works, but it is slow in the places I spend most time.

- I cannot set how loud the sound is while I review; I turn the whole computer down and forget to turn it back up.
- After a file is analysed the app lands on the first split, but the first thing I want is to hear the first track.
- I can only export every track at once, into a new folder. When I want one track, or a stretch I dragged out, I export the whole file and throw the rest away.
- The zoom panel's title row is a row of labelled buttons that grows with every feature, and nothing tells me which keys exist: I found Enter in the Range view by accident.
- In the Range view a single click near a split line throws me out to the Split view when I only wanted to place the mark, the arrow keys move the mark when I want to move through the sound, and I cannot put a split where I am hearing it.
- In the Track view I cannot add a split at all. When I listen to a long track and hear where two songs meet, I have to leave the Track view, drag a range, find the spot again and add the split there. A click in the Track view also moves the playhead, so I lose my place every time I point at something.

## Solution

- **Volume**: a mute button and a volume slider at the end of the zoom panel's title row set how loud I hear the sound, in all three views. It changes only what I hear, never an exported file, and it is remembered across a reload.
- **The first track after analysis**: a freshly analysed file opens on track 1 in the Track view, and a setting change lands on track 1 too.
- **Single export**: "Export track…" in the Track view and "Export range…" in the Range view write one file. A name dialog opens with a sensible name filled in; I confirm, the first time I pick a folder, and later single exports of the same file go to that folder with no picker. A track's confirmed name also becomes the track's name.
- **Icon buttons with tooltips**: every button in the zoom panel's title row and the Track list's two buttons become icon buttons whose tooltips say what they do and their key. A `?` button in the header, or the `?` key, opens a dialog listing every key and pointer gesture of the review screen.
- **Range view**: a click places the mark, wherever it lands; a double-click moves the playhead there, or, on a split line, opens that split in the Split view. Left and Right move the playhead. Enter adds a split at the mark, Shift+Enter at the playhead.
- **Track view**: it works like the Range view (click for the mark, double-click for the playhead, arrows move the playhead), and it gains **pending splits**: spots in the track I mark while listening, which become splits only when I apply them. I add one at the mark or at the playhead, select one to delete it, and apply them all at once, which takes me to the Split view on the first new split so I can fine-tune it. Nothing I do loses pending splits without asking me first.

## User Stories

### Volume

1. As a user, I want a volume slider in the zoom panel's title row, so that I can set how loud I hear the sound without touching my computer's volume.
2. As a user, I want the volume to step in decibels, so that every step sounds like the same change in loudness.
3. As a user, I want a mute button beside the slider, so that I can silence the sound at once and bring it back at the same level.
4. As a user, I want the volume and mute to work the same in the Split view, the Track view and the Range view, so that one setting covers every kind of listening.
5. As a user, I want the volume to apply to sound that is already playing, so that I can turn it down mid-track.
6. As a user, I want the volume never to change an exported file, so that turning it down while I review cannot ruin my tracks.
7. As a user, I want the volume and mute I chose to be there after a reload, so that I do not set them again every session.
8. As a user, I want the volume to start at full and unmuted the first time, so that the app sounds as the file does until I change it.
9. As a user with a screen reader, I want the slider to read its level in decibels and the mute button to say whether it mutes or unmutes, so that I know where I am.

### The first track after analysis

10. As a user, I want a freshly analysed file to open with track 1 selected in the Track view, so that I can press Play and hear the first track straight away.
11. As a user, I want a change of the silence threshold or the minimum gap length to select track 1 again, so that I land somewhere sensible after every split is found again.
12. As a user in the Range view, I want a setting change to leave me in the Range view, so that the stretch I am listening to stays on screen.
13. As a user, I want the zoom window to start at the file's start after an analysis, so that switching to the Split view shows the opening seconds.

### Single export of a track

14. As a user, I want an "Export track…" button in the Track view's title row, so that I can write the selected track as one file without exporting the rest.
15. As a user, I want a name dialog to open with the track's name filled in, so that I can press OK when the name is already right.
16. As a user, I want an unnamed track's dialog to open with `<source stem> NN`, so that the default says where the file came from, as its title tag would.
17. As a user, I want to press Enter in the name field to confirm, so that a single export takes one key after the dialog opens.
18. As a user, I want OK disabled while the name is empty, so that I cannot write a nameless file.
19. As a user, I want the name to be held to the same length as a track name, so that the dialog and the Track list agree.
20. As a user, I want a name I changed in the dialog to become the track's name, so that the track has one name, in the Track list and in a later full export.
21. As a user, I want leaving the default unchanged not to rename an unnamed track, so that pressing OK is not an edit.
22. As a user, I want the file to be named `NN name.ext` exactly as the full export would name it, so that a single export of track 3 matches track 3 of a later full export.
23. As a user, I want the file to carry the same title, track number and album tags as the full export writes, so that it sorts and shows in a player like the others.
24. As a user, I want "Export track…" disabled while the track has pending splits, with a tooltip saying to apply or delete them first, so that I do not export a track I am about to split.

### Single export of the range

25. As a user, I want an "Export range…" button in the Range view's title row, so that I can write the stretch I dragged out as one file.
26. As a user, I want the range's dialog to open with `<source stem> <start>–<end>`, the times with dots in place of colons, so that the default name says which stretch it is and is a valid file name.
27. As a user, I want the range's file to be named `<name>.ext` with no track number, so that it is not mistaken for one of the tracks.
28. As a user, I want the range's file tagged with the name as its title and the source stem as its album, and no track number, so that a player shows it sensibly.
29. As a user, I want exporting a range to change no track name, so that a range never renames anything.

### Single export: the folder and the run

30. As a user, I want to pick a folder the first time I export a single file, so that I choose where my files go.
31. As a user, I want later single exports of the same file to go to that folder with no picker, so that cutting several tracks is a name and OK each.
32. As a user, I want a "Change folder" link in the name dialog, so that I can send the next file elsewhere.
33. As a user, I want the folder forgotten when I load a new file, so that one file's tracks do not land in another's folder by mistake.
34. As a user, I want closing the folder picker to leave the name dialog open, so that I can try again or cancel.
35. As a user, I want the file written straight into the folder, with no subfolder, so that single files land where I put them.
36. As a user, I want an existing file never to be overwritten, the new one taking ` (2)`, ` (3)` and so on, so that exporting the same track twice is safe.
37. As a user, I want confirming the name to stop whatever is playing, so that the export is not slowed by decoding sound.
38. As a user, I want only opening the dialog not to stop the sound, so that I can keep listening while I think of a name.
39. As a user, I want the dialog to stay open with a progress state while the file is written, and a Cancel that stops it, so that I can see it working and take it back.
40. As a user, I want the dialog to close on success and a line at the bottom of the view to say "Saved `<file>` in `<folder>`" with the name actually used, so that I know where the file went.
41. As a user, I want that line to go at my next press or key in the view, a view switch or a selection change, so that it does not linger.
42. As a user, I want a failure shown in the dialog with its reason, and no half-written file left behind, so that I can retry.
43. As a user, I want a single export and the full export never to run at once, so that one cannot corrupt the other.

### Icon buttons and tooltips

44. As a user, I want every button in the zoom panel's title row to be an icon button, so that the row stays one tidy line however many actions a view has.
45. As a user, I want a tooltip on each icon button saying what it does, so that I do not have to guess what an icon means.
46. As a user, I want the tooltip to name the key when there is one, for example "Add split (Enter)", so that I learn the keys by using the buttons.
47. As a keyboard user, I want a tooltip to show when the button takes focus, not only on hover, so that I get the same help.
48. As a user, I want the Play button's icon and tooltip to follow its state (Play, Pause, Stop), so that the tooltip never says the opposite of what a press does.
49. As a user, I want the Track list's merge and trash buttons to show tooltips ("Remove track N", "Delete split at …"), so that I can tell the two apart before I press.
50. As a user, I want the `Split | Track | Range` control, "Export to folder…" and "New file" to keep their words, so that the big, rare actions stay unmistakable.
51. As a screen reader user, I want each icon button's accessible name to be its tooltip's action, so that the icons cost me nothing.

### The shortcuts dialog

52. As a user, I want a `?` button in the header on the review screen, so that I can find every key and gesture in one place.
53. As a user, I want the `?` key anywhere on the review screen to open the same dialog, so that help is one key away.
54. As a user typing a track name or an export name, I want `?` to type a question mark, so that help does not interrupt my typing.
55. As a user, I want the dialog to list the keys and pointer gestures of the Split view, the Track view, the Range view, the whole-file view and the Track list, with the view I am in first, so that what I need now is at the top.
56. As a user, I want the dialog to list the double-click and drag gestures as well as the keys, so that the gestures I would never discover by chance are written down.
57. As a user, I want Escape or a click outside to close the dialog, so that it gets out of the way at once.

### Range view

58. As a user, I want a single click in the Range view to place the mark where I click, even near a split line, so that pointing never throws me out of the view.
59. As a user, I want a double-click in the Range view to move the playhead there, so that I can listen from any point without dragging the playhead.
60. As a user, I want a double-click within 6 px of a split line to select that split and open the Split view, so that I can still reach a split from the Range view on purpose.
61. As a user, I want a press within 6 px of the playhead to keep dragging it, so that the drag I know still works.
62. As a user, I want Left and Right to move the playhead 1 s, with Shift 10 s, as in the Track view, so that the arrow keys move through the sound in both views.
63. As a user, I want the mark placed with the pointer only, so that the arrow keys mean one thing.
64. As a user, I want Enter to add a split at the mark, as it does today, so that what I know keeps working.
65. As a user, I want Shift+Enter to add a split where the playhead is, while the range plays, so that I can put a split exactly where I hear a track start.
66. As a user, I want a split added at the playhead to land on the 10 ms grid and to be refused within 1 s of another split or the file's ends, so that it obeys the same rules as every other split.
67. As a user, I want a split added from the Range view not to stop the sound or leave the view, so that I can mark several starts in one listen.
68. As a user, I want a held Enter or Shift+Enter not to add splits over and over, so that one press is one split.
69. As a screen reader user, I want the Range view to be a slider on the playhead, so that it reads the time I am at.

### Track view: pointer and keys

70. As a user, I want a click in the Track view to place the mark, a dashed line, and leave the playhead where it is, so that pointing at something does not lose my place.
71. As a user, I want a double-click in the Track view to move the playhead there, so that I can listen from any point.
72. As a user, I want a double-click within 6 px of one of the track's end split lines to select that split and open the Split view, so that I can reach a track's edges from it.
73. As a user, I want a press within 6 px of the playhead to drag it, so that scrubbing works as before.
74. As a user, I want the Track view's mark to be its own, kept while the same track stays selected and cleared when another track is selected, so that the Range view's mark and the Track view's never mix.
75. As a user, I want Left and Right to keep moving the playhead 1 s, with Shift 10 s, Space to play or pause and Home to go back to the track's start, so that the keys I know stay.

### Track view: pending splits

76. As a user, I want an "Add pending split" button in the Track view's title row, enabled only when there is a mark, so that I can mark where a new track should start.
77. As a user, I want "Add pending split" and Enter to add a pending split at the mark and select it, so that I see at once which one I made.
78. As a user listening to a long track, I want Shift+Enter to add a pending split where the playhead is, without selecting it, so that I can tap along as the track plays and each tap is taken.
79. As a user, I want a pending split to be refused within 1 s of another pending split or of the track's ends, with "Add pending split" disabled when the mark is that close, so that applying them always makes valid tracks.
80. As a user, I want a pending split drawn in its own way, never mistaken for a split, the mark or the playhead, so that I can tell what is decided from what is not.
81. As a user, I want a press within 6 px of a pending split to select it, so that I can act on one.
82. As a user, I want a selected pending split drawn as selected, so that I know which one Delete will remove.
83. As a user, I want a "Delete pending split" button to appear only while one is selected, so that the row shows only what I can do now.
84. As a user, I want Delete or Backspace to delete the selected pending split, so that I do not reach for the button.
85. As a user, I want Escape, or a click anywhere else in the view, to deselect it, so that getting out is easy.
86. As a user, I want "Add pending split" disabled while a pending split is selected, so that I finish with the selected one first.
87. As a user, I want pending splits not to move, so that a pending split stays a quick note; I delete it and add another to change it.
88. As a user, I want an "Apply" button, enabled while there is at least one pending split, so that I turn them all into splits at once.
89. As a user, I want Apply to work whether or not a pending split is selected, so that I never need an extra click before applying.
90. As a user, I want applying to add one split per pending split, each counting as an added split, so that the edit count says what I changed.
91. As a user, I want Apply to take me to the Split view with the first new split selected and centred, so that I can fine-tune each new split to 10 ms straight away.
92. As a user, I want pending splits shown only in the Track view, so that the whole-file view, the strip and the Track list show only real tracks and splits.
93. As a user, I want pending splits kept when I switch to the Split or Range view and back while the track stays selected, so that a look elsewhere costs nothing.

### Not losing pending splits

94. As a user with pending splits, I want selecting another track, a split, or empty ground on the whole-file view to ask "Discard N pending splits?" with Apply first, Discard and Cancel, so that a stray click does not lose a listen's work.
95. As a user, I want the same question before a Track list trash or merge button deletes one of the track's end splits, so that every path that would lose them asks.
96. As a user, I want a double-click on an end split line in the Track view to ask the same question, so that the gesture is no exception.
97. As a user, I want "Apply first" to apply my pending splits and then do what I asked for, so that I lose neither.
98. As a user, I want "Discard" to drop them and then do what I asked for, and "Cancel" to do nothing, so that the choices mean what they say.
99. As a user, I want the "Replace your edits?" question before a setting change to count my pending splits too, and to be asked when I have pending splits but no edits, so that a setting change never loses them silently.
100. As a user, I want the "Discard your edits?" question before "New file" to count my pending splits too, so that loading another file never loses them silently.

## Implementation Decisions

- **The split store owns pending splits, both marks and the discard question.** It is the one place every widget and the page already read, so no widget learns about pending splits beyond drawing them.
  - Pending splits are a list of times belonging to the selected track, plus an optional selected one. They exist only while a track is selected; the list empties whenever the selection stops being that track, its start or end split moves or goes, a detection runs, or the store resets.
  - Adding takes a time and a flag for whether to select the new one: at the mark selects it (button and Enter), at the playhead does not (Shift+Enter). Adding is refused within 1 s of another pending split or of the track's ends, and at the mark while a pending split is selected. Times are on the 10 ms grid.
  - Deleting removes the selected one; deselecting clears the selection only.
  - Applying inserts one split per pending split through the same insert path as any added split (each an added edit), empties the list, selects the first new split, centres the zoom window on it and switches the view to `split`.
  - The mark becomes one per view: the Range view's (as today: cleared by a new range, held inside the range) and the Track view's (cleared when the selected track changes, held inside the track).
  - The Range view gains adding a split at a given time (the playhead), with the same room rule as adding at the mark and without selecting it.
  - **The discard question**: an action that would empty a non-empty pending list (selecting a split or another track, moving the zoom window, deleting a split at the track's ends, removing this track or a neighbour) does not run. It is held as the store's single open question, carrying the pending count. The store answers it three ways: apply first (apply, then run the held action), discard (empty the list, then run it), cancel (forget it). An action arriving while a question is open is ignored, as the replace guard does today. Selecting the track that is already selected, and switching the view, ask nothing.
  - The existing "Replace your edits?" guard and the "Discard your edits?" question before "New file" ask when there are edits or pending splits, and their text counts both. They keep their buttons; they have no "Apply first".
  - Detection selects track 1 and sets the zoom window to the file's start. The first detection shows the Track view; a later one keeps the Range view if it is on show and shows the Track view otherwise.
- **The player store owns the volume.** Volume is a level in decibels from −40 dB to 0 dB in 1 dB steps, applied as a linear gain on the one audio element, plus a mute flag; the element is created lazily, so the level is applied when it is made and on every change. Both are saved to and read from `localStorage`, each read and write wrapped so a blocked storage leaves the defaults (0 dB, unmuted). The export never passes through the element, so the volume cannot reach a file.
- **The press helper gains the new order.** One helper serves both views, given what each view has:
  - press: within 6 px of the playhead, drag it; else within 6 px of a pending split (Track view), select it; else place the mark (and deselect any pending split). Split lines are never hit by a single press.
  - double-click: within 6 px of a split line (the Range view's splits, the Track view's two end splits), select that split; else move the playhead there.
- **The Range view and the Track view take the same keys**: Left/Right 1 s and Shift 10 s on the playhead, Space play/pause, Home to the start, Enter at the mark, Shift+Enter at the playhead, auto-repeat ignored for Space, Enter and Shift+Enter. The Track view adds Delete/Backspace for the selected pending split and Escape to deselect it. Both views are a slider on the playhead. Keys work while the view has focus; a title-row button that acts on the view gives focus back to it.
- **The Track view draws pending splits** between the split lines and the mark, in a look that no split, mark or playhead has; the selected one drawn heavier. The exact look is a design pass, recorded in DESIGN.md.
- **Single export is a store beside the full export**, in the same widget, sharing its file writing (with clean-up on failure), file-name sanitising, number padding and tags.
  - It is opened with a subject: a track (its number, the user's own name or none, its start and end, the track count) or the range (its start and end). It holds the default name, the remembered folder (forgotten when the source file changes), its status (idle, naming, running, saved, failed), the saved file and folder names, and a failure.
  - Confirming: pick the folder if none is remembered (a closed picker leaves the dialog open); work out the file name, adding ` (2)`, ` (3)` … against the folder's entries; for a track whose name the user changed, rename the track first; cut and write. Cancel stops the cut, as the full export's does.
  - Track file names and tags are the full export's for that track. The range's file is `<name>.ext` with title and album tags and no track tag. The range's default name is the source stem and the range's start and end as `h.mm.ss`.
  - It refuses to start while the full export runs, and the full export refuses while it runs.
  - The page stops playback when the name is confirmed (the store cannot import the player), as it does before the full export.
- **The UI kit**:
  - **Tooltip**: a tooltip in DESIGN.md's look on Reka's tooltip, opening on hover and on keyboard focus. The icon button always shows its label as a tooltip and takes an optional key hint shown after it.
  - **Dialog**: an ordinary dialog (closes on Escape and a click outside) beside the existing alert dialog, for the shortcuts dialog and the name dialog.
- **The review page**:
  - Title rows, in order. Split: the control, Add split, Delete split, Play across split, then the volume. Track: the control, Add pending split, Apply, Delete pending split (only while one is selected), Back to track start, Play, Export track…, then the volume. Range: the control, Add split, Back to range start, Play, Export range…, then the volume.
  - Every button there is an icon button with its tooltip and key; Play's icon and tooltip follow its state.
  - It shows the discard question (Apply first, Discard, Cancel) from the store's open question, the name dialog from the single-export store, and the saved line at the bottom of the view.
- **The header** shows a `?` icon button on the review screen that opens the shortcuts dialog; the review page listens for `?` page-wide and ignores it while a text field has focus. The dialog's content is static, ordered with the view on show first.
- The Track list's two icon buttons gain their tooltips; nothing else in the list changes.
- No change to detection, the loudness view, the audition's 8 s, the full export's files, folders or tags, or the supported formats.

## Testing Decisions

- A good test drives a module through its public interface and checks what a user or a caller sees: store state after an action, the calls sent to ffmpeg or the folder, a component's ARIA, its tooltips and the store actions it calls. It never reaches into private variables or canvas pixels; canvas drawing stays untested beyond its pure helpers, as today.
- **Split store** (prior art: the split store spec) is the main seam:
  - pending splits: adding at the mark (selected) and at a time (not selected); the 1 s rule against each other and the track's ends; refused at the mark while one is selected; delete; deselect; apply (splits inserted, added edits, selection on the first new split, window centred, view `split`); emptied when the track's ends move, on detection and on reset; kept across view switches;
  - the marks: one per view, cleared on a new range and on another selected track, held inside their stretch;
  - adding a split at the playhead in the Range view: the grid, the room rule, no selection change;
  - the discard question: each discarding action held with the count; apply first, discard and cancel; a second action ignored while one is open; no question with no pending splits, for the selected track again, or for a view switch;
  - detection: track 1 selected, the window at the start, the view on first and later detections.
- **The replace guard** (prior art: its spec) asks with pending splits and no edits.
- **Player store** (prior art: the audition store spec with a fake `Audio`): the volume and mute applied to a new element and to a playing one; the saved values read back; blocked storage falling back to the defaults.
- **Single-export store** (prior art: the full export store spec with fake folder handles and a stubbed cut): a track and a range end to end; the folder picked once and remembered, forgotten on a new file, re-picked by "Change folder"; a closed picker; ` (2)` and ` (3)`; renaming only when the name changed; the tags and file names; cancel; a failure leaving no file; refusing while the full export runs and the other way round.
- **Range default-name helper** (prior art: the range title and source stem specs).
- **Press helper** (prior art: its spec): the press order with pending splits; split lines ignored by a single press; double-click on a split line and elsewhere.
- **Components** (prior art: the Range view, Track view, Track list, review page, App and kit specs):
  - Range view and Track view: their keys (arrows, Shift, Space and Enter without auto-repeat, Shift+Enter, Home, Delete, Backspace, Escape) and slider ARIA;
  - review page: each view's title row, icon names, tooltips with keys, enabled states (Export track with pending splits, Add pending split with a selected one), the discard question's three answers, the name dialog's default, Enter and empty name, the saved line, `?` opening the shortcuts dialog and being typed in a text field;
  - App: the `?` button on the review screen only, the "New file" question counting pending splits;
  - kit: the tooltip on hover and focus, the icon button's key hint, the ordinary dialog's Escape and outside click.
- **e2e** (prior art: `e2e/export.spec.ts` with its origin-private folder in place of the picker): per supported format, one track exported singly and one range, read back and decoded; the same track exported twice to check ` (2)`. `pnpm test:e2e` runs in Final for the single-export ticket.
- Checked by hand in Chrome with the `playwright-cli` skill: tapping Shift+Enter along a playing track over 10 min, the volume mid-play, and the tooltips' look in light and dark.

## Out of Scope

- Making the sound louder than the file (gain above 0 dB).
- Volume or any other change written into an exported file.
- Moving a pending split, or pending splits anywhere but the Track view.
- Pending splits in the Range view (it keeps adding splits at once).
- Single export from the Track list or the track strip.
- Choosing a file name pattern, or exporting several selected tracks.
- Remembering the export folder across a reload.
- Undo for applying, discarding or deleting pending splits.
- Shortcuts that work while a view does not have focus, other than `?`.
- Rebinding keys.

## Further Notes

- **Glossary changes**, already in `GLOSSARY.md`:
  - **Mark**: the dashed spot the user clicks in the stretch on show, in the Range view for a split and in the Track view for a pending split, one per view. _Avoid_: cursor, marker, ghost playhead.
  - **Pending split** (new): a spot in the selected track marked to become a split once the pending splits are applied; no track, no name, no edit until then; the user is asked before anything discards it. _Avoid_: candidate, draft split, ghost split.
  - **Single export** (new): one track or the range as one file, under a confirmed name, into a folder picked once per file. _Avoid_: cut, extract, chunk.
  - **Selected track**: a split is added inside it only by applying pending splits.
  - **Track view**: also where pending splits are placed.
  - **Playhead**: drawn always in the Track view too.
- **Decided while writing this spec**, not in the grilling, to check:
  - Your list said adding a pending split moves focus to it, and that Add is disabled while one is selected. Taken together, tapping along a playing track would stall after the first tap. So adding at the mark (button, Enter) selects the new one, and Shift+Enter at the playhead does not select it and is never blocked by a selection.
  - Volume runs from −40 dB to 0 dB in 1 dB steps, default 0 dB.
  - A single press near a split line in the Range view places the mark; split lines are reached by double-click only.
  - The saved line clears at the next press or key in the view, a view switch or a selection change.
  - The setting-change and "New file" questions keep their two buttons and gain no "Apply first".
  - The `?` button and key exist on the review screen only.
- **Learning**: volume is the one audio idea here. A concept note, `docs/concepts/09-volume-is-gain.md` (linear amplitude, decibels, why the slider steps in dB, with a number from the real sample), is written and confirmed before the volume code. The UI items need no note.
- **Docs to update with the work** (the `finish-feature` skill): `CHANGELOG.md` lines under Unreleased per ticket; `docs/architecture.md`; DESIGN.md gains the tooltip, the ordinary dialog, the volume control and the pending split's look; AGENTS.md's line on `e2e/export.spec.ts` gains single export. No slice is added, so AGENTS.md's code layout stays.
- **Tickets** (next step, `issues/`): tooltips, icon buttons and the ordinary dialog; the shortcuts dialog; volume; the first track after analysis; Range view pointer and keys; Track view mark and pending splits; the discard question; single export.
