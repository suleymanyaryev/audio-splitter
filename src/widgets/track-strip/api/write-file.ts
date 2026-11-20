import type { ExportFolder } from './export-folder.ts'

// Waits for a clean-up step, whatever its outcome: it must not hide the failure that caused it.
async function bestEffort(step: Promise<unknown> | undefined) {
  try {
    await step
  } catch {
    // Nothing more can be done about it.
  }
}

/*
Writes one file into the folder, for the full export and the single export alike. Chrome makes the
file, empty, as soon as it is asked for, and only a closed writable fills it, so a failure aborts
the writable and then removes that empty file: a failed export leaves whole files only (ticket 08).
The app deletes nothing of the user's here: the file is one it made a moment ago, under a name
that was free (the full export's subfolder is new, the single export checks the folder's entries).
*/
export async function writeFile(folder: ExportFolder, fileName: string, bytes: Uint8Array) {
  const handle = await folder.getFileHandle(fileName, { create: true })
  let writable: Awaited<ReturnType<typeof handle.createWritable>> | undefined
  try {
    writable = await handle.createWritable()
    await writable.write(bytes)
    await writable.close()
  } catch (error) {
    // The write's own failure is the one to report, so the clean-up's own failures are let go.
    await bestEffort(writable?.abort())
    await bestEffort(folder.removeEntry(fileName))
    throw error
  }
}
