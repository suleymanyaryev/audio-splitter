# Listening to a range

Status: ready-for-agent

Milestone 8. Vocabulary is in `GLOSSARY.md`; this spec adds **Range** and **Mark** and widens **Playhead** (see Further Notes).

## Problem Statement

Once a source file is loaded and its splits are proposed, the only thing I can hear is the 8 seconds across the selected split. That tells me whether a cut sits in its gap, but not whether a gap was missed. A track that starts without a gap the detection could find, a quiet passage inside a track, or two tracks run together all hide in stretches far from any split. To find them today I click the whole-file view, read the zoom view's 20 s of bars and guess, because I cannot listen to an arbitrary stretch of the file. When I do hear where a track starts, I cannot put a split there while I listen. I have to remember the time, move the zoom window there and add the split in its centre.

## Solution

I drag across the whole-file view to make a **range**: any stretch from 1 s to 10 min, shown as an overlay while I drag and after I let go. Dropping it switches the zoom panel to its **Range view**, which draws that stretch across the whole panel with its splits, a **playhead** and a **mark**. I play and pause the range, drag the playhead to listen again from any point, and jump back to the range's start. A click in the Range view places the mark, and "Add split" adds a split there without leaving the Range view or stopping the sound, so I can mark several track starts in one listen. A `Split | Range` control in the panel's title row switches between the zoom view and the Range view, and anything that selects a split takes me back to the zoom view, which is still the only place a split is fine-tuned.

Playback is exact in every supported format, as the audition is: ffmpeg decodes the range to a WAV that the page plays, rather than seeking in the compressed file.

## User Stories

### Making a range

1. As a user reviewing a long file, I want to press on the whole-file view and drag left or right, so that I can mark out any stretch of the file to listen to.
2. As a user, I want the range's overlay to follow my pointer while I drag, so that I can see exactly what I am taking in before I let go.
3. As a user, I want the drag to keep working when my pointer leaves the canvas, so that I can reach the file's very start or end without aiming at a pixel.
4. As a user, I want the range held to the file's start and end, so that it never covers time that is not in the file.
5. As a user, I want the range to stop growing at 10 minutes from where I pressed, so that playing it stays quick and does not exhaust memory.
6. As a user, I want a press that moves less than 4 px to stay a click, so that selecting a split or moving the zoom window on the whole-file view works as before.
7. As a user, I want a drag shorter than 1 s to count as a click, so that a slightly shaky click does not make a useless range.
8. As a user, I want a drag that starts on a split's line to make a range too, so that splits are never moved by accident on the whole-file view.
9. As a user, I want a new drag to replace the range I had, so that I never have to clear a range before making another.
10. As a user, I want the range overlay drawn as a light ink fill with 1 px edges under the split lines, so that it reads as an area without hiding the splits in it.
11. As a user, I want the range overlay to stay on the whole-file view in both the Split and the Range views, so that I always know which stretch the Range view is about.
12. As a user, I want the loudness view's drag to stay the threshold line's, so that making a range never changes the detection.

### Switching views

13. As a user, I want the zoom panel to switch to the Range view when I drop a range, so that I can start listening without another click.
14. As a user, I want a `Split | Range` control in the zoom panel's title row, so that I can go back and forth between fine-tuning a split and listening to the range.
15. As a user, I want the "Range" option disabled while there is no range, so that I am never shown an empty view.
16. As a user, I want any action that selects a split (a split line or click on the whole-file view, a track-list row, a track-strip block, a split line in the Range view) to switch to the Split view, so that the zoom view shows the split I just chose.
17. As a user, I want the zoom window's outline on the whole-file view only while the Split view is shown, so that the whole-file view never outlines a stretch I cannot see.
18. As a user, I want the range, its mark and its playhead kept while I am in the Split view, so that coming back to the Range view finds them where I left them.

### Reading the Range view

19. As a user, I want the Range view to draw the range's waveform stretched across the panel, whatever its length, so that a 10 s range and a 10 min range both fill the view.
20. As a user, I want the Range view to show the lands and the splits that fall in the range, so that I can see where tracks start and where the gaps are while I listen.
21. As a user, I want the Range view's title to give the range's start, end and length (for example `0:42:03.25 – 0:44:10.00 · 2:06.75`), in the panel's headline style, so that I know which stretch I am hearing.
22. As a user, I want the Range view to be the same height as the zoom view, so that the page does not jump when I switch views.
23. As a user, I want the Range view drawn from the peaks already held, so that switching to it is instant and nothing is decoded until I press Play.

