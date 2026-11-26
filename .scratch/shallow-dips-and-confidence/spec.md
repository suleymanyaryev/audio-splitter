# Find splits: gaps and dips, with a confidence per split

Status: resolved

From GitHub issue #16, milestone 6 of the [v2 milestones](../audio-splitter-v2/milestones.md#milestone-6-shallow-dips-with-a-confidence-per-split). The measurement and every decision of the grilling are in [analysis.md](analysis.md) (Decisions 1 to 22). The words are in the glossary: the grilling added **Dip**, **Depth** and **Confidence**, and changed **Split**, **Edit** and **Default settings**. No ADR: every decision is cheap to reverse.

## Problem Statement

I press "Find gaps" and still find some track changes by ear. Some boundaries in my playlists are a silence shorter than the 2 s minimum, so no split is proposed there. Lowering the minimum adds splits in the middle of tracks. Other boundaries get two or three splits a few seconds apart, around a short sound inside the gap, so I get 5 s "tracks" that I have to merge one by one.

Every proposed split looks the same. I can't tell which ones are safe and which ones need a listen, so I either check them all or trust them all. In a crossfaded file, where the level only dips a little between tracks, "Find gaps" proposes almost nothing.

## Solution

"Find gaps" becomes **Find splits**. It still proposes a split in every gap, and it also proposes one at every **dip**: a point where the loudness falls far under the loudness of the 40 s around it, however short the quiet is and whether or not it reaches the silence threshold. A new setting, the **depth**, says how far is far enough; it starts at 15 dB. Proposals within 15 s of each other are one boundary and give one split, so the double splits are gone.

Each detected split gets a **confidence**, read from its depth: **sure** (15 dB and deeper), **likely** (9 to 15 dB) or **doubtful** (under 9 dB). A sure split looks as it does today. Likely and doubtful ones are marked. `{` and `}` step through the splits that still have a confidence, least sure first. `K` marks the selected one as checked. Moving a split makes its place my own, and its confidence goes.

The loudness panel shows the new idea next to the old one. The fixed threshold line stays, and a second dashed line follows the music, the loudness around minus the depth. Dragging it changes the depth.

## User Stories

### Finding splits

1. As a user, I want one "Find splits" button that proposes splits at gaps and at dips, so that I don't have to know which detector suits my file.
2. As a user, I want a split proposed at a short silence between two tracks, even when it lasts under the minimum gap length, so that I don't find those boundaries by ear.
3. As a user, I want a split proposed where the level only dips a few dB between two crossfaded tracks, so that a crossfaded file gets proposals too.
4. As a user, I want a long silence between tracks still found as a gap, so that a boundary that dips can't see (a silence longer than about 25 s) is never missed.
5. As a user, I want one split per boundary, so that a short sound inside a gap no longer gives me a 5 s track.
6. As a user, I want the button to say how many splits a press would add, as "Find gaps (N)" does today, so that I know what a press will do.
7. As a user, I want Find splits to add only where no split is within 15 s, keeping every split, name and selection, so that pressing it after my own edits never undoes them.
8. As a user, I want a gap's split to stay at the gap's middle, so that a gapped file like `sample1.m4a` gets exactly the splits it gets today.
9. As a user, I want a dip's split at its deepest point, so that it lands on the quietest moment between the two tracks.
10. As a user, I want the deeper of two gaps to win when they fall within 15 s of each other, so that the split sits in the real silence and not next to the short sound.
11. As a user, I want no dip proposed in the first or last 10 s of the file, so that a fade-in or a fade-out never makes an empty first or last track.
12. As a user, I want nothing proposed until I press the button, so that detection still never runs by itself.
13. As a user, I want a split inside the selected track to end its pending splits only after asking, as Find gaps does today, so that I don't lose pending splits unasked.

### The depth setting

14. As a user, I want a depth slider beside the silence threshold and the minimum gap length, from 3 to 30 dB in tenths, so that I can ask for shallower or only deeper dips.
15. As a user, I want the depth to start at 15 dB, so that by default I get the dips that were real boundaries in every file measured.
16. As a user, I want moving any of the three settings to show what Find splits would add and change no split, so that I can tune before I press.
17. As a user, I want the gaps shown as they are today, and a small mark at each dip that no gap covers, so that I can see what each detector would add.
18. As a user, I want the depth saved with my default settings, so that every later source file and every reload starts from my value.
19. As a user with default settings saved before this change, I want them kept and the depth to start at 15 dB, so that I lose nothing.

