# 07: Hearing the pair

**What to build:** the user hears a matched track against the track it matches. A match's words are a link that selects the other track in the Track view. The Track view's title gives the words. `C` in the Track view swaps to the same moment in the other track and keeps playing if it was. Pressing `C` on the kept copy goes back to the track the swap came from.

**Blocked by:** 02, 06 (`C` needs the partial matches' shared stretches).

**Status:** ready-for-agent

Spec: `.scratch/find-duplicates/spec.md` (stories 49–57; Implementation Decisions, "The split store", the swap target, and "Track list, track strip and Track view").

- [ ] The words in the track list are a link that selects the other track and shows the Track view. The link stops the row's click.
- [ ] The Track view's title adds the selected track's match words.
- [ ] The swap target is a store getter, from the selected track and the playhead:
  - the match whose shared stretch holds the playhead, at the same moment in the other track;
  - outside every shared stretch, the start of the nearest one;
  - on the kept copy, the track the last swap came from while that match is live;
  - otherwise none, and `C` does nothing.
- [ ] `C` selects the target track and moves the playhead there. If the track was playing, it plays on from there; if not, it stays paused at the new playhead.
- [ ] Clear splits, New file and a dead match clear the way back.
- [ ] The shortcuts dialog lists `C` in the Track view's section.
- [ ] Store specs cover the swap target. Track View specs cover `C` and playing on.
- [ ] `CHANGELOG.md` has the line under Unreleased.