### The playhead

24. As a user, I want a 1 px solid ink playhead drawn in the Range view at all times, so that I can see where playback is, or where it will resume.
25. As a user, I want the playhead at the range's start on a new range, so that Play starts at the beginning of what I chose.
26. As a user, I want to drag the playhead along the range, so that I can listen again from any point.
27. As a user, I want playback to pause while I drag the playhead and resume from where I drop it, so that I do not hear the sound jump around under my pointer.
28. As a user, I want a playhead drag on a paused range to leave it paused, so that a drag only moves where playback will start.
29. As a user, I want the playhead drag held to the range, so that I cannot drag it past the stretch that was decoded.
30. As a user, I want a playhead drag during the decode to set where playback starts once the clip arrives, so that I do not have to wait to choose a starting point.
31. As a user, I want a press within 6 px of the playhead to grab it before anything else, so that the playhead is easy to pick up even near a split or the mark.

### The mark

32. As a user, I want a click in the Range view (away from the playhead and the split lines) to place a mark there, so that I can say where a split should go.
33. As a user, I want the mark drawn as a 1 px dashed ink line, so that it is never mistaken for the playhead or a split.
34. As a user, I want placing the mark to leave playback alone, so that I can keep listening while I mark a candidate spot.
35. As a user, I want a new range to have no mark, so that "Add split" is never enabled on a spot I did not choose.
36. As a user, I want a new drag to clear the mark, so that a mark always belongs to the range I see.
37. As a user, I want clicking in the Range view to focus it, so that the keyboard works on it straight away.
38. As a keyboard user, I want Left and Right to move the mark by 100 ms and Shift+Left and Shift+Right by 1 s, so that I can place it precisely without a mouse.
39. As a user, I want the mark kept inside the range, so that a split is never added outside the stretch I am looking at.

### Adding a split

40. As a user, I want an "Add split" button in the Range view's title row that adds a split at the mark, so that I can rescue a missed track start while I listen.
41. As a keyboard user, I want Enter on the focused Range view to add a split at the mark, so that I can mark track starts without reaching for the mouse.
42. As a user, I want the new split shown at once in the Range view, the whole-file view, the loudness view, the track list and the track strip, so that I see the new track straight away.
43. As a user, I want to stay in the Range view after adding a split, with playback still going and the mark still in place, so that I can carry on listening and mark the next track.
44. As a user, I want the new split not to become the selected split, so that adding it does not throw me back into the Split view.
45. As a user, I want "Add split" disabled when the mark is within 1 s of a split or of the file's ends, so that the Range view follows the same rule as the zoom view.
46. As a user, I want a split added in the Range view to count as an edit, so that a setting change or "New file" warns me before it is lost.
47. As a user, I want to select a split by clicking within 6 px of its line in the Range view, so that I can switch straight to fine-tuning it in the zoom view.

### Playing

48. As a user, I want a Play button in the Range view's title row that reads "Pause" while the range plays, so that I can stop and resume listening.
49. As a user, I want Play to start from the playhead, so that I hear what I chose to hear.
50. As a user, I want resuming after a pause to start at once, without decoding the range again, so that pausing costs nothing.
51. As a user, I want the play button to read "Stop" while the range is being decoded, so that I know the press was taken and can take it back.
52. As a user, I want playback to stop at the range's end and the playhead to return to the range's start, so that the next Play plays the range again.
53. As a user, I want a "Back to range start" icon button left of Play that moves the playhead to the range's start and keeps playing if it was playing, so that I can listen again from the top in one press.
54. As a keyboard user, I want Space on the focused Range view to play or pause, ignoring auto-repeat, so that holding the key does not flicker the sound.
55. As a keyboard user, I want Home on the focused Range view to move the playhead to the range's start, so that the keyboard has the same control as the button.
56. As a user, I want a failure to play shown as a one-line status at the bottom of the Range view, so that I know why nothing is heard.
57. As a user, I want only one thing playing at a time, so that starting the range stops the split audition and starting the split audition stops the range.
58. As a user, I want playback to stop when I switch views, draw a new range or start the export, so that sound never plays over something it does not belong to.
59. As a user, I want a press whose clip arrives after I stopped it, or after I drew a new range, to stay silent, so that sound never starts on its own.
60. As a user, I want the decoded range released when the split audition plays or a new range is drawn, so that memory holds at most one decoded stretch.

### Lifetime

