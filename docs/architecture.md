# Architecture

The [README](../README.md#architecture) shows the pipeline and the layers. This page goes one level down: how the stores pass data to each other, how the one ffmpeg session is shared, and how the load, player and export flows run. The folder-by-folder map is in [AGENTS.md](../AGENTS.md#code-layout); the words are defined in [GLOSSARY.md](../GLOSSARY.md).

The diagrams are drawn from the code. When a change alters what one of them shows (a store's status, a step in a flow, who calls whom), the diagram changes in the same commit.

## The stores

Four Pinia setup stores hold all state, in memory only. Two are entities; two belong to the widget that owns the behaviour.

| Store           | Slice                  | Holds                                                                                                                                                                                                        |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `source-file`   | `entities/source-file` | The file, its format and duration, peaks, loudness curve, slice progress, load failure, the ffmpeg session                                                                                                   |
| `split`         | `entities/split`       | The silence threshold and minimum gap length, the gaps, the splits with their track names, the derived tracks, the one selection (a split, a track or nothing; the selected split and the selected track are derived from it), the zoom window, the range, the mark and the panel's view, the edit count |
| `audition`      | `widgets/split-zoom`   | Whether the audition's clip and the range's are loading, playing or paused, the failure, the range's resting place                                                                                           |
| `export-tracks` | `widgets/track-strip`  | The export's status, the track in hand, the counts, the subfolder's name, the failure                                                                                                                        |

```mermaid
flowchart LR
  sourceFile[("source-file")]
  split[("split")]
  audition[("audition<br/>(the player)")]
  exporter[("export-tracks")]
  reviewPage["ReviewPage"]

  sourceFile -- "loudness curve,<br/>once on mount" --> reviewPage
  reviewPage -- "detect(curve)" --> split
  split -- "selected split, range<br/>(a change stops the audition,<br/>a new range stops the range)" --> audition
  audition -- "clip(start, length)" --> sourceFile
  split -- "tracks and names,<br/>fixed when the export starts" --> exporter
  exporter -- "cutTrack(track)<br/>stopCuts()" --> sourceFile
```

- **`split` can't import `source-file`**, because two slices of one layer never import each other. `ReviewPage` reads the curve and hands it to `split.detect` when it mounts, and `split` keeps a reference to it to find the gaps again when a setting changes. When the page unmounts, it stops the player and resets `split`.
- **Widgets read the entity stores directly.** Every widget reads `split` for the splits, tracks and selection; all but the track list also read `source-file`, for the peaks, the curve, the duration or the session's calls.
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

One store, `audition`, is the one player: a hidden `<audio>` element plays a WAV the `source-file` store decodes (a start and a length, `-c:a pcm_s16le -f wav`, with the same 1 s pre-roll as a slice), and at most one decoded stretch is held. It has two kinds of listening, each with its own status, and starting one stops the other.

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
  loading --> idle: the range plays, or a new range
  playing --> idle: the range plays, or a new range
```

**The range** is the stretch the user dragged out (note 08). The Range view's Play button and Space both call `toggleStretch(range)`: the player plays a stretch (a start and an end the caller hands in; today only the range), so it reads no store for it. The whole stretch is decoded once and kept, tied to the stretch it was decoded for (a different stretch releases it and decodes its own), so a pause costs nothing: playing again sets the element's `currentTime` inside the WAV, which is exact, and plays at once. The Range view draws the playhead each animation frame while it plays, and at its resting place otherwise: the range's start for a new range and after the end. The playhead moves without changing the status: `seekStretch` sets `currentTime` while the range plays, and the resting place otherwise (which `toggleStretch`, or the clip still being decoded, starts from); a drag of it goes through `grabPlayhead`, which pauses a playing range, and `dropPlayhead`, which plays it on only if it was playing.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading: toggleStretch, no WAV held
  idle --> playing: toggleStretch, WAV held
  loading --> playing: range decoded
  loading --> idle: toggleStretch, stop, a new range, or the audition plays
  loading --> idle: decode failed, failure shown
  playing --> idle: play refused, failure shown
  playing --> paused: toggleStretch, or stop (a view change, the export)
  paused --> playing: toggleStretch
  playing --> paused: grabPlayhead, a drag of the playhead
  paused --> playing: dropPlayhead, if it was playing when grabbed
  playing --> idle: range ended, playhead back at the start
  paused --> idle: a new range, or the audition plays
  playing --> idle: a new range, or the audition plays
```

Every press takes a number, and a clip that arrives for an older press is dropped, so a stopped press, a changed selection or a new range never starts sound later. "The selection changed" covers moving the selected split, selecting another, deselecting, deleting and a setting change; a synchronous watcher on the split store stops the audition at once. A second synchronous watcher on the range stops all sound, drops the decoded range and puts the playhead at the new range's start. The page stops the player on a view change, when the export starts and when it unmounts: a range that plays is paused, so its playhead stays where it was.

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
  page->>page: stop the player
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
