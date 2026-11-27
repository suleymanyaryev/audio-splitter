# 06: The glossary holds definitions

**What to build:** GLOSSARY.md says what each domain word means, grouped by cluster, without tuned numbers, UI labels or behaviour. See the spec's "GLOSSARY.md". Follow the `domain-modeling` skill's glossary format.

**Blocked by:** 01 (the doc contract)

**Status:** resolved

- [x] Each entry is one or two sentences on what the word means, plus its words to avoid.
- [x] No entry quotes a tuned number (seconds, dB, ranges, speeds), a UI label or a key, or states a behaviour or lifecycle rule.
- [x] Entries named as verbs ("Removing a track") name a thing.
- [x] Subheadings group the file and its formats, splits and tracks, views and playing, matches, and detection.
- [x] Every term from before is still there. These are left unchanged, for a separate naming session:
  - "Mark" as a term, a word to avoid and a verb.
  - "Copy" against "Kept copy".
  - "Cursor" to be avoided under two terms.
  - "Checked" and "dismiss", which have no entry.
- [x] The code comment in the split proposer that still says "Find gaps" says "Find splits", and `pnpm lint:changed` is green.
- [x] GLOSSARY.md is near 1,050 words. (1,300: see Comments)

## Comments

- **Terms.** Every term from before is still there; a diff of the bold entry names shows one rename only. "Removing a track" became **Track removal**, as the ticket asks, and its one code citation (`split.ts`, `removeTrack`) was re-pointed. "Contrast peak" and "contrast split" stay inline under Contrast.
- **Words to avoid.** All are kept. The only change is that "Find gaps" lost its parenthesis "(the button is Find splits)", which named a UI label.
- **Word conflicts left alone,** as the ticket says: "Mark" as a term, a word to avoid and a verb; "Copy" against "Kept copy"; "Cursor" under two terms; no entry for "Checked" or "dismiss".
- **Code citations.** Every `GLOSSARY.md: <Term>` citation in `src/` names an entry that exists. Some sit beside a number or rule the glossary no longer states, such as `decode-clip.ts` "up to 10 min (a range, GLOSSARY.md)". They cite the term's meaning, so they were left.
- **Word target.** GLOSSARY.md is 1,300 words (wc), against ~1,050. Each entry is one or two sentences plus its words to avoid; the rest is the 40 terms and their avoid lists.
- **Checks.** `pnpm vitest run src/entities/split` → pass (12 files, 596 tests); `pnpm lint:changed` → pass; `pnpm test:changed` → pass (21 files, 1,440 tests); `pnpm typecheck` → pass. The audit was done inline, not by a subagent: term and avoid-word diffs, plus a grep for numbers and UI labels.
