# Track name prefix for exported tracks

Status: resolved

From GitHub issue #5. Vocabulary is in the glossary: while this was grilled, **Track name** changed to "the track name prefix followed by the track's number until the user renames it, then the name as typed", and **Track name prefix** was added. No ADR: dropping the number from a renamed track's file name is a trade-off, but a cheap one to reverse.

## Problem Statement

An unnamed track is exported as `01.m4a`, `02.m4a`. Inside the export folder that is fine, but once I move a file out of it, `01.m4a` says nothing about which source file it came from. A renamed track exports as `01 Intro.m4a`, with a number I did not type in front of my name. The single export dialog offers `dreamscape 01` for an unnamed track, yet confirming it unchanged writes `01.m4a`: the name I am shown is not the name I get.

## Solution

A **Prefix** field sits in the "Track list" panel's header. When a source file loads it holds the file's name without its extension, followed by `-` (`dreamscape.m4a` gives `dreamscape-`). Every unnamed track's name is the prefix followed by its zero-padded number (`dreamscape-01`), shown in the track list, offered by the single export dialog and used as the file name in an export (`dreamscape-01.m4a`). Nothing is put between the prefix and the number: the separator, if any, is part of the prefix. A renamed track is exported under the name as typed and nothing else (`Intro.m4a`). Clearing the prefix gives plain numbers. When two files would get the same name, the later one becomes `name (2)`, so nothing is ever overwritten.

## User Stories

1. As a user, I want the prefix to start as the source file's name followed by `-`, so that I get useful file names without typing anything.
2. As a user, I want each unnamed track's name to be the prefix followed by its number, so that a file moved out of the export folder still says which source file it came from.
3. As a user, I want the number zero-padded as today (two digits at least, wider past 99 tracks), so that the files sort in order.
4. As a user, I want nothing added between the prefix and the number, so that I choose the separator (`-`, `_`, a space or none) by typing it into the prefix.
5. As a user, I want to edit the prefix in a field in the track list's header, so that it sits beside the names it changes without taking room from the list.
6. As a user, I want the field labelled "Prefix", so that I can tell what it is even when it is filled.
7. As a screen-reader user, I want the field announced as "Track name prefix", so that I know what the short label refers to.
8. As a user, I want every unnamed track's name to change as I type the prefix, so that I see the result at once.
9. As a user, I want renamed tracks left alone when I change the prefix, so that a name I typed never changes behind my back.
10. As a user, I want Enter to leave the prefix field and keep what I typed, so that the keys go back to the view on show.
11. As a user, I want Escape to put back the prefix the field had when I clicked into it, so that I can undo a change I did not mean.
12. As a user, I want an empty prefix to give plain numbers (`01.m4a`), so that I can have today's names back.
13. As a user, I want a new source file to start with its own prefix, so that one file's prefix never names another file's tracks.
14. As a user, I want a file whose name has nothing before its extension (`.m4a`) to start with an empty prefix, so that I do not get a lone `-01`.
15. As a user, I want the prefix not counted as an edit, so that changing it never makes the app ask whether to discard my edits.
16. As a user, I want a change of a detection setting to keep my prefix, so that finding the splits again does not undo it.
17. As a user, I want the track list to show an unnamed track's name in muted text, so that I can see which tracks the prefix will rename.
18. As a user, I want to start editing an unnamed track's name from its prefixed name, so that I can change it slightly rather than retype it.
19. As a user, I want a name I clear in the track list to fall back to the prefixed name, so that "no name" means the same thing everywhere.
20. As a user, I want a renamed track exported under its name as typed, with no number in front, so that the file is called what I called it.
21. As a user, I want an unnamed track exported as the prefix followed by its number, so that what the list shows is the file I get.
22. As a user, I want the single export dialog to offer the track's name as the list shows it, so that confirming it unchanged writes the file name I was offered.
23. As a user, I want the dialog to offer `01` when the prefix is empty, so that the offer is still the real file name.
24. As a user, I want confirming the offered name to leave the track unnamed, so that a later prefix change still renames it.
25. As a user, I want two tracks of the same name in one export to give `name.m4a` and `name (2).m4a`, so that no track overwrites another.
26. As a user, I want a renamed track whose name matches another track's prefixed name to be kept apart the same way, so that nothing is lost.
27. As a user, I want names that differ only in capital letters treated as the same name, so that macOS and Windows do not overwrite one with the other.
28. As a user, I want the later track in order to be the one that gets `(2)`, so that the first track keeps the plain name.
29. As a user, I want a typed name that has no usable characters once made safe (`...`) to export under the track's prefixed name, so that the file still has a sensible name.
30. As a user, I want unsafe characters in the prefix turned into `-` like in any name, so that the file can be written on every system.
31. As a user, I want the prefix cut rather than the number when a name is too long, so that two unnamed tracks never get the same file name.
32. As a user, I want the prefix field to take up to 100 characters, the same as a track name, so that the two limits agree.
33. As a listener, I want an unnamed track's title tag to be its prefixed name, so that the player shows the same name as the file.
34. As a listener, I want a renamed track's title tag to be the name exactly as I typed it, unsafe characters included, so that tags keep what file names cannot.
35. As a listener, I want an unnamed track's title tag to be its number (`01`) when the prefix is empty, with the album tag still the source file's name, so that no separator I did not type appears.
36. As a user, I want the track strip to show an unnamed track's number and a renamed track's name, so that narrow blocks do not all read `dreamscape-…`.
37. As a user, I want a strip block's tooltip and screen-reader label to give the full name, so that the prefixed name is still there to read.
38. As a user, I want the Track view's title to show the track's full name, so that it matches the name in the list.
39. As a user, I want the export folder still named after the source file, so that exports land where they did before.
40. As a user, I want a failed export to name an unnamed track as "Track 3", as today, so that the line is not padded with a prefix every unnamed track shares.
41. As a user, I want the range export's offered name unchanged, so that this feature does not change how a range is named.
42. As a user, I want the prefix field out of reach while an export runs, like the rest of the page, so that a run is never changed partway.

