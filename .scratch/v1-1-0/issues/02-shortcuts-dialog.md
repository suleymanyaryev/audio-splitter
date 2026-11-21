# 02: Shortcuts dialog

**What to build:** on the review screen, a `?` icon button in the header ("Keyboard shortcuts (?)"), or the `?` key pressed anywhere on the page, opens a dialog listing every key and pointer gesture of the review screen, grouped by area: Split view, Track view, Range view, whole-file view, Track list, with the view on show first. `?` typed into a text field (a track name) stays a question mark. Escape or a click outside closes it. The dialog describes the keys and gestures as they are today; tickets 05, 08 and 09 update it as they change them.

**Blocked by:** 01 (Icon buttons with tooltips)

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 52–57)

- [ ] The kit gains an ordinary dialog beside the alert dialog: it closes on Escape and on a click outside, in DESIGN.md's dialog look.
- [ ] The header shows the `?` icon button only on the review screen, with its tooltip and key hint.
- [ ] The review page listens for `?` page-wide and ignores it while a text field has focus.
- [ ] The dialog's content is static, one section per area with keys and gestures (including the whole-file view's click and range drag, the zoom view's handle keys and the playhead drag), ordered with the view on show first.
- [ ] Specs: the button only on the review screen; `?` opening the dialog; `?` typed in a track name field not opening it; Escape and outside click closing it; the first section following the view.
- [ ] DESIGN.md gains the ordinary dialog; CHANGELOG line under Unreleased (Added).
