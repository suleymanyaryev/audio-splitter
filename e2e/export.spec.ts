import { expect, test, type Page } from '@playwright/test'

/*
Milestone 7, one flow per format: load a 30 s fixture (three tone bursts, two 2 s silences), press
"Find gaps" for two splits and three tracks, export, and read the files back. `showDirectoryPicker` is replaced by
the browser's origin-private file system, a real directory the real File System Access writes go
into, so no picker dialog opens.
*/
const FORMATS = ['m4a', 'mp3', 'opus'] as const

// What "Find gaps" adds on the fixtures: splits in the silences' middles, 9.5 s and 20.5 s.
const EXPECTED_SECONDS = [9.5, 11, 9.5]
// A compressed frame is 1024 samples (AAC) or 1152 (MP3) and the cut lands on frame edges.
const TOLERANCE_SECONDS = 0.15

interface SavedTrack {
  name: string
  bytes: number
  seconds: number
  // Whether the written bytes hold the title ("bursts-01") and, besides it, the album ("bursts").
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
      const text = new TextDecoder('latin1').decode(await file.arrayBuffer())
      // An unnamed track's title is its file's name without the extension: `bursts-01`.
      const title = fileName.slice(0, fileName.lastIndexOf('.'))
      tracks.push({
        name: fileName,
        bytes: file.size,
        seconds: buffer.duration,
        hasTitle: text.includes(title),
        // The title holds the album's text once, so the album is the occurrence after it.
        hasAlbum: text.split('bursts').length - 1 >= 2,
      })
    }
    return tracks.toSorted((a, b) => a.name.localeCompare(b.name))
  }, folderName)
}

// One file of the folder root, where a single export writes: how long it decodes to and whether the
// title and the album are in its bytes.
async function readSavedFile(page: Page, fileName: string, title: string) {
  return page.evaluate(
    async ({ name, wantedTitle }) => {
      const root = await navigator.storage.getDirectory()
      const handle = await root.getFileHandle(name)
      const file = await handle.getFile()
      // Decoding takes the buffer it is given, so the text is read from a second one.
      const buffer = await new globalThis.OfflineAudioContext(1, 1, 44_100).decodeAudioData(
        await file.arrayBuffer(),
      )
      const text = new TextDecoder('latin1').decode(await file.arrayBuffer())
      return {
        bytes: file.size,
        seconds: buffer.duration,
        hasTitle: text.includes(wantedTitle),
        hasAlbum: text.includes('bursts'),
      }
    },
    { name: fileName, wantedTitle: title },
  )
}

// The names of the files in the folder root, which the single exports write into.
async function rootFileNames(page: Page) {
  return page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const names: string[] = []
    for await (const [name, handle] of root.entries()) if (handle.kind === 'file') names.push(name)
    return names.toSorted((a, b) => a.localeCompare(b))
  })
}

async function openReviewPage(page: Page, format: string) {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(`e2e/fixtures/bursts.${format}`)
  await expect(page.getByRole('button', { name: 'Export to folder…' })).toBeEnabled({
    timeout: 20_000,
  })
  // The file opens as one track; the two gaps become splits on request.
  await page.getByRole('button', { name: 'Find gaps (2)' }).click()
  await expect(page.getByRole('button', { name: /^Select track 3/ })).toBeVisible()
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
      `bursts-01.${format}`,
      `bursts-02.${format}`,
      `bursts-03.${format}`,
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

/*
Single export (v1.1.0), one flow per format: one track written under its default name straight into
the folder root, and the same track again, which takes " (2)"; then a range dragged out on the
whole-file waveform, written under a name typed in the dialog.
*/
for (const format of FORMATS) {
  test(`exports one .${format} track singly, twice, and a range of it`, async ({ page }) => {
    await openReviewPage(page, format)

    await page.getByRole('button', { name: /^Select track 2/ }).click()
    for (const savedName of [`bursts-02.${format}`, `bursts-02 (2).${format}`]) {
      await page.getByRole('button', { name: 'Export track…' }).click()
      await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('bursts-02')
      await page.getByRole('textbox', { name: 'Name' }).press('Enter')
      await expect(page.getByRole('status')).toContainText(`Saved ${savedName} in`, {
        timeout: 20_000,
      })
    }

    expect(await rootFileNames(page)).toEqual([`bursts-02 (2).${format}`, `bursts-02.${format}`])
    for (const name of [`bursts-02.${format}`, `bursts-02 (2).${format}`]) {
      const saved = await readSavedFile(page, name, 'bursts-02')
      expect(saved.bytes).toBeGreaterThan(0)
      expect(saved.hasTitle).toBe(true)
      expect(saved.hasAlbum).toBe(true)
      expect(Math.abs(saved.seconds - (EXPECTED_SECONDS[1] ?? 0))).toBeLessThan(TOLERANCE_SECONDS)
    }

    // A quarter to a half of the 30 s file: about 7.5 s to 15 s.
    const waveform = page.getByRole('region', { name: 'Whole file' }).locator('canvas')
    // Selecting track 2 in the list scrolls the page, and the mouse only reaches what is in view.
    await waveform.scrollIntoViewIfNeeded()
    const box = (await waveform.boundingBox())!
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    await page.getByRole('button', { name: 'Export range…' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('my clip')
    await page.getByRole('textbox', { name: 'Name' }).press('Enter')
    await expect(page.getByRole('status')).toContainText(`Saved my clip.${format} in`, {
      timeout: 20_000,
    })

    const clip = await readSavedFile(page, `my clip.${format}`, 'my clip')
    expect(clip.hasTitle).toBe(true)
    expect(clip.hasAlbum).toBe(true)
    // The range's own length is in the panel's title, after the dot: `0:00:07.50 – … · 7.50`.
    const title = await page.getByRole('heading', { level: 2, name: /·/ }).textContent()
    const seconds = Number(title?.split('·').at(-1)?.trim().split(':').at(-1))
    expect(Math.abs(clip.seconds - seconds)).toBeLessThan(TOLERANCE_SECONDS)
  })
}