61. As a user, I want the range kept when I change a setting or edit splits, so that I can keep listening to the same stretch while I tune the detection.
62. As a user, I want "New file" to clear the range, its mark and its playhead, so that nothing from the old file is shown on the new one.

## Implementation Decisions

- **Range state lives in the split store**, next to the zoom window's centre, which is the same kind of view state. The store gains:
  - the range: a start and an end in seconds, or none;
  - the mark: seconds, or none;
  - the panel view: `split` or `range`.
  - Setting a range holds it to the file's ends and to at most 10 min from the anchor. It refuses a range under 1 s, which the caller treats as a click. It clears the mark and switches the view to `range`.
  - The mark is placed and moved only inside the range.
  - Every action that selects a split switches the view to `split`. Moving the zoom window does too.
  - Adding a split at the mark is a separate action from "Add split" at the window's centre. It uses the same 1 s distance rule from neighbours and the file's ends (a derived `canAddSplitAtMark`). It does not select the new split and counts as an added-split edit.
  - A new detection after a setting change leaves the range, the mark and the view alone; `reset` clears them.
  - The limits (1 s, 10 min) live in the split slice's config, next to the zoom window's 20 s.
- **The playhead's resting position is player state, not split-store state.** It is the time playback resumes from, so it lives with the player.
- **One player.** The audition store becomes the one player for both kinds of playback, keeping its press-number rule: a clip that arrives for a stale press is dropped.
  - It keeps `toggle` for the split audition.
  - It adds range playback: play/pause, a playhead position that holds while paused, seek to a time (used by the playhead drag and "Back to start"), and a pause-for-drag that resumes on release only if it was playing.
  - `status` gains `paused` for the range. The button reads "Stop" while loading, "Pause" while playing and "Play" otherwise.
  - The decoded range WAV is kept until the range changes, the split audition plays, or the page goes away.
  - Seeking is setting the element's `currentTime` inside the WAV, which is exact.
  - At the range's end playback stops and the playhead goes back to the range's start.
  - The player stops on a view switch, a new range, the export and unmount. The existing watch that stops the split audition when the selection moves still applies, to the split audition only.
- **The clip command takes a start and a length** instead of a split time. The split audition asks for 4 s either side of its split, as now. The range asks for its start and length.
  - The pre-roll and the clamp at the file's ends are unchanged.
  - The source-file store's clip call follows the same change, and it still goes through the one queue and rejects when the file was replaced.
  - The clip timeout grows to cover a 10 min range late in a 3 h MP3 (measure it; about 3 s is expected, so the current 30 s is likely enough).
- **The whole-file view handles the drag.** A pointer composable, in the same style as the split and threshold drags, decides between a click (less than 4 px of movement, or a range under 1 s) and a range drag. It captures the pointer, reports the live range for the overlay, and commits the range on release.
  - A click keeps today's behaviour: select a split within 6 px, else move the zoom window. It now also switches the view to `split`.
  - The overlay is ink at about 10 % alpha with 1 px edges, drawn after the lands and before the split lines.
  - The zoom outline is drawn only while the view is `split`.
- **The Range view is a second view of the zoom panel**, in the split-zoom widget beside the zoom view.
  - It is a 160 px canvas: bars merged from the peaks over the range's buckets, lands, split lines, the dashed mark (the threshold line's dash) and the solid playhead, drawn each animation frame while playing.
  - A time-to-x axis maps the range onto the canvas width.
  - It is a focusable element: Left/Right 100 ms, Shift 1 s (mark), Enter (add split at the mark), Space (play/pause, auto-repeat ignored), Home (playhead to start).
  - A pointer composable sets the press order: within 6 px of the playhead it drags the playhead; else within 6 px of a split line it selects that split (and switches to `split`); else it places the mark and focuses the view.
  - The failure status line is shared in style with the zoom view's.
- **The review page** swaps the zoom view and the Range view on the store's view. The title row shows:
  - Split view: the `Split | Range` control, "Add split", "Play across split" (as today);
  - Range view: the `Split | Range` control, "Add split" (at the mark), "Back to range start" (icon button), Play/Pause.
  - The panel's title is the selected split's time in Split and the range's `start – end · length` in Range, with hundredths, from a pure title function like the zoom title.
  - Starting the export stops the player, as now.
- **The `Split | Range` control** is a small two-option segmented control built from the kit's look (DESIGN.md). If it needs a new kit component, that component gets its own row in the code layout and its look is checked against DESIGN.md before it lands.
- No change to export, detection, the loudness view, or what counts as a supported format.

