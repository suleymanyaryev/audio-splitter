# 08: Track view: mark and double-click

**What to build:** a click in the Track view places the Track view's own mark, a dashed line, and leaves the playhead where it is. A double-click moves the playhead there, or, within 6 px of one of the track's end split lines, selects that split and opens the Split view. A press within 6 px of the playhead still drags it. The keys stay: Left/Right 1 s, Shift 10 s, Space, Home. The Track view's mark is kept while the same track stays selected and cleared when another track is selected; it never mixes with the Range view's.

**Blocked by:** 05 (Range view: click, double-click and keys), for the press helper

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 70–75)

- [ ] The split store keeps one mark per view: the Range view's as today, the Track view's held inside the selected track and cleared when the selected track changes.
- [ ] The Track view uses the press helper with its end splits as the double-click's split lines; it draws its mark as the Range view does.
- [ ] The shortcuts dialog's Track view section follows.
- [ ] Specs: the split store's two marks; the Track view's press and double-click through the helper; its keys unchanged.
- [ ] `docs/architecture.md` follows; CHANGELOG line under Unreleased (Changed).
