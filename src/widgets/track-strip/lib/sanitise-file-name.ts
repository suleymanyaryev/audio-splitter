// Ticket 08's "about 100 characters" for a file or folder name: not the cap on the typed name.
export const MAX_FILE_NAME_LENGTH = 100

// The characters Windows and macOS refuse in a file name, and control characters (\p{Cc}).
const UNSAFE = /[/\\:*?"<>|\p{Cc}]/gu

const isTrimmed = (character: string | undefined) => character === ' ' || character === '.'

function trimEdges(name: string): string {
  let start = 0
  let end = name.length
  while (start < end && isTrimmed(name[start])) start++
  while (end > start && isTrimmed(name[end - 1])) end--
  return name.slice(start, end)
}

/*
Makes a name safe to use as a file or folder name: unsafe characters become `-`, spaces and dots
at either end go (a trailing dot or space is dropped by Windows, a leading one hides the file),
and the name is capped at 100 characters. The result can be empty. The tags keep the name as it
was typed.
*/
export function sanitiseFileName(name: string): string {
  const safe = trimEdges(name.replaceAll(UNSAFE, '-'))
  // By code point, so a character outside the basic plane is not cut in half.
  return trimEdges([...safe].slice(0, MAX_FILE_NAME_LENGTH).join(''))
}
