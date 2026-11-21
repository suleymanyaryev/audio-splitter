/*
The file name a single export writes: `fileName` itself, or the first of `name (2).ext`,
`name (3).ext` and so on that is not among `taken`, the names already in the folder. Nothing is
ever overwritten. The number goes before the last dot, which is the extension's. macOS and Windows
treat names that differ in case only as the same name, so the comparison ignores case.
*/
export function freeFileName(fileName: string, taken: Iterable<string>): string {
  const takenLower = new Set([...taken].map((entry) => entry.toLowerCase()))
  const dot = fileName.lastIndexOf('.')
  const name = fileName.slice(0, dot)
  const extension = fileName.slice(dot)
  const candidate = (attempt: number) =>
    attempt === 1 ? fileName : `${name} (${attempt})${extension}`
  let attempt = 1
  while (takenLower.has(candidate(attempt).toLowerCase())) attempt++
  return candidate(attempt)
}
