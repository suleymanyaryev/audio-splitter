/*
The part of the File System Access API the export uses. TypeScript's DOM library has no
`showDirectoryPicker` and no async iteration of a directory yet, and the app needs nothing more
than this, so it is declared here instead of pulling in a types package. The same shape is what
the specs' in-memory folder implements.
*/
interface ExportWritable {
  write(data: Uint8Array): Promise<void>
  close(): Promise<void>
  abort(): Promise<void>
}

export interface ExportFolder {
  // The names of everything in the folder, files and folders alike.
  keys(): AsyncIterable<string>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<ExportFolder>
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<{ createWritable(): Promise<ExportWritable> }>
  removeEntry(name: string): Promise<void>
}

/*
Chrome reopens the picker where the user last chose when the same `id` comes back (ticket 08);
the app keeps no handle itself.
*/
const PICKER_ID = 'export-folder'

type DirectoryPicker = (options: { id: string; mode: 'readwrite' }) => Promise<ExportFolder>

/*
Opens Chrome's folder picker. Gives null when the user closes it without choosing (the picker
rejects with an `AbortError`); any other rejection is a real problem and passes through.
*/
export async function pickExportFolder(): Promise<ExportFolder | null> {
  const picker = (globalThis as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker
  if (picker === undefined) throw new Error("This browser can't save to a folder")
  try {
    return await picker({ id: PICKER_ID, mode: 'readwrite' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}
