// A DOMException (what the picker and the writable reject with) is no `Error` in every realm.
export function messageOf(error: unknown): string {
  const hasMessage = typeof error === 'object' && error !== null && 'message' in error
  return String(hasMessage ? error.message : error)
}
