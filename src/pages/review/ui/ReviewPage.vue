<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import {
  BookmarkMinus,
  BookmarkPlus,
  Check,
  Download,
  FileDown,
  Pause,
  Play,
  Plus,
  SkipBack,
  Square,
  Trash2,
} from 'lucide-vue-next'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { formatPendingSplits } from '@/entities/split/lib/format-edits.ts'
import { useSplitStore, type PanelView } from '@/entities/split/model/split.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiIconButton from '@/shared/ui/UiIconButton.vue'
import UiPanel from '@/shared/ui/UiPanel.vue'
import UiSegmentedControl from '@/shared/ui/UiSegmentedControl.vue'
import LoudnessCurve from '@/widgets/loudness-curve/ui/LoudnessCurve.vue'
import LoudnessSettings from '@/widgets/loudness-curve/ui/LoudnessSettings.vue'
import SourceWaveform from '@/widgets/source-waveform/ui/SourceWaveform.vue'
import { rangeTitle } from '@/widgets/split-zoom/lib/range-title.ts'
import { trackExtent } from '@/widgets/split-zoom/lib/track-extent.ts'
import { trackTitle } from '@/widgets/split-zoom/lib/track-title.ts'
import { zoomTitle } from '@/widgets/split-zoom/lib/zoom-title.ts'
import { useQuestionMarkKey } from '@/widgets/shortcuts-dialog/lib/use-question-mark-key.ts'
import { useShortcutsDialogStore } from '@/widgets/shortcuts-dialog/model/shortcuts-dialog.ts'
import ShortcutsDialog from '@/widgets/shortcuts-dialog/ui/ShortcutsDialog.vue'
import { useAuditionStore } from '@/widgets/split-zoom/model/audition.ts'
import RangeView from '@/widgets/split-zoom/ui/RangeView.vue'
import SplitZoom from '@/widgets/split-zoom/ui/SplitZoom.vue'
import TrackView from '@/widgets/split-zoom/ui/TrackView.vue'
import PlaySpeedControl from '@/widgets/split-zoom/ui/PlaySpeedControl.vue'
import VolumeControl from '@/widgets/split-zoom/ui/VolumeControl.vue'
import TrackList from '@/widgets/track-list/ui/TrackList.vue'
import { useExportSingleStore } from '@/widgets/track-strip/model/export-single.ts'
import { useExportTracksStore } from '@/widgets/track-strip/model/export-tracks.ts'
import ExportDialog from '@/widgets/track-strip/ui/ExportDialog.vue'
import SingleExportDialog from '@/widgets/track-strip/ui/SingleExportDialog.vue'
import TrackStrip from '@/widgets/track-strip/ui/TrackStrip.vue'

/*
The review screen: each panel at its fixed canvas height, with the controls it holds. Every panel
is filled; "Export to folder…" starts the export, whose overlay (`ExportDialog`) locks the page while
it runs. The zoom panel shows the zoom view, the Track view of the selected track or, once the user
has dragged out a range, the Range view, as the split store's `view` says, and its
`Split | Track | Range` control is that view, each segment disabled while it has nothing to show.
Every button in the zoom panel's title row is an icon button whose tooltip names it and its key.
"Add split" is in the zoom view and the Range view and follows the view: at the window's centre in
the zoom view, at the mark in the Range view; the Track view adds no split but has the pending
splits' buttons: "Add pending split" (at the mark, enabled while there is room and none is
selected), "Apply" (turns them all into splits and shows the Split view on the first) and "Delete
pending split" (only while one is selected). "Export track…" is off while the track has pending
splits, and its tooltip says why. The zoom view also has
"Delete split", which deletes the selected split as Delete does on its handle (disabled with none
selected), and "Play across split", which plays the selected split's clip (and reads "Stop" while
it loads or plays). The
Range view and the Track view have "Play", which plays the range or the selected track (and reads
"Stop" while it is decoded and "Pause" while it plays), and "Back to range start" or "Back to track
start" beside it, which moves the playhead to the stretch's start. The play speed control (a button that shows the speed and
resets it, and a slider) and then the volume control (a mute button and a slider) end the row in all
three views.

The split store holds back an action that would discard pending splits as its one open question,
and this page shows it: "Discard N pending splits?" with Apply first, Discard and Cancel, the
store's answers. Apply first comes first, so it takes the focus, and Escape cancels.

The page mounts only once the source file is ready (src/app/App.vue), which is when the split store
looks for the gaps in its loudness curve, once; the split store cannot import the source-file store.
*/
const sourceFile = useSourceFileStore()
const split = useSplitStore()
const audition = useAuditionStore()
const exporter = useExportTracksStore()
const singleExport = useExportSingleStore()
const shortcuts = useShortcutsDialogStore()

