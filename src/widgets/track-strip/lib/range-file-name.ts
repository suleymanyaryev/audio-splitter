import { sanitiseFileName } from './sanitise-file-name.ts'

// For a name that is empty after sanitising; the dialog only refuses a name empty as typed.
const FALLBACK_NAME = 'range'

// `<name>.<ext>`: a range is no track, so its file has no number in front.
export function rangeFileName(range: { name: string; extension: string }): string {
  const name = sanitiseFileName(range.name) || FALLBACK_NAME
  return `${name}.${range.extension.toLowerCase()}`
}
