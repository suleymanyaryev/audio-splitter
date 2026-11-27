# Find splits: contrast, for crossfaded tracks

Status: resolved

GitHub issue #18, milestone 8 of v2. The idea and its numbers are in concept note 15 (contrast), confirmed by the user. The 36 decisions behind it, and every measurement, are in `analysis.md` beside this spec.

## Problem Statement

Some of my source files are crossfaded compilations. One track fades into the next and the loudness never dips, so Find splits finds almost nothing there: on test mixes with 10 s crossfades it finds 7 boundaries of 44. Gaps need a silence and dips need the loudness to fall, and neither happens. I end up finding every boundary by ear, minute by minute.

The sound does change at those boundaries: a new track has other instruments and another mix. The spectrogram already shows it, but nothing in the app turns it into a split.

## Solution

Find splits gets a third detector: **contrast**, how far apart the sound of the minute before a point and the minute after it are, in dB, whatever their loudness.

- A **contrast curve** is drawn under the loudness curve for every source file, so I can see where the sound changes.
- A **contrast setting**, off when a file opens, lets Find splits also add a split at each contrast peak that reaches a **contrast threshold** (5.4 dB to start). While it is on, the threshold is a line I can drag on the curve, and each split Find splits would add is marked before I press it.
- A contrast split keeps 60 s of room from every gap, dip and split, and from the file's ends, so a boundary already marked doesn't get a second split beside it.
- A contrast split is **likely** from 6.5 dB and **doubtful** under it, never sure, because contrast also hears changes inside a track. Its tooltip shows its contrast.
- While contrast is on, a **dip** with a contrast peak within 5 s is one band surer, since the two detectors agree.
- With contrast off, Find splits behaves exactly as it does today.

## User Stories

### Seeing contrast

1. As a user, I want a contrast curve under the loudness curve, so that I can see where the sound changes even where the loudness doesn't.
2. As a user, I want the contrast curve on the same time axis as the loudness curve, so that a peak lines up with the moment on the waveform above.
3. As a user, I want the contrast curve drawn for every source file, whether contrast is on or off, so that I can learn what it shows before I rely on it.
4. As a user, I want the contrast curve to have its own scale in dB, so that its numbers match the threshold and the tooltips.
5. As a user, I want the contrast curve ready when the review screen opens, so that I never wait for it after a click.
6. As a user, I want the contrast curve to stay as it is when I move any setting, so that it always shows the same picture of the file.
7. As a user, I want the curve to show the highest contrast in each pixel's stretch when the file is long, so that a narrow peak is never hidden.
8. As a user, I want quiet stretches to read as no contrast, so that a silence or a fade is not shown as a change of sound.
9. As a user, I want the curve to follow the light and dark themes, so that it reads like the rest of the panel.

### The contrast setting

10. As a user, I want to switch contrast on for a source file I know is crossfaded, so that Find splits proposes splits where tracks blend.
11. As a user, I want contrast off when a source file opens, unless my default settings say on, so that gapped files don't get splits inside tracks.
12. As a user, I want the on/off control beside the other settings, so that I find it where I set the threshold and the depth.
13. As a user, I want a contrast threshold starting at 5.4 dB, so that I begin from the value that passed the measurement.
14. As a user, I want a threshold slider from 3 to 12 dB in steps of 0.1 dB, so that I can tune it finely within useful values.
15. As a user, I want a readout of the threshold in dB, so that I know its exact value.
16. As a user, I want a dashed threshold line on the contrast curve while contrast is on, so that I see which peaks reach it.
17. As a user, I want to drag the threshold line up and down, as I drag the depth line, so that I set the threshold where I see the peaks.
18. As a user, I want the threshold line and the slider to agree at all times, so that either one sets the same value.
19. As a user, I want a mark on the contrast curve at each split Find splits would add for contrast, before I press it, so that I see what a setting will do.
20. As a user, I want the marks to update as I move the threshold, so that I can find a value by watching them.
21. As a user, I want the threshold line and the marks hidden while contrast is off, so that the curve alone shows when I'm not using it.
22. As a user, I want moving the contrast threshold, or switching contrast on or off, to change no split, so that only pressing Find splits adds anything.
23. As a user, I want "Save as default" to save whether contrast is on and its threshold, so that a crossfaded collection opens ready.
24. As a user, I want default settings saved before this change to keep working, with contrast off at 5.4 dB, so that nothing I saved is lost.

