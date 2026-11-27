# Architecture

How the code is put together: the layers, the stores and how they connect, the ffmpeg session, and the load, player, Find duplicates and export flows with their statuses. The folder map is in [AGENTS.md](../AGENTS.md#code-layout), the words in [GLOSSARY.md](../GLOSSARY.md). What each feature does is in the code and its specs.

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

The app's state lives in Pinia setup stores, in memory. The volume, the mute flag, the play speed and the default settings are also saved in `localStorage`.

| Store              | Slice                      | Holds                                                    |
| ------------------ | -------------------------- | -------------------------------------------------------- |
| `source-file`      | `entities/source-file`     | The file, its summaries, load progress, the ffmpeg session |
| `split`            | `entities/split`           | Settings, splits, tracks, matches, selection, edits      |
| `player`           | `widgets/split-zoom`       | The one player and what it plays                         |
| `export-tracks`    | `widgets/track-strip`      | The export to a folder                                   |
| `export-single`    | `widgets/track-strip`      | The export of one track or range                         |
| `export-lock`      | `widgets/track-strip`      | Which export runs                                        |
| `shortcuts-dialog` | `widgets/shortcuts-dialog` | Whether the shortcuts dialog is open                     |

Two modules live inside the `split` store rather than beside it:

- **Matches** ([`matches.ts`](../src/entities/split/model/matches.ts)) hold Find duplicates' results and status.
- **The edit ledger** ([`edit-ledger.ts`](../src/entities/split/model/edit-ledger.ts)) counts the user's edits.

```mermaid
flowchart LR
  sourceFile[("source-file")]
  split[("split")]
  player[("player")]
  exporter[("export-tracks")]
  exporterSingle[("export-single")]
  exportLock[("export-lock")]
  reviewPage["ReviewPage"]

  sourceFile -- "loudness curve, spectrogram, on mount" --> reviewPage
  reviewPage -- "open(curve, spectrogram), prefix" --> split
  reviewPage -- "stop, on export and unmount" --> player
  split -- "selection, range, view" --> player
  player -- "clip" --> sourceFile
  split -- "tracks and names" --> exporter
  split -- "one track" --> exporterSingle
  exporter -- "cutTrack" --> sourceFile
  exporterSingle -- "cutTrack" --> sourceFile
  exporter -- "take, release" --> exportLock
  exporterSingle -- "take, release" --> exportLock
```

- **`split` can't import `source-file`.** `ReviewPage` hands it the loudness curve, the spectrogram and the track name prefix once, on mount.
- **Widgets read the entity stores directly.** They never go through another widget.
- **Tracks are derived from the splits**, never stored.
- **One selection at a time:** a split, a track or nothing.
- **Changes that drop the user's work ask first.** The `split` store holds such an action as a question (`unlessItDiscards` in `split.ts`).
- **A late result is dropped.** Every press takes a number, and a result that arrives for an older number changes nothing.
- **The two export stores can't import each other**, so `export-lock` sits between them.

## The theme

[`theme.ts`](../src/shared/lib/theme/theme.ts) holds the theme choice and the theme in effect as plain Vue state, so the kit and the canvases can read it from any layer. It saves the choice in `localStorage` and sets `data-theme` and `color-scheme` on `<html>`. A script in `index.html` sets the same two before the first paint.

## The ffmpeg session

[`ffmpeg.ts`](../src/shared/api/ffmpeg/ffmpeg.ts) wraps one ffmpeg.wasm worker, with the source file mounted read-only. Every call has a timeout, the worker is replaced after a set number of calls, and `interrupt()` terminates it.

The `source-file` store keeps the session open once the file is ready. Clips and cuts share it through `inSession`, a queue that runs one call at a time. A call for a file that has since been replaced rejects with `FileReplacedError`.

### The core download

[`core-preloader.ts`](../src/shared/api/ffmpeg/core-preloader.ts) downloads the ffmpeg core once per page, before the first worker starts. A service worker serves it from Cache Storage, so a returning visitor downloads nothing ([ADR 0003](adr/0003-ffmpeg-core-in-cache-storage.md)).

## Load

`load(file)` opens the session, probes the file, then decodes it slice by slice, adding each slice to the summaries and dropping its samples. `App.vue` shows the load page until the store is `ready`.

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

## Player

The `player` store is the one player. The `source-file` store decodes a stretch of the file to WAV, and a hidden `<audio>` element plays it ([`audio-element.ts`](../src/widgets/split-zoom/api/audio-element.ts)). It plays the subject on show, which it reads from the `split` store.

There are two kinds of listening: the audition across the selected split, and a stretch (the range or a track). They share one status, owned by one of them at a time; starting one takes the status from the other. How a long stretch plays through a moving window is in [`decode-window.ts`](../src/widgets/split-zoom/lib/decode-window.ts) and [note 08](concepts/08-listening-to-a-range.md); the rest of the player's rules are in the header comment of [`player.ts`](../src/widgets/split-zoom/model/player.ts).

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading: play, nothing decoded
  idle --> playing: play, already decoded
  loading --> playing: decoded
  playing --> paused: pause
  paused --> playing: play
  paused --> loading: play, after what was decoded is let go
  playing --> loading: seek past what is decoded
  playing --> idle: the end, or the subject changed
  paused --> idle: the subject changed
  loading --> idle: the subject changed, or failed
```

The volume and the play speed apply to the element only, so they never reach an exported file ([ADR 0004](adr/0004-time-stretching-by-the-browser.md)).

## Find duplicates

Find duplicates compares the tracks in a second worker, beside ffmpeg's ([note 11](concepts/11-finding-repeats.md)). The matches module sends the request through [`find-matches-client.ts`](../src/entities/split/api/find-matches-client.ts), which starts a worker per press and terminates it with its answer, or when the file starts over. The track list, the track strip, the Track view and the export read the live matches from `split`.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> running: press
  running --> idle: the matches kept, or the file started over
  running --> failed: the worker failed
  failed --> running: press again
  failed --> idle: the file started over
```

## Export

`export-tracks` picks a folder, then cuts and writes one track at a time with `cutTrack`. The tracks are fixed when it starts. A failed write removes its empty file, so the folder holds only whole tracks. The cut commands are in [note 07](concepts/07-cutting-without-re-encoding.md).

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
