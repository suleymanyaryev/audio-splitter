import { expect, test, type Page } from '@playwright/test'

/*
Milestone 7, one flow per format: load a 30 s fixture (three tone bursts, two 2 s silences, so two
splits and three tracks), export, and read the files back. `showDirectoryPicker` is replaced by
the browser's origin-private file system, a real directory the real File System Access writes go
into, so no picker dialog opens.
*/
const FORMATS = ['m4a', 'mp3', 'opus'] as const

// What detection gives on the fixtures: splits in the silences' middles, 9.5 s and 20.5 s.
const EXPECTED_SECONDS = [9.5, 11, 9.5]
// A compressed frame is 1024 samples (AAC) or 1152 (MP3) and the cut lands on frame edges.
const TOLERANCE_SECONDS = 0.15

interface SavedTrack {
  name: string
  bytes: number
  seconds: number
  // Whether the written bytes hold the title ("bursts 01") and, besides it, the album ("bursts").
  hasTitle: boolean
  hasAlbum: boolean
}

// Empties the origin-private file system, so a test starts with no folder from an earlier one.
async function clearFolder(page: Page) {
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for await (const name of root.keys()) await root.removeEntry(name, { recursive: true })
  })
}

/*
Every file of one folder, with its size, the length the browser decodes it to and whether its tags
are in it. Title and album are plain UTF-8 in all three formats (`©nam` in an .m4a, ID3's TIT2 and
TALB in an .mp3, the stream's comments in an .opus), so a text search finds them; the binary track
number is left unchecked.
*/
async function readFolder(page: Page, folderName: string): Promise<SavedTrack[]> {
  return page.evaluate(async (name) => {
    const root = await navigator.storage.getDirectory()
    const folder = await root.getDirectoryHandle(name)
    const tracks: SavedTrack[] = []
    for await (const [fileName, handle] of folder.entries()) {
      if (handle.kind !== 'file') continue
      const file = await (handle as FileSystemFileHandle).getFile()
      const buffer = await new globalThis.OfflineAudioContext(1, 1, 44_100).decodeAudioData(
        await file.arrayBuffer(),
      )
      // The first two characters of the file's name are its number, which is the title's.
      const text = new TextDecoder('latin1').decode(await file.arrayBuffer())
      tracks.push({
        name: fileName,
        bytes: file.size,
        seconds: buffer.duration,
        hasTitle: text.includes(`bursts ${fileName.slice(0, 2)}`),
        // The title holds the album's text once, so the album is the occurrence after it.
        hasAlbum: text.split('bursts').length - 1 >= 2,
      })
    }
    return tracks.toSorted((a, b) => a.name.localeCompare(b.name))
  }, folderName)
}

async function openReviewPage(page: Page, format: string) {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(`e2e/fixtures/bursts.${format}`)
  await expect(page.getByRole('button', { name: 'Export to folder…' })).toBeEnabled({
    timeout: 20_000,
  })
}

async function exportToFolder(page: Page, summary: string) {
  await page.getByRole('button', { name: 'Export to folder…' }).click()
  await expect(page.getByText(summary)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText(summary)).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'showDirectoryPicker', {
      value: () => navigator.storage.getDirectory(),
    })
  })
  await page.goto('/')
  await clearFolder(page)
})

for (const format of FORMATS) {
  test(`exports the three tracks of a .${format} file as .${format} files that play`, async ({
    page,
  }) => {
    await openReviewPage(page, format)

    await exportToFolder(page, '3 tracks saved to bursts/')

    const tracks = await readFolder(page, 'bursts')
    expect(tracks.map((track) => track.name)).toEqual([
      `01.${format}`,
      `02.${format}`,
      `03.${format}`,
    ])
    for (const track of tracks) {
      expect(track.bytes).toBeGreaterThan(0)
      expect(track.hasTitle).toBe(true)
      expect(track.hasAlbum).toBe(true)
    }
    for (const [index, track] of tracks.entries()) {
      expect(Math.abs(track.seconds - (EXPECTED_SECONDS[index] ?? 0))).toBeLessThan(
        TOLERANCE_SECONDS,
      )
    }
    const total = tracks.reduce((sum, track) => sum + track.seconds, 0)
    expect(Math.abs(total - 30)).toBeLessThan(TOLERANCE_SECONDS)

    // A second export of the same file never touches the first one.
    await exportToFolder(page, '3 tracks saved to bursts (2)/')
    expect(await readFolder(page, 'bursts (2)')).toHaveLength(3)
    expect(await readFolder(page, 'bursts')).toEqual(tracks)
  })
}
