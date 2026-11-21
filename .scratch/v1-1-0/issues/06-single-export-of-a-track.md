# 06: Single export of a track

**What to build:** an "Export track…" icon button in the Track view's title row opens a name dialog with the selected track's name filled in (`<source stem> NN` for an unnamed track). Enter or OK confirms; OK is disabled while the name is empty, and the name is held to a track name's length. The first single export of a file asks for a folder; later ones go to that folder with no picker, and "Change folder" in the dialog picks another. Confirming stops playback, renames the track when the name was changed, and writes `NN name.ext` with the full export's tags straight into the folder, taking ` (2)`, ` (3)` … when the name is taken. The dialog shows progress with Cancel while it runs, shows a failure with its reason, and closes on success, after which a line at the bottom of the view says "Saved `<file>` in `<folder>`" until the next press or key in the view, a view switch or a selection change.

**Blocked by:** 02 (Shortcuts dialog), for the kit's ordinary dialog

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 14–23, 30–43)

- [ ] Prefactor: the full export's file writing (with removal of an empty file on failure), sanitising, number padding, file naming and tags are shared within the export widget, with the full export's specs still passing.
- [ ] A single-export store beside the full export: opened with a track, holds the default name, the remembered folder (forgotten when the source file changes), status (idle, naming, running, saved, failed), the saved file and folder names, and a failure; a closed picker leaves the dialog open.
- [ ] File name and tags are the full export's for that track, padded to the current track count; an unchanged default for an unnamed track renames nothing.
- [ ] A single export and the full export each refuse to start while the other runs.
- [ ] The review page stops playback on confirm, shows the name dialog, and the saved line in the Track view.
- [ ] Specs (single-export store with fake folder handles and a stubbed cut): a track end to end; folder picked once, forgotten on a new file, re-picked; closed picker; ` (2)` and ` (3)`; rename only when changed; cancel; failure leaving no file; mutual refusal with the full export. Review page: the button, the dialog's default, Enter, empty name, the saved line and when it clears.
- [ ] e2e: per supported format, one track exported singly, read back and decoded; the same track twice gives ` (2)`. `pnpm test:e2e` runs in Final.
- [ ] AGENTS.md's line on `e2e/export.spec.ts`, GLOSSARY's **Single export** (already written), `docs/architecture.md` follow; CHANGELOG line under Unreleased (Added).