### Finding splits

25. As a user, I want Find splits to add a split at each contrast peak that reaches the threshold while contrast is on, so that crossfaded boundaries become splits in one press.
26. As a user, I want the number on the Find splits button to include the contrast splits while contrast is on, so that I know what a press adds.
27. As a user, I want a contrast peak to be the highest point within 15 s on either side, so that one change gives one split.
28. As a user, I want no contrast split within 60 s of a gap or dip that Find splits proposes, so that a boundary already found doesn't get a second split on the slopes of its contrast.
29. As a user, I want no contrast split within 60 s of a split that already exists, so that pressing Find splits again doesn't add splits beside the ones it made before.
30. As a user, I want no contrast split within 60 s of a gap that holds a split, so that a gap I already split counts as its boundary.
31. As a user, I want no contrast split within 60 s of the file's start or end, where one side of the comparison is cut short.
32. As a user, I want two contrast splits only 15 s apart at least, not 60 s, so that the stronger of a close pair doesn't hide the real one.
33. As a user, I want a gap or a dip to win where it marks the same boundary as a contrast peak, so that the split goes where the silence or the dip is.
34. As a user, I want a contrast split at the peak of the curve, which lands near the middle of a crossfade, so that each track keeps its half of the blend.
35. As a user, I want the splits Find splits adds for contrast to be no edit until I change one, as for gaps and dips.
36. As a user, I want Find splits to ask before discarding pending splits, as it does today, whether or not contrast is on.

### Confidence

37. As a user, I want a contrast split of 6.5 dB or more to be likely, so that I check it before I trust it.
38. As a user, I want a contrast split under 6.5 dB to be doubtful, so that the weakest ones stand out the most.
39. As a user, I want a contrast split never to be sure, since contrast also hears changes inside a track.
40. As a user, I want a contrast split's line and track-list row to look like any likely or doubtful split, so that there is one way to read confidence.
41. As a user, I want the tooltip of a contrast split to show its contrast in dB, so that I know why it was proposed.
42. As a user, I want a dip with a contrast peak within 5 s to be one band surer while contrast is on, so that two detectors agreeing counts for more.
43. As a user, I want such a dip's tooltip to show both its depth and its contrast, so that I see both reasons.
44. As a user, I want a gap never lifted by contrast, since only dips were measured.
45. As a user, I want no confidence to change because of contrast while contrast is off, so that a switched-off detector has no hidden effect.
46. As a user, I want a contrast split's confidence to go when I move it or mark it checked, as for any detected split.
47. As a user, I want `{` and `}` to go through contrast splits with the others, so that one key reviews every split with a confidence.
48. As a user, I want that order to be doubtful first, then likely, then sure, so that I review the weakest first.
49. As a user, I want contrast splits first within a band, least contrast first, so that the splits the app knows least about come before the dips.
50. As a user, I want the order exactly as today when no split comes from contrast, so that gapped files review as before.

### Kept as they are

51. As a user, I want gaps, dips, their settings and their confidence to behave exactly as before while contrast is off.
52. As a user, I want Clear splits, removing a track and the track names to treat contrast splits like any other split.
53. As a user, I want the export unchanged: a contrast split cuts the file like any other split.

## Implementation Decisions

### The contrast maths (shared audio maths)

- **A new hand-written pure module** beside the depth maths and the spectrogram builder, as "Learning first" asks. It reads the spectrogram and the loudness curve and returns the **contrast curve**: one value per 0.5 s (10 loudness windows), in dB, as a float32 array.
- **The bands** whose top edge is over 15 kHz are left out (119 of 128 at 44.1 kHz, 118 at 48 kHz). The encoder cut them away, so they hold noise (concept note 14).
- **Quiet windows** count in neither stretch: windows under the source file's median loudness minus 18 dB, which is the built-in silence threshold, not the user's slider. So the curve depends on no setting and is computed once per source file, as the depth profile is.
- **Each 0.5 s block** keeps the summed power of its loud windows per band (power is 10^(dB/10) of the stored band) and its count of loud windows. Running sums over the blocks, in float64, give each stretch's mean without adding up a minute again; they are dropped once the curve is built.
- **At each point**, the stretch before and the stretch after are the 60 s on each side. Each band's mean power over a stretch goes back to dB. Contrast is the RMS over the bands of the after-minus-before difference, with the mean difference taken away.
- **A point with under 2 s of loud windows on either side** scores 0.
- **The contrast peaks** are a second pure function of the curve and a threshold: each point at or over the threshold that is the highest within ±15 s (the earlier of equals), and not within 60 s of the file's start or end.
- **Time:** the measurement took 447 ms in Node for a 3 h source file. The build measures it in Chrome. A worker is out of scope unless the time is noticeable.

