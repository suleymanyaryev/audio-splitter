import { sanitiseFileName } from './sanitise-file-name.ts'

// For a source file whose name leaves nothing after sanitising.
const FALLBACK_NAME = 'tracks'

/*
The folder an export goes into, named after the source file's stem: the first of `stem`,
`stem (2)`, `stem (3)` and so on that is not among `taken`, the names already in the folder the
user picked. Nothing is ever overwritten. macOS and Windows treat names that differ in case only
as the same name, so the comparison ignores case.
*/
export function exportFolderName(stem: string, taken: Iterable<string>): string {
  const base = sanitiseFileName(stem) || FALLBACK_NAME
  const takenLower = new Set([...taken].map((name) => name.toLowerCase()))
  const candidate = (attempt: number) => (attempt === 1 ? base : `${base} (${attempt})`)
  let attempt = 1
  while (takenLower.has(candidate(attempt).toLowerCase())) attempt++
  return candidate(attempt)
}