## Implementation Decisions

- **Where the prefix lives.** The split store holds the track name prefix beside the track names. It is file-level state: not part of the splits, not counted by the edit count, untouched by detection or a setting change, and cleared when the store resets.
- **Who sets the prefill.** The split store cannot read the source-file store (two slices of one layer). The review page sets the starting prefix on mount, in the same place it starts detection, from the source file's stem followed by `-`, or empty when the stem is empty. The page unmounts on "New file", so a new file always gets its own prefill.
- **A track carries both names.** Each track the store lists gets the user's own name (null while unnamed) next to the name to show, which is the own name or the prefix followed by the padded number. The export stores read the own name from the track instead of reaching into the start split and the first track's name.
- **Helpers move down.** Zero-padding the number and taking the source file's stem move from the track strip widget down to the split entity, so the store can build the default name. Their specs move with them.
- **File name of a track.** A renamed track's file is its name made safe; an unnamed track's, or a renamed one whose name is empty once made safe, is the prefix and number made safe as one string, so a separator at the prefix's end is not trimmed off. When the result would pass the 100-character cap, the prefix is cut so the number stays whole. The `<NN> <name>` form goes.
- **Clashes in export all.** The full export keeps the names it has written in this run and passes each new name through the same free-name rule as single export (`name (2)`, case-insensitive), in track order. The subfolder is new, so the run's own names are the only ones that can clash.
- **Title tag.** The typed name as typed; else the default name; with an empty prefix that is the bare number. The album tag stays the source stem and the track tag `n/count`.
- **Single export dialog.** It offers the track's shown name. Confirming the offered name unchanged leaves the track unnamed, as today. The range's offered name is unchanged.
- **Prefix field.** A text field in the "Track list" panel's header actions, visible label "Prefix", accessible name "Track name prefix", up to 100 characters. It writes to the store on every input. Enter blurs it; Escape restores the value from when it gained focus, then blurs. The page keys already ignore typing in a text field. The list box keeps its 160 px height.
- **Track list.** An unnamed track's name field shows the default name in muted text; a renamed one shows its name as today. Saving what the field showed is still no rename, and saving an empty name still unnames the track.
- **Track strip.** A block's visible label is the number for an unnamed track and the typed name for a renamed one; its tooltip and accessible label use the shown name.
- **Unchanged.** The Track view title (it shows the track's shown name, so it picks up the prefix by itself), the export folder name, the range's default name, the export failure line, and the modal overlays that cover the page during an export.
- **Docs.** The glossary is done. The changelog gets the prefix under Added and "a renamed track's file no longer starts with its number" under Changed. The architecture doc changes only if its description of the split store's state needs the prefix.

## Testing Decisions

- A good test checks what the user gets (file names written, tags, the names on screen, what the dialog offers), not how the store builds a name. Assert through the public store actions and the rendered views.
- **Main tests: the full export and single export stores.** Their specs drive the real split store and write into the existing fake folder. Cover: default names, renamed tracks without a number, an empty prefix, clashes in export all becoming `name (2)` (same name, a name matching another track's default, a case-only difference), a name empty once made safe, the cut keeping the number, the title tag in each case, the dialog's offer, and confirming the offer leaving the track unnamed.
- **The split store spec.** The shown name follows the prefix; a prefix change renames every unnamed track and no renamed one; the prefix is no edit; a setting change keeps it; `reset` clears it.
- **Views.** The track list's spec covers the header field, live updates, Enter, Escape and the muted unnamed names. The track strip's spec covers the number and typed-name labels and the full name in the tooltip. The review page's spec covers the prefill on mount, and the empty prefill for a file with no stem.
- **Small function specs.** The specs for the track file name, the track tags and the track title are updated, not added to; the store specs carry the coverage.
- **e2e.** The Playwright export spec checks file names and title tags in a real folder in all three formats; update its expectations to the prefixed names (`bursts-01`). Run the e2e suite in the Final tier, because export into a real folder is a browser flow unit tests cannot cover.

## Out of Scope

- Remembering the prefix across source files or sessions.
- Using the prefix in the range export's offered name.
- Templates beyond prefix plus number (a suffix, the number's position, a different padding).
- Renaming the export folder.
- Changing the export failure line.

## Further Notes

- The grilling session settled the issue's three open questions: an unnamed track's title tag is its default name; the prefix is not an edit and survives a setting change; the range export stays as it is.
- The issue said clashes "keep today's rule" (single export's free-name rule), but export all has never had a clash rule: the number made every name unique. Without the number, a second file of the same name would be written over the first, so export all needs the rule this spec adds.
- This is not an audio idea, so it has no concept note.
