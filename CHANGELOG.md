# Changelog

What changed for the person using Audio Splitter, release by release. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Versions

Versions follow [Semantic Versioning](https://semver.org/) applied to the product, since the app has no API for other code to depend on:

- **Major**: a planned milestone set (v1, v2, …), or a change that breaks what users already rely on: the exported files' names, tags or format, or, once the app keeps state across a reload, saved data that needs migrating.
- **Minor**: a new capability outside a milestone set, such as another supported format.
- **Patch**: a fix that adds no capability.

## Keeping it

- Each user-visible change adds a line under `## [Unreleased]` in the same commit, in one of Keep a Changelog's groups: Added, Changed, Deprecated, Removed, Fixed, Security. Write what the user notices, not how the code changed. Refactors, tests, tooling and docs get no entry.
- A release is `pnpm release <patch|minor|major>` on a clean `main` (`--dry-run` to preview). It renames `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` under a fresh `## [Unreleased]`, updates the links at the bottom, sets `version` in `package.json`, commits and tags `vX.Y.Z` (`scripts/release.ts`). It warns when the groups suggest another level, and prints the push command rather than running it.
- Pushing a `v*` tag that is on `main` publishes that commit to GitHub Pages (`.github/workflows/deploy.yml`). When its deploy job fails, re-run it with "Re-run failed jobs", not "Re-run all jobs".

## [Unreleased]

### Changed

- Each view keeps its own playhead, so showing another view and moving its playhead leaves this one where it was: the range resumes where you paused it after a visit to the Track view, and the other way round.

## [2.0.0] - 2026-11-25

### Added

- A Vorbis `.ogg` file loads and splits like an `.opus`, and its tracks are exported as `.ogg` files, copied without re-encoding, with the title, number and album in each. The file dialog lists `.ogg` and `.oga` files.
- A WebM or MKV file with Opus audio, with or without a picture, loads like an `.opus`, and its tracks are exported as audio-only `.opus` files, copied without re-encoding. The length of the source file is the length of its audio, so a picture that runs on after the audio adds no empty time. The file dialog lists `.webm` and `.mkv` files.
- An MP4 or MOV video with AAC audio loads like an `.m4a`: the splitter reads its first audio stream and ignores the picture. The export and the single export write audio-only `.m4a` tracks, copied without re-encoding, with no video in them. The file dialog lists `.mp4`, `.m4v` and `.mov` files. A picture that runs on after the audio makes the file's length the picture's, so the last track shows a little silence at its end; the exported file ends with the audio.
- A "Find duplicates" button beside "Find splits" finds matches between tracks, when you press it: it compares every track of 30 s or more with every earlier one, in about a second on a 3 h file and without freezing the page, and says what it found ("3 duplicates, 1 partial match", or "No duplicates found"), or why the search failed, and then it can be pressed again. It changes no split and no name, and counts as no edit. It finds a match at any loudness and in any order, so a second pass of the tracks in another order is found too.
- A track that is the same recording as an earlier track from end to end is a duplicate. The track list says "duplicate of 01" (with the kept copy's name when it has one), the strip draws it as left out, and "Export to folder…" leaves it out and numbers its files without holes; "Export track…" still writes it. The kept copy is the earliest track of the recording that you have not left out by hand. A duplicate you left out by hand keeps that reason and only gains the words, and a recording whose every track you left out gets no match.
- A track that shares at least 30 s with an earlier track, but not end to end, has a partial match and stays in the export. "03 from 1:40" says the track holds track 03 from 1:40 on, and "part of 03 from 0:30" says it is the stretch of 03 from 0:30 on, in the track's own time, so a missing or misplaced split shows where it is. A tooltip gives the stretch both tracks share.
- A match lasts while both tracks keep the ends they had. Moving or deleting a split at either end, or adding one inside (by hand or with "Find splits"), drops the matches of that track and of the tracks matching it, and a duplicate that loses its match is exported again. Matches on other tracks stay, and the track numbers in the words follow the file. Press "Find duplicates" again to find matches anew. "Clear splits" and a new file drop every match.
- A match can be dismissed with the X beside its words in the track list. A dismissed duplicate is exported again, and a track you left out by hand stays out. "Bring back" on a duplicate, with the eye button or `X`, dismisses its match, and brings back in one press a duplicate you had also left out by hand. A dismissal is one edit, so "New file" and "Clear splits" ask, and it holds, through the next press too, while neither track's ends change.
- The words of a match are a link that selects the other track in the Track view, whose title adds them. `C` in the Track view swaps to the same moment in the track it matches, and keeps playing if the track was playing, so you hear the two side by side. With several partial matches it uses the one whose shared stretch holds the playhead, or goes to the start of the nearest one. Pressed again on that track, it goes back, and on a track with no match and no way back it does nothing. `C` is in the shortcuts dialog.
- A "Find splits (N)" button in the loudness panel's title row adds a split in the middle of each gap, and at each dip: a point where the level falls at least the depth under the loudness of the 40 s around it. A silence shorter than the minimum gap length is found as a dip. Splits within 15 s of each other count as one boundary and give one split, so a short sound inside a gap no longer makes a few-second track, and nothing is added within 15 s of a split you have. Its count follows the sliders live. It keeps every split, name, the selection and the view, and asks only when a new split would cut the selected track while it has pending splits.
- A "Depth" slider beside the silence threshold and the minimum gap length, from 3 to 30 dB in tenths and starting at 15 dB, says how far under its surroundings a dip must fall to get a split. Moving any of the three sliders changes only what "Find splits (N)" would add, and a small diamond on the loudness curve marks each dip that would get a split where no gap is.
- A dashed line on the loudness curve follows the music: the loudness of the 40 s around, less the depth. It dips into each gap and sits under the dashed silence threshold line, so the panel shows both ways of judging quiet. Drag it up or down to change the depth, as you drag the threshold line to change the threshold; where both lines are under the pointer, the threshold line is the one you take. It is left out where it would be under the panel's −60 dB floor.
- A split that Find splits adds carries a confidence read from its depth: sure from 15 dB, likely from 9 dB, doubtful under it. A likely split is marked with a hollow ring at the foot of its line and a doubtful one with a filled disc, in the whole-file waveform, the loudness curve and the zoom views; a sure split looks as before. The track list's split row says "likely" or "doubtful" after its name, with the depth in a tooltip. Moving a split, or adding one by hand, leaves it with no confidence.
- `}` selects the next split that still has a confidence, least sure first, and `{` the one before it, from anywhere on the review screen, opening the Split view on it. `K` in the Split view marks the selected split as checked: it keeps its place, its confidence and its mark go, it leaves the walk, and it counts as one edit, which Clear splits and New file ask about. The shortcuts dialog lists the keys.
- A "Clear splits" button puts the file back to one track: it deletes every split and track name, brings every left-out track back and clears the edits. It keeps the prefix, the range and the settings, and asks first only when you have edits or pending splits.
- "Save as default" keeps the minimum gap length, the depth and how far under the file's median the threshold sits, so every later file starts from them, also after a reload. "Restore built-in" puts back 18 dB under the median, 2 s and 15 dB and moves the sliders there. Default settings saved before the depth existed are kept, with the depth at 15 dB.
- A "Leave out track N" button on each Track list row leaves that track out of the export, and "Bring back track N" undoes it. A left-out track stays in the review, keeps its splits and name, and its row is muted.
- A split added inside a left-out track makes two left-out tracks. Deleting a split or removing a track gives the merged track the earlier track's state, as it does its name.
- `X` in the Track view leaves the selected track out or brings it back, and the Tracks strip draws a left-out track as a hollow, dashed block.
- "Export to folder…" writes no file for a left-out track and numbers the files it writes 1 to K with no holes. It is off while every track is left out.
- An unnamed left-out track's name is the bare prefix, with no number, and "Export track…" on it offers the prefix and its place in the file (`dreamscape-03`).

### Changed

- The message for a file the splitter cannot take lists the supported formats: AAC in `.m4a`, `.mp4` or `.mov`, MP3, Opus in `.opus`, `.webm` or `.mkv`, and Vorbis in `.ogg`.
- A source file opens as one track with no splits, on track 1 in the Track view. The gaps for the settings show at once on the whole-file view, the loudness curve and the zoom panel's views, and "Find splits" turns them into splits when you decide.
- Moving the silence threshold or the minimum gap length, by slider or by dragging the line on the loudness curve, changes only the gaps shown. It no longer replaces your splits and names, so it asks nothing.
- Edits now count from when the file opened. The splits "Find splits" adds are no edit until you move or delete one, so "New file" asks only when you have done something by hand.

## [1.4.0] - 2026-11-22

### Added

- A play speed control in the zoom panel's title row, just before the volume, from 0.5× to 2.0× in steps of 0.1. It applies to the audition, the range and the selected track, the pitch stays the same, and a change takes effect while the sound plays. The button on its left shows the speed and resets it to 1.0×. It is remembered across a reload. An export is unaffected.
- A "Prefix" field in the Track list's header, starting as the source file's name and a dash (`dreamscape-`). Every track you have not renamed shows it before its number (`dreamscape-01`), in muted text in the list, and changes with it as you type.
- The Split view marks where the 8 s of the audition start and end with a small bracket at the top and bottom of the view, so you can see which part of the 20 s you can hear. Near the start or end of the file the brackets sit on the file's edge.
- In the Split view, `,` and `.` step the playhead back and forward 100 ms (1 s with Shift, and again while held), and Home or the new "Back to audition start" button takes it back to the start of the 8 s.
- The Split view is a slider for the playhead, so a screen reader says where it is.
- In the Split view, a click moves the playhead there and a drag moves it along, and a playing audition pauses while you hold it and plays on from where you let go. A press next to the split's line still moves the split.
- `]` selects the next track and `[` the previous one in the Track view, and the next and previous split in the Split view. The keys are the two to the right of P, so they work without a modifier on every keyboard layout, and they do nothing at the first and last item or while you type a track name. A track that is playing or being decoded carries on with the new track from its start; a paused or stopped one rests at its start. An audition that is playing or being decoded starts again across the new split, a paused one rests at the new split's start, and with none on, none starts. With no split selected, they pick the nearest split on that side of the zoom window's centre.

### Changed

- An export names every track you have not renamed after the list's name for it: the prefix and the number (`dreamscape-01.m4a`, or `01.m4a` when the prefix is empty), and its title tag is the same name. The single export dialog now offers that name too, where it offered the file's name and the number, so confirming it writes the file you were offered. A prefix too long for the file name is cut, never the number.
- A renamed track's file no longer starts with its number: it is called what you called it (`Intro.m4a`, not `02 Intro.m4a`). When two files in an export would share a name, ignoring capital letters, the later track's becomes `name (2).m4a`, so nothing is overwritten. A name with no usable characters (`...`) is written under the track's prefixed name, and its title tag keeps what you typed.
- In the Split view, Space and the play button now pause the audition and play it on from the same point. It starts again from the top only after it has played to the end.
- The Split view always draws the playhead: at the start of the 8 s before the first play, and where you paused.
- In the Split view, moving the split pauses the audition instead of ending it, and the playhead keeps its place in the file. Space plays on from there after a short wait. Selecting another split, none, or deleting the split still ends it.

## [1.3.0] - 2026-11-22

### Added

- A System, Light and Dark switch in the header, on the load screen and the review screen. Your choice is remembered and applied before the page first paints; on System the app follows your computer's theme as it changes, and every waveform and curve redraws at once.

### Changed

- The app has a new look, in both themes: a fog ground, graphite waveforms, one sea-mist colour for every gap, rust only for splits and the silence threshold, a slate header and slate buttons, and the Albert Sans typeface in place of Manrope. Digits are no longer fixed-width, so times and counts do not line up in columns. The screens have more room (32 px margins, 24 px gaps, a taller header), smaller corners and the split's time as one large figure; every control, in both themes, hovers, presses, focuses and disables the same way, colours ease over a tenth of a second (not at all if your system prefers reduced motion), and the selected split lights up in rust in the whole-file view, the track list and the track strip together. Each split in the track strip now carries a rust rule.
- The link preview image, the tab icon, the touch and installed-app icons, the app's window colour and the browser's address-bar colour now match the new look: a slate square with a sea-mist ring, and a preview that shows graphite audio on sea-mist gaps cut by rust lines.

### Fixed

- The keyboard shortcuts dialog scrolls its list inside the dialog, so the Close button stays in view on a short window.
- A split in the track strip that has keyboard focus now shows an ink ring on top of its rust fill, so it no longer looks like the selected split.

## [1.2.0] - 2026-11-21

### Changed

- The keys of the Split, Track and Range views (Left and Right, Delete and Backspace, Space, Enter, Shift+Enter, Home and Escape, each in the views that have it) work wherever the focus is on the review screen, so you no longer click the view first. A key pressed with Ctrl, Cmd or Alt now does nothing in the Split view, as in the other two (Cmd+Backspace no longer deletes a split), and a held Delete or Backspace deletes one split, not the next ones too. They stay out while you type in a track name or a dialog is open, and a button you reached with Tab keeps Space and Enter. The "Saved … in …" line clears on a key the view acts on, and stays after Tab or a letter.
- A mouse click on a button, a view option, a track row's number, a track block or a slider no longer leaves the keys with that control, so the next key goes to the view: after clicking Play, Space pauses instead of pressing Play again; after clicking `Split | Track | Range`, the arrows go to the new view; after dragging the silence threshold, Left and Right move the playhead instead of nudging the threshold, also after keeping your edits in the question the drag asked. A control you reach with Tab still takes the focus, shows its ring and keeps its keys.
- Choosing a file before the ffmpeg core (32 MB) is in the browser now shows "Downloading ffmpeg… 38%" as a progress bar, growing as bytes arrive, then "Reading <file>…" as before. Cancel stops loading the file but lets the download run on, and choosing another file continues it instead of starting again.
- The ffmpeg download now starts in the background as soon as the page has drawn and the browser is idle, before you choose a file, so the wait after choosing is shorter or gone. A browser that asks to save data waits until a file is chosen.
- ffmpeg is now downloaded once and kept in the browser: a visit the next day, a week later or after a release that did not change ffmpeg loads it with no download, and a release with a new ffmpeg downloads it once and replaces the old copy. In a private window, or with storage blocked or full, it loads from the network as before.

### Fixed

- A slow connection no longer times out loading ffmpeg. The download has no time limit as long as bytes keep arriving, and fails only after 30 s with none.
- A failed download says "Failed at: downloading ffmpeg" with the reason, instead of "Failed at: probe".

## [1.1.0] - 2026-11-21

### Added

- A volume control ends the zoom panel's title row in all three views: a mute button ("Mute" / "Unmute") and a slider named "Volume" from −40 dB to 0 dB in 1 dB steps, announced to a screen reader in decibels. It sets how loud the audition, the range and the track are heard, applies to sound that is already playing, and unmuting returns to the same level. It never changes an exported file. The level and the mute are remembered across a reload (0 dB and unmuted the first time, and whenever the browser blocks storage).
- In the Range view, Shift+Enter adds a split where the playhead is, while the range plays, without stopping the sound or leaving the view. Like every split it lands on the 10 ms grid and is refused within 1 s of another split or of the file's ends. A held Enter or Shift+Enter adds one split only.
- A `?` button in the header, "Keyboard shortcuts (?)", on the review screen, or the `?` key anywhere on the page, opens a dialog that lists every key and pointer gesture of the review screen, grouped by area: Split view, Track view, Range view, whole-file view and Track list, with the view on show first. `?` typed into a track name stays a question mark. Escape, a click outside or "Close" closes it.
- A single export: "Export track…" in the Track view's title row and "Export range…" in the Range view's write one file. A name dialog opens first, with the track's name, `<source file> NN` for a track with none, or `<source file> <start>–<end>` for a range (the times as `h.mm.ss`); Enter or OK confirms, and OK is off while the name is empty. The first single export of a file asks for a folder, later ones go to that folder with no picker, and "Change folder" in the dialog picks another; a new file forgets the folder, and a closed picker leaves the dialog open. A track is written as `NN name.ext` with the same title, track number and album tags as the full export, a range as `name.ext` with the name as title, the source file as album and no track number, straight into the folder. An existing file is never overwritten: the new one takes ` (2)`, ` (3)`. A name changed in a track's dialog becomes the track's name (a range renames nothing). Confirming stops the sound; the dialog shows its progress with Cancel, shows a failure with its reason and leaves no half-written file, and closes on success, after which a line under the view says "Saved <file> in <folder>" until the next press or key in the view, a view switch, a selection change or a new range. A single export and the full export never run at once.
- Pending splits in the Track view: mark where new tracks should start, then apply them together. "Add pending split" (Enter) adds one at the mark and selects it; Shift+Enter adds one where the playhead is, without selecting it, so tapping along a playing track takes every tap. A pending split is refused within 1 s of another or of the track's ends, and "Add pending split" is off when the mark is that close or a pending split is selected. A press within 6 px of one selects it (drawn heavier), "Delete pending split" appears, Delete or Backspace deletes it, and Escape or a click elsewhere lets go of it. "Apply" turns all of them into splits, each an added split in the edit count, and shows the Split view on the first new split. Pending splits are drawn only in the Track view, kept while you switch views with the track still selected, and dropped when the track stops being selected or one of its end splits moves or goes. "Export track…" is off while the track has pending splits and says why.
- Nothing loses pending splits without asking. Selecting another track, a split, or empty ground on the whole-file view, a double-click on an end split's line in the Track view, a Track list trash or merge button that would delete one of the track's end splits, and adding a split from the zoom view or inside the track from the Range view all ask "Discard N pending splits?" with Apply first, Discard and Cancel. Apply first applies them and then does what you asked, staying in the view you asked for (in the Range view, a split at the playhead keeps the view and the sound), Discard drops them and then does it, Cancel does nothing. Selecting the track that is already selected and switching views ask nothing.

### Changed

- "Replace your edits?" before a setting change and "Discard your edits?" before "New file" now count pending splits too, say so in their text ("1 edit and 2 pending splits"), and are asked when there are pending splits but no edits. They keep their two buttons.
- Every slider now announces its value with its unit to a screen reader ("−27.0 dB", "2.0 s") instead of the bare number.
- In the Track view a single click now places the track's own mark, a dashed line, and leaves the playhead where it is; a double-click moves the playhead there, or, within 6 px of one of the track's two end split lines, selects that split and opens the Split view. A press within 6 px of the playhead still drags it, and the keys are as before. The mark is kept while the same track stays selected and cleared when another is selected or an end of the track changes; it never mixes with the Range view's mark.
- In the Range view a single click places the mark wherever it lands, even next to a split's line, and never leaves the view. A double-click moves the playhead there, or, within 6 px of a split's line, selects that split and opens the Split view. Left and Right now move the playhead 1 s, with Shift 10 s, as in the Track view; the mark is placed with the pointer only. The view is a slider on the playhead.
- Every button in the zoom panel's title row, in all three views, is now an icon button with a tooltip that says what it does and, where there is one, its key: "Add split" (Enter in the Range view), "Delete split (Delete)", "Back to track start (Home)", and Play across split, Play, Pause and Stop with "(Space)". The tooltip opens when the pointer rests on the button and when the keyboard focuses it, and closes on Escape. Play's icon and tooltip follow what a press will do. The Track list's merge and trash buttons show their names as tooltips too. The `Split | Track | Range` control, "Export to folder…" and "New file" keep their words.
- A freshly analysed file opens with track 1 selected in the Track view, ready to play, instead of on the first split. Changing the silence threshold or the minimum gap length selects track 1 again, and shows the Track view unless the Range view is on show. The Split view then opens on the file's first seconds with no split selected.
- Loading the audio engine now waits up to 3 minutes instead of 1 before giving up, so a slow connection can finish downloading it.

## [1.0.1] - 2026-11-20

### Added

- Each track row in the Track list has a merge button, "Remove track N", that removes the track: the splits at both its ends go, so the previous track, it and the next become one track, the first track merging into the next and the last into the previous. The removed track's name goes with it: the merged track keeps the previous track's name, or the next track's when the first track is removed. There is no confirmation, and no button when there is only one track. Each deleted split counts as an edit, as deleting it from its row does. If the removed track was selected, the merged track is selected; any other selection stays.
- The Track list has a split row between every two track rows, in time order: `Split N` where the name goes, its time in the Start column and no length. A click on it selects that split and shows the zoom view centred on it, and the selected split's row is marked and kept in view, as the selected track's row is. Its trash button, "Delete split at …", deletes that split and merges the tracks either side of it, without selecting the row. The trash button is no longer on the track rows. Deleting the split where the selected track starts selects the merged track; deleting its end split leaves it selected, now longer.
- "Delete split" in the zoom view's title row, between "Add split" and "Play across split", deletes the selected split and puts the keyboard on the split selected next. It is disabled with no split selected. Delete and Backspace on the split's handle still do the same.
- The track strip has a narrow split item between every two track blocks. A click on one selects that split and shows the zoom view centred on it, as selecting a split does elsewhere. It blends into the strip at rest and turns vermilion when hovered, focused or selected, and its name says which split it is and its time. A very short track keeps a block 12 pixels wide that can still be clicked (when there are too many tracks for that, the blocks are equal and narrower).
- A track longer than 10 minutes plays in full. The player decodes it 10 minutes at a time, starting at the playhead, and decodes the next 10 minutes while you listen, so sound carries on into them with a break of about 60 milliseconds and no wait to decode. A click, a drag or a key press that moves the playhead outside the minutes already decoded decodes the minutes from there, which takes the 1 to 2 seconds a range takes.
- The Track view plays the selected track, from its start to its end. Its title row has "Back to track start" and Play, which reads "Stop" while the track is decoded and "Pause" while it plays; pausing and playing again resume at once. A click in the view moves the playhead, a press near the playhead drags it (a playing track pauses while it is held and plays on from where it is dropped), and the view takes the keyboard: Left and Right move the playhead 1 second, with Shift 10 seconds, Space plays or pauses, Home goes back to the start, and Delete and Backspace do nothing. At the track's end the sound stops and the playhead returns to the start. Playback stops when the selection changes, when the track's start or end moves, when a new range is dragged, when the view changes, when the export starts and when the page is left.
- A click on a track's block in the strip, on its row in the Track list, on its number button, or focusing its name field selects that track, the first track included, instead of the split where it starts. The selected track's block and row are marked, the whole-file view outlines its stretch, and the zoom panel switches to a Track view: the track stretched across the panel with its gaps and its two end splits, and its name, start and end as the title. The panel's control is now `Split | Track | Range`, each segment disabled while it has nothing to show. A split and a track are never selected together, and Split with a track selected shows the zoom window where it was with no split selected.
- A click in the Range view places a mark, a 1 px dashed line, and leaves the sound alone; Left and Right move it 100 ms, with Shift 1 second. "Add split" in the Range view's title row, or Enter, adds a split at the mark, without leaving the Range view or stopping the sound, so several track starts can be marked in one listen. The button is disabled with no mark and within a second of a split or of the file's ends, and the new split counts as an edit. A click within 6 pixels of a split's line selects that split and returns to the Split view. A new range has no mark.
- The playhead in the Range view can be dragged along the range to listen again from any point: a playing range pauses while the playhead is held and plays on from where it is dropped, a paused one stays paused, and a drag while the range is still being decoded sets where it starts. A "Back to range start" button left of Play, and Home on the Range view, move the playhead to the range's start and keep playing if it was playing.
- The range plays: a Play button in the Range view's title row decodes the range and plays it (it reads "Stop" while it is decoded and "Pause" while it plays), and so does Space on the Range view. A 1 px playhead shows where it is, or where it resumes: at the range's start for a new range. Pausing and playing again start at once, and at the range's end the sound stops and the playhead goes back to the start. Only one thing plays at a time: the range and "Play across split" stop each other, and playback stops when the view changes, a new range is dragged, the export starts or the page is left.
- Dragging across the whole-file waveform marks out a stretch of the file, from 1 second to 10 minutes, with a light overlay that stays until the next drag. A click still selects a split or moves the zoom window, and so does a drag under 1 second.
- A dragged-out range fills the zoom panel as its own view, with the range's waveform, gaps and splits stretched across it and its start, end and length as the title. A `Split | Range` control in the panel's title row switches between the zoom view and the range; selecting a split or moving the zoom window goes back to the zoom view, and the zoom window's outline shows on the whole-file view only while the zoom view is shown.

### Changed

- The tab icon is the header's centre-label mark, a vermilion disc with a spindle hole on vinyl black, in place of the default icon. The page has a description, and a link to it shows a preview card with the title, a line about what the app does and a waveform cut into tracks.

## [1.0.0] - 2026-11-15

The first release: milestones 0 to 7.

### Added

- Load one source file by choosing or dropping it: AAC in `.m4a`, MP3 in `.mp3` or Opus in `.opus`, recognised from its contents. Any other file gets a message saying what it is.
- Analysis in slices, with a progress bar and Cancel, so files of three hours load without running out of memory. A failure names the step and ffmpeg's last log line.
- The whole-file waveform and the loudness curve on one time axis.
- Proposed splits in the middle of every gap: a stretch under the silence threshold (18 dB below the file's median loudness to start) for at least the minimum gap length (2 s to start). Both are sliders, and the threshold line can be dragged.
- A 20 s zoom view around the selected split. Move a split by dragging or with the arrow keys (10 ms, or 100 ms with Shift), add and delete splits, and name tracks in the track list.
- "Play across split": the 8 s around the selected split, exact in every format, with a playhead.
- A track list and a proportional track strip, both of which select splits.
- A question before a setting change ("Replace your edits?") or "New file" ("Discard your edits?") throws edits away.
- "Export to folder…": every track written by stream copy, without re-encoding, into a new subfolder named after the source file (`name (2)/` the second time). Files are named `01.m4a` or `01 Name.m4a` and tagged with title, track number and album. Cancel keeps the tracks already written.

[unreleased]: https://github.com/suleymanyaryev/audio-splitter/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.0.2...v1.1.0
[1.0.1]: https://github.com/suleymanyaryev/audio-splitter/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/suleymanyaryev/audio-splitter/releases/tag/v1.0.0
