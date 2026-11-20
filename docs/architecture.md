# Architecture

The [README](../README.md#architecture) shows the pipeline and the layers. This page goes one level down: how the stores pass data to each other, how the one ffmpeg session is shared, and how the load, player and export flows run. The folder-by-folder map is in [AGENTS.md](../AGENTS.md#code-layout); the words are defined in [GLOSSARY.md](../GLOSSARY.md).

The diagrams are drawn from the code. When a change alters what one of them shows (a store's status, a step in a flow, who calls whom), the diagram changes in the same commit.

## The stores

Seven Pinia setup stores hold all state, in memory only. Two are entities; five belong to the widget that owns the behaviour.

| Store              | Slice                      | Holds                                                                                                                                                                                                                                                                                                    |
| ------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source-file`      | `entities/source-file`     | The file, its format and duration, peaks, loudness curve, slice progress, load failure, the ffmpeg session                                                                                                                                                                                               |
| `split`            | `entities/split`           | The silence threshold and minimum gap length, the gaps, the splits with their track names, the derived tracks, the one selection (a split, a track or nothing; the selected split and the selected track are derived from it), the zoom window, the range, the mark and the panel's view, the edit count |
| `audition`         | `widgets/split-zoom`       | Whether the audition's clip and the stretch's (range or track) are loading, playing or paused, the failure, the stretch's resting place, the volume (dB) and the mute flag                                                                                                                               |
| `export-tracks`    | `widgets/track-strip`      | The export's status, the track in hand, the counts, the subfolder's name, the failure                                                                                                                                                                                                                    |
| `export-single`    | `widgets/track-strip`      | The single export's status (naming, running, saved, failed), the default name, the remembered folder, the saved file and folder names, the failure                                                                                                                                                       |
| `export-lock`      | `widgets/track-strip`      | Which export is writing (the full or a single one), so the two never run at once                                                                                                                                                                                                                         |
| `shortcuts-dialog` | `widgets/shortcuts-dialog` | Whether the shortcuts dialog is open                                                                                                                                                                                                                                                                     |

```mermaid
flowchart LR
  sourceFile[("source-file")]
  split[("split")]
  audition[("audition<br/>(the player)")]
  exporter[("export-tracks")]
  exporterSingle[("export-single")]
  exportLock[("export-lock")]
  reviewPage["ReviewPage"]

  sourceFile -- "loudness curve,<br/>once on mount" --> reviewPage
  reviewPage -- "detect(curve)" --> split
  split -- "selected split, range, selected track, view<br/>(a change of the selected split stops the audition,<br/>a new range stops the stretch, and so does<br/>a track change outside the Range view)" --> audition
  audition -- "clip(start, length, signal?)" --> sourceFile
  split -- "tracks and names,<br/>fixed when the export starts" --> exporter
  exporter -- "cutTrack(track)<br/>stopCuts()" --> sourceFile
  split -- "track, its end and count;<br/>renameTrack when the name changed" --> exporterSingle
  exporterSingle -- "cutTrack(track or range)<br/>stopCuts()" --> sourceFile
  exporter -- "take, release" --> exportLock
  exporterSingle -- "take, release" --> exportLock
```

- **`split` can't import `source-file`**, because two slices of one layer never import each other. `ReviewPage` reads the curve and hands it to `split.detect` when it mounts, and `split` keeps a reference to it to find the gaps again when a setting changes. When the page unmounts, it stops the player and resets `split`.
- **Widgets read the entity stores directly.** Every widget reads `split` for the splits, tracks and selection; all but the track list also read `source-file`, for the peaks, the curve, the duration or the session's calls.
- **Deleting a split merges the tracks either side of it.** **Removing a track is two of these.** `split.removeTrack` deletes the splits at both ends of a track (one at an edge, none for the only track); the removed track's name goes with its start split, and when the first track goes the next track's name moves to the file's start. Three places call `split.deleteSplit`: the "Delete split" button in the zoom view's title row (`ReviewPage`), Delete and Backspace on the split's handle (`SplitZoom`), and the trash button on a split row of the Track list. It counts as one edit for a detected split and takes the "added" edit back for an added one. A selected split that goes falls back to its neighbour; a selected track whose start split goes is re-keyed to the merged track, and any other selection stays.
- **The shortcuts dialog's flag is shared by three places.** The header's `?` button (`App.vue`) and the `?` key (`ReviewPage`, through `useQuestionMarkKey`, which ignores a text field, Ctrl, Cmd and Alt, and a page that already has a dialog open) set it; the dialog on `ReviewPage` shows it, and the page clears it when it unmounts. The dialog reads the split store's `view` only to put the view on show first. Its rows are written by hand in `widgets/shortcuts-dialog/config/shortcut-sections.ts`, so a change to a key or a gesture changes its row in the same commit.
- **A setting change replaces every split and name.** With edits made, the loudness panel's replace guard holds the change back and asks first; "Replace" applies it and clears the edit count. "New file" asks the same way in `App.vue`.

## The ffmpeg session

[`shared/api/ffmpeg/ffmpeg.ts`](../src/shared/api/ffmpeg/ffmpeg.ts) wraps one ffmpeg.wasm worker with the source file mounted read-only (WORKERFS), so ffmpeg reads only the bytes it asks for. Three rules keep it alive through long files:

- **A watchdog on every call.** A call into the worker can hang without answering, so each one races a timeout. On timeout the worker is terminated, the only thing that stops it.
- **A fresh worker every 20 calls.** ffmpeg ends each call by throwing, and its small call stack wears down; measured failures started at the 75th call. Before the 21st call (and after any terminated worker) the session starts a fresh worker and mounts the file again, which takes under 100 ms. Callers never see it.
- **`interrupt()` stops the running command.** It rejects the call with "ffmpeg was stopped" and terminates the worker; the next call starts a fresh one.

The `source-file` store opens the session when a load starts and keeps it open once the file is ready. After that, audition and range clips and export cuts go through `inSession`, a promise queue that runs one call at a time, because one worker runs one command and the session's log belongs to one call. A call whose file was reset or replaced while it waited rejects with `FileReplacedError`, so a result from the old file never reaches the new one.

## Load

```mermaid
sequenceDiagram
  actor User
  participant page as LoadPage
  participant store as source-file store
  participant session as ffmpeg session
  participant worker as ffmpeg.wasm worker

  User->>page: choose or drop a file
  page->>store: load(file)
  store->>session: openFfmpeg(file)
  session->>worker: load the core, mount the file
  store->>session: probe: -i source
  session->>worker: run
  worker-->>store: log: container, codec, duration, rate, channels
  alt not a supported format, or unreadable
    store-->>page: status failed, with the message
  else supported
    loop each slice: 60 s, or 300 s for MP3
      store->>session: decodeSlice(i): -ss S-1 -i source -ss 1 -t 60 (or 300) -f f32le
      opt 20 calls served by this worker
        session->>worker: terminate, start a fresh worker, mount again
      end
      session->>worker: run, read the output, delete it
      worker-->>store: PCM bytes
      store->>store: downmix, push into the peaks and loudness builders, drop the PCM
    end
    store->>store: status ready, session stays open
    Note over page,store: App.vue swaps in ReviewPage, which runs split.detect(curve)
  end
```

Each load takes a number. A load that finishes after "New file", Cancel or a newer load finds its number stale and changes nothing; its session is closed.

```mermaid
stateDiagram-v2
  [*] --> empty
  empty --> loading: load(file)
  loading --> ready: last slice analysed
  loading --> failed: unsupported format, or the probe or a slice failed
  loading --> empty: Cancel
  failed --> loading: Choose another file
  ready --> empty: New file, asking first when there are edits
```

`App.vue` shows the load page in `empty`, `loading` and `failed`, and the review page in `ready`. A failure names the step ("slice 41 of 62") and ffmpeg's last log line.

## Player

One store, `audition`, is the one player: a hidden `<audio>` element plays a WAV the `source-file` store decodes (a start and a length, `-c:a pcm_s16le -f wav`, with the same 1 s pre-roll as a slice), and at most one decoded window of one stretch (and the window after it) is held. It has two kinds of listening, each with its own status, and starting one stops the other.

**The audition** is the 8 s across the selected split (the split ±4 s). "Play across split" and Space on the zoom view's handle both call `toggle`. The zoom view draws the playhead each animation frame from the element's `currentTime` plus the clip's start.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading: toggle
  loading --> playing: clip decoded
  loading --> idle: toggle, or the selection changed
  loading --> idle: clip failed, failure shown
  playing --> idle: clip ended, toggle, or the selection changed
  playing --> idle: play refused, failure shown
  loading --> idle: a stretch plays, a new range, or the selected track changes
  playing --> idle: a stretch plays, a new range, or the selected track changes
```

**The stretch** is the range the user dragged out (note 08) or the selected track. The Range view's and the Track view's Play button and Space both call `toggleStretch(stretch)`: the player plays a stretch (a start and an end the caller hands in: the range as it is, a track as its whole extent). It reads the split store only to word a failure and to stop when the range or the selected track changes. A stretch of 10 min or less is one window: decoded once and kept, tied to the stretch it was decoded for (a different stretch, a range after a track or the other way round, releases it and decodes its own), so a pause costs nothing: playing again sets the element's `currentTime` inside the WAV, which is exact, and plays at once. Both views draw the playhead each animation frame while it plays, and at its resting place otherwise: the stretch's start for a new stretch and after the end. The resting place names the stretch it belongs to, so a view of another stretch never draws it. The playhead moves without changing the status: `seekStretch` sets `currentTime` while the stretch plays, and the resting place otherwise (which `toggleStretch`, or the clip still being decoded, starts from); a drag of it goes through `grabPlayhead`, which pauses a playing stretch, and `dropPlayhead`, which plays it on only if it was playing.

**A long track moves a window along it.** At most 10 min of WAV is decoded at a time, so `lib/decode-window.ts` decides, for a stretch and a playhead, the window to decode (the 10 min from the playhead, held to the stretch's end; the whole stretch when it is 10 min or less), whether a time is inside a window, and when the next window is due. The first press decodes the window that holds the playhead. A seek inside the held window sets `currentTime`; a seek outside it releases the windows and decodes one from the seek point (the stretch reads as decoding meanwhile), and a seek to the stretch's very end ends the stretch. While a window plays, `timeupdate` asks for the window ahead once the playhead is 30 s from the end of the playing one, once per window. When the element's `ended` event comes, the player points the element at that window and plays on: no decode, and a break of about 60 ms, which is the element loading a new source (note 08). When the window ahead is not decoded yet (a seek close to the end of the window) the stretch reads as decoding until it arrives, and a decode that failed ahead is tried again then, with its failure shown. The window ahead is dropped if the windows are released meanwhile, or on `stop()` (a view change, the export): its fetch is forgotten and its decode stopped (`clip` takes an `AbortSignal`; a queued clip never runs and a running one is interrupted), so a seek's window or the export's cuts do not wait behind it, and a window that arrives late is never held. At most two windows are held.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading: toggleStretch, no WAV held
  idle --> playing: toggleStretch, WAV held
  loading --> playing: stretch's window decoded
  loading --> idle: toggleStretch, stop, a new range, a track change, or the audition plays
  loading --> idle: decode failed, failure shown
  playing --> idle: play refused, failure shown
  playing --> paused: toggleStretch, or stop (a view change, the export)
  paused --> playing: toggleStretch
  playing --> paused: grabPlayhead, a drag of the playhead
  paused --> playing: dropPlayhead, if it was playing when grabbed
  playing --> idle: the stretch's last window ended, playhead back at the start
  playing --> playing: a window ended, the window ahead plays on
  playing --> loading: seekStretch outside the held window, or a window ended before the one ahead was decoded
  paused --> idle: a new range, a track change, or the audition plays
  playing --> idle: a new range, a track change, or the audition plays
```

A track change is another selected track, none, or the selected track's start or end moving (a split deleted, moved or added at its edge, a neighbour removed). It stops the stretch in every view but the Range view, where the stretch is the range: a split added at the mark or at the playhead (Shift+Enter) shortens the selected track, and the range plays on.

Every press takes a number, and a clip that arrives for an older press is dropped, so a stopped press, a changed selection or a new range never starts sound later. "The selection changed" covers moving the selected split, selecting another, deselecting, deleting and a setting change; a synchronous watcher on the split store stops the audition at once. A second synchronous watcher on the range, and a third on the selected track (its identity, start and end, so a split that moves elsewhere changes nothing; it does nothing while the Range view is shown), stop all sound, drop the decoded stretch and put the playhead at the new stretch's start. The page stops the player on a view change, when the export starts and when it unmounts: a stretch that plays is paused, so its playhead stays where it was.

**The volume** is state the same store owns: a level in whole dB from −40 to 0 and a mute flag, read from `localStorage` when the store is made (full volume and unmuted when nothing valid is saved or the browser blocks storage) and written on every change. A synchronous watcher applies them to the element, `volume` as the linear gain (`decibelsToGain`) and `muted` as its own switch, and `audioElement()` applies them when the element is first made, so a change reaches sound that is already playing and the element needs no clip decoded again. `VolumeControl` (the mute button and the slider) ends the zoom panel's title row in every view and only calls `setVolume` and `toggleMute`. The export never passes through the element, so the volume cannot reach a file.

## Export

```mermaid
sequenceDiagram
  actor User
  participant page as ReviewPage
  participant exporter as export-tracks store
  participant folder as folder (File System Access)
  participant store as source-file store
  participant session as ffmpeg session

  User->>page: Export to folder…
  page->>page: stop the player (and the decode of the window ahead, so no cut waits behind it)
  page->>exporter: start()
  exporter->>folder: showDirectoryPicker, same id every time
  alt picker closed
    folder-->>exporter: AbortError, stays idle
  else folder picked
    exporter->>exporter: plan the tracks from the split store
    exporter->>folder: list the names, create "stem" or "stem (2)"
    loop each track
      exporter->>store: cutTrack(its times, tags)
      store->>session: waits its turn in the queue, then -c copy
      session-->>store: the track's bytes
      store-->>exporter: bytes
      exporter->>folder: create "03 Name.m4a", write, close
      Note right of exporter: bytes dropped before the next cut
    end
    exporter-->>page: done: "8 tracks saved to stem/"
  end
```

- **Cancel** calls `stopCuts()`: the running call is interrupted, every cut still queued rejects without running, and the files already closed stay on disk.
- **A failed write** aborts its writable and removes the empty file Chrome made for it, so the folder only ever holds whole tracks. That file is the only thing the app deletes, and it made it a moment before, in the subfolder it made.
- **The tracks are fixed when the export starts**, and the overlay locks the page while it runs, so an edit can't change a run halfway through.
- **One track is in memory at a time.** Each is cut, written and dropped before the next is cut.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> idle: picker closed
  idle --> running: folder picked
  idle --> failed: picker failed
  running --> done: every track written
  running --> cancelled: Cancel
  running --> failed: the subfolder, a cut or a write failed
  done --> idle: Close
  cancelled --> idle: Close
  failed --> idle: Close
```

A failure names the track that failed, when there was one. The cut commands per format, and why `.mp3` and `.opus` seek twice, are in [concept note 07](concepts/07-cutting-without-re-encoding.md).

## Single export

One track or the range, as one file, under a name the user confirms. The `export-single` store sits beside the full export, in the same widget, and shares its file writing (`api/write-file.ts`, which aborts a failed writable and removes the empty file Chrome made), its file-name sanitising, number padding, track file names and tags.

```mermaid
sequenceDiagram
  actor User
  participant page as ReviewPage
  participant dialog as SingleExportDialog
  participant single as export-single store
  participant folder as folder (File System Access)
  participant store as source-file store

  User->>page: Export track… or Export range…
  page->>single: openTrack(track) or openRange(range)
  Note right of single: status naming, default name filled in, the sound plays on
  User->>dialog: confirms the name (Enter or OK)
  dialog->>page: confirm(name)
  page->>page: stop the player
  page->>single: confirm(name)
  alt no folder remembered
    single->>folder: showDirectoryPicker, same id as the full export
    Note right of single: closed picker: back to naming, nothing taken
  end
  single->>single: rename the track if the name changed
  single->>folder: list the names, pick "03 Name.m4a" or "03 Name (2).m4a"
  single->>store: cutTrack(its times, tags)
  store-->>single: bytes
  single->>folder: create, write, close
  single-->>page: saved: "Saved 03 Name.m4a in Music"
```

- **The folder is remembered for the file.** The handle is kept in the store (not as reactive state) and forgotten when the source file changes; "Change folder" in the dialog picks another. Nothing is saved across a reload.
- **Names.** A track's file is the full export's for that track (`NN name.ext`, padded to the current track count, and just `NN.ext` for an unnamed track whose default name was confirmed as it was offered); a range's is `name.ext`, sanitised, with the title tag the name as typed, the album the source's stem and no track number (the cut writes an empty `track=` so a number the source carried does not come along). A name that is taken gets ` (2)`, ` (3)` before the extension, compared without regard to case.
- **The rename comes first.** A name changed in a track's dialog is given to the track before the cut, so a failed export keeps it; a range renames nothing.
- **The two exports exclude each other** through the `export-lock` store, which each takes when it starts (before the picker opens) and gives back when it ends however it ends. The two export stores cannot import each other, and a store of their own keeps the dependency one way. The page also disables each export's buttons while the other runs.
- **Cancel** stops the cut as the full export's does and closes the dialog; a failure stays in the dialog with its reason, over the name, to confirm again.
- **The saved line** is the page's: `export-single` holds the file and folder names until the page dismisses it, on the next press or key in the view, a view switch or a selection change.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> naming: Export track… or Export range…
  naming --> naming: picker closed
  naming --> running: name confirmed
  naming --> failed: picker failed
  naming --> idle: Cancel
  running --> saved: file written
  running --> idle: Cancel
  running --> failed: a cut or a write failed
  failed --> running: name confirmed again
  failed --> idle: Cancel
  saved --> idle: press, key, view switch or selection change
  saved --> naming: another export opened
```
