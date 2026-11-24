# 03: Default settings

**What to build:** the user saves the silence threshold and the minimum gap length they tuned as their default settings, and every later source file starts from them, also after a reload. The threshold is kept as a distance under the median, so it suits files of any loudness. "Restore built-in" goes back to 18 dB and 2 s.

**Blocked by:** 01 (Gaps on request)

**Status:** ready-for-agent

Spec: `.scratch/cutting-tool-base/spec.md` (stories 4, 5 and 32–43; Implementation Decisions, "Default settings"). The 3 dB check behind saving a distance is in the spec's Further Notes.

- [ ] Save as default:
  - It is in the loudness panel's title row.
  - It saves the current minimum gap length and `median − threshold`, rounded to 0.1 dB.
  - Its tooltip names the two values ("Save 18 dB under the median and 2 s as the default").
  - It is disabled while the sliders match the default settings.
- [ ] Restore built-in:
  - It sets the default settings back to 18 dB and 2 s, and moves this file's sliders there.
  - It is disabled while the default settings are the built-in ones.
- [ ] A new source file opens with the threshold at its median minus the saved distance, rounded to 0.1 dB and held to −60…0 dB, and with the saved minimum gap length. This holds after a reload.
- [ ] Saving and restoring change no split, name or edit.
- [ ] Storage:
  - It uses one versioned key, read with validation (the 0.1 grid; the minimum gap length within 0.2…5 s).
  - Anything else falls back to the built-in values.
  - With blocked storage, the app works and a save lasts for the visit.
- [ ] `CHANGELOG.md` has its line under Unreleased.
