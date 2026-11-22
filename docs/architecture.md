# Architecture

How the code is put together: the layers, the stores and how they connect, the one ffmpeg session, and the load, player and export flows. The folder map is in [AGENTS.md](../AGENTS.md#code-layout), the words in [GLOSSARY.md](../GLOSSARY.md). What each feature does is in the code and its specs.

## Layers

A Vue 3 single-page app with no backend, in a subset of Feature-Sliced Design ([ADR 0001](adr/0001-fsd-subset.md)).

```mermaid
flowchart TB
  subgraph appLayer["app"]
    appVue["App.vue: picks the page<br/>from the source file's status"]
  end
  subgraph pagesLayer["pages"]
    loadPage["load"]
    reviewPage["review"]
  end
  subgraph widgetsLayer["widgets"]
    waveform["source-waveform"]
    loudnessCurve["loudness-curve"]
    splitZoom["split-zoom"]
    trackList["track-list"]
    trackStrip["track-strip"]
    shortcuts["shortcuts-dialog"]
  end
  subgraph entitiesLayer["entities"]
    sourceFile["source-file"]
    split["split"]
  end
  subgraph sharedLayer["shared"]
    ffmpeg["api/ffmpeg"]
    lib["lib: audio, canvas,<br/>keyboard, theme, time"]
    ui["ui kit"]
  end
  appLayer --> pagesLayer --> widgetsLayer --> entitiesLayer --> sharedLayer
```

An arrow means "may import from". Two slices of one layer never import each other. `pnpm lint` enforces both rules.

## The stores

All state lives in Pinia setup stores, in memory, except the theme ([below](#the-theme)). Only the volume, the mute flag and the theme choice are also saved, in `localStorage`.

| Store              | Slice                      | Holds                                                        |
| ------------------ | -------------------------- | ------------------------------------------------------------ |
| `source-file`      | `entities/source-file`     | The file, its analysis, load progress and the ffmpeg session |
| `split`            | `entities/split`           | The settings, splits and track names, selection and edits    |
| `audition`         | `widgets/split-zoom`       | The one player: what plays, its status, and the volume       |
| `export-tracks`    | `widgets/track-strip`      | The export of every track into a folder                      |
| `export-single`    | `widgets/track-strip`      | The export of one track or range as a single file            |
| `export-lock`      | `widgets/track-strip`      | Which export is running, so the two never overlap            |
| `shortcuts-dialog` | `widgets/shortcuts-dialog` | Whether the shortcuts dialog is open                         |

```mermaid
flowchart LR
  sourceFile[("source-file")]
  split[("split")]
  audition[("audition")]
  exporter[("export-tracks")]
  exporterSingle[("export-single")]
  exportLock[("export-lock")]
  reviewPage["ReviewPage"]

  sourceFile -- "loudness curve, on mount" --> reviewPage
  reviewPage -- "detect(curve)" --> split
  split -- "selection, range, view" --> audition
  audition -- "clip" --> sourceFile
  split -- "tracks and names" --> exporter
  split -- "one track" --> exporterSingle
  exporter -- "cutTrack" --> sourceFile
  exporterSingle -- "cutTrack" --> sourceFile
  exporter -- "take, release" --> exportLock
  exporterSingle -- "take, release" --> exportLock
```

- **`split` can't import `source-file`.** `ReviewPage` hands it the loudness curve once, on mount.
- **Widgets read the entity stores directly.** They never go through another widget.
- **Tracks are derived from the splits**, never stored. Deleting a split merges the tracks either side of it.
- **One selection at a time:** a split, a track or nothing.
- **Changes that drop the user's work ask first.** A setting change or "New file" goes through a replace guard. Any other action that would drop pending splits is held as a question in `split` (see `unlessItDiscards` in `split.ts`).
- **The two export stores can't import each other**, so `export-lock` sits between them.

## The theme

[`theme.ts`](../src/shared/lib/theme/theme.ts) in `shared/lib/theme` holds the theme choice (`system`, `light` or `dark`) and the theme in effect (`light` or `dark`) as plain Vue state, not a store, so the kit and the canvases can read it from any layer.

- The choice is saved in `localStorage` and read back on start.
- The theme in effect is the choice, or the OS's scheme while the choice is `system`. The OS is listened to only then.
- It sets `data-theme` and `color-scheme` on `<html>`. The CSS keys its one dark block on the attribute.
- A script in the head of `index.html` sets the same two from the same saved choice before the first paint. `startTheme` in `main.ts` takes over from there.
- The switch in the header (`App.vue`) shows the choice and sets it.
- `useCanvasRedraw` redraws every canvas when the theme in effect changes.

## The ffmpeg session

[`ffmpeg.ts`](../src/shared/api/ffmpeg/ffmpeg.ts) wraps one ffmpeg.wasm worker. The source file is mounted read-only, so ffmpeg reads only the bytes it needs. Three rules keep it alive through long files:

- **Every call has a timeout.** A hung call terminates the worker.
- **A fresh worker every 20 calls.** A worker wears out after a few dozen calls; a new one takes under 100 ms.
- **`interrupt()` stops the running command** by terminating the worker.

The `source-file` store keeps the session open once the file is ready. Clips and cuts share it through `inSession`, a queue that runs one call at a time. A call for a file that has since been replaced rejects with `FileReplacedError`.

### The core download

The ffmpeg core (32 MB) must be in the browser before the first worker starts. [`core-preloader.ts`](../src/shared/api/ffmpeg/core-preloader.ts) gets it there:

- One shared download for the whole page, started when the page is idle.
- It fails only when no bytes arrive for 30 s, so a slow connection still finishes.
- The core is kept in Cache Storage, and a service worker serves it to ffmpeg's worker, so a returning visitor downloads nothing. The service worker is registered in production builds only.

The reasons are in [ADR 0003](adr/0003-ffmpeg-core-in-cache-storage.md).

## Load

```mermaid
sequenceDiagram
  actor User
  participant page as LoadPage
  participant store as source-file store
  participant session as ffmpeg session

  User->>page: choose or drop a file
  page->>store: load(file)
  store->>session: openFfmpeg: download the core if needed, mount the file
  store->>session: probe
  session-->>store: container, codec, duration, rate, channels
  alt not supported, or unreadable
    store-->>page: failed, with the message
  else supported
    loop each slice
      store->>session: decodeSlice(i)
      session-->>store: PCM
      store->>store: downmix, add to peaks and loudness, drop the PCM
    end
    store->>store: ready, session stays open
  end
```

```mermaid
stateDiagram-v2
  [*] --> empty
  empty --> loading: load(file)
  loading --> ready: last slice analysed
  loading --> failed: unsupported, or a step failed
  loading --> empty: Cancel
  failed --> loading: Choose another file
  ready --> empty: New file
```

- `App.vue` shows the load page until the store is `ready`, then the review page.
- A failure names the step and ffmpeg's last log line.
- Each load takes a number. A load that a newer one replaced changes nothing.

## Player

The `audition` store is the one player. The `source-file` store decodes a stretch of the file to WAV, and a hidden `<audio>` element plays it. A WAV seeks exactly, which a compressed file does not ([note 06](concepts/06-seeking-compressed-audio.md)).

There are two kinds of listening. Starting one stops the other.

**The audition** plays the 8 s across the selected split.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading: play
  loading --> playing: clip decoded
  playing --> idle: clip ended
  loading --> idle: pressed again, split changed, or failed
  playing --> idle: pressed again, or split changed
```

**The stretch** plays a range or the selected track. It can pause, resume and seek without decoding again.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading: play, nothing decoded
  idle --> playing: play, already decoded
  loading --> playing: window decoded
  playing --> paused: pause, a view change, or the export
  paused --> playing: play
  playing --> loading: seek outside the window
  playing --> idle: end of the stretch
  loading --> idle: range or track changed, or failed
  paused --> idle: range or track changed
  playing --> idle: range or track changed
```

- **A long track plays through a moving window.** At most 10 min is decoded at a time. The next window is decoded while the current one plays, and at most two are held ([`decode-window.ts`](../src/widgets/split-zoom/lib/decode-window.ts), [note 08](concepts/08-listening-to-a-range.md)).
- **Watchers on the `split` store stop the sound at once** when the split, range or track it belongs to changes. A view change or the export only pauses a stretch, so its playhead stays.
- **Every press takes a number.** A clip that arrives for an older press is dropped, so stale sound never starts.
- **The volume applies to the element only**, so it never reaches an exported file ([note 09](concepts/09-volume-is-gain.md)).

## Export

```mermaid
sequenceDiagram
  actor User
  participant exporter as export-tracks store
  participant folder as folder (File System Access)
  participant store as source-file store

  User->>exporter: Export to folder…
  exporter->>folder: pick a folder
  exporter->>folder: create "stem" or "stem (2)"
  loop each track
    exporter->>store: cutTrack(times, tags)
    store-->>exporter: bytes
    exporter->>folder: write "03 Name.m4a"
  end
  exporter-->>User: "8 tracks saved to stem/"
```

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> running: folder picked
  running --> done: every track written
  running --> cancelled: Cancel
  running --> failed: a cut or a write failed
  done --> idle: Close
  cancelled --> idle: Close
  failed --> idle: Close
```

- **The tracks are fixed when the export starts**, and an overlay locks the page.
- **One track is in memory at a time**: cut, written and dropped before the next.
- **Cancel** stops the running cut. Files already written stay.
- **A failed write removes its empty file**, so the folder only holds whole tracks.

The cut commands per format are in [note 07](concepts/07-cutting-without-re-encoding.md).

### Single export

`export-single` writes one track or the range as one file, under a name the user confirms. It shares the file writing ([`write-file.ts`](../src/widgets/track-strip/api/write-file.ts)), naming and tags with the full export.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> naming: Export track… or Export range…
  naming --> running: name confirmed
  naming --> idle: Cancel
  running --> saved: file written
  running --> failed: a cut or a write failed
  failed --> running: name confirmed again
  running --> idle: Cancel
  failed --> idle: Cancel
  saved --> idle: dismissed
```

- The folder is picked once per source file.
- A name that is taken gets ` (2)`; nothing is overwritten.
