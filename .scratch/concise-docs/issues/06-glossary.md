# 06: The glossary holds definitions

**What to build:** GLOSSARY.md says what each domain word means, grouped by cluster, without tuned numbers, UI labels or behaviour. See the spec's "GLOSSARY.md". Follow the `domain-modeling` skill's glossary format.

**Blocked by:** 01 (the doc contract)

**Status:** ready-for-agent

- [ ] Each entry is one or two sentences on what the word means, plus its words to avoid.
- [ ] No entry quotes a tuned number (seconds, dB, ranges, speeds), a UI label or a key, or states a behaviour or lifecycle rule.
- [ ] Entries named as verbs ("Removing a track") name a thing.
- [ ] Subheadings group the file and its formats, splits and tracks, views and playing, matches, and detection.
- [ ] Every term from before is still there. These are left unchanged, for a separate naming session:
  - "Mark" as a term, a word to avoid and a verb.
  - "Copy" against "Kept copy".
  - "Cursor" to be avoided under two terms.
  - "Checked" and "dismiss", which have no entry.
- [ ] The code comment in the split proposer that still says "Find gaps" says "Find splits", and `pnpm lint:changed` is green.
- [ ] GLOSSARY.md is near 1,050 words.
