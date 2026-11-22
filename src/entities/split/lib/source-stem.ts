// The file's name without its last extension: `evening-set-vol3.m4a` is `evening-set-vol3`.
export function sourceStem(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? fileName : fileName.slice(0, dot)
}