### Proposals (split slice)

- **The proposal function takes the contrast peaks** as a third input, beside the gaps and the dips. The rules for gaps and dips do not change.
- **A contrast peak proposes its time** unless one of these is within 60 s: a gap proposal, a dip proposal, the middle of a gap that holds a split, or an existing split. Between two contrast peaks only the shared 15 s applies. The 1 s room from the file's ends stays for every kind.
- **A proposal's kind** gains contrast, beside gap and dip, and carries its contrast in dB.
- **The lift:** while contrast is on, a dip proposal with a contrast peak at or over the threshold within 5 s goes up one band, doubtful to likely or likely to sure. A gap proposal is never lifted.
- **Contrast bands:** likely from 6.5 dB, doubtful under it, never sure. The cut-off sits with the depth cut-offs, with a comment pointing at concept note 15.
- **The constants** (the 60 s stretch, the 60 s room, the 5 s agreement, the 6.5 dB cut-off) live in config beside the existing split-room and confidence values, each with a comment.

### The split store

- **Opening a source file** passes the spectrogram to the store beside the loudness curve. The store builds the contrast curve once, as it builds the depth profile, and exposes it for drawing. The review page passes the spectrogram from the source-file store, which keeps the slice rule (the split slice never imports the source-file slice).
- **Two new settings**, contrast on/off and the contrast threshold, join the silence threshold, the minimum gap length and the depth. Both start from the default settings and reset with them. The threshold is held to its slider's range and grid. Changing either changes only what Find splits would add.
- **The preview, the count and Find splits** include contrast proposals while contrast is on, and none while it is off.
- **A split's confidence** becomes a band with two optional measures, the depth and the contrast, each in dB or none. A gap or dip split has its depth; a contrast split its contrast; a lifted dip both.
- **The confidence order** for `{` and `}`: by band, doubtful, then likely, then sure. Within a band, contrast splits come first, least contrast first, then the others, least deep first; ties by time. With no contrast split this is exactly today's order (least deep first).
- **Moving a split and marking it checked** clear its confidence as today, whatever measures it had.

### The default settings

- **They gain contrast on/off and the contrast threshold.** The stored shape moves from version 2 to version 3.
- **Versions 1 and 2** are still read, with contrast off at 5.4 dB.
- **Version 3** is validated like the others: the threshold on the 0.1 dB grid and inside its slider's range, and on/off a boolean. An invalid entry falls back to the built-in settings, as today.

### The loudness panel

- **A contrast lane** sits under the loudness curve in the same panel, on the same time axis, with its own dB scale from 0 and a label. Per pixel column it draws the highest contrast in that column's stretch. Its colours come from the theme tokens, chosen from the design system.
- **The contrast threshold line** on the lane is dashed with a handle, like the depth line, and dragged the same way. Where it and another line are both under the pointer, the existing lines win.
- **Peak marks:** one at each contrast proposal of the preview.
- **The threshold line and the marks** are drawn only while contrast is on; the lane's curve always is.
- **The settings row** gains, after the depth slider, an on/off control and the contrast threshold slider with its readout. The kit has no switch: the segmented control (Off | On) is used unless the design system says otherwise.
- **The tooltip** of a confidence shows each measure it has: the depth as today ("15.6 dB under its surroundings"), the contrast ("7.2 dB of contrast"), or both.

### Docs