## Testing Decisions

- A good test drives a module through its public interface and checks what a user or a caller would see: store state after an action, the ffmpeg arguments sent, a pointer composable's callbacks, a component's ARIA and emitted actions. It never reaches into private variables or canvas pixels. Canvas drawing stays untested beyond its pure helpers, as today.
- **Split store** (prior art: the split store spec), the main seam for the rules:
  - the range's clamps (1 s, 10 min from the anchor, the file's ends) and what a refused short range leaves unchanged;
  - the view switching: a range switches to `range`; selecting a split, a track row's split, a strip block's split, or moving the zoom window switches to `split`;
  - the mark: none on a new range, cleared by a new range, held inside the range, kept after adding a split;
  - adding at the mark: the 1 s rule from neighbours and the file's ends, the new split in order, not selected, counted once as an edit;
  - a setting change keeps the range; `reset` clears it.
- **Player store** (prior art: the audition store spec, with the source-file store's clip stubbed and a fake `Audio` element):
  - range play, pause, resume without a second clip call;
  - the playhead's position while playing and paused;
  - seek and back-to-start, playing and paused;
  - pause-for-drag and resume on release;
  - the range end returning the playhead to the start;
  - the split audition and range playback stopping each other;
  - a stale clip dropped after a stop or a new range;
  - a failure as one line;
  - a file-replaced rejection staying silent.
- **Clip command** (prior art: the clip and slice command specs with the fake ffmpeg): the arguments for a start and a length, the pre-roll capped at the start, the clamp at the file's end, and the returned start and length.
- **Pointer composables** (prior art: the split drag and threshold drag specs, with hand-made pointer events):
  - the whole-file drag: the 4 px threshold, click versus drag, the live range, pointer capture, the clamp passed through;
  - the Range view's press: the order playhead, then split line, then mark; a playhead drag's pause and resume calls.
- **Pure helpers** (prior art: the axis, zoom-title and zoom-bars specs): the range axis (time ↔ x), the range title text, the range's bars from the peaks.
- **Components** (prior art: the split zoom and review page specs):
  - the Range view's keyboard (Left/Right/Shift on the mark, Enter, Space without auto-repeat, Home) and its slider-style ARIA;
  - the review page's title row in each view: the `Split | Range` control's enabled state, Add split, Back to start and Play/Pause labels and enabled states;
  - the page swapping the two views on the store's view.
- No new e2e spec: the export does not change. The flow is checked by hand in Chrome with the `playwright-cli` skill, in all three supported formats, including a 10 min range late in the 3 h MP3 to measure the decode wait.

## Out of Scope

- Adjusting a range's edges after it is dropped (a new drag replaces it).
- Making a range on the loudness view, the zoom view or the track strip.
- Looping a range, playback speed, volume, or scrubbing audio while dragging the playhead.
- Exporting a range, or anything else that changes the export.
- Moving a split in the Range view: splits are still moved only in the zoom view.
- Keeping a range across a reload or a new file.
- Streaming or chunked decoding to lift the 10 min limit.
- A new e2e spec.

## Further Notes

- **Glossary changes** (to land with this spec):
  - **Range**: a stretch of the source file, 1 s to 10 min, that the user drags out on the whole-file view to listen to. _Avoid_: selection, section, region.
  - **Mark**: the spot in a range where "Add split" puts a split. _Avoid_: cursor, marker.
  - **Playhead**, widened: the 1 px line that marks the point being heard, or where playback will resume, in the zoom view during an audition and in the Range view always.
  - **Audition** keeps its meaning (the 8 s across the selected split). Hearing a range is "playing the range".
- **Milestone 8, "Listening to a range"**, follows the ritual in the milestones doc. The concept note covers two points:
  - why a WAV grows with its length: about 176 KB per second at 44.1 kHz stereo 16-bit, so 10 min is about 106 MB, hence the limit;
  - why pausing and seeking inside a WAV are exact, where seeking in a VBR MP3 is not (note 06).
  - Its worked example uses real numbers from `sample1`: a 10 min range's size and its measured decode time late in the file.
- Work stays on the `feat/select-section-and-play` branch. A CHANGELOG line goes under Unreleased. In AGENTS.md, the code layout rows for the split store, the split-zoom widget, the whole-file view and the review page change. The architecture doc's audition flow is redrawn as the player flow.
- The decode time for the longest range is the one number this spec does not know yet. If a 10 min range late in the 3 h MP3 takes much longer than about 3 s, revisit the limit before building on it.