### The loudness panel

20. As a user, I want a dashed line that follows the loudness around, minus the depth, drawn next to the fixed threshold line, so that I can see how a dip is judged against its surroundings.
21. As a user, I want to drag that line up or down to change the depth, as I drag the threshold line today, so that I can tune it on the curve.
22. As a keyboard user, I want the depth slider to be the keyboard way to change it, as the threshold slider is for the threshold line, so that the drag isn't the only way.
23. As a user, I want the moving line readable in both themes, so that it works in light and in dark.

### Confidence

24. As a user, I want each split Find splits adds to carry a band, sure, likely or doubtful, so that I know which ones to audition first.
25. As a user, I want a sure split to look as it does today, so that a clean gapped file looks the same as before.
26. As a user, I want likely and doubtful splits marked on their lines in every view, with doubtful the stronger, so that the unsure ones stand out on the waveform, the loudness curve and the zoom panel.
27. As a user, I want the track list's split row to show the band, so that I can scan the list for the unsure ones.
28. As a user, I want the split's depth in dB in a tooltip, so that I can see the number behind the band and learn what it means.
29. As a user, I want a gap split's band read from the gap's depth against the music on either side, so that a long silence counts as deep and sure.
30. As a user, I want a split I add by hand to have no confidence, so that only detected splits are in the review.
31. As a user, I want a split to lose its confidence when I move it, so that a place I chose myself is no longer marked unsure.
32. As a user, I want the confidence set once, when the split is added, so that moving a slider later never changes the band of a split I already have.
33. As a user, I want deleting a split to take its confidence with it, and merging tracks to keep the confidence of the splits that stay.

### Going through by confidence

34. As a user, I want `}` to select the next split that has a confidence, least sure first, so that I go through the doubtful ones before the likely ones.
35. As a user, I want `{` to go back one in the same order, so that I can return to a split I just passed.
36. As a user, I want `{` and `}` to work from anywhere on the review screen and open the Split view on the split, so that I can start from a track or a range.
37. As a user, I want splits with the same depth ordered by time, so that the order is the same on every press.
38. As a user, I want `{` and `}` to do nothing when no split has a confidence, so that the keys never jump somewhere unexpected.
39. As a user, I want `K` in the Split view to mark the selected split as checked, so that a doubtful split I've heard and kept leaves the queue without being moved.
40. As a user, I want marking a split checked to count as an edit, so that the edit count and the questions before Clear splits and New file know about it.
41. As a user, I want the shortcuts dialog to list `{`, `}` and `K`, so that I can find them.

### Kept as they are

42. As a user with a gapped file, I want Find splits to give the same splits as Find gaps did at the default settings, so that the files that already worked keep working.
43. As a user, I want Clear splits, removing a track, leaving a track out and the export to work as today, so that nothing else changes.

## Implementation Decisions

### Depth (shared audio maths)

- **A new pure module** next to the median and the loudness builder, hand-written as `AGENTS.md` asks.
- **The smoothed level** of a window is the mean energy of the 1 s around it (±10 windows), back in dB. Every value under −60 dB counts as −60, so digital silence (−100 dB) can't swamp a mean.
- **The loudness around** a window is the median of the ±20 s around it (±400 windows), with the same −60 dB floor. It is computed every 0.5 s (10 windows) and held between, which is what was measured.
- **The depth** of a window is the loudness around minus the smoothed level.
- **A gap's depth** is the median of the 20 s before the gap's start and the 20 s after its end, minus the gap's quietest smoothed level. This leaves the gap's own windows out of its surroundings, so a long silence is deep. Not yet measured on real files (analysis, Decision 18): the build checks it on `sample1.m4a`, f14 and f16.
- **The smoothed level and the loudness around don't depend on any setting.** They are computed once per source file, when the loudness curve is ready, and kept with it. Moving a slider only re-reads them. The time on a 3 h file is measured in the build; if it is noticeable, that is reported, not worked around.

### Finding splits (split slice, lib)

