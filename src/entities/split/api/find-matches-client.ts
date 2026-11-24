import type { FoundMatch, MatchInput } from '../lib/find-matches.ts'

/*
Runs the finding function in a Web Worker, so the page stays responsive while it works: starts the
worker, sends the one request, resolves with the answer and terminates the worker. The curve is
copied to the worker, not handed over, since the source-file store still owns it. It is the one
module a store spec replaces, with a fake that runs the same function in-process.
*/
export function findMatchesInWorker(request: MatchInput): Promise<FoundMatch[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('find-matches.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.addEventListener('message', (event: MessageEvent<FoundMatch[]>) => {
      worker.terminate()
      resolve(event.data)
    })
    worker.addEventListener('error', (event) => {
      worker.terminate()
      reject(new Error(event.message))
    })
    worker.postMessage(request)
  })
}