- **Concept note 15:** that the quiet windows are those under the built-in silence threshold, and "Where it lives in the code".
- **The glossary:** Split (a detected split is also at a contrast peak), Confidence (read from the depth or the contrast), Default settings (the contrast setting). Contrast is already defined.
- **The architecture doc:** the split store's row (the contrast curve, the setting, its proposals) and what opening a source file passes it.
- **The README:** the "What it does" line for finding splits, and note 15 in the concept-note list.
- **The changelog:** one line under Unreleased per user-visible change.
- **Decision 24:** concept note 13's planned listening, the comment on the depth cut-offs and #16's last ticket each gain a line saying the ear check on `sample-crossfade.mp3` was dropped, because that file blends throughout.

## Testing Decisions

- **A good test** goes through the public seam and checks what the user would notice: which splits a press adds and where, which band each gets, the order the keys follow, what is saved, what the panel shows. It does not check how the sums are cached or how proposals are merged inside.
- **Four seams, confirmed with the user:**
  1. **The split store**, the main seam. Contrast peaks, proposals, bands, the lift and the order are tested through it, as dips and proposals are today. Prior art: the store's spec and its helpers that build small loudness curves; a matching helper builds small spectrograms.
  2. **The contrast maths**, the one new seam, with numbers checkable by hand as in concept note 15. Prior art: the depth maths and spectrogram builder specs.
  3. **The saved default settings**, an existing seam. Prior art: its spec's version 1 and 2 cases.
  4. **The loudness panel's existing seams**: the settings row's component spec, the lib-level specs of the depth line, its drag and the dip marks (the lane's helpers get the same kind), and the track list's spec for the tooltip.
- **The contrast maths spec:**
  - a spectrogram that never changes has contrast 0 everywhere;
  - the same sound 6 dB louder after a point has contrast 0 there;
  - a change in some bands and not others reads the RMS worked out by hand for the real band count;
  - quiet windows count in neither stretch;
  - a point with under 2 s of loud windows on a side scores 0;
  - a change only over 15 kHz reads 0;
  - the peaks: the highest within ±15 s, the earlier of equals, none within 60 s of the ends, none under the threshold.
- **The split store spec:**
  - with contrast off, Find splits adds exactly what it adds today, and no confidence changes;
  - with contrast on, a contrast peak becomes a split, likely at 6.5 dB and doubtful at 6.4 dB;
  - none within 60 s of a gap, a dip, a gap holding a split, an existing split or the ends; two contrast peaks 20 s apart both become splits;
  - a dip with a contrast peak 5 s away is lifted one band; not at 6 s, not while off, never a gap;
  - the order: band first, contrast before depth within a band, then the measure, then time; today's order with no contrast split;
  - the settings start from the defaults, reset with them, and change no split.
- **The default settings spec:** version 3 saved and read back; versions 1 and 2 read with contrast off at 5.4 dB; an invalid threshold falls back.
- **Components and helpers:** the settings row switches contrast and moves the threshold; the lane's scale and threshold-line helpers map dB to height and back; dragging moves the threshold; marks sit at the preview's contrast proposals; the track list's tooltip shows the contrast.
- **No e2e spec.** The browser check is by hand at the milestone's close, with `playwright-cli`:
  - `sample1.m4a` with contrast on adds no split;
  - a test mix from the analysis, written to a file, gets its contrast splits;
  - the load time of `sample3h.m4a`, with and without the contrast curve.

## Out of Scope

- A track count as a second way to set the threshold (decision 18).
- Foote's checkerboard kernel, a guard for files that are not music, and a worker for the contrast maths.
- Ambient mixes: untested, and the only one blends throughout (decision 23).
- Moving a contrast split to a finer place after its peak.
- A room rule between two contrast peaks wider than 15 s (decision 36).
- Storing anything across a reload (#15 was not planned).

## Further Notes

- **Where the numbers come from:** test mixes of 49 tracks from five of the user's playlists, 44 boundaries per set, joined with equal-power crossfades of 0 to 20 s; the 19 gapped playlists; and the user's ear on the 10 moments contrast adds to them, 3 of them real.
- **What it gains:** on the test mixes with 10 s crossfades, Find splits goes from 7 boundaries of 44 to 39, with 6 false.
- **What it costs on gapped files:** about one split an hour, mostly inside tracks. That is why contrast starts off.
- **The 60 s room** drops a real boundary less than 60 s from another; the test mixes had one such pair.
- **A contrast peak lands** a median 1.5 s from the middle of a 10 s crossfade, at most 4.4 s.