- **Find gaps' functions stay** as they are: gap finding and the middle of each gap.
- **A new pure function finds the dips:** every window whose depth reaches the setting and is the deepest within ±15 s (ties go to the earlier window), and that is not in the file's first or last 10 s.
- **A new pure function makes the proposals** from the gaps, the dips, the existing splits and the file's length. It returns each proposal's time, its depth and its band:
  1. Each gap that would give a split today (not at an edge, and holding no split) proposes its middle, with the gap's depth.
  2. Two gap proposals within 15 s keep the one of the deeper gap.
  3. A dip within 15 s of a gap proposal is dropped. The other dips propose their own time and depth.
  4. A proposal within 15 s of an existing split is dropped.
  5. A proposal keeps the 1 s room from the file's ends that splits keep today.
- **The bands** come from the depth: sure from 15 dB, likely from 9 dB, doubtful under 9 dB. The two cut-offs live in a config file beside the gap defaults, with a comment pointing at the concept note.
- **The depth setting's** start (15 dB), range (3 to 30 dB) and step (0.1) live with the other two settings' limits.

### The split store

- **A split gains its confidence:** the band and the depth in dB, or none. Find splits sets it. Adding a split by hand, applying pending splits and a split from the Range view set none.
- **Moving a split** clears its confidence. Losing it this way is no extra edit: the move is already one.
- **`markChecked`** clears the selected split's confidence and records the split as checked. A checked split counts as one edit, in a set beside the moved, added and renamed ones.
- **The depth setting** joins the threshold and the minimum gap length in the store, starts from the default settings, and is reset with them.
- **The preview** is a derived list of proposals, from the current settings and splits. It replaces the gap-split times the button counts today. The gaps stay derived as today, for the lands.
- **`findSplits`** replaces `addGapSplits`: it adds a detected split, with its confidence, at each proposal, with the same question about pending splits.
- **The confidence order:** a getter gives the splits that have a confidence, least deep first, ties by time. Two actions select the next and the previous one in that order, relative to the selected split's place in it. From no selection, or a split with no confidence, the next is the first and the previous is the last. Selecting a split switches to the Split view, as today.
- **The default settings** gain the depth. The stored shape moves to version 2. A version 1 entry is still read, with the depth at 15 dB. Version 2 is checked like the others: the depth is on the 0.1 grid and inside its slider's range.

### Loudness-curve widget

- **The settings row** gains the depth slider, after the minimum gap length. The button reads "Find splits (N)".
- **The moving line** is drawn over the curve: for each pixel column, the loudness around minus the depth, dashed, in its own colour from the theme tokens. It is not drawn while the depth slider's value would put it entirely under the panel's −60 dB floor.
- **Dragging the moving line** changes the depth, with the same hit test and pointer handling as the threshold line. Where both lines are under the pointer, the threshold line wins.
- **Dip marks:** a small mark on the curve at each dip that proposes a split, so dips that no gap covers are visible before the press.

### Split lines, the track list and the keys

- **Split lines** in the whole-file waveform, the loudness curve and the zoom panel's views take a style from the band: none for sure or no confidence, one mark for likely, a stronger one for doubtful. The look is chosen from `DESIGN.md` in the build, with the `impeccable` skill.
- **The track list's split row** shows the band of a likely or doubtful split, with the depth in its tooltip. A sure split's row is unchanged.
- **`{` and `}`** are matched by the physical key with Shift (Shift+BracketLeft and Shift+BracketRight), as `[` and `]` are matched without it, and handled as page keys.
- **`K`** is a Split view key, active while a split with a confidence is selected.
- **Shortcuts dialog:** `{ / }` and `K` join the Split view's section.

### Docs that this changes

- **Concept note 13**, `docs/concepts/13-adaptive-threshold.md`, is written and confirmed before any code. It covers the fixed line against the moving one, the loudness around as a median, depth, why dips go blind in a long silence, the bands, and the numbers measured on `sample1.m4a` and the playlists (analysis.md).
- **`docs/architecture.md`:** the split store's row (confidence, the depth setting, proposals) and the Find splits flow.
- **`README.md`:** the "What it does" line for finding gaps becomes finding splits, and the concept-note list gains note 13.
- **`CHANGELOG.md`:** one line under Unreleased.