// `?` anywhere on the page opens the shortcuts dialog, as the header's button does.
useQuestionMarkKey(() => {
  shortcuts.show()
})

const { loudness, loudnessWindowSeconds, durationSeconds } = sourceFile
if (loudness && loudnessWindowSeconds !== null && durationSeconds !== null) {
  split.detect(loudness, { windowSeconds: loudnessWindowSeconds, durationSeconds })
}
onUnmounted(() => {
  // First, so that no clip is left playing over a page that has no split to show.
  audition.stop()
  split.reset()
  shortcuts.hide()
})

// A clip must not play over the export, which locks the page.
function exportTracks() {
  audition.stop()
  void exporter.start()
}

/*
"Export track…" and "Export range…" open the name dialog, which leaves the sound alone: only
confirming the name stops it, so the file is not slowed by decoding sound. The dialog tells the
page the name, and the store then runs.
*/
function openSingleExport() {
  if (split.view === 'range') {
    if (split.range !== null) singleExport.openRange(split.range)
  } else if (split.selectedTrack !== null) {
    singleExport.openTrack(split.selectedTrack)
  }
}

function confirmSingleExport(name: string) {
  audition.stop()
  void singleExport.confirm(name)
}

/*
The line that says where a single export went stays until the user's next press in the view or
a key it acts on, a view switch, a selection change or a new range. The Split view has no such line. One getter
each: a getter returning an array is a new array every time, so it would fire on any change at all.
*/
watch(
  [
    () => split.view,
    () => split.selectedTrack?.number,
    () => split.selectedSplit?.id,
    () => split.range,
  ],
  () => {
    singleExport.dismissSaved()
  },
)
// The full export and a single export never run at once; each store refuses the other's start too.
// A track with pending splits is not the track the user will get: they apply or delete them first.
const hasPendingInTrackView = computed(
  () => split.view === 'track' && split.pendingSplits.length > 0,
)
const isExporting = computed(() => exporter.isRunning || singleExport.isRunning)
const savedLine = computed(() =>
  singleExport.status === 'saved' && split.view !== 'split'
    ? { file: singleExport.savedFile, folder: singleExport.savedFolderName }
    : null,
)

/*
In the Split view a new split is selected, so the arrow keys move it at once, wherever the focus is.
In the Range view it goes at the mark and nothing else changes: the user stays where they are.
*/
function addSplit() {
  if (split.view === 'range') split.addSplitAtMark()
  else split.addSplit()
}

// The Track view's buttons, with the same effect as its keys.
function addPendingSplit() {
  split.addPendingSplitAtMark()
}

function deletePendingSplit() {
  split.deleteSelectedPendingSplit()
}

// The same delete as the key, and the arrow keys go to the split selected next.
function deleteSplit() {
  const selected = split.selectedSplit
  if (selected === null) return
  split.deleteSplit(selected.id)
}

const canAddSplit = computed(() =>
  split.view === 'range' ? split.canAddSplitAtMark : split.canAddSplit,
)

