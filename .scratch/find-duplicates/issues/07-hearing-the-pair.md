# 07: Hearing the pair

**What to build:** the user hears a matched track against the track it matches. A match's words are a link that selects the other track in the Track view. The Track view's title gives the words. `C` in the Track view swaps to the same moment in the other track and keeps playing if it was. Pressing `C` on the kept copy goes back to the track the swap came from.

**Blocked by:** 02, 06 (`C` needs the partial matches' shared stretches).

**Status:** resolved

Spec: `.scratch/find-duplicates/spec.md` (stories 49–57; Implementation Decisions, "The split store", the swap target, and "Track list, track strip and Track view").

- [x] The words in the track list are a link that selects the other track and shows the Track view. The link stops the row's click.
- [x] The Track view's title adds the selected track's match words.
- [x] The swap target is a store getter, from the selected track and the playhead:
  - the match whose shared stretch holds the playhead, at the same moment in the other track;
  - outside every shared stretch, the start of the nearest one;
  - on the kept copy, the track the last swap came from while that match is live;
  - otherwise none, and `C` does nothing.
- [x] `C` selects the target track and moves the playhead there. If the track was playing, it plays on from there; if not, it stays paused at the new playhead.
- [x] Clear splits, New file and a dead match clear the way back.
- [x] The shortcuts dialog lists `C` in the Track view's section.
- [x] Store specs cover the swap target. Track View specs cover `C` and playing on.
- [x] `CHANGELOG.md` has the line under Unreleased.

## Comments

Built 2026-11-25. No "By ear" box, so no browser check; the link, the longer title and `C` were not looked at in a real browser (ticket 08's by-ear check should).

- **`split.swapTarget(playheadSeconds)`** (a time in the file) gives `{ track, seconds }` or null; **`split.swapTrack(playheadSeconds)`** selects the target and returns it (null when none, or when the discard question opened instead). The Track view moves the playhead with `seekStretch` and, if the track was playing or decoding, starts the new one with `toggleStretch`.
- **The way back** is the last swap's two tracks with their ends (`wayBack` in `split.ts`). It holds while both keep their ends and a live match joins them, and a watcher lets it go for good when it fails, so a match that returns with its ends does not bring it back. `clearSplits`, `open`, `reset` and a dismissal of that match clear it. Only `C` sets it: following a match's link in the track list does not, so `C` on the kept copy reached by the link does nothing.
- **Reading the spec leaves open, chosen as follows (veto it if wrong):** a track that was swapped to, with a live match to the track the swap came from, goes back there before it looks at its own matches. So a track that has its own earlier matches and is also a swap's destination goes back first, and back and forth keeps working. Otherwise only the matches that name an earlier track count (the track's own). A kept copy that was not swapped to has no target.
- **"Nearest" shared stretch** is by distance from the playhead to the stretch, the first found on a tie; the target is the start of that stretch in the other track, even when it is behind the playhead.
- **The title** is `trackTitle(track, trackCount)`: the existing title, then ` · ` and the words of each match joined by `, ` ("04 · 0:03:00.93 – 0:04:50.02 · 01 from 0:02, part of 02 from 0:12.4"). A track with several matches makes a longer title; not looked at for wrapping.
- **The words are a `button`** underlined (rust is not for links), inside the same `p`, with the tooltip on the button, so the keyboard reaches the tooltip now. It selects the other track through `selectTrack`, which asks first when the track left has pending splits. The shortcuts dialog's Track list section gained "Click a match's words".
- `C` is left alone with Shift, Ctrl, Cmd or Alt, and a held `C` swaps once. With no target it is not reported to the page.
- Specs: store (`find-duplicates.spec.ts` "the swap target"), `TrackView.spec.ts` ("C"), `TrackList.spec.ts` ("the link of a match"), `track-title.spec.ts`, `ShortcutsDialog.spec.ts`. The title's wiring in `ReviewPage.vue` has no spec of its own.
- `pnpm lint` fails on `src/entities/split/lib/find-matches.ts:166` (`sonarjs/cognitive-complexity`, 33 of 15), which this ticket did not touch: it comes from ticket 06 and is left for ticket 08.
- Docs left to ticket 08 (`docs/architecture.md`, README, note 11 "Where it lives"); DESIGN.md changed (the words are a link).

GLOSSARY candidates (not written): **Way back** (the swap's memory of where `C` came from), **Shared stretch**. No ADR.