## Testing Decisions

- **A good test** goes through the public seam and checks what the user would notice: which splits a press adds and where, which band each gets, what the keys select, what counts as an edit. It does not check how depth is cached or how proposals are merged inside.
- **Three seams**, confirmed with the user:
  1. **The split store** is the main seam. Dip finding and the proposals are tested through it, as Find duplicates' finding function is.
  2. **The depth maths** gets its own spec, with numbers that can be checked by hand.
  3. **The existing component specs** cover what is seen and pressed.
     No new component seams, and no e2e spec.
- **The depth maths spec:**
  - a flat curve has depth 0 everywhere;
  - a 2 s drop of 20 dB in a flat curve has depth 20 at its middle;
  - a 0.5 s drop of 20 dB has the depth worked out by hand from the 1 s energy mean;
  - −100 dB windows count as −60;
  - a short drop doesn't move the loudness around (the median ignores it);
  - a gap's depth uses the 20 s on either side, so a 60 s silence between two loud stretches is deep.
    Prior art: the specs of the median and the loudness builder.
- **The split store spec** builds curves from small helpers, as the existing `curveOf` does. It covers:
  - a short silence under the minimum gap length becomes a split, and a quiet passage shallower than the depth doesn't;
  - a long silence becomes a split at its middle, with a sure band;
  - a gap and a dip at one boundary give one split, at the gap's middle;
  - two gaps around a short sound give one split, at the deeper gap's middle;
  - nothing within 15 s of an existing split, and nothing in the first or last 10 s;
  - the bands at 8.9, 9, 14.9 and 15 dB;
  - the preview count changes with each setting, and no split changes until the press;
  - moving a split clears its confidence; `markChecked` clears it and counts one edit;
  - the confidence order, its ties, and both ends of it;
  - a version 1 default settings entry gives depth 15; a saved depth is used by the next file;
  - Clear splits and New file clear the checked set.
    Prior art: the Find gaps and default-settings tests in the split store's spec.
- **Component specs**, each next to the existing tests of its component:
  - the depth slider and the button's label and count (the loudness settings);
  - the moving line's position and drag maths (beside the threshold line's specs);
  - the band and its tooltip on a split row (the track list);
  - the `{ / }` and `K` entries (the shortcuts dialog);
  - Shift with the bracket keys (beside the step-of-key spec).
- **By ear, in the browser:**
  - `sample1.m4a` at the defaults gives its 33 splits, all sure;
  - f14 (`quiet solitude`) and f16 (`what it feels like to be alone`) gain the short-silence boundaries the analysis lists, and lose their double splits;
  - the 22 deepest dips of `sample-crossfade.mp3`, heard one by one: how many are track changes. This calibrates the bands for crossfades; it is not a pass or a fail (Decision 7).

## Out of Scope

- **Crossfades with no dip**, where only the sound changes: #18, with the spectrum of #17.
- **Machine learning**, as for all of v2.
- **Hysteresis** and a minimum track length setting.
- **Recomputing a split's confidence** when a setting changes later.
- **Storing the confidence across a reload:** #15 is still open. Whichever of the two lands second stores it with the splits (Decision 14).
- **Undo** for marking a split checked.
- **A worker for the depth maths**, unless the build measures it as noticeable on a 3 h file.

## Further Notes

- **Where the numbers come from:** 20 files. `sample1.m4a`, 18 one-hour playlists of one channel (all gapped and looped, 6 with published track times, 57 first-pass boundaries) and one crossfaded mix with no track list. On the 57 boundaries, dips at 15 dB find 52 with 1 false, against 53 with 10 false for Find gaps at the defaults.
- **The bands are calibrated on gapped files.** Under 15 dB, a dip was more often wrong than right on that data: "likely" means "check this", not "probably real". The ear check on the crossfaded file may move the cut-offs.
- **A gap's depth** (against the 20 s on either side) is the one rule chosen without a measurement. If it puts any of `sample1.m4a`'s 33 splits under sure, the build reports it before going on.
- **The 15 s merge** means two real boundaries less than 15 s apart give one split. The closest pair in the measured files is 80 s apart. In the cutting-tool use, a shorter track is added by hand.