// The panel's title is its largest type: the selected split's time, the selected track's name, start
// and end, or the range's start, end and length.
const title = computed(() => {
  if (split.view === 'track' && split.selectedTrack !== null) return trackTitle(split.selectedTrack)
  const range = split.view === 'range' ? split.range : null
  return range === null
    ? zoomTitle(split.selectedSplit?.seconds ?? null, split.splits.length)
    : rangeTitle(range)
})

/*
The split's time is the screen's one large figure; the no-split messages and the Track and Range
titles stay in the smaller headline.
*/
const showsSplitTime = computed(() => split.view === 'split' && split.selectedSplit !== null)

// "Stop" while the stretch is being decoded, so a press can take it back; "Pause" while it plays.
const STRETCH_BUTTON_LABELS = { idle: 'Play', loading: 'Stop', playing: 'Pause', paused: 'Play' }
const stretchButtonLabel = computed(() => STRETCH_BUTTON_LABELS[audition.stretchStatus])

/*
The two buttons of the Range view and of the Track view play the stretch on show: the range, or the
selected track (all of it, however long). With none there is nothing to play.
*/
const stretch = computed(() => {
  if (split.view === 'range') return split.range
  return split.view === 'track' && split.selectedTrack !== null
    ? trackExtent(split.selectedTrack)
    : null
})

function backToStretchStart() {
  if (stretch.value !== null) audition.backToStretchStart(stretch.value)
}

function toggleStretch() {
  if (stretch.value !== null) audition.toggleStretch(stretch.value)
}

// The dialog is open while the store holds a question; closing it any other way is a cancel.
const asking = computed({
  get: () => split.discardQuestion !== null,
  set: (open) => {
    if (!open) split.cancelDiscard()
  },
})

const view = computed<PanelView>({
  get: () => split.view,
  set: (next) => {
    split.showView(next)
  },
})
const viewOptions = computed(() => [
  { value: 'split' as const, label: 'Split' },
  { value: 'track' as const, label: 'Track', disabled: split.selectedTrack === null },
  { value: 'range' as const, label: 'Range', disabled: split.range === null },
])

// Sound belongs to the view it was started in: the audition must not play on under the Range view.
watch(
  () => split.view,
  () => {
    audition.stop()
  },
)
</script>

