# Audio Splitter v2: milestone sequence

Status: capture of a discussion on 2026-11-24. Not a spec, and nothing here is built.

This file holds the v2 milestones, the decisions behind them and the questions still open. It is written so that a fresh session can pick up any milestone, or carry on the discussion, without the original conversation. Vocabulary is in [GLOSSARY.md](../../GLOSSARY.md); new words used here are not in it yet and are listed under [New words](#new-words).

## How to use this file

- **To continue the discussion:** start at [Open questions](#open-questions). Items marked _assumed_ were proposed by the agent and not yet confirmed by the user.
- **To start a milestone:** open a fresh session and follow [How a milestone runs](#how-a-milestone-runs) with that milestone's entry.
- **When a milestone ships or a decision changes:** update its entry here, so the file stays true.

## Where v2 comes from

Two sources were merged.

**The user's six wishes:**

1. Process video files: mp4, webm and a couple of other well-known formats.
2. Detect duplicate tracks, started by a button.
3. Find gaps and add splits on a button press, not automatically.
4. Save the user's own defaults for the silence threshold and the minimum gap length, used for every later source file.
5. Find a track's real name through a public music service, like Shazam. One track at a time is enough.
6. Download a video from YouTube and process it locally.

**What v1 left behind:** the "Out of scope" list in the [v1 wayfinding map](../audio-splitter/map.md#out-of-scope), the "Out of Scope" section of each later spec under `.scratch/`, and the README's "Not in v1" line. There are no deferred tickets or milestones as files.

**One wish changed the shape of v2.** The reason for wish 3 is a new capability: the app as a general cutting tool. The user loads any audio, adds splits by hand, and exports only the pieces they want. Splitting a long file into tracks stays, as one use among two.

## How a milestone runs

One milestone per fresh session, along the flow already used for the features after v1:

1. `/grill-with-docs` on the milestone's entry below. This settles its open questions and adds its new words to `GLOSSARY.md`.
2. Where the entry names a measurement, run it first as a throwaway spike. Its result can change or move the milestone.
3. `/to-spec`, then `/to-tickets`, into `.scratch/<milestone-slug>/`.
4. `/implement` per ticket, or `/implement-spec` for the whole spec.

The project's own rule wraps each milestone that teaches an audio idea ([AGENTS.md](../../AGENTS.md#learning-first)): explain the idea with a number from a real sample, write `docs/concepts/NN-<slug>.md`, stop for the user's confirmation, then build, then stop again. Concept notes continue from `11`.

Wayfinder was considered for v2 and not used. No open question blocks the first milestone, each measurement belongs to one milestone, and locking decisions for the last milestone now would fix them against an app the earlier ones will have changed.

## Decisions that hold across milestones

Each was agreed with the user on 2026-11-24 unless marked _assumed_.

- **No ML in v2.**
- **Detection never runs by itself.** A loaded source file is one track with no splits until the user asks for gaps.
- **Export stays stream copy.** Cuts within one frame (about 23 ms for AAC) are good enough, also for the cutting-tool use. No re-encoding and no sample-accurate cuts.
- **A track can be left out of the export.** A track is in one of three states: included, left out by hand, or left out as a duplicate of another track. Clearing a duplicate mark puts the track back in.
- **A duplicate is a mark, not a deletion.** The user listens, then keeps or clears the mark. Duplicate detection runs from its own button.
- **A full duplicate is left out automatically; a partial match is marked but stays in the export** until the user decides. _Assumed._ A partial match usually means a split is missing or misplaced in one of the two tracks.
- **Embedded chapters come first when a source file has them.** The user gets files both from yt-dlp and from converter sites, so chapters will be present only sometimes.
- **Source files are both gapped and crossfaded.** So the crossfade work is in v2.
- **Signal maths stays hand-written** (correlation, FFT, band energies), as in v1.

## The sequence

| #   | Milestone                                 | Audio idea             | Starts with a measurement |
| --- | ----------------------------------------- | ---------------------- | ------------------------- |
| 1   | Cutting-tool base                         | None (setup)           | No                        |
| 2   | Duplicate tracks                          | Cross-correlation      | Yes                       |
| 3   | Containers, video and more audio formats  | Streams in a container | Yes                       |
| 4   | Chapters and pasted tracklists            | Container metadata     | Yes                       |
| 5   | Splits survive a reload                   | None (setup)           | No                        |
| 6   | Shallow dips, with a confidence per split | Adaptive threshold     | Yes                       |
| 7   | Spectrum view                             | Frequency              | No                        |
| 8   | Changes of content, for crossfaded tracks | Comparing spectra      | Yes                       |

The order is the agent's proposal; the user confirmed milestone 1 goes first. Two things can move the rest:

- A poor result in milestone 2's measurement moves duplicates after milestone 7.
- The README says v2 starts with "help for playlists that repeat". The user confirmed milestone 1 goes first (2026-11-24), so that README line is updated with it.

---

## Milestone 1: Cutting-tool base

**Audio idea.** None.

**Why.** The app should work as a general cutting tool, and the user wants detection and its defaults under their control.

**Includes.**

- No detection on load. The review screen opens with one track and no splits.
- The two settings preview the gaps on the loudness curve. A "Find gaps" button turns the gaps into splits. The confirm dialog on a setting change goes away.
- The user's own defaults for both settings are saved and used for every later source file.
- A track can be left out of the export (the three-state decision above).

**Facts from the code.**

- `detect` in [`split.ts`](../../src/entities/split/model/split.ts) sets both settings to their defaults and calls `findAgain`, which replaces all splits and names. `ReviewPage` calls `detect` once, on mount.
- The store keeps `gaps` and `splits` as separate state, so a preview of gaps without splits needs no new model.
- The defaults are in [`defaults.ts`](../../src/entities/split/config/defaults.ts): the silence threshold is the loudness curve's median minus 18 dB, and the minimum gap length is 2 s.
- A track name lives on the split that starts the track. The left-out state can sit beside it and follow the same rules.
- "Removing a track" today merges it into its neighbours. That is a different act from leaving it out, and both stay.
- `localStorage` already holds the volume, the mute flag, the play speed and the theme choice.

**Status.** Grilled on 2026-11-24; spec at [`.scratch/cutting-tool-base/spec.md`](../cutting-tool-base/spec.md), ready for tickets. Every open question is settled there:

- Find gaps adds only, into gaps that hold no split; "Clear splits" starts over, asking when edits would be lost.
- The default settings keep the threshold as a distance under the median, saved and restored beside the sliders.
- Left-out tracks inherit their state on a split and on a merge, as names do; the export renumbers the tracks it writes, and "track N" stays the place in the file.
- Minimum track length and remembering the export folder are out.
- This milestone ships first, as 2.0.0, and the README's order line is updated.

## Milestone 2: Duplicate tracks

**Audio idea.** Cross-correlation: sliding one signal along another to find where they agree.

**Why.** A source file is often a playlist played several times. `samples/sample1.m4a` appears to be one.

**Includes.**

- A "Find duplicates" button, separate from finding gaps.
- A sliding match: the shorter track's stretch of the loudness curve is moved along the longer one's, looking for a long stretch that agrees. This finds full and partial duplicates, and works when the repeat is in a different order.
- Two kinds of mark: "duplicate of 03", and "matches 1:10 of 03".
- The user auditions a marked track and can clear the mark.

**Why the loudness curve.** It is already in memory, so no new decode is needed. Spectral fingerprints are the stronger tool but need milestone 7. Timbre comparison answers "sounds similar", which is not "same recording", so it is not used here.

**Measure first.** On `sample1.m4a`: confirm it is a loop, then check that the match score separates real duplicates from different tracks with a similar beat. If it does not, this milestone moves after milestone 7 and uses the spectrum.

**Open questions.**

- Which track of a pair gets the mark. _Assumed:_ the later one.
- The score that counts as a match, and the shortest stretch that counts as a partial match.
- Cost. A naive sliding match over every pair at the curve's full resolution is too slow; a coarser curve or an FFT-based correlation fixes it. Not measured.
- What happens to marks when a split moves or is deleted after detection.
- How to hear a marked track against the track it matches.

## Milestone 3: Containers, video and more audio formats

**Audio idea.** A file is a container of streams. Taking the audio out, and putting it into another container, changes no sound.

**Why.** Wish 1, plus "any audio" for the cutting tool. The output stays audio only.

**Includes.**

- Video containers as source files: MP4 and MOV, WebM and MKV. Only the first audio stream is used.
- More audio: WAV, FLAC and Vorbis. AC-3 only if a real file needs it.
- An export target for each audio codec, for example Opus from WebM into `.opus`.

**Facts from the code.**

- [`probe.ts`](../../src/entities/source-file/api/probe.ts) decides by container and codec, never by extension. Its list has three pairs.
- Decode and cut already pass `-map 0:a:0`, so a video stream is skipped.
- An `.mp4` with AAC audio matches an existing pair, so it probably loads today and exports `.m4a`. Not run.

**Measure first.**

- Opus copied from WebM into `.opus`: cut starts and ends, as in the v1 spikes.
- Decode speed on a real video file, where ffmpeg must skip the video data.
- Cuts in WAV, FLAC and Vorbis. FLAC frames are longer than AAC frames, so its cut accuracy needs a number.
- That the pinned ffmpeg core can read and write each of these.

**Open questions.**

- The exact list of pairs v2 claims. v1's rule was that a format is supported only once it passes the spike's bar.
- The glossary's "Supported format" names three pairs and must widen.
- The user does not expect files over 2 GB, so that limit is not checked unless one turns up.

**Needs from the user.** One real video file. A yt-dlp download made with `--embed-chapters` covers milestone 4 too.

**Status.** Grilled on 2026-11-25; decisions and first measurements in [`.scratch/video-and-more-formats/analysis.md`](../video-and-more-formats/analysis.md#decisions). It claims five pairs: AAC in MP4 or MOV, MP3, Opus in Ogg, Opus in WebM or Matroska, Vorbis in Ogg. No real video file is needed: the spike builds stand-ins from the samples the way yt-dlp does. Spec at [`.scratch/video-and-more-formats/spec.md`](../video-and-more-formats/spec.md), ready for tickets; its first two are the browser spike and concept note 12.

## Milestone 4: Chapters and pasted tracklists

**Audio idea.** A container carries metadata beside its streams: chapters are times with titles.

**Why.** Chapters give splits and track names with no detection, and they also work for crossfaded tracks. This may cover most of wish 5.

**Includes.**

- When the probe finds chapters, the review screen offers "Use chapters (14)" beside "Find gaps".
- Chapter starts become splits and chapter titles become track names.
- A pasted tracklist does the same for files without chapters: lines such as `12:30 Artist - Title`, copied from a video's description. _Assumed._

**Facts.**

- Chapters exist in MP4 and M4A (audiobooks), Matroska and WebM, MP3 (ID3 chapter frames, used by podcasts) and Ogg (chapter comments). ffmpeg prints them in the probe output the app already parses.
- `yt-dlp --embed-chapters` writes a video's chapters into the file. That it falls back to timestamps in the description is from memory, not checked.
- `ffprobe` on all six files in `samples/` on 2026-11-24 found no chapters in any of them.
- The cut already passes `-map_chapters -1`, so chapters never leak into exported tracks.

**Measure first.** That ffmpeg.wasm's probe prints the chapters of a real yt-dlp download.

**Open questions.**

- Whether "Use chapters" replaces existing splits or asks first, as "Find gaps" does.
- Which tracklist line shapes to accept.

## Milestone 5: Splits survive a reload

**Audio idea.** None.

**Why.** A reload, a crash or a closed tab loses every split and name. That costs more with long hand-made sessions in the cutting tool. _Assumed in v2; the user asked what it solves and did not object._

**Includes.**

- Reopening the same source file offers to restore its splits, track names, left-out tracks, duplicate marks, settings and prefix.

**Open questions.**

- How a file is recognised as the same one (name, size and modified time is the simple answer).
- Where the data lives: `localStorage` or IndexedDB.
- Whether the analysis is saved too, or run again on reopening.
- `CHANGELOG.md` says saved data that needs migrating is a major version. The saved shape needs a version from day one.

**Not included.** Several source files open at once. Every store assumes one file, and restoring on reopening gives most of the benefit.

## Milestone 6: Shallow dips, with a confidence per split

**Audio idea.** Adaptive threshold: judging a dip against the loudness around it, not against one fixed line.

**Why.** Many crossfades still dip a few dB. This catches them from the loudness curve alone, before any spectrum work.

**Includes.**

- Finding dips relative to the surrounding stretch of the source file.
- A confidence per proposed split, so the user knows which to audition first.

**Measure first.** On a real crossfaded source file: how many track boundaries the step finds, and how many false ones.

**Open questions.**

- How the loudness panel shows a threshold that is no longer one draggable line.
- Whether this is a mode of "Find gaps" or its own button.
- How confidence is shown, and whether low-confidence proposals start as splits or as something weaker.

**Needs from the user.** One real crossfaded source file in `samples/`.

## Milestone 7: Spectrum view

**Audio idea.** Frequency: any stretch of sound is a sum of tones, and the FFT finds how much of each.

**Why.** It is the learning vector v1 dropped (the draft's Milestone 6), and milestone 8 needs it.

**Includes.**

- A hand-written FFT.
- A spectrogram the user can look at.

**Open questions.**

- Where the spectrogram shows: a fourth view of the zoom panel, or a panel of its own.
- When the spectrum is computed. Today the PCM is dropped after each decode slice; only the loudness curve and one peaks array are kept. A whole-file spectrum must be computed inside the load loop, or decoded again on demand.

## Milestone 8: Changes of content, for crossfaded tracks

**Audio idea.** Comparing spectra: a new track sounds different from the one before it, even with no dip in loudness.

**Why.** It is the only way in v2 to propose splits where tracks are crossfaded and the file has no chapters.

**Includes.**

- Describing each second by the energy in a few frequency bands.
- Comparing the seconds before a point with the seconds after it. A peak in the difference is a proposed split.
- Ranking the proposals with milestone 6's confidence.

**What to expect.** Proposals, not answers. A verse-to-chorus change also scores high, and two similar-sounding tracks score low.

**Measure first.** On the crossfaded sample: where the real boundaries rank among the peaks.

---

## Gated: a track's real name by listening

Wish 5. Not a milestone until a test says it can work for the user's music.

- **The open route** is AcoustID with a Chromaprint fingerprint. It is free, and only a fingerprint leaves the browser. Its database follows MusicBrainz, so commercial releases match and obscure work music often does not.
- **Shazam** has no official public interface. **AudD** and **ACRCloud** are paid and upload audio, which breaks "nothing is uploaded".
- **The test:** run `fpcalc` on five exported tracks and look each up on AcoustID by hand. No matches means the feature is dead for this music.
- **If it passes**, it comes after milestone 7. Chromaprint is hard to hand-write so that it matches the service bit for bit, and the pinned ffmpeg core probably cannot produce it. Both need checking then.

All of the above about outside services is from memory and needs a research pass before it is relied on.

## Not in the app: downloading from YouTube

Wish 6. _Assumed out; the user has not confirmed._

- Storing gigabytes locally is possible (OPFS or a picked folder). Fetching is the obstacle.
- YouTube's media needs signature and token handling, there is no cross-origin access for a page on GitHub Pages, and downloading is against YouTube's terms.
- Any fix is a backend or a browser extension, which ends "browser-only, nothing is uploaded".
- Instead: the README gets a yt-dlp command that embeds chapters, and milestones 3 and 4 make its output load well.

## Out of v2

| Item                                                              | Why                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| ML                                                                | The user's decision                                                       |
| Hand-written time-stretch (ADR 0004)                              | The user's decision                                                       |
| CUE sheet, other browsers, rebinding keys, a smaller ffmpeg build | The user's decision                                                       |
| Re-encoding, sample-accurate cuts, zero-crossing snapping         | Cuts within one frame are good enough                                     |
| Several source files at once                                      | Costly; restoring on reopening covers most of it. _Assumed._              |
| Undo                                                              | Confirm dialogs and clearing a mark cover the costly mistakes. _Assumed._ |
| Hysteresis, snap to the quietest point                            | Wait for a real file that shows the need. _Assumed._                      |
| Timbre as "sounds similar"                                        | It does not answer "same recording"                                       |
| Lifting the 10 min limit on a range                               | Not asked for                                                             |

Hysteresis would fix one specific miss: a click or a reverb tail inside a gap breaks it into two quiet runs, each shorter than the minimum gap length, so no split is proposed.

## Open questions

Across milestones; each milestone's own questions are in its entry.

1. The items marked _assumed_ above need the user's yes or no: milestone 5 in v2, undo out, YouTube download out of the app, hysteresis and snap out, the partial-match rule, pasted tracklists, minimum track length in milestone 1.
2. Whether milestone 1 or milestone 2 comes first (see [The sequence](#the-sequence)).
3. Whether the name-recognition test is worth running at all once chapters and pasted tracklists exist.

## Needs from the user

- One crossfaded source file in `samples/` (milestones 6 and 8).
- One yt-dlp download with `--embed-chapters`, ideally a video file (milestones 3 and 4).

## New words

Used in this file and not yet in `GLOSSARY.md`. Each is settled in the grilling of the milestone that introduces it.

- **Left out** (milestone 1): a track that stays in the review but is not written by an export. The glossary lists "excluding a track" as a word to avoid for "Removing a track", so this state needs its own name.
- **Duplicate mark**, **partial match** (milestone 2).
- **Chapter**, **tracklist** (milestone 4).
- **Confidence** (milestone 6).
- "Supported format" (milestone 3) and "Edit" (milestone 1) exist and change meaning.
