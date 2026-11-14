// "1 edit", "4 edits": how the confirm dialogs say what a replacement or a new file throws away.
export function formatEdits(count: number): string {
  return `${count} ${count === 1 ? 'edit' : 'edits'}`
}
