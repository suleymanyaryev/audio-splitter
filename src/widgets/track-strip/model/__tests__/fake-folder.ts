import type { ExportFolder } from '../../api/export-folder.ts'

/*
An in-memory stand-in for a File System Access directory, as Chrome behaves: asking for a file
with `create` makes it at once, empty; closing its writable replaces the contents; an aborted
writable leaves the empty file behind, for `removeEntry` to remove. Every step goes into `log`,
shared by a whole tree, so a spec can check the order things happened in.
*/
export class FakeFolder implements ExportFolder {
  readonly folders = new Map<string, FakeFolder>()
  readonly files = new Map<string, Uint8Array>()

  constructor(
    private readonly path = '',
    readonly log: string[] = [],
  ) {}

  async *keys() {
    yield* this.folders.keys()
    yield* this.files.keys()
  }

  getDirectoryHandle(name: string, options?: { create?: boolean }) {
    let folder = this.folders.get(name)
    if (folder === undefined) {
      if (options?.create !== true)
        return Promise.reject(new DOMException('no folder', 'NotFoundError'))
      folder = new FakeFolder(`${this.path}${name}/`, this.log)
      this.folders.set(name, folder)
      this.log.push(`mkdir ${this.path}${name}/`)
    }
    return Promise.resolve(folder)
  }

  removeEntry(name: string) {
    this.log.push(`remove ${this.path}${name}`)
    return !this.files.delete(name) && !this.folders.delete(name)
      ? Promise.reject(new DOMException('no entry', 'NotFoundError'))
      : Promise.resolve()
  }

  getFileHandle(name: string, options?: { create?: boolean }) {
    if (!this.files.has(name)) {
      if (options?.create !== true) {
        return Promise.reject(new DOMException('no file', 'NotFoundError'))
      }
      this.files.set(name, new Uint8Array())
    }
    const label = `${this.path}${name}`
    return Promise.resolve({
      createWritable: () => {
        this.log.push(`open ${label}`)
        const chunks: Uint8Array[] = []
        return Promise.resolve({
          write: (data: Uint8Array) => {
            this.log.push(`write ${label}`)
            chunks.push(data)
            return Promise.resolve()
          },
          close: () => {
            this.log.push(`close ${label}`)
            this.files.set(name, chunks.at(-1) ?? new Uint8Array())
            return Promise.resolve()
          },
          abort: () => {
            this.log.push(`abort ${label}`)
            return Promise.resolve()
          },
        })
      },
    })
  }
}