<template>
  <main class="grid grid-cols-12 gap-6 px-8 py-6">
    <UiPanel title="Whole file" class="col-span-12">
      <SourceWaveform />
    </UiPanel>

    <UiPanel title="Loudness" class="col-span-12">
      <template #actions>
        <LoudnessSettings />
      </template>
      <LoudnessCurve />
    </UiPanel>

    <UiPanel :title="title" headline :display="showsSplitTime" class="col-span-8">
      <template #actions>
        <UiSegmentedControl v-model="view" label="Panel view" :options="viewOptions" />
        <UiIconButton
          v-if="split.view !== 'track'"
          size="sm"
          label="Add split"
          :hint="split.view === 'range' ? 'Enter' : undefined"
          :disabled="!canAddSplit"
          @click="addSplit"
        >
          <Plus class="size-4 shrink-0" />
        </UiIconButton>
        <UiIconButton
          v-if="split.view === 'track'"
          size="sm"
          label="Add pending split"
          hint="Enter"
          :disabled="!split.canAddPendingSplit"
          @click="addPendingSplit"
        >
          <BookmarkPlus class="size-4 shrink-0" />
        </UiIconButton>
        <UiIconButton
          v-if="split.view === 'track'"
          size="sm"
          label="Apply"
          :disabled="split.pendingSplits.length === 0"
          @click="split.applyPendingSplits()"
        >
          <Check class="size-4 shrink-0" />
        </UiIconButton>
        <UiIconButton
          v-if="split.view === 'track' && split.selectedPendingSplit !== null"
          size="sm"
          label="Delete pending split"
          hint="Delete"
          @click="deletePendingSplit"
        >
          <BookmarkMinus class="size-4 shrink-0" />
        </UiIconButton>
        <UiIconButton
          v-if="split.view === 'split'"
          size="sm"
          label="Delete split"
          hint="Delete"
          :disabled="split.selectedSplit === null"
          @click="deleteSplit"
        >
          <Trash2 class="size-4 shrink-0" />
        </UiIconButton>
        <UiIconButton
          v-if="split.view !== 'split'"
          size="sm"
          :label="`Back to ${split.view} start`"
          hint="Home"
          @click="backToStretchStart"
        >
          <SkipBack class="size-4 shrink-0" />
        </UiIconButton>
        <UiIconButton
          v-if="split.view !== 'split'"
          variant="primary"
          size="sm"
          :label="stretchButtonLabel"
          hint="Space"
          @click="toggleStretch"
        >
          <Square
            v-if="audition.stretchStatus === 'loading'"
            class="size-4 shrink-0"
            fill="currentColor"
            :stroke-width="0"
          />
          <Pause
            v-else-if="audition.stretchStatus === 'playing'"
            class="size-4 shrink-0"
            fill="currentColor"
            :stroke-width="0"
          />
          <Play v-else class="size-4 shrink-0" fill="currentColor" :stroke-width="0" />
        </UiIconButton>
        <UiIconButton
          v-else
          variant="primary"
          size="sm"
          :label="audition.isActive ? 'Stop' : 'Play across split'"
          hint="Space"
          :disabled="split.selectedSplit === null && !audition.isActive"
          @click="audition.toggle()"
        >
          <Square
            v-if="audition.isActive"
            class="size-4 shrink-0"
            fill="currentColor"
            :stroke-width="0"
          />
          <Play v-else class="size-4 shrink-0" fill="currentColor" :stroke-width="0" />
        </UiIconButton>
        <UiIconButton
          v-if="split.view !== 'split'"
          size="sm"
          :label="split.view === 'range' ? 'Export range…' : 'Export track…'"
          :reason="hasPendingInTrackView ? 'Apply or delete pending splits first' : undefined"
          :disabled="isExporting || hasPendingInTrackView"
          @click="openSingleExport"
        >
          <FileDown class="size-4 shrink-0" />
        </UiIconButton>
        <PlaySpeedControl />
        <VolumeControl />
      </template>
      <!-- Capturing, so a press the view handles itself still clears the saved line. -->
      <div @pointerdown.capture="singleExport.dismissSaved()">
        <RangeView v-if="split.view === 'range'" @acted="singleExport.dismissSaved()" />
        <TrackView v-else-if="split.view === 'track'" @acted="singleExport.dismissSaved()" />
        <SplitZoom v-else />
      </div>
      <p v-if="savedLine" role="status" class="mt-2 text-sm text-muted">
        Saved <span class="font-semibold text-ink">{{ savedLine.file }}</span> in
        <span class="font-semibold text-ink">{{ savedLine.folder }}</span>
      </p>
    </UiPanel>

    <UiPanel title="Track list" class="col-span-4">
      <TrackList />
    </UiPanel>

    <UiPanel :title="`Tracks (${split.tracks.length})`" class="col-span-12">
      <template #actions>
        <UiButton
          variant="primary"
          size="lg"
          :disabled="sourceFile.status !== 'ready' || isExporting"
          @click="exportTracks"
        >
          <Download class="size-4 shrink-0" />
          Export to folder…
        </UiButton>
      </template>
      <TrackStrip />
    </UiPanel>

    <ExportDialog />
    <SingleExportDialog @confirm="confirmSingleExport" />
    <ShortcutsDialog />
    <UiDialog
      v-model:open="asking"
      :title="`Discard ${formatPendingSplits(split.discardQuestion?.pendingCount ?? 0)}?`"
      description="They are not splits yet. Apply them first, or discard them."
    >
      <template #actions>
        <UiButton @click="split.applyFirst()">Apply first</UiButton>
        <UiButton variant="danger" @click="split.discardPending()">Discard</UiButton>
        <UiButton @click="split.cancelDiscard()">Cancel</UiButton>
      </template>
    </UiDialog>
  </main>
</template>
