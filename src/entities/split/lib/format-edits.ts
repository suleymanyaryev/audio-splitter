// "1 edit", "4 edits": how the confirm dialogs say what a replacement or a new file throws away.
export function formatEdits(count: number): string {
  return `${count} ${count === 1 ? 'edit' : 'edits'}`
}

// "1 pending split", "3 pending splits".
export function formatPendingSplits(count: number): string {
  return `${count} pending ${count === 1 ? 'split' : 'splits'}`
}

// What a replacement or a new file throws away: the edits and the pending splits, if any.
export function formatLoss(editCount: number, pendingCount: number): string {
  return [
    editCount > 0 && formatEdits(editCount),
    pendingCount > 0 && formatPendingSplits(pendingCount),
  ]
    .filter((part) => part !== false)
    .join(' and ')
}
