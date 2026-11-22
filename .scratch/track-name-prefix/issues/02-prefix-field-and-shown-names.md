# 02: The prefix field and the names on screen

**What to build:** The **track name prefix** (glossary), from the field to every name on screen. When a source file loads, the "Prefix" field in the "Track list" panel's header holds the file's stem followed by `-`. Every unnamed track shows the prefix followed by its zero-padded number (`dreamscape-01`), with nothing put between them. Typing a prefix renames every unnamed track at once and leaves renamed tracks alone. Export file names do not change yet (ticket 03).

- The split store holds the prefix as file-level state. It is not an edit, a setting change keeps it, and the store's reset clears it.
- The review page sets the prefill on mount, where it starts detection: the stem followed by `-`, or empty when the stem is empty (`.m4a`). A new file gets its own prefill, because the page mounts again.
- The field has the visible label "Prefix", the accessible name "Track name prefix", and takes up to 100 characters. It writes to the store on every input. Enter leaves it and keeps the text; Escape puts back the value from when it got the focus, then leaves it. The list box keeps its height.
- The track list shows an unnamed track's name field with the default name in muted text. Saving what the field showed is still no rename, and saving an empty name still unnames the track.
- A strip block's visible label is the number for an unnamed track and the typed name for a renamed one. Its tooltip and accessible label give the shown name.
- The Track view title shows the shown name, which it picks up on its own.

**Blocked by:** 01 (Tracks carry their own name beside the name shown)

**Status:** ready-for-agent

- [ ] Split store spec: an unnamed track's shown name is the prefix plus its padded number; changing the prefix changes every unnamed track and no renamed one; an empty prefix gives the padded number; the prefix is no edit; a setting change keeps it; reset clears it
- [ ] Review page spec: the prefix is `<stem>-` after mount, and empty for a file with no stem
- [ ] Track list spec: the field is in the header with its label and accessible name; typing renames unnamed tracks at once; Enter keeps the text; Escape restores the earlier value; unnamed names are muted, renamed ones are not
- [ ] Track strip spec: an unnamed block shows its number and a renamed one its typed name; the tooltip and accessible label give the shown name
- [ ] Track title spec matches the prefixed name
- [ ] Changelog line under Added, in the same commit
- [ ] Architecture doc updated only if its description of the split store's state needs the prefix
- [ ] Shown in the browser: load a sample, edit the prefix, rename one track, edit the prefix again
