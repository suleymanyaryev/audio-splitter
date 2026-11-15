// What went wrong: `track` is null when it was not a track (the picker, the folder).
export interface ExportFailure {
  track: { number: number; name: string | null } | null
  message: string
}

const tracksOf = (count: number) => (count === 1 ? '1 track' : `${String(count)} tracks`)

/*
The overlay's closing sentence. Export says where the tracks went and how many made it; a failure
names the track that failed first (ticket 08). `folderName` is null only before the subfolder
exists, which a failure of the picker or of making the folder is.
*/
export function exportSummary(result: {
  status: 'done' | 'cancelled' | 'failed'
  savedCount: number
  trackCount: number
  folderName: string | null
  failure: ExportFailure | null
}): string {
  const { status, savedCount, trackCount, folderName, failure } = result
  const where = folderName === null ? '' : ` to ${folderName}/`
  switch (status) {
    case 'done': {
      return `${tracksOf(savedCount)} saved${where}`
    }
    case 'cancelled': {
      return savedCount === 0
        ? `Export cancelled. No tracks saved${where}.`
        : `Export cancelled. ${String(savedCount)} of ${tracksOf(trackCount)} saved${where}.`
    }
    case 'failed': {
      if (failure === null) return 'Export failed.'
      if (failure.track === null) return `Export failed: ${failure.message}`
      const { number, name } = failure.track
      const track = name === null ? `Track ${String(number)}` : `Track ${String(number)} (${name})`
      const saved = `${String(savedCount)} of ${tracksOf(trackCount)} saved${where}.`
      return `${track} failed: ${failure.message}. ${saved}`
    }
  }
}
